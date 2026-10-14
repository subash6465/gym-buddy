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
    assert.match(calls[2].url, /models\/gemini-3\.8-flash:generateContent/);
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

test('a structured-output fallback shares the original provider deadline', async () => {
  const originalFetch = globalThis.fetch;
  const originalNow = Date.now;
  let now = 1000;
  let calls = 0;
  Date.now = () => now;
  globalThis.fetch = async () => {
    calls++;
    now = 2000;
    return { ok: false, status: 400, json: async () => ({ error: { message: 'Unsupported output schema' } }) };
  };
  try {
    await assert.rejects(generate({ provider: 'gemini', task: 'planning', apiKey: 'private-test-key',
      instructions: 'Reply briefly', messages: [{ role: 'user', content: 'Hello' }],
      jsonSchema: { type: 'object' }, deadline: 1500 }), /took too long to respond/);
    assert.equal(calls, 1);
  } finally { globalThis.fetch = originalFetch; Date.now = originalNow; }
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
      'gemma-4-26b-a4b-it', 'gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-3.5-flash-lite',
    ]);
  } finally { globalThis.fetch = original; }
});

test('Flash-Lite coach returns only final answer parts', async () => {
  const original = globalThis.fetch;
  let request;
  globalThis.fetch = async (_url, options) => {
    request = JSON.parse(options.body);
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [
      { thought: true, text: 'Private reasoning with app instructions' },
      { text: 'Please review the proposed change.' },
    ] } }] }) };
  };
  try {
    const reply = await generate({ provider: 'gemini', task: 'chat', apiKey: 'private-test-key', instructions: 'Reply briefly',
      messages: [{ role: 'user', content: 'Hello' }] });
    assert.equal(request.generationConfig?.thinkingConfig, undefined);
    assert.equal(reply, 'Please review the proposed change.');
  } finally { globalThis.fetch = original; }
});

test('Flash-Lite coach gets a single structured JSON request', async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (_url, options) => {
    calls.push(JSON.parse(options.body));
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: '{"reply":"Hello","action":{"kind":"none","mode":"set","date":"","value":0}}' }] } }] }) };
  };
  try {
    await generate({ provider: 'gemini', task: 'chat', apiKey: 'private-test-key', instructions: 'Reply briefly',
      messages: [{ role: 'user', content: 'Hello' }], jsonSchema: { type: 'object', properties: { reply: { type: 'string' } } } });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].generationConfig.thinkingConfig, undefined);
    assert.equal(calls[0].generationConfig.responseMimeType, 'application/json');
    assert.deepEqual(calls[0].generationConfig.responseJsonSchema, { type: 'object', properties: { reply: { type: 'string' } } });
    assert.equal(calls[0].systemInstruction.parts[0].text, 'Reply briefly');
  } finally { globalThis.fetch = original; }
});

test('malformed provider JSON returns a recoverable provider error', async (t) => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async () => new Response('not JSON');
  await assert.rejects(generate({ provider: 'openai', apiKey: 'private-test-key', instructions: 'Reply briefly', messages: [{ role: 'user', content: 'Hello' }] }), { status: 502 });
});

test('OpenAI and Claude preserve strict schemas, use task budgets, and hide reasoning', async (t) => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  const schema = { type: 'object', additionalProperties: false, properties: { reply: { type: 'string' } }, required: ['reply'] };
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push(JSON.parse(options.body));
    const text = '{"reply":"Hello"}';
    return new Response(JSON.stringify(String(url).includes('openai')
      ? { output: [{ type: 'reasoning', summary: [{ text: 'private' }] }, { type: 'message', content: [{ type: 'output_text', text }] }] }
      : { content: [{ type: 'thinking', thinking: 'private' }, { type: 'text', text }] }));
  };
  for (const provider of ['openai', 'claude']) {
    for (const task of ['verification', 'chat', 'planning', 'review', 'meal']) {
      const reply = await generate({ provider, task, apiKey: 'private-test-key', instructions: 'Return JSON',
        messages: [{ role: 'user', content: 'Hello' }], jsonSchema: schema });
      assert.equal(reply, '{"reply":"Hello"}');
      const body = calls.at(-1);
      const limit = { verification: 1200, chat: 1600, planning: 6000, review: 3000, meal: 1200 }[task];
      if (provider === 'openai') {
        assert.equal(body.max_output_tokens, limit);
        assert.equal(body.store, false);
        assert.equal(body.text.format.strict, true);
        assert.deepEqual(body.text.format.schema, schema);
        assert.equal(body.reasoning.effort, task === 'planning' ? 'medium' : task === 'review' ? 'low' : 'none');
      } else {
        assert.equal(body.max_tokens, limit);
        assert.deepEqual(body.output_config.format.schema, schema);
        assert.equal(body.output_config.effort, ['planning', 'review'].includes(task) ? 'medium' : 'low');
      }
    }
  }
});

test('recovers temporary OpenAI and Claude failures with the same request and deadline', async (t) => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  for (const [provider, status] of [['openai', 503], ['claude', 529]]) {
    const bodies = [];
    const timeouts = [];
    globalThis.fetch = async (_url, options) => {
      bodies.push(options.body);
      timeouts.push(options.signal);
      if (bodies.length === 1) return new Response('{}', { status });
      return new Response(JSON.stringify(provider === 'openai'
        ? { output: [{ type: 'message', content: [{ type: 'output_text', text: 'Recovered' }] }] }
        : { content: [{ type: 'text', text: 'Recovered' }] }));
    };
    assert.equal(await generate({ provider, task: 'chat', apiKey: 'private-test-key', instructions: 'Briefly', messages: [{ role: 'user', content: 'Hello' }], deadline: Date.now() + 10_000 }), 'Recovered');
    assert.equal(bodies.length, 2);
    assert.equal(bodies[0], bodies[1]);
    assert.ok(timeouts.every((signal) => signal instanceof AbortSignal));
  }
});

test('permanent failures and Retry-After beyond the deadline do not trigger billable retries', async (t) => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  for (const provider of ['openai', 'claude', 'gemini']) {
    for (const status of [400, 401, 403, 404, 429]) {
      let calls = 0;
      globalThis.fetch = async () => {
        calls++;
        return new Response(JSON.stringify({ error: { code: 'insufficient_quota', message: 'monthly spend cap; private-test-key' } }), { status });
      };
      await assert.rejects(generate({ provider, task: 'chat', apiKey: 'private-test-key', instructions: 'Briefly', messages: [{ role: 'user', content: 'Hello' }] }), (error) => {
        assert.equal(error.providerStatus, status);
        assert.doesNotMatch(error.message, /private-test-key/);
        return true;
      });
      assert.equal(calls, 1);
    }
    let calls = 0;
    globalThis.fetch = async () => { calls++; return new Response('{}', { status: 429, headers: { 'retry-after': '60' } }); };
    await assert.rejects(generate({ provider, task: 'chat', apiKey: 'private-test-key', instructions: 'Briefly', messages: [{ role: 'user', content: 'Hello' }], deadline: Date.now() + 5000 }), { providerStatus: 429 });
    assert.equal(calls, 1);
  }
});

test('partial output and refusals never reach feature JSON parsing or automatic regeneration', async (t) => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  const cases = [
    ['openai', { status: 'incomplete', output: [{ type: 'message', content: [{ type: 'output_text', text: '{' }] }] }, 502],
    ['claude', { stop_reason: 'max_tokens', content: [{ type: 'text', text: '{' }] }, 502],
    ['gemini', { candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: '{' }] } }] }, 502],
    ['openai', { output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'No' }] }] }, 422],
    ['claude', { stop_reason: 'refusal', content: [{ type: 'text', text: 'No' }] }, 422],
    ['gemini', { promptFeedback: { blockReason: 'SAFETY' } }, 422],
    ['openai', null, 502],
  ];
  for (const [provider, payload, status] of cases) {
    let calls = 0;
    globalThis.fetch = async () => { calls++; return new Response(JSON.stringify(payload)); };
    await assert.rejects(generate({ provider, task: 'chat', apiKey: 'private-test-key', instructions: 'Briefly', messages: [{ role: 'user', content: 'Hello' }] }), { status });
    assert.equal(calls, 1);
  }
});

test('opt-in usage metrics include billable reasoning and cache counters without private content', async (t) => {
  const originalFetch = globalThis.fetch;
  const originalInfo = console.info;
  const originalSetting = process.env.AI_USAGE_LOGGING;
  t.after(() => {
    globalThis.fetch = originalFetch; console.info = originalInfo;
    if (originalSetting === undefined) delete process.env.AI_USAGE_LOGGING; else process.env.AI_USAGE_LOGGING = originalSetting;
  });
  const logs = [];
  console.info = (line) => logs.push(line);
  process.env.AI_USAGE_LOGGING = 'true';
  for (const provider of ['openai', 'claude', 'gemini']) {
    globalThis.fetch = async () => new Response(JSON.stringify(provider === 'openai'
      ? { usage: { input_tokens: 2000, output_tokens: 700, input_tokens_details: { cached_tokens: 1500 } }, output: [{ type: 'message', content: [{ type: 'output_text', text: 'OK' }] }] }
      : provider === 'claude' ? { usage: { input_tokens: 500, output_tokens: 700, cache_read_input_tokens: 1500, cache_creation_input_tokens: 200 }, content: [{ type: 'text', text: 'OK' }] }
        : { usageMetadata: { promptTokenCount: 2000, candidatesTokenCount: 300, thoughtsTokenCount: 400, cachedContentTokenCount: 1500 }, candidates: [{ content: { parts: [{ text: 'OK' }] } }] }));
    await generate({ provider, task: 'chat', apiKey: 'private-test-key', instructions: 'private instructions', messages: [{ role: 'user', content: 'private user data' }] });
    assert.equal(JSON.parse(logs.at(-1)).outputTokens, 700);
    assert.equal(JSON.parse(logs.at(-1)).cachedInputTokens, 1500);
    assert.doesNotMatch(logs.at(-1), /private/);
  }
  assert.equal(JSON.parse(logs[1]).cacheWriteTokens, 200);
  process.env.AI_USAGE_LOGGING = 'false';
  await generate({ provider: 'gemini', task: 'chat', apiKey: 'private-test-key', instructions: 'Briefly', messages: [{ role: 'user', content: 'Hello' }] });
  assert.equal(logs.length, 3);
});
