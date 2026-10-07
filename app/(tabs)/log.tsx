import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Image, Pressable, Text, View } from 'react-native';
import { Button, Card, Input, Label, Page, Row, Title, ui } from '@/components/UI';
import { today, useStore } from '@/lib/store';
import { theme } from '@/lib/theme';

type Mode = 'meal' | 'workout' | 'weight';
const number = (value: string) => Number(value || 0);
export default function Log() {
  const store = useStore();
  const [mode, setMode] = useState<Mode>('meal');
  const [photo, setPhoto] = useState<string | null>(null);
  const [name, setName] = useState(''); const [note, setNote] = useState('');
  const [calories, setCalories] = useState(''); const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState(''); const [fat, setFat] = useState('');
  const [fibre, setFibre] = useState(''); const [sugar, setSugar] = useState('');
  const [minutes, setMinutes] = useState(''); const [weight, setWeight] = useState('');
  async function pickPhoto(camera: boolean) {
    if (camera) {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) { Alert.alert('Camera permission needed', 'Allow camera access to photograph a meal.'); return; }
    }
    const result = camera ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: .7 }) : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: .7 });
    if (!result.canceled) setPhoto(result.assets[0].uri);
  }
  function save() {
    if (mode === 'weight') {
      if (!Number.isFinite(number(weight)) || number(weight) <= 0) return Alert.alert('Enter your weight', 'Use a weight in kilograms greater than zero.');
      store.addWeighIn(number(weight)); setWeight(''); Alert.alert('Saved', 'Your weigh-in has been logged.'); return;
    }
    if (!name.trim()) return Alert.alert('Add a name', mode === 'meal' ? 'Name the food or meal.' : 'Name the exercise or workout.');
    if (mode === 'workout') {
      if (!Number.isFinite(number(minutes)) || number(minutes) <= 0) return Alert.alert('Add duration', 'Enter your workout duration in minutes.');
      store.addWorkout({ date: today(), name: name.trim(), minutes: number(minutes), note: note.trim() });
      setName(''); setNote(''); setMinutes(''); Alert.alert('Workout logged', 'Nice work showing up today.'); return;
    }
    const fields = [calories, protein, carbs, fat, fibre, sugar];
    if (fields.some((field) => field !== '' && (!Number.isFinite(number(field)) || number(field) < 0))) return Alert.alert('Check nutrition values', 'Use zero or a positive number for each nutrient.');
    if (!calories.trim()) return Alert.alert('Add calories', 'Enter an estimate from a label, recipe, or food database before saving.');
    store.addMeal({ date: today(), name: name.trim(), note: note.trim(), calories: number(calories), protein: number(protein), carbs: number(carbs), fat: number(fat), fibre: number(fibre), sugar: number(sugar) });
    setName(''); setNote(''); setCalories(''); setProtein(''); setCarbs(''); setFat(''); setFibre(''); setSugar(''); setPhoto(null);
    Alert.alert('Meal logged', 'Your daily totals have been updated.');
  }
  return <Page>
    <Title eyebrow="BUILD THE HABIT" subtitle="A few quick entries make your progress visible.">Log activity</Title>
    <Row>{(['meal', 'workout', 'weight'] as const).map((option) => <Pressable key={option} onPress={() => { setMode(option); setName(''); setNote(''); }} style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 13, backgroundColor: mode === option ? theme.accent : theme.card }}><Text style={{ color: mode === option ? theme.bg : theme.text, fontWeight: '800', textTransform: 'capitalize' }}>{option}</Text></Pressable>)}</Row>
    {mode === 'meal' && <Card>
      <Text style={{ color: theme.text, fontSize: 20, fontWeight: '800' }}>Meal photo</Text>
      <Text style={ui.muted}>Take a photo or choose one, then describe the portion and ingredients. Photo analysis is planned for the next build; nutrient values are entered by you for now.</Text>
      <Row><View style={{ flex: 1 }}><Button secondary onPress={() => pickPhoto(true)}>Take photo</Button></View><View style={{ flex: 1 }}><Button secondary onPress={() => pickPhoto(false)}>Choose photo</Button></View></Row>
      {photo && <Image source={{ uri: photo }} style={{ width: '100%', height: 190, borderRadius: 14 }} />}
    </Card>}
    <Card>
      {mode === 'weight' ? <><Text style={{ color: theme.text, fontSize: 20, fontWeight: '800' }}>Weight check-in</Text><Label>WEIGHT (KG)</Label><Input value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="e.g. 72.5" /></> : <>
        <Text style={{ color: theme.text, fontSize: 20, fontWeight: '800' }}>{mode === 'meal' ? 'Meal details' : 'Workout details'}</Text>
        <Label>{mode === 'meal' ? 'FOOD OR MEAL' : 'ACTIVITY'}</Label><Input value={name} onChangeText={setName} placeholder={mode === 'meal' ? 'e.g. rice, dal and vegetables' : 'e.g. strength training'} />
        <Label>{mode === 'meal' ? 'PORTION, INGREDIENTS OR NOTES' : 'EXERCISES OR NOTES'}</Label><Input value={note} onChangeText={setNote} multiline placeholder={mode === 'meal' ? 'e.g. 1 cup rice, 1 bowl dal; cooked with oil' : 'e.g. squats, rows and presses'} style={{ minHeight: 78, textAlignVertical: 'top' }} />
        {mode === 'workout' ? <><Label>DURATION (MINUTES)</Label><Input value={minutes} onChangeText={setMinutes} keyboardType="number-pad" placeholder="e.g. 45" /></> : <>
          <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>Nutrition estimate</Text>
          <Text style={ui.muted}>Use a food label or trusted food database. Blank nutrients count as zero.</Text>
          {([['Calories (kcal)', calories, setCalories], ['Protein (g)', protein, setProtein], ['Carbs (g)', carbs, setCarbs], ['Fat (g)', fat, setFat], ['Fibre (g)', fibre, setFibre], ['Sugar (g)', sugar, setSugar]] as const).map(([label, value, setter]) => <View key={label} style={{ gap: 6 }}><Label>{label.toUpperCase()}</Label><Input value={value} onChangeText={setter} keyboardType="decimal-pad" placeholder="0" /></View>)}
        </>}
      </>}
      <Button onPress={save}>Save {mode}</Button>
    </Card>
  </Page>;
}
