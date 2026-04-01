// mobile/components/SummaryCard.tsx
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { formatAmount } from '../utils/format';

interface Props {
  label: string;
  value: number;
  currency?: string;
  type?: 'neutral' | 'positive' | 'negative';
  icon?: string;
}

export function SummaryCard({ label, value, currency = 'EUR', type = 'neutral', icon }: Props) {
  const color = type === 'positive' ? theme.colors.accent
    : type === 'negative' ? theme.colors.danger
    : theme.colors.text;

  const bgTint = type === 'positive' ? 'rgba(0, 214, 50, 0.06)'
    : type === 'negative' ? 'rgba(255, 59, 48, 0.06)'
    : 'transparent';

  const iconName = icon
    ? icon as any
    : type === 'positive' ? 'trending-up' : type === 'negative' ? 'trending-down' : undefined;

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <View style={[styles.tintOverlay, { backgroundColor: bgTint }]} />
      <View style={styles.headerRow}>
        <Text style={styles.label}>{label}</Text>
        {iconName && (
          <Ionicons name={iconName} size={16} color={color} style={{ opacity: 0.7 }} />
        )}
      </View>
      <Text style={[styles.value, { color }]}>
        {typeof value === 'number' ? formatAmount(value, currency) : value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
  },
  tintOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: { fontSize: 12, color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: '500' },
  value: { fontSize: 22, fontWeight: '700', marginTop: 8, fontVariant: ['tabular-nums'] },
});
