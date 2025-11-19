# Mobile App Agent - iOS & Android

## Role
Specialized agent responsible for building and deploying a native-quality React Native mobile application for Clearway. Develops iOS and Android apps with offline-first architecture, biometric authentication, camera-based document capture, push notifications, and deep linking. Handles App Store and Play Store deployment, mobile analytics, and mobile-specific UX optimization.

## Primary Responsibilities

1. **React Native Application**
   - Cross-platform app using React Native 0.75+
   - iOS and Android support with platform-specific optimizations
   - Expo for rapid development and OTA updates
   - TypeScript for type safety across mobile codebase

2. **Document Capture & Upload**
   - Camera integration for document scanning
   - Real-time document edge detection
   - OCR for capital call parsing
   - Batch upload with progress tracking
   - Offline queue and sync when online

3. **Authentication & Security**
   - Biometric authentication (Face ID, Touch ID, Android Biometric)
   - Secure credential storage (Keychain, Keystore)
   - Session management with token refresh
   - PIN fallback for older devices
   - App attestation for integrity verification

4. **Capital Call Review**
   - Mobile-optimized capital call display
   - Responsive document viewer
   - Action buttons (approve/reject/request extension)
   - Signature capture with digital signing
   - Offline review with sync on reconnect

5. **Offline-First Architecture**
   - Local SQLite database for data persistence
   - WatermelonDB for efficient sync
   - Optimistic UI updates
   - Conflict resolution strategies
   - Network state monitoring

6. **Push Notifications**
   - Firebase Cloud Messaging (FCM) for Android
   - Apple Push Notification service (APNs) for iOS
   - Deep linking to relevant content
   - Foreground and background notification handling
   - Notification categorization and actions

7. **Mobile Analytics & Monitoring**
   - Firebase Analytics integration
   - Segment for event tracking
   - Crash reporting with Firebase Crashlytics
   - Performance monitoring (app start time, frame rate)
   - User engagement metrics

8. **Deep Linking**
   - Universal Links (iOS) and App Links (Android)
   - Dynamic linking for email notifications
   - QR code scanning for quick access
   - Branch.io or Firebase Dynamic Links
   - Fallback to web app for uninstalled users

9. **App Store & Play Store**
   - Build signing and provisioning
   - TestFlight and Google Play internal testing
   - App Store optimization (ASO)
   - Automated app submission workflow
   - Version management and releases

## Tech Stack

### Core Framework
- **React Native 0.75** - Cross-platform mobile development
- **Expo SDK 52+** - Managed development, OTA updates, and EAS builds
- **TypeScript** - Full type safety
- **NativeWind** - Tailwind CSS for React Native

### State & Storage
- **WatermelonDB** - Reactive database for offline sync
- **Zustand** - Global state management
- **MMKV** - Fast key-value storage (encrypted)
- **AsyncStorage** - Simple async data persistence

### Authentication & Security
- **React Native Biometrics** - Biometric auth
- **React Native Keychain** - Secure credential storage
- **jwt-decode** - JWT token handling
- **expo-crypto** - Cryptographic functions
- **expo-secure-store** - Encrypted key storage

### Camera & Document Processing
- **Expo Image Picker** - Photo library and camera access
- **Vision Camera** - High-performance camera
- **react-native-vision-ocr** - OCR capabilities
- **react-native-document-scanner** - Document edge detection
- **react-native-pdf** - PDF viewing

### Notifications & Deep Linking
- **Expo Notifications** - Push notifications
- **Firebase Cloud Messaging** - Android notifications
- **React Native Navigation** - Navigation with deep linking support
- **react-native-branch** or **expo-linking** - Deep link handling
- **Firebase Dynamic Links** - Link tracking

### UI & UX
- **React Navigation 6** - Navigation management
- **React Native Paper** - Material Design components
- **react-native-gesture-handler** - Gesture recognition
- **Reanimated** - Smooth animations
- **Skia for React Native** - Graphics rendering

### Analytics & Monitoring
- **Firebase Analytics** - Event tracking
- **Segment** - Analytics pipeline
- **Firebase Crashlytics** - Crash reporting
- **Sentry** - Error tracking
- **React Native Performance Monitor** - Custom metrics

### Testing & Quality
- **Jest** - Unit testing framework
- **Detox** - E2E testing for React Native
- **react-native-testing-library** - Component testing

## Phase 3 Features

### Week 33: React Native Setup & Authentication (Days 1-5)

**Task MOBILE-001: Project Setup with Expo & TypeScript**
```bash
# Initialize Expo project with TypeScript
npx create-expo-app@latest clearway-mobile --template

# Install core dependencies
npm install react-native axios zustand mmkv expo-secure-store \
  react-native-keychain react-native-biometrics typescript

# Configure TypeScript
npx tsc --init

# Setup Expo environment
eas init
eas build:create
```

**Acceptance Criteria**:
- ✅ Expo project initialized with TypeScript
- ✅ Build profiles configured (dev, staging, production)
- ✅ Environment variables setup (.env files)
- ✅ Project structure organized (src/, assets/, etc.)
- ✅ EAS CLI configured for builds
- ✅ Development server runs successfully

**Dependencies**: None (can start immediately)

---

**Task MOBILE-002: Biometric Authentication Flow**
```typescript
// src/services/auth.service.ts

import * as SecureStore from 'expo-secure-store';
import * as Keychain from 'react-native-keychain';
import ReactNativeBiometrics from 'react-native-biometrics';
import { useAuthStore } from '@/store/auth.store';

export class BiometricAuthService {
  private rnBiometrics = new ReactNativeBiometrics();
  private tokenKey = 'auth_token';
  private refreshTokenKey = 'refresh_token';

  /**
   * Check biometric availability
   */
  async isBiometricAvailable(): Promise<{
    available: boolean;
    biometryType: 'Face' | 'Fingerprint' | 'Iris' | null;
  }> {
    try {
      const { available, biometryType } =
        await this.rnBiometrics.isSensorAvailable();
      return { available, biometryType };
    } catch (error) {
      console.error('Biometric check failed:', error);
      return { available: false, biometryType: null };
    }
  }

  /**
   * Enroll device for biometric auth
   */
  async enrollDevice(): Promise<boolean> {
    try {
      const { keysExist } = await this.rnBiometrics.biometricKeysExist();
      if (keysExist) return true;

      const { publicKey } = await this.rnBiometrics.createKeys(
        'biometricKey'
      );

      // Store that device is enrolled
      await SecureStore.setItemAsync('biometric_enrolled', 'true');
      return true;
    } catch (error) {
      console.error('Device enrollment failed:', error);
      return false;
    }
  }

  /**
   * Authenticate user with biometrics
   */
  async biometricLogin(email: string): Promise<string | null> {
    try {
      const { success, signature } =
        await this.rnBiometrics.createSignature({
          promptMessage: 'Authenticate to access Clearway',
          payload: email,
        });

      if (!success) return null;

      // Verify signature on backend
      const token = await this.verifyBiometricSignature(
        email,
        signature
      );

      if (token) {
        await this.storeTokens(token);
        useAuthStore.setState({
          isAuthenticated: true,
          user: { email }
        });
      }

      return token;
    } catch (error) {
      console.error('Biometric login failed:', error);
      return null;
    }
  }

  /**
   * Fallback PIN authentication
   */
  async pinLogin(email: string, pin: string): Promise<string | null> {
    try {
      const response = await fetch(`${API_URL}/auth/pin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pin }),
      });

      if (!response.ok) return null;

      const { token, refreshToken } = await response.json();
      await this.storeTokens(token, refreshToken);

      useAuthStore.setState({
        isAuthenticated: true,
        user: { email },
      });

      return token;
    } catch (error) {
      console.error('PIN login failed:', error);
      return null;
    }
  }

  /**
   * Store tokens securely
   */
  private async storeTokens(
    token: string,
    refreshToken?: string
  ): Promise<void> {
    try {
      await SecureStore.setItemAsync(this.tokenKey, token);

      if (refreshToken) {
        await SecureStore.setItemAsync(
          this.refreshTokenKey,
          refreshToken
        );
      }

      // Also store in Keychain for biometric
      await Keychain.setGenericPassword(
        'clearway_token',
        token,
        {
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        }
      );
    } catch (error) {
      console.error('Token storage failed:', error);
      throw error;
    }
  }

  /**
   * Get stored token
   */
  async getToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(this.tokenKey);
    } catch (error) {
      console.error('Token retrieval failed:', error);
      return null;
    }
  }

  /**
   * Refresh token
   */
  async refreshAccessToken(): Promise<string | null> {
    try {
      const refreshToken = await SecureStore.getItemAsync(
        this.refreshTokenKey
      );

      if (!refreshToken) return null;

      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        // Clear tokens and logout
        await this.logout();
        return null;
      }

      const { token } = await response.json();
      await this.storeTokens(token);

      return token;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return null;
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(this.tokenKey);
      await SecureStore.deleteItemAsync(this.refreshTokenKey);
      await Keychain.resetGenericPassword();

      useAuthStore.setState({
        isAuthenticated: false,
        user: null,
      });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  /**
   * Verify biometric signature on backend
   */
  private async verifyBiometricSignature(
    email: string,
    signature: string
  ): Promise<string | null> {
    try {
      const response = await fetch(
        `${API_URL}/auth/verify-biometric`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, signature }),
        }
      );

      if (!response.ok) return null;

      const { token } = await response.json();
      return token;
    } catch (error) {
      console.error('Signature verification failed:', error);
      return null;
    }
  }
}

export const authService = new BiometricAuthService();
```

**Login Screen Component**
```typescript
// src/screens/LoginScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { authService } from '@/services/auth.service';
import { styles } from '@/styles/login.styles';

export function LoginScreen() {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [useBiometric, setUseBiometric] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    checkBiometric();
  }, []);

  const checkBiometric = async () => {
    const { available } = await authService.isBiometricAvailable();
    setBiometricAvailable(available);
  };

  const handleBiometricLogin = async () => {
    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const token = await authService.biometricLogin(email);
      if (token) {
        navigation.replace('Home');
      } else {
        Alert.alert('Auth Failed', 'Biometric authentication failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Authentication error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handlePinLogin = async () => {
    if (!email.trim() || !pin.trim()) {
      Alert.alert('Required', 'Email and PIN are required');
      return;
    }

    setLoading(true);
    try {
      const token = await authService.pinLogin(email, pin);
      if (token) {
        navigation.replace('Home');
      } else {
        Alert.alert('Login Failed', 'Invalid email or PIN');
      }
    } catch (error) {
      Alert.alert('Error', 'Login error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Clearway</Text>
      <Text style={styles.subtitle}>Capital Call Management</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Email Address"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!loading}
        />

        {!useBiometric && (
          <>
            <TextInput
              style={styles.input}
              placeholder="4-Digit PIN"
              value={pin}
              onChangeText={setPin}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              editable={!loading}
            />
            <TouchableOpacity
              style={styles.button}
              onPress={handlePinLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {biometricAvailable && (
          <>
            <TouchableOpacity
              style={styles.divider}
              onPress={() => setUseBiometric(!useBiometric)}
            >
              <Text style={styles.dividerText}>
                {useBiometric ? 'Use PIN Instead' : 'Use Biometric'}
              </Text>
            </TouchableOpacity>

            {useBiometric && (
              <TouchableOpacity
                style={[styles.button, styles.biometricButton]}
                onPress={handleBiometricLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>
                    Unlock with Face/Fingerprint
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </View>
  );
}
```

**Acceptance Criteria**:
- ✅ Biometric enrollment flow works
- ✅ Face ID / Touch ID authentication functional
- ✅ PIN fallback available for devices without biometrics
- ✅ Tokens securely stored in Keychain/Keystore
- ✅ Token refresh logic implemented
- ✅ Session persistence on app restart
- ✅ Logout clears all stored credentials

**Dependencies**: None (can start immediately)

---

**Task MOBILE-003: Core State Management Setup**
```typescript
// src/store/auth.store.ts

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  organizationId: string;
  role: 'ADMIN' | 'MANAGER' | 'VIEWER';
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  logout: () => void;
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      token: null,
      isLoading: true,
      setUser: (user) => set({ user, isAuthenticated: true }),
      setToken: (token) => set({ token }),
      logout: () => set({
        isAuthenticated: false,
        user: null,
        token: null,
      }),
      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// src/store/capital-calls.store.ts

interface CapitalCall {
  id: string;
  fund: string;
  amount: number;
  dueDate: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXTENSION_REQUESTED';
  documentUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface CapitalCallsState {
  capitalCalls: CapitalCall[];
  addCapitalCall: (call: CapitalCall) => void;
  updateCapitalCall: (id: string, updates: Partial<CapitalCall>) => void;
  setCapitalCalls: (calls: CapitalCall[]) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
}

export const useCapitalCallsStore = create<CapitalCallsState>()(
  persist(
    (set) => ({
      capitalCalls: [],
      addCapitalCall: (call) =>
        set((state) => ({
          capitalCalls: [call, ...state.capitalCalls],
        })),
      updateCapitalCall: (id, updates) =>
        set((state) => ({
          capitalCalls: state.capitalCalls.map((call) =>
            call.id === id ? { ...call, ...updates } : call
          ),
        })),
      setCapitalCalls: (capitalCalls) => set({ capitalCalls }),
      loading: false,
      setLoading: (loading) => set({ loading }),
      error: null,
      setError: (error) => set({ error }),
    }),
    {
      name: 'capital-calls-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

**Acceptance Criteria**:
- ✅ Auth store with persistence
- ✅ Capital calls store with CRUD operations
- ✅ Loading and error states
- ✅ AsyncStorage persistence
- ✅ Type-safe state management

**Dependencies**:
- Task MOBILE-002: Auth service completed

---

### Week 34: Document Capture & Offline Sync (Days 6-10)

**Task MOBILE-004: Camera Integration & Document Scanning**
```typescript
// src/services/camera.service.ts

import {
  Camera,
  useCameraDevice,
  useFrameProcessor,
  runOnJS,
} from 'vision-camera';
import { detectEdges } from 'react-native-vision-ocr';
import * as MediaLibrary from 'expo-media-library';
import * as ImageManipulator from 'expo-image-manipulator';

export class CameraService {
  private cameraRef: React.RefObject<Camera>;

  constructor(cameraRef: React.RefObject<Camera>) {
    this.cameraRef = cameraRef;
  }

  /**
   * Request camera permissions
   */
  async requestCameraPermission(): Promise<boolean> {
    try {
      const cameraStatus = await Camera.requestCameraPermission();
      return cameraStatus === 'granted';
    } catch (error) {
      console.error('Camera permission error:', error);
      return false;
    }
  }

  /**
   * Capture document photo
   */
  async captureDocument(): Promise<string | null> {
    try {
      if (!this.cameraRef.current) return null;

      const photo = await this.cameraRef.current.takePhoto({
        qualityPrioritization: 'quality',
        flash: 'auto',
      });

      // Process image: crop, enhance, optimize
      const processedImage = await this.processImage(photo.path);
      return processedImage;
    } catch (error) {
      console.error('Document capture failed:', error);
      return null;
    }
  }

  /**
   * Detect edges in real-time (frame processor)
   */
  useDocumentEdgeDetection() {
    const device = useCameraDevice('back');

    const frameProcessor = useFrameProcessor((frame) => {
      'worklet';

      const edges = detectEdges(frame);

      // Check if document is properly framed
      if (edges.length >= 4) {
        // Corners detected, show capture ready indicator
        runOnJS(this.notifyEdgesDetected)(edges);
      }
    }, []);

    return { device, frameProcessor };
  }

  /**
   * Process captured image
   */
  private async processImage(imagePath: string): Promise<string> {
    try {
      // Detect and crop edges
      const corners = await this.detectCorners(imagePath);

      // Crop to document
      let croppedPath = imagePath;
      if (corners) {
        croppedPath = await this.cropImage(imagePath, corners);
      }

      // Enhance image (brightness, contrast)
      const enhancedPath = await this.enhanceImage(croppedPath);

      // Optimize file size
      const optimizedPath = await ImageManipulator.manipulateAsync(
        enhancedPath,
        [{ resize: { width: 1200, height: 1600 } }],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
      );

      return optimizedPath.uri;
    } catch (error) {
      console.error('Image processing failed:', error);
      return imagePath;
    }
  }

  /**
   * Extract corners from image
   */
  private async detectCorners(imagePath: string): Promise<any> {
    // Use vision-ocr to detect document corners
    try {
      const result = await detectEdges(imagePath);
      return result.corners;
    } catch (error) {
      console.error('Corner detection failed:', error);
      return null;
    }
  }

  /**
   * Crop image to detected rectangle
   */
  private async cropImage(
    imagePath: string,
    corners: any
  ): Promise<string> {
    const manipulations = [
      {
        crop: {
          originX: corners.topLeft.x,
          originY: corners.topLeft.y,
          width:
            corners.bottomRight.x - corners.topLeft.x,
          height:
            corners.bottomRight.y - corners.topLeft.y,
        },
      },
    ];

    const result = await ImageManipulator.manipulateAsync(
      imagePath,
      manipulations,
      { format: ImageManipulator.SaveFormat.JPEG }
    );

    return result.uri;
  }

  /**
   * Enhance image quality
   */
  private async enhanceImage(imagePath: string): Promise<string> {
    // Apply filters for better OCR
    const result = await ImageManipulator.manipulateAsync(
      imagePath,
      [
        {
          resize: { width: 1200, height: 1600 },
        },
      ],
      {
        compress: 0.95,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    return result.uri;
  }

  /**
   * Extract text from document image
   */
  async extractText(imagePath: string): Promise<string> {
    try {
      const text = await detectEdges(imagePath);
      return text.text || '';
    } catch (error) {
      console.error('OCR failed:', error);
      return '';
    }
  }

  /**
   * Called when document edges are detected
   */
  private notifyEdgesDetected(edges: any): void {
    // Trigger haptic feedback or visual indicator
    console.log('Document edges detected, ready to capture');
  }

  /**
   * Save to device gallery
   */
  async saveToGallery(imagePath: string): Promise<boolean> {
    try {
      const asset = await MediaLibrary.createAssetAsync(imagePath);
      await MediaLibrary.createAlbumAsync(
        'Clearway Captures',
        asset,
        false
      );
      return true;
    } catch (error) {
      console.error('Save to gallery failed:', error);
      return false;
    }
  }
}
```

**Document Capture Screen**
```typescript
// src/screens/DocumentCaptureScreen.tsx

import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Camera, useCameraDevice } from 'vision-camera';
import { CameraService } from '@/services/camera.service';
import { styles } from '@/styles/camera.styles';

export function DocumentCaptureScreen({ navigation }: any) {
  const cameraRef = useRef<Camera>(null);
  const cameraService = new CameraService(cameraRef);
  const device = useCameraDevice('back');
  const [hasPermission, setHasPermission] = useState(false);
  const [documentReady, setDocumentReady] = useState(false);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const hasPermission =
      await cameraService.requestCameraPermission();
    setHasPermission(hasPermission);
  };

  const handleCapture = async () => {
    if (!hasPermission || !cameraService) return;

    setCapturing(true);
    try {
      const imagePath = await cameraService.captureDocument();

      if (imagePath) {
        // Navigate to review screen with captured image
        navigation.navigate('DocumentReview', {
          imagePath,
          documentType: 'CAPITAL_CALL',
        });
      }
    } finally {
      setCapturing(false);
    }
  };

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Camera permission required</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={requestPermissions}
        >
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return <Text>No camera device found</Text>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <Camera
        ref={cameraRef}
        device={device}
        isActive={true}
        photo={true}
        style={styles.camera}
      />

      {/* Document guide overlay */}
      <View style={styles.guideOverlay}>
        <View style={styles.guideFrame} />
        <Text style={styles.guideText}>
          {documentReady
            ? 'Document ready. Tap to capture.'
            : 'Align document within frame'}
        </Text>
      </View>

      {/* Capture button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.captureButton,
            { opacity: capturing ? 0.6 : 1 },
          ]}
          onPress={handleCapture}
          disabled={capturing}
        >
          <View style={styles.captureCircle} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
```

**Acceptance Criteria**:
- ✅ Camera permission handling
- ✅ Real-time document edge detection
- ✅ Automatic image enhancement
- ✅ OCR text extraction functional
- ✅ Capture button triggers photo
- ✅ Image processing completes before review
- ✅ Gallery integration works

**Dependencies**: None (can start immediately)

---

**Task MOBILE-005: Offline-First Database Setup**
```typescript
// src/db/schema.ts

import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'capital_calls',
      columns: [
        { name: 'fund_id', type: 'string', isIndexed: true },
        { name: 'amount', type: 'number' },
        { name: 'due_date', type: 'string' },
        { name: 'status', type: 'string', isIndexed: true },
        { name: 'document_url', type: 'string', isOptional: true },
        {
          name: 'synced_at',
          type: 'number',
          isOptional: true,
        },
        { name: 'sync_status', type: 'string' }, // 'SYNCED' | 'PENDING' | 'FAILED'
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'documents',
      columns: [
        {
          name: 'capital_call_id',
          type: 'string',
          isIndexed: true,
        },
        { name: 'local_path', type: 'string' },
        { name: 'remote_url', type: 'string', isOptional: true },
        { name: 'status', type: 'string' }, // 'LOCAL' | 'UPLOADING' | 'UPLOADED'
        { name: 'file_size', type: 'number' },
        { name: 'mime_type', type: 'string' },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'sync_queue',
      columns: [
        { name: 'entity_type', type: 'string', isIndexed: true }, // 'CAPITAL_CALL', 'DOCUMENT'
        { name: 'entity_id', type: 'string', isIndexed: true },
        { name: 'action', type: 'string' }, // 'CREATE', 'UPDATE', 'DELETE'
        { name: 'payload', type: 'string' }, // JSON
        { name: 'retry_count', type: 'number' },
        { name: 'last_error', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'notifications',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'body', type: 'string' },
        { name: 'type', type: 'string' }, // 'CAPITAL_CALL', 'APPROVAL', 'NOTIFICATION'
        { name: 'related_id', type: 'string', isOptional: true },
        { name: 'read', type: 'boolean' },
        { name: 'action_url', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
  ],
});

// src/db/database.ts

import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { Database } from '@nozbe/watermelondb';
import { schema } from './schema';
import { CapitalCall } from './models/CapitalCall';
import { Document } from './models/Document';
import { SyncQueue } from './models/SyncQueue';
import { Notification } from './models/Notification';

const adapter = new SQLiteAdapter({
  schema,
  dbname: 'clearway_mobile',
  jsi: true,
  onSetUpError: (error) => {
    console.error('Database setup error:', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [CapitalCall, Document, SyncQueue, Notification],
});

// src/db/models/CapitalCall.ts

import { Model } from '@nozbe/watermelondb';
import { field, readonly, relation } from '@nozbe/watermelondb/decorators';

export class CapitalCall extends Model {
  static table = 'capital_calls';

  @field('fund_id') fundId!: string;
  @field('amount') amount!: number;
  @field('due_date') dueDate!: string;
  @field('status') status!: string;
  @field('document_url') documentUrl?: string;
  @field('sync_status') syncStatus!: string;
  @field('synced_at') syncedAt?: number;

  @readonly @field('created_at') createdAt!: number;
  @readonly @field('updated_at') updatedAt!: number;
}

// src/services/sync.service.ts

import { database } from '@/db/database';
import { useCapitalCallsStore } from '@/store/capital-calls.store';
import NetInfo from '@react-native-community/netinfo';
import { Q } from '@nozbe/watermelondb';

export class SyncService {
  private isSyncing = false;
  private syncInterval: NodeJS.Timer | null = null;

  /**
   * Initialize sync
   */
  async initialize(): Promise<void> {
    // Monitor network state
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        this.syncPendingChanges();
      }
    });

    // Periodic sync check (every 5 minutes)
    this.syncInterval = setInterval(() => {
      this.syncPendingChanges();
    }, 5 * 60 * 1000);

    // Initial sync
    await this.syncPendingChanges();
  }

  /**
   * Sync pending changes to server
   */
  async syncPendingChanges(): Promise<void> {
    if (this.isSyncing) return;

    this.isSyncing = true;
    try {
      const collection = database.get('sync_queue');
      const pendingItems = await collection.query(
        Q.where('retry_count', Q.lt(3))
      ).fetch();

      for (const item of pendingItems) {
        await this.syncItem(item);
      }

      // Fetch latest data from server
      await this.pullLatestData();
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync single item
   */
  private async syncItem(item: any): Promise<void> {
    try {
      const payload = JSON.parse(item.payload);

      const response = await fetch(
        `${API_URL}/sync/${item.entityType.toLowerCase()}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${useAuthStore.getState().token}`,
          },
          body: JSON.stringify({
            action: item.action,
            data: payload,
          }),
        }
      );

      if (response.ok) {
        await item.markAsSynced();
      } else {
        await item.incrementRetry();
      }
    } catch (error) {
      console.error('Item sync failed:', error);
      await item.incrementRetry();
    }
  }

  /**
   * Pull latest data from server
   */
  private async pullLatestData(): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/sync/pull`, {
        headers: {
          Authorization: `Bearer ${useAuthStore.getState().token}`,
        },
      });

      if (!response.ok) return;

      const data = await response.json();

      // Update capital calls
      if (data.capitalCalls) {
        const collection = database.get('capital_calls');
        await database.write(async () => {
          for (const call of data.capitalCalls) {
            await collection.create((record) => {
              record.fundId = call.fundId;
              record.amount = call.amount;
              record.dueDate = call.dueDate;
              record.status = call.status;
              record.syncStatus = 'SYNCED';
            });
          }
        });
        useCapitalCallsStore.setState({
          capitalCalls: data.capitalCalls,
        });
      }
    } catch (error) {
      console.error('Pull data failed:', error);
    }
  }

  /**
   * Queue action for sync
   */
  async queueAction(
    entityType: string,
    entityId: string,
    action: string,
    payload: any
  ): Promise<void> {
    const collection = database.get('sync_queue');
    await database.write(async () => {
      await collection.create((record) => {
        record.entityType = entityType;
        record.entityId = entityId;
        record.action = action;
        record.payload = JSON.stringify(payload);
        record.retryCount = 0;
      });
    });

    // Try to sync immediately if online
    this.syncPendingChanges();
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}

export const syncService = new SyncService();
```

**Acceptance Criteria**:
- ✅ WatermelonDB schema defined
- ✅ SQLite adapter configured
- ✅ Model classes for all entities
- ✅ Network state monitoring
- ✅ Automatic sync on connection
- ✅ Offline queue management
- ✅ Conflict resolution working

**Dependencies**: None (can start immediately)

---

### Week 35: Push Notifications & Deep Linking (Days 11-15)

**Task MOBILE-006: Firebase Cloud Messaging & Push Notifications**
```typescript
// src/services/notifications.service.ts

import * as Notifications from 'expo-notifications';
import messaging from '@react-native-firebase/messaging';
import { useNotificationStore } from '@/store/notifications.store';
import { database } from '@/db/database';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    console.log('Notification received:', notification);
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    };
  },
});

export class NotificationsService {
  /**
   * Initialize push notifications
   */
  async initialize(): Promise<void> {
    try {
      // Request permissions
      await this.requestPermissions();

      // Get FCM token
      const token = await this.getFCMToken();
      console.log('FCM Token:', token);

      // Register with backend
      await this.registerDeviceToken(token);

      // Listen for messages
      this.setupMessageListeners();

      // Listen for notification interaction
      this.setupNotificationInteraction();
    } catch (error) {
      console.error('Notification initialization failed:', error);
    }
  }

  /**
   * Request notification permissions
   */
  private async requestPermissions(): Promise<void> {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Permission not granted for notifications');
      return;
    }

    // iOS specific
    await messaging().requestUserPermission();
  }

  /**
   * Get FCM token
   */
  private async getFCMToken(): Promise<string> {
    const token = await messaging().getToken();
    return token;
  }

  /**
   * Register device token with backend
   */
  private async registerDeviceToken(
    token: string
  ): Promise<void> {
    try {
      const { token: authToken } = useAuthStore.getState();

      await fetch(`${API_URL}/notifications/register-device`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          deviceToken: token,
          platform: Platform.OS,
          appVersion: require('../../package.json').version,
        }),
      });
    } catch (error) {
      console.error('Device registration failed:', error);
    }
  }

  /**
   * Setup FCM message listeners
   */
  private setupMessageListeners(): void {
    // Foreground message handler
    messaging().onMessage(async (message) => {
      console.log('Message received (foreground):', message);

      // Show notification
      if (message.notification) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: message.notification.title || 'Clearway',
            body: message.notification.body || '',
            data: message.data || {},
            badge: 1,
          },
          trigger: { seconds: 1 },
        });
      }

      // Save to store
      this.addNotification({
        title: message.notification?.title || '',
        body: message.notification?.body || '',
        type: message.data?.type || 'NOTIFICATION',
        relatedId: message.data?.relatedId,
        actionUrl: message.data?.actionUrl,
      });
    });

    // Background message handler
    messaging().setBackgroundMessageHandler(
      async (message) => {
        console.log('Message received (background):', message);

        // Show notification
        if (message.notification) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title:
                message.notification.title || 'Clearway',
              body: message.notification.body || '',
              data: message.data || {},
              badge: 1,
            },
            trigger: { seconds: 2 },
          });
        }
      }
    );

    // App launch from notification
    messaging().onNotificationOpenedApp((message) => {
      console.log('App opened by notification:', message);
      this.handleNotificationAction(
        message.data?.actionUrl || ''
      );
    });

    // Check if app was opened from notification
    messaging()
      .getInitialNotification()
      .then((message) => {
        if (message) {
          console.log('App opened from notification:', message);
          this.handleNotificationAction(
            message.data?.actionUrl || ''
          );
        }
      });
  }

  /**
   * Setup notification interaction
   */
  private setupNotificationInteraction(): void {
    // When user taps notification
    this.notificationSubscription =
      Notifications.addNotificationResponseReceivedListener(
        (response) => {
          const actionUrl =
            response.notification.request.content.data
              ?.actionUrl;

          if (actionUrl) {
            this.handleNotificationAction(actionUrl);
          }
        }
      );
  }

  /**
   * Handle notification action (deep linking)
   */
  private async handleNotificationAction(
    actionUrl: string
  ): Promise<void> {
    // Parse URL and navigate
    // e.g., /capital-calls/123
    console.log('Handling notification action:', actionUrl);
    // Navigation handled by deep linking service
  }

  /**
   * Save notification to database
   */
  private async addNotification(data: {
    title: string;
    body: string;
    type: string;
    relatedId?: string;
    actionUrl?: string;
  }): Promise<void> {
    try {
      const collection = database.get('notifications');
      await database.write(async () => {
        await collection.create((record) => {
          record.title = data.title;
          record.body = data.body;
          record.type = data.type;
          record.relatedId = data.relatedId;
          record.actionUrl = data.actionUrl;
          record.read = false;
        });
      });

      useNotificationStore.setState((state) => ({
        notifications: [
          {
            id: Date.now().toString(),
            ...data,
            read: false,
            createdAt: Date.now(),
          },
          ...state.notifications,
        ],
        unreadCount: state.unreadCount + 1,
      }));
    } catch (error) {
      console.error('Failed to save notification:', error);
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const collection = database.get('notifications');
      const notification = await collection.find(notificationId);

      await database.write(async () => {
        await notification.update((record) => {
          record.read = true;
        });
      });

      useNotificationStore.setState((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }

  /**
   * Get unread notifications
   */
  async getUnreadNotifications(): Promise<number> {
    try {
      const collection = database.get('notifications');
      const unread = await collection.query(
        Q.where('read', false)
      ).fetchCount();

      return unread;
    } catch (error) {
      console.error('Failed to get unread count:', error);
      return 0;
    }
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    if (this.notificationSubscription) {
      this.notificationSubscription.remove();
    }
  }

  private notificationSubscription: any;
}

export const notificationsService = new NotificationsService();
```

**Notifications Store**
```typescript
// src/store/notifications.store.ts

import { create } from 'zustand';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'CAPITAL_CALL' | 'APPROVAL' | 'NOTIFICATION';
  relatedId?: string;
  actionUrl?: string;
  read: boolean;
  createdAt: number;
}

interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationsState>(
  (set) => ({
    notifications: [],
    unreadCount: 0,
    addNotification: (notification) =>
      set((state) => ({
        notifications: [notification, ...state.notifications],
        unreadCount: state.unreadCount + 1,
      })),
    markAsRead: (id) =>
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      })),
    clearAll: () =>
      set({
        notifications: [],
        unreadCount: 0,
      }),
  })
);
```

**Acceptance Criteria**:
- ✅ FCM setup and token management
- ✅ Both foreground and background notification handling
- ✅ Notification persistence to database
- ✅ Badge count management
- ✅ Notification read/unread state
- ✅ Deep linking integration (prepared)
- ✅ Device token registration

**Dependencies**: None (can start immediately)

---

**Task MOBILE-007: Deep Linking Implementation**
```typescript
// src/services/deeplink.service.ts

import * as Linking from 'expo-linking';
import { useNavigation } from '@react-navigation/native';

export interface DeepLinkRoute {
  path: string;
  handler: (params: Record<string, any>) => void;
}

export class DeepLinkService {
  private routes: Map<string, DeepLinkRoute> = new Map();

  /**
   * Initialize deep linking
   */
  initialize(navigation: any): void {
    // Register routes
    this.registerRoutes();

    // Handle initial URL
    Linking.getInitialURL().then((url) => {
      if (url != null) {
        this.handleUrl(url, navigation);
      }
    });

    // Listen for URL changes
    Linking.addEventListener('url', ({ url }) => {
      this.handleUrl(url, navigation);
    });
  }

  /**
   * Register deep link routes
   */
  private registerRoutes(): void {
    this.routes.set('capital-calls/:id', {
      path: 'capital-calls/:id',
      handler: (params) => {
        // Navigate to capital call detail
      },
    });

    this.routes.set('documents/:id', {
      path: 'documents/:id',
      handler: (params) => {
        // Navigate to document viewer
      },
    });

    this.routes.set('notifications', {
      path: 'notifications',
      handler: (params) => {
        // Navigate to notifications
      },
    });

    this.routes.set('profile', {
      path: 'profile',
      handler: (params) => {
        // Navigate to profile
      },
    });
  }

  /**
   * Handle deep link URL
   */
  private handleUrl(url: string, navigation: any): void {
    const parts = Linking.parse(url);
    const pathname = parts.path || '';

    console.log('Deep link:', pathname);

    // Match route
    for (const [, route] of this.routes) {
      if (this.matchRoute(pathname, route.path)) {
        const params = this.extractParams(
          pathname,
          route.path
        );
        route.handler(params);

        // Navigate
        this.navigate(navigation, route.path, params);
        break;
      }
    }
  }

  /**
   * Match route pattern
   */
  private matchRoute(pathname: string, pattern: string): boolean {
    const patternRegex = pattern.replace(
      /:(\w+)/g,
      '([^/]+)'
    );
    return new RegExp(`^${patternRegex}$`).test(pathname);
  }

  /**
   * Extract parameters from URL
   */
  private extractParams(
    pathname: string,
    pattern: string
  ): Record<string, any> {
    const params: Record<string, any> = {};
    const patternParts = pattern.split('/');
    const pathParts = pathname.split('/');

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        const paramName = patternParts[i].substring(1);
        params[paramName] = pathParts[i];
      }
    }

    return params;
  }

  /**
   * Navigate based on deep link
   */
  private navigate(
    navigation: any,
    route: string,
    params: Record<string, any>
  ): void {
    if (route.includes('capital-calls')) {
      navigation.navigate('CapitalCallDetail', {
        id: params.id,
      });
    } else if (route.includes('documents')) {
      navigation.navigate('DocumentViewer', { id: params.id });
    } else if (route === 'notifications') {
      navigation.navigate('Notifications');
    } else if (route === 'profile') {
      navigation.navigate('Profile');
    }
  }

  /**
   * Generate deep link URL
   */
  generateLink(path: string, params?: Record<string, any>): string {
    const baseUrl = 'https://clearway.app';
    let url = `${baseUrl}/${path}`;

    if (params) {
      const queryString = new URLSearchParams(params).toString();
      url += `?${queryString}`;
    }

    return url;
  }

  /**
   * Generate dynamic link (Firebase Dynamic Links)
   */
  async generateDynamicLink(
    path: string,
    params?: Record<string, any>
  ): Promise<string> {
    try {
      const link = this.generateLink(path, params);

      // Use Firebase Dynamic Links API
      const dynamicLink = await fetch(
        'https://firebasedynamiclinks.googleapis.com/v1/shortLinks',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            longDynamicLink:
              'https://clearwayapp.page.link/?link=' +
              encodeURIComponent(link) +
              '&apn=com.clearway.mobile&ibi=com.clearway&isi=1234567890',
          }),
        }
      );

      const result = await dynamicLink.json();
      return result.shortLink;
    } catch (error) {
      console.error('Dynamic link generation failed:', error);
      return this.generateLink(path, params);
    }
  }
}

export const deeplinkService = new DeepLinkService();

// src/navigation/RootNavigator.tsx

import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { deeplinkService } from '@/services/deeplink.service';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';
import { useAuthStore } from '@/store/auth.store';

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  const isAuthenticated = useAuthStore(
    (state) => state.isAuthenticated
  );

  const linking = {
    prefixes: ['https://clearway.app', 'clearway://'],
    config: {
      screens: {
        CapitalCallDetail: 'capital-calls/:id',
        DocumentViewer: 'documents/:id',
        Notifications: 'notifications',
        Profile: 'profile',
      },
    },
  };

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="App" component={AppNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

**Acceptance Criteria**:
- ✅ Deep link routing functional
- ✅ URL parsing works correctly
- ✅ Parameter extraction working
- ✅ Universal Links configured (iOS)
- ✅ App Links configured (Android)
- ✅ Firebase Dynamic Links integration
- ✅ QR code scanning support (ready)
- ✅ Fallback to web app handling

**Dependencies**:
- Task MOBILE-006: Push notifications ready

---

### Week 36: Capital Call Review UI & Analytics (Days 16-20)

**Task MOBILE-008: Capital Call Review Screen**
```typescript
// src/screens/CapitalCallDetailScreen.tsx

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import PDFView from 'react-native-pdf';
import {
  useCapitalCallsStore,
  useAuthStore,
} from '@/store/capital-calls.store';
import { syncService } from '@/services/sync.service';
import { styles } from '@/styles/capital-call-detail.styles';

export function CapitalCallDetailScreen() {
  const route = useRoute<any>();
  const { id } = route.params;
  const capitalCalls = useCapitalCallsStore(
    (state) => state.capitalCalls
  );
  const authToken = useAuthStore((state) => state.token);

  const [call, setCall] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    loadCapitalCall();
  }, [id]);

  const loadCapitalCall = async () => {
    try {
      const found = capitalCalls.find((c) => c.id === id);
      if (found) {
        setCall(found);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    Alert.alert('Approve Capital Call', 'Are you sure?', [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Approve',
        onPress: async () => {
          setApproving(true);
          try {
            await syncService.queueAction(
              'CAPITAL_CALL',
              call.id,
              'UPDATE',
              {
                status: 'APPROVED',
              }
            );

            useCapitalCallsStore.getState().updateCapitalCall(
              call.id,
              { status: 'APPROVED' }
            );

            Alert.alert(
              'Success',
              'Capital call approved'
            );
          } catch (error) {
            Alert.alert('Error', 'Failed to approve');
          } finally {
            setApproving(false);
          }
        },
      },
    ]);
  };

  const handleReject = async () => {
    Alert.alert(
      'Reject Capital Call',
      'Provide a reason (optional)',
      [
        { text: 'Cancel' },
        {
          text: 'Reject',
          onPress: async () => {
            setRejecting(true);
            try {
              await syncService.queueAction(
                'CAPITAL_CALL',
                call.id,
                'UPDATE',
                {
                  status: 'REJECTED',
                }
              );

              useCapitalCallsStore.getState().updateCapitalCall(
                call.id,
                { status: 'REJECTED' }
              );

              Alert.alert(
                'Success',
                'Capital call rejected'
              );
            } catch (error) {
              Alert.alert('Error', 'Failed to reject');
            } finally {
              setRejecting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066FF" />
      </View>
    );
  }

  if (!call) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>
          Capital call not found
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.fundName}>{call.fund}</Text>
        <Text style={styles.amount}>
          ${call.amount.toLocaleString()}
        </Text>
      </View>

      {/* Status Badge */}
      <View
        style={[
          styles.statusBadge,
          {
            backgroundColor:
              call.status === 'APPROVED'
                ? '#10b981'
                : call.status === 'REJECTED'
                ? '#ef4444'
                : '#f59e0b',
          },
        ]}
      >
        <Text style={styles.statusText}>{call.status}</Text>
      </View>

      {/* Details */}
      <View style={styles.detailsSection}>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Due Date</Text>
          <Text style={styles.value}>
            {new Date(call.dueDate).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Document</Text>
          <TouchableOpacity>
            <Text style={styles.link}>View Document</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Document Viewer */}
      {call.documentUrl && (
        <View style={styles.documentContainer}>
          <PDFView
            source={{ uri: call.documentUrl }}
            style={styles.pdf}
            onError={(error) =>
              console.error('PDF error:', error)
            }
          />
        </View>
      )}

      {/* Action Buttons */}
      {call.status === 'PENDING' && (
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.button, styles.approveButton]}
            onPress={handleApprove}
            disabled={approving}
          >
            {approving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Approve</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.rejectButton]}
            onPress={handleReject}
            disabled={rejecting}
          >
            {rejecting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Reject</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}
```

**Acceptance Criteria**:
- ✅ Capital call details load correctly
- ✅ PDF document viewer functional
- ✅ Status badge displays correctly
- ✅ Approve action works (queued for sync)
- ✅ Reject action works (queued for sync)
- ✅ Responsive layout for mobile
- ✅ Offline data loading from local DB

**Dependencies**:
- Task MOBILE-005: Offline database ready
- Task MOBILE-006: Sync service ready

---

**Task MOBILE-009: Mobile Analytics Integration**
```typescript
// src/services/analytics.service.ts

import analytics from '@react-native-firebase/analytics';
import { Segment } from '@segment/analytics-react-native';

export class AnalyticsService {
  /**
   * Initialize analytics
   */
  async initialize(): Promise<void> {
    try {
      // Firebase Analytics
      await analytics().setAnalyticsCollectionEnabled(true);

      // Segment
      const segmentClient = new Segment({
        writeKey: process.env.SEGMENT_WRITE_KEY!,
      });
      await segmentClient.setup();
    } catch (error) {
      console.error('Analytics initialization failed:', error);
    }
  }

  /**
   * Track screen view
   */
  async trackScreenView(
    screenName: string,
    screenClass?: string
  ): Promise<void> {
    try {
      await analytics().logScreenView({
        screen_name: screenName,
        screen_class: screenClass || screenName,
      });
    } catch (error) {
      console.error('Screen view tracking failed:', error);
    }
  }

  /**
   * Track event
   */
  async trackEvent(
    eventName: string,
    params?: Record<string, any>
  ): Promise<void> {
    try {
      await analytics().logEvent(eventName, params);
    } catch (error) {
      console.error('Event tracking failed:', error);
    }
  }

  /**
   * Track app open
   */
  async trackAppOpen(): Promise<void> {
    await this.trackEvent('app_open', {
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track authentication
   */
  async trackLogin(method: 'BIOMETRIC' | 'PIN'): Promise<void> {
    await this.trackEvent('login', {
      method,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track capital call action
   */
  async trackCapitalCallAction(
    action: 'VIEW' | 'APPROVE' | 'REJECT',
    callId: string
  ): Promise<void> {
    await this.trackEvent('capital_call_action', {
      action,
      callId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track document upload
   */
  async trackDocumentUpload(
    fileSize: number,
    duration: number
  ): Promise<void> {
    await this.trackEvent('document_upload', {
      fileSize,
      duration,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track notification interaction
   */
  async trackNotificationInteraction(
    notificationType: string,
    action: string
  ): Promise<void> {
    await this.trackEvent('notification_interaction', {
      type: notificationType,
      action,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track sync event
   */
  async trackSync(
    itemsCount: number,
    duration: number,
    status: 'SUCCESS' | 'FAILED'
  ): Promise<void> {
    await this.trackEvent('sync_event', {
      itemsCount,
      duration,
      status,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Set user properties
   */
  async setUserProperties(
    userId: string,
    properties: Record<string, any>
  ): Promise<void> {
    try {
      // Firebase
      await analytics().setUserId(userId);
      await analytics().setUserProperties(properties);
    } catch (error) {
      console.error('User properties setting failed:', error);
    }
  }

  /**
   * Track crash
   */
  async trackCrash(error: Error): Promise<void> {
    try {
      await analytics().logEvent('app_crash', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Crash tracking failed:', err);
    }
  }

  /**
   * Track performance
   */
  async trackPerformance(
    metric: string,
    value: number
  ): Promise<void> {
    await this.trackEvent('performance_metric', {
      metric,
      value,
      timestamp: new Date().toISOString(),
    });
  }
}

export const analyticsService = new AnalyticsService();

// src/hooks/useAnalytics.ts

import { useEffect } from 'react';
import { analyticsService } from '@/services/analytics.service';

export function useScreenAnalytics(
  screenName: string,
  screenClass?: string
) {
  useEffect(() => {
    analyticsService.trackScreenView(
      screenName,
      screenClass
    );
  }, [screenName, screenClass]);
}

export function useEventTracking(
  eventName: string,
  params?: Record<string, any>
) {
  const track = async () => {
    await analyticsService.trackEvent(eventName, params);
  };

  return track;
}

// Usage in components
// useScreenAnalytics('CapitalCallDetail');
// const trackApproval = useEventTracking('capital_call_approved');
// trackApproval();
```

**Acceptance Criteria**:
- ✅ Firebase Analytics integration complete
- ✅ Segment integration complete
- ✅ Screen view tracking
- ✅ Event tracking for key actions
- ✅ User properties set correctly
- ✅ Crash tracking functional
- ✅ Performance metrics tracked

**Dependencies**: None (can start immediately)

---

**Task MOBILE-010: App Store & Play Store Deployment**
```bash
# Build configuration for production

# iOS Build (using EAS)
eas build --platform ios --auto-submit

# Android Build (using EAS)
eas build --platform android --auto-submit

# Signing configuration
# ios/Clearway/Info.plist
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key>
  <string>Clearway</string>
  <key>CFBundleIdentifier</key>
  <string>com.clearway.mobile</string>
  <key>CFBundleVersion</key>
  <string>1</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0.0</string>
  <key>NSLocationWhenInUseUsageDescription</key>
  <string>Location needed for...</string>
  <key>NSCameraUsageDescription</key>
  <string>Camera needed to capture documents</string>
  <key>NSPhotoLibraryUsageDescription</key>
  <string>Photo library needed to select documents</string>
  <key>NSFaceIDUsageDescription</key>
  <string>Face ID needed for authentication</string>
</dict>
</plist>

# Android Configuration
# android/app/src/main/AndroidManifest.xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
  package="com.clearway.mobile">

  <uses-permission android:name="android.permission.INTERNET" />
  <uses-permission android:name="android.permission.CAMERA" />
  <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
  <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
  <uses-permission android:name="android.permission.USE_BIOMETRIC" />

  <application
    android:name=".MainApplication"
    android:label="@string/app_name"
    android:icon="@mipmap/ic_launcher"
    android:roundIcon="@mipmap/ic_launcher_round">
    ...
  </application>
</manifest>

# App Store submission script
# scripts/submit-ios.ts
const submitToAppStore = async () => {
  const ipa = 'build/Clearway.ipa';

  // Validate
  await validateApp(ipa);

  // Altool submission
  exec(`xcrun altool --upload-app -f ${ipa} -t ios -u $APP_STORE_EMAIL -p $APP_STORE_PASSWORD`);

  // Monitor status
  await waitForReview();
};

# Google Play submission script
# scripts/submit-android.ts
const submitToPlayStore = async () => {
  const aab = 'build/Clearway.aab';

  // Bundle analysis
  await analyzeBundle(aab);

  // Upload to Play Store
  await uploadToPlayStore(aab);

  // Set release notes
  await setReleaseNotes('1.0.0', 'Initial release');
};
```

**Acceptance Criteria**:
- ✅ iOS provisioning profiles configured
- ✅ Android signing certificates configured
- ✅ App icons and screenshots prepared
- ✅ Privacy policy and terms available
- ✅ EAS builds configured
- ✅ TestFlight submission working
- ✅ Google Play internal testing setup
- ✅ Automated submission scripts ready

**Dependencies**:
- All previous tasks completed

---

## Architecture Decisions

### React Native Architecture

```typescript
// Project structure
src/
├── screens/          # Screen components
├── components/       # Reusable components
├── services/         # Business logic (auth, sync, etc.)
├── store/            # Zustand stores
├── db/               # WatermelonDB models
├── navigation/       # Navigation configuration
├── styles/           # Shared styles
├── hooks/            # Custom hooks
├── utils/            # Helper functions
├── constants/        # App constants
└── types/            # TypeScript types

// State Management Architecture
App
├── useAuthStore      # Authentication state
├── useCapitalCallsStore  # Capital calls data
├── useNotificationStore  # Notifications
└── Navigation        # Orchestrates based on auth state

// Data Flow
1. User Action
2. Service Layer (business logic)
3. Zustand Store (update global state)
4. WatermelonDB (persist locally)
5. SyncService (queue for backend)
6. Re-render components subscribed to store

// Offline-First Flow
User -> Local Store -> Render
         ↓
    Queue for Sync
         ↓
    When Online -> Backend -> Sync Status Update
```

### Security Architecture

1. **Authentication Flow**:
   - Biometric enrollment on first login
   - PIN fallback for devices without biometrics
   - Token stored in Keychain (iOS) / Keystore (Android)
   - Automatic token refresh with expiry

2. **Data Encryption**:
   - MMKV for sensitive data encryption
   - Keychain/Keystore for credentials
   - TLS 1.3 for all network communications
   - Device attestation for app integrity

3. **Permission Management**:
   - Runtime permissions for camera, location
   - Biometric permission checks
   - File system access sandboxing
   - Network security configuration

---

## Timeline (Phase 3 - Weeks 33-36)

### Week 33: Foundation & Auth
- Day 1-5: Project setup, Expo configuration, TypeScript
- Day 6-10: Biometric auth, PIN fallback, token management

### Week 34: Offline & Sync
- Day 1-5: Document capture, camera integration, OCR
- Day 6-10: WatermelonDB setup, sync service, conflict resolution

### Week 35: Notifications & Deep Linking
- Day 1-5: FCM setup, push notifications, notification persistence
- Day 6-10: Deep linking routes, Universal/App Links, dynamic links

### Week 36: UI & Release
- Day 1-5: Capital call review UI, document viewer, actions
- Day 6-10: Analytics setup, App Store/Play Store submission, testing

---

## Success Metrics

### User Engagement
- **App Store Rating**: 4.5+ stars
- **Download Target**: 500+ active installs by end of Phase 3
- **Daily Active Users (DAU)**: 100+ DAU
- **Monthly Active Users (MAU)**: 250+ MAU
- **Session Length**: 3-5 minutes average

### Technical Performance
- **App Start Time**: < 2 seconds
- **Capital Call Load Time**: < 1 second
- **Document Upload Success Rate**: > 99%
- **Sync Success Rate**: > 98%
- **Crash Rate**: < 0.1%
- **Biometric Success Rate**: > 95%

### Business Metrics
- **Capital Call Approval Rate**: > 85%
- **Offline Usage**: > 30% of sessions
- **Push Notification Open Rate**: > 40%
- **Deep Link Conversion**: > 75% of clicked links
- **Document Capture Success**: > 90%

### Operational Metrics
- **App Size**: < 150 MB (iOS), < 100 MB (Android)
- **Battery Impact**: < 2% per 1-hour session
- **Data Usage**: < 5 MB per month
- **API Response Time**: < 500ms (p95)
- **Sync Latency**: < 5 seconds

---

## Dependencies Between Tasks

```
MOBILE-001 (Setup)
    ↓
MOBILE-002 (Auth) ← MOBILE-003 (State Management)
    ↓
MOBILE-004 (Document Capture)
    ↓
MOBILE-005 (Offline DB) ← Connected to MOBILE-002 & MOBILE-004
    ↓
MOBILE-006 (Push Notifications)
    ↓
MOBILE-007 (Deep Linking) ← Depends on MOBILE-006
    ↓
MOBILE-008 (Capital Call Review) ← Depends on MOBILE-005
    ↓
MOBILE-009 (Analytics)
    ↓
MOBILE-010 (App Store Deployment) ← All previous tasks
```

---

## Acceptance Criteria Summary

All mobile app features must meet these criteria before Phase 3 completion:

- ✅ React Native app runs on iOS 14+ and Android 11+
- ✅ Biometric and PIN authentication working
- ✅ Offline data persistence with automatic sync
- ✅ Document capture with edge detection and OCR
- ✅ Capital call review with approval/rejection
- ✅ Push notifications with deep linking
- ✅ All analytics events tracked
- ✅ App Store and Play Store submissions approved
- ✅ 4.5+ star rating on both stores
- ✅ 500+ active installs
- ✅ < 0.1% crash rate
- ✅ > 95% uptime
- ✅ Zero data loss during offline transitions

---

## Handoff Notes

### For Backend Agent
- Provide `/sync/pull` endpoint returning latest data
- Implement biometric signature verification
- Support optimistic UI updates with conflict resolution
- Provide push notification endpoints

### For DevOps Agent
- Setup Apple Developer and Google Play accounts
- Configure Expo EAS build service
- Setup Firebase projects (Analytics, Crashlytics, Dynamic Links)
- Configure CDN for document serving
- Setup API rate limiting for mobile clients

### For Frontend Agent
- Coordinate on authentication state management
- Align notification handling
- Share component library / design system
- Coordinate analytics events

---

## Future Enhancements (Phase 4+)

- Offline signature capture
- Multi-language support
- Accessibility improvements (voice commands)
- Advanced biometric options (iris scanning)
- Wear OS companion app
- Progressive Web App (PWA) mobile web version
- Augmented Reality (AR) document preview
- Voice-based capital call approval
