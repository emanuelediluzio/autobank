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
      <View style={[styles.iconCircle, { backgroundColor: isExpense ? theme.colors.dangerGlow : theme.colors.successGlow }]}>
        <Text style={styles.icon}>{categoryIcon || '\uD83D\uDCE6'}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.desc} numberOfLines={1}>{description}</Text>
        <Text style={styles.meta}>{categoryLabel || 'Altro'} · {formatDate(date)}</Text>
      </View>
      <View style={styles.amountWrap}>
        <Text style={[styles.amount, { color: isExpense ? theme.colors.danger : theme.colors.success }]}>
          {formatAmount(amount, currency)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  icon: { fontSize: 18 },
  info: { flex: 1 },
  desc: { color: theme.colors.text, fontSize: 15, fontWeight: '500' },
  meta: { color: theme.colors.textMuted, fontSize: 12, marginTop: 3 },
  amountWrap: { alignItems: 'flex-end', marginLeft: 12 },
  amount: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
