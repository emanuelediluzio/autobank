// mobile/app/(tabs)/index.tsx
import { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/useAuthStore';
import { useTransactionStore } from '../../store/useTransactionStore';
import { SummaryCard } from '../../components/SummaryCard';
import { CategoryChart } from '../../components/CategoryChart';
import { MonthlyChart } from '../../components/MonthlyChart';
import { TransactionItem } from '../../components/TransactionItem';
import { SkeletonLoader } from '../../components/SkeletonLoader';
import { theme } from '../../theme';
import { formatAmount } from '../../utils/format';

export default function DashboardScreen() {
  const { isOnboarded } = useAuthStore();
  const { accounts, transactions, balances, stats, loading, error, fetchAll } = useTransactionStore();
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    if (isOnboarded) {
      fetchAll().finally(() => setInitialLoad(false));
    }
  }, [isOnboarded]);

  if (!isOnboarded) return <Redirect href="/onboarding" />;

  // Aggregate across all accounts
  const allTxs = Object.values(transactions).flat();
  let totalSpent = 0, totalIncome = 0;
  for (const tx of allTxs) {
    const amt = parseFloat(tx.transactionAmount?.amount || '0');
    if (amt < 0) totalSpent += Math.abs(amt);
    else totalIncome += amt;
  }

  // Total balance
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

  const allCategories = Object.values(stats).flatMap(s => s?.categories || []);
  const mergedCategories: Record<string, any> = {};
  for (const c of allCategories) {
    if (!mergedCategories[c.id]) mergedCategories[c.id] = { ...c };
    else { mergedCategories[c.id].total += c.total; mergedCategories[c.id].count += c.count; }
  }
  const categoryData = Object.values(mergedCategories).sort((a: any, b: any) => b.total - a.total);

  const allDaily = Object.values(stats).flatMap(s => s?.daily || []);
  const mergedDaily: Record<string, any> = {};
  for (const d of allDaily) {
    if (!mergedDaily[d.date]) mergedDaily[d.date] = { ...d };
    else { mergedDaily[d.date].spent += d.spent; mergedDaily[d.date].income += d.income; }
  }
  const dailyData = Object.values(mergedDaily).sort((a: any, b: any) => a.date.localeCompare(b.date));

  const recentTxs = allTxs
    .sort((a, b) => (b.bookingDate || '').localeCompare(a.bookingDate || ''))
    .slice(0, 5);

  // Insight generation
  const topCategory = categoryData.length > 0 ? categoryData[0] : null;
  const spentPct = topCategory && totalSpent > 0 ? Math.round((topCategory.total / totalSpent) * 100) : 0;

  if (initialLoad && loading) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <SkeletonLoader width="50%" height={32} borderRadius={8} style={{ marginBottom: 24 }} />
        <SkeletonLoader width="100%" height={100} borderRadius={16} style={{ marginBottom: 16 }} />
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          <SkeletonLoader width="48%" height={80} borderRadius={16} />
          <SkeletonLoader width="48%" height={80} borderRadius={16} />
        </View>
        <SkeletonLoader width="100%" height={200} borderRadius={16} style={{ marginBottom: 16 }} />
        <SkeletonLoader width="100%" height={160} borderRadius={16} style={{ marginBottom: 16 }} />
        <SkeletonLoader width="100%" height={240} borderRadius={16} />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchAll} tintColor={theme.colors.accent} />}
    >
      <Text style={styles.greeting}>Dashboard</Text>

      {/* Total Balance */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>SALDO TOTALE</Text>
        <Text style={styles.balanceValue}>{formatAmount(totalBalance, currency)}</Text>
      </View>

      {/* Spent vs Income */}
      <View style={styles.summaryRow}>
        <SummaryCard label="Spese" value={totalSpent} type="negative" />
        <SummaryCard label="Entrate" value={totalIncome} type="positive" />
      </View>

      {/* Insight */}
      {topCategory && totalSpent > 0 && (
        <View style={styles.insightCard}>
          <View style={styles.insightIcon}>
            <Ionicons name="bulb" size={18} color={theme.colors.accent} />
          </View>
          <Text style={styles.insightText}>
            Questo mese hai speso {formatAmount(totalSpent, currency)}, il {spentPct}% in {topCategory.label}
          </Text>
        </View>
      )}

      {/* Category chart */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Per categoria</Text>
        <CategoryChart data={categoryData} />
      </View>

      {/* Monthly chart */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Andamento mensile</Text>
        <MonthlyChart data={dailyData} />
      </View>

      {/* Recent transactions */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ultimi movimenti</Text>
        {recentTxs.length > 0 ? recentTxs.map((tx, i) => (
          <TransactionItem
            key={tx.transactionId || tx.id || i}
            description={tx.remittanceInformationUnstructured || tx.creditorName || tx.debtorName || 'Transazione'}
            amount={parseFloat(tx.transactionAmount?.amount || '0')}
            currency={tx.transactionAmount?.currency}
            date={tx.bookingDate}
            categoryLabel={tx.category?.label}
            categoryIcon={tx.category?.icon}
          />
        )) : (
          <Text style={styles.emptyText}>Nessun movimento recente</Text>
        )}
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  greeting: { fontSize: 28, fontWeight: '700', color: theme.colors.text, marginBottom: 20 },
  balanceCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    letterSpacing: 1.5,
    fontWeight: '600',
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 38,
    fontWeight: '800',
    color: theme.colors.text,
    fontVariant: ['tabular-nums'],
  },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  insightCard: {
    backgroundColor: theme.colors.accentGlow,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  insightIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 214, 50, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  insightText: { flex: 1, color: theme.colors.textSecondary, fontSize: 14, lineHeight: 20 },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text, marginBottom: 12 },
  emptyText: { color: theme.colors.textMuted, textAlign: 'center', paddingVertical: 16 },
  errorText: { color: theme.colors.danger, textAlign: 'center', marginTop: 8, fontSize: 13 },
});
