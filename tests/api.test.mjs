import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';

process.env.DATABASE_PATH = ':memory:';
const { createApiServer } = await import('../server/api.mjs');

test('HTTP account lifecycle, provider verification, meal estimate, chat, and validation', async (t) => {
  const server = createApiServer({ allowedOrigins: ['https://gym.example'] });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    if (String(url).startsWith(base)) return originalFetch(url, options);
    const body = JSON.parse(options.body);
    const schema = body.text?.format?.schema;
    const text = schema?.properties.days ? JSON.stringify({ summary: 'Weekly plan', suggestions: 'Adjust as needed.', recommendedDays: 3,
      calorieTarget: 2200, proteinGrams: 100, waterMl: 2200, stepsTarget: 6000,
      nutrition: { carbsGrams: 260, fatGrams: 65, fibreGrams: 30, addedSugarLimitGrams: 20, saturatedFatLimitGrams: 10, requiresClinicianReview: false, rationale: 'A starting point for training.' },
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, index) => ({ day, title: 'Walk', focus: 'Movement', activities: ['Walk'], minutes: 30, isRest: index > 2 })),
    }) : schema?.properties.action ? JSON.stringify({ reply: 'OK', action: { kind: 'none', mode: 'set', date: '', value: 0 } }) : schema ? JSON.stringify({ name: 'Lunch', calories: 400, protein: 20, carbs: 35, fat: 20, fibre: 5, sugar: 3, assumptions: 'Approximate portion.' }) : 'OK';
    return new Response(JSON.stringify({ output: [{ type: 'message', content: [{ type: 'output_text', text }] }] }));
  };
  t.after(() => { globalThis.fetch = originalFetch; });
  const request = async (path, method = 'GET', body, token) => {
    const response = await fetch(`${base}${path}`, { method,
      headers: { 'Content-Type': 'application/json', Origin: 'https://gym.example', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    return { response, data: await response.json() };
  };
  const health = await request('/health');
  assert.deepEqual(health.data, { ok: true });
  assert.equal(health.response.headers.get('access-control-allow-origin'), 'https://gym.example');
  assert.equal(health.response.headers.get('cache-control'), 'no-store');
  assert.equal((await request('/account')).response.status, 401);
  const key = { provider: 'openai', apiKey: 'fake-private-api-key' };
  assert.equal((await request('/auth/register', 'POST', { email: 'http@example.com', password: 'a-long-password', ...key })).response.status, 400);
  const verified = await request('/verify-ai-key', 'POST', key);
  assert.equal(verified.data.verified, true);
  const credentials = { email: 'http@example.com', password: 'a-long-password', ...key, verificationTicket: verified.data.ticket };
  const registration = await request('/auth/register', 'POST', credentials);
  assert.equal(registration.response.status, 201);
  assert.equal(JSON.stringify(registration.data).includes(key.apiKey), false);
  const token = registration.data.token;
  const profile = { name: 'Sam', dob: '1992-01-01', heightCm: '175', weightKg: 75, goal: 'maintain', setting: 'home', activity: 'light', equation: 'male', nutritionCaution: false, allergies: '', concerns: '', fitnessPlan: '', daysPerWeek: 3, pace: 'moderate' };
  const preview = await request('/onboarding/preview', 'POST', profile, token);
  assert.equal(preview.response.status, 200, JSON.stringify(preview.data));
  assert.equal((await request('/account', 'GET', undefined, token)).data.profile, null);
  const onboarding = await request('/onboarding/approve', 'POST', { ticket: preview.data.ticket }, token);
  assert.equal(onboarding.response.status, 200);
  assert.equal(onboarding.data.plan.days.length, 7);
  assert.equal((await request('/onboarding', 'POST', profile, token)).response.status, 409);
  const revised = await request('/plan/revise', 'POST', { messages: [{ role: 'user', content: 'Include more walking.' }] }, token);
  assert.equal(revised.response.status, 409);
  assert.equal((await request('/profile/preview', 'POST', { ...profile, heightCm: 'invalid' }, token)).response.status, 400);
  const updated = await request('/profile/preview', 'POST', { ...profile, name: 'Sam updated' }, token);
  assert.equal(updated.response.status, 200);
  assert.equal((await request('/profile/approve', 'POST', { ticket: updated.data.ticket }, token)).response.status, 200);
  assert.equal((await request('/account', 'GET', undefined, token)).data.profile.name, 'Sam updated');
  const meal = await request('/estimate-meal', 'POST', { description: 'Lunch' }, token);
  assert.equal(meal.response.status, 200);
  assert.equal(meal.data.name, 'Lunch');
  assert.equal((await request('/chat', 'POST', { messages: [{ role: 'user', content: 'Hello' }], context: '{}' }, token)).data.reply, 'OK');
  for (const body of ['{', 'null', '[]']) {
    const response = await fetch(`${base}/profile/preview`, { method: 'POST', body });
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /valid JSON object/);
  }
  assert.equal((await request('/profile/approve', 'PUT', {}, token)).response.status, 405);
  assert.equal((await request('/profile/preview', 'POST', { payload: 'x'.repeat(256_000) }, token)).response.status, 413);
  const unicodeChat = await request('/chat', 'POST', {
    messages: Array.from({ length: 20 }, (_, index) => ({ role: index % 2 ? 'user' : 'assistant', content: '界'.repeat(2000) })), context: '{}',
  }, token);
  assert.equal(unicodeChat.response.status, 200);
  const second = await request('/auth/login', 'POST', credentials);
  assert.equal(second.response.status, 200);
  await request('/auth/logout', 'POST', {}, token);
  assert.equal((await request('/account', 'GET', undefined, token)).response.status, 401);
  await request('/account', 'DELETE', undefined, second.data.token);
  assert.equal((await request('/account', 'GET', undefined, second.data.token)).response.status, 401);
  assert.equal((await request('/auth/login', 'POST', credentials)).response.status, 401);
  const deniedOrigin = await fetch(`${base}/health`, { headers: { Origin: 'https://untrusted.example' } });
  assert.equal(deniedOrigin.headers.get('access-control-allow-origin'), null);
});

test('HTTP account request limits return 429 before provider work', async (t) => {
  const server = createApiServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  const url = `http://127.0.0.1:${server.address().port}/verify-ai-key`;
  for (let attempt = 0; attempt < 60; attempt++) {
    const response = await fetch(url, { method: 'POST', body: '{}' });
    assert.equal(response.status, 400);
    await response.text();
  }
  const limited = await fetch(url, { method: 'POST', body: '{}' });
  assert.equal(limited.status, 429);
  await limited.text();
});
