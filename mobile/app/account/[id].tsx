// mobile/app/account/[id].tsx
import { useEffect } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTransactionStore } from '../../store/useTransactionStore';
import { TransactionItem } from '../../components/TransactionItem';
import { SummaryCard } from '../../components/SummaryCard';
import { theme } from '../../theme';
import { formatAmount } from '../../utils/format';

export default function AccountDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { transactions, balances, fetchTransactions, fetchBalances } = useTransactionStore();

  useEffect(() => {
    if (id) {
      fetchTransactions(id);
      fetchBalances(id);
    }
  }, [id]);

  const txs = (transactions[id!] || []).sort((a, b) => (b.bookingDate || '').localeCompare(a.bookingDate || ''));
  const bal = balances[id!];
  const balAmount = bal?.mainBalanceAmount || bal?.balances?.[0]?.balanceAmount;

  let spent = 0, income = 0;
  for (const tx of txs) {
    const amt = parseFloat(tx.transactionAmount?.amount || '0');
    if (amt < 0) spent += Math.abs(amt);
    else income += amt;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={txs}
        keyExtractor={(item, i) => item.transactionId || item.id || String(i)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            {balAmount && (
              <Text style={styles.mainBalance}>{formatAmount(balAmount.amount, balAmount.currency)}</Text>
            )}
            <View style={styles.summaryRow}>
              <SummaryCard label="Spese" value={spent} type="negative" />
              <SummaryCard label="Entrate" value={income} type="positive" />
            </View>
            <Text style={styles.sectionTitle}>Transazioni</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TransactionItem
            description={item.remittanceInformationUnstructured || item.creditorName || item.debtorName || 'Transazione'}
            amount={parseFloat(item.transactionAmount?.amount || '0')}
            currency={item.transactionAmount?.currency}
            date={item.bookingDate}
            categoryLabel={item.category?.label}
            categoryIcon={item.category?.icon}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  list: { padding: 16, paddingBottom: 40 },
  mainBalance: { fontSize: 36, fontWeight: '700', color: theme.colors.text, textAlign: 'center', marginVertical: 20, fontVariant: ['tabular-nums'] },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: theme.colors.text, marginBottom: 12 },
});
