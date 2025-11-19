# Clearway Mobile App - Architecture Documentation

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CLEARWAY MOBILE APP                       │
│                   React Native + Expo                        │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Screens    │    │   Services   │    │    Stores    │
│              │    │              │    │              │
│ • Login      │───▶│ • Auth       │───▶│ • Auth       │
│ • Dashboard  │    │ • Camera     │    │ • Capitals   │
│ • Detail     │    │ • Sync       │    │ • Notify     │
│ • Capture    │    │ • Notify     │    │              │
│ • Profile    │    │ • Deeplink   │    │  (Zustand)   │
│              │    │ • Analytics  │    │              │
└──────────────┘    └──────────────┘    └──────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                              ▼
                    ┌──────────────┐
                    │  WatermelonDB│
                    │   (SQLite)   │
                    │              │
                    │ • Capitals   │
                    │ • Documents  │
                    │ • SyncQueue  │
                    │ • Notify     │
                    └──────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
          ┌──────────────┐    ┌──────────────┐
          │   Network    │    │   Storage    │
          │              │    │              │
          │ • REST API   │    │ • Keychain   │
          │ • FCM/APNs   │    │ • SecureStore│
          │ • Firebase   │    │ • MMKV       │
          └──────────────┘    └──────────────┘
```

## Data Flow Architecture

### 1. Offline-First Flow

```
User Action (Approve Capital Call)
        │
        ▼
Dashboard Screen
        │
        ▼
Capital Calls Store (Zustand)
        │
        ▼
Update Local State (Optimistic UI)
        │
        ▼
WatermelonDB - capital_calls table
        │
        ▼
WatermelonDB - sync_queue table
        │
        ▼
Sync Service (monitors network)
        │
        ├─ Online?  ─ YES ─▶ POST to Backend API
        │                            │
        │                            ▼
        │                    Backend validates & saves
        │                            │
        │                            ▼
        │                    Response: 200 OK
        │                            │
        │                            ▼
        │                    Update sync_status = 'SYNCED'
        │                            │
        │                            ▼
        │                    Remove from sync_queue
        │
        └─ Offline? ─ NO ──▶ Keep in sync_queue
                                    │
                                    ▼
                            Retry when online
```

### 2. Authentication Flow

```
Login Screen
        │
        ├─ Biometric Available?
        │       │
        │       ├─ YES ─▶ Request Face ID/Touch ID
        │       │               │
        │       │               ▼
        │       │         Create Signature
        │       │               │
        │       │               ▼
        │       │         POST /auth/verify-biometric
        │       │               │
        │       │               ▼
        │       │         Receive JWT Token
        │       │
        │       └─ NO ──▶ Request PIN
        │                       │
        │                       ▼
        │                 POST /auth/pin-login
        │                       │
        │                       ▼
        │                 Receive JWT Token
        │
        ▼
Store Token in:
    • Keychain (iOS) / Keystore (Android)
    • SecureStore (Expo)
    • Auth Store (Zustand)
        │
        ▼
Navigate to Dashboard
```

### 3. Document Capture Flow

```
Dashboard Screen
        │
        ▼
"+ Capture" Button
        │
        ▼
Document Capture Screen
        │
        ▼
Request Camera Permission
        │
        ▼
Camera Active with Frame Overlay
        │
        ├─ Real-time Edge Detection
        │       │
        │       ▼
        │   Document Detected? ─ YES ─▶ Visual Indicator
        │
        ▼
User Taps Capture Button
        │
        ▼
Camera Service - takePhoto()
        │
        ▼
Process Image:
    1. Detect corners
    2. Crop to rectangle
    3. Enhance (brightness, contrast)
    4. Optimize size (compress)
        │
        ▼
OCR Text Extraction (optional)
        │
        ▼
Save to Documents table (WatermelonDB)
        │
        ▼
Queue Upload in sync_queue
        │
        ▼
When Online ─▶ Upload to S3/Cloud Storage
                        │
                        ▼
                Update document.remote_url
```

### 4. Push Notification Flow

```
Firebase Console
        │
        ▼
Send Push Notification
        │
        ▼
FCM (Android) / APNs (iOS)
        │
        ▼
Device Receives Notification
        │
        ├─ App in Foreground?
        │       │
        │       ├─ YES ─▶ NotificationsService.onMessage()
        │       │               │
        │       │               ▼
        │       │         Show In-App Alert
        │       │               │
        │       │               ▼
        │       │         Save to notifications table
        │       │               │
        │       │               ▼
        │       │         Update Notifications Store
        │       │
        │       └─ NO ──▶ System Notification Tray
        │                       │
        │                       ▼
        │                 User Taps Notification
        │                       │
        │                       ▼
        │                 App Opens/Comes to Foreground
        │
        ▼
Deep Link Handler
        │
        ▼
Parse actionUrl from notification.data
        │
        ▼
Navigate to Relevant Screen:
    • /capital-calls/123 ─▶ Capital Call Detail
    • /documents/456 ─────▶ Document Viewer
    • /notifications ─────▶ Notifications List
```

### 5. Deep Linking Flow

```
User Clicks Link (Email/SMS/Web)
        │
        ▼
https://clearway.app/capital-calls/123
        │
        ├─ App Installed?
        │       │
        │       ├─ YES ─▶ Open App
        │       │               │
        │       │               ▼
        │       │         Deep Link Service
        │       │               │
        │       │               ▼
        │       │         Parse URL Path & Params
        │       │               │
        │       │               ▼
        │       │         Match Route Pattern
        │       │               │
        │       │               ▼
        │       │         Extract { id: "123" }
        │       │               │
        │       │               ▼
        │       │         Navigate to CapitalCallDetail
        │       │
        │       └─ NO ──▶ Fallback to Web App
        │                       │
        │                       ▼
        │                 Show "Download App" Banner
        │
        ▼
Universal Link / App Link Configuration:
    • iOS: associated-domains in app.json
    • Android: intent-filter with autoVerify
```

## Component Architecture

### Screen Components

```
LoginScreen
├─ State: email, pin, loading, useBiometric
├─ Services: authService
├─ Hooks: useScreenAnalytics
└─ Actions: handleBiometricLogin, handlePinLogin

DashboardScreen
├─ State: capitalCalls (from store), loading, refreshing
├─ Services: syncService
├─ Hooks: useScreenAnalytics, useCapitalCallsStore
└─ Actions: loadCapitalCalls, handleRefresh, handleCapitalCallPress

CapitalCallDetailScreen
├─ State: call, loading, approving, rejecting
├─ Services: syncService, analyticsService
├─ Hooks: useRoute, useCapitalCallsStore
└─ Actions: handleApprove, handleReject

DocumentCaptureScreen
├─ State: hasPermission, documentReady, capturing
├─ Services: cameraService
├─ Hooks: useRef (camera), useScreenAnalytics
└─ Actions: requestPermissions, handleCapture

ProfileScreen
├─ State: user (from store)
├─ Services: authService
├─ Hooks: useAuthStore, useScreenAnalytics
└─ Actions: handleLogout
```

### Service Layer

```
BiometricAuthService
├─ Methods:
│   ├─ isBiometricAvailable()
│   ├─ enrollDevice()
│   ├─ biometricLogin()
│   ├─ pinLogin()
│   ├─ getToken()
│   ├─ refreshAccessToken()
│   └─ logout()
└─ Storage: Keychain, SecureStore

CameraService
├─ Methods:
│   ├─ requestCameraPermission()
│   ├─ captureDocument()
│   ├─ useDocumentEdgeDetection()
│   ├─ extractText()
│   └─ saveToGallery()
└─ Dependencies: Vision Camera, OCR

SyncService
├─ Methods:
│   ├─ initialize()
│   ├─ syncPendingChanges()
│   ├─ queueAction()
│   ├─ pullLatestData()
│   └─ destroy()
├─ Monitors: Network state (NetInfo)
└─ Storage: sync_queue table

NotificationsService
├─ Methods:
│   ├─ initialize()
│   ├─ requestPermissions()
│   ├─ registerDeviceToken()
│   ├─ setupMessageListeners()
│   └─ markAsRead()
├─ Handlers: onMessage, onBackgroundMessage
└─ Storage: notifications table

DeepLinkService
├─ Methods:
│   ├─ initialize()
│   ├─ registerRoutes()
│   ├─ handleUrl()
│   ├─ generateLink()
│   └─ generateDynamicLink()
└─ Routes: capital-calls/:id, documents/:id, notifications, profile

AnalyticsService
├─ Methods:
│   ├─ trackScreenView()
│   ├─ trackEvent()
│   ├─ trackLogin()
│   ├─ trackCapitalCallAction()
│   ├─ setUserProperties()
│   └─ trackCrash()
└─ Integrations: Firebase Analytics, Crashlytics
```

## Database Schema (WatermelonDB)

### Tables

```sql
-- capital_calls
CREATE TABLE capital_calls (
    id TEXT PRIMARY KEY,
    fund_id TEXT NOT NULL,
    amount REAL NOT NULL,
    due_date TEXT NOT NULL,
    status TEXT NOT NULL,        -- 'PENDING', 'APPROVED', 'REJECTED'
    document_url TEXT,
    sync_status TEXT NOT NULL,   -- 'SYNCED', 'PENDING', 'FAILED'
    synced_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- documents
CREATE TABLE documents (
    id TEXT PRIMARY KEY,
    capital_call_id TEXT NOT NULL,
    local_path TEXT NOT NULL,
    remote_url TEXT,
    status TEXT NOT NULL,        -- 'LOCAL', 'UPLOADING', 'UPLOADED'
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

-- sync_queue
CREATE TABLE sync_queue (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,   -- 'CAPITAL_CALL', 'DOCUMENT'
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,        -- 'CREATE', 'UPDATE', 'DELETE'
    payload TEXT NOT NULL,       -- JSON string
    retry_count INTEGER DEFAULT 0,
    last_error TEXT,
    created_at INTEGER NOT NULL
);

-- notifications
CREATE TABLE notifications (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT NOT NULL,          -- 'CAPITAL_CALL', 'APPROVAL', 'NOTIFICATION'
    related_id TEXT,
    read BOOLEAN DEFAULT FALSE,
    action_url TEXT,
    created_at INTEGER NOT NULL
);
```

### Indexes

```sql
CREATE INDEX idx_capital_calls_status ON capital_calls(status);
CREATE INDEX idx_capital_calls_fund_id ON capital_calls(fund_id);
CREATE INDEX idx_documents_capital_call_id ON documents(capital_call_id);
CREATE INDEX idx_sync_queue_entity_type ON sync_queue(entity_type);
CREATE INDEX idx_sync_queue_entity_id ON sync_queue(entity_id);
```

## State Management (Zustand)

### Auth Store

```typescript
interface AuthState {
  isAuthenticated: boolean
  user: User | null
  token: string | null
  isLoading: boolean
  setUser: (user: User) => void
  setToken: (token: string) => void
  logout: () => void
  setLoading: (loading: boolean) => void
}
```

### Capital Calls Store

```typescript
interface CapitalCallsState {
  capitalCalls: CapitalCall[]
  loading: boolean
  error: string | null
  addCapitalCall: (call: CapitalCall) => void
  updateCapitalCall: (id: string, updates: Partial<CapitalCall>) => void
  setCapitalCalls: (calls: CapitalCall[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}
```

### Notifications Store

```typescript
interface NotificationsState {
  notifications: Notification[]
  unreadCount: number
  addNotification: (notification: Notification) => void
  markAsRead: (id: string) => void
  clearAll: () => void
}
```

## Security Architecture

### Authentication Security

```
┌─────────────────────────────────────┐
│     Biometric Authentication        │
│                                     │
│  iOS: Face ID / Touch ID            │
│    • Secure Enclave                 │
│    • Private key never leaves       │
│    • Challenge-response signature   │
│                                     │
│  Android: Fingerprint / Face        │
│    • Android Keystore               │
│    • Hardware-backed keys           │
│    • BiometricPrompt API            │
└─────────────────────────────────────┘
                │
                ▼
        ┌──────────────┐
        │   Sign Data  │
        │   (email)    │
        └──────────────┘
                │
                ▼
        ┌──────────────┐
        │   Backend    │
        │   Verify     │
        └──────────────┘
                │
                ▼
        ┌──────────────┐
        │  JWT Token   │
        └──────────────┘
                │
                ▼
   ┌────────────────────────┐
   │  Secure Storage        │
   │                        │
   │  • Keychain (iOS)      │
   │  • Keystore (Android)  │
   │  • SecureStore (Expo)  │
   │                        │
   │  Encrypted at rest     │
   └────────────────────────┘
```

### Data Security

```
Network Layer:
    • TLS 1.3
    • Certificate Pinning
    • API Key in headers
    • JWT Bearer tokens

Storage Layer:
    • WatermelonDB with SQLCipher
    • Encrypted at rest
    • Secure key derivation

Transport:
    • HTTPS only
    • No cleartext traffic
    • Network Security Config (Android)
```

## Performance Optimizations

### 1. Image Optimization

```
Original Image (4K from camera)
        │
        ▼
Edge Detection & Crop
        │
        ▼
Resize to 1200x1600
        │
        ▼
JPEG Compression (90%)
        │
        ▼
Final Size: ~300KB (from ~8MB)
```

### 2. Database Query Optimization

```
WatermelonDB Features:
    • Lazy loading
    • Indexed queries
    • Observable queries (reactive)
    • Batch operations
    • JSI bridge (fast native access)
```

### 3. React Native Performance

```
Optimizations:
    • FlatList for long lists (virtualization)
    • Memoization (useMemo, useCallback)
    • React.memo for expensive components
    • Image caching
    • Hermes JavaScript engine
```

## Analytics Events

```
User Journey Tracking:

app_open
    └─▶ login (method: BIOMETRIC | PIN)
            └─▶ screen_view (Dashboard)
                    └─▶ capital_call_action (VIEW, id)
                            └─▶ screen_view (CapitalCallDetail)
                                    ├─▶ capital_call_action (APPROVE, id)
                                    │       └─▶ sync_event (SUCCESS)
                                    │
                                    └─▶ capital_call_action (REJECT, id)
                                            └─▶ sync_event (SUCCESS)

document_upload
    ├─ fileSize
    ├─ duration
    └─ status (SUCCESS | FAILED)

notification_interaction
    ├─ type
    └─ action (OPENED | DISMISSED)

performance_metric
    ├─ metric (app_start_time, screen_load_time)
    └─ value (milliseconds)
```

## Error Handling

### Network Errors

```typescript
try {
  await syncService.syncPendingChanges()
} catch (error) {
  if (error.code === 'NETWORK_ERROR') {
    // Queue for retry
    await syncService.queueAction(...)
  } else if (error.code === 'AUTH_ERROR') {
    // Refresh token or logout
    await authService.refreshAccessToken()
  } else {
    // Log to analytics
    analyticsService.trackCrash(error)
  }
}
```

### Database Errors

```typescript
try {
  await database.write(async () => {
    await collection.create(...)
  })
} catch (error) {
  // Rollback automatic
  console.error('Database write failed:', error)
  // Retry or show error to user
}
```

## Deployment Architecture

```
Developer Machine
        │
        ▼
    Git Push
        │
        ▼
GitHub Repository
        │
        ▼
    EAS Build
        │
        ├─▶ iOS Build
        │       │
        │       ▼
        │   Compile Swift/ObjC
        │       │
        │       ▼
        │   Sign with Certificate
        │       │
        │       ▼
        │   Generate IPA
        │       │
        │       ▼
        │   Upload to App Store Connect
        │       │
        │       ▼
        │   TestFlight Beta
        │       │
        │       ▼
        │   App Store Review
        │       │
        │       ▼
        │   Production Release
        │
        └─▶ Android Build
                │
                ▼
            Compile Kotlin/Java
                │
                ▼
            Sign with Keystore
                │
                ▼
            Generate AAB
                │
                ▼
            Upload to Play Console
                │
                ▼
            Internal Testing
                │
                ▼
            Open Testing (Beta)
                │
                ▼
            Production Release
```

## Conclusion

The Clearway Mobile App architecture is designed for:
- **Performance**: Offline-first, optimized images, fast database
- **Security**: Biometric auth, encrypted storage, TLS 1.3
- **Reliability**: Automatic sync, retry logic, error handling
- **Scalability**: Modular services, clean separation of concerns
- **Maintainability**: TypeScript, clear architecture, documented code

All components work together to provide a seamless, secure, and performant mobile experience for capital call management.
