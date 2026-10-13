import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { generate } from './ai.mjs';

const ticketSecret = randomBytes(32);
const digest = (value) => createHash('sha256').update(value).digest('hex');
const signature = (payload) => createHmac('sha256', ticketSecret).update(payload).digest('hex');

export async function verifyAiKey(provider, apiKey) {
  if (!['openai', 'claude', 'gemini'].includes(provider) || typeof apiKey !== 'string' || apiKey.trim().length < 10 || apiKey.length > 500 || /\s/.test(apiKey.trim())) {
    throw Object.assign(new Error('Choose a provider and enter its API key.'), { status: 400 });
  }
  await generate({ provider, apiKey: apiKey.trim(), task: 'verification', instructions: 'This is a connection check. Reply with one short acknowledgement.',
    messages: [{ role: 'user', content: 'Reply with OK.' }] });
  const expires = Date.now() + 10 * 60_000;
  const payload = `${provider}.${digest(apiKey.trim())}.${expires}`;
  return { verified: true, ticket: `${payload}.${signature(payload)}` };
}

export function requireVerifiedKey(provider, apiKey, ticket) {
  if (typeof ticket !== 'string') throw Object.assign(new Error('Verify your AI key before continuing.'), { status: 400 });
  const match = /^(openai|claude|gemini)\.([a-f0-9]{64})\.(\d{13})\.([a-f0-9]{64})$/.exec(ticket);
  const payload = match?.slice(1, 4).join('.');
  if (!match || match[1] !== provider || match[2] !== digest(apiKey?.trim?.() || '') || Number(match[3]) < Date.now() ||
      !timingSafeEqual(Buffer.from(match[4], 'hex'), Buffer.from(signature(payload), 'hex'))) {
    throw Object.assign(new Error('Verification expired or the key changed. Verify it again.'), { status: 400 });
  }
}
