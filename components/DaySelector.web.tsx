import { Pressable, Text, View } from 'react-native';
import { localDay, parseDay, shiftDay } from '@/lib/dates';
import { theme } from '@/lib/theme';

type Props = { value: string; onChange: (day: string) => void; minimum?: string };

export default function DaySelector({ value, onChange, minimum }: Props) {
  const today = localDay();
  const choose = (day: string) => {
    if (parseDay(day) && day <= today && (!minimum || day >= minimum)) onChange(day);
  };
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
    <Pressable accessibilityRole="button" accessibilityLabel="Previous day" disabled={Boolean(minimum && value <= minimum)} onPress={() => choose(shiftDay(value, -1))} style={{ padding: 13, borderRadius: 12, backgroundColor: theme.cardAlt, opacity: minimum && value <= minimum ? .4 : 1 }}><Text style={{ color: theme.accent }}>‹</Text></Pressable>
    <input aria-label="Choose entry date" type="date" min={minimum} max={today} value={value} onChange={(event) => choose(event.target.value)} style={{ boxSizing: 'border-box', flex: 1, minWidth: 0, minHeight: 48, background: theme.cardAlt, color: theme.text, border: `1px solid ${theme.line}`, borderRadius: 14, padding: '10px 14px', fontSize: 16, colorScheme: 'dark' }} />
    <Pressable accessibilityRole="button" accessibilityLabel="Next day" disabled={value >= today} onPress={() => choose(shiftDay(value, 1))} style={{ padding: 13, borderRadius: 12, backgroundColor: theme.cardAlt, opacity: value >= today ? .4 : 1 }}><Text style={{ color: theme.accent }}>›</Text></Pressable>
  </View>;
}
