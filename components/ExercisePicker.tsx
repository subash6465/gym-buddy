import { useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { canonicalExerciseName, exerciseKey } from '@/shared/exercise-catalog.mjs';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store';
import { matchingExercise, type CatalogExercise, type ExerciseIdentity } from '@/lib/workouts';
import { theme } from '@/lib/theme';
import PickerDialog from './PickerDialog';
import { Button, Input, Reveal, ui } from './UI';

export default function ExercisePicker({ title, catalog, onSelect, onClose }: { title: string; catalog: CatalogExercise[]; onSelect: (exercise: CatalogExercise, description: string) => void; onClose: () => void }) {
  const auth = useAuth(); const store = useStore();
  const [search, setSearch] = useState('');
  const [missing, setMissing] = useState(false);
  const [description, setDescription] = useState('');
  const [result, setResult] = useState<ExerciseIdentity | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const generation = useRef(0);
  useEffect(() => () => { generation.current++; }, []);
  const filtered = useMemo(() => catalog.filter((exercise) => exerciseKey(exercise.name).includes(exerciseKey(search))), [catalog, search]);
  const choose = (exercise: CatalogExercise, text = '') => {
    const selected = matchingExercise(catalog, exercise.name) || { ...exercise, name: canonicalExerciseName(exercise.name) };
    store.rememberExercise(selected);
    onSelect(selected, text); onClose();
  };
  async function identify() {
    if (busy) return;
    const request = ++generation.current;
    setBusy(true); setError(''); setResult(null);
    try { const identity = await auth.identifyExercise(description.trim(), catalog); if (request === generation.current) setResult(identity); }
    catch (cause) { if (request === generation.current) setError(cause instanceof Error ? cause.message : 'Could not identify the exercise.'); }
    finally { if (request === generation.current) setBusy(false); }
  }
  return <PickerDialog title={title} onClose={onClose}>
    {!missing ? <>
      <Text style={ui.muted}>Choose from exercises in your plan and saved library.</Text>
      <Input accessibilityLabel="Search exercise dropdown" value={search} onChangeText={setSearch} placeholder="Search your exercises" maxLength={120} />
      <View style={{ gap: 8 }}>{filtered.map((exercise) => <Button key={exerciseKey(exercise.name)} secondary onPress={() => choose(exercise)}>{exercise.name}</Button>)}</View>
      {!filtered.length ? <Text style={ui.muted}>No exercises match this search.</Text> : null}
      <Button onPress={() => setMissing(true)}>Not present in the dropdown</Button>
    </> : <>
      <Button secondary disabled={busy} onPress={() => { generation.current++; setMissing(false); setResult(null); }}>Back to exercise list</Button>
      <Text style={ui.muted}>Describe the equipment, grip and movement. AI checks your whole exercise list first to reuse an existing exercise.</Text>
      <Input accessibilityLabel="Alternative exercise description" maxLength={2000} value={description} onChangeText={(value) => { generation.current++; setBusy(false); setDescription(value); setResult(null); }} multiline placeholder="e.g. Standing dumbbell curls with thumbs pointing up" style={{ minHeight: 90 }} />
      <Button disabled={busy || !description.trim()} onPress={() => { void identify(); }}>{busy ? 'Checking your exercises…' : 'Identify exercise with AI'}</Button>
      {error ? <Text accessibilityRole="alert" style={{ color: theme.red }}>{error}</Text> : null}
      {result ? <Reveal><View style={{ gap: 12, backgroundColor: theme.cardAlt, padding: 14, borderRadius: 14 }}>
        <Text style={{ color: theme.accent, fontFamily: theme.font }}>{result.confidence === 'low' ? 'Possible match · please check' : result.existingName || matchingExercise(catalog, result.name) ? 'Found in your exercise list' : 'New exercise · saved when you confirm'}</Text>
        <Text style={{ color: theme.text, fontFamily: theme.font, fontSize: 20 }}>{result.name}</Text><Text style={ui.muted}>{result.explanation}</Text>
        <Button onPress={() => choose(result, description.trim())}>Use {result.name}</Button>
      </View></Reveal> : null}
      <Text style={[ui.muted, { fontSize: 11 }]}>Confirmed new exercises join your saved list for next time. Existing matches are reused.</Text>
    </>}
  </PickerDialog>;
}
