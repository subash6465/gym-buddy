import assert from 'node:assert/strict';
import test from 'node:test';
import { ageOnDate, suggestedTargets, planTargets } from '../lib/targets.ts';
import { withSavedMeal } from '../lib/meals.ts';

test('age changes on the birthday', () => {
  assert.equal(ageOnDate('2000-10-08', new Date(2026, 9, 7)), 25);
  assert.equal(ageOnDate('2000-10-08', new Date(2026, 9, 8)), 26);
  assert.equal(ageOnDate('2027-01-01', new Date(2026, 9, 8)), null);
});

test('targets use age, weight, height, activity and goal', () => {
  const profile = { dob: '1996-01-01', heightCm: '175', equation: 'male', activity: 'moderate', goal: 'maintain', nutritionCaution: false };
  const base = suggestedTargets(profile, 80, new Date(2026, 9, 7));
  assert.ok(base.calories > base.resting);
  assert.equal(base.protein, 112);
  assert.equal(base.water, 3000);
  assert.ok(suggestedTargets({ ...profile, goal: 'lose' }, 80, new Date(2026, 9, 7)).calories < base.calories);
  assert.equal(suggestedTargets({ ...profile, nutritionCaution: true }, 80, new Date(2026, 9, 7)), null);
});

test('main meals are unique each day while snacks can repeat', () => {
  const meal = (id, type, date = '2026-10-07') => ({ id, type, date, time: '12:00', name: id, note: '', calories: 100, protein: 1, carbs: 1, fat: 1, fibre: 1, sugar: 1 });
  const list = [meal('old', 'breakfast'), meal('other day', 'breakfast', '2026-10-06'), meal('snack 1', 'snack')];
  assert.deepEqual(withSavedMeal(list, meal('new', 'breakfast')).map((entry) => entry.id), ['new', 'other day', 'snack 1']);
  assert.deepEqual(withSavedMeal(list, meal('snack 2', 'snack')).map((entry) => entry.id), ['snack 2', 'old', 'other day', 'snack 1']);
});

test('clinical profiles cannot fall back to a legacy automated plan', () => {
  const profile = { dob: '1996-01-01', heightCm: '175', equation: 'male', activity: 'moderate', goal: 'maintain', nutritionCaution: false, healthConditions: ['diabetes'], concerns: '' };
  const legacy = { calorieTarget: 2000, proteinGrams: 120, waterMl: 2500, stepsTarget: 8000 };
  assert.equal(planTargets(profile, 80, legacy), null);
  const clinical = { ...legacy, calorieTarget: 1800, proteinGrams: 45, waterMl: 1200, nutrition: { calorieSource: 'clinician', requiresClinicianReview: true } };
  assert.equal(planTargets(profile, 80, clinical).calories, 1800);
  assert.equal(planTargets(profile, 80, clinical).protein, 45);
  assert.equal(suggestedTargets({ ...profile, healthConditions: [], heightCm: 'invalid' }, 80), null);
});
