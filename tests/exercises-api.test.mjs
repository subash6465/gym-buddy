import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';

process.env.DATABASE_PATH = ':memory:';
const { createApiServer } = await import('../server/api.mjs');
const { register } = await import('../server/accounts.mjs');

test('authenticated exercise identification works through HTTP for each configured provider', async (t) => {
  const server = createApiServer();
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const original = globalThis.fetch;
  const identity = { name: 'Hammer curl', kind: 'strength', confidence: 'high', explanation: 'Dumbbells, neutral grip, elbow flexion.' };
  let calls = 0;
  let malformed = false;
  globalThis.fetch = async (url, options) => {
    if (String(url).startsWith(base)) return original(url, options);
    calls++;
    const text = malformed ? '{"name":null}' : JSON.stringify(identity);
    return new Response(JSON.stringify(String(url).includes('anthropic') ? { content: [{ type: 'text', text }] }
      : String(url).includes('googleapis') ? { candidates: [{ content: { parts: [{ text }] } }] }
        : { output: [{ type: 'message', content: [{ type: 'output_text', text }] }] }));
  };
  t.after(() => { globalThis.fetch = original; });
  const post = (description, token, exercises) => fetch(`${base}/identify-exercise`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ description, ...(exercises === undefined ? {} : { exercises }) }) });
  assert.equal((await post('Hammer curl')).status, 401);
  for (const provider of ['openai', 'claude', 'gemini']) {
    const { token } = register(`${provider}@example.com`, 'local-test-password', provider, 'fake-test-key');
    const response = await post('Standing dumbbell curls with a neutral grip', token);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), identity);
    const existing = await post('Neutral grip dumbbell curls', token, [{ name: 'Hammer curls', kind: 'strength' }]);
    assert.equal(existing.status, 200);
    assert.equal((await existing.json()).existingName, 'Hammer curl');
    const prior = calls;
    for (const invalid of ['', ' '.repeat(10), 'x'.repeat(2001), 12, null]) assert.equal((await post(invalid, token)).status, 400);
    for (const invalid of [null, {}, [null], [{ name: 'Squat', kind: 'unknown' }]]) assert.equal((await post('Squat', token, invalid)).status, 400);
    assert.equal(calls, prior, 'invalid descriptions must not call the provider');
    malformed = true;
    assert.equal((await post('Hammer curl', token)).status, 502);
    malformed = false;
  }
});
