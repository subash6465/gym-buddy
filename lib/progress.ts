import type { DailyTotals } from './analytics';
import type { WeighIn } from './store';

export type ProgressMetric = 'steps' | 'water' | 'calories' | 'workoutMinutes' | 'weight';
export type ProgressPoint = { date: string; value: number | null };

export function progressSeries(days: DailyTotals[], weights: WeighIn[], metric: ProgressMetric): ProgressPoint[] {
  return days.map((day) => {
    if (metric === 'weight') {
      // DailyTotals carries the previous weight forward. A chart point must be an actual measurement.
      const entry = weights.find((weight) => weight.date === day.date);
      return { date: day.date, value: entry?.kg ?? null };
    }
    const logged = metric === 'calories' ? day.meals > 0 : metric === 'workoutMinutes' ? day.workouts > 0
      : metric === 'water' ? day.water > 0 : day.steps > 0;
    return { date: day.date, value: logged ? day[metric] : null };
  });
}

export function progressSummary(points: ProgressPoint[]) {
  const recorded = points.filter((point) => point.value !== null);
  const total = recorded.reduce((sum, point) => sum + point.value!, 0);
  return { recorded, total, average: recorded.length ? total / recorded.length : null, latest: recorded.at(-1) ?? null };
}
