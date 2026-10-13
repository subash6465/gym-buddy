import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Line, Path, Stop } from 'react-native-svg';
import { Card, Row, ui } from './UI';
import { rangeTotals, type Logs } from '@/lib/analytics';
import { shiftDay } from '@/lib/dates';
import { progressSeries, progressSummary, type ProgressMetric } from '@/lib/progress';
import { theme } from '@/lib/theme';

type Metric = ProgressMetric;
const metrics: { key: Metric; label: string; unit: string; color: string }[] = [
  { key: 'workoutMinutes', label: 'Training', unit: 'min', color: theme.accent },
  { key: 'steps', label: 'Steps', unit: 'steps', color: theme.secondary },
  { key: 'water', label: 'Water', unit: 'ml', color: theme.hydration },
  { key: 'calories', label: 'Energy', unit: 'kcal', color: theme.nutrition },
  { key: 'weight', label: 'Weight', unit: 'kg', color: theme.accent },
];

export default function ProgressChart({ logs, today }: { logs: Logs; today: string }) {
  const [period, setPeriod] = useState<7 | 30>(7);
  const [metric, setMetric] = useState<Metric>('workoutMinutes');
  const [selection, setSelection] = useState<string | null>(null);
  const days = useMemo(() => rangeTotals(logs, shiftDay(today, 1 - period), today), [logs, today, period]);
  const points = progressSeries(days, logs.weighIns, metric);
  const { recorded, average } = progressSummary(points);
  const active = metrics.find((item) => item.key === metric)!;
  const selected = points.find((point) => point.date === selection) || recorded[recorded.length - 1];
  const selectedIndex = Math.max(0, points.findIndex((point) => point.date === selected?.date));
  const max = Math.max(1, ...recorded.map((point) => point.value || 0));
  const min = metric === 'weight' && recorded.length ? Math.min(...recorded.map((point) => point.value || 0)) - 1 : 0;
  const upper = metric === 'weight' ? max + 1 : max * 1.15;
  const x = (index: number) => 10 + index * 280 / Math.max(1, points.length - 1);
  const y = (value: number) => 144 - (value - min) / (upper - min) * 126;
  const weightPoints = points.map((point, index) => ({ ...point, index })).filter((point) => point.value !== null);
  const path = weightPoints.map((point, index) => `${index ? 'L' : 'M'}${x(point.index)},${y(point.value!)}`).join(' ');
  const format = (value: number) => metric === 'weight' ? value.toFixed(1) : Math.round(value).toLocaleString();
  return <Card>
    <Row><View style={{ flex: 1 }}><Text style={{ color: theme.text, fontSize: 19, fontFamily: theme.font }}>The bigger picture</Text><Text style={ui.muted}>Your last {period} days</Text></View>
      <View style={{ flexDirection: 'row', padding: 3, backgroundColor: theme.cardAlt, borderRadius: 13 }}>{([7, 30] as const).map((option) => <Pressable key={option} onPress={() => { setPeriod(option); setSelection(null); }} accessibilityRole="button" accessibilityState={{ selected: option === period }} style={{ minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: option === period ? theme.accent : 'transparent' }}><Text style={{ color: option === period ? theme.ink : theme.muted, fontSize: 12, fontFamily: theme.font }}>{option}D</Text></Pressable>)}</View>
    </Row>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>{metrics.map((item) => <Pressable key={item.key} onPress={() => { setMetric(item.key); setSelection(null); }} accessibilityRole="button" accessibilityState={{ selected: item.key === metric }} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 10, borderRadius: 12, backgroundColor: item.key === metric ? theme.card : 'transparent', borderBottomWidth: 2, borderBottomColor: item.key === metric ? item.color : 'transparent' }}><Text style={{ color: item.key === metric ? item.color : theme.muted, fontWeight: '700', fontSize: 12 }}>{item.label}</Text></Pressable>)}</View>
    <View><Text style={{ color: theme.text, fontSize: 34, fontFamily: theme.font, letterSpacing: -1 }}>{recorded.length ? format(metric === 'weight' ? recorded[recorded.length - 1].value! : average!) : '—'} <Text style={{ color: theme.muted, fontSize: 13 }}>{active.unit}{metric === 'weight' ? '' : ' / logged day'}</Text></Text><Text style={ui.muted}>{metric === 'weight' ? 'Latest recorded weight' : `${recorded.length} days with ${active.label.toLowerCase()} entries`}</Text></View>
    {recorded.length ? <>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ width: 38, height: 166, justifyContent: 'space-between', paddingTop: 10, paddingBottom: 18 }}>{[upper, (upper + min) / 2, min].map((value, index) => <Text key={index} style={{ color: theme.muted, fontSize: 9 }}>{metric === 'weight' ? value.toFixed(1) : Math.round(value).toLocaleString()}</Text>)}</View>
        <View style={{ flex: 1 }}>
          <Svg width="100%" height={166} viewBox="0 0 300 166" preserveAspectRatio="none">
            <Defs><LinearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={active.color} stopOpacity={0.22} /><Stop offset="1" stopColor={active.color} stopOpacity={0} /></LinearGradient></Defs>
            {[18, 81, 144].map((value) => <Line key={value} x1={0} x2={300} y1={value} y2={value} stroke={theme.line} strokeDasharray="3 5" />)}
            {metric === 'weight' ? <>
              {weightPoints.length > 1 && <Path d={`${path} L${x(weightPoints[weightPoints.length - 1].index)},144 L${x(weightPoints[0].index)},144 Z`} fill="url(#weightFill)" />}
              <Path d={path} fill="none" stroke={active.color} strokeWidth={2.5} />
              {weightPoints.map((point) => <Circle key={point.date} cx={x(point.index)} cy={y(point.value!)} r={selection === point.date ? 5 : 3} fill={active.color} />)}
            </> : points.map((point, index) => point.value !== null ? <Path key={point.date} d={`M${x(index)},144 V${y(point.value)}`} stroke={active.color} strokeWidth={period === 7 ? 18 : 5} strokeLinecap="round" opacity={selected?.date === point.date ? 1 : .45} /> : null)}
          </Svg>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>{[days[0].date, days[Math.floor((period - 1) / 2)].date, today].map((date) => <Text key={date} style={{ color: theme.muted, fontSize: 10 }}>{new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</Text>)}</View>
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 166, flexDirection: 'row' }}>{points.map((point) => <Pressable key={point.date} accessibilityRole="button" accessibilityLabel={`${point.date}: ${point.value === null ? 'no entry' : `${format(point.value)} ${active.unit}`}`} onPress={() => setSelection(point.date)} style={{ flex: 1 }} />)}</View>
        </View>
      </View>
      <Row><Pressable accessibilityRole="button" accessibilityLabel="Inspect previous day" disabled={selectedIndex === 0} onPress={() => setSelection(points[selectedIndex - 1].date)} style={{ minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: theme.cardAlt, opacity: selectedIndex === 0 ? .3 : 1 }}><Text style={{ color: theme.text, fontSize: 22 }}>‹</Text></Pressable><Text style={{ color: active.color, fontSize: 12, fontWeight: '700', flex: 1, textAlign: 'center' }}>{selected ? `${new Date(`${selected.date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} / ${selected.value === null ? 'No entry logged' : `${format(selected.value)} ${active.unit}`}` : ''}</Text><Pressable accessibilityRole="button" accessibilityLabel="Inspect next day" disabled={selectedIndex === points.length - 1} onPress={() => setSelection(points[selectedIndex + 1].date)} style={{ minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: theme.cardAlt, opacity: selectedIndex === points.length - 1 ? .3 : 1 }}><Text style={{ color: theme.text, fontSize: 22 }}>›</Text></Pressable></Row>
    </> : <View style={{ height: 176, borderWidth: 1, borderColor: theme.line, borderStyle: 'dashed', borderRadius: 16, alignItems: 'center', justifyContent: 'center', padding: 20, gap: 8 }}><Text style={{ color: theme.text, fontSize: 16, fontWeight: '700' }}>Your story starts with a check-in</Text><Text style={[ui.muted, { textAlign: 'center' }]}>Log {active.label.toLowerCase()} to see your first data point here.</Text></View>}
    <Text style={[ui.muted, { fontSize: 11, lineHeight: 17 }]}>{metric === 'weight' ? 'Points are recorded weigh-ins; the line connects them.' : 'Tap the chart to inspect a day. Averages use days with entries only.'} Gaps mean no entry. Manual logs only.</Text>
  </Card>;
}
