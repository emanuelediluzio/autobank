// mobile/hooks/useBiometrics.ts
import { useEffect, useState, useCallback } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BIOMETRIC_ENABLED_KEY = '@autobank:biometric_enabled';

type BiometricType = 'face' | 'fingerprint' | 'iris' | 'none';

interface BiometricState {
  isAvailable: boolean;
  isEnabled: boolean;
  biometricType: BiometricType;
  biometricLabel: string;
  isAuthenticated: boolean;
  isChecking: boolean;
  authenticate: () => Promise<boolean>;
  setEnabled: (enabled: boolean) => Promise<void>;
}

function mapAuthType(types: LocalAuthentication.AuthenticationType[]): { type: BiometricType; label: string } {
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return { type: 'face', label: 'Face ID' };
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return { type: 'fingerprint', label: 'Touch ID' };
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return { type: 'iris', label: 'Iris' };
  }
  return { type: 'none', label: '' };
}

export function useBiometrics(): BiometricState {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isEnabled, setIsEnabledState] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometricType>('none');
  const [biometricLabel, setBiometricLabel] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const available = hasHardware && isEnrolled;
      setIsAvailable(available);

      if (available) {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        const { type, label } = mapAuthType(types);
        setBiometricType(type);
        setBiometricLabel(label);
      }

      const storedEnabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
      setIsEnabledState(storedEnabled === 'true');
      setIsChecking(false);
    })();
  }, []);

  const authenticate = useCallback(async (): Promise<boolean> => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Autenticati per accedere ad Autobank',
        cancelLabel: 'Annulla',
        disableDeviceFallback: false,
        fallbackLabel: 'Usa il codice',
      });
      setIsAuthenticated(result.success);
      return result.success;
    } catch {
      return false;
    }
  }, []);

  const setEnabled = useCallback(async (enabled: boolean) => {
    if (enabled) {
      // Verify biometrics work before enabling
      const success = await authenticate();
      if (!success) return;
    }
    await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, String(enabled));
    setIsEnabledState(enabled);
    if (!enabled) {
      setIsAuthenticated(true); // No lock needed if disabled
    }
  }, [authenticate]);

  return {
    isAvailable,
    isEnabled,
    biometricType,
    biometricLabel,
    isAuthenticated,
    isChecking,
    authenticate,
    setEnabled,
  };
}
