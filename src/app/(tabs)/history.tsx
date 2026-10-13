import MacroBreakdown from '@/components/MacroBreakdown';
import { macroTotals } from '@/lib/macros';
import NutritionDetails from '@/components/NutritionDetails';
import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import ProgressHub from '@/components/ProgressHub';
import DaySelector from '@/components/DaySelector';
import { Button, Card, Page, Row, Title, ui } from '@/components/UI';
import { today, useStore, type Meal } from '@/lib/store';
import { planTargets } from '@/lib/targets';
import { useAuth } from '@/lib/auth';
import { theme } from '@/lib/theme';
import { parseDay, formatDate, displayDatesInText } from '@/lib/dates';

const number = (value: number) => Math.round(value).toLocaleString();
const displayDate = formatDate;
const displayTime = (time: string) => { const [hours, minutes] = time.split(':').map(Number); return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); };

type Event = { id: string; time?: string; title: string; detail: string; kind: string; meal?: Meal; entryKind?: 'meal' | 'workout' | 'weight' | 'water' | 'steps' | 'legacy-water' };

export default function History() {
  const { date, view } = useLocalSearchParams<{ date?: string; view?: string }>();
  const initialDate = date && parseDay(date) ? date : today();
  return <HistoryContent key={`${initialDate}-${view}`} initialDate={initialDate} initialView={view === 'history' || date ? 'history' : 'progress'} />;
}

function HistoryContent({ initialDate, initialView }: { initialDate: string; initialView: 'progress' | 'history' }) {
  const [view, setView] = useState(initialView);
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
    ...meals.map((x) => ({ id: x.id, time: x.time, kind: x.type.toUpperCase(), entryKind: 'meal' as const, title: x.name, meal: x, detail: `${number(x.calories)} kcal${x.note ? `\n${x.note}` : ''}` })),
    ...workouts.map((x) => ({ id: x.id, time: x.time, kind: 'WORKOUT', entryKind: 'workout' as const, title: x.name, detail: `${number(x.minutes)} min${x.note ? ` · ${x.note}` : ''}` })),
    ...waters.map((x) => ({ id: x.id, time: x.time, kind: 'WATER', entryKind: 'water' as const, title: `${number(x.ml)} ml water`, detail: 'Drink logged' })),
    ...steps.map((x) => ({ id: x.id, time: x.time, kind: 'STEPS', entryKind: 'steps' as const, title: `${number(x.count)} steps`, detail: 'Steps logged' })),
    ...weighIns.map((x) => ({ id: x.id, kind: 'WEIGH-IN', entryKind: 'weight' as const, title: `${x.kg} kg`, detail: 'Weight recorded; time was not saved' })),
  ] as Event[]).sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99') || a.kind.localeCompare(b.kind));
  const legacyWater = Math.max(0, water - waters.reduce((sum, entry) => sum + entry.ml, 0));
  if (legacyWater) events.push({ id: selected, kind: 'WATER', entryKind: 'legacy-water', title: `${number(legacyWater)} ml water`, detail: 'Logged before water timestamps were available' });
  const switcher = <View style={{ flexDirection: 'row', gap: 5, padding: 5, borderRadius: 16, backgroundColor: theme.cardAlt, borderWidth: 1, borderColor: theme.line }}>{(['progress', 'history'] as const).map((option) => <Pressable key={option} accessibilityRole="button" accessibilityState={{ selected: view === option }} onPress={() => setView(option)} style={{ flex: 1, minHeight: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: view === option ? theme.accent : 'transparent' }}><Text style={{ color: view === option ? theme.ink : theme.muted, fontSize: 13, fontFamily: theme.font }}>{option === 'progress' ? 'Overview' : 'Daily history'}</Text></Pressable>)}</View>;
  if (view === 'progress') return <Page><Title eyebrow="SEE HOW FAR YOU'VE COME" subtitle="Your effort, made visible. One check-in at a time.">Progress</Title>{switcher}<ProgressHub logs={store} today={today()} /></Page>;
  return <Page>
    <Title eyebrow="EVERY DAY COUNTS" subtitle="Revisit, fill gaps, or edit your daily check-ins.">Your activity</Title>{switcher}
    <View style={{ gap: 8 }}>
      <Text style={{ color: theme.text, fontSize: 18, fontFamily: theme.font }}>Recent days</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
        {dates.slice(0, 14).map((date) => <Pressable key={date} onPress={() => setSelected(date)} accessibilityRole="button" accessibilityState={{ selected: date === selected }} style={{ minHeight: 44, justifyContent: 'center', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: date === selected ? theme.accent : theme.line, backgroundColor: date === selected ? 'rgba(252,163,17,0.16)' : theme.card }}><Text style={{ color: date === selected ? theme.accent : theme.text, fontWeight: '700' }}>{date === today() ? 'Today' : formatDate(date)}</Text></Pressable>)}
      </ScrollView>
    </View>
    <Card><Text style={{ color: theme.text, fontFamily: theme.font }}>Jump to any day</Text><DaySelector value={selected} onChange={setSelected} /><Button onPress={() => router.push({ pathname: '/(tabs)/log', params: { date: selected, entry: String(Date.now()) } })}>Add an entry for {formatDate(selected)}</Button></Card>
    <Text style={{ color: theme.text, fontSize: 21, fontFamily: theme.font }}>{displayDate(selected)}</Text>
    <Card style={{ backgroundColor: theme.hero, borderColor: 'rgba(252,163,17,0.3)' }}><Text style={{ color: theme.accent, fontSize: 11, letterSpacing: 1, fontFamily: theme.font }}>DAY SUMMARY</Text>
      <Text style={{ color: theme.text, fontSize: 23, fontFamily: theme.font }}>{number(total('calories'))} kcal consumed</Text>
      <Text style={ui.muted}>{targets ? `${number(Math.abs(targets.calories - total('calories')))} kcal ${total('calories') <= targets.calories ? 'below' : 'above'} your ${number(targets.calories)} kcal guide` : 'No calorie guide available for this day.'}</Text>
      <MacroBreakdown amounts={macroTotals(meals)} targets={targets} />
      <Text style={ui.muted}>Water {number(water)} ml{targets ? ` / ${number(targets.water)} ml guide` : ''}</Text>
      <Text style={ui.muted}>Steps {number(stepCount)} · Exercise {number(exerciseMinutes)} min across {workouts.length} workout{workouts.length === 1 ? '' : 's'}</Text>
      <Text style={[ui.muted, { fontSize: 11 }]}>Guides use your current profile and the most recent weight recorded by this date. Steps reflect manual logs only. Calories compared with a guide are not a measured energy deficit.</Text>
    </Card>
    <Card><Text style={{ color: theme.accent, fontSize: 11, letterSpacing: 1, fontFamily: theme.font }}>TIMELINE</Text>
      {events.length ? events.map((event) => <View key={event.id} style={{ borderTopWidth: 1, borderColor: theme.line, paddingTop: 12, gap: 3 }}>
        <Row><Text style={{ color: theme.accent, fontSize: 12, fontFamily: theme.font, minWidth: 70 }}>{event.time ? displayTime(event.time) : 'Time n/a'}</Text><Text style={{ color: theme.muted, fontSize: 10, fontFamily: theme.font }}>{event.kind}</Text></Row>
        <Row><Text style={{ color: theme.text, fontSize: 16, fontFamily: theme.font, flex: 1 }}>{event.title}</Text>{event.entryKind ? <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${event.kind.toLowerCase()} entry`} style={{ minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }} onPress={() => router.push({ pathname: '/edit-entry', params: { kind: event.entryKind, id: event.id } })}><Text style={{ color: theme.accent, fontFamily: theme.font }}>Edit</Text></Pressable> : null}</Row><Text style={ui.muted}>{displayDatesInText(event.detail)}</Text>
        {event.meal ? <NutritionDetails label="Meal nutrition / daily guides"><MacroBreakdown amounts={event.meal} targets={targets} label="This meal / daily guide" /></NutritionDetails> : null}
      </View>) : <Text style={ui.muted}>No activity logged for this day.</Text>}
    </Card>
  </Page>;
}
