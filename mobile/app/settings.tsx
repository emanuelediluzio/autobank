// mobile/app/settings.tsx
import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Switch, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useBiometrics } from '../hooks/useBiometrics';
import { BudgetSlider } from '../components/BudgetSlider';
import { theme } from '../theme';

const CATEGORIES = [
  { id: 'alimentari', label: 'Alimentari', icon: '\uD83D\uDED2' },
  { id: 'trasporti', label: 'Trasporti', icon: '\uD83D\uDE97' },
  { id: 'abbigliamento', label: 'Abbigliamento', icon: '\uD83D\uDC55' },
  { id: 'casa', label: 'Casa & Utenze', icon: '\uD83C\uDFE0' },
  { id: 'salute', label: 'Salute', icon: '\uD83D\uDC8A' },
  { id: 'svago', label: 'Svago', icon: '\uD83C\uDFAC' },
  { id: 'tecnologia', label: 'Tecnologia', icon: '\uD83D\uDCBB' },
];

const REPORT_OPTIONS = [
  { value: 'daily', label: 'Giornaliero' },
  { value: 'weekly', label: 'Settimanale' },
  { value: 'off', label: 'Disattivato' },
] as const;

export default function SettingsScreen() {
  const { userId } = useAuthStore();
  const { budgets, notifications, fetch, update } = useSettingsStore();
  const { isAvailable, isEnabled, biometricLabel, biometricType, setEnabled } = useBiometrics();
  const [localBudgets, setLocalBudgets] = useState<Record<string, number>>({});
  const [localNotif, setLocalNotif] = useState(notifications);

  useEffect(() => { fetch(userId); }, []);
  useEffect(() => { setLocalBudgets(budgets); setLocalNotif(notifications); }, [budgets, notifications]);

  const save = () => {
    update(userId, { budgets: localBudgets, notifications: localNotif });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Biometric Section */}
      {isAvailable && (
        <>
          <Text style={styles.section}>Sicurezza</Text>
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>
                  {biometricLabel || 'Autenticazione biometrica'}
                </Text>
                <Text style={styles.switchDescription}>
                  {biometricType === 'face'
                    ? 'Usa il riconoscimento facciale per sbloccare l\'app'
                    : biometricType === 'fingerprint'
                    ? 'Usa la tua impronta digitale per sbloccare l\'app'
                    : 'Usa l\'autenticazione biometrica per sbloccare l\'app'}
                </Text>
              </View>
              <Switch
                value={isEnabled}
                onValueChange={setEnabled}
                trackColor={{ true: theme.colors.accent, false: theme.colors.border }}
                thumbColor="#ffffff"
              />
            </View>
            <View style={styles.securityBadge}>
              <Text style={styles.securityBadgeIcon}>
                {biometricType === 'face' ? '\uD83D\uDC64' : '\uD83D\uDD90\uFE0F'}
              </Text>
              <Text style={styles.securityBadgeText}>
                {isEnabled ? 'Protezione attiva' : 'Protezione non attiva'}
              </Text>
            </View>
          </View>
        </>
      )}

      {/* Notification Section */}
      <Text style={styles.section}>Notifiche</Text>
      <View style={styles.card}>
        <View style={styles.switchRow}>
          <View style={styles.switchInfo}>
            <Text style={styles.switchLabel}>Transazioni in tempo reale</Text>
            <Text style={styles.switchDescription}>Ricevi una notifica per ogni movimento</Text>
          </View>
          <Switch
            value={localNotif.realtime}
            onValueChange={v => setLocalNotif(n => ({ ...n, realtime: v }))}
            trackColor={{ true: theme.colors.accent, false: theme.colors.border }}
            thumbColor="#ffffff"
          />
        </View>
        <View style={styles.divider} />
        <View style={styles.switchRow}>
          <View style={styles.switchInfo}>
            <Text style={styles.switchLabel}>Alert soglie budget</Text>
            <Text style={styles.switchDescription}>Avviso quando ti avvicini al limite</Text>
          </View>
          <Switch
            value={localNotif.budgetAlerts}
            onValueChange={v => setLocalNotif(n => ({ ...n, budgetAlerts: v }))}
            trackColor={{ true: theme.colors.accent, false: theme.colors.border }}
            thumbColor="#ffffff"
          />
        </View>
        <View style={styles.divider} />
        <Text style={styles.subLabel}>Report periodico</Text>
        <View style={styles.radioRow}>
          {REPORT_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.radioBtn, localNotif.reports === opt.value && styles.radioActive]}
              onPress={() => setLocalNotif(n => ({ ...n, reports: opt.value }))}
            >
              <View style={[styles.radioDot, localNotif.reports === opt.value && styles.radioDotActive]} />
              <Text style={[styles.radioText, localNotif.reports === opt.value && styles.radioActiveText]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Text style={styles.section}>Soglie budget mensile</Text>
      <View style={styles.card}>
        {CATEGORIES.map((cat, index) => (
          <View key={cat.id}>
            {index > 0 && <View style={styles.sliderDivider} />}
            <BudgetSlider
              label={cat.label}
              icon={cat.icon}
              value={localBudgets[cat.id] || 0}
              onValueChange={v => setLocalBudgets(b => ({ ...b, [cat.id]: v }))}
            />
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={save}>
        <Text style={styles.saveBtnText}>Salva impostazioni</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  section: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 10,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchInfo: { flex: 1, marginRight: 12 },
  switchLabel: { color: theme.colors.text, fontSize: 15, fontWeight: '500' },
  switchDescription: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 4,
  },
  sliderDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginBottom: 12,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.bg,
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    gap: 8,
  },
  securityBadgeIcon: { fontSize: 16 },
  securityBadgeText: { color: theme.colors.textMuted, fontSize: 12 },
  subLabel: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginTop: 12,
    marginBottom: 10,
    fontWeight: '500',
  },
  radioRow: { flexDirection: 'row', gap: 8 },
  radioBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: theme.colors.bg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  radioActive: { borderColor: theme.colors.accent, backgroundColor: theme.colors.surfaceHover },
  radioDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  radioDotActive: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accent,
  },
  radioText: { color: theme.colors.textMuted, fontSize: 13 },
  radioActiveText: { color: theme.colors.accent },
  saveBtn: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
});
