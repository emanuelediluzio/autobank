// mobile/app/onboarding.tsx
import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/useAuthStore';
import { createRequisition } from '../services/api';
import { BankPicker } from '../components/BankPicker';
import { theme } from '../theme';

const COUNTRIES = [
  { code: 'IT', label: 'Italia' },
  { code: 'GB', label: 'UK' },
  { code: 'DE', label: 'Germania' },
  { code: 'FR', label: 'Francia' },
];

export default function OnboardingScreen() {
  const [country, setCountry] = useState('IT');
  const [selectedBank, setSelectedBank] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const setConsentToken = useAuthStore(s => s.setConsentToken);
  const router = useRouter();

  const handleConnect = async () => {
    if (!selectedBank) return;
    setLoading(true);
    setError('');

    try {
      const { link } = await createRequisition(selectedBank.id);

      // The redirect URL is autobank://callback — the server will redirect there after exchanging the code
      const redirectUrl = 'autobank://callback';

      const result = await WebBrowser.openAuthSessionAsync(link, redirectUrl);

      if (result.type === 'success' && result.url) {
        const url = new URL(result.url);
        const consentToken = url.searchParams.get('consentToken');

        if (consentToken) {
          await setConsentToken(consentToken);
          router.replace('/(tabs)');
        } else {
          setError('Nessun token ricevuto. Riprova.');
        }
      } else if (result.type === 'cancel') {
        setError('Autorizzazione annullata.');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logo}>autobank</Text>
        <Text style={styles.subtitle}>Collega la tua banca per iniziare</Text>

        <Text style={styles.label}>Paese</Text>
        <View style={styles.countryRow}>
          {COUNTRIES.map(c => (
            <TouchableOpacity
              key={c.code}
              style={[styles.countryBtn, country === c.code && styles.countryActive]}
              onPress={() => { setCountry(c.code); setSelectedBank(null); }}
            >
              <Text style={[styles.countryText, country === c.code && styles.countryActiveText]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Banca</Text>
        <BankPicker country={country} onSelect={setSelectedBank} selected={selectedBank?.id || null} />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.btn, (!selectedBank || loading) && styles.btnDisabled]}
          onPress={handleConnect}
          disabled={!selectedBank || loading}
        >
          <Text style={styles.btnText}>{loading ? 'Collegamento...' : 'Collega banca'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: { flex: 1, padding: 24, paddingTop: 60 },
  logo: { fontSize: 32, fontWeight: '700', color: theme.colors.accent, textAlign: 'center' },
  subtitle: { fontSize: 15, color: theme.colors.textMuted, textAlign: 'center', marginTop: 8, marginBottom: 32 },
  label: { fontSize: 13, color: theme.colors.textMuted, fontWeight: '500', marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  countryRow: { flexDirection: 'row', gap: 8 },
  countryBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  countryActive: { borderColor: theme.colors.accent, backgroundColor: theme.colors.surfaceHover },
  countryText: { color: theme.colors.textMuted, fontWeight: '500' },
  countryActiveText: { color: theme.colors.accent },
  btn: { marginTop: 24, backgroundColor: theme.colors.accent, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: theme.colors.bg, fontWeight: '700', fontSize: 16 },
  error: { color: theme.colors.danger, marginTop: 12, textAlign: 'center' },
});
