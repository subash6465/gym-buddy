import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stagePlan, takeApprovedPlan } from '../server/plan-approval.mjs';

const prior = { summary: 'Strength three days', suggestions: 'Rest between days', days: [1], calorieTarget: 2000, proteinGrams: 100, waterMl: 2000, stepsTarget: 6000 };
const proposed = { ...prior, summary: 'Strength two days', generatedAt: 'later' };

test('plan preview is a separate, single-use, account-bound approval', () => {
  assert.equal(stagePlan('user-a', prior, { ...prior, generatedAt: 'later' }), null);
  const ticket = stagePlan('user-a', prior, proposed);
  assert.ok(ticket);
  assert.throws(() => takeApprovedPlan('user-b', prior, ticket), /expired or your plan changed/);
  assert.throws(() => takeApprovedPlan('user-a', proposed, ticket), /expired or your plan changed/);
  assert.deepEqual(takeApprovedPlan('user-a', prior, ticket), proposed);
  assert.throws(() => takeApprovedPlan('user-a', prior, ticket), /expired or your plan changed/);
  const profileTicket = stagePlan('user-a', prior, proposed, { goal: 'maintain' });
  assert.throws(() => takeApprovedPlan('user-a', prior, profileTicket, { goal: 'gain' }), /expired or your plan changed/);
});
