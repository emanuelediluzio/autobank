// mobile/app/(tabs)/profile.tsx
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/useAuthStore';
import { theme } from '../../theme';

export default function ProfileScreen() {
  const { userId, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert('Logout', 'Vuoi scollegare tutti i conti e uscire?', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Esci', style: 'destructive', onPress: () => { logout(); router.replace('/onboarding'); } },
    ]);
  };

  const menuItems = [
    { icon: 'settings-outline' as const, label: 'Impostazioni', onPress: () => router.push('/settings') },
    { icon: 'notifications-outline' as const, label: 'Notifiche', onPress: () => router.push('/settings') },
    { icon: 'information-circle-outline' as const, label: 'About', onPress: () => Alert.alert('Autobank', 'v1.0.0\nOpen Banking PSD2 con Yapily') },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={40} color={theme.colors.accent} />
        </View>
        <Text style={styles.userId}>{userId}</Text>
        <Text style={styles.subtitle}>Account collegato via Yapily</Text>

        <View style={styles.menu}>
          {menuItems.map((item, i) => (
            <TouchableOpacity key={i} style={styles.menuItem} onPress={item.onPress}>
              <Ionicons name={item.icon} size={22} color={theme.colors.text} />
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={theme.colors.danger} />
          <Text style={styles.logoutText}>Esci</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: { flex: 1, padding: 24, alignItems: 'center', paddingTop: 40 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: theme.colors.accent },
  userId: { fontSize: 18, fontWeight: '600', color: theme.colors.text, marginTop: 16 },
  subtitle: { color: theme.colors.textMuted, fontSize: 13, marginTop: 4 },
  menu: { width: '100%', marginTop: 32, backgroundColor: theme.colors.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border, gap: 12 },
  menuLabel: { flex: 1, color: theme.colors.text, fontSize: 15 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 32, padding: 16 },
  logoutText: { color: theme.colors.danger, fontWeight: '600', fontSize: 15 },
});
