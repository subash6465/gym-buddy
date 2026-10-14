import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeviceRuntime } from '../shared/device-runtime.mjs';
import { generate } from '../shared/ai/ai.mjs';

const profile = { name: 'Sam', dob: '1992-03-03', heightCm: '175', weightKg: 75, goal: 'maintain', setting: 'home', activity: 'light', equation: 'male', nutritionCaution: false, allergies: '', concerns: '', fitnessPlan: '', daysPerWeek: 3, pace: 'moderate', healthConditions: [], clinicianTargets: {}, startDay: '2026-09-01' };
const plan = { summary: 'Build strength gradually.', suggestions: 'Keep recovery days.', recommendedDays: 3,
  calorieTarget: 2200, proteinGrams: 120, waterMl: 2500, stepsTarget: 8000,
  nutrition: { carbsGrams: 260, fatGrams: 65, fibreGrams: 30, addedSugarLimitGrams: 20, saturatedFatLimitGrams: 10, requiresClinicianReview: false, rationale: 'A starting point.' },
  days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, index) => ({ day, title: index < 3 ? 'Strength' : 'Recovery', focus: 'Movement', activities: ['Walk'], minutes: 30, isRest: index >= 3 })) };
function storage() {
  const state = { data: null, key: null, failWrite: false, failKeyWrite: false };
  let id = 0;
  const adapters = {
    readData: async () => state.data, readKey: async () => state.key,
    writeData: async (value) => { if (state.failWrite) throw new Error('Disk full'); state.data = value; },
    writeKey: async (value) => { if (state.failKeyWrite) throw new Error('Secure storage unavailable'); state.key = value; }, removeData: async () => { state.data = null; },
    newId: () => `device-${++id}`,
  };
  return { state, adapters, runtime: createDeviceRuntime(adapters) };
}
function providerMock(t) {
  const original = globalThis.fetch;
  const state = { calls: [], revise: false, hold: null };
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async (url, options) => {
    assert.match(String(url), /^https:\/\/(api\.openai\.com|api\.anthropic\.com|generativelanguage\.googleapis\.com)\//);
    state.calls.push({ url, options });
    const body = JSON.parse(options.body);
    const schema = body.text?.format?.schema || body.output_config?.format?.schema || body.generationConfig?.responseJsonSchema || body.generationConfig?.responseFormat?.text?.schema;
    if (schema?.properties.calories && state.hold) await state.hold;
    const result = schema?.properties.days ? { ...plan, summary: state.revise ? 'Revised plan.' : plan.summary }
      : schema?.properties.action ? { reply: 'Keep going.', action: { kind: state.revise ? 'plan' : 'none', mode: 'set', date: '', value: 0 } }
        : schema?.properties.calories ? { mealFound: true, name: 'Rice', calories: 450, protein: 20, carbs: 70, fat: 10, fibre: 8, sugar: 3, addedSugar: null, saturatedFat: null, assumptions: 'Approximate serving.' }
          : schema?.properties.wins ? { summary: 'Consistent logging.', wins: ['Recorded meals'], improvements: [], nextSteps: ['Keep logging'] }
            : schema?.properties.confidence ? { name: 'Walking', kind: 'timed', confidence: 'high', explanation: 'Walking.', existingName: '' } : 'OK';
    const text = typeof result === 'string' ? result : JSON.stringify(result);
    return new Response(JSON.stringify(String(url).includes('openai') ? { status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text }] }] }
      : String(url).includes('anthropic') ? { stop_reason: 'end_turn', content: [{ type: 'text', text }] }
        : { candidates: [{ finishReason: 'STOP', content: { parts: [{ text }] } }] }));
  };
  state.fetch = globalThis.fetch;
  return state;
}
async function setup(runtime, provider = 'openai') {
  await runtime.initialize();
  const key = { provider, apiKey: 'user-private-key' };
  const { ticket } = await runtime.request('/verify-ai-key', 'POST', undefined, key);
  return runtime.request('/auth/register', 'POST', undefined, { ...key, verificationTicket: ticket });
}
async function onboard(runtime, token) {
  const preview = await runtime.request('/onboarding/preview', 'POST', token, profile);
  await runtime.request('/onboarding/approve', 'POST', token, { ticket: preview.ticket });
}

test('standalone lifecycle works for all providers without any Gym Buddy HTTP server', async (t) => {
  const mock = providerMock(t);
  for (const provider of ['openai', 'claude', 'gemini']) {
    const { state, adapters, runtime } = storage();
    const { token } = await setup(runtime, provider);
    await onboard(runtime, token);
    const saved = await runtime.request('/account', 'GET', token);
    assert.equal(saved.profile.name, 'Sam');
    assert.equal(saved.startedOn, '2026-09-01');
    assert.equal(saved.user.id, 'local-device');
    assert.doesNotMatch(state.data, /user-private-key|apiKey|password/);
    assert.equal(JSON.parse(state.key).apiKey, 'user-private-key');
    const meal = await runtime.request('/estimate-meal', 'POST', token, { description: 'Rice', imageDataUrl: 'data:image/jpeg;base64,YQ==' });
    assert.equal(meal.name, 'Rice');
    const exercise = await runtime.request('/identify-exercise', 'POST', token, { description: 'Walking', exercises: [] });
    assert.equal(exercise.name, 'Walking');
    const job = { kind: 'weekly', startDay: '2026-09-01', endDay: '2026-09-07', profile: saved.profile,
      days: Array.from({ length: 7 }, (_, index) => ({ date: `2026-09-0${index + 1}`, calories: 2000, protein: 100, water: 2000, steps: 5000, workoutMinutes: 30, meals: 3, workouts: 1 })) };
    await runtime.request('/reviews', 'POST', token, job);
    assert.equal((await runtime.request('/reviews', 'GET', token)).reviews.length, 1);
    mock.revise = true;
    const reply = await runtime.request('/chat', 'POST', token, { messages: [{ role: 'user', content: 'Revise my plan' }], context: '{}', weightKg: 76 });
    assert.equal((await runtime.request('/account', 'GET', token)).plan.summary, plan.summary);
    await runtime.request('/plan/approve', 'POST', token, { ticket: reply.planPreview.ticket });
    assert.equal((await runtime.request('/account', 'GET', token)).plan.summary, 'Revised plan.');
    mock.revise = false;
    // Restart and restore while internet access is absent.
    globalThis.fetch = async () => { throw new Error('Offline'); };
    const restored = createDeviceRuntime(adapters);
    const restoredToken = await restored.initialize();
    assert.equal((await restored.request('/account', 'GET', restoredToken)).profile.name, 'Sam');
    assert.equal((await restored.request('/reviews', 'GET', restoredToken)).reviews.length, 1);
    await restored.request('/auth/logout', 'POST', restoredToken);
    assert.equal(state.key, null);
    assert.ok(state.data);
    await assert.rejects(restored.request('/account', 'GET', restoredToken), /setup/);
    // Reset the mock for the next provider.
    globalThis.fetch = mock.fetch;
  }
  assert.ok(mock.calls.length > 0);
});

test('verification is bound to the key and local approval survives failed persistence', async (t) => {
  providerMock(t);
  const { state, runtime } = storage();
  await runtime.initialize();
  const verification = await runtime.request('/verify-ai-key', 'POST', undefined, { provider: 'openai', apiKey: 'user-private-key' });
  await assert.rejects(runtime.request('/auth/register', 'POST', undefined, { provider: 'claude', apiKey: 'user-private-key', verificationTicket: verification.ticket }), /Verify/);
  const { token } = await setup(runtime);
  const preview = await runtime.request('/onboarding/preview', 'POST', token, profile);
  state.failWrite = true;
  await assert.rejects(runtime.request('/onboarding/approve', 'POST', token, { ticket: preview.ticket }), /Disk full/);
  assert.equal((await runtime.request('/account', 'GET', token)).profile, null);
  state.failWrite = false;
  await runtime.request('/onboarding/approve', 'POST', token, { ticket: preview.ticket });
  await assert.rejects(runtime.request('/onboarding/approve', 'POST', token, { ticket: preview.ticket }), /expired/);
  const first = await runtime.request('/profile/preview', 'POST', token, { ...profile, name: 'First' });
  const second = await runtime.request('/profile/preview', 'POST', token, { ...profile, name: 'Second' });
  await runtime.request('/profile/approve', 'POST', token, { ticket: first.ticket });
  await assert.rejects(runtime.request('/profile/approve', 'POST', token, { ticket: second.ticket }), /changed/);
});

test('deletion invalidates in-flight AI and removes both saved profile and secure key', async (t) => {
  const mock = providerMock(t);
  const { state, runtime } = storage();
  const { token } = await setup(runtime);
  await onboard(runtime, token);
  let release;
  mock.hold = new Promise((resolve) => { release = resolve; });
  const inFlight = runtime.request('/estimate-meal', 'POST', token, { description: 'Rice' });
  await new Promise((resolve) => setImmediate(resolve));
  await runtime.request('/account', 'DELETE', token);
  release();
  await assert.rejects(inFlight, /Setup changed/);
  assert.equal(state.data, null);
  assert.equal(state.key, null);
});

test('corrupt saved profiles cannot be silently overwritten by setup', async (t) => {
  providerMock(t);
  const { state, runtime } = storage();
  state.data = '{broken';
  await assert.rejects(runtime.initialize());
  await assert.rejects(runtime.request('/verify-ai-key', 'POST', undefined, { provider: 'openai', apiKey: 'user-private-key' }));
  assert.equal(state.data, '{broken');
  assert.equal(state.key, null);
});

test('secure-storage failures do not enter setup or erase a saved device profile', async (t) => {
  providerMock(t);
  const { state, runtime } = storage();
  state.failKeyWrite = true;
  await assert.rejects(setup(runtime), /Secure storage/);
  assert.equal(state.key, null);
  state.failKeyWrite = false;
  const { token } = await setup(runtime);
  await onboard(runtime, token);
  const saved = state.data;
  state.failKeyWrite = true;
  await assert.rejects(runtime.request('/account', 'DELETE', token), /Secure storage/);
  assert.equal(state.data, saved);
  assert.equal((await runtime.request('/account', 'GET', token)).profile.name, 'Sam');
});

test('failed activity deletion restores credentials and leaves the profile available for retry', async (t) => {
  providerMock(t);
  const { state, runtime } = storage();
  const { token } = await setup(runtime);
  await onboard(runtime, token);
  await assert.rejects(runtime.request('/account', 'DELETE', token, { clearLocalData: async () => { throw new Error('Could not delete activity'); } }), /delete activity/);
  assert.equal(JSON.parse(state.key).apiKey, 'user-private-key');
  assert.equal((await runtime.request('/account', 'GET', token)).profile.name, 'Sam');
  await runtime.request('/account', 'DELETE', token);
  assert.equal(state.data, null);
  assert.equal(state.key, null);
});

test('direct AI deadline covers stalled body downloads without AbortSignal.timeout', async (t) => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  let signal;
  globalThis.fetch = async (url, options) => {
    signal = options.signal;
    return { ok: true, status: 200, json: () => new Promise(() => {}) };
  };
  await assert.rejects(generate({ provider: 'openai', apiKey: 'user-private-key', instructions: 'Reply.',
    messages: [{ role: 'user', content: 'Hello' }], deadline: Date.now() + 20 }), /took too long/);
  assert.equal(signal.aborted, true);
});
