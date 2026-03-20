// mobile/app/_layout.tsx
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../store/useAuthStore';
import { useNotifications } from '../hooks/useNotifications';
import { theme } from '../theme';

export default function RootLayout() {
  const loadFromStorage = useAuthStore(s => s.loadFromStorage);

  useEffect(() => { loadFromStorage(); }, []);

  useNotifications();

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
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ title: 'Impostazioni', presentation: 'modal' }} />
        <Stack.Screen name="account/[id]" options={{ title: 'Dettaglio Conto' }} />
      </Stack>
    </>
  );
}
