import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aiPolicy } from '../server/ai-policy.mjs';

test('balances every provider task and promotes photo meals to the vision model', () => {
  const expected = {
    openai: ['gpt-6-luna', 'gpt-6.1-sol', 'gpt-6-luna', 'gpt-6-luna', 'gpt-6.1-sol'],
    claude: ['claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5', 'claude-haiku-5-5', 'claude-sonnet-5-5'],
    gemini: ['gemma-4-26b-a4b-it', 'gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'gemini-3.8-flash'],
  };
  for (const [provider, models] of Object.entries(expected)) {
    assert.deepEqual(['verification', 'planning', 'chat', 'meal', 'review'].map((task) => aiPolicy(provider, task, false, {}).model), models);
    assert.equal(aiPolicy(provider, 'meal', true, {}).model, models[1]);
    assert.equal(aiPolicy(provider, 'meal', true, {}).task, 'photo');
    assert.equal(aiPolicy(provider, 'meal', false, {}).maxOutputTokens, 1200);
    assert.equal(aiPolicy(provider, 'meal', true, {}).maxOutputTokens, 2400);
    assert.equal(aiPolicy(provider, 'verification', false, {}).maxOutputTokens, 1200);
  }
  assert.equal(aiPolicy('unknown', 'chat', false, {}), null);
  assert.equal(aiPolicy('openai', 'unknown', false, {}), null);
});

test('task settings override legacy globals; blank settings use defaults', () => {
  for (const provider of ['openai', 'claude']) {
    const prefix = provider.toUpperCase();
    const env = { [`${prefix}_MODEL`]: ' legacy-model ', [`${prefix}_CHAT_MODEL`]: ' chat-model ', [`${prefix}_PHOTO_MODEL`]: 'photo-model' };
    assert.equal(aiPolicy(provider, 'chat', false, env).model, 'chat-model');
    assert.equal(aiPolicy(provider, 'planning', false, env).model, 'legacy-model');
    assert.equal(aiPolicy(provider, 'meal', false, env).model, 'legacy-model');
    assert.equal(aiPolicy(provider, 'meal', true, env).model, 'photo-model');
    assert.equal(aiPolicy(provider, 'chat', false, { [`${prefix}_MODEL`]: ' ', [`${prefix}_CHAT_MODEL`]: '' }).model, aiPolicy(provider, 'chat', false, {}).model);
  }
  assert.equal(aiPolicy('gemini', 'planning', false, { GEMINI_MODEL: 'legacy' }).model, 'legacy');
  assert.equal(aiPolicy('gemini', 'meal', true, { GEMINI_MEAL_MODEL: 'text-only' }).model, 'gemini-3.8-flash');
  assert.equal(aiPolicy('gemini', 'chat', false, { GEMINI_MODEL: 'legacy' }).model, 'gemini-3.1-flash-lite');
});

test('effort is task-specific and compatible with supported alternative models', () => {
  assert.equal(aiPolicy('openai', 'chat', false, {}).reasoningEffort, 'none');
  assert.equal(aiPolicy('openai', 'planning', false, {}).reasoningEffort, 'medium');
  assert.equal(aiPolicy('openai', 'meal', true, {}).reasoningEffort, 'low');
  assert.equal(aiPolicy('openai', 'chat', false, { OPENAI_MODEL: 'gpt-6.1-sol' }).reasoningEffort, 'low');
  assert.equal(aiPolicy('openai', 'chat', false, { OPENAI_MODEL: 'gpt-6-sol' }).reasoningEffort, 'none');
  assert.equal(aiPolicy('openai', 'chat', false, { OPENAI_MODEL: 'gpt-4o-mini' }).reasoningEffort, undefined);
  for (const model of ['claude-sonnet-5', 'claude-opus-5']) {
    assert.equal(aiPolicy('claude', 'planning', false, { CLAUDE_MODEL: model }).effort, 'medium');
    assert.equal(aiPolicy('claude', 'chat', false, { CLAUDE_MODEL: model }).effort, 'low');
  }
  assert.equal(aiPolicy('claude', 'chat', false, { CLAUDE_MODEL: 'claude-haiku-4-5' }).effort, undefined);
});
