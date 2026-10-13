import { useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Icon, Reveal } from './UI';
import { theme } from '@/lib/theme';

export default function NutritionDetails({ label, children, initiallyOpen = false }: {
  label: string; children: ReactNode; initiallyOpen?: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  return <View style={{ gap: open ? 8 : 0 }}>
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint="Show or hide nutrition details" accessibilityState={{ expanded: open }} onPress={() => setOpen((value) => !value)}
      style={({ pressed }) => ({ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderRadius: 12, backgroundColor: pressed ? theme.accentSoft : theme.cardAlt })}>
      <Text style={{ color: theme.muted, fontSize: 12, flex: 1 }}>{label}</Text>
      <Text style={{ color: theme.accent, fontSize: 10, fontWeight: '700' }}>{open ? 'Hide' : 'Details'}</Text>
      <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}><Icon name="down" color={theme.accent} size={14} /></View>
    </Pressable>
    {open ? <Reveal><View style={{ gap: 6, marginLeft: 12, paddingLeft: 12, paddingVertical: 4, borderLeftWidth: 1, borderColor: theme.heroLine }}>{children}</View></Reveal> : null}
  </View>;
}
