import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { localDay, parseDay, shiftDay } from '@/lib/dates';
import { theme } from '@/lib/theme';

type Props = { value: string; onChange: (day: string) => void; minimum?: string };

export default function DaySelector({ value, onChange, minimum }: Props) {
  const [open, setOpen] = useState(false);
  const today = localDay();
  const chosen = parseDay(value) || new Date();
  const choose = (day: string) => {
    if (parseDay(day) && day <= today && (!minimum || day >= minimum)) onChange(day);
  };
  return <View style={{ gap: 8 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Previous day" disabled={Boolean(minimum && value <= minimum)} onPress={() => choose(shiftDay(value, -1))} style={{ padding: 13, borderRadius: 12, backgroundColor: theme.cardAlt, opacity: minimum && value <= minimum ? .4 : 1 }}><Text style={{ color: theme.accent }}>‹</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Choose entry date" onPress={() => setOpen(true)} style={{ flex: 1, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.cardAlt, alignItems: 'center' }}><Text style={{ color: theme.text, fontSize: 16 }}>{chosen.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}  â–¾</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Next day" disabled={value >= today} onPress={() => choose(shiftDay(value, 1))} style={{ padding: 13, borderRadius: 12, backgroundColor: theme.cardAlt, opacity: value >= today ? .4 : 1 }}><Text style={{ color: theme.accent }}>›</Text></Pressable>
    </View>
    {open ? <DateTimePicker value={chosen} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} maximumDate={new Date()} minimumDate={minimum ? parseDay(minimum) || undefined : undefined} onValueChange={(_, selected) => { if (Platform.OS === 'android') setOpen(false); choose(localDay(selected)); }} onDismiss={() => setOpen(false)} /> : null}
    {open && Platform.OS === 'ios' ? <Pressable accessibilityRole="button" accessibilityLabel="Done choosing date" onPress={() => setOpen(false)} style={{ alignSelf: 'flex-end', padding: 10 }}><Text style={{ color: theme.accent, fontFamily: theme.font }}>Done</Text></Pressable> : null}
  </View>;
}
