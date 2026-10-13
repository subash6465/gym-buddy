import MacroBreakdown from '@/components/MacroBreakdown';
import { macroTotals } from '@/lib/macros';
import { formatDate } from '@/lib/dates';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Card, Icon, Meter, MotionPressable, Orbit, Page, Row, Title, ui } from '@/components/UI';
import { Meal, today, useStore } from '@/lib/store';
import { useClock } from '@/lib/clock';
import { planTargets } from '@/lib/targets';
import { useAuth } from '@/lib/auth';
import { theme } from '@/lib/theme';

const sum = (items: Meal[], key: 'calories' | 'protein' | 'carbs' | 'fat' | 'fibre' | 'sugar') => items.reduce((total, item) => total + (Number(item[key]) || 0), 0);
const log = (mode: string) => router.push({ pathname: '/(tabs)/log', params: { mode, entry: String(Date.now()) } });

function Metric({ icon, label, value, guide, fraction, color, onPress }: {
  icon: 'protein' | 'water' | 'steps' | 'workout'; label: string; value: string; guide: string; fraction: number; color: string; onPress: () => void;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value}. ${guide}. Tap to log.`} onPress={onPress} style={{ width: '47%', flexGrow: 1 }}>
    <Card style={{ padding: 16, gap: 12 }}><Row><View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: `${color}18`, alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} color={color} size={17} /></View><Text style={{ color: theme.muted, fontSize: 12, fontWeight: '600', flex: 1 }}>{label}</Text><Text style={{ color: theme.muted }}>+</Text></Row>
      <Text style={{ color: theme.text, fontSize: 27, fontFamily: theme.font, letterSpacing: -1 }}>{value}</Text>
      <Meter value={fraction} max={1} color={color} /><Text style={{ color: theme.muted, fontSize: 11 }}>{guide}</Text>
    </Card>
  </Pressable>;
}

export default function Today() {
  const store = useStore();
  const auth = useAuth();
  const now = useClock();
  const date = today(now);
  const meals = store.meals.filter((item) => item.date === date);
  const workouts = store.workouts.filter((item) => item.date === date);
  const calories = sum(meals, 'calories');
  const protein = sum(meals, 'protein');
  const water = store.water[date] || 0;
  const steps = store.stepEntries.filter((entry) => entry.date === date).reduce((total, entry) => total + entry.count, 0);
  const minutes = workouts.reduce((total, item) => total + item.minutes, 0);
  const targets = planTargets(store.profile, store.weighIns[0]?.kg, auth.plan, now);
  const todayPlan = auth.plan?.days[(now.getDay() + 6) % 7];
  const firstName = store.profile.name.trim().split(' ')[0];
  const recent = [
    ...meals.map((item) => ({ id: item.id, time: item.time, title: item.name, detail: `${Math.round(item.calories)} kcal`, icon: 'meal' as const, color: theme.nutrition })),
    ...workouts.map((item) => ({ id: item.id, time: item.time, title: item.name, detail: `${item.minutes} min training`, icon: 'workout' as const, color: theme.accent })),
  ].sort((a, b) => (b.time || '').localeCompare(a.time || '')).slice(0, 3);

  return <Page>
    <Title eyebrow={`${now.toLocaleDateString(undefined, { weekday: 'long' })} / ${formatDate(now)}`} subtitle="Small steps. Stronger every day.">{firstName ? `Let's move, ${firstName}.` : 'Make today count.'}</Title>
    <Card style={{ backgroundColor: theme.hero, borderColor: theme.heroLine, padding: 22 }}>
      <LinearGradient pointerEvents="none" colors={[theme.heroGlow, 'transparent']} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
      <Row><Text style={[ui.eyebrow, { flex: 1 }]}>TODAY’S FOCUS</Text><View style={s.pill}><Text style={s.pillText}>{todayPlan?.isRest ? 'RECOVERY' : 'TRAINING'}</Text></View></Row>
      <Row><View style={{ flex: 1, gap: 8 }}><Text style={s.workoutTitle}>{todayPlan?.title || 'Find your next move'}</Text><Text style={ui.muted}>{todayPlan ? `${todayPlan.minutes} min · ${todayPlan.focus}` : 'A personal plan, built around you.'}</Text></View><View style={s.workoutIcon}><Icon name="workout" color={theme.accent} size={34} /></View></Row>
      <MotionPressable onPress={() => router.push('/(tabs)/plan')} style={s.primary}><Row><Text style={s.primaryText}>{todayPlan ? 'View today’s session' : 'Explore your plan'}</Text><Icon name="arrow" color={theme.ink} size={18} /></Row></MotionPressable>
    </Card>

    <View style={{ gap: 12 }}><Row><Text style={s.section}>Quick check-in</Text><Text style={[ui.muted, { fontSize: 11 }]}>MAKE IT A HABIT</Text></Row>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{([{ mode: 'meal', label: 'Meal', icon: 'meal', color: theme.nutrition }, { mode: 'workout', label: 'Workout', icon: 'workout', color: theme.accent }, { mode: 'water', label: 'Water', icon: 'water', color: theme.hydration }, { mode: 'weight', label: 'Weight', icon: 'weight', color: theme.secondary }, { mode: 'steps', label: 'Steps', icon: 'steps', color: theme.accent }] as const).map((item) => <MotionPressable key={item.mode} onPress={() => log(item.mode)} style={{ flex: 1, minWidth: 48, minHeight: 78, borderRadius: 18, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.line }}><Icon name={item.icon} color={item.color} size={22} /><Text style={{ color: theme.text, fontSize: 11, fontWeight: '700', marginTop: 9 }}>{item.label}</Text></MotionPressable>)}</View>
    </View>

    <Row><Text style={s.section}>Daily balance</Text><Text style={[ui.muted, { fontSize: 11 }]}>{meals.length} meals logged</Text></Row>
    <Card><Row><View style={{ flex: 1, gap: 5 }}><Text style={ui.label}>ENERGY INTAKE</Text><Text style={{ color: theme.text, fontSize: 34, fontFamily: theme.font, letterSpacing: -2 }}>{Math.round(calories).toLocaleString()}</Text><Text style={{ color: theme.muted, fontSize: 12 }}>kcal{targets ? ` / ${targets.calories.toLocaleString()} guide` : ' today'}</Text><Text style={{ color: theme.accent, fontSize: 12, lineHeight: 18, marginTop: 6 }}>{targets ? calories > targets.calories ? `${Math.round(calories - targets.calories).toLocaleString()} kcal above guide` : `${Math.round(targets.calories - calories).toLocaleString()} kcal to guide` : 'Personal guide not set'}</Text></View><Orbit size={112} value={calories} max={targets?.calories || 0} /></Row><Text style={[ui.muted, { fontSize: 11 }]}>An intake guide, not a measured energy deficit.</Text></Card>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      <Metric icon="protein" label="Protein" value={`${Math.round(protein)} g`} guide={targets ? `of ${targets.protein} g guide` : 'No personal guide'} fraction={targets ? protein / targets.protein : 0} color={theme.nutrition} onPress={() => log('meal')} />
      <Metric icon="water" label="Hydration" value={`${(water / 1000).toFixed(1)} L`} guide={targets ? `of ${(targets.water / 1000).toFixed(1)} L drinks guide` : 'No personal guide'} fraction={targets ? water / targets.water : 0} color={theme.hydration} onPress={() => log('water')} />
      <Metric icon="steps" label="Steps" value={steps.toLocaleString()} guide={auth.plan?.stepsTarget ? `of ${auth.plan.stepsTarget.toLocaleString()} daily guide` : 'Manually logged'} fraction={auth.plan?.stepsTarget ? steps / auth.plan.stepsTarget : 0} color={theme.secondary} onPress={() => log('steps')} />
      <Metric icon="workout" label="Training" value={`${minutes} min`} guide={`${workouts.length} sessions logged today`} fraction={todayPlan?.minutes ? minutes / todayPlan.minutes : 0} color={theme.accent} onPress={() => log('workout')} />
    </View>
    <MotionPressable onPress={() => store.addWater(date, 250)} style={{ minHeight: 44, borderRadius: 14, borderWidth: 1, borderColor: theme.line }}><Row><Icon name="water" color={theme.hydration} size={17} /><Text style={{ color: theme.hydration, fontSize: 13, fontWeight: '700' }}>Quick add · 250 ml water</Text></Row></MotionPressable>

    <MotionPressable onPress={() => router.push('/chat')} style={{ width: '100%' }}><Card style={{ width: '100%' }}><Row><View style={s.coachIcon}><Icon name="sparkles" color={theme.secondary} size={23} /></View><View style={{ flex: 1, gap: 4 }}><Text style={{ color: theme.text, fontSize: 17, fontFamily: theme.font }}>A little guidance goes far.</Text><Text style={ui.muted}>Talk meals, training & goals with your AI coach.</Text></View><Icon name="arrow" color={theme.muted} size={17} /></Row></Card></MotionPressable>
    <Row><Text style={s.section}>Today’s activity</Text><Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/(tabs)/history', params: { view: 'history' } })} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: theme.accent, fontSize: 12, fontWeight: '700' }}>See history ↗</Text></Pressable></Row>
    <Card>{recent.length ? recent.map((item) => <Row key={item.id}><View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: `${item.color}16`, alignItems: 'center', justifyContent: 'center' }}><Icon name={item.icon} color={item.color} size={18} /></View><View style={{ flex: 1, gap: 3 }}><Text style={{ color: theme.text, fontSize: 14, fontWeight: '700' }}>{item.title}</Text><Text style={[ui.muted, { fontSize: 11 }]}>{item.detail}</Text></View></Row>) : <><Text style={{ color: theme.text, fontSize: 15, fontWeight: '700' }}>A fresh page for today.</Text><Text style={ui.muted}>Your meals and workouts will show up here as you log them. Start with a quick check-in above.</Text></>}</Card>
    <Card><Text style={s.section}>Macro breakdown</Text><MacroBreakdown amounts={macroTotals(meals)} targets={targets} /></Card>
  </Page>;
}
const s = StyleSheet.create({
  section: { color: theme.text, fontSize: 19, fontFamily: theme.font, letterSpacing: -.5, flex: 1 },
  workoutTitle: { color: theme.text, fontSize: 28, lineHeight: 33, fontFamily: theme.font, letterSpacing: -1 },
  pill: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: theme.accentSoft },
  pillText: { color: theme.accent, fontSize: 9, fontFamily: theme.font, letterSpacing: .8 },
  workoutIcon: { width: 70, height: 70, borderRadius: 22, backgroundColor: theme.accentSoft, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-12deg' }] },
  primary: { minHeight: 52, borderRadius: 16, backgroundColor: theme.accent, marginTop: 6 },
  primaryText: { color: theme.ink, fontFamily: theme.font, fontSize: 14 },
  coachIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: theme.accentSoft, alignItems: 'center', justifyContent: 'center' },
});
