import { Pressable, View } from 'react-native';
import DatePickerField from './DatePickerField';
import { Icon } from './UI';
import { localDay, parseDay, shiftDay } from '@/lib/dates';
import { theme } from '@/lib/theme';

export default function DaySelector({ value, onChange, minimum = '1900-01-01' }: { value: string; onChange: (day: string) => void; minimum?: string }) {
  const today = localDay();
  const choose = (day: string) => { if (parseDay(day) && day >= minimum && day <= today) onChange(day); };
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
    <Pressable accessibilityRole="button" accessibilityLabel="Previous day" disabled={value <= minimum} onPress={() => choose(shiftDay(value, -1))} style={{ width: 44, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: theme.cardAlt, opacity: value <= minimum ? .3 : 1 }}><Icon name="previous" color={theme.accent} /></Pressable>
    <View style={{ flex: 1 }}><DatePickerField value={value} onChange={choose} minimum={minimum} maximum={today} label="Choose entry date" /></View>
    <Pressable accessibilityRole="button" accessibilityLabel="Next day" disabled={value >= today} onPress={() => choose(shiftDay(value, 1))} style={{ width: 44, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: theme.cardAlt, opacity: value >= today ? .3 : 1 }}><Icon name="next" color={theme.accent} /></Pressable>
  </View>;
}
