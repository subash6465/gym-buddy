import assert from 'node:assert/strict';
import test from 'node:test';
import { apiRequest } from '../lib/request.ts';

test('client preserves API errors and handles invalid JSON and transport failures', async (t) => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  const options = { baseUrl: 'https://example.invalid', path: '/account', method: 'GET' };
  globalThis.fetch = async () => new Response(JSON.stringify({ error: 'Session expired.' }), { status: 401 });
  await assert.rejects(apiRequest(options), { message: 'Session expired.', status: 401 });
  globalThis.fetch = async () => new Response('<html>Proxy error</html>', { status: 502 });
  await assert.rejects(apiRequest(options), { status: 502 });
  globalThis.fetch = async () => { throw new TypeError('Network failed'); };
  await assert.rejects(apiRequest(options), /Cannot reach/);
});

test('client deadline covers response body download', async (t) => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async (_, { signal }) => ({ ok: true, text: () => new Promise((_, reject) => {
    signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  }) });
  await assert.rejects(apiRequest({ baseUrl: 'https://example.invalid', path: '/account', method: 'GET', timeoutMs: 10 }), /did not respond in time/);
});

test('exercise identification explains an outdated API instead of reporting an exercise as missing', async (t) => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async () => new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
  await assert.rejects(apiRequest({ baseUrl: 'http://localhost:8787', path: '/identify-exercise', method: 'POST', body: { description: 'Hammer curl', exercises: [] } }), {
    status: 404,
    message: 'The Gym Buddy API needs an update for exercise identification. Restart or update the API server, then try again.',
  });
  await assert.rejects(apiRequest({ baseUrl: 'http://localhost:8787', path: '/other', method: 'POST' }), { status: 404, message: 'Not found' });
});
