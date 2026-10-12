import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generate } from '../server/ai.mjs';

test('routes text and images to the chosen provider without exposing keys in output', async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options, body: JSON.parse(options.body) });
    const answer = url.includes('openai') ? { output: [{ type: 'message', content: [{ type: 'output_text', text: 'OpenAI reply' }] }] }
      : url.includes('anthropic') ? { content: [{ type: 'text', text: 'Claude reply' }] }
        : { candidates: [{ content: { parts: [{ text: 'Gemini reply' }] } }] };
    return { ok: true, json: async () => answer };
  };
  try {
    const input = { apiKey: 'private-test-key', instructions: 'Be helpful', messages: [{ role: 'user', content: 'Hello' }],
      imageDataUrl: 'data:image/png;base64,aGVsbG8=' };
    assert.equal(await generate({ ...input, provider: 'openai' }), 'OpenAI reply');
    assert.equal(await generate({ ...input, provider: 'claude' }), 'Claude reply');
    assert.equal(await generate({ ...input, provider: 'gemini', task: 'meal' }), 'Gemini reply');
    assert.match(calls[0].url, /api\.openai\.com/);
    assert.equal(calls[0].options.headers.Authorization, 'Bearer private-test-key');
    assert.equal(calls[0].body.input[0].content[1].type, 'input_image');
    assert.match(calls[1].url, /api\.anthropic\.com/);
    assert.equal(calls[1].options.headers['x-api-key'], 'private-test-key');
    assert.equal(calls[1].body.messages[0].content[1].source.media_type, 'image/png');
    assert.match(calls[2].url, /models\/gemini-3\.5-flash-lite:generateContent/);
    assert.equal(calls[2].options.headers['x-goog-api-key'], 'private-test-key');
    assert.equal(calls[2].body.contents[0].parts[1].inlineData.mimeType, 'image/png');
  } finally { globalThis.fetch = original; }
});

test('retries a temporary Gemini 503 and returns the next successful reply', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return calls === 1 ? { ok: false, status: 503 } : {
      ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'Recovered' }] } }] }),
    };
  };
  try {
    assert.equal(await generate({ provider: 'gemini', task: 'chat', apiKey: 'private-test-key', instructions: 'Reply briefly',
      messages: [{ role: 'user', content: 'Hello' }] }), 'Recovered');
    assert.equal(calls, 2);
  } finally { globalThis.fetch = original; }
});

test('does not retry a rejected Gemini API key', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; return { ok: false, status: 401 }; };
  try {
    await assert.rejects(generate({ provider: 'gemini', task: 'verification', apiKey: 'private-test-key', instructions: 'Reply briefly',
      messages: [{ role: 'user', content: 'Hello' }] }), (error) => {
      assert.match(error.message, /API key was rejected/);
      assert.doesNotMatch(error.message, /private-test-key/);
      return true;
    });
    assert.equal(calls, 1);
  } finally { globalThis.fetch = original; }
});

test('routes each Google task to its configured default model', async () => {
  const original = globalThis.fetch;
  const urls = [];
  globalThis.fetch = async (url) => {
    urls.push(url);
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'OK' }] } }] }) };
  };
  try {
    for (const task of ['verification', 'planning', 'chat', 'meal']) {
      await generate({ provider: 'gemini', task, apiKey: 'private-test-key', instructions: 'Reply briefly',
        messages: [{ role: 'user', content: 'Hello' }] });
    }
    assert.deepEqual(urls.map((url) => url.match(/\/models\/([^:]+):generateContent$/)[1]), [
      'gemma-4-26b-a4b-it', 'gemini-3.8-flash', 'gemma-4-31b-it', 'gemini-3.5-flash-lite',
    ]);
  } finally { globalThis.fetch = original; }
});
