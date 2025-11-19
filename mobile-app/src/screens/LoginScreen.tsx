import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { authService } from '../services/auth.service';
import { useScreenAnalytics } from '../hooks/useAnalytics';

export function LoginScreen() {
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [useBiometric, setUseBiometric] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useScreenAnalytics('Login');

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#0066FF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
  },
  form: {
    width: '100%',
    maxWidth: 400,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  button: {
    backgroundColor: '#0066FF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  biometricButton: {
    backgroundColor: '#10b981',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerText: {
    color: '#0066FF',
    fontSize: 14,
    fontWeight: '500',
  },
});
