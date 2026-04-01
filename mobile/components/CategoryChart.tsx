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

  const cx = 110, cy = 110, outerR = 90, innerR = 58;
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
      <Svg width={220} height={220} viewBox="0 0 220 220">
        {slices.map((d, i) => (
          <Path key={top[i].id} d={d} fill={getCategoryColor(top[i].id)} />
        ))}
      </Svg>
      <View style={styles.legend}>
        {top.map(c => {
          const pct = Math.round((c.total / total) * 100);
          return (
            <View key={c.id} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: getCategoryColor(c.id) }]} />
              <Text style={styles.legendLabel} numberOfLines={1}>{c.icon} {c.label}</Text>
              <Text style={styles.legendPct}>{pct}%</Text>
              <Text style={styles.legendValue}>{formatAmount(c.total, currency)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  legend: { width: '100%', marginTop: 16, flexDirection: 'row', flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, width: '50%', paddingRight: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  legendLabel: { flex: 1, color: theme.colors.text, fontSize: 13 },
  legendPct: { color: theme.colors.textSecondary, fontSize: 12, marginRight: 6, fontWeight: '500' },
  legendValue: { color: theme.colors.textMuted, fontSize: 12, fontVariant: ['tabular-nums'] },
});
