import { router, Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, ColorValue, Keyboard, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/UI';
import { theme } from '@/lib/theme';
import { useReduceMotion } from '@/lib/motion';

function TabIcon({ name, color, focused }: { name: 'home' | 'log' | 'plan' | 'progress' | 'you'; color: ColorValue; focused: boolean }) {
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
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  return <View style={{ flex: 1 }}><Tabs screenOptions={{
    headerShown: false,
    animation: reduced === false ? 'shift' : 'none',
    transitionSpec: { animation: 'timing', config: { duration: 230 } },
    tabBarHideOnKeyboard: true,
    tabBarActiveTintColor: theme.accent,
    tabBarInactiveTintColor: theme.muted,
    tabBarActiveBackgroundColor: theme.accentSoft,
    tabBarStyle: {
      position: 'absolute', left: 12, right: 12, bottom: Math.max(insets.bottom, 8),
      height: 72, paddingTop: 6, paddingBottom: 5, borderRadius: 26,
      backgroundColor: theme.navigation, borderWidth: 1, borderTopWidth: 1,
      borderColor: theme.line, elevation: 12,
      shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 18, shadowOffset: { width: 0, height: 8 },
    },
    tabBarItemStyle: { borderRadius: 17, marginHorizontal: 3, marginVertical: 3 },
    tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginTop: 1 },
  }}>
    <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: ({ color, focused }) => <TabIcon name="home" color={color} focused={focused} /> }} />
    <Tabs.Screen name="plan" options={{ title: 'Plan', tabBarIcon: ({ color, focused }) => <TabIcon name="plan" color={color} focused={focused} /> }} />
    <Tabs.Screen name="log" options={{ title: 'Log', tabBarIcon: ({ color, focused }) => <TabIcon name="log" color={color} focused={focused} /> }} />
    <Tabs.Screen name="history" options={{ title: 'Progress', tabBarIcon: ({ color, focused }) => <TabIcon name="progress" color={color} focused={focused} /> }} />
    <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color, focused }) => <TabIcon name="you" color={color} focused={focused} /> }} />
  </Tabs>
    {!keyboardOpen ? <Pressable accessibilityRole="button" accessibilityLabel="Open AI coach chat" accessibilityHint="Talk about your training, nutrition, and goals" onPress={() => router.navigate('/chat')}
      style={({ pressed }) => ({ position: 'absolute', right: 22, bottom: Math.max(insets.bottom, 8) + 88, minHeight: 48, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: theme.accent, borderWidth: 1, borderColor: theme.heroLine, elevation: 8, shadowColor: '#000', shadowOpacity: .3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, opacity: pressed ? .8 : 1 })}>
      <Icon name="chat" color={theme.ink} size={21} /><Text style={{ color: theme.ink, fontFamily: theme.font, fontSize: 14 }}>AI Coach</Text>
    </Pressable> : null}
  </View>;
}
