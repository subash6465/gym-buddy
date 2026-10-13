import { Children, createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useIsFocused } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
  Animated, ColorValue, Easing, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleProp, StyleSheet,
  Text, TextInput, TextInputProps, View, ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/lib/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { BrandMark } from './BrandMark';
import Svg, { Circle } from 'react-native-svg';
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
  progress: { ios: 'chart.xyaxis.line', android: 'monitoring', web: 'monitoring' },
  steps: { ios: 'figure.walk', android: 'directions_walk', web: 'directions_walk' },
  weight: { ios: 'scalemass', android: 'monitor_weight', web: 'monitor_weight' },
} as const;

const PageFocusContext = createContext(true);

export function Icon({ name, color = theme.text, size = 20 }: { name: keyof typeof symbolNames; color?: ColorValue; size?: number }) {
  return <SymbolView name={symbolNames[name] as React.ComponentProps<typeof SymbolView>['name']} tintColor={color} size={size} />;
}

export function Brand() {
  return <View style={s.brand}>
    <BrandMark size={31} />
    <Text style={s.brandName}>gym<Text style={{ color: theme.accent }}>buddy</Text><Text style={s.brandTag}> / </Text></Text>
    <Text style={s.brandTag}>YOUR DAILY EDGE</Text>
  </View>;
}

export function Page({ children }: { children: ReactNode }) {
  const focused = useIsFocused();
  return <SafeAreaView style={s.safe} edges={['top']}>
    <LinearGradient pointerEvents="none" colors={[theme.glow, 'transparent', theme.nightGlow]} style={StyleSheet.absoluteFill} />
    <KeyboardAvoidingView style={s.page} behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}>
      <PageFocusContext.Provider value={focused}>
        <ScrollView style={s.page} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>
          <Reveal delay={0}><Brand /></Reveal>
          {Children.toArray(children).map((child, index) =>
            <Reveal key={index} delay={Math.min(index * 45, 270)}>{child}</Reveal>)}
        </ScrollView>
      </PageFocusContext.Provider>
    </KeyboardAvoidingView>
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
  return <View style={[s.card, style]}><LinearGradient pointerEvents="none" colors={['rgba(255,255,255,0.025)', 'transparent']} style={StyleSheet.absoluteFill} />{children}</View>;
}
export function Label({ children }: { children: ReactNode }) { return <Text style={s.label}>{children}</Text>; }
export function Disclosure({ title, subtitle, children, initiallyOpen = false }: { title: string; subtitle?: string; children: ReactNode; initiallyOpen?: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  return <Card><Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12 }}><View style={{ flex: 1, gap: 4 }}><Text style={{ color: theme.text, fontSize: 18, fontFamily: theme.font }}>{title}</Text>{subtitle ? <Text style={s.muted}>{subtitle}</Text> : null}</View><Text style={{ color: theme.accent, fontSize: 24 }}>{open ? '−' : '+'}</Text></Pressable>{open ? children : null}</Card>;
}
export function Input(props: TextInputProps) { const [focused, setFocused] = useState(false); return <TextInput placeholderTextColor={theme.muted} selectionColor={theme.accent} {...props} onFocus={(event) => { setFocused(true); props.onFocus?.(event); }} onBlur={(event) => { setFocused(false); props.onBlur?.(event); }} style={[s.input, focused && { borderColor: theme.accent }, props.style]} />; }
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
  return <View style={s.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: max || 1, now: Math.min(max || 1, Math.max(0, value)) }}>
    <Animated.View style={[s.fill, { backgroundColor: color, width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
  </View>;
}
export function Orbit({ value, max, size = 140 }: { value: number; max: number; size?: number }) {
  const fraction = Math.min(1, Math.max(0, max > 0 ? value / max : 0));
  const circumference = 2 * Math.PI * 57;
  return <View style={[s.orbit, { width: size, height: size }]} accessibilityRole="progressbar" accessibilityLabel="Daily energy guide" accessibilityValue={{ min: 0, max: max || 1, now: Math.min(max || 1, Math.max(0, value)), text: max ? `${Math.round(fraction * 100)} percent of guide` : 'Guide not set' }}>
    <Svg width={size} height={size} viewBox="0 0 140 140" style={StyleSheet.absoluteFill}>
      <Circle cx={70} cy={70} r={57} stroke={theme.line} strokeWidth={8} fill="none" />
      <Circle cx={70} cy={70} r={57} stroke={theme.accent} strokeWidth={8} fill="none" strokeLinecap="round" strokeDasharray={`${circumference * fraction} ${circumference}`} rotation={-90} origin="70,70" />
      <Circle cx={70} cy={70} r={44} stroke={theme.line} strokeWidth={1} fill="none" strokeDasharray="2 6" />
    </Svg>
    <Text style={s.orbitValue}>{max ? `${Math.round(fraction * 100)}%` : '—'}</Text>
    <Text style={s.orbitLabel}>OF GUIDE</Text>
  </View>;
}
export function Row({ children }: { children: ReactNode }) { return <View style={s.row}>{children}</View>; }

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  page: { flex: 1 },
  content: { width: '100%', maxWidth: 680, alignSelf: 'center', paddingHorizontal: 22, paddingTop: 18, paddingBottom: 210, gap: 22 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 6 },
  brandName: { color: theme.text, fontSize: 20, fontFamily: theme.font, letterSpacing: -1 },
  brandTag: { color: theme.muted, fontSize: 8, fontWeight: '700', letterSpacing: 1.4 },
  titleWrap: { gap: 6 },
  eyebrow: { color: theme.accent, fontFamily: theme.font, letterSpacing: 1.8, fontSize: 10 },
  title: { color: theme.text, fontSize: 36, fontFamily: theme.font, letterSpacing: -1.5, lineHeight: 42 },
  muted: { color: theme.muted, fontSize: 13, lineHeight: 20 },
  card: { backgroundColor: theme.card, borderRadius: 24, padding: 20, gap: 14, borderWidth: 1, borderColor: theme.line, overflow: 'hidden' },
  label: { color: theme.muted, fontSize: 10, fontFamily: theme.font, letterSpacing: 1.2 },
  input: { backgroundColor: theme.cardAlt, borderWidth: 1, borderColor: theme.line, borderRadius: 13, color: theme.text, fontSize: 15, paddingHorizontal: 14, paddingVertical: 12, minHeight: 48 },
  button: { alignItems: 'center', justifyContent: 'center', borderRadius: 16, minHeight: 52, paddingHorizontal: 18, backgroundColor: theme.accent },
  secondary: { backgroundColor: theme.cardAlt, borderWidth: 1, borderColor: theme.line },
  buttonText: { color: theme.ink, fontFamily: theme.font, fontSize: 14 },
  track: { height: 6, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
  orbit: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center' },
  orbitValue: { color: theme.text, fontSize: 29, fontFamily: theme.font, letterSpacing: -1.4 },
  orbitLabel: { color: theme.muted, fontSize: 9, fontFamily: theme.font, letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
export const ui = s;
