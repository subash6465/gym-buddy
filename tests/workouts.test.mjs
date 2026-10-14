import assert from 'node:assert/strict';
import test from 'node:test';
import { availableMetrics, changeTimeUnit, completedExercises, editExerciseDraft, exerciseCatalog, exerciseDraft, exercisesForDay, matchingExercise, replaceExercise, trainingSessions, workoutDetails } from '../lib/workouts.ts';
import { canonicalExerciseName, normalizeCatalog } from '../shared/exercise-catalog.mjs';
import { restoreData } from '../lib/persistence.ts';
import { identifyExercise, validateExerciseIdentity } from '../server/exercises.mjs';

const day = { day: 'Monday', title: 'Upper A', focus: 'Strength', isRest: false, minutes: 45, activities: ['Bench press — 3 × 8–12', 'Dumbbell curl: 2 sets of 10 reps', 'Plank — 3 × 30 seconds', 'Walk 20 minutes'] };
const initial = { profile: {}, meals: [], workouts: [], weighIns: [], water: {}, waterEntries: [], stepEntries: [] };

test('training-day numbering excludes recovery and legacy prescriptions become individual drafts', () => {
  const sessions = trainingSessions({ days: [day, { ...day, day: 'Tuesday', isRest: true }, { ...day, day: 'Thursday', title: 'Lower A' }] });
  assert.deepEqual(sessions.map((session) => [session.key, session.label]), [['Monday', 'Day 1'], ['Thursday', 'Day 2']]);
  const exercises = exercisesForDay(day);
  assert.deepEqual(exercises.map((exercise) => [exercise.name, exercise.sets, exercise.kind]), [['Bench press', 3, 'strength'], ['Dumbbell curl', 2, 'strength'], ['Plank', 3, 'timed'], ['Walking', 1, 'timed']]);
  assert.deepEqual(exerciseDraft(exercises[0], 'bench').sets, Array(3).fill({ reps: '', weightKg: '', leftWeightKg: '', rightWeightKg: '', seconds: '', speedKmph: '', inclineDegrees: '' }));
  assert.deepEqual(exercisesForDay({ ...day, exercises: [{ name: 'Row', sets: 4, kind: 'strength', prescription: '4 × 10' }] }), [{ name: 'Row', sets: 4, kind: 'strength', prescription: '4 × 10' }]);
});

test('completed workouts keep actual per-set values, substitutions and descriptions, excluding skipped exercises', () => {
  const drafts = exercisesForDay(day).map((exercise, index) => exerciseDraft(exercise, String(index)));
  drafts[0].skipped = true;
  drafts[1].metrics = ['reps', 'weight']; drafts[1].name = 'Hammer curl'; drafts[1].description = 'Standing with a neutral grip';
  drafts[1].sets = [{ reps: '12', weightKg: '7.5', seconds: '' }, { reps: '9', weightKg: '10', seconds: '' }];
  drafts[2].sets = [{ reps: '', weightKg: '', seconds: '45' }];
  drafts[3].skipped = true;
  const completed = completedExercises(drafts);
  assert.deepEqual(completed.map((exercise) => exercise.name), ['Hammer curl', 'Plank']);
  assert.equal(completed[0].plannedName, 'Dumbbell curl');
  assert.deepEqual(completed[0].sets, [{ reps: 12, weightKg: 7.5, seconds: null, speedKmph: null, inclineDegrees: null }, { reps: 9, weightKg: 10, seconds: null, speedKmph: null, inclineDegrees: null }]);
  assert.equal(completed[1].sets[0].seconds, 45);
  assert.match(workoutDetails(completed), /Hammer curl \(instead of Dumbbell curl\).*12 reps.*7.5 kg/);
  assert.equal(editExerciseDraft(completed[0]).sets[1].weightKg, '10');
  const workout = { id: 'workout', date: '2026-10-14', name: 'Upper A', time: '10:00', minutes: 45, note: '', planDay: 'Monday', planLabel: 'Day 1', exercises: completed };
  assert.deepEqual(restoreData(JSON.stringify({ workouts: [workout] }), initial, null).workouts, [workout]);
  assert.equal(drafts[0].skipped, true);
});

test('empty, partial and invalid exercise sets cannot be logged, while bodyweight is explicit zero', () => {
  const draft = exerciseDraft({ name: 'Squat', kind: 'strength', sets: 1, prescription: '' }, 'squat');
  assert.throws(() => completedExercises([draft]), /Squat, set 1/);
  draft.metrics = ['reps', 'weight'];
  for (const [reps, weightKg] of [['1.5', '5'], ['0', '10'], ['10', '-1'], ['10', ''], ['1001', '5'], ['10', 'Infinity']]) {
    assert.throws(() => completedExercises([{ ...draft, sets: [{ reps, weightKg, seconds: '' }] }]));
  }
  assert.equal(completedExercises([{ ...draft, sets: [{ reps: '10', weightKg: '0', seconds: '' }] }])[0].sets[0].weightKg, 0);
  assert.throws(() => completedExercises([{ ...draft, skipped: true }]), /restore one/);
  const timed = { ...draft, metrics: ['time'], kind: 'timed', sets: [{ seconds: '0', reps: '', weightKg: '' }] };
  assert.throws(() => completedExercises([timed]), /time/);
});

test('nested workout corruption is rejected and old summary-only workouts still restore', () => {
  const workout = { id: 'w', date: '2026-10-14', name: 'Training', minutes: 30, note: '' };
  assert.deepEqual(restoreData(JSON.stringify({ workouts: [workout] }), initial, null).workouts, [workout]);
  const exercise = completedExercises([{ ...exerciseDraft({ name: 'Squat', kind: 'strength', sets: 1, prescription: '' }, 's'), sets: [{ reps: '10', weightKg: '0', seconds: '' }] }])[0];
  for (const exercises of [null, [null], [{ ...exercise, sets: [] }], [{ ...exercise, sets: [{ reps: -1, weightKg: 5, seconds: null }] }], [{ ...exercise, description: 3 }]]) {
    assert.throws(() => restoreData(JSON.stringify({ workouts: [{ ...workout, exercises }] }), initial, null));
  }
});

test('exercise identification validates input, preserves ambiguity and rejects malformed provider output', async () => {
  assert.throws(() => validateExerciseIdentity({ name: '', kind: 'strength', confidence: 'high', explanation: '' }), { status: 502 });
  await assert.rejects(identifyExercise('', {}), { status: 400 });
  const original = globalThis.fetch;
  let request;
  const identity = { name: 'Hammer curl', kind: 'strength', confidence: 'low', explanation: 'Confirm that your palms faced each other.' };
  globalThis.fetch = async (_url, options) => {
    request = JSON.parse(options.body);
    return new Response(JSON.stringify({ output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(identity) }] }] }));
  };
  try {
    assert.deepEqual(await identifyExercise('Standing, lifting a dumbbell towards my face', { provider: 'openai', apiKey: 'fake-test-key' }), identity);
    assert.match(request.instructions, /cannot distinguish hammer curls/);
    assert.equal(JSON.parse(request.input[0].content).description, 'Standing, lifting a dumbbell towards my face');
  } finally { globalThis.fetch = original; }
});

test('plan and remembered exercise lists deduplicate synonyms and preserve distinct lifts', () => {
  const plan = { days: [{ ...day, exercises: [
    { name: 'Cooldown walk', kind: 'timed', sets: 1, prescription: '5 minutes after training' },
    { name: 'Treadmill walking', kind: 'timed', sets: 1, prescription: '10 minutes before training' },
    { name: 'Bicycling', kind: 'timed', sets: 1, prescription: '20 minutes' },
  ] }, { ...day, day: 'Thursday', exercises: [{ name: 'Hammer curls', kind: 'strength', sets: 3, prescription: '3 × 10' }] }] };
  assert.deepEqual(exercisesForDay(plan.days[0]).map((exercise) => exercise.name), ['Walking', 'Cycling']);
  assert.match(exercisesForDay(plan.days[0])[0].prescription, /5 minutes.*10 minutes/);
  const library = [{ name: 'Cycling', kind: 'timed' }, { name: 'Running in street', kind: 'timed' }, { name: 'Dumbbell biceps curl', kind: 'strength' }];
  const catalog = exerciseCatalog(plan, library, [{ exercises: [{ name: 'Treadmill running', kind: 'timed' }] }]);
  assert.deepEqual(catalog.map((exercise) => exercise.name), ['Cycling', 'Dumbbell biceps curl', 'Hammer curl', 'Running', 'Walking']);
  assert.equal(matchingExercise(catalog, 'post-workout walk').name, 'Walking');
  assert.equal(matchingExercise(catalog, 'Hammer curls').name, 'Hammer curl');
  assert.equal(canonicalExerciseName('Farmer carry walk'), 'Farmer carry walk');
  assert.equal(canonicalExerciseName('Bicycle crunch'), 'Bicycle crunch');
  assert.equal(canonicalExerciseName('10 minutes cooldown walking'), 'Walking');
  const remembered = normalizeCatalog([...library, { name: 'Stationary bike', kind: 'timed' }]);
  const restored = restoreData(JSON.stringify({ exerciseLibrary: remembered }), initial, null);
  assert.deepEqual(restored.exerciseLibrary, normalizeCatalog(library));
});

test('reps do not require weights, holds can include weights and selected measurements survive restoration', () => {
  const squat = exerciseDraft({ name: 'Squat', kind: 'strength', sets: 1, prescription: '' }, 'sq');
  squat.sets[0].reps = '10';
  assert.equal(completedExercises([squat])[0].sets[0].weightKg, null);
  assert.throws(() => completedExercises([squat, { ...squat, id: 'duplicate', name: 'Squats' }]), /one card per exercise/);
  const plank = exerciseDraft({ name: 'Plank', kind: 'timed', sets: 1, prescription: '' }, 'p');
  plank.metrics = ['time', 'weight']; plank.sets[0].seconds = '45'; plank.sets[0].weightKg = '5';
  const logged = completedExercises([plank])[0];
  assert.equal(logged.sets[0].weightKg, 5); assert.equal(logged.sets[0].seconds, 45);
  const workout = { id: 'w', date: '2026-10-14', name: 'Core', minutes: 15, note: '', exercises: [logged] };
  assert.deepEqual(restoreData(JSON.stringify({ workouts: [workout] }), initial, null).workouts[0].exercises, [logged]);
  assert.deepEqual(editExerciseDraft(logged).metrics, ['time', 'weight']);
  assert.match(workoutDetails([logged]), /5 kg.*45 s/);
  assert.throws(() => completedExercises([{ ...plank, metrics: [] }]));
});

test('incline is walking only; speed is walking and cycling only', () => {
  const walking = exerciseDraft({ name: 'Treadmill walking', kind: 'timed', sets: 1, prescription: '' }, 'walk');
  walking.metrics = ['time', 'speed', 'incline']; walking.sets[0].seconds = '12.5'; walking.sets[0].speedKmph = '5.5'; walking.sets[0].inclineDegrees = '8';
  const logged = completedExercises([walking])[0];
  assert.equal(logged.name, 'Walking'); assert.equal(logged.sets[0].seconds, 750);
  assert.equal(logged.sets[0].speedKmph, 5.5); assert.equal(logged.sets[0].inclineDegrees, 8);
  assert.match(workoutDetails([logged]), /12.5 min.*5.5 km\/h.*8° incline/);
  assert.equal(editExerciseDraft(logged).sets[0].seconds, '12.5');
  const inSeconds = changeTimeUnit(walking, 'seconds');
  assert.equal(inSeconds.sets[0].seconds, '750');
  assert.equal(changeTimeUnit(inSeconds, 'minutes').sets[0].seconds, '12.5');
  assert.deepEqual(availableMetrics('Stationary bike'), ['time', 'speed']);
  assert.deepEqual(availableMetrics('Treadmill walking'), ['time', 'speed', 'incline']);
  assert.deepEqual(availableMetrics('Running in street'), ['time']);
  assert.deepEqual(availableMetrics('Squat'), ['reps', 'weight', 'time']);
  assert.deepEqual(availableMetrics('Plank'), ['reps', 'weight', 'time']);
  const cycling = replaceExercise(walking, { name: 'Bicycling', kind: 'timed' });
  assert.deepEqual(cycling.metrics, ['time', 'speed']);
  assert.equal(completedExercises([cycling])[0].sets[0].speedKmph, 5.5);
  assert.equal(completedExercises([cycling])[0].sets[0].inclineDegrees, null);
  assert.throws(() => completedExercises([{ ...cycling, metrics: ['time', 'incline'] }]));
  const squat = replaceExercise(walking, { name: 'Squat', kind: 'strength' });
  assert.deepEqual(squat.metrics, ['time']);
  assert.throws(() => completedExercises([{ ...squat, metrics: ['time', 'speed'] }]));
  const older = { ...logged, name: 'Squat', metrics: ['time', 'speed', 'incline'] };
  assert.deepEqual(editExerciseDraft(older).metrics, ['time']);
  assert.throws(() => completedExercises([{ ...walking, sets: [{ ...walking.sets[0], inclineDegrees: '91' }] }]));
  assert.throws(() => completedExercises([{ ...walking, sets: [{ ...walking.sets[0], speedKmph: '-2' }] }]));
});

test('AI receives the full existing list and reuses a described exercise instead of inventing a duplicate', async () => {
  const original = globalThis.fetch;
  const catalog = [{ name: 'Walking', kind: 'timed' }, { name: 'Hammer curl', kind: 'strength' }];
  let request;
  globalThis.fetch = async (_url, options) => {
    request = JSON.parse(options.body);
    return new Response(JSON.stringify({ output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ name: 'Standing neutral grip dumbbell curl', kind: 'strength', confidence: 'high', explanation: 'Same exercise as your saved hammer curl.', existingName: 'Hammer curl' }) }] }] }));
  };
  try {
    const result = await identifyExercise('I curled dumbbells with my thumbs pointing up', { provider: 'openai', apiKey: 'fake-test-key' }, catalog);
    assert.equal(result.name, 'Hammer curl'); assert.equal(result.existingName, 'Hammer curl');
    assert.deepEqual(JSON.parse(request.input[0].content).exercises, normalizeCatalog(catalog));
    assert.match(request.instructions, /Only if it is genuinely absent/);
    assert.equal(validateExerciseIdentity({ name: 'Cooldown walk', kind: 'timed', confidence: 'high', explanation: '' }, catalog).name, 'Walking');
    assert.throws(() => validateExerciseIdentity({ name: 'Curl', kind: 'strength', confidence: 'high', explanation: '', existingName: 'Invented exercise' }, catalog), { status: 502 });
    await assert.rejects(identifyExercise('Curl', {}, [{ name: '', kind: 'strength' }]), { status: 400 });
  } finally { globalThis.fetch = original; }
});

test('individual hand weights persist separately across sets, history and editing', () => {
  const draft = exerciseDraft({ name: 'Dumbbell curl', kind: 'strength', sets: 2, prescription: '2 × 10' }, 'curl');
  draft.metrics = ['reps', 'weight']; draft.individualWeights = true;
  draft.sets[0] = { ...draft.sets[0], reps: '10', weightKg: '99', leftWeightKg: '7.5', rightWeightKg: '10' };
  draft.sets[1] = { ...draft.sets[1], reps: '8', leftWeightKg: '5', rightWeightKg: '0' };
  const logged = completedExercises([draft])[0];
  assert.equal(logged.individualWeights, true);
  assert.deepEqual(logged.sets.map((set) => [set.leftWeightKg, set.rightWeightKg, set.weightKg]), [[7.5, 10, null], [5, 0, null]]);
  assert.match(workoutDetails([logged]), /Left hand 7.5 kg.*Right hand 10 kg/);
  assert.match(workoutDetails([logged]), /Left hand 5 kg.*Right hand 0 kg/);
  const workout = { id: 'w', date: '2026-10-14', name: 'Upper', minutes: 30, note: '', exercises: [logged] };
  const restored = restoreData(JSON.stringify({ workouts: [workout] }), initial, null).workouts[0].exercises[0];
  assert.deepEqual(restored, logged);
  const edit = editExerciseDraft(restored);
  assert.equal(edit.individualWeights, true);
  assert.equal(edit.sets[0].leftWeightKg, '7.5'); assert.equal(edit.sets[0].rightWeightKg, '10');
  edit.sets[1].rightWeightKg = '6';
  assert.equal(completedExercises([edit])[0].sets[1].rightWeightKg, 6);
});

test('hand-weight mode requires both actual weights and rejects corrupted saved values', () => {
  const draft = exerciseDraft({ name: 'Dumbbell press', kind: 'strength', sets: 1, prescription: '' }, 'press');
  draft.metrics = ['weight']; draft.individualWeights = true;
  draft.sets[0].weightKg = '20';
  assert.throws(() => completedExercises([draft]), /left hand weight/);
  draft.sets[0].leftWeightKg = '10';
  assert.throws(() => completedExercises([draft]), /right hand weight/);
  for (const invalid of ['-1', 'Infinity', '1001', ' ']) {
    draft.sets[0].rightWeightKg = invalid;
    assert.throws(() => completedExercises([draft]), /right hand weight/);
  }
  draft.sets[0].rightWeightKg = '10';
  const logged = completedExercises([draft])[0];
  const workout = { id: 'w', date: '2026-10-14', name: 'Upper', minutes: 30, note: '' };
  for (const invalid of [
    { ...logged, individualWeights: 'yes' },
    { ...logged, individualWeights: false },
    { ...logged, sets: [{ ...logged.sets[0], leftWeightKg: null }] },
    { ...logged, sets: [{ ...logged.sets[0], rightWeightKg: -1 }] },
    { ...logged, sets: [{ ...logged.sets[0], weightKg: 20 }] },
  ]) assert.throws(() => restoreData(JSON.stringify({ workouts: [{ ...workout, exercises: [invalid] }] }), initial, null));
});

test('shared weights and old logs remain single values without guessing left or right weights', () => {
  const draft = exerciseDraft({ name: 'Goblet squat', kind: 'strength', sets: 1, prescription: '' }, 'squat');
  draft.metrics = ['reps', 'weight'];
  draft.sets[0] = { ...draft.sets[0], reps: '12', weightKg: '20', leftWeightKg: '10', rightWeightKg: '10' };
  const logged = completedExercises([draft])[0];
  assert.equal(logged.individualWeights, false); assert.equal(logged.sets[0].weightKg, 20);
  assert.equal(logged.sets[0].leftWeightKg, undefined); assert.equal(logged.sets[0].rightWeightKg, undefined);
  assert.doesNotMatch(workoutDetails([logged]), /Left hand|Right hand/);
  const { individualWeights: _mode, ...legacy } = logged;
  const edit = editExerciseDraft(legacy);
  assert.equal(edit.individualWeights, false); assert.equal(edit.sets[0].weightKg, '20');
  assert.equal(edit.sets[0].leftWeightKg, ''); assert.equal(edit.sets[0].rightWeightKg, '');
  assert.throws(() => completedExercises([{ ...edit, individualWeights: true }]), /left hand weight/);
  const repsOnly = completedExercises([{ ...draft, individualWeights: true, metrics: ['reps'] }])[0];
  assert.equal(repsOnly.individualWeights, false); assert.equal(repsOnly.sets[0].weightKg, null);
});
