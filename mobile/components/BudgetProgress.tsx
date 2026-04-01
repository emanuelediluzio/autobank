// mobile/components/BudgetProgress.tsx
import { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { formatAmount } from '../utils/format';

interface BudgetItem {
  id: string;
  label: string;
  icon: string;
  spent: number;
  limit: number;
}

interface Props {
  items: BudgetItem[];
}

function getBarColor(ratio: number): string {
  if (ratio >= 1) return theme.colors.danger;
  if (ratio >= 0.8) return theme.colors.warning;
  return theme.colors.accent;
}

function ProgressBar({ item }: { item: BudgetItem }) {
  const animatedWidth = useRef(new Animated.Value(0)).current;
  const ratio = item.limit > 0 ? item.spent / item.limit : 0;
  const clampedRatio = Math.min(ratio, 1);
  const color = getBarColor(ratio);

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: clampedRatio,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [clampedRatio]);

  if (item.limit <= 0) return null;

  const percentage = Math.round(ratio * 100);

  return (
    <View style={styles.itemContainer}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemIcon}>{item.icon}</Text>
        <Text style={styles.itemLabel}>{item.label}</Text>
        <Text style={[styles.itemRatio, { color }]}>
          {formatAmount(item.spent)} / {formatAmount(item.limit)}
        </Text>
      </View>
      <View style={styles.barBackground}>
        <Animated.View
          style={[
            styles.barFill,
            {
              backgroundColor: color,
              width: animatedWidth.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
      <Text style={[styles.percentText, { color }]}>
        {percentage}%{ratio > 1 ? ' - Budget superato!' : ''}
      </Text>
    </View>
  );
}

export function BudgetProgress({ items }: Props) {
  const activeItems = items.filter(i => i.limit > 0);

  if (activeItems.length === 0) return null;

  return (
    <View style={styles.container}>
      {activeItems.map(item => (
        <ProgressBar key={item.id} item={item} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  itemContainer: { marginBottom: 4 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  itemIcon: { fontSize: 16, marginRight: 8 },
  itemLabel: { flex: 1, color: theme.colors.text, fontSize: 13, fontWeight: '500' },
  itemRatio: { fontSize: 12, fontVariant: ['tabular-nums'] },
  barBackground: {
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.border,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  percentText: {
    fontSize: 11,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
});
