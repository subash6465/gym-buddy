import { randomUUID } from 'node:crypto';

const pending = new Map();
const comparable = (plan) => plan ? JSON.stringify({ summary: plan.summary, suggestions: plan.suggestions, days: plan.days,
  calorieTarget: plan.calorieTarget, proteinGrams: plan.proteinGrams, waterMl: plan.waterMl, stepsTarget: plan.stepsTarget }) : '';

export function stagePlan(userId, prior, plan, profile = null) {
  if (comparable(prior) === comparable(plan)) return null;
  for (const [key, value] of pending) if (value.expires < Date.now()) pending.delete(key);
  const ticket = randomUUID();
  pending.set(ticket, { userId, prior: comparable(prior), profile: JSON.stringify(profile), plan, expires: Date.now() + 10 * 60_000 });
  return ticket;
}

export function takeApprovedPlan(userId, current, ticket, profile = null) {
  const value = pending.get(ticket);
  if (!value || value.userId !== userId || value.expires < Date.now() || value.prior !== comparable(current) || value.profile !== JSON.stringify(profile)) {
    throw Object.assign(new Error('This plan preview has expired or your plan changed. Generate a fresh preview.'), { status: 409 });
  }
  pending.delete(ticket);
  return value.plan;
}
