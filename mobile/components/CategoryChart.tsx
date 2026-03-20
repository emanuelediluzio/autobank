// mobile/components/CategoryChart.tsx
import { View, Text, StyleSheet } from 'react-native';
import { VictoryPie } from 'victory-native';
import { theme } from '../theme';
import { getCategoryColor } from '../utils/colors';
import { formatAmount } from '../utils/format';

interface CategoryData {
  id: string;
  label: string;
  icon: string;
  total: number;
  count: number;
}

export function CategoryChart({ data, currency = 'EUR' }: { data: CategoryData[]; currency?: string }) {
  if (!data.length) return null;

  const chartData = data.slice(0, 6).map(c => ({
    x: c.icon,
    y: c.total,
    label: c.icon,
  }));

  const colors = data.slice(0, 6).map(c => getCategoryColor(c.id));

  return (
    <View style={styles.container}>
      <VictoryPie
        data={chartData}
        colorScale={colors}
        innerRadius={60}
        padAngle={2}
        labels={({ datum }) => datum.label}
        style={{ labels: { fontSize: 16 } }}
        width={220}
        height={220}
      />
      <View style={styles.legend}>
        {data.slice(0, 6).map(c => (
          <View key={c.id} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: getCategoryColor(c.id) }]} />
            <Text style={styles.legendLabel}>{c.label}</Text>
            <Text style={styles.legendValue}>{formatAmount(c.total, currency)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  legend: { width: '100%', marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  legendLabel: { flex: 1, color: theme.colors.text, fontSize: 13 },
  legendValue: { color: theme.colors.textMuted, fontSize: 13, fontVariant: ['tabular-nums'] },
});
