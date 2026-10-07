import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { theme } from '@/lib/theme';

export default function TabLayout() {
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: theme.accent, tabBarInactiveTintColor: theme.muted, tabBarStyle: { backgroundColor: theme.card, borderTopColor: theme.line, height: 66, paddingTop: 5, paddingBottom: 8 }, tabBarLabelStyle: { fontSize: 11, fontWeight: '700' } }}>
    <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>◉</Text> }} />
    <Tabs.Screen name="log" options={{ title: 'Log', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 23 }}>＋</Text> }} />
    <Tabs.Screen name="plan" options={{ title: 'Plan', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>▤</Text> }} />
    <Tabs.Screen name="profile" options={{ title: 'You', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>◌</Text> }} />
  </Tabs>;
}
