import test from 'node:test';
import assert from 'node:assert/strict';

process.env.DATABASE_PATH = ':memory:';
const { register, getAccount, login } = await import('../server/accounts.mjs');
const { server } = await import('../server/index.mjs');

test('HTTP previews do not save; approval persists nutrition once without another provider call', async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const account = register('nutrition-api@example.com', 'long-test-password', 'openai', 'fake-provider-key');
  const other = register('other-api@example.com', 'long-test-password', 'openai', 'fake-provider-key');
  const authorization = `Bearer ${account.token}`;
  const originalFetch = globalThis.fetch;
  let calls = 0;
  let lastInstructions = '';
  let chatAction = 'none';
  const aiPlan = { summary: 'Train and recover.', suggestions: 'Build gradually.', recommendedDays: 3,
    calorieTarget: 2200, proteinGrams: 120, waterMl: 2500, stepsTarget: 8000,
    nutrition: { carbsGrams: 260, fatGrams: 65, fibreGrams: 30, addedSugarLimitGrams: 20, saturatedFatLimitGrams: 10, requiresClinicianReview: false, rationale: 'A starting point for your training.' },
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, index) => ({ day, title: index < 3 ? 'Strength' : 'Recovery', focus: 'Full body', activities: ['Walk'], minutes: 30, isRest: index >= 3 })) };
  globalThis.fetch = async (url, options) => {
    if (!String(url).startsWith('https://api.openai.com/')) return originalFetch(url, options);
    calls++;
    const body = JSON.parse(options.body);
    lastInstructions = body.instructions;
    const output = body.text?.format?.name === 'chat_reply' || /friendly fitness and nutrition assistant/.test(body.instructions)
      ? { reply: 'Here is your review.', action: { kind: chatAction, mode: 'set', date: '', value: 0 } } : aiPlan;
    return { ok: true, json: async () => ({ output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(output) }] }] }) };
  };
  const post = async (path, body, auth = authorization) => {
    const response = await originalFetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: auth }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  };
  const profile = { name: 'Sam', dob: '1992-03-03', heightCm: '175', weightKg: 75, goal: 'maintain', setting: 'home', activity: 'light', equation: 'male', nutritionCaution: false, allergies: '', concerns: '', fitnessPlan: '', daysPerWeek: 3, pace: 'moderate', healthConditions: [], clinicianTargets: {}, startDay: '2026-10-13' };
  try {
    const preview = await post('/onboarding/preview', profile);
    assert.equal(preview.status, 200, JSON.stringify(preview.body));
    assert.equal(calls, 1);
    assert.equal(getAccount(authorization).profile, null);
    assert.equal(getAccount(authorization).plan, null);
    assert.equal((await post('/onboarding/approve', { ticket: preview.body.ticket }, `Bearer ${other.token}`)).status, 409);
    const saved = await post('/onboarding/approve', { ticket: preview.body.ticket });
    assert.equal(saved.status, 200);
    assert.equal(calls, 1);
    assert.deepEqual(saved.body.plan.nutrition, preview.body.plan.nutrition);
    assert.deepEqual(login('nutrition-api@example.com', 'long-test-password').plan.nutrition, preview.body.plan.nutrition);
    assert.equal((await post('/onboarding/approve', { ticket: preview.body.ticket })).status, 409);
    assert.equal((await post('/onboarding', profile)).status, 409);

    const clinical = await post('/profile/preview', { ...profile, healthConditions: ['diabetes'], clinicianTargets: { calories: 1800, protein: 90, carbs: 225, fat: 60, addedSugar: 15 } });
    assert.equal(clinical.status, 200, JSON.stringify(clinical.body));
    assert.deepEqual(getAccount(authorization).profile.healthConditions, []);
    assert.equal(clinical.body.plan.nutrition.guides.protein.source, 'clinician');
    assert.equal(clinical.body.plan.nutrition.guides.fibre.kind, 'clinician-required');
    assert.equal((await post('/profile/approve', { ticket: clinical.body.ticket })).status, 200);
    assert.equal(calls, 2);
    assert.deepEqual(getAccount(authorization).profile.healthConditions, ['diabetes']);

    const reply = await post('/chat', { messages: [{ role: 'user', content: 'How am I doing?' }], context: 'Today.' });
    assert.equal(reply.status, 200, JSON.stringify(reply.body));
    assert.match(lastInstructions, /diabetes/);
    assert.match(lastInstructions, /clinician/);
    chatAction = 'plan';
    const revision = await post('/chat', { messages: [{ role: 'user', content: 'Review my nutrition targets.' }], context: 'Today.', weightKg: 74 });
    assert.equal(revision.status, 200, JSON.stringify(revision.body));
    assert.ok(revision.body.planPreview.ticket);
    assert.equal(getAccount(authorization).plan.nutrition.basedOnWeightKg, 75);
    const beforeApproval = calls;
    assert.equal((await post('/plan/approve', { ticket: revision.body.planPreview.ticket })).status, 200);
    assert.equal(calls, beforeApproval);
    assert.equal(getAccount(authorization).plan.nutrition.basedOnWeightKg, 74);
  } finally {
    globalThis.fetch = originalFetch;
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
