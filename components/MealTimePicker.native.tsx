import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { theme } from '@/lib/theme';

export default function MealTimePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [hours, minutes] = value.split(':').map(Number);
  const date = new Date(); date.setHours(hours || 0, minutes || 0, 0, 0);
  const selectTime = (selected: Date) => onChange(`${String(selected.getHours()).padStart(2, '0')}:${String(selected.getMinutes()).padStart(2, '0')}`);
  const showPicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value: date, mode: 'time', is24Hour: true, onValueChange: (_, selected) => selectTime(selected) });
    } else setOpen(true);
  };
  return <View><Pressable onPress={showPicker} accessibilityRole="button" accessibilityLabel={`Selected time ${value}`} style={{ backgroundColor: theme.cardAlt, borderWidth: 1, borderColor: theme.line, borderRadius: 14, padding: 15 }}><Text style={{ color: theme.text, fontSize: 16 }}>{value}</Text></Pressable>
    {open && <DateTimePicker value={date} mode="time" display="spinner" onValueChange={(_, selected) => selectTime(selected)} onDismiss={() => setOpen(false)} />}
    {open && Platform.OS === 'ios' && <Pressable onPress={() => setOpen(false)} style={{ alignSelf: 'flex-end', padding: 10 }}><Text style={{ color: theme.accent, fontWeight: '800' }}>Done</Text></Pressable>}
  </View>;
}
