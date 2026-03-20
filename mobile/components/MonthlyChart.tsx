// mobile/components/MonthlyChart.tsx
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Line, Text as SvgText } from 'react-native-svg';
import { theme } from '../theme';
import { formatDateShort } from '../utils/format';

interface DailyData { date: string; spent: number; income: number }

export function MonthlyChart({ data }: { data: DailyData[] }) {
  if (!data.length) return null;

  const last30 = data.slice(-30);
  const width = Dimensions.get('window').width - 64;
  const height = 160;
  const padLeft = 45, padRight = 10, padTop = 10, padBottom = 25;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const maxVal = Math.max(...last30.map(d => Math.max(d.spent, d.income)), 1);

  const toX = (i: number) => padLeft + (i / (last30.length - 1 || 1)) * chartW;
  const toY = (v: number) => padTop + chartH - (v / maxVal) * chartH;

  // Spent area path
  const spentLine = last30.map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(d.spent)}`).join(' ');
  const spentArea = `${spentLine} L ${toX(last30.length - 1)} ${toY(0)} L ${toX(0)} ${toY(0)} Z`;

  // Income line path
  const incomeLine = last30.map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(d.income)}`).join(' ');

  // Grid lines
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(maxVal * f));

  // X axis labels (5 ticks)
  const tickIndices = [0, Math.floor(last30.length * 0.25), Math.floor(last30.length * 0.5), Math.floor(last30.length * 0.75), last30.length - 1];

  return (
    <View style={styles.container}>
      <Svg width={width} height={height}>
        {/* Grid */}
        {gridLines.map((v, i) => (
          <Line key={i} x1={padLeft} x2={width - padRight} y1={toY(v)} y2={toY(v)} stroke={theme.colors.border} strokeWidth={1} strokeDasharray="4" />
        ))}
        {/* Y labels */}
        {gridLines.filter((_, i) => i % 2 === 0).map((v, i) => (
          <SvgText key={i} x={padLeft - 5} y={toY(v) + 3} fill={theme.colors.textMuted} fontSize={9} textAnchor="end">
            {v}
          </SvgText>
        ))}
        {/* Spent area */}
        <Path d={spentArea} fill="rgba(248,81,73,0.15)" />
        <Path d={spentLine} fill="none" stroke={theme.colors.danger} strokeWidth={2} />
        {/* Income line */}
        <Path d={incomeLine} fill="none" stroke={theme.colors.accent} strokeWidth={2} strokeDasharray="6" />
        {/* X labels */}
        {tickIndices.map((idx) => (
          <SvgText key={idx} x={toX(idx)} y={height - 5} fill={theme.colors.textMuted} fontSize={9} textAnchor="middle">
            {formatDateShort(last30[idx]?.date || '')}
          </SvgText>
        ))}
      </Svg>
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
  legendRow: { flexDirection: 'row', gap: 20, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  line: { width: 16, height: 3, borderRadius: 2 },
  legendText: { color: theme.colors.textMuted, fontSize: 12 },
});
