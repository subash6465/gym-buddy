import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { TimeUnit } from '@/lib/workouts';
import { theme } from '@/lib/theme';
import { Input } from './UI';

export default function WorkoutTimeInput({ value, unit, onChange, onUnitChange, label }: { value: string; unit: TimeUnit; onChange: (value: string) => void; onUnitChange: (unit: TimeUnit) => void; label: string }) {
  const [focused, setFocused] = useState(false);
  return <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 52, borderRadius: 13, borderWidth: 1, borderColor: focused ? theme.accent : theme.line, backgroundColor: theme.cardAlt, paddingLeft: 4 }}>
    <View style={{ flexDirection: 'row', gap: 2, borderRadius: 9, backgroundColor: theme.card, padding: 2 }}>
      {(['seconds', 'minutes'] as const).map((option) => <Pressable key={option} accessibilityRole="button" accessibilityLabel={`${label}: use ${option}`} accessibilityHint="Changes the time unit for this exercise and converts entered durations." accessibilityState={{ selected: unit === option }} onPress={() => onUnitChange(option)} style={({ pressed }) => ({ minHeight: 44, minWidth: 44, paddingHorizontal: 7, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: unit === option ? theme.accentSoft : 'transparent', opacity: pressed ? 0.6 : 1 })}>
        <Text style={{ fontFamily: theme.font, fontSize: 11, color: unit === option ? theme.accent : theme.muted }}>{option === 'seconds' ? 'sec' : 'min'}</Text>
      </Pressable>)}
    </View>
    <Input accessibilityLabel={`${label} in ${unit}`} value={value} onChangeText={onChange} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} keyboardType="decimal-pad" maxLength={12} placeholder={unit === 'minutes' ? '10' : '30'} style={{ flex: 1, minWidth: 0, borderWidth: 0, backgroundColor: 'transparent', paddingHorizontal: 12 }} />
  </View>;
}
