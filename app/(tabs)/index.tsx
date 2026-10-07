import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Card, Icon, Meter, Orbit, Page, Row, Title, ui } from '@/components/UI';
import { Meal, today, useStore } from '@/lib/store';
import { useClock } from '@/lib/clock';
import { suggestedTargets } from '@/lib/targets';
import { theme } from '@/lib/theme';

const sum = (items: Meal[], key: 'calories' | 'protein' | 'carbs' | 'fat' | 'fibre' | 'sugar') =>
  items.reduce((total, item) => total + (Number(item[key]) || 0), 0);

function Metric({ icon, label, value, guide, fraction, color }: {
  icon: 'protein' | 'water'; label: string; value: string; guide: string; fraction: number; color: string;
}) {
  return <Card style={{ flex: 1, minWidth: 138, padding: 15 }}>
    <Row><Icon name={icon} color={color} size={17} /><Text style={{ color: theme.muted, fontSize: 12, fontWeight: '700' }}>{label}</Text></Row>
    <Text style={{ color: theme.text, fontSize: 24, fontWeight: '800', letterSpacing: -1 }}>{value}<Text style={{ color: theme.muted, fontSize: 12, fontWeight: '600' }}> {guide}</Text></Text>
    <Meter value={fraction} max={1} color={color} />
  </Card>;
}

export default function Today() {
  const store = useStore();
  const now = useClock();
  const date = today(now);
  const meals = store.meals.filter((item) => item.date === date);
  const workouts = store.workouts.filter((item) => item.date === date);
  const calories = sum(meals, 'calories');
  const protein = sum(meals, 'protein');
  const water = store.water[date] || 0;
  const targets = suggestedTargets(store.profile, store.weighIns[0]?.kg, now);
  const firstName = store.profile.name.trim().split(' ')[0];
  const recent = [
    ...meals.map((item) => ({ id: item.id, title: item.name, detail: `${Math.round(item.calories)} kcal · ${Math.round(item.protein)} g protein`, icon: 'meal' as const, kind: 'MEAL' })),
    ...workouts.map((item) => ({ id: item.id, title: item.name, detail: `${item.minutes} min`, icon: 'workout' as const, kind: 'WORKOUT' })),
  ].slice(0, 4);

  return <Page>
    <Title eyebrow={now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
      subtitle={firstName ? `Ready when you are, ${firstName}.` : 'A clear view of what you have done today.'}>
      Own your momentum.
    </Title>

    <Card style={{ backgroundColor: 'rgba(45,104,106,0.28)', borderColor: 'rgba(118,240,219,0.3)' }}>
      <Row><Text style={{ color: theme.text, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, flex: 1 }}>TODAY’S ENERGY</Text>
        <Text style={{ color: theme.accent, fontSize: 10, fontWeight: '800' }}>{targets ? 'DAILY GUIDE' : 'SET YOUR GUIDE'}</Text></Row>
      <Row>
        <Orbit value={calories} max={targets?.calories || 0} />
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={ui.muted}>Consumed</Text>
          <Text style={{ color: theme.text, fontSize: 29, fontWeight: '800', letterSpacing: -1.2 }}>{Math.round(calories).toLocaleString()}</Text>
          <Text style={{ color: theme.accent, fontSize: 12, fontWeight: '800' }}>kcal today</Text>
          <Text style={[ui.muted, { marginTop: 5, fontSize: 11, lineHeight: 17 }]}>
            {targets ? `${Math.max(0, targets.calories - Math.round(calories)).toLocaleString()} kcal until your ${targets.calories.toLocaleString()} kcal guide` : 'Add your details and a current weight in You to see an estimated guide.'}
          </Text>
        </View>
      </Row>
      <View style={{ borderTopWidth: 1, borderColor: theme.line, paddingTop: 12 }}>
        <Text style={ui.muted}>{meals.length} meal{meals.length === 1 ? '' : 's'} logged · {workouts.length} workout{workouts.length === 1 ? '' : 's'} completed today</Text>
      </View>
    </Card>

    <Row>
      <Metric icon="protein" label="Protein" value={`${Math.round(protein)} g`} guide={targets ? `/ ${targets.protein} g` : '/ —'} fraction={targets ? protein / targets.protein : 0} color={theme.orange} />
      <Metric icon="water" label="Water" value={`${(water / 1000).toFixed(2).replace(/0$/, '')} L`} guide={targets ? `/ ${(targets.water / 1000).toFixed(1)} L` : '/ —'} fraction={targets ? water / targets.water : 0} color={theme.blue} />
    </Row>
    <Pressable accessibilityRole="button" onPress={() => store.addWater(date, 250)}
      style={({ pressed }) => [{ alignSelf: 'flex-end', paddingVertical: 7, paddingHorizontal: 10 }, pressed && { opacity: .6 }]}>
      <Text style={{ color: theme.accent, fontSize: 12, fontWeight: '800' }}>+ Add 250 ml water</Text>
    </Pressable>

    <Row><Text style={{ color: theme.text, fontSize: 19, fontWeight: '800', flex: 1 }}>Your next move</Text>
      <Pressable onPress={() => router.push('/(tabs)/plan')} accessibilityRole="button"><Text style={{ color: theme.accent, fontWeight: '800', fontSize: 12 }}>Open plan ↗</Text></Pressable></Row>
    <Pressable onPress={() => router.push('/(tabs)/plan')} accessibilityRole="button">
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
        <View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: 'rgba(118,240,219,0.15)', alignItems: 'center', justifyContent: 'center' }}><Icon name="workout" color={theme.accent} size={23} /></View>
        <View style={{ flex: 1 }}><Text style={{ color: theme.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>DAY 1 · FULL BODY</Text>
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: '800', marginTop: 3 }}>Strength session</Text>
          <Text style={[ui.muted, { fontSize: 11 }]}>Squat · row · press · core</Text></View>
        <Icon name="arrow" color={theme.text} size={17} />
      </Card>
    </Pressable>

    <Row><Text style={{ color: theme.text, fontSize: 19, fontWeight: '800', flex: 1 }}>Recent activity</Text>
      <Pressable onPress={() => router.push('/(tabs)/log')} accessibilityRole="button"><Text style={{ color: theme.accent, fontWeight: '800', fontSize: 12 }}>Add new +</Text></Pressable></Row>
    {recent.length ? <Card>{recent.map((item) => <Row key={item.id}>
      <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: 'rgba(118,240,219,0.12)', alignItems: 'center', justifyContent: 'center' }}><Icon name={item.icon} color={theme.accent} size={17} /></View>
      <View style={{ flex: 1 }}><Text style={{ color: theme.text, fontSize: 13, fontWeight: '700' }}>{item.title}</Text><Text style={[ui.muted, { fontSize: 11 }]}>{item.kind} · {item.detail}</Text></View>
    </Row>)}</Card> : <Card><Text style={ui.muted}>Meals and workouts will appear here after you log them.</Text></Card>}

    {meals.length > 0 && <><Text style={{ color: theme.text, fontSize: 19, fontWeight: '800' }}>Nutrition details</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {([['Carbs', 'carbs'], ['Fat', 'fat'], ['Fibre', 'fibre'], ['Sugar', 'sugar']] as const).map(([label, key]) =>
          <Card key={key} style={{ width: '47%', flexGrow: 1, padding: 15 }}><Text style={ui.muted}>{label}</Text><Text style={{ color: theme.text, fontSize: 22, fontWeight: '800' }}>{Math.round(sum(meals, key))}<Text style={{ fontSize: 12, color: theme.muted }}> g</Text></Text></Card>)}
      </View>
    </>}
  </Page>;
}
