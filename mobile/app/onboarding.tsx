// mobile/app/onboarding.tsx
import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/useAuthStore';
import { createRequisition, getConsentStatus } from '../services/api';
import { BankPicker } from '../components/BankPicker';
import { theme } from '../theme';

const COUNTRIES = [
  { code: 'IT', label: 'Italia' },
  { code: 'GB', label: 'UK' },
  { code: 'DE', label: 'Germania' },
  { code: 'FR', label: 'Francia' },
];

type Step = 'welcome' | 'bank';

export default function OnboardingScreen() {
  const [step, setStep] = useState<Step>('welcome');
  const [country, setCountry] = useState('IT');
  const [selectedBank, setSelectedBank] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState('');
  const setConsentToken = useAuthStore(s => s.setConsentToken);
  const router = useRouter();

  const handleConnect = async () => {
    if (!selectedBank) return;
    setLoading(true);
    setError('');
    setLoadingMessage('Connessione alla banca...');

    try {
      const { id: consentId, link } = await createRequisition(selectedBank.id);

      setLoadingMessage('Apertura portale bancario...');

      // Flusso: banca -> auth.yapily.com (gestisce fragment OIDC)
      //       -> server /callback?one-time-token=XXX (scambia per consentToken)
      //       -> autobank://callback?consentToken=XXX (deep link all'app)
      const redirectUrl = 'autobank://callback';

      const result = await WebBrowser.openAuthSessionAsync(link, redirectUrl);

      let consentToken: string | null = null;

      // Caso 1: deep link ricevuto con consentToken
      if (result.type === 'success' && result.url) {
        const url = new URL(result.url);
        consentToken = url.searchParams.get('consentToken');
      }

      // Caso 2: browser chiuso manualmente - polla lo status
      if (!consentToken) {
        setLoadingMessage('Verifica autorizzazione...');
        for (let i = 0; i < 15; i++) {
          await new Promise(r => setTimeout(r, 2000));
          try {
            const res = await getConsentStatus(consentId);
            if (res.status === 'AUTHORIZED' && res.consentToken) {
              consentToken = res.consentToken;
              break;
            }
          } catch {}
        }
      }

      if (consentToken) {
        setLoadingMessage('Configurazione completata!');
        await setConsentToken(consentToken);
        router.replace('/(tabs)');
      } else if (result.type === 'cancel') {
        setError('Autorizzazione annullata. Riprova.');
      } else {
        setError('Autorizzazione non completata. Riprova.');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const handleSkip = async () => {
    // Modalita demo: imposta un token fittizio
    await setConsentToken('demo-mode');
    router.replace('/(tabs)');
  };

  // Welcome step
  if (step === 'welcome') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.welcomeContent}>
          <Text style={styles.welcomeIcon}>{'\uD83C\uDFE6'}</Text>
          <Text style={styles.logo}>autobank</Text>
          <Text style={styles.welcomeTitle}>
            Il tuo assistente finanziario personale
          </Text>

          <View style={styles.featureList}>
            <FeatureItem
              icon={'\uD83D\uDCCA'}
              title="Panoramica completa"
              description="Visualizza tutti i tuoi conti e transazioni in un unico posto"
            />
            <FeatureItem
              icon={'\uD83D\uDCB0'}
              title="Controllo spese"
              description="Monitora le tue spese per categoria con budget personalizzati"
            />
            <FeatureItem
              icon={'\uD83D\uDD14'}
              title="Notifiche intelligenti"
              description="Ricevi avvisi in tempo reale per ogni movimento"
            />
            <FeatureItem
              icon={'\uD83D\uDD12'}
              title="Sicuro e privato"
              description="I tuoi dati sono protetti con crittografia e autenticazione biometrica"
            />
          </View>

          <TouchableOpacity style={styles.btn} onPress={() => setStep('bank')}>
            <Text style={styles.btnText}>Inizia</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Bank connection step
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setStep('welcome')}>
          <Text style={styles.backBtnText}>{'\u2190'} Indietro</Text>
        </TouchableOpacity>

        <Text style={styles.logo}>autobank</Text>
        <Text style={styles.subtitle}>Collega la tua banca per iniziare</Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.accent} />
            <Text style={styles.loadingText}>{loadingMessage}</Text>
            <View style={styles.loadingDots}>
              <View style={[styles.dot, styles.dotActive]} />
              <View style={[styles.dot, styles.dotActive]} />
              <View style={styles.dot} />
            </View>
          </View>
        ) : (
          <>
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
              style={[styles.btn, !selectedBank && styles.btnDisabled]}
              onPress={handleConnect}
              disabled={!selectedBank}
            >
              <Text style={styles.btnText}>Collega banca</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
              <Text style={styles.skipBtnText}>Collega dopo</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

function FeatureItem({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <View style={styles.featureText}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: { flex: 1, padding: 24, paddingTop: 20 },
  welcomeContent: { flex: 1, padding: 24, paddingTop: 60, justifyContent: 'center' },
  welcomeIcon: { fontSize: 48, textAlign: 'center', marginBottom: 8 },
  logo: { fontSize: 32, fontWeight: '700', color: theme.colors.accent, textAlign: 'center' },
  welcomeTitle: {
    fontSize: 17,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 36,
    lineHeight: 24,
  },
  featureList: { gap: 20, marginBottom: 40 },
  featureItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  featureIcon: { fontSize: 24, marginTop: 2 },
  featureText: { flex: 1 },
  featureTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '600', marginBottom: 2 },
  featureDescription: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 18 },
  backBtn: { marginBottom: 16 },
  backBtnText: { color: theme.colors.accent, fontSize: 15, fontWeight: '500' },
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
  skipBtn: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  skipBtnText: { color: theme.colors.textMuted, fontWeight: '600', fontSize: 15 },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    color: theme.colors.textMuted,
    fontSize: 15,
    textAlign: 'center',
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.border,
  },
  dotActive: {
    backgroundColor: theme.colors.accent,
  },
});
