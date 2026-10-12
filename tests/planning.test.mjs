import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPlan, normalizePlan } from '../server/planning.mjs';

const profile = { name: 'Alex', dob: '1990-01-01', heightCm: '175', weightKg: 80,
  goal: 'lose', setting: 'gym', activity: 'moderate', equation: 'male', nutritionCaution: false,
  allergies: '', concerns: '', fitnessPlan: '', daysPerWeek: 7, pace: 'aggressive' };
const raw = { summary: 'Strength and walking', suggestions: 'Allow recovery.', recommendedDays: 7,
  calorieTarget: 500, waterMl: 9000, stepsTarget: 50000, proteinGrams: 500,
  days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => ({ day, title: `${day} gym`, focus: 'Full body', activities: ['Squat', 'Row'], minutes: 60, isRest: false })) };

test('plan bounds aggressive goals and adds recovery even for seven requested days', () => {
  const plan = normalizePlan(raw, profile);
  assert.equal(plan.days.length, 7);
  assert.equal(plan.recommendedDays, 6);
  assert.equal(plan.days.filter((day) => day.isRest).length, 1);
  assert.ok(plan.deficitCalories >= 0 && plan.deficitCalories <= 500);
  assert.ok(plan.calorieTarget > 500);
  assert.ok(plan.waterMl <= 4000);
  assert.ok(plan.stepsTarget <= 12000);
  assert.ok(plan.proteinGrams <= 160);
});

test('special dietary care pauses numeric nutrition targets', () => {
  const plan = normalizePlan(raw, { ...profile, nutritionCaution: true });
  assert.equal(plan.calorieTarget, 0);
  assert.equal(plan.maintenanceCalories, 0);
  assert.equal(plan.proteinGrams, 0);
  assert.equal(plan.waterMl, 0);
});

test('day names are sorted and malformed schedules are rejected', () => {
  assert.equal(normalizePlan({ ...raw, days: [...raw.days].reverse() }, profile).days[0].day, 'Monday');
  assert.throws(() => normalizePlan({ ...raw, days: raw.days.slice(1) }, profile), { status: 502 });
});

test('plan generation sends all relevant onboarding choices to the selected provider', async () => {
  const original = globalThis.fetch;
  let request;
  globalThis.fetch = async (_url, options) => {
    request = JSON.parse(options.body);
    return { ok: true, json: async () => ({ output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(raw) }] }] }) };
  };
  try {
    const input = { ...profile, allergies: 'peanuts', concerns: 'knee pain', fitnessPlan: 'Monday rows; Friday cycling' };
    const plan = await createPlan(input, { provider: 'openai', apiKey: 'private-test-key' });
    const sent = JSON.parse(request.input[0].content);
    assert.equal(sent.profile.daysPerWeek, 7);
    assert.equal(sent.profile.pace, 'aggressive');
    assert.equal(sent.profile.suppliedWorkoutPlan, input.fitnessPlan);
    assert.equal(sent.profile.allergies, input.allergies);
    assert.equal(sent.profile.concerns, input.concerns);
    assert.equal(plan.days.length, 7);
  } finally { globalThis.fetch = original; }
});

test('Gemini plan generation falls back to JSON mode when its strict schema is rejected', async () => {
  const original = globalThis.fetch;
  const requests = [];
  const urls = [];
  globalThis.fetch = async (url, options) => {
    urls.push(url);
    requests.push(JSON.parse(options.body));
    return requests.length === 1 ? { ok: false, status: 400 } : {
      ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(raw) }] } }] }),
    };
  };
  try {
    const plan = await createPlan(profile, { provider: 'gemini', apiKey: 'private-test-key' });
    assert.equal(plan.days.length, 7);
    assert.ok(urls.every((url) => /models\/gemini-3\.8-flash:generateContent$/.test(url)));
    assert.ok(requests[0].generationConfig.responseFormat.text.schema);
    assert.equal(requests[1].generationConfig.responseMimeType, 'application/json');
    assert.equal(requests[1].generationConfig.responseFormat, undefined);
    assert.match(requests[1].systemInstruction.parts[0].text, /recommendedDays/);
  } finally { globalThis.fetch = original; }
});
