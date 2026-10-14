import { aiPolicy } from './ai-policy.mjs';
const image = (dataUrl) => {
  if (!dataUrl) return null;
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) throw Object.assign(new Error('Unsupported meal photo.'), { status: 400 });
  return { mimeType: match[1], data: match[2] };
};
const providerError = async (provider, response, headers) => {
  const status = response.status;
  const payload = await response.json?.().catch(() => null);
  const key = headers['x-goog-api-key'];
  const detail = provider === 'gemini' && status === 400 && typeof payload?.error?.message === 'string'
    ? payload.error.message.replaceAll(key, '[redacted]').replace(/\s+/g, ' ').slice(0, 240) : '';
  const reason = status === 401 ? 'The API key was rejected. Enter the correct key and verify again.' : status === 403 ? 'The key does not have access to this model. Check its permissions and verify again.'
    : status === 429 ? 'The provider rate limit or account quota was reached.'
      : status === 503 || status === 529 ? 'The provider is temporarily overloaded or unavailable. Please try again shortly.'
      : status === 400 || status === 404 ? detail || 'The provider rejected the request or the configured model is unavailable.'
        : 'The provider could not complete the request.';
  const permanentQuota = status === 429 && /insufficient_quota|billing_hard_limit_reached|credit balance|monthly.*spend|spend (?:cap|limit)/i.test(
    `${payload?.error?.code || ''} ${payload?.error?.message || ''}`);
  return Object.assign(new Error(`${provider} request failed (${status}). ${reason}`), {
    status: 502, providerStatus: status, retryable: !permanentQuota,
  });
};

const providerTimeout = (provider) => Object.assign(new Error(`${provider} took too long to respond. Try again shortly.`), { status: 504 });

async function sendProviderRequest(provider, url, headers, body, deadline) {
  const retryable = new Set([408, 429, 500, 502, 503, 504, 529]);
  for (let attempt = 0; attempt < 3; attempt++) {
    if (Date.now() >= deadline) throw providerTimeout(provider);
    let response;
    const controller = new AbortController();
    let timedOut = false;
    let timeout;
    try {
      // React Native supports AbortController; do not rely on Node's
      // AbortSignal.timeout. Keep the deadline active through body download.
      response = await Promise.race([
        (async () => {
          const result = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: controller.signal });
          let payload; let parseError;
          try { payload = await result.json(); }
          catch (error) { parseError = error; }
          return { ok: result.ok, status: result.status, headers: result.headers,
            json: async () => { if (parseError) throw parseError; return payload; } };
        })(),
        new Promise((resolve, reject) => {
          timeout = setTimeout(() => { timedOut = true; controller.abort(); reject(providerTimeout(provider)); }, Math.max(1, deadline - Date.now()));
        }),
      ]);
    } catch {
      if (timedOut || Date.now() >= deadline) throw providerTimeout(provider);
      if (attempt === 2) {
        throw Object.assign(new Error(`${provider} is unavailable. Try again shortly.`), { status: 503 });
      }
    } finally {
      clearTimeout(timeout);
    }
    if (response?.ok) return response;
    const error = response ? await providerError(provider, response, headers) : null;
    if (response && (!retryable.has(response.status) || !error.retryable || attempt === 2)) {
      throw error;
    }
    const retryAfter = response?.headers?.get('retry-after');
    const retryMs = response?.headers?.get('retry-after-ms');
    const headerDelay = retryMs && Number.isFinite(Number(retryMs)) ? Number(retryMs)
      : retryAfter ? Number.isFinite(Number(retryAfter)) ? Number(retryAfter) * 1000 : Date.parse(retryAfter) - Date.now() : 0;
    const pause = Math.max(1000 * 2 ** attempt, Number.isFinite(headerDelay) ? headerDelay : 0) + Math.floor(Math.random() * 500);
    // Never retry earlier than the provider requests or beyond the original deadline.
    if (pause >= deadline - Date.now()) throw error || providerTimeout(provider);
    if (pause) await new Promise((resolve) => setTimeout(resolve, pause));
  }
  throw Object.assign(new Error(`${provider} is unavailable. Try again shortly.`), { status: 503 });
}

export async function generate({ provider, apiKey, instructions, messages, imageDataUrl, jsonSchema, task = 'chat', deadline = Date.now() + 75_000 }) {
  const photo = image(imageDataUrl);
  const policy = aiPolicy(provider, task, Boolean(photo));
  if (!policy || !apiKey) {
    throw Object.assign(new Error('Set up an AI provider and key when you sign in.'), { status: 409 });
  }
  const last = messages.length - 1;
  const gemmaChat = provider === 'gemini' && task === 'chat' && policy.model.startsWith('gemma-4-');
  let url; let headers; let body;
  if (provider === 'openai') {
    url = 'https://api.openai.com/v1/responses';
    headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
    body = { model: policy.model, store: false, instructions, max_output_tokens: policy.maxOutputTokens,
      ...(policy.reasoningEffort ? { reasoning: { effort: policy.reasoningEffort } } : {}),
      input: messages.map((message, index) => ({ role: message.role, content: index === last && photo
        ? [{ type: 'input_text', text: message.content }, { type: 'input_image', image_url: imageDataUrl, detail: 'high' }]
        : message.content })),
      ...(jsonSchema ? { text: { format: { type: 'json_schema', name: `${task || 'structured'}_result`, strict: true, schema: jsonSchema } } } : {}) };
  } else if (provider === 'claude') {
    url = 'https://api.anthropic.com/v1/messages';
    headers = { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' };
    body = { model: policy.model, max_tokens: policy.maxOutputTokens, system: instructions,
      messages: messages.map((message, index) => ({ role: message.role, content: index === last && photo
        ? [{ type: 'text', text: message.content }, { type: 'image', source: { type: 'base64', media_type: photo.mimeType, data: photo.data } }]
        : message.content })),
      ...(jsonSchema || policy.effort ? { output_config: {
        ...(policy.effort ? { effort: policy.effort } : {}),
        ...(jsonSchema ? { format: { type: 'json_schema', schema: jsonSchema } } : {}),
      } } : {}) };
  } else {
    url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(policy.model)}:generateContent`;
    headers = { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' };
    const generationConfig = { maxOutputTokens: policy.maxOutputTokens,
      ...(gemmaChat ? { thinkingConfig: { thinkingLevel: 'minimal' } } : {}),
      ...(jsonSchema && !gemmaChat ? task === 'chat'
        ? { responseMimeType: 'application/json', responseJsonSchema: jsonSchema }
        : { responseFormat: { text: { mimeType: 'application/json', schema: jsonSchema } } } : {}) };
    const systemText = gemmaChat && jsonSchema ? `${instructions}\nReturn only a JSON object matching this schema: ${JSON.stringify(jsonSchema)}. No Markdown or extra text.` : instructions;
    body = { systemInstruction: { parts: [{ text: systemText }] },
      contents: messages.map((message, index) => ({ role: message.role === 'assistant' ? 'model' : 'user', parts: [
        { text: message.content }, ...(index === last && photo ? [{ inlineData: { mimeType: photo.mimeType, data: photo.data } }] : []),
      ] })), ...(Object.keys(generationConfig).length ? { generationConfig } : {}) };
  }
  let response;
  try {
    response = await sendProviderRequest(provider, url, headers, body, deadline);
  } catch (error) {
    if (provider !== 'gemini' || !jsonSchema || gemmaChat || error.providerStatus !== 400) throw error;
    const fallbackBody = { ...body,
      systemInstruction: { parts: [{ text: `${instructions}\nReturn only a JSON object matching this schema: ${JSON.stringify(jsonSchema)}` }] },
      generationConfig: { maxOutputTokens: policy.maxOutputTokens,
        ...(body.generationConfig?.thinkingConfig ? { thinkingConfig: body.generationConfig.thinkingConfig } : {}), responseMimeType: 'application/json' } };
    response = await sendProviderRequest(provider, url, headers, fallbackBody, deadline);
  }
  let payload;
  try { payload = await response.json(); }
  catch { throw Object.assign(new Error(`${provider} returned an invalid response. Try again.`), { status: 502 }); }
  if (!payload || typeof payload !== 'object') throw Object.assign(new Error(`${provider} returned an invalid response. Try again.`), { status: 502 });
  if (typeof process !== 'undefined' && process.env.AI_USAGE_LOGGING === 'true') {
    const usage = payload.usage || {};
    const googleUsage = payload.usageMetadata || {};
    console.info(JSON.stringify({ event: 'ai_usage', provider, model: policy.model, task: policy.task,
      inputTokens: usage.input_tokens ?? googleUsage.promptTokenCount ?? null,
      outputTokens: usage.output_tokens ?? (Number.isFinite(googleUsage.candidatesTokenCount)
        ? googleUsage.candidatesTokenCount + (googleUsage.thoughtsTokenCount || 0) : null),
      cachedInputTokens: usage.input_tokens_details?.cached_tokens ?? usage.cache_read_input_tokens ?? googleUsage.cachedContentTokenCount ?? 0,
      cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
    }));
  }
  const incomplete = provider === 'openai' ? ['incomplete', 'failed', 'cancelled'].includes(payload.status)
    : provider === 'claude' ? payload.stop_reason === 'max_tokens' : payload.candidates?.[0]?.finishReason === 'MAX_TOKENS';
  if (incomplete) throw Object.assign(new Error(`${provider} could not finish the response within its output limit. Try a shorter request.`), { status: 502 });
  const refusal = provider === 'openai' ? payload.output?.some((item) => item.content?.some((part) => part.type === 'refusal'))
    : provider === 'claude' ? payload.stop_reason === 'refusal' : Boolean(payload.promptFeedback?.blockReason) ||
      ['SAFETY', 'BLOCKLIST', 'PROHIBITED_CONTENT'].includes(payload.candidates?.[0]?.finishReason);
  if (refusal) throw Object.assign(new Error(`${provider} could not help with that request. Try rephrasing it.`), { status: 422 });
  const text = provider === 'openai'
    ? payload.output?.flatMap((item) => item.type === 'message' ? item.content || [] : []).filter((item) => item.type === 'output_text').map((item) => item.text).join('\n')
    : provider === 'claude' ? payload.content?.filter((item) => item.type === 'text').map((item) => item.text).join('\n')
      : payload.candidates?.[0]?.content?.parts?.filter((item) => item.thought !== true && typeof item.text === 'string').map((item) => item.text).join('\n');
  if (!text?.trim()) throw Object.assign(new Error(`${provider} did not return a reply. Try again.`), { status: 502 });
  return text.trim();
}
