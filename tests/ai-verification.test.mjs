import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requireVerifiedKey, verifyAiKey } from '../server/ai-verification.mjs';

test('a real provider response issues a short-lived ticket bound to the key and provider', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ output: [{ type: 'message', content: [{ type: 'output_text', text: 'OK' }] }] }) });
  try {
    const { ticket } = await verifyAiKey('openai', 'sample-private-key');
    assert.doesNotThrow(() => requireVerifiedKey('openai', 'sample-private-key', ticket));
    assert.throws(() => requireVerifiedKey('gemini', 'sample-private-key', ticket), { status: 400 });
    assert.throws(() => requireVerifiedKey('openai', 'different-private-key', ticket), { status: 400 });
  } finally { globalThis.fetch = original; }
});

test('provider errors do not issue verification tickets', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false, status: 401 });
  try { await assert.rejects(verifyAiKey('openai', 'sample-private-key'), { status: 502 }); }
  finally { globalThis.fetch = original; }
});
