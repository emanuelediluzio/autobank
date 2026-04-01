// mobile/components/MonthlyChart.tsx
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Line, Circle, Text as SvgText } from 'react-native-svg';
import { theme } from '../theme';
import { formatDateShort } from '../utils/format';

interface DailyData { date: string; spent: number; income: number }

function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`;
  }
  return d;
}

function formatYValue(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
  return String(Math.round(v));
}

export function MonthlyChart({ data }: { data: DailyData[] }) {
  if (!data.length) return null;

  const last30 = data.slice(-30);
  const width = Dimensions.get('window').width - 64;
  const height = 180;
  const padLeft = 45, padRight = 10, padTop = 10, padBottom = 25;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const maxVal = Math.max(...last30.map(d => Math.max(d.spent, d.income)), 1);

  const toX = (i: number) => padLeft + (i / (last30.length - 1 || 1)) * chartW;
  const toY = (v: number) => padTop + chartH - (v / maxVal) * chartH;

  // Build smooth curve points
  const spentPoints = last30.map((d, i) => ({ x: toX(i), y: toY(d.spent) }));
  const incomePoints = last30.map((d, i) => ({ x: toX(i), y: toY(d.income) }));

  const spentLine = smoothPath(spentPoints);
  const spentArea = `${spentLine} L ${toX(last30.length - 1)} ${toY(0)} L ${toX(0)} ${toY(0)} Z`;
  const incomeLine = smoothPath(incomePoints);

  // Grid lines
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(maxVal * f));

  // X axis labels (5 ticks)
  const tickIndices = [0, Math.floor(last30.length * 0.25), Math.floor(last30.length * 0.5), Math.floor(last30.length * 0.75), last30.length - 1];

  // Today marker
  const today = new Date().toISOString().split('T')[0];
  const todayIdx = last30.findIndex(d => d.date === today);

  return (
    <View style={styles.container}>
      <Svg width={width} height={height}>
        {/* Grid */}
        {gridLines.map((v, i) => (
          <Line key={i} x1={padLeft} x2={width - padRight} y1={toY(v)} y2={toY(v)} stroke={theme.colors.border} strokeWidth={0.5} strokeOpacity={0.6} />
        ))}
        {/* Y labels */}
        {gridLines.filter((_, i) => i % 2 === 0).map((v, i) => (
          <SvgText key={i} x={padLeft - 5} y={toY(v) + 3} fill={theme.colors.textMuted} fontSize={9} textAnchor="end">
            {formatYValue(v)}
          </SvgText>
        ))}
        {/* Spent area */}
        <Path d={spentArea} fill="rgba(255, 59, 48, 0.08)" />
        <Path d={spentLine} fill="none" stroke={theme.colors.danger} strokeWidth={2} strokeLinecap="round" />
        {/* Income line */}
        <Path d={incomeLine} fill="none" stroke={theme.colors.accent} strokeWidth={2} strokeDasharray="6" strokeLinecap="round" />
        {/* Today marker */}
        {todayIdx >= 0 && (
          <>
            <Line x1={toX(todayIdx)} x2={toX(todayIdx)} y1={padTop} y2={padTop + chartH} stroke={theme.colors.accent} strokeWidth={1} strokeOpacity={0.4} strokeDasharray="3" />
            <Circle cx={toX(todayIdx)} cy={toY(last30[todayIdx].spent)} r={4} fill={theme.colors.danger} />
            <Circle cx={toX(todayIdx)} cy={toY(last30[todayIdx].income)} r={4} fill={theme.colors.accent} />
          </>
        )}
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
