import { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { theme } from '@/lib/theme';

export function Page({ children }: { children: ReactNode }) { return <ScrollView style={s.page} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">{children}</ScrollView>; }
export function Title({ eyebrow, children, subtitle }: { eyebrow?: string; children: ReactNode; subtitle?: string }) { return <View style={s.titleWrap}>{eyebrow ? <Text style={s.eyebrow}>{eyebrow.toUpperCase()}</Text> : null}<Text style={s.title}>{children}</Text>{subtitle ? <Text style={s.muted}>{subtitle}</Text> : null}</View>; }
export function Card({ children, style }: { children: ReactNode; style?: object }) { return <View style={[s.card, style]}>{children}</View>; }
export function Label({ children }: { children: ReactNode }) { return <Text style={s.label}>{children}</Text>; }
export function Input(props: TextInputProps) { return <TextInput placeholderTextColor={theme.muted} {...props} style={[s.input, props.style]} />; }
export function Button({ children, onPress, secondary, disabled }: { children: ReactNode; onPress: () => void; secondary?: boolean; disabled?: boolean }) { return <Pressable disabled={disabled} onPress={onPress} style={[s.button, secondary && s.secondary, disabled && { opacity: .45 }]}><Text style={[s.buttonText, secondary && { color: theme.text }]}>{children}</Text></Pressable>; }
export function Meter({ value, max, color = theme.accent }: { value: number; max: number; color?: string }) { return <View style={s.track}><View style={[s.fill, { width: `${Math.min(100, Math.max(0, max ? value / max * 100 : 0))}%`, backgroundColor: color }]} /></View>; }
export function Row({ children }: { children: ReactNode }) { return <View style={s.row}>{children}</View>; }
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.bg }, content: { padding: 20, paddingBottom: 42, gap: 18 },
  titleWrap: { marginTop: 12, gap: 6 }, eyebrow: { color: theme.accent, fontWeight: '800', letterSpacing: 2, fontSize: 11 },
  title: { color: theme.text, fontSize: 32, fontWeight: '800', letterSpacing: -1 }, muted: { color: theme.muted, fontSize: 14, lineHeight: 21 },
  card: { backgroundColor: theme.card, borderRadius: 24, padding: 20, gap: 12, borderWidth: 1, borderColor: theme.line },
  label: { color: theme.muted, fontSize: 12, fontWeight: '700', letterSpacing: .4 },
  input: { backgroundColor: theme.cardAlt, borderWidth: 1, borderColor: theme.line, borderRadius: 14, color: theme.text, fontSize: 16, paddingHorizontal: 15, paddingVertical: 12, minHeight: 48 },
  button: { alignItems: 'center', justifyContent: 'center', borderRadius: 15, minHeight: 50, paddingHorizontal: 18, backgroundColor: theme.accent },
  secondary: { backgroundColor: theme.cardAlt, borderWidth: 1, borderColor: theme.line }, buttonText: { color: theme.bg, fontWeight: '800', fontSize: 15 },
  track: { height: 8, borderRadius: 8, backgroundColor: theme.cardAlt, overflow: 'hidden' }, fill: { height: '100%', borderRadius: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
export const ui = s;
