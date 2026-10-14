import ExerciseEditor from './WorkoutExerciseEditor';
import ExercisePicker from './ExercisePicker';
import { exerciseKey } from '@/shared/exercise-catalog.mjs';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { useStore, type Workout } from '@/lib/store';
import { clockTime, formatDate } from '@/lib/dates';
import { completedExercises, editExerciseDraft, exerciseDraft, exercisesForDay, trainingSessions, type ExerciseDraft, exerciseCatalog, type CatalogExercise } from '@/lib/workouts';
import { theme } from '@/lib/theme';
import { Button, Card, Icon, Input, Label, Meter, MotionPressable, Reveal, Row, ui } from './UI';
import PickerDialog from './PickerDialog';
import MealTimePicker from './MealTimePicker';

type Props = { date: string; selectedDay?: string; initial?: Workout; onSaved: (message: string) => void };
const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function WorkoutLogger({ date, selectedDay, initial, onSaved }: Props) {
  const auth = useAuth(); const store = useStore();
  const catalog = useMemo(() => exerciseCatalog(auth.plan, store.exerciseLibrary, store.workouts), [auth.plan, store.exerciseLibrary, store.workouts]);
  const [adding, setAdding] = useState(false);
  const sessions = trainingSessions(auth.plan);
  const first = sessions.find((day) => day.key === selectedDay);
  const [dayKey, setDayKey] = useState(initial?.planDay || first?.key || '');
  const [label, setLabel] = useState(initial?.planLabel || first?.label || '');
  const [name, setName] = useState(initial?.name || first?.title || '');
  const [exercises, setExercises] = useState<ExerciseDraft[]>(() => initial?.exercises?.map(editExerciseDraft) || (first ? exercisesForDay(first).map((exercise) => exerciseDraft(exercise, newId())) : []));
  const [time, setTime] = useState(initial?.time || clockTime());
  const [minutes, setMinutes] = useState(initial ? String(initial.minutes) : '');
  const [note, setNote] = useState(initial?.note || '');
  const [picker, setPicker] = useState(false);
  const [pendingDay, setPendingDay] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [replacementErrors, setReplacementErrors] = useState<Record<string, { name: string; message: string }>>({});
  const [addError, setAddError] = useState('');
  const [saved, setSaved] = useState(false);
  const [savedDate, setSavedDate] = useState(date);
  const [custom, setCustom] = useState(!initial && !first && !sessions.length);
  const [dirty, setDirty] = useState(false);
  const clearReplacementError = (id: string) => setReplacementErrors((old) => {
    const next = { ...old }; delete next[id]; return next;
  });
  const change = (id: string, next: ExerciseDraft) => {
    if (!next.skipped && exerciseKey(exercises.find((exercise) => exercise.id === id)?.name || '') !== exerciseKey(next.name) && exercises.some((exercise) => exercise.id !== id && !exercise.skipped && exerciseKey(exercise.name) === exerciseKey(next.name))) {
      setReplacementErrors((old) => ({ ...old, [id]: { name: next.name, message: `${next.name} already has a card in this session. Use that card, or skip it before replacing another exercise.` } }));
      return;
    }
    clearReplacementError(id); setAddError(''); setSaved(false); setError(''); setDirty(true);
    setExercises((old) => old.map((exercise) => exercise.id === id ? next : exercise));
  };
  function select(key: string) {
    const day = sessions.find((item) => item.key === key);
    setDayKey(key); setLabel(day?.label || ''); setName(day?.title || ''); setCustom(!day);
    setExercises(day ? exercisesForDay(day).map((exercise) => exerciseDraft(exercise, newId())) : []);
    setDirty(false); setSaved(false); setError(''); setPicker(false); setPendingDay(null);
    setReplacementErrors({}); setAddError('');
  }
  const active = exercises.filter((exercise) => !exercise.skipped);
  const complete = active.filter((exercise) => { try { completedExercises([exercise]); return true; } catch { return false; } }).length;
  function save() {
    if (saved) return;
    setError('');
    try {
      const duration = Number(minutes);
      if (!name.trim()) throw new Error('Choose a training day or name your session.');
      if (!minutes.trim() || !Number.isFinite(duration) || duration <= 0 || duration > 1440) throw new Error('Enter your actual session duration, up to 1,440 minutes.');
      const logged = completedExercises(exercises);
      const workout = { date, time, name: name.trim(), minutes: duration, note: note.trim(), ...(dayKey ? { planDay: dayKey, planLabel: label } : {}), exercises: logged };
      if (initial) store.editWorkout({ ...workout, id: initial.id }); else store.addWorkout(workout);
      setSaved(true);
      setSavedDate(date);
      onSaved(`${initial ? 'Workout updated' : 'Workout saved'} · ${logged.length} exercises · ${logged.reduce((sum, exercise) => sum + exercise.sets.length, 0)} sets / intervals. Nice work showing up.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save this workout.'); }
  }
  if (saved && !initial) return <Reveal><Card style={{ borderColor: theme.heroLine, backgroundColor: theme.hero }}><Icon name="check" color={theme.accent} size={32} /><Text style={{ color: theme.text, fontFamily: theme.font, fontSize: 24 }}>Session in the books.</Text><Text style={ui.muted}>{name} · {active.length} exercises · {minutes} min</Text><Text style={ui.muted}>{formatDate(savedDate)}</Text><Button onPress={() => router.push({ pathname: '/(tabs)/history', params: { date: savedDate } })}>See your workout</Button><Button secondary onPress={() => { select(''); setTime(clockTime()); setMinutes(''); setNote(''); }}>Log another session</Button></Card></Reveal>;
  return <View style={{ gap: 18 }}>
    <Card style={{ borderColor: theme.heroLine, backgroundColor: theme.hero }}>
      <Row><Icon name="workout" color={theme.accent} /><Text style={{ color: theme.accent, fontFamily: theme.font, letterSpacing: 1, fontSize: 11 }}>YOUR SESSION, YOUR PACE</Text></Row>
      <Text style={{ color: theme.text, fontFamily: theme.font, fontSize: 24 }}>{initial ? 'Fine-tune your session.' : 'Pick your day. Log your wins.'}</Text>
      <Text style={ui.muted}>Follow any training day in any order. Record what you actually did.</Text>
      {!initial ? <><Label>TRAINING DAY</Label><MotionPressable onPress={() => setPicker(true)} style={{ minHeight: 60, borderWidth: 1, borderColor: theme.heroLine, backgroundColor: theme.cardAlt, borderRadius: 16, padding: 14 }}><Row><Text style={{ color: theme.text, flex: 1, fontFamily: theme.font }}>{dayKey ? `${label} — ${name}` : custom ? 'Custom session' : 'Choose a workout from your plan'}</Text><Icon name="down" color={theme.accent} /></Row></MotionPressable></> : <Text style={ui.muted}>{label}{label ? ' · ' : ''}{name}</Text>}
      {!sessions.length && !initial ? <><Text style={ui.muted}>Generate a plan to load your exercises automatically, or build a custom session below.</Text><Button secondary onPress={() => router.push({ pathname: '/chat', params: { prompt: 'Create a training plan from my saved profile.' } })}>Create my plan</Button></> : null}
      {custom || initial ? <><Label>SESSION NAME</Label><Input maxLength={120} value={name} onChangeText={(value) => { setName(value); setDirty(true); }} placeholder="e.g. Upper A" /></> : null}
      {exercises.length ? <><Row><Text style={[ui.muted, { flex: 1 }]}>{complete} / {active.length} exercises filled</Text><Text style={{ color: theme.accent, fontFamily: theme.font }}>{active.reduce((sum, exercise) => sum + exercise.sets.length, 0)} sets / intervals</Text></Row><Meter value={complete} max={active.length} /></> : null}
    </Card>
    {exercises.filter((exercise) => !exercise.skipped).map((exercise, index) => <Reveal key={exercise.id} delay={Math.min(index * 35, 175)}><ExerciseEditor catalog={catalog} exercise={exercise} index={index} replacementError={replacementErrors[exercise.id] && exercises.some((entry) => entry.id !== exercise.id && !entry.skipped && exerciseKey(entry.name) === exerciseKey(replacementErrors[exercise.id].name)) ? replacementErrors[exercise.id].message : ''} onBeginReplacement={() => clearReplacementError(exercise.id)} onChange={(next) => change(exercise.id, next)} previous={store.workouts.filter((workout) => workout.id !== initial?.id && workout.date <= date).sort((a, b) => b.date.localeCompare(a.date)).flatMap((workout) => workout.exercises || []).find((item) => exerciseKey(item.name) === exerciseKey(exercise.name))} /></Reveal>)}
    {exercises.some((exercise) => exercise.skipped) ? <Card><Label>SKIPPED THIS SESSION · WILL NOT BE LOGGED</Label>{exercises.filter((exercise) => exercise.skipped).map((exercise) => <Row key={exercise.id}><Text style={[ui.muted, { flex: 1 }]}>{exercise.name}</Text><Button secondary onPress={() => change(exercise.id, { ...exercise, skipped: false })}>Restore</Button></Row>)}</Card> : null}
    {(dayKey || custom || initial) ? <>
      <Button secondary disabled={exercises.length >= 20} onPress={() => { setAddError(''); setAdding(true); }}>+ Add an exercise</Button>
      {addError ? <Text accessibilityRole="alert" style={{ color: theme.red }}>{addError}</Text> : null}
      <Card><Label>START TIME</Label><MealTimePicker value={time} onChange={(value) => { setTime(value); setDirty(true); }} /><Label>ACTUAL DURATION (MINUTES)</Label><Input accessibilityLabel="Actual workout duration in minutes" value={minutes} onChangeText={(value) => { setMinutes(value); setDirty(true); }} keyboardType="decimal-pad" placeholder="e.g. 45" /><Label>SESSION NOTES · OPTIONAL</Label><Input value={note} maxLength={2000} onChangeText={(value) => { setNote(value); setDirty(true); }} multiline placeholder="How did it feel today?" /></Card>
      {error ? <Text accessibilityRole="alert" style={{ color: theme.red }}>{error}</Text> : null}
      <Button disabled={saved || !store.ready} onPress={save}>{saved ? 'Saved' : initial ? 'Save workout changes' : `Save session · ${active.length} exercises`}</Button>
    </> : null}
    {adding ? <ExercisePicker title="Add an exercise" catalog={catalog} onClose={() => setAdding(false)} onSelect={(exercise: CatalogExercise, description) => {
      const existing = exercises.find((entry) => exerciseKey(entry.name) === exerciseKey(exercise.name));
      if (existing) { if (existing.skipped) change(existing.id, { ...existing, skipped: false }); else setAddError(`${exercise.name} is already in this session. Add sets or intervals to its card.`); return; }
      setDirty(true); setExercises((old) => [...old, { ...exerciseDraft({ ...exercise, prescription: '', sets: 1 }, newId()), description }]);
    }} /> : null}
    {picker ? <PickerDialog title="Choose your training day" onClose={() => setPicker(false)}>{sessions.map((day) => <Button key={day.key} secondary={day.key !== dayKey} onPress={() => { if (day.key === dayKey) setPicker(false); else if (dirty) setPendingDay(day.key); else select(day.key); }}>{day.label} — {day.title}</Button>)}<Button secondary onPress={() => { if (dirty) setPendingDay(''); else select(''); }}>Custom session</Button><Text style={ui.muted}>Your plan stays the same when you swap or skip exercises here.</Text></PickerDialog> : null}
    {pendingDay !== null ? <PickerDialog title="Switch this session?" onClose={() => setPendingDay(null)}><Text style={ui.muted}>Switching will clear the exercise entries in this draft. Your session time, duration and notes stay.</Text><Button onPress={() => select(pendingDay)}>Switch and clear exercise entries</Button><Button secondary onPress={() => setPendingDay(null)}>Keep this session</Button></PickerDialog> : null}
  </View>;
}
