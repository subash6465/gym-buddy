import assert from 'node:assert/strict';
import test from 'node:test';
import { createRateLimiter } from '../server/rate-limit.mjs';

test('rate limits isolate callers, expire, and bound memory', () => {
  let time = 0;
  const allowed = createRateLimiter({ limit: 2, windowMs: 100, maxEntries: 2, now: () => time });
  assert.equal(allowed('first'), true);
  assert.equal(allowed('first'), true);
  assert.equal(allowed('first'), false);
  assert.equal(allowed('second'), true);
  assert.equal(allowed('third'), false);
  time = 100;
  assert.equal(allowed('first'), true);
  assert.equal(allowed('third'), true);
});
