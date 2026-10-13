import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, Text, View } from 'react-native';
import DaySelector from '@/components/DaySelector';
import MealTimePicker from '@/components/MealTimePicker';
import { Button, Card, Input, Label, Page, Title, ui } from '@/components/UI';
import { Meal, StepEntry, WaterEntry, WeighIn, useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { localDay, parseDay, formatDate } from '@/lib/dates';
import { theme } from '@/lib/theme';

type Kind = 'meal' | 'workout' | 'weight' | 'water' | 'steps' | 'legacy-water';
const numeric = (value: string, max: number, integer = false) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= max && (!integer || Number.isInteger(number)) ? number : null;
};
const comparableText = (value: string) => value.trim().replace(/\s+/g, ' ');

export default function EditEntry() {
  const { kind, id } = useLocalSearchParams<{ kind: Kind; id: string }>();
  const store = useStore();
  const auth = useAuth();
  const entry = kind === 'meal' ? store.meals.find((x) => x.id === id) : kind === 'workout' ? store.workouts.find((x) => x.id === id)
    : kind === 'weight' ? store.weighIns.find((x) => x.id === id) : kind === 'water' ? store.waterEntries.find((x) => x.id === id)
      : kind === 'steps' ? store.stepEntries.find((x) => x.id === id)
        : kind === 'legacy-water' && id ? { id, date: id, ml: Math.max(0, (store.water[id] || 0) - store.waterEntries.filter((item) => item.date === id).reduce((sum, item) => sum + item.ml, 0)) } : undefined;
  const [changes, setChanges] = useState<Record<string, string>>({});
  const draft = { ...Object.fromEntries(Object.entries(entry || {}).map(([key, value]) => [key, String(value)])), ...changes };
  const mealDescription = kind === 'meal' && entry ? (entry as Meal).note.split(' · Assumptions:')[0] : '';
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const set = (key: string, value: string) => { setError(''); setChanges((old) => ({ ...old, [key]: value })); };
  const goToHistory = (date?: string) => router.replace({ pathname: '/(tabs)/history', params: { date: date && parseDay(date) ? date : localDay() } });
  const save = async () => {
    if (!entry || !draft.date || saving) return;
    if (kind === 'meal') {
      const meal = entry as Meal;
      const description = (changes.note ?? mealDescription).trim();
      if (draft.type !== 'snack' && store.meals.some((meal) => meal.id !== entry.id && meal.date === draft.date && meal.type === draft.type)) {
        return setError(`A ${draft.type} entry already exists on ${formatDate(draft.date)}. Edit that entry first or choose another meal type.`);
      }
      const noteChanged = comparableText(description) !== comparableText(mealDescription);
      const time = draft.time || '12:00';
      if (!noteChanged && time === meal.time && draft.type === meal.type) return goToHistory(meal.date);
      if (noteChanged && !description) return setError('Describe the food and portion before saving.');
      let updated: Meal = { ...meal, time, type: draft.type as Meal['type'] };
      if (noteChanged) {
        setSaving(true); setError('');
        try {
          const estimate = await auth.estimateMeal(description, null);
          if (!active.current) return;
          updated = { ...updated, name: estimate.name, note: `${description}${estimate.assumptions ? ` · Assumptions: ${estimate.assumptions}` : ''}`,
            calories: estimate.calories, protein: estimate.protein, carbs: estimate.carbs, fat: estimate.fat, fibre: estimate.fibre, sugar: estimate.sugar };
        } catch (cause) { if (active.current) setError(cause instanceof Error ? cause.message : 'Could not update the nutrition estimate.'); return; }
        finally { if (active.current) setSaving(false); }
      }
      store.editMeal(updated);
    } else if (kind === 'workout') {
      const minutes = numeric(draft.minutes, 1440);
      if (!draft.name?.trim() || minutes === null || minutes <= 0) return setError('Enter an activity and a valid duration.');
      const updated = { ...entry, date: draft.date, time: draft.time || '12:00', name: draft.name.trim(), minutes, note: draft.note || '' };
      if (Object.entries(updated).every(([key, value]) => value === entry[key as keyof typeof entry])) return goToHistory(entry.date);
      store.editWorkout(updated);
    } else if (kind === 'weight') {
      const kg = numeric(draft.kg, 400);
      if (kg === null || kg < 25) return setError('Enter a weight from 25 to 400 kg.');
      if (draft.date === entry.date && kg === (entry as WeighIn).kg) return goToHistory(entry.date);
      store.editWeighIn({ ...entry, date: draft.date, kg });
    } else if (kind === 'water') {
      const ml = numeric(draft.ml, 5000, true);
      if (ml === null || ml <= 0) return setError('Enter a water amount from 1 to 5000 ml.');
      if (draft.date === entry.date && (draft.time || '12:00') === (entry as WaterEntry).time && ml === (entry as WaterEntry).ml) return goToHistory(entry.date);
      store.editWater({ ...entry, date: draft.date, time: draft.time || '12:00', ml });
    } else if (kind === 'legacy-water') {
      const ml = numeric(draft.ml, 10000, true);
      if (ml === null) return setError('Enter a valid water amount.');
      if (draft.date === entry.date && ml === (entry as { ml: number }).ml) return goToHistory(entry.date);
      const destinationLegacy = Math.max(0, (store.water[draft.date] || 0) - store.waterEntries.filter((item) => item.date === draft.date).reduce((sum, item) => sum + item.ml, 0));
      store.setLegacyWater(entry.date, 0);
      store.setLegacyWater(draft.date, entry.date === draft.date ? ml : destinationLegacy + ml);
    } else if (kind === 'steps') {
      const count = numeric(draft.count, 100000, true);
      if (count === null || count <= 0) return setError('Enter a step count from 1 to 100000.');
      if (draft.date === entry.date && (draft.time || '12:00') === (entry as StepEntry).time && count === (entry as StepEntry).count) return goToHistory(entry.date);
      store.editSteps({ ...entry, date: draft.date, time: draft.time || '12:00', count });
    }
    goToHistory(draft.date);
  };
  const remove = () => {
    if (!entry) return;
    const action = () => {
      if (kind === 'meal') store.removeMeal(entry.id);
      else if (kind === 'workout') store.removeWorkout(entry.id);
      else if (kind === 'weight') store.removeWeighIn(entry.id);
      else if (kind === 'water') store.removeWater(entry.id);
      else if (kind === 'legacy-water') store.setLegacyWater(entry.date, 0);
      else if (kind === 'steps') store.removeSteps(entry.id);
      goToHistory(entry.date);
    };
    if (Platform.OS === 'web') { if (window.confirm('Delete this entry?')) action(); }
    else Alert.alert('Delete entry?', 'This entry will be removed from your history.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: action }]);
  };
  return <Page>
    <Title eyebrow="CORRECT YOUR RECORD" subtitle="Changes to past days update your charts and future reviews.">Edit {kind || 'entry'}</Title>
    {!entry ? <Card><Text style={ui.muted}>This entry is no longer available.</Text><Button secondary onPress={() => goToHistory()}>Back</Button></Card> : <Card>
      {kind !== 'meal' ? <><Label>DATE</Label><DaySelector value={draft.date || entry.date} onChange={(value) => set('date', value)} /></> : null}
      {kind === 'meal' ? <>
        <Label>MEAL TYPE</Label><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) => <Button key={type} secondary={draft.type !== type} onPress={() => set('type', type)}>{type}</Button>)}</View>
        <Label>TIME</Label><MealTimePicker value={draft.time || '12:00'} onChange={(value) => set('time', value)} />
        <Label>FOOD AND PORTION</Label><Input value={changes.note ?? mealDescription} onChangeText={(value) => set('note', value)} multiline />
        <Text style={ui.muted}>Changing the description will update the AI nutrition estimate. Changing only time or meal type keeps the current estimate.</Text>
      </> : kind === 'workout' ? <><Label>ACTIVITY</Label><Input value={draft.name || ''} onChangeText={(value) => set('name', value)} /><Label>TIME</Label><MealTimePicker value={draft.time || '12:00'} onChange={(value) => set('time', value)} /><Label>DURATION (MIN)</Label><Input value={draft.minutes || ''} onChangeText={(value) => set('minutes', value)} keyboardType="number-pad" /><Label>NOTES</Label><Input value={draft.note || ''} onChangeText={(value) => set('note', value)} multiline /></> :
        <><Label>{kind === 'weight' ? 'WEIGHT (KG)' : kind === 'water' || kind === 'legacy-water' ? 'WATER (ML)' : 'STEPS'}</Label><Input value={draft[kind === 'weight' ? 'kg' : kind === 'water' || kind === 'legacy-water' ? 'ml' : 'count'] || ''} onChangeText={(value) => set(kind === 'weight' ? 'kg' : kind === 'water' || kind === 'legacy-water' ? 'ml' : 'count', value)} keyboardType="decimal-pad" />{kind !== 'weight' && kind !== 'legacy-water' ? <><Label>TIME</Label><MealTimePicker value={draft.time || '12:00'} onChange={(value) => set('time', value)} /></> : null}</>}
      {error ? <Text accessibilityRole="alert" style={{ color: theme.red }}>{error}</Text> : null}
      <Button disabled={saving} onPress={() => { void save(); }}>{saving ? 'Updating estimate…' : 'Save changes'}</Button><Button secondary disabled={saving} onPress={remove}>Delete entry</Button><Button secondary onPress={() => { active.current = false; goToHistory(entry.date); }}>Cancel</Button>
    </Card>}
  </Page>;
}
