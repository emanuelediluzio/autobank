// mobile/app/(tabs)/index.tsx
import { useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/useAuthStore';
import { useTransactionStore } from '../../store/useTransactionStore';
import { SummaryCard } from '../../components/SummaryCard';
import { CategoryChart } from '../../components/CategoryChart';
import { MonthlyChart } from '../../components/MonthlyChart';
import { TransactionItem } from '../../components/TransactionItem';
import { theme } from '../../theme';

export default function DashboardScreen() {
  const { isOnboarded } = useAuthStore();
  const { accounts, transactions, balances, stats, loading, fetchAll } = useTransactionStore();
  const router = useRouter();

  useEffect(() => {
    if (!isOnboarded) { router.replace('/onboarding'); return; }
    fetchAll();
  }, [isOnboarded]);

  // Aggregate across all accounts
  const allTxs = Object.values(transactions).flat();
  let totalSpent = 0, totalIncome = 0;
  for (const tx of allTxs) {
    const amt = parseFloat(tx.transactionAmount?.amount || '0');
    if (amt < 0) totalSpent += Math.abs(amt);
    else totalIncome += amt;
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchAll} tintColor={theme.colors.accent} />}
    >
      <Text style={styles.title}>Dashboard</Text>

      <View style={styles.summaryRow}>
        <SummaryCard label="Spese" value={totalSpent} type="negative" />
        <SummaryCard label="Entrate" value={totalIncome} type="positive" />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Per categoria</Text>
        <CategoryChart data={categoryData} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Andamento mensile</Text>
        <MonthlyChart data={dailyData} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ultimi movimenti</Text>
        {recentTxs.map((tx, i) => (
          <TransactionItem
            key={tx.transactionId || tx.id || i}
            description={tx.remittanceInformationUnstructured || tx.creditorName || tx.debtorName || 'Transazione'}
            amount={parseFloat(tx.transactionAmount?.amount || '0')}
            currency={tx.transactionAmount?.currency}
            date={tx.bookingDate}
            categoryLabel={tx.category?.label}
            categoryIcon={tx.category?.icon}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '700', color: theme.colors.text, marginBottom: 20 },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  card: { backgroundColor: theme.colors.surface, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: theme.colors.border },
  cardTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text, marginBottom: 12 },
});
