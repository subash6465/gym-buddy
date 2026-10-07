import { ReactNode, useEffect, useRef } from 'react';
import { SymbolView } from 'expo-symbols';
import {
  AccessibilityInfo, Animated, ColorValue, Easing, Pressable, ScrollView, StyleProp, StyleSheet,
  Text, TextInput, TextInputProps, View, ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/lib/theme';

const symbolNames = {
  home: { ios: 'house.fill', android: 'home', web: 'home' },
  log: { ios: 'plus.circle.fill', android: 'add_circle', web: 'add_circle' },
  plan: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' },
  you: { ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' },
  meal: { ios: 'fork.knife', android: 'restaurant', web: 'restaurant' },
  water: { ios: 'drop.fill', android: 'water_drop', web: 'water_drop' },
  protein: { ios: 'bolt.fill', android: 'bolt', web: 'bolt' },
  workout: { ios: 'dumbbell.fill', android: 'fitness_center', web: 'fitness_center' },
  camera: { ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' },
  sparkles: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' },
  arrow: { ios: 'arrow.up.right', android: 'north_east', web: 'north_east' },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
} as const;

export function Icon({ name, color = theme.text, size = 20 }: { name: keyof typeof symbolNames; color?: ColorValue; size?: number }) {
  return <SymbolView name={symbolNames[name] as React.ComponentProps<typeof SymbolView>['name']} tintColor={color} size={size} />;
}

export function Brand() {
  return <View style={s.brand}>
    <View style={s.mark} accessibilityLabel="Gym Buddy logo">
      <View style={[s.markBar, { left: 11, height: 19, top: 8 }]} />
      <View style={[s.markBar, { left: 21, height: 12, top: 13 }]} />
    </View>
    <View><Text style={s.brandName}>gym buddy</Text><Text style={s.brandTag}>MOVE WITH INTENT</Text></View>
  </View>;
}

export function Page({ children }: { children: ReactNode }) {
  return <SafeAreaView style={s.safe} edges={['top']}>
    <View pointerEvents="none" style={s.glowTop} />
    <View pointerEvents="none" style={s.glowSide} />
    <ScrollView style={s.page} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Brand />
      {children}
    </ScrollView>
  </SafeAreaView>;
}

export function Title({ eyebrow, children, subtitle }: { eyebrow?: string; children: ReactNode; subtitle?: string }) {
  return <View style={s.titleWrap}>{eyebrow ? <Text style={s.eyebrow}>{eyebrow.toUpperCase()}</Text> : null}<Text style={s.title}>{children}</Text>{subtitle ? <Text style={s.muted}>{subtitle}</Text> : null}</View>;
}
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}
export function Label({ children }: { children: ReactNode }) { return <Text style={s.label}>{children}</Text>; }
export function Input(props: TextInputProps) { return <TextInput placeholderTextColor={theme.muted} {...props} style={[s.input, props.style]} />; }
export function Button({ children, onPress, secondary, disabled }: { children: ReactNode; onPress: () => void; secondary?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [s.button, secondary && s.secondary, disabled && { opacity: .45 }, pressed && { transform: [{ scale: .985 }] }]}>
    <Text style={[s.buttonText, secondary && { color: theme.text }]}>{children}</Text>
  </Pressable>;
}
export function Meter({ value, max, color = theme.accent }: { value: number; max: number; color?: string }) {
  const progress = useRef(new Animated.Value(0)).current;
  const fraction = Math.min(1, Math.max(0, max > 0 ? value / max : 0));
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!active) return;
      if (reduced) progress.setValue(fraction);
      else Animated.timing(progress, { toValue: fraction, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    }).catch(() => progress.setValue(fraction));
    return () => { active = false; progress.stopAnimation(); };
  }, [fraction, progress]);
  return <View style={s.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: max || 1, now: value }}>
    <Animated.View style={[s.fill, { backgroundColor: color, width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
  </View>;
}
export function Orbit({ value, max }: { value: number; max: number }) {
  const progress = Math.min(1, Math.max(0, max > 0 ? value / max : 0));
  return <View style={s.orbit} accessibilityLabel={max ? `${Math.round(progress * 100)} percent of daily energy guide` : 'Daily energy guide not set'}>
    {Array.from({ length: 40 }, (_, index) => {
      const angle = -90 + index * 9;
      const radians = angle * Math.PI / 180;
      return <View key={index} style={{
        position: 'absolute', left: 70 + Math.cos(radians) * 61 - 2, top: 70 + Math.sin(radians) * 61 - 6,
        width: 4, height: 12, borderRadius: 3,
        backgroundColor: index < Math.round(progress * 40) ? theme.accent : 'rgba(255,255,255,0.14)',
        transform: [{ rotate: `${angle + 90}deg` }],
      }} />;
    })}
    <Text style={s.orbitValue}>{max ? `${Math.round(progress * 100)}%` : '—'}</Text>
    <Text style={s.orbitLabel}>OF GUIDE</Text>
  </View>;
}
export function Row({ children }: { children: ReactNode }) { return <View style={s.row}>{children}</View>; }

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  page: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 13, paddingBottom: 122, gap: 18 },
  glowTop: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(40,171,176,0.14)', top: -100, right: -130 },
  glowSide: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(98,98,208,0.08)', top: 340, left: -145 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  mark: { width: 36, height: 36, borderRadius: 12, backgroundColor: theme.accent, overflow: 'hidden' },
  markBar: { position: 'absolute', width: 8, borderRadius: 2, backgroundColor: theme.ink, transform: [{ skewX: '-17deg' }] },
  brandName: { color: theme.text, fontSize: 17, fontWeight: '800', letterSpacing: -1 },
  brandTag: { color: theme.muted, fontSize: 8, fontWeight: '800', letterSpacing: 1.7, marginTop: 1 },
  titleWrap: { gap: 6 },
  eyebrow: { color: theme.accent, fontWeight: '800', letterSpacing: 1.8, fontSize: 10 },
  title: { color: theme.text, fontSize: 34, fontWeight: '800', letterSpacing: -1.4, lineHeight: 39 },
  muted: { color: theme.muted, fontSize: 13, lineHeight: 20 },
  card: { backgroundColor: theme.card, borderRadius: 22, padding: 18, gap: 12, borderWidth: 1, borderColor: theme.line, overflow: 'hidden' },
  label: { color: theme.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  input: { backgroundColor: theme.cardAlt, borderWidth: 1, borderColor: theme.line, borderRadius: 13, color: theme.text, fontSize: 15, paddingHorizontal: 14, paddingVertical: 12, minHeight: 48 },
  button: { alignItems: 'center', justifyContent: 'center', borderRadius: 13, minHeight: 48, paddingHorizontal: 18, backgroundColor: theme.accent },
  secondary: { backgroundColor: theme.cardAlt, borderWidth: 1, borderColor: theme.line },
  buttonText: { color: theme.ink, fontWeight: '800', fontSize: 14 },
  track: { height: 5, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
  orbit: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center' },
  orbitValue: { color: theme.text, fontSize: 29, fontWeight: '800', letterSpacing: -1.4 },
  orbitLabel: { color: theme.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
export const ui = s;
