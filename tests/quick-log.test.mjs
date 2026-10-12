import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quickLog } from '../server/quick-log.mjs';

test('explicit water commands become immediate approval proposals', () => {
  const result = quickLog('add 3 litre water entry for today', '2026-10-12');
  assert.deepEqual(result.action, { kind: 'water', mode: 'add', date: '2026-10-12', value: 3000 });
  assert.match(result.reply, /before it is saved/);
  assert.equal(quickLog('Should I add 3 litres of water today?', '2026-10-12'), null);
  assert.equal(quickLog('add 6 litres of water today', '2026-10-12'), null);
});
