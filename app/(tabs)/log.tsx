import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Image, Pressable, Text, View } from 'react-native';
import MealTimePicker from '@/components/MealTimePicker';
import { Button, Card, Icon, Input, Label, Page, Row, Title, ui } from '@/components/UI';
import { estimateMeal, MealEstimate } from '@/lib/mealEstimate';
import { Meal, today, useStore } from '@/lib/store';
import { theme } from '@/lib/theme';

type Mode = 'meal' | 'workout' | 'weight' | 'water';
const clockTime = () => { const date = new Date(); return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`; };

export default function Log() {
  const store = useStore();
  const [mode, setMode] = useState<Mode>('meal');
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [mealType, setMealType] = useState<Meal['type']>('breakfast');
  const [mealTime, setMealTime] = useState(clockTime());
  const [estimate, setEstimate] = useState<MealEstimate | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState(''); const [note, setNote] = useState('');
  const [minutes, setMinutes] = useState(''); const [weight, setWeight] = useState(''); const [water, setWater] = useState('');
  const existing = mealType !== 'snack' ? store.meals.find((meal) => meal.date === today() && meal.type === mealType) : null;

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
    try { setEstimate(await estimateMeal(description.trim(), photoData)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'AI estimate failed.'); }
    finally { setEstimating(false); }
  }
  function saveMeal() {
    if (!estimate) return;
    store.addMeal({ date: today(), time: mealTime, type: mealType, name: estimate.name, note: `${description.trim()}${estimate.assumptions ? ` · Assumptions: ${estimate.assumptions}` : ''}`, calories: estimate.calories, protein: estimate.protein, carbs: estimate.carbs, fat: estimate.fat, fibre: estimate.fibre, sugar: estimate.sugar });
    setDescription(''); setPhoto(null); setPhotoData(null); setEstimate(null); setMealTime(clockTime()); setError('');
    Alert.alert('Meal saved', 'Your daily totals have been updated.');
  }
  function saveOther() {
    if (mode === 'weight') {
      const kg = Number(weight);
      if (!Number.isFinite(kg) || kg <= 0 || kg > 500) return Alert.alert('Check weight', 'Enter a weight in kilograms.');
      store.addWeighIn(kg); setWeight(''); Alert.alert('Saved', 'Your weigh-in has been logged.'); return;
    }
    if (mode === 'water') {
      const ml = Number(water);
      if (!Number.isFinite(ml) || ml <= 0 || ml > 5000) return Alert.alert('Check water', 'Enter an amount in millilitres.');
      store.addWater(today(), ml); setWater(''); Alert.alert('Saved', 'Your water has been logged.'); return;
    }
    const duration = Number(minutes);
    if (!name.trim() || !Number.isFinite(duration) || duration <= 0 || duration > 1440) return Alert.alert('Check workout', 'Enter an activity and its duration in minutes.');
    store.addWorkout({ date: today(), name: name.trim(), minutes: duration, note: note.trim() });
    setName(''); setNote(''); setMinutes(''); Alert.alert('Workout logged', 'Nice work showing up today.');
  }

  return <Page>
    <Title eyebrow="BUILD THE HABIT" subtitle="Capture the details that help you grow.">Log it. Keep moving.</Title>
    <View style={{ flexDirection: 'row', gap: 5, padding: 5, borderRadius: 16, backgroundColor: theme.cardAlt, borderWidth: 1, borderColor: theme.line }}>
      {(['meal', 'workout', 'weight', 'water'] as const).map((option) =>
        <Pressable key={option} onPress={() => setMode(option)} accessibilityRole="button" accessibilityState={{ selected: mode === option }}
          style={({ pressed }) => ({ flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: mode === option ? theme.accent : 'transparent', opacity: pressed ? .7 : 1 })}>
          <Text style={{ color: mode === option ? theme.ink : theme.muted, fontWeight: '800', fontSize: 11, textTransform: 'capitalize' }}>{option}</Text>
        </Pressable>)}
    </View>
    {mode === 'meal' ? <>
      <Card>
        <Text style={{ color: theme.text, fontSize: 19, fontWeight: '800' }}>What did you eat?</Text>
        <Label>MEAL</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
          {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) =>
            <Pressable key={type} onPress={() => { setMealType(type); setEstimate(null); }} accessibilityRole="button" accessibilityState={{ selected: mealType === type }}
              style={{ paddingHorizontal: 12, paddingVertical: 9, borderRadius: 11, backgroundColor: mealType === type ? 'rgba(118,240,219,0.17)' : theme.cardAlt, borderWidth: 1, borderColor: mealType === type ? 'rgba(118,240,219,0.55)' : theme.line }}>
              <Text style={{ color: mealType === type ? theme.accent : theme.text, fontWeight: '800', fontSize: 11, textTransform: 'capitalize' }}>{type}</Text>
            </Pressable>)}
        </View>
        {existing && <Text style={{ color: theme.orange, fontSize: 12 }}>Saving another {mealType} today will replace the current entry. Snacks can be added more than once.</Text>}
        <Label>TIME</Label><MealTimePicker value={mealTime} onChange={setMealTime} />
        <Label>FOOD AND PORTION</Label>
        <Input value={description} onChangeText={(value) => { setDescription(value); setEstimate(null); }} multiline placeholder="e.g. 2 chapatis, 1 bowl dal, paneer curry cooked with oil" style={{ minHeight: 94, textAlignVertical: 'top' }} />
        <Text style={[ui.muted, { fontSize: 11 }]}>Include serving size, ingredients, oil or sauces for a better estimate.</Text>
        <Row><View style={{ flex: 1 }}><Button secondary onPress={() => pickPhoto(true)}>Take photo</Button></View><View style={{ flex: 1 }}><Button secondary onPress={() => pickPhoto(false)}>Choose photo</Button></View></Row>
        {photo && <Image source={{ uri: photo }} style={{ width: '100%', height: 170, borderRadius: 13 }} />}
        <Row><Icon name="camera" color={theme.accent} size={17} /><Text style={[ui.muted, { flex: 1, fontSize: 11 }]}>Photo is optional. Only the submitted photo and description go to the AI service.</Text></Row>
      </Card>
      <Button onPress={analyze} disabled={estimating}>{estimating ? 'Estimating…' : estimate ? 'Estimate again' : 'Estimate nutrition with AI'}</Button>
      {error ? <Card><Text style={{ color: theme.red }}>{error}</Text></Card> : null}
      {estimate && <Card style={{ backgroundColor: 'rgba(45,104,106,0.28)', borderColor: 'rgba(118,240,219,0.3)' }}>
        <Row><Icon name="sparkles" color={theme.accent} size={19} /><Text style={{ color: theme.accent, fontWeight: '800', fontSize: 10, letterSpacing: 1 }}>AI ESTIMATE · REVIEW BEFORE SAVING</Text></Row>
        <Text style={{ color: theme.text, fontSize: 20, fontWeight: '800' }}>{estimate.name}</Text>
        <Text style={{ color: theme.text, fontSize: 27, fontWeight: '800' }}>~{Math.round(estimate.calories)} kcal</Text>
        <Text style={{ color: theme.text }}>Protein {Math.round(estimate.protein)} g · Carbs {Math.round(estimate.carbs)} g · Fat {Math.round(estimate.fat)} g</Text>
        <Text style={ui.muted}>Fibre {Math.round(estimate.fibre)} g · Sugar {Math.round(estimate.sugar)} g</Text>
        <Text style={ui.muted}>Assumptions: {estimate.assumptions}</Text>
        <Text style={[ui.muted, { fontSize: 11 }]}>Check the estimate. Add missing ingredients or portions and estimate again. Do not use a photo estimate to verify allergens.</Text>
        <Button onPress={saveMeal}>{existing ? `Replace ${mealType}` : 'Save meal'}</Button>
      </Card>}
    </> : <Card>
      <Text style={{ color: theme.text, fontSize: 19, fontWeight: '800' }}>{mode === 'weight' ? 'Weight check-in' : mode === 'water' ? 'Hydration check-in' : 'Workout details'}</Text>
      {mode === 'weight' ? <><Label>WEIGHT (KG)</Label><Input value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="e.g. 72.5" /></> :
        mode === 'water' ? <><Label>AMOUNT (ML)</Label><Input value={water} onChangeText={setWater} keyboardType="number-pad" placeholder="e.g. 250" /></> :
          <><Label>ACTIVITY</Label><Input value={name} onChangeText={setName} placeholder="e.g. strength training" /><Label>EXERCISES OR NOTES</Label><Input value={note} onChangeText={setNote} multiline placeholder="e.g. squats, rows and presses" style={{ minHeight: 78, textAlignVertical: 'top' }} /><Label>DURATION (MINUTES)</Label><Input value={minutes} onChangeText={setMinutes} keyboardType="number-pad" placeholder="e.g. 45" /></>}
      <Button onPress={saveOther}>Save {mode}</Button>
    </Card>}
  </Page>;
}
