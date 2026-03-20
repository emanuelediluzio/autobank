// mobile/components/BudgetSlider.tsx
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { theme } from '../theme';
import { formatAmount } from '../utils/format';

interface Props {
  label: string;
  icon: string;
  value: number;
  onValueChange: (val: number) => void;
}

export function BudgetSlider({ label, icon, value, onValueChange }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value > 0 ? formatAmount(value) : 'Nessun limite'}</Text>
      </View>
      <Slider
        minimumValue={0}
        maximumValue={1000}
        step={25}
        value={value}
        onValueChange={onValueChange}
        minimumTrackTintColor={theme.colors.accent}
        maximumTrackTintColor={theme.colors.border}
        thumbTintColor={theme.colors.accent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  icon: { fontSize: 18, marginRight: 8 },
  label: { flex: 1, color: theme.colors.text, fontSize: 14, fontWeight: '500' },
  value: { color: theme.colors.textMuted, fontSize: 13, fontVariant: ['tabular-nums'] },
});
