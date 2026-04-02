// mobile/app/auth.tsx
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/useAuthStore';
import { theme } from '../theme';

type Mode = 'login' | 'signup';

export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, signup } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Compila tutti i campi');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (mode === 'signup') {
        await signup(email.trim(), password, name.trim() || undefined);
      } else {
        await login(email.trim(), password);
      }
      router.replace('/onboarding');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    router.replace('/onboarding');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inner}>
        <View style={styles.header}>
          <Text style={styles.logo}>autobank</Text>
          <Text style={styles.subtitle}>
            {mode === 'login' ? 'Accedi al tuo account' : 'Crea il tuo account'}
          </Text>
        </View>

        <View style={styles.form}>
          {mode === 'signup' && (
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>Nome</Text>
              <TextInput
                style={styles.input}
                placeholder="Il tuo nome"
                placeholderTextColor={theme.colors.textMuted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={styles.inputWrap}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="email@esempio.com"
              placeholderTextColor={theme.colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputWrap}>
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Minimo 6 caratteri"
              placeholderTextColor={theme.colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.bg} />
            ) : (
              <Text style={styles.btnText}>
                {mode === 'login' ? 'Accedi' : 'Registrati'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchBtn}
            onPress={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
          >
            <Text style={styles.switchText}>
              {mode === 'login' ? 'Non hai un account? ' : 'Hai gia un account? '}
              <Text style={styles.switchTextAccent}>
                {mode === 'login' ? 'Registrati' : 'Accedi'}
              </Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
            <Text style={styles.skipText}>Continua senza account</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  inner: { flex: 1, padding: 24, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 40 },
  logo: { fontSize: 36, fontWeight: '800', color: theme.colors.accent, letterSpacing: -1 },
  subtitle: { fontSize: 16, color: theme.colors.textSecondary, marginTop: 8 },
  form: { gap: 16 },
  inputWrap: { gap: 6 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    color: theme.colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  error: { color: theme.colors.danger, textAlign: 'center', fontSize: 14 },
  btn: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
  switchBtn: { alignItems: 'center', paddingVertical: 12 },
  switchText: { color: theme.colors.textMuted, fontSize: 14 },
  switchTextAccent: { color: theme.colors.accent, fontWeight: '600' },
  skipBtn: { alignItems: 'center', paddingVertical: 8 },
  skipText: { color: theme.colors.textMuted, fontSize: 13, textDecorationLine: 'underline' },
});
