import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';

process.env.DATABASE_PATH = ':memory:';
const { createApiServer } = await import('../server/api.mjs');

const models = {
  openai: { routine: 'gpt-6-luna', strong: 'gpt-6.1-sol' },
  claude: { routine: 'claude-haiku-5-5', strong: 'claude-sonnet-5-5' },
  gemini: { routine: 'gemini-3.1-flash-lite', strong: 'gemini-3.8-flash' },
};
const profile = { name: 'Sam', dob: '1992-03-03', heightCm: '175', weightKg: 75, goal: 'maintain', setting: 'home', activity: 'light', equation: 'male', nutritionCaution: false, allergies: '', concerns: '', fitnessPlan: '', daysPerWeek: 3, pace: 'moderate', healthConditions: [], clinicianTargets: {}, startDay: '2026-09-01' };
const plan = { summary: 'Build strength gradually.', suggestions: 'Keep recovery days.', recommendedDays: 3,
  calorieTarget: 2200, proteinGrams: 120, waterMl: 2500, stepsTarget: 8000,
  nutrition: { carbsGrams: 260, fatGrams: 65, fibreGrams: 30, addedSugarLimitGrams: 20, saturatedFatLimitGrams: 10, requiresClinicianReview: false, rationale: 'A starting point.' },
  days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, index) => ({ day, title: index < 3 ? 'Strength' : 'Recovery', focus: 'Movement', activities: ['Walk'], minutes: 30, isRest: index >= 3 })) };

test('all providers support verification, previews, approvals, meals, chat, reviews and switching', async (t) => {
  const server = createApiServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  const calls = [];
  let revision = false;
  globalThis.fetch = async (url, options) => {
    if (String(url).startsWith(base)) return original(url, options);
    const body = JSON.parse(options.body);
    const provider = String(url).includes('openai') ? 'openai' : String(url).includes('anthropic') ? 'claude' : 'gemini';
    const model = body.model || String(url).match(/models\/([^:]+):/)[1];
    const schema = body.text?.format?.schema || body.output_config?.format?.schema || body.generationConfig?.responseJsonSchema || body.generationConfig?.responseFormat?.text?.schema;
    const result = schema?.properties.days ? { ...plan, summary: revision ? 'Revised strength plan.' : plan.summary }
      : schema?.properties.action ? { reply: 'Review the proposal.', action: { kind: revision ? 'plan' : 'none', mode: 'set', date: '', value: 0 } }
        : schema?.properties.calories ? { name: 'Dal and rice', calories: 450, protein: 20, carbs: 70, fat: 10, fibre: 8, sugar: 3, addedSugar: null, saturatedFat: null, assumptions: 'Approximate serving.' }
          : schema?.properties.wins ? { summary: 'Consistent logging.', wins: ['Recorded meals'], improvements: [], nextSteps: ['Keep logging'] } : 'OK';
    calls.push({ provider, model, body });
    const text = typeof result === 'string' ? result : JSON.stringify(result);
    const payload = provider === 'openai' ? { status: 'completed', output: [{ type: 'reasoning' }, { type: 'message', content: [{ type: 'output_text', text }] }] }
      : provider === 'claude' ? { stop_reason: 'end_turn', content: [{ type: 'thinking', thinking: 'private' }, { type: 'text', text }] }
        : { candidates: [{ finishReason: 'STOP', content: { parts: [{ thought: true, text: 'private' }, { text }] } }] };
    return new Response(JSON.stringify(payload));
  };
  const request = async (path, body, token, method = 'POST') => {
    const response = await original(`${base}${path}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
    const data = await response.json();
    assert.ok(response.ok, `${path}: ${response.status} ${JSON.stringify(data)}`);
    assert.doesNotMatch(JSON.stringify(data), /private-provider-key|private-test/);
    return data;
  };
  for (const provider of Object.keys(models)) {
    const key = { provider, apiKey: 'private-provider-key' };
    const verification = await request('/verify-ai-key', key);
    assert.equal(calls.at(-1).model, provider === 'gemini' ? 'gemma-4-26b-a4b-it' : models[provider].routine);
    const account = await request('/auth/register', { email: `${provider}@example.com`, password: 'long-test-password', ...key, verificationTicket: verification.ticket });
    const token = account.token;
    revision = false;
    const preview = await request('/onboarding/preview', profile, token);
    assert.equal(calls.at(-1).model, models[provider].strong);
    assert.equal(preview.plan.days.length, 7);
    let before = calls.length;
    await request('/onboarding/approve', { ticket: preview.ticket }, token);
    assert.equal(calls.length, before);
    const updated = await request('/profile/preview', { ...profile, name: 'Updated Sam' }, token);
    assert.equal(calls.at(-1).model, models[provider].strong);
    before = calls.length;
    await request('/profile/approve', { ticket: updated.ticket }, token);
    assert.equal(calls.length, before);
    for (const photo of [false, true]) {
      const meal = await request('/estimate-meal', { description: 'Dal and rice', ...(photo ? { imageDataUrl: 'data:image/jpeg;base64,aGVsbG8=' } : {}) }, token);
      assert.equal(meal.addedSugar, null);
      assert.equal(calls.at(-1).model, photo ? models[provider].strong : provider === 'gemini' ? 'gemini-3.5-flash-lite' : models[provider].routine);
      if (photo) {
        const body = calls.at(-1).body;
        assert.ok(provider === 'openai' ? body.input[0].content[1].type === 'input_image'
          : provider === 'claude' ? body.messages[0].content[1].source.media_type === 'image/jpeg'
            : body.contents[0].parts[1].inlineData.mimeType === 'image/jpeg');
      }
    }
    const message = { messages: [{ role: 'user', content: 'How am I doing?' }], context: 'Today.' };
    const chat = await request('/chat', message, token);
    assert.equal(chat.reply, 'Review the proposal.');
    assert.equal(calls.at(-1).model, models[provider].routine);
    revision = true;
    const revised = await request('/chat', message, token);
    assert.ok(revised.planPreview.ticket);
    assert.equal(calls.at(-2).model, models[provider].routine);
    assert.equal(calls.at(-1).model, models[provider].strong);
    before = calls.length;
    await request('/plan/approve', { ticket: revised.planPreview.ticket }, token);
    assert.equal(calls.length, before);
    revision = false;
    for (const kind of ['weekly', 'monthly']) {
      const length = kind === 'weekly' ? 7 : 30;
      const job = { kind, startDay: '2026-09-01', endDay: `2026-09-${String(length).padStart(2, '0')}`, profile, targets: null,
        days: Array.from({ length }, (_, i) => ({ date: `2026-09-${String(i + 1).padStart(2, '0')}`, calories: 0, protein: 0, water: 0, steps: 0, workoutMinutes: 0, meals: 0, workouts: 0 })) };
      const review = await request('/reviews', job, token);
      assert.equal(review.review.summary, 'Consistent logging.');
      assert.equal(calls.at(-1).model, models[provider].strong);
      before = calls.length;
      await request('/reviews', job, token);
      assert.equal(calls.length, before);
    }
    const nextProvider = provider === 'openai' ? 'claude' : provider === 'claude' ? 'gemini' : 'openai';
    const nextKey = { provider: nextProvider, apiKey: 'private-provider-key' };
    const nextVerification = await request('/verify-ai-key', nextKey);
    await request('/ai-config', { ...nextKey, verificationTicket: nextVerification.ticket }, token, 'PUT');
    await request('/chat', message, token);
    assert.equal(calls.at(-1).provider, nextProvider);
    assert.equal(calls.at(-1).model, models[nextProvider].routine);
  }
});
