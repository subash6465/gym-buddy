import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseChatResult } from '../server/chat-result.mjs';

test('coach output can propose a water change without applying it', () => {
  assert.deepEqual(parseChatResult(JSON.stringify({ reply: 'Please review the water change.',
    action: { kind: 'water', mode: 'set', date: '2026-10-12', value: 4000 } })), {
    reply: 'I prepared the change you requested. Review it below before anything is saved.', action: { kind: 'water', mode: 'set', date: '2026-10-12', value: 4000 },
  });
});

test('invalid coach actions are discarded while the reply remains usable', () => {
  for (const action of [
    { kind: 'water', mode: 'set', date: '2026-10-12', value: 999999 },
    { kind: 'steps', mode: 'add', date: '2026-10-12', value: 12.5 },
    { kind: 'profile', mode: 'set', date: '2026-10-12', value: 70 },
    { kind: 'water', mode: 'set', date: '2026-02-31', value: 1000 },
    { kind: 'weight', mode: 'add', date: '2026-10-12', value: 70 },
  ]) assert.deepEqual(parseChatResult(JSON.stringify({ reply: 'I can help.', action })), { reply: 'I can help.', action: null });
  assert.throws(() => parseChatResult('{broken'), /invalid reply/);
  assert.deepEqual(parseChatResult(JSON.stringify({ reply: 'User asked: log water\nApp context: private details', action: { kind: 'none', mode: 'set', date: '', value: 0 } })),
    { reply: 'I could not prepare a clear answer. Please ask again in a different way.', action: null });
  assert.deepEqual(parseChatResult(JSON.stringify({ reply: 'Internal analysis: private', action: { kind: 'plan', mode: 'set', date: '', value: 0 } })),
    { reply: 'I will prepare a revised weekly plan for your approval.', action: { kind: 'plan' } });
});
