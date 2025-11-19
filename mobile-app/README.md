# Clearway Mobile App

React Native mobile application for Clearway Capital Call Management Platform. Built with Expo for iOS and Android with offline-first architecture, biometric authentication, and real-time sync.

## Features

### Core Features
- **Biometric Authentication** - Face ID, Touch ID, fingerprint authentication
- **PIN Fallback** - 4-digit PIN for devices without biometrics
- **Document Capture** - Camera integration with edge detection and OCR
- **Offline-First** - WatermelonDB for local data persistence and automatic sync
- **Push Notifications** - Firebase Cloud Messaging for iOS and Android
- **Deep Linking** - Universal Links (iOS) and App Links (Android)
- **Capital Call Review** - Mobile-optimized viewing, approval, and rejection
- **Analytics** - Firebase Analytics and Segment integration

### Tech Stack
- **React Native 0.75** - Cross-platform mobile framework
- **Expo SDK 52** - Managed development and OTA updates
- **TypeScript** - Type safety across the codebase
- **WatermelonDB** - Reactive database for offline sync
- **Zustand** - Global state management
- **Firebase** - Analytics, Crashlytics, Cloud Messaging
- **React Navigation 6** - Navigation management

## Project Structure

```
mobile-app/
├── src/
│   ├── screens/              # Screen components
│   │   ├── LoginScreen.tsx
│   │   ├── DashboardScreen.tsx
│   │   ├── CapitalCallDetailScreen.tsx
│   │   ├── DocumentCaptureScreen.tsx
│   │   └── ProfileScreen.tsx
│   ├── services/             # Business logic services
│   │   ├── auth.service.ts
│   │   ├── camera.service.ts
│   │   ├── sync.service.ts
│   │   ├── notifications.service.ts
│   │   ├── deeplink.service.ts
│   │   └── analytics.service.ts
│   ├── store/                # Zustand state stores
│   │   ├── auth.store.ts
│   │   ├── capital-calls.store.ts
│   │   └── notifications.store.ts
│   ├── db/                   # WatermelonDB database
│   │   ├── schema.ts
│   │   ├── database.ts
│   │   └── models/
│   ├── navigation/           # Navigation configuration
│   │   ├── RootNavigator.tsx
│   │   └── AppNavigator.tsx
│   ├── hooks/                # Custom React hooks
│   │   └── useAnalytics.ts
│   └── types/                # TypeScript type definitions
├── ios/                      # iOS native code
├── android/                  # Android native code
├── scripts/                  # Build and deployment scripts
│   ├── submit-ios.sh
│   └── submit-android.sh
├── App.tsx                   # Root component
├── app.json                  # Expo configuration
├── eas.json                  # EAS Build configuration
├── package.json
└── tsconfig.json
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS development)
- Android Studio (for Android development)
- EAS CLI for builds

### Installation

```bash
# Clone the repository
cd mobile-app

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android
```

### Environment Variables

Create a `.env` file with the following variables:

```
API_URL=https://api.clearway.app
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_PROJECT_ID=clearway-prod
SEGMENT_WRITE_KEY=your_segment_write_key
DYNAMIC_LINKS_DOMAIN=clearwayapp.page.link
```

## Development

### Running the App

```bash
# Start Expo development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run tests
npm test

# Type checking
npm run type-check

# Linting
npm run lint
```

### Building for Production

#### iOS Build

```bash
# Build for iOS using EAS
npm run build:ios

# Submit to App Store
npm run submit:ios

# Or use the submission script
./scripts/submit-ios.sh
```

#### Android Build

```bash
# Build for Android using EAS
npm run build:android

# Submit to Play Store
npm run submit:android

# Or use the submission script
./scripts/submit-android.sh
```

## Architecture

### Offline-First Architecture

```
User Action
    ↓
Service Layer (business logic)
    ↓
Zustand Store (global state)
    ↓
WatermelonDB (local persistence)
    ↓
Sync Queue
    ↓
When Online → Backend API → Update Sync Status
```

### Authentication Flow

1. User enters email
2. Biometric check (Face ID/Touch ID/Fingerprint)
3. If unavailable, fallback to PIN
4. Token stored in Keychain/Keystore
5. Auto-refresh on token expiry

### Data Sync Flow

1. Offline actions queued in sync_queue table
2. Network monitor detects connectivity
3. Sync service processes pending items
4. Backend API validates and persists
5. Local database updated with sync status
6. UI reflects current state

## Services

### BiometricAuthService
Handles biometric and PIN authentication, token management, and session persistence.

### CameraService
Document capture with edge detection, OCR, image enhancement, and gallery integration.

### SyncService
Offline-first sync with automatic retry, conflict resolution, and network monitoring.

### NotificationsService
Push notification handling, deep linking, and notification persistence.

### DeepLinkService
Universal/App Links routing, parameter extraction, and dynamic link generation.

### AnalyticsService
Event tracking, screen views, performance metrics, and crash reporting.

## Testing

```bash
# Run unit tests
npm test

# Run E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

## Deployment

### iOS App Store

1. Configure signing in Xcode
2. Set up App Store Connect
3. Build with EAS: `eas build --platform ios`
4. Submit: `eas submit --platform ios`
5. Fill metadata in App Store Connect
6. Submit for review

### Google Play Store

1. Create signing keystore
2. Configure Play Console
3. Build with EAS: `eas build --platform android`
4. Submit: `eas submit --platform android`
5. Fill store listing
6. Promote from internal testing to production

## Performance Targets

- **App Start Time**: < 2 seconds
- **Capital Call Load**: < 1 second
- **Document Upload**: > 99% success rate
- **Sync Success**: > 98%
- **Crash Rate**: < 0.1%
- **App Size**: < 150 MB (iOS), < 100 MB (Android)

## Security

- Biometric authentication with secure enclave
- Token storage in Keychain/Keystore
- TLS 1.3 for all network communication
- App attestation for integrity verification
- Encrypted local database
- Certificate pinning

## Support

For issues and questions:
- GitHub Issues: https://github.com/clearway/mobile-app/issues
- Documentation: https://docs.clearway.app
- Email: support@clearway.app

## License

Proprietary - Copyright (c) 2025 Clearway
