import type { AiPlan, PlanDay } from './plan';
import { canonicalExerciseName, exerciseKey, normalizeCatalog, normalizePlannedExercises, type CatalogExercise } from '../shared/exercise-catalog.mjs';

export type ExerciseKind = 'strength' | 'timed';
export type ExerciseMetric = 'reps' | 'weight' | 'time' | 'speed' | 'incline';
export type TimeUnit = 'seconds' | 'minutes';
export type PlannedExercise = CatalogExercise & { prescription: string; sets: number };
export type ExerciseSet = { reps: number | null; weightKg: number | null; leftWeightKg?: number | null; rightWeightKg?: number | null; seconds: number | null; speedKmph?: number | null; inclineDegrees?: number | null };
export type LoggedExercise = { id: string; name: string; plannedName: string; prescription: string; kind: ExerciseKind; description: string; metrics?: ExerciseMetric[]; timeUnit?: TimeUnit; individualWeights?: boolean; sets: ExerciseSet[] };
export type DraftSet = { reps: string; weightKg: string; leftWeightKg: string; rightWeightKg: string; seconds: string; speedKmph: string; inclineDegrees: string };
export type ExerciseDraft = Omit<LoggedExercise, 'sets' | 'metrics' | 'timeUnit' | 'individualWeights'> & { skipped: boolean; metrics: ExerciseMetric[]; timeUnit: TimeUnit; individualWeights: boolean; sets: DraftSet[] };
export type ExerciseIdentity = CatalogExercise & { existingName?: string; confidence: 'high' | 'low'; explanation: string };
export type { CatalogExercise };
export const blankSet = (): DraftSet => ({ reps: '', weightKg: '', leftWeightKg: '', rightWeightKg: '', seconds: '', speedKmph: '', inclineDegrees: '' });
export const metricLabels: Record<ExerciseMetric, string> = { reps: 'Reps', weight: 'Weight', time: 'Time', speed: 'Speed', incline: 'Incline' };

export function availableMetrics(name: string): ExerciseMetric[] {
  const canonical = canonicalExerciseName(name);
  if (canonical === 'Walking') return ['time', 'speed', 'incline'];
  if (canonical === 'Cycling') return ['time', 'speed'];
  if (canonical === 'Running') return ['time'];
  return ['reps', 'weight', 'time'];
}
export function defaultMetrics(exercise: CatalogExercise): ExerciseMetric[] {
  return availableMetrics(exercise.name).includes('reps') && exercise.kind === 'strength' ? ['reps'] : ['time'];
}
export function planDayLabel(days: PlanDay[], index: number) {
  return days[index].isRest ? 'Recovery' : `Day ${days.slice(0, index + 1).filter((day) => !day.isRest).length}`;
}
export function trainingSessions(plan: AiPlan | null) {
  return (plan?.days || []).flatMap((day, index) => day.isRest ? [] : [{ ...day, key: day.day, label: planDayLabel(plan!.days, index) }]);
}
export function exercisesForDay(day: PlanDay): PlannedExercise[] {
  const exercises: PlannedExercise[] = day.exercises?.length ? day.exercises : day.activities.map((activity) => {
    const match = activity.match(/(\d{1,2})\s*(?:sets?\b|[x×]\s*\d)/i);
    const kind = /\b(walk|walking|run|running|cycling|bike|cardio|plank|stretch|mobility|warm.?up|cool.?down)\b|\b\d+\s*(?:min(?:utes?)?|sec(?:onds?)?)\b/i.test(activity) && !/\breps?\b/i.test(activity) ? 'timed' : 'strength';
    return { name: activity.replace(/\s*[:–—-]\s*\d.*$|\s*\(?\d+\s*(?:sets?\b|[x×]).*$/i, '').trim() || activity, prescription: activity, kind, sets: Math.min(12, Math.max(1, Number(match?.[1] || 1))) };
  });
  return normalizePlannedExercises(exercises);
}
export function exerciseCatalog(plan: AiPlan | null, library: CatalogExercise[], workouts: { exercises?: LoggedExercise[] }[] = []) {
  return normalizeCatalog([...(plan?.days || []).flatMap(exercisesForDay), ...library, ...workouts.flatMap((workout) => workout.exercises || [])]);
}
export function matchingExercise(catalog: CatalogExercise[], name: string) {
  return catalog.find((exercise) => exerciseKey(exercise.name) === exerciseKey(name));
}
export function exerciseDraft(exercise: PlannedExercise, id: string): ExerciseDraft {
  const name = canonicalExerciseName(exercise.name);
  const metrics = defaultMetrics({ ...exercise, name });
  return { id, name, plannedName: name, prescription: exercise.prescription, kind: exercise.kind, description: '', skipped: false, metrics, individualWeights: false,
    timeUnit: ['Walking', 'Running', 'Cycling'].includes(name) ? 'minutes' : 'seconds',
    sets: Array.from({ length: metrics.includes('reps') ? exercise.sets : 1 }, blankSet) };
}
export function inferredMetrics(exercise: LoggedExercise): ExerciseMetric[] {
  return exercise.metrics || (['reps', 'weight', 'time', 'speed', 'incline'] as const).filter((metric) => exercise.sets.some((set) => metric === 'weight' && exercise.individualWeights ? set.leftWeightKg != null || set.rightWeightKg != null : set[metricField(metric)] !== undefined && set[metricField(metric)] !== null));
}
export function editExerciseDraft(exercise: LoggedExercise): ExerciseDraft {
  const timeUnit = exercise.timeUnit || 'seconds';
  const metrics = inferredMetrics(exercise).filter((metric) => availableMetrics(exercise.name).includes(metric));
  return { ...exercise, name: canonicalExerciseName(exercise.name), skipped: false, metrics: metrics.length ? metrics : defaultMetrics(exercise), timeUnit, individualWeights: exercise.individualWeights || false,
    sets: exercise.sets.map((set) => ({ reps: String(set.reps ?? ''), weightKg: String(set.weightKg ?? ''), leftWeightKg: String(set.leftWeightKg ?? ''), rightWeightKg: String(set.rightWeightKg ?? ''), seconds: set.seconds == null ? '' : String(set.seconds / (timeUnit === 'minutes' ? 60 : 1)), speedKmph: String(set.speedKmph ?? ''), inclineDegrees: String(set.inclineDegrees ?? '') })) };
}
export const metricField = (metric: ExerciseMetric) => ({ reps: 'reps', weight: 'weightKg', time: 'seconds', speed: 'speedKmph', incline: 'inclineDegrees' } as const)[metric];

// Unit changes preserve the entered duration rather than interpreting 60s as 60min.
export function changeTimeUnit(exercise: ExerciseDraft, timeUnit: TimeUnit): ExerciseDraft {
  if (exercise.timeUnit === timeUnit) return exercise;
  const factor = timeUnit === 'minutes' ? 1 / 60 : 60;
  return { ...exercise, timeUnit, sets: exercise.sets.map((set) => ({ ...set, seconds: set.seconds.trim() && Number.isFinite(Number(set.seconds)) ? String(Number((Number(set.seconds) * factor).toPrecision(12))) : set.seconds })) };
}
export function replaceExercise(exercise: ExerciseDraft, replacement: CatalogExercise, description = ''): ExerciseDraft {
  const metrics = exercise.metrics.filter((metric) => availableMetrics(replacement.name).includes(metric));
  return { ...exercise, name: canonicalExerciseName(replacement.name), kind: replacement.kind, description,
    metrics: metrics.length ? metrics : defaultMetrics(replacement), sets: metrics.length ? exercise.sets : [blankSet()] };
}
export function completedExercises(drafts: ExerciseDraft[]): LoggedExercise[] {
  const active = drafts.filter((exercise) => !exercise.skipped);
  if (!active.length) throw new Error('Add an exercise or restore one before saving.');
  if (new Set(active.map((exercise) => exerciseKey(exercise.name))).size !== active.length) throw new Error('Use one card per exercise. Combine its sets or intervals and skip the duplicate card.');
  return active.map(({ skipped: _skipped, sets, ...exercise }) => {
    if (!exercise.name.trim()) throw new Error('Give each exercise a name.');
    if (!exercise.metrics.length || exercise.metrics.some((metric) => !availableMetrics(exercise.name).includes(metric))) throw new Error(`${exercise.name}: choose at least one supported measurement.`);
    if (!sets.length || sets.length > 30) throw new Error(`${exercise.name}: use 1–30 sets or intervals.`);
    const individualWeights = exercise.individualWeights && exercise.metrics.includes('weight');
    return { ...exercise, individualWeights, name: canonicalExerciseName(exercise.name), sets: sets.map((set, index) => {
      const result: ExerciseSet = { reps: null, weightKg: null, seconds: null, speedKmph: null, inclineDegrees: null };
      for (const metric of exercise.metrics) {
        if (metric === 'weight' && individualWeights) {
          for (const side of ['left', 'right'] as const) {
            const field = side === 'left' ? 'leftWeightKg' : 'rightWeightKg';
            const input = set[field] || ''; const value = Number(input);
            if (!input.trim() || !Number.isFinite(value) || value < 0 || value > 1000) throw new Error(`${exercise.name}, ${exercise.metrics.includes('reps') ? 'set' : 'interval'} ${index + 1}: enter ${side} hand weight from 0 to 1,000 kg.`);
            result[field] = value;
          }
          continue;
        }
        const field = metricField(metric); const input = set[field] || '';
        const value = Number(input) * (metric === 'time' && exercise.timeUnit === 'minutes' ? 60 : 1);
        const max = { reps: 1000, weight: 1000, time: 86400, speed: 100, incline: 90 }[metric];
        if (!input.trim() || !Number.isFinite(value) || value < 0 || value > max || ((metric === 'reps' || metric === 'time') && value <= 0) || (metric === 'reps' && !Number.isInteger(value))) throw new Error(`${exercise.name}, ${exercise.metrics.includes('reps') ? 'set' : 'interval'} ${index + 1}: enter a valid ${metricLabels[metric].toLowerCase()} value${metric === 'time' ? ` in ${exercise.timeUnit}` : ''}.`);
        result[field] = value;
      }
      return result;
    }) };
  });
}
export { validLoggedExercise } from '../shared/workout-validation.mjs';
export function setDetails(set: ExerciseSet, timeUnit: TimeUnit = 'seconds') {
  return [set.reps != null ? `${set.reps} reps` : '', set.leftWeightKg != null ? `Left hand ${set.leftWeightKg} kg` : '', set.rightWeightKg != null ? `Right hand ${set.rightWeightKg} kg` : '', set.weightKg != null ? `${set.weightKg} kg` : '', set.seconds != null ? `${Number((set.seconds / (timeUnit === 'minutes' ? 60 : 1)).toPrecision(12))} ${timeUnit === 'minutes' ? 'min' : 's'}` : '', set.speedKmph != null ? `${set.speedKmph} km/h` : '', set.inclineDegrees != null ? `${set.inclineDegrees}° incline` : ''].filter(Boolean).join(' · ');
}
export function workoutDetails(exercises: LoggedExercise[] = []) {
  return exercises.map((exercise) => `${canonicalExerciseName(exercise.name)}${exercise.name !== exercise.plannedName ? ` (instead of ${exercise.plannedName})` : ''}: ${exercise.sets.map((set, index) => `${inferredMetrics(exercise).includes('reps') ? 'Set' : 'Interval'} ${index + 1}: ${setDetails(set, exercise.timeUnit)}`).join(' · ')}${exercise.description ? `\n${exercise.description}` : ''}`).join('\n');
}
