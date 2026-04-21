/**
 * Biometric Lock — Face ID / Fingerprint authentication for app open.
 * Persisted toggle in AsyncStorage. Used by AppNavigator to gate the UI.
 */
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'biometric_lock_enabled';

export const isBiometricAvailable = async () => {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  } catch { return false; }
};

export const isBiometricEnabled = async () => {
  try { return (await AsyncStorage.getItem(KEY)) === '1'; } catch { return false; }
};

export const setBiometricEnabled = async (enabled) => {
  try { await AsyncStorage.setItem(KEY, enabled ? '1' : '0'); } catch {}
};

export const authenticateBiometric = async (reason = 'Unlock Tortrose') => {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      fallbackLabel: 'Use Passcode',
      disableDeviceFallback: false,
      cancelLabel: 'Cancel',
    });
    return result.success;
  } catch { return false; }
};
