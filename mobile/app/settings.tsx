// mobile/app/settings.tsx
import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Switch, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
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
  const [localBudgets, setLocalBudgets] = useState<Record<string, number>>({});
  const [localNotif, setLocalNotif] = useState(notifications);

  useEffect(() => { fetch(userId); }, []);
  useEffect(() => { setLocalBudgets(budgets); setLocalNotif(notifications); }, [budgets, notifications]);

  const save = () => {
    update(userId, { budgets: localBudgets, notifications: localNotif });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.section}>Notifiche</Text>
      <View style={styles.card}>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Transazioni in tempo reale</Text>
          <Switch
            value={localNotif.realtime}
            onValueChange={v => setLocalNotif(n => ({ ...n, realtime: v }))}
            trackColor={{ true: theme.colors.accent, false: theme.colors.border }}
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Alert soglie budget</Text>
          <Switch
            value={localNotif.budgetAlerts}
            onValueChange={v => setLocalNotif(n => ({ ...n, budgetAlerts: v }))}
            trackColor={{ true: theme.colors.accent, false: theme.colors.border }}
          />
        </View>
        <Text style={styles.subLabel}>Report periodico</Text>
        <View style={styles.radioRow}>
          {REPORT_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.radioBtn, localNotif.reports === opt.value && styles.radioActive]}
              onPress={() => setLocalNotif(n => ({ ...n, reports: opt.value }))}
            >
              <Text style={[styles.radioText, localNotif.reports === opt.value && styles.radioActiveText]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Text style={styles.section}>Soglie budget mensile</Text>
      <View style={styles.card}>
        {CATEGORIES.map(cat => (
          <BudgetSlider
            key={cat.id}
            label={cat.label}
            icon={cat.icon}
            value={localBudgets[cat.id] || 0}
            onValueChange={v => setLocalBudgets(b => ({ ...b, [cat.id]: v }))}
          />
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
  section: { fontSize: 13, fontWeight: '600', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 20, marginBottom: 10 },
  card: { backgroundColor: theme.colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: theme.colors.border },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  switchLabel: { color: theme.colors.text, fontSize: 15 },
  subLabel: { color: theme.colors.textMuted, fontSize: 13, marginTop: 12, marginBottom: 8 },
  radioRow: { flexDirection: 'row', gap: 8 },
  radioBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: theme.colors.border },
  radioActive: { borderColor: theme.colors.accent, backgroundColor: theme.colors.surfaceHover },
  radioText: { color: theme.colors.textMuted, fontSize: 13 },
  radioActiveText: { color: theme.colors.accent },
  saveBtn: { backgroundColor: theme.colors.accent, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: theme.colors.bg, fontWeight: '700', fontSize: 16 },
});
