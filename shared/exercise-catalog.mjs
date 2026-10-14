// Shared by planning, AI matching and the logger so spelling/location do not
// create separate exercises. Equipment or grip variants of lifts stay distinct.
export const exerciseNamingGuidance = 'Use one canonical exercise name throughout the whole plan and catalog. Walking includes walk, cooldown walk, post-workout walk, outdoor walking and treadmill walking. Running includes running, jogging, street running and treadmill running. Cycling includes cycling, bicycling, bike and stationary cycling. Never create separate exercises for location, warmup/cooldown role or spelling synonyms; put that context in the prescription. Combine repeated Walking, Running or Cycling entries within a session into one exercise. Walking supports optional time, speed in km/h and incline in degrees. Cycling supports optional time and speed in km/h. Running records time only. Speed is available only for Walking and Cycling. Incline is available only for Walking. Never offer speed or incline for lifts, planks or other exercises. Measurements are independently optional: reps (with sets), weight in kg, time in seconds or minutes, speed in km/h and incline in degrees. Squats can be reps only or reps plus weight; planks can be time only or time plus weight. Do not require weights for all strength exercises or exclude weights for timed holds. Preserve genuinely different lifts, grips and equipment variants.';

export function canonicalExerciseName(name) {
  const clean = name.trim().replace(/\s+/g, ' ').replace(/\s*[:–—-]?\s*\(?\d+\s*(?:sets?\b|[x×]|reps?\b|min(?:ute)?s?\b|sec(?:ond)?s?\b).*$/i, '').trim();
  const words = (clean || name.trim()).toLowerCase().replace(/[-_]/g, ' ');
  // Carries, lunges and specialised drills are distinct from ordinary walking.
  if (!/\b(farmer|carry|lunge|crab|bear|duck|band|handstand)\b/.test(words)) {
    if (/\b(walk|walks|walking)\b/.test(words)) return 'Walking';
    if (/\b(run|runs|running|jog|jogging)\b/.test(words)) return 'Running';
  }
  if (!/\b(crunch|crunches|kick|kicks)\b/.test(words) && /\b(cycling|bicycling|bicylcing|bicycle|bicycles|bike|biking|cycle|exercise bike|spin bike)\b/.test(words)) return 'Cycling';
  const aliases = { 'push up': 'Push-up', 'push ups': 'Push-up', pushup: 'Push-up', pushups: 'Push-up', 'pull up': 'Pull-up', 'pull ups': 'Pull-up', pullup: 'Pull-up', pullups: 'Pull-up', squats: 'Squat', squat: 'Squat', planks: 'Plank', plank: 'Plank', 'hammer curls': 'Hammer curl', 'hammer curl': 'Hammer curl', 'bench presses': 'Bench press', 'bench press': 'Bench press' };
  return aliases[words] || clean.replace(/\b(dumbbells|barbells|curls|presses|rows)\b/gi, (word) => ({ dumbbells: 'dumbbell', barbells: 'barbell', curls: 'curl', presses: 'press', rows: 'row' })[word.toLowerCase()]) || name.trim();
}

export function exerciseKey(name) {
  return canonicalExerciseName(name).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export function normalizeCatalog(entries) {
  const unique = new Map();
  for (const entry of entries) {
    const name = canonicalExerciseName(entry.name);
    const key = exerciseKey(name);
    if (key && !unique.has(key)) unique.set(key, { name, kind: ['Walking', 'Running', 'Cycling'].includes(name) ? 'timed' : entry.kind });
  }
  return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function normalizePlannedExercises(entries) {
  const unique = new Map();
  for (const exercise of entries) {
    const name = canonicalExerciseName(exercise.name);
    const key = exerciseKey(name);
    const cardio = ['Walking', 'Running', 'Cycling'].includes(name);
    const current = unique.get(key);
    if (current) {
      current.prescription = [...new Set([current.prescription, exercise.prescription].filter(Boolean))].join('; ').slice(0, 360);
      if (!cardio) current.sets = Math.min(12, current.sets + exercise.sets);
    } else unique.set(key, { ...exercise, name, ...(cardio ? { kind: 'timed', sets: 1 } : {}) });
  }
  return [...unique.values()];
}
