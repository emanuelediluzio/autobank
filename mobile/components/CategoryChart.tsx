// mobile/components/CategoryChart.tsx
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
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

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export function CategoryChart({ data, currency = 'EUR' }: { data: CategoryData[]; currency?: string }) {
  if (!data.length) return null;

  const top = data.slice(0, 6);
  const total = top.reduce((s, c) => s + c.total, 0);
  if (total === 0) return null;

  const cx = 100, cy = 100, outerR = 70, innerR = 45;
  let currentAngle = 0;

  const slices = top.map((c) => {
    const sweep = (c.total / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sweep;
    currentAngle = endAngle;

    if (sweep >= 359.9) {
      return [
        `M ${cx} ${cy - outerR}`,
        `A ${outerR} ${outerR} 0 1 1 ${cx - 0.01} ${cy - outerR}`,
        `M ${cx} ${cy - innerR}`,
        `A ${innerR} ${innerR} 0 1 0 ${cx - 0.01} ${cy - innerR}`,
        'Z',
      ].join(' ');
    }

    const os = polarToCartesian(cx, cy, outerR, endAngle);
    const oe = polarToCartesian(cx, cy, outerR, startAngle);
    const is_ = polarToCartesian(cx, cy, innerR, startAngle);
    const ie = polarToCartesian(cx, cy, innerR, endAngle);
    const large = sweep > 180 ? 1 : 0;

    return [
      `M ${os.x} ${os.y}`,
      `A ${outerR} ${outerR} 0 ${large} 0 ${oe.x} ${oe.y}`,
      `L ${is_.x} ${is_.y}`,
      `A ${innerR} ${innerR} 0 ${large} 1 ${ie.x} ${ie.y}`,
      'Z',
    ].join(' ');
  });

  return (
    <View style={styles.container}>
      <Svg width={200} height={200} viewBox="0 0 200 200">
        {slices.map((d, i) => (
          <Path key={top[i].id} d={d} fill={getCategoryColor(top[i].id)} />
        ))}
      </Svg>
      <View style={styles.legend}>
        {top.map(c => (
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
  legend: { width: '100%', marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  legendLabel: { flex: 1, color: theme.colors.text, fontSize: 13 },
  legendValue: { color: theme.colors.textMuted, fontSize: 13, fontVariant: ['tabular-nums'] },
});
