// mobile/app/(tabs)/profile.tsx
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/useAuthStore';
import { useTransactionStore } from '../../store/useTransactionStore';
import { theme } from '../../theme';
import { formatAmount } from '../../utils/format';

export default function ProfileScreen() {
  const { userId, logout } = useAuthStore();
  const { accounts, balances } = useTransactionStore();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert('Logout', 'Vuoi scollegare tutti i conti e uscire?', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Esci', style: 'destructive', onPress: () => { logout(); router.replace('/onboarding'); } },
    ]);
  };

  // Calcola saldo totale
  let totalBalance = 0;
  let currency = 'EUR';
  for (const acc of accounts) {
    const id = acc.id || acc.accountId;
    const bal = balances[id];
    if (bal) {
      const main = bal.mainBalanceAmount || bal.balances?.[0]?.balanceAmount;
      if (main) {
        totalBalance += parseFloat(main.amount || '0');
        currency = main.currency || 'EUR';
      }
    }
  }

  const menuItems = [
    { icon: 'settings-outline' as const, label: 'Impostazioni', onPress: () => router.push('/settings') },
    { icon: 'notifications-outline' as const, label: 'Notifiche', onPress: () => router.push('/settings') },
    { icon: 'shield-checkmark-outline' as const, label: 'Sicurezza', onPress: () => Alert.alert('Sicurezza', 'Dati protetti con crittografia end-to-end.\nConnessione PSD2 via Yapily.') },
    { icon: 'information-circle-outline' as const, label: 'About', onPress: () => Alert.alert('Autobank', 'v1.0.0\nOpen Banking PSD2 con Yapily\n\nI tuoi dati non vengono mai condivisi.') },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={40} color={theme.colors.accent} />
        </View>
        <Text style={styles.name}>Il mio profilo</Text>
        <Text style={styles.subtitle}>{accounts.length} {accounts.length === 1 ? 'conto collegato' : 'conti collegati'}</Text>

        {totalBalance !== 0 && (
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Saldo totale</Text>
            <Text style={styles.balanceValue}>{formatAmount(totalBalance, currency)}</Text>
          </View>
        )}

        <View style={styles.menu}>
          {menuItems.map((item, i) => (
            <TouchableOpacity key={i} style={[styles.menuItem, i === menuItems.length - 1 && { borderBottomWidth: 0 }]} onPress={item.onPress}>
              <Ionicons name={item.icon} size={22} color={theme.colors.text} />
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={theme.colors.danger} />
          <Text style={styles.logoutText}>Esci</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: { flex: 1, padding: 24, alignItems: 'center', paddingTop: 40 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: theme.colors.accent },
  name: { fontSize: 20, fontWeight: '700', color: theme.colors.text, marginTop: 16 },
  subtitle: { color: theme.colors.textMuted, fontSize: 13, marginTop: 4 },
  balanceCard: { marginTop: 20, backgroundColor: theme.colors.surface, borderRadius: 12, padding: 20, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
  balanceLabel: { fontSize: 11, color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  balanceValue: { fontSize: 28, fontWeight: '700', color: theme.colors.accent, marginTop: 6, fontVariant: ['tabular-nums'] as any },
  menu: { width: '100%', marginTop: 24, backgroundColor: theme.colors.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border, gap: 12 },
  menuLabel: { flex: 1, color: theme.colors.text, fontSize: 15 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 32, padding: 16 },
  logoutText: { color: theme.colors.danger, fontWeight: '600', fontSize: 15 },
});
