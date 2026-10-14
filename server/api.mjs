import { identifyExercise } from './exercises.mjs';
import { stageProfilePlan, takeProfilePlan } from './profile-approval.mjs';
import { createServer } from 'node:http';
import { deleteAccount, getAccount, getAiConfig, listReviews, login, logout, register, saveAiConfig, saveOnboarding, savePlan, saveRecomputedProfile, saveReview, validateProfile } from './accounts.mjs';
import { requireVerifiedKey, verifyAiKey } from './ai-verification.mjs';
import { createPlan } from './planning.mjs';
import { createReview, validateReviewJob } from './reviews.mjs';
import { stagePlan, takeApprovedPlan } from './plan-approval.mjs';

import { readJson, sendError } from './http.mjs';
import { createRateLimiter } from './rate-limit.mjs';
import { chat, estimateMeal } from '../shared/ai/workflows.mjs';
export { chat, estimateMeal };
const send = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };

export function createApiServer({ allowedOrigins = [] } = {}) {
  const limitAuth = createRateLimiter({ limit: 60, windowMs: 10 * 60_000 });
  const limitAi = createRateLimiter({ limit: 30 });
  return createServer(async (req, res) => {
    const origin = req.headers.origin;
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Vary', 'Origin');
    if (origin && (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) || allowedOrigins.includes(origin))) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'POST, PUT, DELETE, OPTIONS, GET');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
    if (req.method === 'OPTIONS') return send(res, 200, {});
    const address = req.socket.remoteAddress || 'unknown';
    if (req.method === 'POST' && ['/auth/register', '/auth/login', '/verify-ai-key'].includes(req.url) && !limitAuth(address)) {
      return send(res, 429, { error: 'Too many account requests. Try again later.' });
    }
    if (req.method === 'POST' && ['/chat', '/identify-exercise', '/estimate-meal', '/onboarding/preview', '/profile/preview', '/reviews'].includes(req.url)) {
      const session = /^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization || '')?.[1];
      if (!limitAi(session || address)) return send(res, 429, { error: 'Too many AI requests. Try again shortly.' });
    }
    if (req.method === 'GET' && req.url === '/health') return send(res, 200, { ok: true });
    if (req.method === 'GET' && req.url === '/account') {
      try { return send(res, 200, getAccount(req.headers.authorization)); }
      catch (error) { return sendError(res, error); }
    }
    if (req.method === 'GET' && req.url === '/reviews') {
      try { return send(res, 200, { reviews: listReviews(req.headers.authorization) }); }
      catch (error) { return sendError(res, error); }
    }
    if (['/auth/register', '/auth/login', '/auth/logout', '/profile/recompute', '/account', '/ai-config', '/chat', '/identify-exercise', '/verify-ai-key', '/onboarding', '/onboarding/preview', '/onboarding/approve', '/profile/preview', '/profile/approve', '/plan/revise', '/plan/approve', '/reviews'].includes(req.url)) {
      try {
        const body = await readJson(req, 256_000);
        if (req.url === '/verify-ai-key' && req.method === 'POST') return send(res, 200, await verifyAiKey(body.provider, body.apiKey));
        if (req.url === '/auth/register' && req.method === 'POST') { requireVerifiedKey(body.provider, body.apiKey, body.verificationTicket); return send(res, 201, register(body.email, body.password, body.provider, body.apiKey)); }
        if (req.url === '/auth/login' && req.method === 'POST') { requireVerifiedKey(body.provider, body.apiKey, body.verificationTicket); return send(res, 200, login(body.email, body.password, body.provider, body.apiKey)); }
        if (req.url === '/auth/logout' && req.method === 'POST') { logout(req.headers.authorization); return send(res, 200, { ok: true }); }
        if (['/profile/recompute', '/onboarding', '/plan/revise'].includes(req.url)) return send(res, 409, { error: 'Generate a plan preview and approve it before saving. Update the app if necessary.' });
        if (['/onboarding/preview', '/profile/preview'].includes(req.url) && req.method === 'POST') {
          const account = getAccount(req.headers.authorization);
          const onboarding = req.url === '/onboarding/preview';
          if (onboarding ? account.profile : !account.profile) return send(res, 409, { error: onboarding ? 'Onboarding is already complete.' : 'Complete onboarding first.' });
          validateProfile(body);
          const { startDay, ...profile } = body;
          const plan = await createPlan(profile, getAiConfig(req.headers.authorization));
          const ticket = stageProfilePlan(account, profile, plan, startDay, onboarding ? 'onboarding' : 'profile');
          return send(res, 200, { profile, plan, ticket });
        }
        if (['/onboarding/approve', '/profile/approve'].includes(req.url) && req.method === 'POST') {
          const account = getAccount(req.headers.authorization);
          const onboarding = req.url === '/onboarding/approve';
          const pending = takeProfilePlan(account, body.ticket, onboarding ? 'onboarding' : 'profile');
          return send(res, 200, onboarding ? saveOnboarding(req.headers.authorization, pending.profile, pending.plan, pending.startDay) : saveRecomputedProfile(req.headers.authorization, pending.profile, pending.plan));
        }
        if (req.url === '/plan/approve' && req.method === 'POST') {
          const account = getAccount(req.headers.authorization);
          const plan = takeApprovedPlan(account.user.id, account.plan, body.ticket, account.profile);
          return send(res, 200, savePlan(req.headers.authorization, plan));
        }
        if (req.url === '/reviews' && req.method === 'POST') {
          const account = getAccount(req.headers.authorization);
          if (!account.startedOn) return send(res, 409, { error: 'Complete onboarding first.' });
          validateReviewJob(body, account.startedOn);
          const existing = listReviews(req.headers.authorization).find((review) => review.kind === body.kind && review.startDay === body.startDay);
          if (existing) return send(res, 200, { review: existing });
          body.profile = { ...body.profile, healthConditions: account.profile.healthConditions || [], clinicianTargets: account.profile.clinicianTargets || {}, nutritionCaution: account.profile.nutritionCaution, concerns: account.profile.concerns };
          body.nutrition = account.plan?.nutrition || null;
          const details = await createReview(body, getAiConfig(req.headers.authorization));
          return send(res, 200, { review: saveReview(req.headers.authorization, { kind: body.kind, startDay: body.startDay, endDay: body.endDay, details }) });
        }
        if (req.url === '/account' && req.method === 'DELETE') return send(res, 200, deleteAccount(req.headers.authorization));
        if (req.url === '/ai-config' && req.method === 'PUT') { requireVerifiedKey(body.provider, body.apiKey, body.verificationTicket); return send(res, 200, saveAiConfig(req.headers.authorization, body.provider, body.apiKey)); }
        if (req.url === '/identify-exercise' && req.method === 'POST') {
          const config = getAiConfig(req.headers.authorization);
          const account = getAccount(req.headers.authorization);
          const supplied = body.exercises === undefined ? [] : body.exercises;
          if (!Array.isArray(supplied) || supplied.length > 1000) return send(res, 400, { error: 'Send a valid exercise list.' });
          const planned = (account.plan?.days || []).flatMap((day) => day.exercises || []);
          return send(res, 200, await identifyExercise(body.description, config, [...supplied, ...planned]));
        }
        if (req.url === '/chat' && req.method === 'POST') {
          const deadline = Date.now() + 80_000;
          const config = getAiConfig(req.headers.authorization);
          const account = getAccount(req.headers.authorization);
          if (!account.profile) return send(res, 409, { error: 'Complete onboarding first.' });
          const result = await chat(body.messages, body.context, config.provider, config.apiKey, listReviews(req.headers.authorization), deadline, { healthConditions: account.profile.healthConditions || [], clinicianTargets: account.profile.clinicianTargets || {}, concerns: account.profile.concerns, nutrition: account.plan?.nutrition || null });
          if (result.action?.kind !== 'plan') return send(res, 200, result);
          if (!account.profile) return send(res, 409, { error: 'Complete onboarding first.' });
          if (body.weightKg !== undefined && (!Number.isFinite(body.weightKg) || body.weightKg < 25 || body.weightKg > 400)) return send(res, 400, { error: 'Enter a valid current weight before revising the plan.' });
          const profile = body.weightKg ? { ...account.profile, weightKg: body.weightKg } : account.profile;
          const plan = await createPlan(profile, config, body.messages, account.plan, deadline);
          const ticket = stagePlan(account.user.id, account.plan, plan, account.profile);
          return send(res, 200, { reply: ticket ? 'I prepared a revised week. Review it below and choose Approve or Reject.' : 'Your current plan already fits that request, so nothing changed.',
            action: null, planPreview: ticket ? { plan, prior: account.plan, ticket } : null });
        }
        return send(res, 405, { error: 'Method not allowed' });
      } catch (error) { return sendError(res, error); }
    }
    if (req.method !== 'POST' || req.url !== '/estimate-meal') return send(res, 404, { error: 'Not found' });
    try {
      const { description, imageDataUrl } = await readJson(req, 8_000_000);
      if (typeof description !== 'string' || description.length > 3000 || (imageDataUrl !== undefined && (typeof imageDataUrl !== 'string' || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(imageDataUrl)))) return send(res, 400, { error: 'Enter a description or attach a supported photo.' });
      if (!description.trim() && !imageDataUrl) return send(res, 400, { error: 'Describe the meal or attach a photo.' });
      const config = getAiConfig(req.headers.authorization);
      return send(res, 200, await estimateMeal({ description: description.trim(), imageDataUrl, ...config }));
    } catch (error) { return sendError(res, error); }
  });
}
