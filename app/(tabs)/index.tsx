import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Button, Card, Meter, Page, Row, Title, ui } from '@/components/UI';
import { today, useStore } from '@/lib/store';
import { useClock } from '@/lib/clock';
import { suggestedTargets } from '@/lib/targets';
import { theme } from '@/lib/theme';

const sum = (items: any[], key: string) => items.reduce((total, item) => total + (Number(item[key]) || 0), 0);
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
  return <Page>
    <Title eyebrow="YOUR DAILY COMPANION" subtitle={now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}>Hey{firstName ? `, ${firstName}` : ''} 👋</Title>
    <Card style={{ backgroundColor: '#20352B', borderColor: '#385140' }}>
      <Text style={{ color: theme.accent, fontWeight: '800', fontSize: 12, letterSpacing: 1 }}>TODAY AT A GLANCE</Text>
      <Text style={{ color: theme.text, fontSize: 25, fontWeight: '800' }}>{meals.length ? 'Keep your momentum.' : 'A fresh start today.'}</Text>
      <Text style={ui.muted}>{meals.length ? `${meals.length} meal${meals.length === 1 ? '' : 's'} logged · ${workouts.length} workout${workouts.length === 1 ? '' : 's'} completed` : 'Log your first meal or workout to see your progress.'}</Text>
      <Button onPress={() => router.push('/(tabs)/log')}>+ Add an activity</Button>
    </Card>
    <Row><Text style={{ color: theme.text, fontSize: 20, fontWeight: '800', flex: 1 }}>Daily targets</Text><Text style={ui.muted}>Set in You</Text></Row>
    <Card>
    <Row><Text style={{ color: theme.text, fontSize: 18, fontWeight: '800', flex: 1 }}>Calories</Text><Text style={{ color: theme.accent, fontWeight: '800' }}>{Math.round(calories)} / {targets ? targets.calories : '—'} kcal</Text></Row>
      <Meter value={calories} max={targets?.calories || 0} />
      <Row><Text style={{ color: theme.text, flex: 1 }}>Protein</Text><Text style={{ color: theme.text }}>{Math.round(protein)} / {targets ? targets.protein : '—'} g</Text></Row>
      <Meter value={protein} max={targets?.protein || 0} color={theme.orange} />
      <Row><Text style={{ color: theme.text, flex: 1 }}>Water</Text><Text style={{ color: theme.text }}>{water} / {targets ? targets.water : '—'} ml</Text></Row>
      <Meter value={water} max={targets?.water || 0} color="#7BC9ED" />
      {!targets && <Text style={ui.muted}>Complete your details and log a current weight in You to see estimated targets.</Text>}
      <Button secondary onPress={() => store.addWater(date, 250)}>+ 250 ml water</Button>
    </Card>
    <Row><Text style={{ color: theme.text, fontSize: 20, fontWeight: '800' }}>Nutrition details</Text></Row>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {([['Carbs', 'carbs'], ['Fat', 'fat'], ['Fibre', 'fibre'], ['Sugar', 'sugar']] as const).map(([label, key]) => <Card key={key} style={{ width: '48%', flexGrow: 1 }}><Text style={ui.muted}>{label}</Text><Text style={{ color: theme.text, fontSize: 24, fontWeight: '800' }}>{Math.round(sum(meals, key))}<Text style={{ fontSize: 13, color: theme.muted }}> g</Text></Text></Card>)}
    </View>
    <Text style={{ color: theme.text, fontSize: 20, fontWeight: '800' }}>Recent activity</Text>
    {meals.length === 0 && workouts.length === 0 ? <Card><Text style={ui.muted}>Your meals and workouts will appear here after you log them.</Text></Card> : [...meals.map((item) => ({ id: item.id, title: item.name, detail: `${Math.round(item.calories)} kcal · ${Math.round(item.protein)} g protein`, kind: 'Meal' })), ...workouts.map((item) => ({ id: item.id, title: item.name, detail: `${item.minutes} min`, kind: 'Workout' }))].slice(0, 5).map((item) => <Card key={item.id}><Row><View style={{ flex: 1 }}><Text style={{ color: theme.accent, fontSize: 11, fontWeight: '800' }}>{item.kind.toUpperCase()}</Text><Text style={{ color: theme.text, fontSize: 16, fontWeight: '700' }}>{item.title}</Text></View><Text style={ui.muted}>{item.detail}</Text></Row></Card>)}
  </Page>;
}
