// mobile/components/BankPicker.tsx
import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { getInstitutions } from '../services/api';
import { theme } from '../theme';

interface Props {
  country: string;
  onSelect: (bank: { id: string; name: string }) => void;
  selected: string | null;
}

export function BankPicker({ country, onSelect, selected }: Props) {
  const [banks, setBanks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getInstitutions(country)
      .then(setBanks)
      .catch(() => setBanks([]))
      .finally(() => setLoading(false));
  }, [country]);

  if (loading) return <ActivityIndicator color={theme.colors.accent} style={{ marginTop: 20 }} />;

  return (
    <FlatList
      data={banks}
      keyExtractor={(item) => item.id}
      style={styles.list}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[styles.item, selected === item.id && styles.selected]}
          onPress={() => onSelect({ id: item.id, name: item.name || item.fullName || item.id })}
        >
          <Text style={[styles.name, selected === item.id && styles.selectedText]}>
            {item.name || item.fullName || item.id}
          </Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { maxHeight: 300 },
  item: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selected: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.surfaceHover,
  },
  name: { color: theme.colors.text, fontSize: 15, fontWeight: '500' },
  selectedText: { color: theme.colors.accent },
});
