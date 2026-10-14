// Resolve on each request so server-side overrides remain consistent across tasks.
const defaults = {
  openai: { verification: 'gpt-6-luna', chat: 'gpt-6-luna', meal: 'gpt-6-luna',
    photo: 'gpt-6.1-sol', planning: 'gpt-6.1-sol', review: 'gpt-6.1-sol' },
  claude: { verification: 'claude-haiku-5-5', chat: 'claude-haiku-5-5', meal: 'claude-haiku-5-5',
    photo: 'claude-sonnet-5-5', planning: 'claude-sonnet-5-5', review: 'claude-sonnet-5-5' },
  gemini: { verification: 'gemini-3.5-flash-lite', chat: 'gemini-3.1-flash-lite', meal: 'gemini-3.5-flash-lite',
    photo: 'gemini-3.5-flash-lite', planning: 'gemini-3.8-flash', review: 'gemini-3.8-flash' },
};
// Connection checks still need room for adaptive thinking before the short reply.
const outputLimits = { verification: 1200, chat: 1600, meal: 1200, photo: 2400, planning: 6000, review: 3000 };

export function aiPolicy(provider, task = 'chat', hasPhoto = false, env = typeof process !== 'undefined' ? process.env : {}) {
  if (!Object.hasOwn(defaults, provider)) return null;
  const resolvedTask = hasPhoto && task === 'meal' ? 'photo' : task;
  if (!Object.hasOwn(defaults[provider], resolvedTask)) return null;
  const prefix = provider.toUpperCase();
  const configured = (name) => env[name]?.trim();
  // Legacy Gemini_MODEL applied only to planning. OpenAI/Claude globals remain
  // all-task overrides for existing deployments; task overrides take precedence.
  const legacy = provider === 'gemini'
    ? resolvedTask === 'planning' ? configured('GEMINI_MODEL') : null
    : configured(`${prefix}_MODEL`);
  const model = configured(`${prefix}_${resolvedTask.toUpperCase()}_MODEL`) || legacy || defaults[provider][resolvedTask];
  const routine = ['verification', 'chat', 'meal'].includes(resolvedTask);
  const policy = { model, task: resolvedTask, maxOutputTokens: outputLimits[resolvedTask] };
  if (provider === 'openai') {
    // Do not send reasoning parameters to legacy/non-reasoning model overrides.
    if (['gpt-6-luna', 'gpt-6-sol', 'gpt-6.1-sol', 'gpt-6-astra'].includes(model)) {
      policy.reasoningEffort = routine && ['gpt-6-luna', 'gpt-6-sol'].includes(model)
        ? 'none' : resolvedTask === 'planning' ? 'medium' : 'low';
    }
  } else if (provider === 'claude' && ['claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-sonnet-5', 'claude-opus-5', 'claude-opus-5-5'].includes(model)) {
    policy.effort = routine ? 'low' : 'medium';
  }
  return policy;
}
