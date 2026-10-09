import { Children, createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useIsFocused } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
  Animated, ColorValue, Easing, Pressable, ScrollView, StyleProp, StyleSheet,
  Text, TextInput, TextInputProps, View, ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/lib/theme';
import { useReduceMotion } from '@/lib/motion';

const symbolNames = {
  home: { ios: 'house.fill', android: 'home', web: 'home' },
  log: { ios: 'plus.circle.fill', android: 'add_circle', web: 'add_circle' },
  plan: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' },
  history: { ios: 'clock.arrow.circlepath', android: 'history', web: 'history' },
  chat: { ios: 'bubble.left.and.bubble.right.fill', android: 'chat', web: 'chat' },
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

const PageFocusContext = createContext(true);

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
  const focused = useIsFocused();
  return <SafeAreaView style={s.safe} edges={['top']}>
    <View pointerEvents="none" style={s.glowTop} />
    <View pointerEvents="none" style={s.glowSide} />
    <PageFocusContext.Provider value={focused}>
      <ScrollView style={s.page} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Reveal delay={0}><Brand /></Reveal>
        {Children.toArray(children).map((child, index) =>
          <Reveal key={index} delay={Math.min(index * 45, 270)}>{child}</Reveal>)}
      </ScrollView>
    </PageFocusContext.Provider>
  </SafeAreaView>;
}

export function Reveal({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const reduced = useReduceMotion();
  const focused = useContext(PageFocusContext);
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduced === null || !focused) return;
    if (reduced) { progress.setValue(1); return; }
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1, delay, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [delay, focused, progress, reduced]);
  return <Animated.View style={[style, {
    opacity: reduced ? 1 : progress,
    transform: [{ translateY: reduced ? 0 : progress.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
  }]}>{children}</Animated.View>;
}

export function MotionPressable({ children, onPress, style, disabled, accessibilityRole = 'button', accessibilityState }: {
  children: ReactNode; onPress: () => void; style?: StyleProp<ViewStyle>; disabled?: boolean;
  accessibilityRole?: 'button' | 'tab'; accessibilityState?: { selected?: boolean };
}) {
  const reduced = useReduceMotion();
  const [scale] = useState(() => new Animated.Value(1));
  const springTo = (value: number) => {
    if (reduced !== false) return;
    Animated.spring(scale, { toValue: value, speed: 28, bounciness: 5, useNativeDriver: true }).start();
  };
  return <Animated.View style={[style, { transform: [{ scale }] }]}>
    <Pressable accessibilityRole={accessibilityRole} accessibilityState={accessibilityState} disabled={disabled}
      onPress={onPress} onPressIn={() => springTo(.96)} onPressOut={() => springTo(1)}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>{children}</Pressable>
  </Animated.View>;
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
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [s.button, secondary && s.secondary, (disabled || pressed) && { opacity: .55 }]}>
    <Text style={[s.buttonText, secondary && { color: theme.text }]}>{children}</Text>
  </Pressable>;
}
export function Meter({ value, max, color = theme.accent }: { value: number; max: number; color?: string }) {
  const [progress] = useState(() => new Animated.Value(0));
  const reduced = useReduceMotion();
  const fraction = Math.min(1, Math.max(0, max > 0 ? value / max : 0));
  useEffect(() => {
    if (reduced === null) return;
    if (reduced) { progress.setValue(fraction); return; }
    const animation = Animated.timing(progress, { toValue: fraction, duration: 540, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    animation.start();
    return () => animation.stop();
  }, [fraction, progress, reduced]);
  return <View style={s.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: max || 1, now: value }}>
    <Animated.View style={[s.fill, { backgroundColor: color, width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
  </View>;
}
export function Orbit({ value, max }: { value: number; max: number }) {
  const progress = Math.min(1, Math.max(0, max > 0 ? value / max : 0));
  const reduced = useReduceMotion();
  const [sweep] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduced === null) return;
    if (reduced) { sweep.setValue(progress); return; }
    const animation = Animated.timing(sweep, { toValue: progress, duration: 750, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [progress, reduced, sweep]);
  return <View style={s.orbit} accessibilityLabel={max ? `${Math.round(progress * 100)} percent of daily energy guide` : 'Daily energy guide not set'}>
    {Array.from({ length: 40 }, (_, index) => {
      const angle = -90 + index * 9;
      const radians = angle * Math.PI / 180;
      return <Animated.View key={index} style={{
        position: 'absolute', left: 70 + Math.cos(radians) * 61 - 2, top: 70 + Math.sin(radians) * 61 - 6,
        width: 4, height: 12, borderRadius: 3,
        backgroundColor: theme.accent,
        opacity: sweep.interpolate({ inputRange: [Math.max(0, index / 40), Math.min(1, (index + 1) / 40)], outputRange: [0.14, 1], extrapolate: 'clamp' }),
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
