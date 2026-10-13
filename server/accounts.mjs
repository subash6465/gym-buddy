import { validateNutritionProfile } from '../shared/nutrition-profile.mjs';
import { randomBytes, scryptSync, createHash, timingSafeEqual, createCipheriv, createDecipheriv } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const path = process.env.DATABASE_PATH === ':memory:' ? ':memory:' : resolve(process.env.DATABASE_PATH || 'server/data/gym-buddy.sqlite');
if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
const db = new DatabaseSync(path);
db.exec(`PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, salt TEXT NOT NULL, password_hash TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS profiles (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, details TEXT NOT NULL, completed_at TEXT NOT NULL, updated_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS ai_configs (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, provider TEXT NOT NULL, encrypted_key TEXT NOT NULL, updated_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS plans (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, details TEXT NOT NULL, updated_at TEXT NOT NULL);`);
if (!db.prepare('PRAGMA table_info(profiles)').all().some((column) => column.name === 'start_day')) {
  db.exec('ALTER TABLE profiles ADD COLUMN start_day TEXT');
}
db.exec(`CREATE TABLE IF NOT EXISTS reviews (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  start_day TEXT NOT NULL,
  end_day TEXT NOT NULL,
  details TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, kind, start_day)
);`);

function encryptionKey() {
  if (process.env.AI_KEY_ENCRYPTION_SECRET) return createHash('sha256').update(process.env.AI_KEY_ENCRYPTION_SECRET).digest();
  if (path === ':memory:') return randomBytes(32);
  const keyPath = `${path}.ai-key`;
  try { return Buffer.from(readFileSync(keyPath, 'utf8').trim(), 'hex'); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const generated = randomBytes(32);
    try { writeFileSync(keyPath, generated.toString('hex'), { flag: 'wx', mode: 0o600 }); return generated; }
    catch (writeError) { if (writeError.code === 'EEXIST') return Buffer.from(readFileSync(keyPath, 'utf8').trim(), 'hex'); throw writeError; }
  }
}
const secret = encryptionKey();
if (secret.length !== 32) throw new Error('Invalid AI encryption key.');
const seal = (value) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', secret, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${encrypted.toString('hex')}`;
};
const unseal = (value) => {
  const [iv, tag, encrypted] = value.split(':');
  const decipher = createDecipheriv('aes-256-gcm', secret, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, 'hex')), decipher.final()]).toString('utf8');
};
const publicAi = (userId) => {
  const row = db.prepare('SELECT provider FROM ai_configs WHERE user_id = ?').get(userId);
  return { provider: row?.provider || null, configured: Boolean(row) };
};
const validatedAi = (provider, apiKey) => {
  if (!['openai', 'claude', 'gemini'].includes(provider) || typeof apiKey !== 'string' || apiKey.trim().length < 10 || apiKey.trim().length > 500 || /\s/.test(apiKey.trim())) fail('Choose an AI provider and enter a valid API key.');
  return { provider, encrypted: seal(apiKey.trim()) };
};
const saveAiForUser = (userId, config) => db.prepare(`INSERT INTO ai_configs (user_id, provider, encrypted_key, updated_at) VALUES (?, ?, ?, ?)
  ON CONFLICT(user_id) DO UPDATE SET provider = excluded.provider, encrypted_key = excluded.encrypted_key, updated_at = excluded.updated_at`)
  .run(userId, config.provider, config.encrypted, new Date().toISOString());

const hash = (value) => createHash('sha256').update(value).digest('hex');
const newId = () => randomBytes(16).toString('hex');
const publicUser = (user) => ({ id: user.id, email: user.email });
const issueSession = (user) => {
  const token = randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .run(hash(token), user.id, new Date(Date.now() + 90 * 86400_000).toISOString());
  return { token, user: publicUser(user), profile: getProfile(user.id), startedOn: getStartDay(user.id), ai: publicAi(user.id), plan: getPlan(user.id) };
};
const getProfile = (userId) => {
  const row = db.prepare('SELECT details FROM profiles WHERE user_id = ?').get(userId);
  return row ? { daysPerWeek: 3, pace: 'moderate', healthConditions: [], clinicianTargets: {}, ...JSON.parse(row.details) } : null;
};
const getPlan = (userId) => {
  const row = db.prepare('SELECT details FROM plans WHERE user_id = ?').get(userId);
  return row ? JSON.parse(row.details) : null;
};
const getStartDay = (userId) => {
  const row = db.prepare('SELECT start_day, completed_at FROM profiles WHERE user_id = ?').get(userId);
  return row?.start_day || row?.completed_at?.slice(0, 10) || null;
};
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };

export function register(emailInput, password, provider, apiKey) {
  const email = typeof emailInput === 'string' ? emailInput.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) fail('Enter a valid email address.');
  if (typeof password !== 'string' || password.length < 10 || password.length > 128) fail('Use a password of 10 to 128 characters.');
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) fail('An account with this email already exists.', 409);
  const config = provider || apiKey ? validatedAi(provider, apiKey) : null;
  const salt = randomBytes(16).toString('hex');
  const user = { id: newId(), email };
  db.prepare('INSERT INTO users (id, email, salt, password_hash, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(user.id, email, salt, scryptSync(password, salt, 64).toString('hex'), new Date().toISOString());
  if (config) saveAiForUser(user.id, config);
  return issueSession(user);
}

export function login(emailInput, password, provider, apiKey) {
  const email = typeof emailInput === 'string' ? emailInput.trim().toLowerCase() : '';
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || typeof password !== 'string' || password.length < 10 || password.length > 128) fail('Incorrect email or password.', 401);
  const supplied = scryptSync(password, user.salt, 64);
  if (!timingSafeEqual(supplied, Buffer.from(user.password_hash, 'hex'))) fail('Incorrect email or password.', 401);
  if (provider || apiKey) saveAiForUser(user.id, validatedAi(provider, apiKey));
  return issueSession(user);
}

export function currentUser(authorization) {
  const token = /^Bearer ([a-f0-9]{64})$/.exec(authorization || '')?.[1];
  if (!token) fail('Sign in again to continue.', 401);
  const user = db.prepare(`SELECT users.id, users.email FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ?`).get(hash(token), new Date().toISOString());
  if (!user) fail('Session expired. Sign in again.', 401);
  return user;
}

export function getAccount(authorization) {
  const user = currentUser(authorization);
  return { user: publicUser(user), profile: getProfile(user.id), startedOn: getStartDay(user.id), ai: publicAi(user.id), plan: getPlan(user.id) };
}

export function getAiConfig(authorization) {
  const user = currentUser(authorization);
  const row = db.prepare('SELECT provider, encrypted_key FROM ai_configs WHERE user_id = ?').get(user.id);
  if (!row) fail('Set up an AI provider and key when you sign in.', 409);
  return { provider: row.provider, apiKey: unseal(row.encrypted_key) };
}

export function saveAiConfig(authorization, provider, apiKey) {
  const user = currentUser(authorization);
  saveAiForUser(user.id, validatedAi(provider, apiKey));
  return { ai: publicAi(user.id) };
}

const choices = {
  goal: ['lose', 'gain', 'maintain'], setting: ['gym', 'home'],
  activity: ['sedentary', 'light', 'moderate', 'high'], equation: ['', 'female', 'male'],
};
export function validateProfile(profile) {
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) fail('Invalid profile.');
  Object.assign(profile, validateNutritionProfile(profile));
  profile.daysPerWeek ??= 3;
  profile.pace ??= 'moderate';
  for (const field of ['name', 'dob', 'heightCm', 'allergies', 'concerns', 'fitnessPlan']) {
    if (typeof profile[field] !== 'string' || profile[field].length > 2000) fail(`Invalid ${field}.`);
  }
  if (!profile.name.trim()) fail('Enter your name.');
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(profile.dob);
  const birth = date && new Date(Number(date[1]), Number(date[2]) - 1, Number(date[3]));
  if (!birth || birth.getFullYear() !== Number(date[1]) || birth.getMonth() !== Number(date[2]) - 1 || birth.getDate() !== Number(date[3]) || birth > new Date()) fail('Enter a valid date of birth.');
  if (!Number.isFinite(Number(profile.heightCm)) || Number(profile.heightCm) < 100 || Number(profile.heightCm) > 250) fail('Enter a height between 100 and 250 cm.');
  if (!Number.isFinite(profile.weightKg) || profile.weightKg < 25 || profile.weightKg > 400) fail('Enter a weight between 25 and 400 kg.');
  for (const [field, allowed] of Object.entries(choices)) if (!allowed.includes(profile[field])) fail(`Invalid ${field}.`);
  if (typeof profile.nutritionCaution !== 'boolean') fail('Invalid special dietary care selection.');
  if (!Number.isInteger(profile.daysPerWeek) || profile.daysPerWeek < 1 || profile.daysPerWeek > 7) fail('Choose 1 to 7 training days per week.');
  if (!['light', 'moderate', 'aggressive'].includes(profile.pace)) fail('Choose a training pace.');
}
export function saveProfile(authorization, profile) {
  const user = currentUser(authorization);
  validateProfile(profile);
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO profiles (user_id, details, completed_at, updated_at) VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET details = excluded.details, updated_at = excluded.updated_at`)
    .run(user.id, JSON.stringify(profile), now, now);
  return { profile: getProfile(user.id) };
}

export function saveOnboarding(authorization, profile, plan, startDay) {
  const user = currentUser(authorization);
  validateProfile(profile);
  if (!plan || !Array.isArray(plan.days) || plan.days.length !== 7) fail('Invalid generated plan.');
  if (typeof startDay !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(startDay) || !Number.isFinite(Date.parse(`${startDay}T00:00:00Z`)) || new Date(`${startDay}T00:00:00Z`).toISOString().slice(0, 10) !== startDay) startDay = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();
  db.exec('BEGIN');
  try {
    db.prepare(`INSERT INTO profiles (user_id, details, completed_at, updated_at, start_day) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET details = excluded.details, updated_at = excluded.updated_at`).run(user.id, JSON.stringify(profile), now, now, startDay);
    db.prepare(`INSERT INTO plans (user_id, details, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET details = excluded.details, updated_at = excluded.updated_at`).run(user.id, JSON.stringify(plan), now);
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  return { profile: getProfile(user.id), plan: getPlan(user.id), startedOn: getStartDay(user.id) };
}

export function listReviews(authorization) {
  const user = currentUser(authorization);
  return db.prepare('SELECT kind, start_day AS startDay, end_day AS endDay, details, generated_at AS generatedAt FROM reviews WHERE user_id = ? ORDER BY end_day DESC, kind').all(user.id)
    .map((row) => ({ kind: row.kind, startDay: row.startDay, endDay: row.endDay, ...JSON.parse(row.details), generatedAt: row.generatedAt }));
}

export function saveReview(authorization, review) {
  const user = currentUser(authorization);
  db.prepare('INSERT OR IGNORE INTO reviews (user_id, kind, start_day, end_day, details, generated_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(user.id, review.kind, review.startDay, review.endDay, JSON.stringify(review.details), new Date().toISOString());
  return listReviews(authorization).find((item) => item.kind === review.kind && item.startDay === review.startDay);
}

export function savePlan(authorization, plan) {
  const user = currentUser(authorization);
  if (!plan || !Array.isArray(plan.days) || plan.days.length !== 7) fail('Invalid generated plan.');
  db.prepare(`INSERT INTO plans (user_id, details, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET details = excluded.details, updated_at = excluded.updated_at`).run(user.id, JSON.stringify(plan), new Date().toISOString());
  return { plan: getPlan(user.id) };
}

export function saveRecomputedProfile(authorization, profile, plan) {
  const user = currentUser(authorization);
  validateProfile(profile);
  if (!plan || !Array.isArray(plan.days) || plan.days.length !== 7) fail('Invalid generated plan.');
  const now = new Date().toISOString();
  db.exec('BEGIN');
  try {
    db.prepare('UPDATE profiles SET details = ?, updated_at = ? WHERE user_id = ?').run(JSON.stringify(profile), now, user.id);
    db.prepare(`INSERT INTO plans (user_id, details, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET details = excluded.details, updated_at = excluded.updated_at`).run(user.id, JSON.stringify(plan), now);
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  return { profile: getProfile(user.id), plan: getPlan(user.id) };
}

export function logout(authorization) {
  const token = /^Bearer ([a-f0-9]{64})$/.exec(authorization || '')?.[1];
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hash(token));
}

export function deleteAccount(authorization) {
  const user = currentUser(authorization);
  // Foreign keys remove every session and the server-side profile with the user.
  db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
  return { ok: true };
}
