import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Button, Card, Input, Label, Page, Row, Title, ui } from '@/components/UI';
import { Goal, useStore } from '@/lib/store';
import { theme } from '@/lib/theme';

export default function ProfileScreen() {
  const store = useStore();
  const { profile } = store;
  const [showHistory, setShowHistory] = useState(false);
  function setTarget(key: 'calorieTarget' | 'proteinTarget' | 'waterTarget', value: string) {
    const parsed = Number(value);
    if (value === '') store.updateProfile({ [key]: 0 });
    else if (Number.isFinite(parsed) && parsed >= 0) store.updateProfile({ [key]: parsed });
  }
  const latest = store.weighIns[0];
  const height = Number(profile.heightCm);
  const bmi = latest && height > 0 ? latest.kg / ((height / 100) ** 2) : null;
  return <Page>
    <Title eyebrow="MAKE IT YOURS" subtitle="Your details stay on this device in the first version.">Your journey</Title>
    <Card><Text style={{ color: theme.text, fontSize: 20, fontWeight: '800' }}>About you</Text>
      <Label>NAME</Label><Input value={profile.name} onChangeText={(name) => store.updateProfile({ name })} placeholder="Your name" />
      <Row><View style={{ flex: 1, gap: 7 }}><Label>AGE</Label><Input value={profile.age} onChangeText={(age) => store.updateProfile({ age })} keyboardType="number-pad" placeholder="Years" /></View><View style={{ flex: 1, gap: 7 }}><Label>HEIGHT (CM)</Label><Input value={profile.heightCm} onChangeText={(heightCm) => store.updateProfile({ heightCm })} keyboardType="decimal-pad" placeholder="Centimetres" /></View></Row>
      {latest ? <Text style={ui.muted}>Latest weight: {latest.kg} kg{bmi ? ` · BMI ${bmi.toFixed(1)}` : ''}. BMI is only one rough measure of body size.</Text> : <Text style={ui.muted}>Log a weight on the Log tab to track change over time.</Text>}
    </Card>
    <Card><Text style={{ color: theme.text, fontSize: 20, fontWeight: '800' }}>Your goal</Text>
      <Row>{([['lose', 'Lose'], ['gain', 'Gain'], ['maintain', 'Maintain']] as const).map(([value, label]) => <Pressable key={value} onPress={() => store.updateProfile({ goal: value as Goal })} style={{ flex: 1, alignItems: 'center', paddingVertical: 13, borderRadius: 12, backgroundColor: profile.goal === value ? theme.accent : theme.cardAlt }}><Text style={{ color: profile.goal === value ? theme.bg : theme.text, fontWeight: '800' }}>{label}</Text></Pressable>)}</Row>
      <Label>WORKOUT LOCATION</Label><Row>{(['gym', 'home'] as const).map((setting) => <View key={setting} style={{ flex: 1 }}><Button secondary={profile.setting !== setting} onPress={() => store.updateProfile({ setting })}>{setting === 'gym' ? 'Gym' : 'Home'}</Button></View>)}</Row>
      <Text style={ui.muted}>Targets start as placeholders. Adjust them to values suitable for you; the app does not calculate a clinical prescription.</Text>
      {([['Daily calories', 'calorieTarget', 'kcal'], ['Daily protein', 'proteinTarget', 'g'], ['Daily water', 'waterTarget', 'ml']] as const).map(([label, key, unit]) => <View key={key} style={{ gap: 6 }}><Label>{label.toUpperCase()} ({unit})</Label><Input value={String(profile[key] || '')} onChangeText={(value) => setTarget(key, value)} keyboardType="number-pad" placeholder="0" /></View>)}
    </Card>
    <Card><Text style={{ color: theme.text, fontSize: 20, fontWeight: '800' }}>Preferences & care</Text><Label>ALLERGIES OR FOODS TO AVOID</Label><Input value={profile.allergies} onChangeText={(allergies) => store.updateProfile({ allergies })} placeholder="e.g. peanuts, dairy" multiline /><Label>INJURIES, PAIN OR OTHER CONCERNS</Label><Input value={profile.concerns} onChangeText={(concerns) => store.updateProfile({ concerns })} placeholder="Anything your plan should consider" multiline style={{ minHeight: 72, textAlignVertical: 'top' }} /><Text style={ui.muted}>These notes are for planning context. Seek professional guidance for injuries, symptoms or dietary restrictions that need medical care.</Text></Card>
    <Button secondary onPress={() => setShowHistory(!showHistory)}>{showHistory ? 'Hide' : 'Show'} log history</Button>
    {showHistory && <Card><Text style={{ color: theme.text, fontSize: 20, fontWeight: '800' }}>Log history</Text>
      {store.meals.length + store.workouts.length + store.weighIns.length === 0 ? <Text style={ui.muted}>No entries yet.</Text> : null}
      {store.meals.map((meal) => <Row key={meal.id}><View style={{ flex: 1 }}><Text style={{ color: theme.text, fontWeight: '700' }}>{meal.name}</Text><Text style={ui.muted}>{meal.date} · {meal.calories} kcal</Text></View><Pressable onPress={() => Alert.alert('Delete meal?', meal.name, [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: () => store.removeMeal(meal.id) }])}><Text style={{ color: theme.red }}>Delete</Text></Pressable></Row>)}
      {store.workouts.map((workout) => <Row key={workout.id}><View style={{ flex: 1 }}><Text style={{ color: theme.text, fontWeight: '700' }}>{workout.name}</Text><Text style={ui.muted}>{workout.date} · {workout.minutes} min</Text></View><Pressable onPress={() => Alert.alert('Delete workout?', workout.name, [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: () => store.removeWorkout(workout.id) }])}><Text style={{ color: theme.red }}>Delete</Text></Pressable></Row>)}
      {store.weighIns.map((entry) => <Text key={entry.id} style={ui.muted}>{entry.date} · {entry.kg} kg</Text>)}
    </Card>}
  </Page>;
}
