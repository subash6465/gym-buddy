import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button, Icon, Input, Label, Row, ui } from './UI';
import PickerDialog from './PickerDialog';
import { theme } from '@/lib/theme';

export default function MealTimePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  return <View><Pressable accessibilityRole="button" accessibilityLabel={`Choose time: ${value}`} onPress={() => setOpen(true)} style={{ minHeight: 50, paddingHorizontal: 14, borderRadius: 14, backgroundColor: theme.cardAlt, borderWidth: 1, borderColor: theme.line, flexDirection: 'row', alignItems: 'center' }}><Text style={{ color: theme.text, fontSize: 16, flex: 1 }}>{value}</Text><Icon name="down" color={theme.accent} size={17} /></Pressable>{open ? <TimeDialog value={value} onClose={() => setOpen(false)} onChange={(time) => { onChange(time); setOpen(false); }} /> : null}</View>;
}

function TimeDialog({ value, onChange, onClose }: { value: string; onChange: (value: string) => void; onClose: () => void }) {
  const [hours, setHours] = useState(value.split(':')[0] || '12');
  const [minutes, setMinutes] = useState(value.split(':')[1] || '00');
  const [error, setError] = useState('');
  const adjust = (part: 'hours' | 'minutes', amount: number) => {
    const limit = part === 'hours' ? 24 : 60;
    const next = ((Number(part === 'hours' ? hours : minutes) || 0) + amount + limit) % limit;
    (part === 'hours' ? setHours : setMinutes)(String(next).padStart(2, '0')); setError('');
  };
  const save = () => {
    const h = Number(hours); const m = Number(minutes);
    if (!/^\d{1,2}$/.test(hours) || !/^\d{1,2}$/.test(minutes) || h > 23 || m > 59) { setError('Use hours 00–23 and minutes 00–59.'); return; }
    onChange(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  };
  return <PickerDialog title="Choose time" onClose={onClose}>
    <Text style={ui.muted}>24-hour time / HH:MM</Text>
    <Row>{(['hours', 'minutes'] as const).map((part) => <View key={part} style={{ flex: 1, gap: 10 }}><Label>{part.toUpperCase()}</Label><Input accessibilityLabel={part} value={part === 'hours' ? hours : minutes} keyboardType="number-pad" maxLength={2} onChangeText={(text) => { (part === 'hours' ? setHours : setMinutes)(text.replace(/\D/g, '')); setError(''); }} style={{ color: theme.accent, fontFamily: theme.font, fontSize: 38, textAlign: 'center', minHeight: 80 }} /><Row>{([-1, 1] as const).map((amount) => <Pressable key={amount} accessibilityRole="button" accessibilityLabel={`${amount > 0 ? 'Increase' : 'Decrease'} ${part}`} onPress={() => adjust(part, amount)} style={{ flex: 1, minHeight: 44, borderRadius: 12, backgroundColor: theme.cardAlt, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: theme.accent, fontSize: 22 }}>{amount > 0 ? '+' : '−'}</Text></Pressable>)}</Row></View>)}</Row>
    <View style={{ gap: 10 }}><Label>QUICK MINUTES</Label><Row>{['00', '15', '30', '45'].map((minute) => <Pressable key={minute} accessibilityRole="button" accessibilityLabel={`${minute} minutes`} accessibilityState={{ selected: minutes === minute }} onPress={() => { setMinutes(minute); setError(''); }} style={{ flex: 1, minHeight: 44, borderRadius: 12, backgroundColor: minutes === minute ? theme.accent : theme.cardAlt, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: minutes === minute ? theme.ink : theme.text, fontWeight: '700' }}>{minute}</Text></Pressable>)}</Row></View>
    {error ? <Text accessibilityRole="alert" style={{ color: theme.red }}>{error}</Text> : null}
    <Button onPress={save}>Use selected time</Button>
  </PickerDialog>;
}
