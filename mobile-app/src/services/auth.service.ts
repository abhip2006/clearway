import * as SecureStore from 'expo-secure-store';
import * as Keychain from 'react-native-keychain';
import ReactNativeBiometrics from 'react-native-biometrics';
import { useAuthStore } from '../store/auth.store';

const API_URL = process.env.API_URL || 'https://api.clearway.app';

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
      return { available, biometryType: biometryType as any };
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

      const { publicKey } = await this.rnBiometrics.createKeys('biometricKey');

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
      const { success, signature } = await this.rnBiometrics.createSignature({
        promptMessage: 'Authenticate to access Clearway',
        payload: email,
      });

      if (!success) return null;

      // Verify signature on backend
      const token = await this.verifyBiometricSignature(email, signature);

      if (token) {
        await this.storeTokens(token);
        useAuthStore.setState({
          isAuthenticated: true,
          user: { email, id: '', name: '', organizationId: '', role: 'VIEWER' },
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

      const { token, refreshToken, user } = await response.json();
      await this.storeTokens(token, refreshToken);

      useAuthStore.setState({
        isAuthenticated: true,
        user,
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
        await SecureStore.setItemAsync(this.refreshTokenKey, refreshToken);
      }

      // Also store in Keychain for biometric
      await Keychain.setGenericPassword('clearway_token', token, {
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
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
      const response = await fetch(`${API_URL}/auth/verify-biometric`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, signature }),
      });

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
