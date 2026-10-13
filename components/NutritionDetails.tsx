import { useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Icon, Reveal } from './UI';
import { theme } from '@/lib/theme';

export default function NutritionDetails({ label, children, initiallyOpen = false, header, summary }: {
  label: string; children: ReactNode; initiallyOpen?: boolean;
  header?: (arrow: ReactNode) => ReactNode; summary?: ReactNode;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const arrow = <View style={{ width: 12, alignItems: 'center', transform: [{ rotate: open ? '180deg' : '0deg' }] }}><Icon name="down" color={theme.accent} size={12} /></View>;
  return <View style={{ gap: 7 }}>
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint="Show or hide nutrition details" accessibilityState={{ expanded: open }} onPress={() => setOpen((value) => !value)}
      style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', opacity: pressed ? .65 : 1 })}>
      {header ? header(arrow) : <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>{arrow}<Text style={{ color: theme.muted, fontSize: 12, flex: 1 }}>{label}</Text></View>}
    </Pressable>
    {summary}
    {open ? <Reveal><View style={{ gap: 6, marginLeft: 12, paddingLeft: 12, paddingVertical: 4, borderLeftWidth: 1, borderColor: theme.heroLine }}>{children}</View></Reveal> : null}
  </View>;
}
