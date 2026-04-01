// mobile/app/(tabs)/accounts.tsx
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTransactionStore } from '../../store/useTransactionStore';
import { theme } from '../../theme';
import { formatAmount } from '../../utils/format';

export default function AccountsScreen() {
  const { accounts, balances, loading, fetchAll } = useTransactionStore();
  const router = useRouter();

  const getBalance = (accountId: string) => {
    const bal = balances[accountId];
    if (!bal) return null;
    const main = bal.mainBalanceAmount || bal.balances?.[0]?.balanceAmount;
    return main;
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={accounts}
        keyExtractor={(item) => item.id || item.accountId}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchAll} tintColor={theme.colors.accent} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<Text style={styles.title}>I tuoi conti</Text>}
        renderItem={({ item }) => {
          const id = item.id || item.accountId;
          const bal = getBalance(id);
          return (
            <TouchableOpacity style={styles.card} onPress={() => router.push(`/account/${id}`)}>
              <View style={styles.cardTop}>
                <Ionicons name="wallet" size={24} color={theme.colors.accent} />
                <View style={styles.cardInfo}>
                  <Text style={styles.bankName}>{item.nickname || item.accountNames?.[0]?.name || item.type || item.institutionId?.replace(/_/g, ' ').replace(/-/g, ' ') || 'Conto'}</Text>
                  <Text style={styles.iban}>{item.iban || item.accountNumber || id}</Text>
                </View>
              </View>
              {bal && (
                <Text style={styles.balance}>{formatAmount(bal.amount, bal.currency)}</Text>
              )}
            </TouchableOpacity>
          );
        }}
        ListFooterComponent={
          <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/onboarding')}>
            <Ionicons name="add-circle-outline" size={22} color={theme.colors.accent} />
            <Text style={styles.addText}>Aggiungi conto</Text>
          </TouchableOpacity>
        }
        ListEmptyComponent={<Text style={styles.empty}>Nessun conto collegato</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  list: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '700', color: theme.colors.text, marginBottom: 20 },
  card: { backgroundColor: theme.colors.surface, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardInfo: { flex: 1 },
  bankName: { color: theme.colors.text, fontWeight: '600', fontSize: 15 },
  iban: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
  balance: { fontSize: 22, fontWeight: '700', color: theme.colors.accent, marginTop: 12, fontVariant: ['tabular-nums'] },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, marginTop: 8 },
  addText: { color: theme.colors.accent, fontWeight: '600', fontSize: 15 },
  empty: { color: theme.colors.textMuted, textAlign: 'center', marginTop: 40 },
});
