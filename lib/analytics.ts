import type { Meal, StepEntry, WaterEntry, Workout, WeighIn } from './store';
import { shiftDay } from './dates';

export type Logs = { meals: Meal[]; workouts: Workout[]; weighIns: WeighIn[]; water: Record<string, number>; waterEntries: WaterEntry[]; stepEntries: StepEntry[] };
export type DailyTotals = { date: string; calories: number; protein: number; water: number; steps: number; workoutMinutes: number; meals: number; workouts: number; weightKg: number | null };

export function dailyTotals(logs: Logs, date: string): DailyTotals {
  const meals = logs.meals.filter((entry) => entry.date === date);
  const workouts = logs.workouts.filter((entry) => entry.date === date);
  const latestWeight = [...logs.weighIns].filter((entry) => entry.date <= date).sort((a, b) => b.date.localeCompare(a.date))[0];
  return { date, calories: meals.reduce((sum, entry) => sum + entry.calories, 0), protein: meals.reduce((sum, entry) => sum + entry.protein, 0),
    water: logs.water[date] || logs.waterEntries.filter((entry) => entry.date === date).reduce((sum, entry) => sum + entry.ml, 0),
    steps: logs.stepEntries.filter((entry) => entry.date === date).reduce((sum, entry) => sum + entry.count, 0),
    workoutMinutes: workouts.reduce((sum, entry) => sum + entry.minutes, 0), meals: meals.length, workouts: workouts.length, weightKg: latestWeight?.kg ?? null };
}

export function rangeTotals(logs: Logs, start: string, end: string) {
  const days: DailyTotals[] = [];
  for (let day = start; day <= end && days.length < 366; day = shiftDay(day, 1)) days.push(dailyTotals(logs, day));
  return days;
}
