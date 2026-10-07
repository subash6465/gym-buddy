import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import BirthDatePicker from '@/components/BirthDatePicker';
import { Button, Card, Input, Label, Page, Row, Title, ui } from '@/components/UI';
import { Goal, useStore } from '@/lib/store';
import { ageOnDate, suggestedTargets } from '@/lib/targets';
import { useClock } from '@/lib/clock';
import { theme } from '@/lib/theme';

function Choice<T extends string>({ options, value, onChange }: { options: readonly (readonly [T, string])[]; value: T; onChange: (value: T) => void }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{options.map(([option, label]) => <Pressable key={option} onPress={() => onChange(option)} style={{ paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, backgroundColor: value === option ? theme.accent : theme.cardAlt }}><Text style={{ color: value === option ? theme.bg : theme.text, fontWeight: '800' }}>{label}</Text></Pressable>)}</View>;
}
export default function ProfileScreen() {
  const store = useStore();
  const { profile } = store;
  const [showHistory, setShowHistory] = useState(false);
  const now = useClock();
  const latest = store.weighIns[0];
  const age = ageOnDate(profile.dob, now);
  const targets = suggestedTargets(profile, latest?.kg, now);
  const height = Number(profile.heightCm);
  const bmi = latest && height > 0 ? latest.kg / ((height / 100) ** 2) : null;
  return <Page>
    <Title eyebrow="MAKE IT YOURS" subtitle="Your details stay on this device in the first version.">Your journey</Title>
    <Card><Text style={{ color: theme.text, fontSize: 20, fontWeight: '800' }}>About you</Text>
      <Label>NAME</Label><Input value={profile.name} onChangeText={(name) => store.updateProfile({ name })} placeholder="Your name" />
      <Label>DATE OF BIRTH</Label><BirthDatePicker value={profile.dob} onChange={(dob) => store.updateProfile({ dob })} />
      <Text style={ui.muted}>{age === null ? 'Select your birth date; your age will update automatically.' : `Age today: ${age} years. This updates on each birthday.`}</Text>
      <Label>HEIGHT (CM)</Label><Input value={profile.heightCm} onChangeText={(heightCm) => store.updateProfile({ heightCm })} keyboardType="decimal-pad" placeholder="Centimetres" />
      {latest ? <Text style={ui.muted}>Latest weight: {latest.kg} kg{bmi ? ` · BMI ${bmi.toFixed(1)}` : ''}. BMI is a screening measure, not a calorie calculator.</Text> : <Text style={ui.muted}>Log your current weight on the Log tab to calculate suggested targets.</Text>}
    </Card>
    <Card><Text style={{ color: theme.text, fontSize: 20, fontWeight: '800' }}>Your direction</Text>
      <Label>GOAL</Label><Choice options={[["lose", "Lose weight"], ["gain", "Gain weight"], ["maintain", "Maintain"]] as const} value={profile.goal} onChange={(goal: Goal) => store.updateProfile({ goal })} />
      <Label>WORKOUT LOCATION</Label><Choice options={[["gym", "Gym"], ["home", "Home"]] as const} value={profile.setting} onChange={(setting) => store.updateProfile({ setting })} />
      <Label>USUAL ACTIVITY</Label><Choice options={[["sedentary", "Mostly seated"], ["light", "Light"], ["moderate", "Moderate"], ["high", "Very active"]] as const} value={profile.activity} onChange={(activity) => store.updateProfile({ activity })} />
      <Text style={ui.muted}>Include your usual exercise when choosing an activity level. The estimate changes as your activity changes.</Text>
      <Label>METABOLIC EQUATION REFERENCE</Label><Choice options={[["female", "Female equation"], ["male", "Male equation"], ["", "Skip"]] as const} value={profile.equation} onChange={(equation) => store.updateProfile({ equation })} />
      <Text style={ui.muted}>The published equation has female and male versions. Choose the one appropriate for your physiology or skip automatic estimates. This is separate from gender identity.</Text>
      <Pressable onPress={() => store.updateProfile({ nutritionCaution: !profile.nutritionCaution })} style={{ padding: 14, backgroundColor: profile.nutritionCaution ? '#493A31' : theme.cardAlt, borderRadius: 12 }}><Text style={{ color: theme.text, fontWeight: '700' }}>{profile.nutritionCaution ? '☑' : '□'} Pregnancy, breastfeeding, or a condition needing a special diet</Text></Pressable>
    </Card>
    <Card style={{ backgroundColor: '#20352B', borderColor: '#385140' }}><Text style={{ color: theme.accent, fontWeight: '800' }}>SUGGESTED DAILY TARGETS</Text>
      {targets ? <><Text style={{ color: theme.text, fontSize: 27, fontWeight: '800' }}>{targets.calories} kcal</Text><Text style={{ color: theme.text, fontSize: 18, fontWeight: '700' }}>{targets.protein} g protein · {targets.water} ml drinks</Text><Text style={ui.muted}>Estimated maintenance: {targets.maintenance} kcal. Goal adjustment: {profile.goal === 'lose' ? 'about −300 kcal' : profile.goal === 'gain' ? 'about +200 kcal' : 'none'}. Protein guide: {targets.proteinFactor} g/kg.</Text><Text style={ui.muted}>Water is a starting drinks target; food also supplies water. Heat, exercise, illness and medical conditions can change your needs. These are estimates, not prescriptions.</Text></> : <Text style={ui.muted}>Enter a valid birth date (age 20+), height, current weight, and equation reference to see estimates. Automatic targets are paused when special dietary care is selected or when weight loss is selected at a low BMI.</Text>}
    </Card>
    <Card><Text style={{ color: theme.text, fontSize: 20, fontWeight: '800' }}>Preferences & care</Text><Label>ALLERGIES OR FOODS TO AVOID</Label><Input value={profile.allergies} onChangeText={(allergies) => store.updateProfile({ allergies })} placeholder="e.g. peanuts, dairy" multiline /><Label>INJURIES, PAIN OR OTHER CONCERNS</Label><Input value={profile.concerns} onChangeText={(concerns) => store.updateProfile({ concerns })} placeholder="Anything your plan should consider" multiline style={{ minHeight: 72, textAlignVertical: 'top' }} /><Text style={ui.muted}>Seek qualified guidance for injuries, symptoms, or dietary restrictions needing medical care.</Text></Card>
    <Button secondary onPress={() => setShowHistory(!showHistory)}>{showHistory ? 'Hide' : 'Show'} log history</Button>
    {showHistory && <Card><Text style={{ color: theme.text, fontSize: 20, fontWeight: '800' }}>Log history</Text>
      {store.meals.length + store.workouts.length + store.weighIns.length === 0 ? <Text style={ui.muted}>No entries yet.</Text> : null}
      {store.meals.map((meal) => <Row key={meal.id}><View style={{ flex: 1 }}><Text style={{ color: theme.text, fontWeight: '700' }}>{meal.name}</Text><Text style={ui.muted}>{meal.date} · {meal.time} · {meal.type} · {meal.calories} kcal</Text></View><Pressable onPress={() => Alert.alert('Delete meal?', meal.name, [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: () => store.removeMeal(meal.id) }])}><Text style={{ color: theme.red }}>Delete</Text></Pressable></Row>)}
      {store.workouts.map((workout) => <Row key={workout.id}><View style={{ flex: 1 }}><Text style={{ color: theme.text, fontWeight: '700' }}>{workout.name}</Text><Text style={ui.muted}>{workout.date} · {workout.minutes} min</Text></View><Pressable onPress={() => Alert.alert('Delete workout?', workout.name, [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: () => store.removeWorkout(workout.id) }])}><Text style={{ color: theme.red }}>Delete</Text></Pressable></Row>)}
      {store.weighIns.map((entry) => <Text key={entry.id} style={ui.muted}>{entry.date} · {entry.kg} kg</Text>)}
    </Card>}
  </Page>;
}
