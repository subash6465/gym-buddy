import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Text, View } from 'react-native';
import DaySelector from '@/components/DaySelector';
import MealTimePicker from '@/components/MealTimePicker';
import { Button, Card, Input, Label, Page, Title, ui } from '@/components/UI';
import { Meal, useStore } from '@/lib/store';
import { localDay, parseDay } from '@/lib/dates';
import { theme } from '@/lib/theme';

type Kind = 'meal' | 'workout' | 'weight' | 'water' | 'steps' | 'legacy-water';
const numeric = (value: string, max: number, integer = false) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= max && (!integer || Number.isInteger(number)) ? number : null;
};

export default function EditEntry() {
  const { kind, id } = useLocalSearchParams<{ kind: Kind; id: string }>();
  const store = useStore();
  const entry = kind === 'meal' ? store.meals.find((x) => x.id === id) : kind === 'workout' ? store.workouts.find((x) => x.id === id)
    : kind === 'weight' ? store.weighIns.find((x) => x.id === id) : kind === 'water' ? store.waterEntries.find((x) => x.id === id)
      : kind === 'steps' ? store.stepEntries.find((x) => x.id === id)
        : kind === 'legacy-water' && id ? { id, date: id, ml: Math.max(0, (store.water[id] || 0) - store.waterEntries.filter((item) => item.date === id).reduce((sum, item) => sum + item.ml, 0)) } : undefined;
  const [changes, setChanges] = useState<Record<string, string>>({});
  const draft = { ...Object.fromEntries(Object.entries(entry || {}).map(([key, value]) => [key, String(value)])), ...changes };
  const [error, setError] = useState('');
  const set = (key: string, value: string) => { setError(''); setChanges((old) => ({ ...old, [key]: value })); };
  const goToHistory = (date?: string) => router.replace({ pathname: '/(tabs)/history', params: { date: date && parseDay(date) ? date : localDay() } });
  const save = () => {
    if (!entry || !draft.date) return;
    if (kind === 'meal') {
      const fields = ['calories', 'protein', 'carbs', 'fat', 'fibre', 'sugar'] as const;
      const values = Object.fromEntries(fields.map((key) => [key, numeric(draft[key], 10000)]));
      if (!draft.name?.trim() || fields.some((key) => !draft[key]?.trim() || values[key] === null)) return setError('Enter a meal name and valid nonnegative nutrition values.');
      if (draft.type !== 'snack' && store.meals.some((meal) => meal.id !== entry.id && meal.date === draft.date && meal.type === draft.type)) {
        return setError(`A ${draft.type} entry already exists on ${draft.date}. Edit that entry first or choose another meal type.`);
      }
      store.editMeal({ ...entry as Meal, date: draft.date, time: draft.time || '12:00', type: draft.type as Meal['type'], name: draft.name.trim(), note: draft.note || '', ...values } as Meal);
    } else if (kind === 'workout') {
      const minutes = numeric(draft.minutes, 1440);
      if (!draft.name?.trim() || minutes === null || minutes <= 0) return setError('Enter an activity and a valid duration.');
      store.editWorkout({ ...entry, date: draft.date, time: draft.time || '12:00', name: draft.name.trim(), minutes, note: draft.note || '' });
    } else if (kind === 'weight') {
      const kg = numeric(draft.kg, 400);
      if (kg === null || kg < 25) return setError('Enter a weight from 25 to 400 kg.');
      store.editWeighIn({ ...entry, date: draft.date, kg });
    } else if (kind === 'water') {
      const ml = numeric(draft.ml, 5000, true);
      if (ml === null || ml <= 0) return setError('Enter a water amount from 1 to 5000 ml.');
      store.editWater({ ...entry, date: draft.date, time: draft.time || '12:00', ml });
    } else if (kind === 'legacy-water') {
      const ml = numeric(draft.ml, 10000, true);
      if (ml === null) return setError('Enter a valid water amount.');
      const destinationLegacy = Math.max(0, (store.water[draft.date] || 0) - store.waterEntries.filter((item) => item.date === draft.date).reduce((sum, item) => sum + item.ml, 0));
      store.setLegacyWater(entry.date, 0);
      store.setLegacyWater(draft.date, entry.date === draft.date ? ml : destinationLegacy + ml);
    } else if (kind === 'steps') {
      const count = numeric(draft.count, 100000, true);
      if (count === null || count <= 0) return setError('Enter a step count from 1 to 100000.');
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
      <Label>DATE</Label><DaySelector value={draft.date || entry.date} onChange={(value) => set('date', value)} />
      {kind === 'meal' ? <>
        <Label>MEAL TYPE</Label><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) => <Button key={type} secondary={draft.type !== type} onPress={() => set('type', type)}>{type}</Button>)}</View>
        <Label>NAME</Label><Input value={draft.name || ''} onChangeText={(value) => set('name', value)} />
        <Label>TIME</Label><MealTimePicker value={draft.time || '12:00'} onChange={(value) => set('time', value)} />
        {(['calories', 'protein', 'carbs', 'fat', 'fibre', 'sugar'] as const).map((key) => <View key={key}><Label>{key.toUpperCase()} {key === 'calories' ? '(KCAL)' : '(G)'}</Label><Input value={draft[key] || ''} onChangeText={(value) => set(key, value)} keyboardType="decimal-pad" /></View>)}
        <Label>DESCRIPTION AND ASSUMPTIONS</Label><Input value={draft.note || ''} onChangeText={(value) => set('note', value)} multiline />
      </> : kind === 'workout' ? <><Label>ACTIVITY</Label><Input value={draft.name || ''} onChangeText={(value) => set('name', value)} /><Label>TIME</Label><MealTimePicker value={draft.time || '12:00'} onChange={(value) => set('time', value)} /><Label>DURATION (MIN)</Label><Input value={draft.minutes || ''} onChangeText={(value) => set('minutes', value)} keyboardType="number-pad" /><Label>NOTES</Label><Input value={draft.note || ''} onChangeText={(value) => set('note', value)} multiline /></> :
        <><Label>{kind === 'weight' ? 'WEIGHT (KG)' : kind === 'water' || kind === 'legacy-water' ? 'WATER (ML)' : 'STEPS'}</Label><Input value={draft[kind === 'weight' ? 'kg' : kind === 'water' || kind === 'legacy-water' ? 'ml' : 'count'] || ''} onChangeText={(value) => set(kind === 'weight' ? 'kg' : kind === 'water' || kind === 'legacy-water' ? 'ml' : 'count', value)} keyboardType="decimal-pad" />{kind !== 'weight' && kind !== 'legacy-water' ? <><Label>TIME</Label><MealTimePicker value={draft.time || '12:00'} onChange={(value) => set('time', value)} /></> : null}</>}
      {error ? <Text accessibilityRole="alert" style={{ color: theme.red }}>{error}</Text> : null}
      <Button onPress={save}>Save changes</Button><Button secondary onPress={remove}>Delete entry</Button><Button secondary onPress={() => goToHistory(entry.date)}>Cancel</Button>
    </Card>}
  </Page>;
}
