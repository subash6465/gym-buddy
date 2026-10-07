import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/UI';
import { theme } from '@/lib/theme';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return <Tabs screenOptions={{
    headerShown: false,
    tabBarHideOnKeyboard: true,
    tabBarActiveTintColor: theme.accent,
    tabBarInactiveTintColor: theme.muted,
    tabBarActiveBackgroundColor: 'rgba(118,240,219,0.15)',
    tabBarStyle: {
      position: 'absolute', left: 12, right: 12, bottom: Math.max(insets.bottom, 8),
      height: 66, paddingTop: 6, paddingBottom: 5, borderRadius: 22,
      backgroundColor: 'rgba(26,56,62,0.96)', borderWidth: 1, borderTopWidth: 1,
      borderColor: 'rgba(216,255,251,0.24)', elevation: 12,
      shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 18, shadowOffset: { width: 0, height: 8 },
    },
    tabBarItemStyle: { borderRadius: 17, marginHorizontal: 3, marginVertical: 3 },
    tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginTop: 1 },
  }}>
    <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: ({ color }) => <Icon name="home" color={color} size={19} /> }} />
    <Tabs.Screen name="log" options={{ title: 'Log', tabBarIcon: ({ color }) => <Icon name="log" color={color} size={19} /> }} />
    <Tabs.Screen name="plan" options={{ title: 'Plan', tabBarIcon: ({ color }) => <Icon name="plan" color={color} size={19} /> }} />
    <Tabs.Screen name="profile" options={{ title: 'You', tabBarIcon: ({ color }) => <Icon name="you" color={color} size={19} /> }} />
  </Tabs>;
}
