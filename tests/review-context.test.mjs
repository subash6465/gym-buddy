import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewsForQuestion } from '../server/review-context.mjs';

const reviews = [
  { kind: 'weekly', startDay: '2026-09-08', endDay: '2026-09-14', summary: 'Second week' },
  { kind: 'weekly', startDay: '2026-09-01', endDay: '2026-09-07', summary: 'First week' },
];

test('coach retrieves the saved review for a date or relative week', () => {
  assert.equal(reviewsForQuestion('How was my progress on 2026-09-04?', reviews).selected[0].summary, 'First week');
  assert.equal(reviewsForQuestion('Tell me about September 10, 2026', reviews).selected[0].summary, 'Second week');
  assert.equal(reviewsForQuestion('How was I 2 weeks ago?', reviews, new Date('2026-09-24T12:00:00Z')).selected[0].summary, 'Second week');
  assert.deepEqual(reviewsForQuestion('What about 2026-08-01?', reviews).selected, []);
});
