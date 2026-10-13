import assert from 'node:assert/strict';
import test from 'node:test';
import { progressSeries, progressSummary } from '../lib/progress.ts';

const day = (date, fields = {}) => ({ date, calories: 0, protein: 0, water: 0, steps: 0, workoutMinutes: 0, meals: 0, workouts: 0, weightKg: null, ...fields });

test('unlogged nutrition days remain unknown and do not lower the logged-day average', () => {
  const series = progressSeries([day('2026-10-11', { meals: 2, calories: 1200 }), day('2026-10-12'), day('2026-10-13', { meals: 3, calories: 1800 })], [], 'calories');
  assert.equal(series[1].value, null);
  assert.equal(progressSummary(series).average, 1500);
  assert.equal(progressSummary(series).recorded.length, 2);
});

test('weight charts show recorded measurements rather than carried-forward weights', () => {
  const days = [day('2026-10-11', { weightKg: 80 }), day('2026-10-12', { weightKg: 80 }), day('2026-10-13', { weightKg: 79.5 })];
  const weights = [{ id: 'new', date: '2026-10-13', kg: 79.5 }, { id: 'old', date: '2026-10-11', kg: 80 }];
  assert.deepEqual(progressSeries(days, weights, 'weight').map((point) => point.value), [80, null, 79.5]);
  assert.equal(progressSummary(progressSeries(days, weights, 'weight')).latest.value, 79.5);
});

test('an explicitly logged zero is distinct from an empty period', () => {
  assert.equal(progressSummary(progressSeries([day('2026-10-13', { meals: 1 })], [], 'calories')).average, 0);
  assert.equal(progressSummary(progressSeries([day('2026-10-13')], [], 'calories')).average, null);
  assert.equal(progressSummary([]).latest, null);
});
