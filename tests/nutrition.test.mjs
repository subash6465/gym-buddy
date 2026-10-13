import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeNutrition } from '../server/nutrition.mjs';
import { validateNutritionProfile, nutritionRestrictions } from '../shared/nutrition-profile.mjs';
import { validateMealNutrition } from '../server/meal-nutrition.mjs';
import { macroTotals, macroGuides, macroAmount } from '../lib/macros.ts';
import { stageProfilePlan, takeProfilePlan } from '../server/profile-approval.mjs';
import { stagePlan, takeApprovedPlan } from '../server/plan-approval.mjs';

const profile = { weightKg: 80, concerns: '', healthConditions: [], clinicianTargets: {} };
const plan = { calorieTarget: 2000, proteinGrams: 120, waterMl: 2500 };
const proposal = { carbsGrams: 900, fatGrams: 900, fibreGrams: 90, addedSugarLimitGrams: 100, saturatedFatLimitGrams: 100, requiresClinicianReview: false, rationale: 'Supports the training schedule.' };

test('AI proposals are bounded and reconcile to the approved calorie budget', () => {
  const result = normalizeNutrition(proposal, profile, plan);
  const g = result.nutrition.guides;
  assert.ok(Math.abs(g.protein.value * 4 + g.carbs.value * 4 + g.fat.value * 9 - 2000) <= 5);
  assert.ok(g.carbs.value >= 225 && g.carbs.value <= 325);
  assert.ok(g.fat.value <= 78 && g.fat.value >= 44);
  assert.equal(g.fibre.value, 40);
  assert.equal(g.addedSugar.value, 50);
  assert.equal(g.addedSugar.kind, 'limit');
  assert.equal(g.saturatedFat.value, 22);
  assert.equal(g.sugar.kind, 'informational');
  assert.equal(g.sugar.value, undefined);
  assert.equal(g.carbs.source, 'ai');
  assert.equal(g.carbs.adjusted, true);
});

test('structured and free-text medical context pauses automatic targets', () => {
  for (const change of [{ healthConditions: ['diabetes'] }, { healthConditions: ['kidney-disease'] }, { nutritionCaution: true }, { concerns: 'I use insulin' }, { concerns: 'pregnant' }]) {
    const result = normalizeNutrition(proposal, { ...profile, ...change }, plan);
    assert.equal(result.calorieTarget, 0);
    assert.equal(result.proteinGrams, 0);
    assert.equal(result.waterMl, 0);
    assert.equal(result.nutrition.guides.carbs.kind, 'clinician-required');
    assert.equal(result.nutrition.requiresClinicianReview, true);
  }
  assert.equal(nutritionRestrictions({ ...profile, concerns: 'high cholesterol' }).highCholesterol, true);
  assert.equal(normalizeNutrition(proposal, { ...profile, healthConditions: ['high-cholesterol'] }, plan).nutrition.guides.saturatedFat.value, 13);
});

test('clinician targets survive AI bounds verbatim, including a renal protein target', () => {
  const targets = { calories: 1800, protein: 45, carbs: 270, fat: 60, fibre: 22, addedSugar: 15, saturatedFat: 8, water: 1200 };
  const result = normalizeNutrition(proposal, { ...profile, healthConditions: ['kidney-disease'], clinicianTargets: targets }, plan);
  assert.equal(result.calorieTarget, 1800);
  assert.equal(result.proteinGrams, 45);
  assert.equal(result.waterMl, 1200);
  for (const key of ['protein', 'carbs', 'fat', 'fibre', 'addedSugar', 'saturatedFat']) {
    assert.equal(result.nutrition.guides[key].value, targets[key]);
    assert.equal(result.nutrition.guides[key].source, 'clinician');
  }
  const partial = normalizeNutrition(proposal, { ...profile, clinicianTargets: { protein: 45 } }, plan);
  assert.equal(partial.proteinGrams, 45);
  assert.equal(partial.nutrition.guides.protein.value, 45);
  assert.equal(partial.nutrition.guides.carbs.kind, 'clinician-required');
});

test('invalid AI and contradictory clinician inputs are rejected', () => {
  for (const value of [-1, NaN, Infinity, '50']) assert.throws(() => normalizeNutrition({ ...proposal, fatGrams: value }, profile, plan), { status: 502 });
  for (const change of [{ healthConditions: ['unknown'] }, { clinicianTargets: { protein: true } }, { clinicianTargets: { calories: 2000, protein: 40, carbs: 40, fat: 10 } }, { clinicianTargets: { addedSugar: 30, sugar: 20 } }, { clinicianTargets: { saturatedFat: 20, fat: 10 } }]) {
    assert.throws(() => validateNutritionProfile({ ...profile, ...change }), { status: 400 });
  }
  assert.deepEqual(validateNutritionProfile({ ...profile, clinicianTargets: { protein: '45.5', carbs: '' } }).clinicianTargets, { protein: 45.5 });
});

test('unknown added sugar and saturated fat remain unknown across estimates and daily totals', () => {
  const meal = { name: 'Lunch', calories: 490, protein: 30, carbs: 70, fat: 10, fibre: 8, sugar: 12, assumptions: 'Approximate portion.' };
  const result = validateMealNutrition(meal);
  assert.equal(result.addedSugar, null);
  assert.equal(result.saturatedFat, null);
  assert.equal(macroTotals([meal, { ...meal, addedSugar: 0, saturatedFat: 2 }]).addedSugar, null);
  assert.equal(macroTotals([{ ...meal, addedSugar: 0, saturatedFat: 2 }]).addedSugar, 0);
  assert.throws(() => validateMealNutrition({ ...meal, addedSugar: 13 }), { status: 502 });
  assert.throws(() => validateMealNutrition({ ...meal, saturatedFat: 11 }), { status: 502 });
  const nutrition = normalizeNutrition(proposal, profile, plan).nutrition;
  assert.equal(macroGuides(null, nutrition).addedSugar, '\u2264 50');
  assert.match(macroAmount(null, '\u2264 50'), /Not recorded/);
});

test('profile previews are account-bound, immutable, single-use and invalidated by profile changes', () => {
  const account = { user: { id: 'one' }, profile, plan };
  const next = { ...profile, healthConditions: ['diabetes'] };
  const ticket = stageProfilePlan(account, next, plan, '2026-10-13', 'profile');
  next.healthConditions = [];
  assert.throws(() => takeProfilePlan({ ...account, user: { id: 'two' } }, ticket, 'profile'), { status: 409 });
  assert.throws(() => takeProfilePlan(account, ticket, 'onboarding'), { status: 409 });
  assert.throws(() => takeProfilePlan({ ...account, profile: { ...profile, concerns: 'kidney disease' } }, ticket, 'profile'), { status: 409 });
  assert.deepEqual(takeProfilePlan(account, ticket, 'profile').profile.healthConditions, ['diabetes']);
  assert.throws(() => takeProfilePlan(account, ticket, 'profile'), { status: 409 });
});

test('nutrition-only changes and renewed reviews require approval', () => {
  const nutrition = normalizeNutrition(proposal, profile, plan).nutrition;
  const prior = { ...plan, nutrition };
  const next = { ...prior, nutrition: { ...nutrition, reviewAfter: '2099-01-01' } };
  const ticket = stagePlan('one', prior, next, profile);
  assert.ok(ticket);
  assert.equal(takeApprovedPlan('one', prior, ticket, profile).nutrition.reviewAfter, '2099-01-01');
});
