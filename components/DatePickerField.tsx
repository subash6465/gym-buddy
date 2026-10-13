import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button, Icon, Input, Label, Row, ui } from './UI';
import PickerDialog from './PickerDialog';
import { calendarDays, formatDate, localDay, parseDay, parseDisplayDate } from '@/lib/dates';
import { theme } from '@/lib/theme';

type Props = { value: string; onChange: (date: string) => void; minimum?: string; maximum?: string; initialDate?: string; label?: string; placeholder?: string };

export default function DatePickerField({ value, onChange, minimum = '1900-01-01', maximum = localDay(), initialDate = maximum, label = 'Choose date', placeholder = 'DD-MM-YYYY' }: Props) {
  const [open, setOpen] = useState(false);
  return <View style={{ width: '100%' }}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value ? formatDate(value) : 'not selected'}`} onPress={() => setOpen(true)} style={{ minHeight: 50, paddingHorizontal: 14, borderRadius: 14, backgroundColor: theme.cardAlt, borderWidth: 1, borderColor: theme.line, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Text style={{ color: value ? theme.text : theme.muted, fontSize: 14, flex: 1 }}>{value ? formatDate(value) : placeholder}</Text><Icon name="down" color={theme.accent} size={17} />
    </Pressable>
    {open ? <CalendarDialog value={value || initialDate} minimum={minimum} maximum={maximum} label={label} onClose={() => setOpen(false)} onChange={(date) => { onChange(date); setOpen(false); }} /> : null}
  </View>;
}

function CalendarDialog({ value, minimum, maximum, label, onClose, onChange }: Required<Pick<Props, 'value' | 'minimum' | 'maximum' | 'label' | 'onChange'>> & { onClose: () => void }) {
  const initial = parseDay(value) ? value : maximum;
  const bounded = initial < minimum ? minimum : initial > maximum ? maximum : initial;
  const [chosen, setChosen] = useState(bounded);
  const [month, setMonth] = useState(() => parseDay(bounded)!);
  const [draft, setDraft] = useState(formatDate(bounded));
  const [error, setError] = useState('');
  const year = month.getFullYear(); const monthIndex = month.getMonth();
  const previousAllowed = localDay(new Date(year, monthIndex, 0, 12)) >= minimum;
  const nextAllowed = localDay(new Date(year, monthIndex + 1, 1, 12)) <= maximum;
  const select = (day: string) => { setChosen(day); setDraft(formatDate(day)); setError(''); };
  const edit = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 8);
    const masked = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join('-');
    setDraft(masked); setError('');
    const day = parseDisplayDate(masked);
    if (day && day >= minimum && day <= maximum) { setChosen(day); setMonth(parseDay(day)!); }
  };
  const save = () => {
    const day = parseDisplayDate(draft);
    if (!day || day < minimum || day > maximum) { setError(`Enter a valid date between ${formatDate(minimum)} and ${formatDate(maximum)}.`); return; }
    onChange(day);
  };
  return <PickerDialog title={label} onClose={onClose}>
    <Text style={{ color: theme.text, fontFamily: theme.font, fontSize: 30 }}>{formatDate(chosen)}</Text>
    <View style={{ gap: 8 }}><Label>ENTER DATE / DD-MM-YYYY</Label><Input value={draft} onChangeText={edit} placeholder="DD-MM-YYYY" keyboardType="number-pad" maxLength={10} accessibilityLabel="Enter date as day month year" /></View>
    <Row><Pressable disabled={!previousAllowed} accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => setMonth(new Date(year, monthIndex - 1, 1, 12))} style={{ minHeight: 44, minWidth: 44, borderRadius: 12, backgroundColor: theme.cardAlt, alignItems: 'center', justifyContent: 'center', opacity: previousAllowed ? 1 : .3 }}><Icon name="previous" color={theme.accent} /></Pressable><Text style={{ color: theme.text, flex: 1, textAlign: 'center', fontFamily: theme.font, fontSize: 17 }}>{month.toLocaleDateString(undefined, { month: 'long' })} {year}</Text><Pressable disabled={!nextAllowed} accessibilityRole="button" accessibilityLabel="Next month" onPress={() => setMonth(new Date(year, monthIndex + 1, 1, 12))} style={{ minHeight: 44, minWidth: 44, borderRadius: 12, backgroundColor: theme.cardAlt, alignItems: 'center', justifyContent: 'center', opacity: nextAllowed ? 1 : .3 }}><Icon name="next" color={theme.accent} /></Pressable></Row>
    <View><View style={{ flexDirection: 'row' }}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <Text key={index} style={{ width: `${100 / 7}%`, textAlign: 'center', color: theme.muted, fontSize: 11, paddingBottom: 8 }}>{day}</Text>)}</View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{calendarDays(year, monthIndex).map((day) => {
        const enabled = day.inMonth && day.date >= minimum && day.date <= maximum;
        return <Pressable key={day.date} disabled={!enabled} accessibilityRole="button" accessibilityLabel={formatDate(day.date)} accessibilityState={{ selected: chosen === day.date, disabled: !enabled }} onPress={() => select(day.date)} style={{ width: `${100 / 7}%`, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: chosen === day.date && day.inMonth ? theme.accent : 'transparent', opacity: enabled ? 1 : .25 }}><Text style={{ color: chosen === day.date && day.inMonth ? theme.ink : theme.text, fontSize: 14, fontWeight: '600' }}>{day.day}</Text></Pressable>;
      })}</View>
    </View>
    {error ? <Text accessibilityRole="alert" style={{ color: theme.red }}>{error}</Text> : <Text style={[ui.muted, { fontSize: 11 }]}>Type any date to jump directly to its month and year.</Text>}
    <Button onPress={save}>Use {formatDate(chosen)}</Button>
  </PickerDialog>;
}
