// mobile/app/(tabs)/accounts.tsx
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTransactionStore } from '../../store/useTransactionStore';
import { SkeletonLoader } from '../../components/SkeletonLoader';
import { theme } from '../../theme';
import { formatAmount } from '../../utils/format';

export default function AccountsScreen() {
  const { accounts, balances, transactions, loading, fetchAll } = useTransactionStore();
  const router = useRouter();

  const getBalance = (accountId: string) => {
    const bal = balances[accountId];
    if (!bal) return null;
    const main = bal.mainBalanceAmount || bal.balances?.[0]?.balanceAmount;
    return main;
  };

  const getLastTxDate = (accountId: string): string | null => {
    const txs = transactions[accountId];
    if (!txs || txs.length === 0) return null;
    const sorted = [...txs].sort((a, b) => (b.bookingDate || '').localeCompare(a.bookingDate || ''));
    return sorted[0]?.bookingDate || null;
  };

  const maskIban = (iban: string | undefined): string => {
    if (!iban) return '****';
    return '•••• ' + iban.slice(-4);
  };

  // Total balance across all accounts
  let totalBalance = 0;
  let currency = 'EUR';
  for (const acc of accounts) {
    const id = acc.id || acc.accountId || '';
    const bal = getBalance(id);
    if (bal) {
      totalBalance += parseFloat(bal.amount || '0');
      currency = bal.currency || 'EUR';
    }
  }

  const renderHeader = () => (
    <View>
      <Text style={styles.title}>I tuoi conti</Text>

      {/* Total balance card */}
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>PATRIMONIO TOTALE</Text>
        <Text style={styles.totalValue}>{formatAmount(totalBalance, currency)}</Text>
        <Text style={styles.totalAccounts}>{accounts.length} {accounts.length === 1 ? 'conto' : 'conti'}</Text>
      </View>
    </View>
  );

  if (loading && accounts.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.list}>
          <Text style={styles.title}>I tuoi conti</Text>
          <SkeletonLoader width="100%" height={120} borderRadius={16} style={{ marginBottom: 16 }} />
          <SkeletonLoader width="100%" height={100} borderRadius={16} style={{ marginBottom: 12 }} />
          <SkeletonLoader width="100%" height={100} borderRadius={16} style={{ marginBottom: 12 }} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={accounts}
        keyExtractor={(item) => item.id || item.accountId || String(Math.random())}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchAll} tintColor={theme.colors.accent} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => {
          const id = item.id || item.accountId || '';
          const bal = getBalance(id);
          const lastTxDate = getLastTxDate(id);
          return (
            <TouchableOpacity style={styles.card} onPress={() => router.push(`/account/${id}`)} activeOpacity={0.7}>
              <View style={styles.cardTop}>
                <View style={styles.iconWrap}>
                  <Ionicons name="wallet" size={22} color={theme.colors.accent} />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.bankName} numberOfLines={1}>
                    {item.nickname || item.accountNames?.[0]?.name || item.type || item.institutionId?.replace(/_/g, ' ').replace(/-/g, ' ') || 'Conto'}
                  </Text>
                  <Text style={styles.iban}>{maskIban(item.iban || item.accountNumber)}</Text>
                </View>
              </View>
              <View style={styles.cardBottom}>
                {bal && (
                  <Text style={styles.balance}>{formatAmount(bal.amount, bal.currency)}</Text>
                )}
                {lastTxDate && (
                  <Text style={styles.lastTx}>Ultimo mov. {new Date(lastTxDate).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        ListFooterComponent={
          <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/onboarding')} activeOpacity={0.7}>
            <View style={styles.addIconWrap}>
              <Ionicons name="add" size={24} color={theme.colors.accent} />
            </View>
            <Text style={styles.addText}>Aggiungi conto</Text>
          </TouchableOpacity>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="wallet-outline" size={48} color={theme.colors.textMuted} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>Nessun conto collegato</Text>
            <Text style={styles.emptySubtitle}>Collega il tuo primo conto bancario</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  list: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '700', color: theme.colors.text, marginBottom: 20 },
  totalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    letterSpacing: 1.5,
    fontWeight: '600',
    marginBottom: 8,
  },
  totalValue: {
    fontSize: 36,
    fontWeight: '800',
    color: theme.colors.text,
    fontVariant: ['tabular-nums'],
  },
  totalAccounts: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: 8,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(108, 92, 231, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardInfo: { flex: 1 },
  bankName: { color: theme.colors.text, fontWeight: '600', fontSize: 16 },
  iban: { color: theme.colors.textMuted, fontSize: 13, marginTop: 2 },
  cardBottom: { marginTop: 14, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  balance: { fontSize: 24, fontWeight: '700', color: theme.colors.accent, fontVariant: ['tabular-nums'] },
  lastTx: { fontSize: 12, color: theme.colors.textMuted },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 18,
    marginTop: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  addIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(108, 92, 231, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: { color: theme.colors.accent, fontWeight: '600', fontSize: 15 },
  emptyWrap: { alignItems: 'center', paddingTop: 40 },
  emptyTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '600', marginBottom: 4 },
  emptySubtitle: { color: theme.colors.textMuted, fontSize: 14 },
});
