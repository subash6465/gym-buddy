import type { Data, Profile } from './store';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const numericFields = {
  meals: ['calories', 'protein', 'carbs', 'fat', 'fibre', 'sugar'],
  workouts: ['minutes'], weighIns: ['kg'], waterEntries: ['ml'], stepEntries: ['count'],
} as const;
const stringFields = {
  meals: ['id', 'date', 'name', 'note'], workouts: ['id', 'date', 'name', 'note'],
  weighIns: ['id', 'date'], waterEntries: ['id', 'date', 'time'], stepEntries: ['id', 'date', 'time'],
} as const;

// Reject damaged caches instead of replacing them with empty logs. Keep migration
// defaults for older caches that predate meal times, steps, or water entries.
export function restoreData(raw: string | null, initial: Data, profile: Profile | null): Data {
  const saved: unknown = raw ? JSON.parse(raw) : {};
  if (!isRecord(saved) || (saved.profile !== undefined && !isRecord(saved.profile))) throw new Error('Invalid saved activity.');
  if (saved.historyStartDay !== undefined && typeof saved.historyStartDay !== 'string') throw new Error('Invalid history start date.');
  for (const key of Object.keys(numericFields) as (keyof typeof numericFields)[]) {
    const entries = saved[key];
    if (entries === undefined) continue;
    if (!Array.isArray(entries) || entries.some((entry) => !isRecord(entry) ||
        stringFields[key].some((field) => typeof entry[field] !== 'string') ||
        numericFields[key].some((field) => typeof entry[field] !== 'number' || !Number.isFinite(entry[field]) || entry[field] < 0))) {
      throw new Error('Invalid saved activity.');
    }
  }
  if (saved.water !== undefined && (!isRecord(saved.water) || Object.values(saved.water).some((value) => typeof value !== 'number' || !Number.isFinite(value) || value < 0))) {
    throw new Error('Invalid saved water activity.');
  }
  const data = saved as Partial<Data>;
  if ((data.meals || []).some((meal) =>
      (meal.type !== undefined && !['', 'breakfast', 'lunch', 'dinner', 'snack'].includes(meal.type)) ||
      (meal.time !== undefined && typeof meal.time !== 'string') ||
      ['addedSugar', 'saturatedFat'].some((key) => {
        const amount = meal[key as 'addedSugar' | 'saturatedFat'];
        return amount !== undefined && amount !== null && (!Number.isFinite(amount) || amount < 0);
      }))) throw new Error('Invalid saved meal.');
  return {
    ...initial, ...data,
    profile: { ...initial.profile, ...data.profile, ...profile },
    meals: (data.meals || []).map((meal) => ({ ...meal, type: meal.type || 'snack', time: meal.time || '12:00' })),
  };
}
