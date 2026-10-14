import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { availableMetrics, blankSet, changeTimeUnit, metricField, metricLabels, replaceExercise, setDetails, type CatalogExercise, type DraftSet, type ExerciseDraft, type ExerciseMetric, type LoggedExercise } from '@/lib/workouts';
import { theme } from '@/lib/theme';
import { Button, Card, Icon, Input, Label, MotionPressable, Reveal, Row, ui } from './UI';
import ExercisePicker from './ExercisePicker';
import WorkoutTimeInput from './WorkoutTimeInput';

export default function WorkoutExerciseEditor({ exercise, index, onChange, previous, catalog, replacementError, onBeginReplacement }: { exercise: ExerciseDraft; index: number; onChange: (exercise: ExerciseDraft) => void; previous?: LoggedExercise; catalog: CatalogExercise[]; replacementError?: string; onBeginReplacement: () => void }) {
  const [swapping, setSwapping] = useState(false);
  const reps = exercise.metrics.includes('reps');
  function toggle(metric: ExerciseMetric) {
    onChange({ ...exercise, metrics: exercise.metrics.includes(metric) ? exercise.metrics.filter((item) => item !== metric) : [...exercise.metrics, metric] });
  }
  const unitLabel = (metric: ExerciseMetric) => ({ reps: 'Reps', weight: 'Shared weight (kg)', time: `Time (${exercise.timeUnit === 'minutes' ? 'min' : 's'})`, speed: 'Speed (km/h)', incline: 'Incline (degrees)' })[metric];
  const fields = exercise.metrics.filter((metric) => metric !== 'weight' || !exercise.individualWeights).map((metric) => ({ field: metricField(metric), metric, label: unitLabel(metric) }));
  const inputField = (set: DraftSet, setIndex: number, field: keyof DraftSet, label: string, metric: ExerciseMetric) => {
    const accessibilityLabel = `${exercise.name} ${reps ? 'set' : 'interval'} ${setIndex + 1} ${metric === 'time' ? 'time' : label}`;
    const update = (value: string) => onChange({ ...exercise, sets: exercise.sets.map((entry, index) => index === setIndex ? { ...entry, [field]: value } : entry) });
    return <View key={field} style={{ flexGrow: 1, flexBasis: metric === 'time' ? '100%' : '43%', gap: 7 }}>
      <Text style={[ui.muted, { fontSize: 11 }]}>{metric === 'time' ? 'Time' : label}</Text>
      {metric === 'time' ? <WorkoutTimeInput label={accessibilityLabel} value={set[field]} unit={exercise.timeUnit} onChange={update} onUnitChange={(unit) => onChange(changeTimeUnit(exercise, unit))} /> : <Input accessibilityLabel={accessibilityLabel} value={set[field]} onChangeText={update} keyboardType={metric === 'reps' ? 'number-pad' : 'decimal-pad'} maxLength={12} placeholder={metric === 'reps' ? '10' : '0'} />}
    </View>;
  };
  return <Card>
    <Row><View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: theme.accentSoft, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: theme.accent, fontFamily: theme.font }}>{String(index + 1).padStart(2, '0')}</Text></View><Text style={{ flex: 1, color: theme.text, fontFamily: theme.font, fontSize: 19 }}>{exercise.name}</Text></Row>
    {exercise.prescription ? <Text style={ui.muted}>Plan: {exercise.prescription}</Text> : null}
    {exercise.name !== exercise.plannedName ? <Text style={{ color: theme.accent, fontSize: 12 }}>Substituted for {exercise.plannedName}</Text> : null}
    {exercise.description ? <Text style={ui.muted}>{exercise.description}</Text> : null}
    {previous ? <Text style={[ui.muted, { fontSize: 12 }]}>Last logged: {previous.sets.map((set) => setDetails(set, previous.timeUnit)).join(' / ')}</Text> : null}
    <Row><View style={{ flex: 1 }}><Button secondary onPress={() => { onBeginReplacement(); setSwapping(true); }}>Change exercise</Button></View><View style={{ flex: 1 }}><Button secondary onPress={() => onChange({ ...exercise, skipped: true })}>Skip exercise</Button></View></Row>
    {replacementError ? <Text accessibilityRole="alert" style={{ color: theme.red }}>{replacementError}</Text> : null}
    <Label>WHAT WOULD YOU LIKE TO RECORD?</Label>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {availableMetrics(exercise.name).map((metric) => <MotionPressable key={metric} accessibilityLabel={`Record ${metricLabels[metric].toLowerCase()} for ${exercise.name}`} accessibilityState={{ selected: exercise.metrics.includes(metric) }} onPress={() => toggle(metric)} style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: exercise.metrics.includes(metric) ? theme.accent : theme.line, backgroundColor: exercise.metrics.includes(metric) ? theme.accentSoft : theme.cardAlt }}><Text style={{ color: exercise.metrics.includes(metric) ? theme.accent : theme.muted, fontFamily: theme.font, fontSize: 12 }}>{exercise.metrics.includes(metric) ? '✓ ' : '+ '}{metricLabels[metric]}</Text></MotionPressable>)}
    </View>
    <Text style={[ui.muted, { fontSize: 12 }]}>{exercise.name === 'Cycling' ? 'Record time and speed if you have them.' : exercise.name === 'Walking' ? 'Record any details you have: time, speed and incline. All walks use this one exercise.' : exercise.name === 'Running' ? 'Record your running time in seconds or minutes.' : 'Choose only the details you have. Selecting reps includes sets; weight is optional.'}</Text>
    {exercise.metrics.includes('weight') ? <>
      <Pressable accessibilityRole="checkbox" accessibilityLabel="Individual weights in each hand" accessibilityState={{ checked: exercise.individualWeights }} onPress={() => onChange({ ...exercise, individualWeights: !exercise.individualWeights })} style={({ pressed }) => ({ minHeight: 48, padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: exercise.individualWeights ? theme.accent : theme.line, backgroundColor: exercise.individualWeights ? theme.accentSoft : theme.cardAlt, opacity: pressed ? 0.7 : 1 })}>
        <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 1, borderColor: exercise.individualWeights ? theme.accent : theme.muted, backgroundColor: exercise.individualWeights ? theme.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>{exercise.individualWeights ? <Icon name="check" color={theme.ink} size={16} /> : null}</View><Text style={{ flex: 1, color: theme.text, fontSize: 13, fontFamily: theme.font }}>Individual weights in each hand</Text>
      </Pressable>
      <Text style={[ui.muted, { fontSize: 11 }]}>{exercise.individualWeights ? 'Enter each hand’s actual weight separately, in kg. Enter 0 for an unloaded hand.' : 'For a shared load, enter the total weight, including the bar, or the selected machine stack weight. Check the box for separate hand weights.'}</Text>
    </> : null}
    {!exercise.metrics.length ? <Text style={ui.muted}>Select at least one measurement to log this exercise.</Text> : exercise.sets.map((set, setIndex) => <Reveal key={setIndex}><View style={{ gap: 12, padding: 14, borderWidth: 1, borderColor: theme.line, borderRadius: 16, backgroundColor: theme.cardAlt }}>
      <Row><Text style={{ flex: 1, color: theme.accent, fontFamily: theme.font }}>{reps ? `Set ${setIndex + 1}` : exercise.sets.length > 1 ? `Interval ${setIndex + 1}` : 'Your actual details'}</Text><MotionPressable accessibilityLabel={`Remove ${exercise.name} ${reps ? 'set' : 'interval'} ${setIndex + 1}`} disabled={exercise.sets.length === 1} onPress={() => onChange({ ...exercise, sets: exercise.sets.filter((_, index) => index !== setIndex) })} style={{ minHeight: 44, width: 44 }}><Text style={{ color: exercise.sets.length === 1 ? theme.muted : theme.red, fontSize: 20 }}>−</Text></MotionPressable></Row>
      {fields.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>{fields.map(({ field, label, metric }) => inputField(set, setIndex, field, label, metric))}</View> : null}
      {exercise.metrics.includes('weight') && exercise.individualWeights ? <Reveal><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>{inputField(set, setIndex, 'leftWeightKg', 'Left hand (kg)', 'weight')}{inputField(set, setIndex, 'rightWeightKg', 'Right hand (kg)', 'weight')}</View></Reveal> : null}
    </View></Reveal>)}
    {exercise.metrics.length ? <Button secondary disabled={exercise.sets.length >= 30} onPress={() => onChange({ ...exercise, sets: [...exercise.sets, { ...(exercise.sets[exercise.sets.length - 1] || blankSet()) }] })}>{reps ? '+ Add set' : '+ Add interval'}</Button> : null}
    {swapping ? <ExercisePicker title={`Replace ${exercise.name}`} catalog={catalog} onClose={() => setSwapping(false)} onSelect={(replacement, description) => onChange(replaceExercise(exercise, replacement, description))} /> : null}
  </Card>;
}
