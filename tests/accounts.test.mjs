import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.DATABASE_PATH = ':memory:';
const { register, login, getAccount, saveProfile, logout } = await import('../server/accounts.mjs');

test('account setup persists profile and sessions are isolated', () => {
  const first = register(' First@Example.com ', 'a-long-password');
  const second = register('second@example.com', 'another-long-password');
  assert.equal(first.user.email, 'first@example.com');
  assert.equal(first.profile, null);
  assert.throws(() => register('first@example.com', 'a-long-password'), { status: 409 });
  assert.throws(() => login('first@example.com', 'wrong-password'), { status: 401 });
  const profile = { name: 'Alex', dob: '1995-04-17', heightCm: '170', weightKg: 70,
    goal: 'maintain', setting: 'home', activity: 'light', equation: '', nutritionCaution: false,
    allergies: 'peanuts', concerns: 'knee pain', fitnessPlan: 'Walk three days' };
  assert.throws(() => saveProfile(`Bearer ${first.token}`, { ...profile, dob: '1995-02-30' }), { status: 400 });
  saveProfile(`Bearer ${first.token}`, profile);
  assert.deepEqual(getAccount(`Bearer ${first.token}`).profile, profile);
  assert.equal(getAccount(`Bearer ${second.token}`).profile, null);
  const returning = login('first@example.com', 'a-long-password');
  assert.deepEqual(returning.profile, profile);
  logout(`Bearer ${first.token}`);
  assert.throws(() => getAccount(`Bearer ${first.token}`), { status: 401 });
  assert.deepEqual(getAccount(`Bearer ${returning.token}`).profile, profile);
});
