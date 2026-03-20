// mobile/components/TransactionItem.tsx
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { formatAmount, formatDate } from '../utils/format';

interface Props {
  description: string;
  amount: number;
  currency?: string;
  date?: string;
  categoryLabel?: string;
  categoryIcon?: string;
}

export function TransactionItem({ description, amount, currency = 'EUR', date, categoryLabel, categoryIcon }: Props) {
  const isExpense = amount < 0;

  return (
    <View style={styles.row}>
      <Text style={styles.icon}>{categoryIcon || '\uD83D\uDCE6'}</Text>
      <View style={styles.info}>
        <Text style={styles.desc} numberOfLines={1}>{description}</Text>
        <Text style={styles.meta}>{categoryLabel || 'Altro'} \u00b7 {formatDate(date)}</Text>
      </View>
      <Text style={[styles.amount, { color: isExpense ? theme.colors.danger : theme.colors.accent }]}>
        {formatAmount(amount, currency)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  icon: { fontSize: 20, marginRight: 12 },
  info: { flex: 1 },
  desc: { color: theme.colors.text, fontSize: 14, fontWeight: '500' },
  meta: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
  amount: { fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
