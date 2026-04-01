// mobile/app/(tabs)/profile.tsx
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/useAuthStore';
import { useTransactionStore } from '../../store/useTransactionStore';
import { theme } from '../../theme';
import { formatAmount } from '../../utils/format';

export default function ProfileScreen() {
  const { userId, logout } = useAuthStore();
  const { accounts, balances, transactions, stats } = useTransactionStore();
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
    const id = acc.id || acc.accountId || '';
    const bal = balances[id];
    if (bal) {
      const main = bal.mainBalanceAmount || bal.balances?.[0]?.balanceAmount;
      if (main) {
        totalBalance += parseFloat(main.amount || '0');
        currency = main.currency || 'EUR';
      }
    }
  }

  // Stats
  const allTxs = Object.values(transactions).flat();
  const now = new Date();
  const thisMonth = allTxs.filter(tx => {
    if (!tx.bookingDate) return false;
    const d = new Date(tx.bookingDate);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const allCategories = Object.values(stats).flatMap(s => s?.categories || []);
  const uniqueCategories = new Set(allCategories.map(c => c.id));

  // Initials
  const initials = (userId || 'U').substring(0, 2).toUpperCase();

  const menuItems = [
    { icon: 'settings-outline' as const, label: 'Impostazioni', onPress: () => router.push('/settings') },
    { icon: 'notifications-outline' as const, label: 'Notifiche', onPress: () => router.push('/settings') },
    { icon: 'shield-checkmark-outline' as const, label: 'Sicurezza', onPress: () => Alert.alert('Sicurezza', 'Dati protetti con crittografia end-to-end.\nConnessione PSD2 via Yapily.') },
    { icon: 'information-circle-outline' as const, label: 'Informazioni', onPress: () => Alert.alert('Autobank', 'v1.0.0\nOpen Banking PSD2 con Yapily\n\nI tuoi dati non vengono mai condivisi.') },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>Il mio profilo</Text>
          <Text style={styles.userId}>{userId}</Text>
        </View>

        {/* Balance card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>SALDO TOTALE</Text>
          <Text style={styles.balanceValue}>{formatAmount(totalBalance, currency)}</Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{accounts.length}</Text>
            <Text style={styles.statLabel}>{accounts.length === 1 ? 'Conto' : 'Conti'}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{thisMonth.length}</Text>
            <Text style={styles.statLabel}>Mov. questo mese</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{uniqueCategories.size}</Text>
            <Text style={styles.statLabel}>Categorie</Text>
          </View>
        </View>

        {/* Menu */}
        <View style={styles.menu}>
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.menuItem, i < menuItems.length - 1 && styles.menuItemBorder]}
              onPress={item.onPress}
              activeOpacity={0.6}
            >
              <View style={styles.menuIconWrap}>
                <Ionicons name={item.icon} size={20} color={theme.colors.textSecondary} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.6}>
          <Ionicons name="log-out-outline" size={20} color={theme.colors.danger} />
          <Text style={styles.logoutText}>Esci</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={styles.version}>Autobank v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: 24, paddingBottom: 40, alignItems: 'center' },
  header: { alignItems: 'center', marginBottom: 24, paddingTop: 16 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#ffffff' },
  name: { fontSize: 22, fontWeight: '700', color: theme.colors.text, marginTop: 14 },
  userId: { color: theme.colors.textMuted, fontSize: 13, marginTop: 4 },
  balanceCard: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    letterSpacing: 1.5,
    fontWeight: '600',
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 34,
    fontWeight: '800',
    color: theme.colors.accent,
    fontVariant: ['tabular-nums'],
  },
  statsRow: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  statLabel: { fontSize: 11, color: theme.colors.textMuted, marginTop: 4, textAlign: 'center' },
  statDivider: { width: 1, height: 32, backgroundColor: theme.colors.border },
  menu: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  menuIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceHover,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { flex: 1, color: theme.colors.text, fontSize: 15, fontWeight: '500' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    padding: 16,
    backgroundColor: 'rgba(255, 59, 48, 0.08)',
    borderRadius: 16,
    marginTop: 8,
  },
  logoutText: { color: theme.colors.danger, fontWeight: '600', fontSize: 15 },
  version: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 24,
    opacity: 0.6,
  },
});
