import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createReview, validateReviewJob } from '../server/reviews.mjs';

const job = { kind: 'weekly', startDay: '2026-09-01', endDay: '2026-09-07',
  days: Array.from({ length: 7 }, (_, index) => ({ date: `2026-09-0${index + 1}`, calories: 0, protein: 0, water: 0, steps: 0, workoutMinutes: 0, meals: 0, workouts: 0, weightKg: null })),
  profile: { goal: 'maintain', activity: 'light', daysPerWeek: 3, pace: 'moderate' }, targets: null };

test('review jobs require a completed, sequential period', () => {
  assert.doesNotThrow(() => validateReviewJob(job, '2026-09-01'));
  assert.throws(() => validateReviewJob({ ...job, endDay: '2026-09-06' }, '2026-09-01'), { status: 400 });
  assert.throws(() => validateReviewJob({ ...job, days: job.days.slice(1) }, '2026-09-01'), { status: 400 });
  assert.throws(() => validateReviewJob(job, '2026-09-02'), { status: 400 });
  assert.throws(() => validateReviewJob({ ...job, days: job.days.map((day, index) => index ? day : { ...day, steps: -1 }) }, '2026-09-01'), { status: 400 });
  assert.throws(() => validateReviewJob({ ...job, startDay: '2026-09-02', endDay: '2026-09-08', days: job.days.map((day) => ({ ...day, date: `2026-09-${String(Number(day.date.slice(-2)) + 1).padStart(2, '0')}` })) }, '2026-09-01'), { status: 400 });
});

test('monthly review boundaries follow the setup anniversary', () => {
  const month = { ...job, kind: 'monthly', startDay: '2026-01-31', endDay: '2026-02-27',
    days: Array.from({ length: 28 }, (_, index) => ({ ...job.days[0], date: new Date(Date.UTC(2026, 0, 31 + index)).toISOString().slice(0, 10) })) };
  assert.doesNotThrow(() => validateReviewJob(month, '2026-01-31'));
  assert.throws(() => validateReviewJob({ ...month, endDay: '2026-02-28', days: [...month.days, { ...month.days[0], date: '2026-02-28' }] }, '2026-01-31'), { status: 400 });
});

test('review generation sends the completed period to the selected model', async () => {
  const original = globalThis.fetch;
  let url; let body;
  globalThis.fetch = async (requestUrl, options) => {
    url = requestUrl; body = JSON.parse(options.body);
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ summary: 'No logs yet.', wins: [], improvements: [], nextSteps: ['Start with one entry.'] }) }] } }] }) };
  };
  try {
    const review = await createReview(job, { provider: 'gemini', apiKey: 'private-test-key' });
    assert.match(url, /models\/gemini-3\.8-flash:generateContent$/);
    assert.equal(JSON.parse(body.contents[0].parts[0].text).days.length, 7);
    assert.equal(review.nextSteps[0], 'Start with one entry.');
  } finally { globalThis.fetch = original; }
});
