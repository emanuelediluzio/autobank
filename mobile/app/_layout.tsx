// mobile/app/_layout.tsx
import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../store/useAuthStore';
import { useNotifications } from '../hooks/useNotifications';
import { useBiometrics } from '../hooks/useBiometrics';
import { theme } from '../theme';

function LockScreen({ onUnlock, biometricLabel }: { onUnlock: () => void; biometricLabel: string }) {
  return (
    <View style={lockStyles.container}>
      <StatusBar style="light" />
      <Text style={lockStyles.lockIcon}>{'\uD83D\uDD12'}</Text>
      <Text style={lockStyles.title}>Autobank</Text>
      <Text style={lockStyles.subtitle}>App bloccata</Text>
      <TouchableOpacity style={lockStyles.btn} onPress={onUnlock}>
        <Text style={lockStyles.btnText}>
          {biometricLabel ? `Sblocca con ${biometricLabel}` : 'Sblocca'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const lockStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  lockIcon: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '700', color: theme.colors.accent, marginBottom: 8 },
  subtitle: { fontSize: 15, color: theme.colors.textMuted, marginBottom: 32 },
  btn: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
  btnText: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
});

export default function RootLayout() {
  const loadFromStorage = useAuthStore(s => s.loadFromStorage);
  const isOnboarded = useAuthStore(s => s.isOnboarded);
  const { isEnabled, isAuthenticated, isChecking, authenticate, biometricLabel } = useBiometrics();
  const [authLoaded, setAuthLoaded] = useState(false);

  useEffect(() => {
    loadFromStorage().then(() => setAuthLoaded(true));
  }, []);

  useNotifications();

  // Auto-authenticate on app start if biometrics enabled
  useEffect(() => {
    if (authLoaded && isOnboarded && isEnabled && !isAuthenticated && !isChecking) {
      authenticate();
    }
  }, [authLoaded, isOnboarded, isEnabled, isAuthenticated, isChecking]);

  // Show loading while auth state is being loaded
  if (!authLoaded || isChecking) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  // Show lock screen if biometrics enabled but not yet authenticated
  if (isOnboarded && isEnabled && !isAuthenticated) {
    return <LockScreen onUnlock={authenticate} biometricLabel={biometricLabel} />;
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.bg },
          headerTintColor: theme.colors.text,
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: theme.colors.bg },
        }}
      >
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="chat" options={{ title: 'Assistente AI', headerShadowVisible: false }} />
        <Stack.Screen name="settings" options={{ title: 'Impostazioni', presentation: 'modal' }} />
        <Stack.Screen name="account/[id]" options={{ title: 'Dettaglio Conto' }} />
        <Stack.Screen name="transaction/[id]" options={{ title: 'Dettaglio Transazione' }} />
      </Stack>
    </>
  );
}
