import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Text, View } from 'react-native';
import DaySelector from '@/components/DaySelector';
import MealTimePicker from '@/components/MealTimePicker';
import { Button, Card, Icon, Input, Label, MotionPressable, Page, Reveal, Row, Title, ui } from '@/components/UI';
import type { MealEstimate } from '@/lib/mealEstimate';
import { useAuth } from '@/lib/auth';
import { Meal, today, useStore } from '@/lib/store';
import { theme } from '@/lib/theme';
import { parseDay } from '@/lib/dates';

type Mode = 'meal' | 'workout' | 'weight' | 'water' | 'steps';
const clockTime = () => { const date = new Date(); return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`; };

export default function Log() {
  const store = useStore();
  const auth = useAuth();
  const params = useLocalSearchParams<{ date?: string }>();
  const [dateOverride, setDateOverride] = useState<{ param?: string; date: string } | null>(null);
  const routedDate = typeof params.date === 'string' && parseDay(params.date) && params.date <= today() ? params.date : today();
  const date = dateOverride && dateOverride.param === params.date ? dateOverride.date : routedDate;
  const setDate = (next: string) => setDateOverride({ param: params.date, date: next });
  const [mode, setMode] = useState<Mode>('meal');
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [mealType, setMealType] = useState<Meal['type']>('breakfast');
  const [mealTime, setMealTime] = useState(clockTime());
  const [workoutTime, setWorkoutTime] = useState(clockTime());
  const [estimate, setEstimate] = useState<MealEstimate | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState(''); const [note, setNote] = useState('');
  const [minutes, setMinutes] = useState(''); const [weight, setWeight] = useState(''); const [water, setWater] = useState(''); const [steps, setSteps] = useState('');
  const existing = mealType !== 'snack' ? store.meals.find((meal) => meal.date === date && meal.type === mealType) : null;

  async function pickPhoto(camera: boolean) {
    if (camera) {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) { Alert.alert('Camera permission needed', 'Allow camera access to photograph a meal.'); return; }
    }
    const result = camera ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: .6, base64: true }) : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: .6, base64: true });
    if (!result.canceled) {
      const asset = result.assets[0];
      setPhoto(asset.uri); setPhotoData(asset.base64 ? `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}` : null);
      setEstimate(null); setError(asset.base64 ? '' : 'The photo could not be read. Try another image.');
    }
  }
  async function analyze() {
    if (!description.trim() && !photoData) return setError('Describe the food or add a photo first.');
    setEstimating(true); setError(''); setEstimate(null);
    try { setEstimate(await auth.estimateMeal(description.trim(), photoData)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'AI estimate failed.'); }
    finally { setEstimating(false); }
  }
  function saveMeal() {
    if (!estimate) return;
    store.addMeal({ date, time: mealTime, type: mealType, name: estimate.name, note: `${description.trim()}${estimate.assumptions ? ` · Assumptions: ${estimate.assumptions}` : ''}`, calories: estimate.calories, protein: estimate.protein, carbs: estimate.carbs, fat: estimate.fat, fibre: estimate.fibre, sugar: estimate.sugar });
    setDescription(''); setPhoto(null); setPhotoData(null); setEstimate(null); setMealTime(clockTime()); setError('');
    Alert.alert('Meal saved', `Logged for ${date} at ${mealTime}.`);
  }
  function saveOther() {
    if (mode === 'weight') {
      const kg = Number(weight);
      if (!Number.isFinite(kg) || kg <= 0 || kg > 500) return Alert.alert('Check weight', 'Enter a weight in kilograms.');
      store.addWeighIn(date, kg); setWeight(''); Alert.alert('Saved', `Your weigh-in was logged for ${date}.`); return;
    }
    if (mode === 'water') {
      const ml = Number(water);
      if (!Number.isFinite(ml) || ml <= 0 || ml > 5000) return Alert.alert('Check water', 'Enter an amount in millilitres.');
      store.addWater(date, ml); setWater(''); Alert.alert('Saved', `Your water was logged for ${date}.`); return;
    }
    if (mode === 'steps') {
      const count = Number(steps);
      if (!Number.isInteger(count) || count <= 0 || count > 100000) return Alert.alert('Check steps', 'Enter a valid number of steps.');
      store.addSteps(date, count); setSteps(''); Alert.alert('Saved', `Your steps were logged for ${date}.`); return;
    }
    const duration = Number(minutes);
    if (!name.trim() || !Number.isFinite(duration) || duration <= 0 || duration > 1440) return Alert.alert('Check workout', 'Enter an activity and its duration in minutes.');
    store.addWorkout({ date, time: workoutTime, name: name.trim(), minutes: duration, note: note.trim() });
    setName(''); setNote(''); setMinutes(''); setWorkoutTime(clockTime()); Alert.alert('Workout logged', 'Nice work showing up today.');
  }

  return <Page>
    <Title eyebrow="BUILD THE HABIT" subtitle="Capture the details that help you grow.">Log it. Keep moving.</Title>
    <Card><Text style={{ color: theme.text, fontWeight: '800', fontSize: 16 }}>Log for a day</Text><DaySelector value={date} onChange={setDate} /><Text style={ui.muted}>Choose any past day to fill a gap. Existing entries can be corrected in History.</Text></Card>
    <View style={{ flexDirection: 'row', gap: 5, padding: 5, borderRadius: 16, backgroundColor: theme.cardAlt, borderWidth: 1, borderColor: theme.line }}>
      {(['meal', 'workout', 'weight', 'water', 'steps'] as const).map((option) =>
        <MotionPressable key={option} onPress={() => setMode(option)} accessibilityState={{ selected: mode === option }}
          style={{ flex: 1, minHeight: 40, borderRadius: 12, backgroundColor: mode === option ? theme.accent : 'transparent' }}>
          <Text style={{ color: mode === option ? theme.ink : theme.muted, fontWeight: '800', fontSize: 11, textTransform: 'capitalize' }}>{option}</Text>
        </MotionPressable>)}
    </View>
    {mode === 'meal' ? <Reveal key="meal" style={{ gap: 18 }}>
      <Card>
        <Text style={{ color: theme.text, fontSize: 19, fontWeight: '800' }}>What did you eat?</Text>
        <Label>MEAL</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
          {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) =>
            <MotionPressable key={type} onPress={() => { setMealType(type); setEstimate(null); }} accessibilityState={{ selected: mealType === type }}
              style={{ paddingHorizontal: 12, paddingVertical: 9, borderRadius: 11, backgroundColor: mealType === type ? 'rgba(118,240,219,0.17)' : theme.cardAlt, borderWidth: 1, borderColor: mealType === type ? 'rgba(118,240,219,0.55)' : theme.line }}>
              <Text style={{ color: mealType === type ? theme.accent : theme.text, fontWeight: '800', fontSize: 11, textTransform: 'capitalize' }}>{type}</Text>
            </MotionPressable>)}
        </View>
        {existing && <Text style={{ color: theme.orange, fontSize: 12 }}>Saving another {mealType} for {date} will replace the current entry. Snacks can be added more than once.</Text>}
        <Label>TIME</Label><MealTimePicker value={mealTime} onChange={setMealTime} />
        <Label>FOOD AND PORTION</Label>
        <Input value={description} onChangeText={(value) => { setDescription(value); setEstimate(null); }} multiline placeholder="e.g. 2 chapatis (80 g), dal (150 g), paneer (100 g), oil (1 tsp)" style={{ minHeight: 94, textAlignVertical: 'top' }} />
        <Text style={[ui.muted, { fontSize: 11 }]}>For a more accurate estimate, list each food with its weight in grams, plus oils, sauces, and drinks. If you do not know the weight, give the portion size.</Text>
        <Row><View style={{ flex: 1 }}><Button secondary onPress={() => pickPhoto(true)}>Take photo</Button></View><View style={{ flex: 1 }}><Button secondary onPress={() => pickPhoto(false)}>Choose photo</Button></View></Row>
        {photo && <Image source={{ uri: photo }} style={{ width: '100%', height: 170, borderRadius: 13 }} />}
        <Row><Icon name="camera" color={theme.accent} size={17} /><Text style={[ui.muted, { flex: 1, fontSize: 11 }]}>Photo is optional. Only the submitted photo and description go to the AI service.</Text></Row>
      </Card>
      <Button onPress={analyze} disabled={estimating}>{estimating ? 'Estimating…' : estimate ? 'Estimate again' : 'Estimate nutrition with AI'}</Button>
      {error ? <Reveal><Card><Text style={{ color: theme.red }}>{error}</Text></Card></Reveal> : null}
      {estimate && <Reveal><Card style={{ backgroundColor: 'rgba(45,104,106,0.28)', borderColor: 'rgba(118,240,219,0.3)' }}>
        <Row><Icon name="sparkles" color={theme.accent} size={19} /><Text style={{ color: theme.accent, fontWeight: '800', fontSize: 10, letterSpacing: 1 }}>AI ESTIMATE · REVIEW BEFORE SAVING</Text></Row>
        <Text style={{ color: theme.text, fontSize: 20, fontWeight: '800' }}>{estimate.name}</Text>
        <Text style={{ color: theme.text, fontSize: 27, fontWeight: '800' }}>~{Math.round(estimate.calories)} kcal</Text>
        <Text style={{ color: theme.text }}>Protein {Math.round(estimate.protein)} g · Carbs {Math.round(estimate.carbs)} g · Fat {Math.round(estimate.fat)} g</Text>
        <Text style={ui.muted}>Fibre {Math.round(estimate.fibre)} g · Sugar {Math.round(estimate.sugar)} g</Text>
        <Text style={ui.muted}>Assumptions: {estimate.assumptions}</Text>
        <Text style={[ui.muted, { fontSize: 11 }]}>Check the estimate. Add missing ingredients or portions and estimate again. Do not use a photo estimate to verify allergens.</Text>
        <Button onPress={saveMeal}>{existing ? `Replace ${mealType}` : 'Save meal'}</Button>
      </Card></Reveal>}
    </Reveal> : <Reveal key={mode}><Card>
      <Text style={{ color: theme.text, fontSize: 19, fontWeight: '800' }}>{mode === 'weight' ? 'Weight check-in' : mode === 'water' ? 'Hydration check-in' : mode === 'steps' ? 'Steps check-in' : 'Workout details'}</Text>
      {mode === 'weight' ? <><Label>WEIGHT (KG)</Label><Input value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="e.g. 72.5" /></> :
        mode === 'water' ? <><Label>AMOUNT (ML)</Label><Input value={water} onChangeText={setWater} keyboardType="number-pad" placeholder="e.g. 250" /></> :
        mode === 'steps' ? <><Label>STEPS</Label><Input value={steps} onChangeText={setSteps} keyboardType="number-pad" placeholder="e.g. 3200" /></> :
          <><Label>ACTIVITY</Label><Input value={name} onChangeText={setName} placeholder="e.g. strength training" /><Label>EXERCISES OR NOTES</Label><Input value={note} onChangeText={setNote} multiline placeholder="e.g. squats, rows and presses" style={{ minHeight: 78, textAlignVertical: 'top' }} /><Label>START TIME</Label><MealTimePicker value={workoutTime} onChange={setWorkoutTime} /><Label>DURATION (MINUTES)</Label><Input value={minutes} onChangeText={setMinutes} keyboardType="number-pad" placeholder="e.g. 45" /></>}
      <Button onPress={saveOther}>Save {mode}</Button>
    </Card></Reveal>}
  </Page>;
}
