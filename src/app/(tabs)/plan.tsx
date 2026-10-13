import NutritionStatus from '@/components/NutritionStatus';
import { displayDatesInText } from '@/lib/dates';
import { planTargets } from '@/lib/targets';
import MacroBreakdown from '@/components/MacroBreakdown';
import { macroTotals } from '@/lib/macros';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button, Card, Disclosure, Icon, Page, Row, Title, ui } from '@/components/UI';
import { today, useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { useClock } from '@/lib/clock';
import { theme } from '@/lib/theme';

export default function Plan() {
  const store = useStore();
  const { profile } = store;
  const auth = useAuth();
  const { plan } = auth;
  const now = useClock();
  const todayIndex = (now.getDay() + 6) % 7;
  const [openDay, setOpenDay] = useState<number | null>(todayIndex);
  const goalLabel = { lose: 'Weight loss', gain: 'Weight gain', maintain: 'Maintenance' }[profile.goal];
  return <Page>
    <Title eyebrow="BUILT AROUND YOU" subtitle="A clear direction. A week that fits your life.">Your training blueprint.</Title>
    {plan ? <>
      <Card style={{ backgroundColor: theme.hero, borderColor: theme.heroLine }}>
        <Row><Icon name="workout" color={theme.accent} /><Text style={ui.eyebrow}>YOUR DIRECTION</Text></Row>
        <Text style={{ color: theme.text, fontSize: 29, fontFamily: theme.font, letterSpacing: -1 }}>{goalLabel}</Text>
        <Row><View style={{ flex: 1 }}><Text style={{ color: theme.accent, fontSize: 30, fontFamily: theme.font }}>{plan.recommendedDays}<Text style={{ color: theme.muted, fontSize: 13 }}> days / week</Text></Text></View><View style={{ borderWidth: 1, borderColor: theme.heroLine, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 }}><Text style={{ color: theme.accent, fontSize: 12, fontWeight: '700', textTransform: 'capitalize' }}>{plan.pace} pace</Text></View></Row>
        <Text style={ui.muted}>{displayDatesInText(plan.summary)}</Text>
      </Card>
      <View style={{ gap: 12 }}><Row><Text style={{ color: theme.text, fontSize: 20, fontFamily: theme.font, flex: 1 }}>Your week</Text><Text style={[ui.muted, { fontSize: 11 }]}>TAP A DAY TO EXPLORE</Text></Row>
        <View style={{ flexDirection: 'row', gap: 6 }}>{plan.days.map((day, index) => <Pressable key={day.day} accessibilityRole="button" accessibilityLabel={`${day.day}: ${day.title}`} accessibilityState={{ selected: openDay === index }} onPress={() => setOpenDay(index)} style={{ flex: 1, minHeight: 68, borderRadius: 14, justifyContent: 'center', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: index === todayIndex ? theme.heroLine : theme.line, backgroundColor: openDay === index ? theme.accent : theme.card }}><Text style={{ color: openDay === index ? theme.ink : theme.muted, fontSize: 11, fontWeight: '700' }}>{day.day.slice(0, 1)}</Text><View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: openDay === index ? theme.ink : day.isRest ? theme.muted : theme.accent }} /></Pressable>)}</View>
      </View>
      {plan.days.map((day, index) => <Card key={day.day} style={index === todayIndex ? { borderColor: theme.heroLine } : undefined}>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: openDay === index }} onPress={() => setOpenDay(openDay === index ? null : index)} style={{ minHeight: 54 }}><Row>
          <View style={{ width: 43, height: 43, borderRadius: 14, backgroundColor: day.isRest ? theme.cardAlt : theme.accentSoft, alignItems: 'center', justifyContent: 'center' }}><Icon name={day.isRest ? 'water' : 'workout'} color={day.isRest ? theme.hydration : theme.accent} size={21} /></View>
          <View style={{ flex: 1, gap: 4 }}><Text style={{ color: index === todayIndex ? theme.accent : theme.muted, fontSize: 10, fontFamily: theme.font, letterSpacing: .8 }}>{day.day.toUpperCase()}{index === todayIndex ? ' / TODAY' : ''} · {day.isRest ? 'RECOVERY' : `${day.minutes} MIN`}</Text><Text style={{ color: theme.text, fontSize: 17, fontFamily: theme.font }}>{day.title}</Text></View><Text style={{ color: theme.muted, fontSize: 22 }}>{openDay === index ? '−' : '+'}</Text>
        </Row></Pressable>
        {openDay === index ? <View style={{ gap: 13, paddingTop: 12, borderTopWidth: 1, borderColor: theme.line }}><Text style={ui.muted}>{displayDatesInText(day.focus)}</Text>{day.activities.map((activity, activityIndex) => <Row key={`${day.day}-${activityIndex}`}><Text style={{ color: theme.accent, fontSize: 11, fontFamily: theme.font, width: 22 }}>{String(activityIndex + 1).padStart(2, '0')}</Text><Text style={[ui.muted, { flex: 1, color: theme.text }]}>{displayDatesInText(activity)}</Text></Row>)}<Button secondary onPress={() => router.push({ pathname: '/(tabs)/log', params: { mode: 'workout', entry: String(Date.now()) } })}>Log a completed session</Button></View> : null}
      </Card>)}
      <NutritionStatus />
      <Disclosure title="Daily guides" subtitle="Nutrition, hydration & movement">
        {planTargets(profile, store.weighIns[0]?.kg, plan, now) ? <><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{[[plan.calorieTarget.toLocaleString(), 'kcal intake'], [plan.proteinGrams || 'Not set', 'g protein'], [plan.waterMl > 0 ? (plan.waterMl / 1000).toFixed(1) : 'Not set', 'L drinks'], [plan.stepsTarget.toLocaleString(), 'steps']].map(([value, label]) => <View key={label} style={{ width: '47%', flexGrow: 1, padding: 14, borderRadius: 16, backgroundColor: theme.cardAlt }}><Text style={{ color: theme.text, fontSize: 23, fontFamily: theme.font }}>{value}</Text><Text style={ui.muted}>{label}</Text></View>)}</View>{plan.maintenanceCalories > 0 ? <Text style={ui.muted}>Estimated maintenance {plan.maintenanceCalories.toLocaleString()} kcal · planned deficit {plan.deficitCalories.toLocaleString()} kcal</Text> : <Text style={ui.muted}>Clinician-provided intake guide entered by you.</Text>}</> : <Text style={ui.muted}>Personal calorie and drink goals are paused for this profile. Steps starting point: {plan.stepsTarget.toLocaleString()} per day.</Text>}
        <MacroBreakdown amounts={macroTotals(store.meals.filter((meal) => meal.date === today(now)))} targets={planTargets(profile, store.weighIns[0]?.kg, plan, now)} />
      </Disclosure>
      <Disclosure title="The thinking behind your plan" subtitle="Recommendations & adjustments"><Text style={ui.muted}>{displayDatesInText(plan.guidanceNote)}</Text><Text style={ui.muted}>{plan.requestedDays} training days requested · {plan.recommendedDays} recommended</Text><Text style={ui.muted}>{displayDatesInText(plan.suggestions)}</Text></Disclosure>
      <Card><Row><Icon name="sparkles" color={theme.secondary} /><Text style={{ color: theme.text, fontSize: 18, fontFamily: theme.font }}>Make it work for you.</Text></Row><Text style={ui.muted}>Schedule changed? Talk it through with your coach, then review and approve a revised plan.</Text><Button secondary onPress={() => router.push('/chat')}>Talk to your AI coach</Button></Card>
    </> : <Card><Icon name="plan" color={theme.accent} size={32} /><Text style={{ color: theme.text, fontSize: 20, fontFamily: theme.font }}>A plan with your name on it.</Text><Text style={ui.muted}>Generate a weekly plan from your saved profile and training preferences.</Text><Button onPress={() => router.push({ pathname: '/chat', params: { prompt: 'Create a complete training plan and personalized nutrition guides from my saved profile.' } })}>Generate a plan preview</Button></Card>}
  </Page>;
}
