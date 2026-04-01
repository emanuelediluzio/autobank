// mobile/app/(tabs)/transactions.tsx
import { useState, useMemo } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { useTransactionStore } from '../../store/useTransactionStore';
import { TransactionItem } from '../../components/TransactionItem';
import { theme } from '../../theme';

const CATEGORY_FILTERS = [
  { id: 'all', label: 'Tutti' },
  { id: 'alimentari', label: '\uD83D\uDED2' },
  { id: 'trasporti', label: '\uD83D\uDE97' },
  { id: 'casa', label: '\uD83C\uDFE0' },
  { id: 'svago', label: '\uD83C\uDFAC' },
  { id: 'salute', label: '\uD83D\uDC8A' },
  { id: 'tecnologia', label: '\uD83D\uDCBB' },
  { id: 'abbigliamento', label: '\uD83D\uDC55' },
];

export default function TransactionsScreen() {
  const { transactions, loading, fetchAll } = useTransactionStore();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');

  const allTxs = Object.values(transactions).flat();

  const filtered = useMemo(() => {
    let list = allTxs.sort((a, b) => (b.bookingDate || '').localeCompare(a.bookingDate || ''));
    if (catFilter !== 'all') list = list.filter(tx => tx.category?.id === catFilter);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(tx => {
        const desc = (tx.remittanceInformationUnstructured || tx.creditorName || tx.debtorName || '').toLowerCase();
        return desc.includes(s);
      });
    }
    return list;
  }, [allTxs, catFilter, search]);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Cerca movimenti..."
        placeholderTextColor={theme.colors.textMuted}
        value={search}
        onChangeText={setSearch}
      />
      <View style={styles.filters}>
        {CATEGORY_FILTERS.map(f => (
          <TouchableOpacity
            key={f.id}
            style={[styles.filterBtn, catFilter === f.id && styles.filterActive]}
            onPress={() => setCatFilter(f.id)}
          >
            <Text style={[styles.filterText, catFilter === f.id && styles.filterActiveText]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item, i) => item.transactionId || item.id || String(i)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchAll} tintColor={theme.colors.accent} />}
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
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          loading
            ? <ActivityIndicator size="large" color={theme.colors.accent} style={{ marginTop: 40 }} />
            : <Text style={styles.empty}>Nessun movimento trovato</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  search: { margin: 16, marginBottom: 8, padding: 12, borderRadius: 10, backgroundColor: theme.colors.surface, color: theme.colors.text, borderWidth: 1, borderColor: theme.colors.border, fontSize: 14 },
  filters: { flexDirection: 'row', paddingHorizontal: 16, gap: 6, marginBottom: 8 },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  filterActive: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  filterText: { color: theme.colors.textMuted, fontSize: 13 },
  filterActiveText: { color: theme.colors.bg },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  empty: { color: theme.colors.textMuted, textAlign: 'center', marginTop: 40 },
});
