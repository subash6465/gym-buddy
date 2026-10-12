import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Input } from './UI';
import { localDay, parseDay, shiftDay } from '@/lib/dates';
import { theme } from '@/lib/theme';

export default function DaySelector({ value, onChange, minimum }: { value: string; onChange: (day: string) => void; minimum?: string }) {
  return <DaySelectorForm key={value} value={value} onChange={onChange} minimum={minimum} />;
}

function DaySelectorForm({ value, onChange, minimum }: { value: string; onChange: (day: string) => void; minimum?: string }) {
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState('');
  const today = localDay();
  const choose = (day: string) => {
    if (!parseDay(day) || day > today || (minimum && day < minimum)) {
      setDraft(value);
      setError(`Choose a date${minimum ? ` from ${minimum}` : ''} through ${today}.`);
      return;
    }
    setError(''); onChange(day);
  };
  return <View style={{ gap: 8 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Previous day" disabled={Boolean(minimum && value <= minimum)} onPress={() => choose(shiftDay(value, -1))} style={{ padding: 13, borderRadius: 12, backgroundColor: theme.cardAlt }}><Text style={{ color: theme.accent }}>‹</Text></Pressable>
      <Input accessibilityLabel="Entry date, year-month-day" value={draft} onChangeText={setDraft} onEndEditing={() => choose(draft)} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" maxLength={10} style={{ flex: 1, textAlign: 'center' }} />
      <Pressable accessibilityRole="button" accessibilityLabel="Next day" disabled={value >= today} onPress={() => choose(shiftDay(value, 1))} style={{ padding: 13, borderRadius: 12, backgroundColor: theme.cardAlt, opacity: value >= today ? .4 : 1 }}><Text style={{ color: theme.accent }}>›</Text></Pressable>
    </View>
    {draft !== value ? <Pressable accessibilityRole="button" onPress={() => choose(draft)} style={{ alignSelf: 'flex-end', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: theme.cardAlt }}><Text style={{ color: theme.accent, fontWeight: '800' }}>Set date</Text></Pressable> : null}
    {error ? <Text accessibilityRole="alert" style={{ color: theme.red, fontSize: 12 }}>{error}</Text> : null}
  </View>;
}
