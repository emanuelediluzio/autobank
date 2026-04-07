// mobile/app/(tabs)/transactions.tsx
import { useState, useMemo, useCallback, useRef } from 'react';
import { View, Text, SectionList, TextInput, TouchableOpacity, StyleSheet, RefreshControl, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTransactionStore } from '../../store/useTransactionStore';
import { TransactionItem } from '../../components/TransactionItem';
import { SkeletonLoader } from '../../components/SkeletonLoader';
import { theme } from '../../theme';
import { formatAmount } from '../../utils/format';

const CATEGORY_FILTERS = [
  { id: 'all', label: 'Tutti' },
  { id: 'alimentari', label: '\uD83D\uDED2 Alimentari' },
  { id: 'trasporti', label: '\uD83D\uDE97 Trasporti' },
  { id: 'casa', label: '\uD83C\uDFE0 Casa' },
  { id: 'svago', label: '\uD83C\uDFAC Svago' },
  { id: 'salute', label: '\uD83D\uDC8A Salute' },
  { id: 'tecnologia', label: '\uD83D\uDCBB Tecnologia' },
  { id: 'abbigliamento', label: '\uD83D\uDC55 Abbigliamento' },
];

const DATE_RANGES = [
  { id: 'today', label: 'Oggi' },
  { id: 'week', label: 'Settimana' },
  { id: 'month', label: 'Mese' },
  { id: '3months', label: '3 Mesi' },
  { id: 'all', label: 'Tutto' },
];

function getDateRangeStart(rangeId: string): Date | null {
  const now = new Date();
  switch (rangeId) {
    case 'today': {
      const d = new Date(now); d.setHours(0, 0, 0, 0); return d;
    }
    case 'week': {
      const d = new Date(now); d.setDate(d.getDate() - 7); return d;
    }
    case 'month': {
      const d = new Date(now); d.setMonth(d.getMonth() - 1); return d;
    }
    case '3months': {
      const d = new Date(now); d.setMonth(d.getMonth() - 3); return d;
    }
    default: return null;
  }
}

function formatSectionDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const txDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (txDate.getTime() === today.getTime()) return 'Oggi';
  if (txDate.getTime() === yesterday.getTime()) return 'Ieri';
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

export default function TransactionsScreen() {
  const { transactions, loading, fetchAll } = useTransactionStore();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((text: string) => {
    setSearch(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(text);
    }, 300);
  }, []);

  const allTxs = Object.values(transactions).flat();

  const sections = useMemo(() => {
    let list = [...allTxs].sort((a, b) => (b.bookingDate || '').localeCompare(a.bookingDate || ''));

    // Date range filter
    const rangeStart = getDateRangeStart(dateRange);
    if (rangeStart) {
      list = list.filter(tx => {
        if (!tx.bookingDate) return false;
        return new Date(tx.bookingDate) >= rangeStart;
      });
    }

    if (catFilter !== 'all') list = list.filter(tx => tx.category?.id === catFilter);
    if (debouncedSearch) {
      const s = debouncedSearch.toLowerCase();
      list = list.filter(tx => {
        const desc = (tx.remittanceInformationUnstructured || tx.creditorName || tx.debtorName || '').toLowerCase();
        return desc.includes(s);
      });
    }

    // Group by date
    const groups: Record<string, typeof list> = {};
    for (const tx of list) {
      const dateKey = tx.bookingDate || 'sconosciuto';
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(tx);
    }

    return Object.entries(groups).map(([date, data]) => {
      const dayTotal = data.reduce((sum, tx) => {
        const amt = parseFloat(tx.transactionAmount?.amount || '0');
        return amt < 0 ? sum + Math.abs(amt) : sum;
      }, 0);
      return {
        title: formatSectionDate(date),
        dayTotal,
        data,
      };
    });
  }, [allTxs, catFilter, debouncedSearch, dateRange]);

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={theme.colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.search}
          placeholder="Cerca movimenti..."
          placeholderTextColor={theme.colors.textMuted}
          value={search}
          onChangeText={handleSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => { setSearch(''); setDebouncedSearch(''); }} style={styles.searchClear}>
            <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Date range filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateFilters} contentContainerStyle={styles.dateFiltersContent}>
        {DATE_RANGES.map(r => (
          <TouchableOpacity
            key={r.id}
            style={[styles.dateBtn, dateRange === r.id && styles.dateBtnActive]}
            onPress={() => setDateRange(r.id)}
          >
            <Text style={[styles.dateBtnText, dateRange === r.id && styles.dateBtnActiveText]}>{r.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Category filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catFilters} contentContainerStyle={styles.catFiltersContent}>
        {CATEGORY_FILTERS.map(f => (
          <TouchableOpacity
            key={f.id}
            style={[styles.filterBtn, catFilter === f.id && styles.filterActive]}
            onPress={() => setCatFilter(f.id)}
          >
            <Text style={[styles.filterText, catFilter === f.id && styles.filterActiveText]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <SectionList
        sections={sections}
        keyExtractor={(item, i) => item.transactionId || item.id || String(i)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchAll} tintColor={theme.colors.accent} />}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.dayTotal > 0 && (
              <Text style={styles.sectionTotal}>-{formatAmount(section.dayTotal, 'EUR')}</Text>
            )}
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.txWrap}>
            <TransactionItem
              description={item.remittanceInformationUnstructured || item.creditorName || item.debtorName || 'Transazione'}
              amount={parseFloat(item.transactionAmount?.amount || '0')}
              currency={item.transactionAmount?.currency}
              date={item.bookingDate}
              categoryLabel={item.category?.label}
              categoryIcon={item.category?.icon}
            />
          </View>
        )}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          loading ? (
            <View style={styles.skeletonWrap}>
              {[1, 2, 3, 4, 5].map(i => (
                <View key={i} style={styles.skeletonRow}>
                  <SkeletonLoader width={42} height={42} borderRadius={21} />
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <SkeletonLoader width="70%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
                    <SkeletonLoader width="40%" height={10} borderRadius={4} />
                  </View>
                  <SkeletonLoader width={60} height={14} borderRadius={4} />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <Ionicons name="receipt-outline" size={48} color={theme.colors.textMuted} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>Nessun movimento trovato</Text>
              <Text style={styles.emptySubtitle}>Prova a cambiare i filtri di ricerca</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 8 },
  search: { flex: 1, paddingVertical: 12, color: theme.colors.text, fontSize: 15 },
  searchClear: { padding: 4 },
  dateFilters: { maxHeight: 40, marginBottom: 6 },
  dateFiltersContent: { paddingHorizontal: 16, gap: 8 },
  dateBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
  },
  dateBtnActive: { backgroundColor: theme.colors.accent },
  dateBtnText: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '500' },
  dateBtnActiveText: { color: '#ffffff', fontWeight: '600' },
  catFilters: { maxHeight: 40, marginBottom: 8 },
  catFiltersContent: { paddingHorizontal: 16, gap: 6 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.colors.surface },
  filterActive: { backgroundColor: theme.colors.accent },
  filterText: { color: theme.colors.textMuted, fontSize: 13 },
  filterActiveText: { color: '#ffffff', fontWeight: '600' },
  list: { paddingBottom: 40 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: 16,
  },
  sectionTitle: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionTotal: { color: theme.colors.danger, fontSize: 13, fontWeight: '500', fontVariant: ['tabular-nums'] },
  txWrap: { paddingHorizontal: 16 },
  skeletonWrap: { padding: 16 },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  emptyWrap: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '600', marginBottom: 4 },
  emptySubtitle: { color: theme.colors.textMuted, fontSize: 14 },
});
