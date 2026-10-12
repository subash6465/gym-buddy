import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import DaySelector from '@/components/DaySelector';
import { Button, Card, Page, Row, Title, ui } from '@/components/UI';
import { today, useStore } from '@/lib/store';
import { planTargets } from '@/lib/targets';
import { useAuth } from '@/lib/auth';
import { theme } from '@/lib/theme';
import { parseDay } from '@/lib/dates';

const number = (value: number) => Math.round(value).toLocaleString();
const displayDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
const displayTime = (time: string) => { const [hours, minutes] = time.split(':').map(Number); return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); };

type Event = { id: string; time?: string; title: string; detail: string; kind: string; entryKind?: 'meal' | 'workout' | 'weight' | 'water' | 'steps' | 'legacy-water' };

export default function History() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  const initialDate = date && parseDay(date) ? date : today();
  return <HistoryContent key={initialDate} initialDate={initialDate} />;
}

function HistoryContent({ initialDate }: { initialDate: string }) {
  const store = useStore();
  const auth = useAuth();
  const [selected, setSelected] = useState(initialDate);
  const dates = useMemo(() => [...new Set([
    today(), ...store.meals.map((x) => x.date), ...store.workouts.map((x) => x.date),
    ...store.weighIns.map((x) => x.date), ...Object.keys(store.water),
    ...store.waterEntries.map((x) => x.date), ...store.stepEntries.map((x) => x.date),
  ])].sort((a, b) => b.localeCompare(a)), [store.meals, store.workouts, store.weighIns, store.water, store.waterEntries, store.stepEntries]);
  const meals = store.meals.filter((x) => x.date === selected);
  const workouts = store.workouts.filter((x) => x.date === selected);
  const waters = store.waterEntries.filter((x) => x.date === selected);
  const steps = store.stepEntries.filter((x) => x.date === selected);
  const weighIns = store.weighIns.filter((x) => x.date === selected);
  const total = (key: 'calories' | 'protein' | 'carbs' | 'fat' | 'fibre' | 'sugar') => meals.reduce((sum, meal) => sum + (Number(meal[key]) || 0), 0);
  const water = store.water[selected] || waters.reduce((sum, entry) => sum + entry.ml, 0);
  const stepCount = steps.reduce((sum, entry) => sum + entry.count, 0);
  const exerciseMinutes = workouts.reduce((sum, workout) => sum + workout.minutes, 0);
  const weight = store.weighIns.find((x) => x.date <= selected)?.kg;
  const targets = planTargets(store.profile, weight, auth.plan, new Date(`${selected}T12:00:00`));
  const events: Event[] = ([
    ...meals.map((x) => ({ id: x.id, time: x.time, kind: x.type.toUpperCase(), entryKind: 'meal' as const, title: x.name, detail: `${number(x.calories)} kcal · Protein ${number(x.protein)} g · Carbs ${number(x.carbs)} g · Fat ${number(x.fat)} g\nFibre ${number(x.fibre)} g · Sugar ${number(x.sugar)} g${x.note ? `\n${x.note}` : ''}` })),
    ...workouts.map((x) => ({ id: x.id, time: x.time, kind: 'WORKOUT', entryKind: 'workout' as const, title: x.name, detail: `${number(x.minutes)} min${x.note ? ` · ${x.note}` : ''}` })),
    ...waters.map((x) => ({ id: x.id, time: x.time, kind: 'WATER', entryKind: 'water' as const, title: `${number(x.ml)} ml water`, detail: 'Drink logged' })),
    ...steps.map((x) => ({ id: x.id, time: x.time, kind: 'STEPS', entryKind: 'steps' as const, title: `${number(x.count)} steps`, detail: 'Steps logged' })),
    ...weighIns.map((x) => ({ id: x.id, kind: 'WEIGH-IN', entryKind: 'weight' as const, title: `${x.kg} kg`, detail: 'Weight recorded; time was not saved' })),
  ] as Event[]).sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99') || a.kind.localeCompare(b.kind));
  const legacyWater = Math.max(0, water - waters.reduce((sum, entry) => sum + entry.ml, 0));
  if (legacyWater) events.push({ id: selected, kind: 'WATER', entryKind: 'legacy-water', title: `${number(legacyWater)} ml water`, detail: 'Logged before water timestamps were available' });
  return <Page>
    <Title eyebrow="YOUR DAILY RECORD" subtitle="Choose a day to see its entries in time order and a full summary.">History</Title>
    <View style={{ gap: 8 }}>
      <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>Recent days</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {dates.slice(0, 14).map((date) => <Pressable key={date} onPress={() => setSelected(date)} accessibilityRole="button" accessibilityState={{ selected: date === selected }} style={{ borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: date === selected ? theme.accent : theme.line, backgroundColor: date === selected ? 'rgba(118,240,219,0.16)' : theme.card }}><Text style={{ color: date === selected ? theme.accent : theme.text, fontWeight: '700' }}>{date === today() ? 'Today' : new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</Text></Pressable>)}
      </View>
    </View>
    <Card><Text style={{ color: theme.text, fontWeight: '800' }}>Jump to any day</Text><DaySelector value={selected} onChange={setSelected} /><Button onPress={() => router.push({ pathname: '/(tabs)/log', params: { date: selected } })}>Add an entry for {selected}</Button></Card>
    <Text style={{ color: theme.text, fontSize: 21, fontWeight: '800' }}>{displayDate(selected)}</Text>
    <Card><Text style={{ color: theme.accent, fontSize: 11, letterSpacing: 1, fontWeight: '800' }}>TIMELINE</Text>
      {events.length ? events.map((event) => <View key={event.id} style={{ borderTopWidth: 1, borderColor: theme.line, paddingTop: 12, gap: 3 }}>
        <Row><Text style={{ color: theme.accent, fontSize: 12, fontWeight: '800', minWidth: 70 }}>{event.time ? displayTime(event.time) : 'Time n/a'}</Text><Text style={{ color: theme.muted, fontSize: 10, fontWeight: '800' }}>{event.kind}</Text></Row>
        <Row><Text style={{ color: theme.text, fontSize: 16, fontWeight: '800', flex: 1 }}>{event.title}</Text>{event.entryKind ? <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${event.kind.toLowerCase()} entry`} onPress={() => router.push({ pathname: '/edit-entry', params: { kind: event.entryKind, id: event.id } })}><Text style={{ color: theme.accent, fontWeight: '800' }}>Edit</Text></Pressable> : null}</Row><Text style={ui.muted}>{event.detail}</Text>
      </View>) : <Text style={ui.muted}>No activity logged for this day.</Text>}
    </Card>
    <Card style={{ backgroundColor: 'rgba(45,104,106,0.28)', borderColor: 'rgba(118,240,219,0.3)' }}><Text style={{ color: theme.accent, fontSize: 11, letterSpacing: 1, fontWeight: '800' }}>DAY SUMMARY</Text>
      <Text style={{ color: theme.text, fontSize: 23, fontWeight: '800' }}>{number(total('calories'))} kcal consumed</Text>
      <Text style={ui.muted}>{targets ? `${number(Math.abs(targets.calories - total('calories')))} kcal ${total('calories') <= targets.calories ? 'below' : 'above'} your ${number(targets.calories)} kcal guide` : 'No calorie guide available for this day.'}</Text>
      <Text style={ui.muted}>Protein {number(total('protein'))} g · Carbs {number(total('carbs'))} g · Fat {number(total('fat'))} g</Text>
      <Text style={ui.muted}>Fibre {number(total('fibre'))} g · Sugar {number(total('sugar'))} g</Text>
      <Text style={ui.muted}>Water {number(water)} ml{targets ? ` / ${number(targets.water)} ml guide` : ''}</Text>
      <Text style={ui.muted}>Steps {number(stepCount)} · Exercise {number(exerciseMinutes)} min across {workouts.length} workout{workouts.length === 1 ? '' : 's'}</Text>
      <Text style={[ui.muted, { fontSize: 11 }]}>Guides use your current profile and the most recent weight recorded by this date. Steps reflect manual logs only. Calories compared with a guide are not a measured energy deficit.</Text>
    </Card>
  </Page>;
}
