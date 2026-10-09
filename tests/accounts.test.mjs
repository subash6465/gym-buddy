import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.DATABASE_PATH = ':memory:';
const { register, login, getAccount, getAiConfig, saveAiConfig, saveOnboarding, saveProfile, logout, deleteAccount } = await import('../server/accounts.mjs');

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

test('deleting an account removes credentials, profile, and every session', () => {
  const account = register('delete@example.com', 'a-long-password', 'claude', 'test-claude-secret');
  const secondSession = login('delete@example.com', 'a-long-password');
  const profile = { name: 'Ari', dob: '1990-01-01', heightCm: '170', weightKg: 70,
    goal: 'maintain', setting: 'gym', activity: 'light', equation: '', nutritionCaution: false,
    allergies: '', concerns: '', fitnessPlan: '' };
  saveProfile(`Bearer ${account.token}`, profile);
  assert.deepEqual(deleteAccount(`Bearer ${account.token}`), { ok: true });
  assert.throws(() => getAccount(`Bearer ${account.token}`), { status: 401 });
  assert.throws(() => getAccount(`Bearer ${secondSession.token}`), { status: 401 });
  assert.throws(() => login('delete@example.com', 'a-long-password'), { status: 401 });
  assert.equal(register('delete@example.com', 'a-long-password').profile, null);
});

test('AI keys stay private, follow the account, and can be replaced', () => {
  const first = register('ai-one@example.com', 'a-long-password', 'openai', 'test-openai-secret');
  const second = register('ai-two@example.com', 'a-long-password', 'gemini', 'test-gemini-secret');
  assert.deepEqual(first.ai, { provider: 'openai', configured: true });
  assert.equal(JSON.stringify(first).includes('test-openai-secret'), false);
  assert.deepEqual(getAiConfig(`Bearer ${first.token}`), { provider: 'openai', apiKey: 'test-openai-secret' });
  assert.deepEqual(getAiConfig(`Bearer ${second.token}`), { provider: 'gemini', apiKey: 'test-gemini-secret' });
  saveAiConfig(`Bearer ${first.token}`, 'claude', 'replacement-secret');
  assert.deepEqual(getAiConfig(`Bearer ${first.token}`), { provider: 'claude', apiKey: 'replacement-secret' });
  assert.deepEqual(login('ai-one@example.com', 'a-long-password').ai, { provider: 'claude', configured: true });
  assert.throws(() => saveAiConfig(`Bearer ${second.token}`, 'other', 'wrong-secret'), { status: 400 });
});

test('onboarding saves profile and weekly plan to the same account', () => {
  const account = register('plan@example.com', 'a-long-password');
  const profile = { name: 'Sam', dob: '1992-03-03', heightCm: '175', weightKg: 75,
    goal: 'maintain', setting: 'home', activity: 'light', equation: 'male', nutritionCaution: false,
    allergies: '', concerns: '', fitnessPlan: '', daysPerWeek: 3, pace: 'moderate' };
  const plan = { days: Array.from({ length: 7 }, (_, index) => ({ day: index, title: 'Walk' })) };
  saveOnboarding(`Bearer ${account.token}`, profile, plan);
  assert.deepEqual(getAccount(`Bearer ${account.token}`).plan, plan);
  assert.deepEqual(login('plan@example.com', 'a-long-password').plan, plan);
});
