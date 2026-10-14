import { generate } from './ai/ai.mjs';
import { createPlan } from './ai/planning.mjs';
import { createReview, validateReviewJob } from './ai/reviews.mjs';
import { identifyExercise } from './ai/exercises.mjs';
import { chat, estimateMeal } from './ai/workflows.mjs';
import { validateProfile } from './ai/profile.mjs';

const clone = (value) => JSON.parse(JSON.stringify(value));
const fail = (message) => { throw new Error(message); };
const empty = () => ({ version: 1, profile: null, plan: null, startedOn: null, reviews: [] });
const comparablePlan = (plan) => plan ? JSON.stringify({ summary: plan.summary, suggestions: plan.suggestions, days: plan.days,
  calorieTarget: plan.calorieTarget, proteinGrams: plan.proteinGrams, waterMl: plan.waterMl, stepsTarget: plan.stepsTarget, nutrition: plan.nutrition || null }) : '';
const validConfig = (value) => value && ['openai', 'claude', 'gemini'].includes(value.provider) &&
  typeof value.apiKey === 'string' && value.apiKey.trim().length >= 10 && value.apiKey.length <= 500 && !/\s/.test(value.apiKey);

// Storage adapters keep native modules out of the core and make phone lifecycle
// behavior testable without a server, a device, or paid provider requests.
export function createDeviceRuntime({ readData, writeData, removeData, readKey, writeKey, newId }) {
  let data = empty();
  let config = null;
  let session = null;
  let epoch = 0;
  let initialized;
  let writes = Promise.resolve();
  const pending = new Map();
  const verified = new Map();
  const snapshot = () => JSON.stringify({ profile: data.profile, plan: data.plan });
  const account = () => clone({ user: { id: session ? 'local-device' : '', email: session ? 'Saved on this device' : '' },
    profile: session ? data.profile : null, plan: session ? data.plan : null, startedOn: session ? data.startedOn : null,
    ai: { provider: config?.provider || null, configured: Boolean(config) } });
  const check = (expected) => { if (expected !== epoch || !session) fail('Setup changed. Please try again.'); };
  const enqueue = (work) => {
    const next = writes.catch(() => {}).then(work);
    writes = next;
    return next;
  };
  const save = (update, expected) => enqueue(async () => {
    check(expected);
    const next = update(clone(data));
    await writeData(JSON.stringify(next));
    data = next;
  });
  const stage = (kind, value, expected) => {
    check(expected);
    for (const [id, item] of pending) if (item.expires < Date.now()) pending.delete(id);
    const ticket = newId();
    pending.set(ticket, { kind, value: clone(value), prior: snapshot(), epoch, expires: Date.now() + 600_000 });
    return ticket;
  };
  const approve = async (ticket, kind, expected) => {
    const item = pending.get(ticket);
    if (!item || item.kind !== kind || item.epoch !== expected || item.expires < Date.now() || item.prior !== snapshot()) {
      fail('This preview expired or your profile changed. Generate a fresh preview.');
    }
    // Consume only after storage succeeds; a failed save can be retried.
    await save((current) => {
      if (pending.get(ticket) !== item || item.prior !== snapshot() || item.expires < Date.now()) fail('Generate a fresh preview.');
      return { ...current, ...item.value };
    }, expected);
    pending.delete(ticket);
  };
  const requireVerification = (provider, apiKey, ticket) => {
    const value = verified.get(ticket);
    if (!value || value.expires < Date.now() || value.provider !== provider || value.apiKey !== apiKey?.trim()) {
      fail('Verify your AI key before continuing.');
    }
  };

  return {
    initialize() {
      if (!initialized) initialized = (async () => {
        const [raw, key] = await Promise.all([readData(), readKey()]);
        const saved = raw ? JSON.parse(raw) : empty();
        if (saved.version !== 1 || !Array.isArray(saved.reviews) || (saved.profile && !saved.plan)) fail('Could not read your saved profile. Your data has been kept.');
        if (saved.profile) validateProfile(saved.profile);
        const savedKey = key ? JSON.parse(key) : null;
        if (savedKey && !validConfig(savedKey)) fail('Could not read your AI key. Your data has been kept.');
        data = saved;
        config = savedKey;
        session = config ? newId() : null;
        return session;
      })().catch((error) => { initialized = undefined; throw error; });
      return initialized.then(() => session);
    },
    async request(path, method, token, body = {}) {
      await this.initialize();
      if (path === '/verify-ai-key') {
        if (!validConfig({ provider: body.provider, apiKey: body.apiKey?.trim() })) fail('Choose a provider and enter its API key.');
        const expected = epoch;
        await generate({ provider: body.provider, apiKey: body.apiKey.trim(), task: 'verification',
          instructions: 'This is a connection check. Reply with one short acknowledgement.', messages: [{ role: 'user', content: 'Reply with OK.' }] });
        if (expected !== epoch) fail('Setup changed. Verify your key again.');
        for (const [id, item] of verified) if (item.expires < Date.now()) verified.delete(id);
        const ticket = newId();
        verified.set(ticket, { provider: body.provider, apiKey: body.apiKey.trim(), expires: Date.now() + 600_000 });
        return { verified: true, ticket };
      }
      if (path === '/auth/register' || path === '/auth/login') {
        requireVerification(body.provider, body.apiKey, body.verificationTicket);
        await enqueue(async () => {
          requireVerification(body.provider, body.apiKey, body.verificationTicket);
          const next = { provider: body.provider, apiKey: body.apiKey.trim() };
          await writeKey(JSON.stringify(next));
          config = next;
          session = newId();
          epoch++;
          pending.clear(); verified.clear();
        });
        return { ...account(), token: session };
      }
      if (!session || token !== session) fail('Complete device setup to continue.');
      const expected = epoch;
      const ai = { ...config };
      if (path === '/account' && method === 'GET') return account();
      if (path === '/auth/logout') {
        epoch++; pending.clear(); verified.clear();
        await enqueue(async () => { await writeKey(null); config = null; session = null; });
        return { ok: true };
      }
      if (path === '/account' && method === 'DELETE') {
        epoch++; pending.clear(); verified.clear();
        await enqueue(async () => {
          await writeKey(null);
          try {
            await body.clearLocalData?.();
            await removeData();
          } catch (error) {
            // Keep the profile usable if a device storage operation fails.
            await writeKey(JSON.stringify(config));
            throw error;
          }
          data = empty();
          config = null; session = null;
        });
        return { ok: true };
      }
      if (path === '/ai-config') {
        requireVerification(body.provider, body.apiKey, body.verificationTicket);
        await enqueue(async () => {
          check(expected);
          requireVerification(body.provider, body.apiKey, body.verificationTicket);
          const next = { provider: body.provider, apiKey: body.apiKey.trim() };
          await writeKey(JSON.stringify(next));
          config = next; epoch++; pending.clear(); verified.clear();
        });
        return { ai: account().ai };
      }
      if (path === '/onboarding/preview' || path === '/profile/preview') {
        const onboarding = path === '/onboarding/preview';
        if (onboarding ? data.profile : !data.profile) fail(onboarding ? 'Setup is already complete.' : 'Complete setup first.');
        const { startDay, ...profile } = clone(body);
        validateProfile(profile);
        const prior = snapshot();
        const plan = await createPlan(profile, ai);
        if (prior !== snapshot()) fail('Your profile changed. Generate a fresh preview.');
        const ticket = stage(onboarding ? 'onboarding' : 'profile', { profile, plan,
          ...(onboarding ? { startedOn: startDay } : {}) }, expected);
        return { profile, plan, ticket };
      }
      if (path === '/onboarding/approve' || path === '/profile/approve' || path === '/plan/approve') {
        await approve(body.ticket, path === '/onboarding/approve' ? 'onboarding' : path === '/profile/approve' ? 'profile' : 'plan', expected);
        return account();
      }
      if (path === '/reviews' && method === 'GET') return { reviews: clone(data.reviews) };
      if (path === '/reviews') {
        if (!data.startedOn) fail('Complete setup first.');
        validateReviewJob(body, data.startedOn);
        const existing = data.reviews.find((item) => item.kind === body.kind && item.startDay === body.startDay);
        if (existing) return { review: clone(existing) };
        const job = clone(body);
        job.profile = { ...job.profile, healthConditions: data.profile.healthConditions || [], clinicianTargets: data.profile.clinicianTargets || {},
          nutritionCaution: data.profile.nutritionCaution, concerns: data.profile.concerns };
        job.nutrition = data.plan?.nutrition || null;
        const details = await createReview(job, ai);
        let review = { kind: job.kind, startDay: job.startDay, endDay: job.endDay, ...details, generatedAt: new Date().toISOString() };
        await save((current) => {
          const duplicate = current.reviews.find((item) => item.kind === job.kind && item.startDay === job.startDay);
          if (duplicate) { review = duplicate; return current; }
          current.reviews = [review, ...current.reviews].sort((a, b) => b.endDay.localeCompare(a.endDay));
          return current;
        }, expected);
        return { review: clone(review) };
      }
      if (path === '/identify-exercise') {
        const planned = (data.plan?.days || []).flatMap((day) => day.exercises || []);
        const result = await identifyExercise(body.description, ai, [...(body.exercises || []), ...planned]);
        check(expected); return result;
      }
      if (path === '/estimate-meal') {
        if (typeof body.description !== 'string' || body.description.length > 3000 || (!body.description.trim() && !body.imageDataUrl)) fail('Describe the meal or attach a photo.');
        const result = await estimateMeal({ description: body.description.trim(), imageDataUrl: body.imageDataUrl, ...ai });
        check(expected); return result;
      }
      if (path === '/chat') {
        if (!data.profile) fail('Complete setup first.');
        const prior = snapshot();
        const deadline = Date.now() + 80_000;
        const result = await chat(body.messages, body.context, ai.provider, ai.apiKey, data.reviews, deadline,
          { healthConditions: data.profile.healthConditions || [], clinicianTargets: data.profile.clinicianTargets || {},
            concerns: data.profile.concerns, nutrition: data.plan?.nutrition || null });
        check(expected);
        if (result.action?.kind !== 'plan') return result;
        if (prior !== snapshot()) fail('Your profile changed. Ask for a fresh plan.');
        if (body.weightKg !== undefined && (!Number.isFinite(body.weightKg) || body.weightKg < 25 || body.weightKg > 400)) fail('Enter a valid current weight.');
        const profile = body.weightKg ? { ...data.profile, weightKg: body.weightKg } : data.profile;
        const plan = await createPlan(profile, ai, body.messages, data.plan, deadline);
        check(expected);
        if (prior !== snapshot()) fail('Your profile changed. Ask for a fresh plan.');
        if (comparablePlan(plan) === comparablePlan(data.plan)) return { reply: 'Your current plan already fits that request, so nothing changed.', action: null, planPreview: null };
        const ticket = stage('plan', { plan }, expected);
        return { reply: 'I prepared a revised week. Review it below and choose Approve or Reject.', action: null, planPreview: { plan, prior: clone(data.plan), ticket } };
      }
      fail('Unsupported device operation.');
    },
  };
}
