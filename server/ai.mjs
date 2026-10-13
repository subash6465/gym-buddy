const models = {
  openai: () => process.env.OPENAI_MODEL || 'gpt-4o-mini',
  claude: () => process.env.CLAUDE_MODEL || 'claude-haiku-5-5',
};
const googleModels = {
  verification: () => process.env.GEMINI_VERIFICATION_MODEL || 'gemma-4-26b-a4b-it',
  planning: () => process.env.GEMINI_PLANNING_MODEL || process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  chat: () => process.env.GEMINI_CHAT_MODEL || 'gemma-4-31b-it',
  meal: () => process.env.GEMINI_MEAL_MODEL || 'gemini-3.5-flash-lite',
  review: () => process.env.GEMINI_REVIEW_MODEL || 'gemini-3.8-flash',
};
const image = (dataUrl) => {
  if (!dataUrl) return null;
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) throw Object.assign(new Error('Unsupported meal photo.'), { status: 400 });
  return { mimeType: match[1], data: match[2] };
};
const providerError = async (provider, response, headers) => {
  const status = response.status;
  const payload = provider === 'gemini' && status === 400 ? await response.json?.().catch(() => null) : null;
  const key = headers['x-goog-api-key'];
  const detail = typeof payload?.error?.message === 'string'
    ? payload.error.message.replaceAll(key, '[redacted]').replace(/\s+/g, ' ').slice(0, 240) : '';
  const reason = status === 401 ? 'The API key was rejected. Enter the correct key and verify again.' : status === 403 ? 'The key does not have access to this model. Check its permissions and verify again.'
    : status === 429 ? 'The provider rate limit or account quota was reached.'
      : status === 503 ? 'The provider is temporarily overloaded or unavailable. Please try again shortly.'
      : status === 400 || status === 404 ? detail || 'The provider rejected the request or the configured model is unavailable.'
        : 'The provider could not complete the request.';
  return Object.assign(new Error(`${provider} request failed (${status}). ${reason}`), { status: 502, providerStatus: status });
};

const providerTimeout = (provider) => Object.assign(new Error(`${provider} took too long to respond. Try again shortly.`), { status: 504 });

async function sendProviderRequest(provider, url, headers, body, deadline) {
  const retryable = new Set([408, 429, 500, 502, 503, 504]);
  for (let attempt = 0; attempt < 3; attempt++) {
    if (Date.now() >= deadline) throw providerTimeout(provider);
    let response;
    try {
      response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body),
        signal: AbortSignal.timeout(Math.max(1, deadline - Date.now())) });
    } catch {
      if (Date.now() >= deadline) throw providerTimeout(provider);
      if (provider !== 'gemini' || attempt === 2 || Date.now() >= deadline) {
        throw Object.assign(new Error(`${provider} is unavailable. Try again shortly.`), { status: 503 });
      }
    }
    if (response?.ok) return response;
    if (response && (provider !== 'gemini' || !retryable.has(response.status) || attempt === 2)) {
      throw await providerError(provider, response, headers);
    }
    const pause = Math.min(1000 * 2 ** attempt + Math.floor(Math.random() * 500), Math.max(0, deadline - Date.now()));
    if (pause) await new Promise((resolve) => setTimeout(resolve, pause));
  }
  throw Object.assign(new Error(`${provider} is unavailable. Try again shortly.`), { status: 503 });
}

export async function generate({ provider, apiKey, instructions, messages, imageDataUrl, jsonSchema, task, deadline = Date.now() + 75_000 }) {
  if (!(provider === 'gemini' ? googleModels[task] : models[provider]) || !apiKey) {
    throw Object.assign(new Error('Set up an AI provider and key when you sign in.'), { status: 409 });
  }
  const photo = image(imageDataUrl);
  const last = messages.length - 1;
  const gemmaChat = provider === 'gemini' && task === 'chat' && googleModels.chat().startsWith('gemma-4-');
  let url; let headers; let body;
  if (provider === 'openai') {
    url = 'https://api.openai.com/v1/responses';
    headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
    body = { model: models.openai(), store: false, instructions,
      input: messages.map((message, index) => ({ role: message.role, content: index === last && photo
        ? [{ type: 'input_text', text: message.content }, { type: 'input_image', image_url: imageDataUrl, detail: 'low' }]
        : message.content })),
      ...(jsonSchema ? { text: { format: { type: 'json_schema', name: `${task || 'structured'}_result`, strict: true, schema: jsonSchema } } } : {}) };
  } else if (provider === 'claude') {
    url = 'https://api.anthropic.com/v1/messages';
    headers = { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' };
    body = { model: models.claude(), max_tokens: 1200, system: instructions,
      messages: messages.map((message, index) => ({ role: message.role, content: index === last && photo
        ? [{ type: 'text', text: message.content }, { type: 'image', source: { type: 'base64', media_type: photo.mimeType, data: photo.data } }]
        : message.content })), ...(jsonSchema ? { output_config: { format: { type: 'json_schema', schema: jsonSchema } } } : {}) };
  } else {
    url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(googleModels[task]())}:generateContent`;
    headers = { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' };
    const generationConfig = { ...(gemmaChat ? { thinkingConfig: { thinkingLevel: 'minimal' } } : {}),
      ...(jsonSchema && !gemmaChat ? { responseFormat: { text: { mimeType: 'application/json', schema: jsonSchema } } } : {}) };
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
      generationConfig: { ...(body.generationConfig?.thinkingConfig ? { thinkingConfig: body.generationConfig.thinkingConfig } : {}), responseMimeType: 'application/json' } };
    response = await sendProviderRequest(provider, url, headers, fallbackBody, deadline);
  }
  const payload = await response.json();
  const text = provider === 'openai'
    ? payload.output?.flatMap((item) => item.type === 'message' ? item.content || [] : []).filter((item) => item.type === 'output_text').map((item) => item.text).join('\n')
    : provider === 'claude' ? payload.content?.filter((item) => item.type === 'text').map((item) => item.text).join('\n')
      : payload.candidates?.[0]?.content?.parts?.filter((item) => item.thought !== true && typeof item.text === 'string').map((item) => item.text).join('\n');
  if (!text?.trim()) throw Object.assign(new Error(`${provider} did not return a reply. Try again.`), { status: 502 });
  return text.trim();
}
