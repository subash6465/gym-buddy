import type { DailyTotals, Logs } from './analytics';
import { rangeTotals } from './analytics';
import { daysBetween, localDay, parseDay, shiftDay } from './dates';
import type { Profile } from './store';

export type ReviewKind = 'weekly' | 'monthly';
export type Review = { kind: ReviewKind; startDay: string; endDay: string; summary: string; wins: string[]; improvements: string[]; nextSteps: string[]; generatedAt: string };
export type ReviewJob = { kind: ReviewKind; startDay: string; endDay: string; days: DailyTotals[]; profile: Pick<Profile, 'goal' | 'activity' | 'daysPerWeek' | 'pace' | 'nutritionCaution' | 'concerns' | 'allergies'>; targets: { calories: number; protein: number; water: number; steps: number } | null };
export type Period = Pick<Review, 'kind' | 'startDay' | 'endDay'>;

function anniversary(start: string, months: number) {
  const date = parseDay(start)!;
  const first = new Date(date.getFullYear(), date.getMonth() + months, 1, 12);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  first.setDate(Math.min(date.getDate(), last));
  return localDay(first);
}

export function completedPeriods(start: string, current: string): Period[] {
  if (!parseDay(start) || !parseDay(current) || start > current) return [];
  const result: Period[] = [];
  for (let offset = 0; offset + 7 <= daysBetween(start, current) && result.length < 5200; offset += 7) {
    const startDay = shiftDay(start, offset);
    result.push({ kind: 'weekly', startDay, endDay: shiftDay(startDay, 6) });
  }
  for (let index = 0; index < 1200; index++) {
    const startDay = anniversary(start, index);
    const next = anniversary(start, index + 1);
    if (next > current) break;
    result.push({ kind: 'monthly', startDay, endDay: shiftDay(next, -1) });
  }
  return result.sort((a, b) => a.endDay.localeCompare(b.endDay) || a.kind.localeCompare(b.kind));
}

export function reviewJob(period: Period, logs: Logs, profile: Profile, targets: ReviewJob['targets']): ReviewJob {
  return { ...period, days: rangeTotals(logs, period.startDay, period.endDay),
    profile: { goal: profile.goal, activity: profile.activity, daysPerWeek: profile.daysPerWeek, pace: profile.pace,
      nutritionCaution: profile.nutritionCaution, concerns: profile.concerns, allergies: profile.allergies }, targets };
}
