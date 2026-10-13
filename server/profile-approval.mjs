import { randomUUID } from 'node:crypto';
const pending = new Map();
const snapshot = (account) => JSON.stringify({ profile: account.profile, plan: account.plan });

export function stageProfilePlan(account, profile, plan, startDay, kind) {
  for (const [ticket, item] of pending) if (item.expires < Date.now()) pending.delete(ticket);
  const ticket = randomUUID();
  pending.set(ticket, { userId: account.user.id, prior: snapshot(account), profile: structuredClone(profile), plan: structuredClone(plan), startDay, kind, expires: Date.now() + 10 * 60_000 });
  return ticket;
}

export function takeProfilePlan(account, ticket, kind) {
  const item = pending.get(ticket);
  if (!item || item.userId !== account.user.id || item.kind !== kind || item.expires < Date.now() || item.prior !== snapshot(account)) throw Object.assign(new Error('This nutrition preview expired or your account changed. Generate a fresh preview.'), { status: 409 });
  pending.delete(ticket);
  return item;
}
