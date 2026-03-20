// mobile/components/SummaryCard.tsx
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { formatAmount } from '../utils/format';

interface Props {
  label: string;
  value: number;
  currency?: string;
  type?: 'neutral' | 'positive' | 'negative';
}

export function SummaryCard({ label, value, currency = 'EUR', type = 'neutral' }: Props) {
  const color = type === 'positive' ? theme.colors.accent
    : type === 'negative' ? theme.colors.danger
    : theme.colors.text;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color }]}>
        {typeof value === 'number' ? formatAmount(value, currency) : value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  label: { fontSize: 11, color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: 18, fontWeight: '700', marginTop: 4 },
});
