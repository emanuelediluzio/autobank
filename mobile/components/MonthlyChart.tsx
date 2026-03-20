// mobile/components/MonthlyChart.tsx
import { View, Text, StyleSheet } from 'react-native';
import { VictoryLine, VictoryChart, VictoryAxis, VictoryArea } from 'victory-native';
import { theme } from '../theme';
import { formatDateShort } from '../utils/format';

interface DailyData { date: string; spent: number; income: number }

export function MonthlyChart({ data }: { data: DailyData[] }) {
  if (!data.length) return null;

  const last30 = data.slice(-30);

  return (
    <View style={styles.container}>
      <VictoryChart
        width={340}
        height={180}
        padding={{ top: 10, bottom: 30, left: 50, right: 10 }}
      >
        <VictoryAxis
          style={{
            axis: { stroke: theme.colors.border },
            tickLabels: { fill: theme.colors.textMuted, fontSize: 9 },
          }}
          tickFormat={(t: string) => formatDateShort(t)}
          tickCount={5}
        />
        <VictoryAxis
          dependentAxis
          style={{
            axis: { stroke: theme.colors.border },
            tickLabels: { fill: theme.colors.textMuted, fontSize: 9 },
            grid: { stroke: theme.colors.border, strokeDasharray: '4' },
          }}
        />
        <VictoryArea
          data={last30}
          x="date"
          y="spent"
          style={{
            data: { fill: 'rgba(248,81,73,0.15)', stroke: theme.colors.danger, strokeWidth: 2 },
          }}
        />
        <VictoryLine
          data={last30}
          x="date"
          y="income"
          style={{
            data: { stroke: theme.colors.accent, strokeWidth: 2, strokeDasharray: '6' },
          }}
        />
      </VictoryChart>
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.line, { backgroundColor: theme.colors.danger }]} />
          <Text style={styles.legendText}>Spese</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.line, { backgroundColor: theme.colors.accent }]} />
          <Text style={styles.legendText}>Entrate</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  legendRow: { flexDirection: 'row', gap: 20, marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  line: { width: 16, height: 3, borderRadius: 2 },
  legendText: { color: theme.colors.textMuted, fontSize: 12 },
});
