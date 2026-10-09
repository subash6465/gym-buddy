import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/UI';
import { theme } from '@/lib/theme';
import { useReduceMotion } from '@/lib/motion';

function TabIcon({ name, color, focused }: { name: 'home' | 'log' | 'plan' | 'history' | 'you'; color: ColorValue; focused: boolean }) {
  const reduced = useReduceMotion();
  const [scale] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (reduced !== false) { scale.setValue(1); return; }
    Animated.sequence([
      Animated.timing(scale, { toValue: focused ? 1.16 : .94, duration: 105, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, speed: 24, bounciness: 7, useNativeDriver: true }),
    ]).start();
  }, [focused, reduced, scale]);
  return <Animated.View style={{ transform: [{ scale }] }}><Icon name={name} color={color} size={19} /></Animated.View>;
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const reduced = useReduceMotion();
  return <Tabs screenOptions={{
    headerShown: false,
    animation: reduced === false ? 'shift' : 'none',
    transitionSpec: { animation: 'timing', config: { duration: 230 } },
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
    <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: ({ color, focused }) => <TabIcon name="home" color={color} focused={focused} /> }} />
    <Tabs.Screen name="log" options={{ title: 'Log', tabBarIcon: ({ color, focused }) => <TabIcon name="log" color={color} focused={focused} /> }} />
    <Tabs.Screen name="plan" options={{ title: 'Plan', tabBarIcon: ({ color, focused }) => <TabIcon name="plan" color={color} focused={focused} /> }} />
    <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: ({ color, focused }) => <TabIcon name="history" color={color} focused={focused} /> }} />
    <Tabs.Screen name="profile" options={{ title: 'You', tabBarIcon: ({ color, focused }) => <TabIcon name="you" color={color} focused={focused} /> }} />
  </Tabs>;
}
