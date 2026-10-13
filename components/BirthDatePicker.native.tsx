import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { theme } from '@/lib/theme';
import { displayBirthDate } from '@/lib/birthDate';

const format = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export default function BirthDatePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const parts = value.split('-').map(Number);
  const date = parts.length === 3 && parts.every(Number.isFinite) ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(2000, 0, 1);
  return <View><Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel="Select date of birth" style={{ backgroundColor: theme.cardAlt, borderWidth: 1, borderColor: theme.line, borderRadius: 14, padding: 15 }}><Text style={{ color: value ? theme.text : theme.muted, fontSize: 16 }}>{displayBirthDate(value) || 'Select date of birth'}</Text></Pressable>
    {open && <DateTimePicker value={date} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} maximumDate={new Date()} minimumDate={new Date(1900, 0, 1)} onValueChange={(_, selected) => { if (Platform.OS === 'android') setOpen(false); onChange(format(selected)); }} onDismiss={() => setOpen(false)} />}
    {open && Platform.OS === 'ios' && <Pressable onPress={() => setOpen(false)} style={{ alignSelf: 'flex-end', padding: 10 }}><Text style={{ color: theme.accent, fontFamily: theme.font }}>Done</Text></Pressable>}
  </View>;
}
