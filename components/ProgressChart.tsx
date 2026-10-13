import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Card, Row, ui } from './UI';
import { dailyTotals, rangeTotals, type Logs } from '@/lib/analytics';
import { shiftDay } from '@/lib/dates';
import { theme } from '@/lib/theme';

type Metric = 'steps' | 'water' | 'calories' | 'workoutMinutes';
const metrics: { key: Metric; label: string; unit: string; color: string }[] = [
  { key: 'steps', label: 'Steps', unit: 'steps', color: theme.accent },
  { key: 'water', label: 'Water', unit: 'ml', color: theme.blue },
  { key: 'calories', label: 'Food', unit: 'kcal', color: theme.orange },
  { key: 'workoutMinutes', label: 'Training', unit: 'min', color: '#BAA9FF' },
];

export default function ProgressChart({ logs, today }: { logs: Logs; today: string }) {
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [metric, setMetric] = useState<Metric>('steps');
  const days = useMemo(() => rangeTotals(logs, shiftDay(today, period === 'week' ? -6 : -29), today), [logs, today, period]);
  const groups = period === 'week' ? days.map((day) => ({ label: new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2), value: day[metric] }))
    : Array.from({ length: 5 }, (_, index) => {
      const slice = days.slice(index * 7, (index + 1) * 7);
      return { label: `W${index + 1}`, value: slice.reduce((sum, day) => sum + day[metric], 0) / Math.max(1, slice.length) };
    }).filter((_, index) => index * 7 < days.length);
  const max = Math.max(1, ...groups.map((group) => group.value));
  const active = metrics.find((item) => item.key === metric)!;
  const loggedDays = days.filter((day) => day.meals || day.workouts || day.water || day.steps).length;
  const average = Math.round(days.reduce((sum, day) => sum + day[metric], 0) / Math.max(1, days.length));
  const current = dailyTotals(logs, today)[metric];
  return <Card>
    <Row><View style={{ flex: 1 }}><Text style={{ color: theme.text, fontSize: 19, fontWeight: '800' }}>Your progress</Text><Text style={ui.muted}>Last {period === 'week' ? '7' : '30'} days · {loggedDays} days logged</Text></View>
      {(['week', 'month'] as const).map((option) => <Pressable key={option} onPress={() => setPeriod(option)} accessibilityRole="button" accessibilityState={{ selected: option === period }} style={{ padding: 8, borderRadius: 10, backgroundColor: option === period ? theme.accent : theme.cardAlt }}><Text style={{ color: option === period ? theme.ink : theme.text, fontSize: 11, fontWeight: '800' }}>{option === 'week' ? '7D' : '30D'}</Text></Pressable>)}
    </Row>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{metrics.map((item) => <Pressable key={item.key} onPress={() => setMetric(item.key)} accessibilityRole="button" accessibilityState={{ selected: item.key === metric }} style={{ paddingHorizontal: 11, paddingVertical: 8, borderRadius: 12, backgroundColor: item.key === metric ? item.color : theme.cardAlt }}><Text style={{ color: item.key === metric ? theme.ink : theme.muted, fontWeight: '800', fontSize: 11 }}>{item.label}</Text></Pressable>)}</View>
    <Row><Text style={{ color: theme.text, fontSize: 27, fontWeight: '800', flex: 1 }}>{average.toLocaleString()} <Text style={{ color: theme.muted, fontSize: 12 }}>{active.unit} / day</Text></Text><Text style={{ color: active.color, fontWeight: '800', fontSize: 11 }}>Today {Math.round(current).toLocaleString()}</Text></Row>
    <View style={{ height: 132, flexDirection: 'row', alignItems: 'flex-end', gap: 7, paddingTop: 8 }}>{groups.map((group, index) => <View key={index} style={{ flex: 1, alignItems: 'center', gap: 7 }}><Text style={{ color: theme.muted, fontSize: 9 }}>{Math.round(group.value) || ''}</Text><View accessibilityLabel={`${group.label}: ${Math.round(group.value)} ${active.unit}${period === 'month' ? ' daily average' : ''}`} style={{ width: '100%', maxWidth: 36, height: Math.max(4, 88 * group.value / max), borderRadius: 8, backgroundColor: active.color, opacity: index === groups.length - 1 ? 1 : .6 }} /><Text style={{ color: theme.muted, fontSize: 10, fontWeight: '700' }}>{group.label}</Text></View>)}</View>
    <Text style={[ui.muted, { fontSize: 11 }]}>{period === 'month' ? 'Each bar shows a daily average for up to seven days.' : 'Missing bars mean no entry was logged.'} Manual entries only.</Text>
  </Card>;
}
