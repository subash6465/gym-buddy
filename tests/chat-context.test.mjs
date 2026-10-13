import test from 'node:test';
import assert from 'node:assert/strict';
import { chatClock, serializeChatContext } from '../lib/chat-context.ts';
import { localDay } from '../lib/dates.ts';

test('chat clock uses the device local day and 24-hour time across midnight', (t) => {
  const original = process.env.TZ;
  process.env.TZ = 'Asia/Kolkata';
  t.after(() => { if (original === undefined) delete process.env.TZ; else process.env.TZ = original; });
  const evening = new Date('2026-10-13T16:10:00Z');
  assert.equal(localDay(evening), '2026-10-13');
  assert.equal(chatClock(evening).localTime, '21:40');
  assert.equal(chatClock(evening).utcOffsetMinutes, 330);
  const midnight = new Date('2026-10-13T18:35:00Z');
  assert.equal(localDay(midnight), '2026-10-14');
  assert.equal(chatClock(midnight).localTime, '00:05');
  assert.equal(chatClock(midnight).capturedAt, midnight.toISOString());
});

test('large chat context remains valid JSON with local time and complete daily totals', () => {
  const totals = { count: 3, calories: 2100, protein: 105, mealTypes: ['breakfast', 'lunch', 'dinner'] };
  const serialized = serializeChatContext({ date: '2026-10-13', localTime: '21:40', utcOffsetMinutes: 330,
    todaysMealTotals: totals, todaysMeals: Array.from({ length: 30 }, () => ({ name: 'Meal'.repeat(100) })),
    weeklyPlan: 'Plan'.repeat(1000), nutritionGuides: 'Guide'.repeat(1000),
  });
  assert.ok(serialized.length <= 3000);
  const context = JSON.parse(serialized);
  assert.deepEqual(context.todaysMealTotals, totals);
  assert.equal(context.localTime, '21:40');
  assert.equal(context.contextDetailsOmitted, true);
});

test('coach provider receives fresh local context on initial and fallback requests', async (t) => {
  process.env.DATABASE_PATH = ':memory:';
  const { chat } = await import('../server/api.mjs');
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const requests = [];
  globalThis.fetch = async (_url, options) => {
    requests.push(JSON.parse(options.body));
    const text = requests.length === 1 ? 'invalid reply' : JSON.stringify({ reply: 'You logged breakfast, lunch and dinner today.', action: { kind: 'none', mode: 'set', date: '', value: 0 } });
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }));
  };
  const context = serializeChatContext({ date: '2026-10-13', localTime: '21:40', timeZone: 'Asia/Kolkata', utcOffsetMinutes: 330,
    todaysMealTotals: { count: 3, calories: 2100, protein: 105, mealTypes: ['breakfast', 'lunch', 'dinner'] } });
  await chat([{ role: 'user', content: 'How am I doing today?' }], context, 'gemini', 'private-test-key');
  assert.equal(requests.length, 2);
  for (const request of requests) {
    const prompt = request.systemInstruction.parts[0].text;
    assert.ok(prompt.includes(context));
    assert.match(prompt, /fresh snapshot/);
    assert.match(prompt, /make your own judgment/);
  }
});
