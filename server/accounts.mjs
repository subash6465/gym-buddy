import { randomBytes, scryptSync, createHash, timingSafeEqual } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const path = process.env.DATABASE_PATH === ':memory:' ? ':memory:' : resolve(process.env.DATABASE_PATH || 'server/data/gym-buddy.sqlite');
if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
const db = new DatabaseSync(path);
db.exec(`PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, salt TEXT NOT NULL, password_hash TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS profiles (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, details TEXT NOT NULL, completed_at TEXT NOT NULL, updated_at TEXT NOT NULL);`);

const hash = (value) => createHash('sha256').update(value).digest('hex');
const newId = () => randomBytes(16).toString('hex');
const publicUser = (user) => ({ id: user.id, email: user.email });
const issueSession = (user) => {
  const token = randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .run(hash(token), user.id, new Date(Date.now() + 90 * 86400_000).toISOString());
  return { token, user: publicUser(user), profile: getProfile(user.id) };
};
const getProfile = (userId) => {
  const row = db.prepare('SELECT details FROM profiles WHERE user_id = ?').get(userId);
  return row ? JSON.parse(row.details) : null;
};
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };

export function register(emailInput, password) {
  const email = typeof emailInput === 'string' ? emailInput.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) fail('Enter a valid email address.');
  if (typeof password !== 'string' || password.length < 10 || password.length > 128) fail('Use a password of 10 to 128 characters.');
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) fail('An account with this email already exists.', 409);
  const salt = randomBytes(16).toString('hex');
  const user = { id: newId(), email };
  db.prepare('INSERT INTO users (id, email, salt, password_hash, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(user.id, email, salt, scryptSync(password, salt, 64).toString('hex'), new Date().toISOString());
  return issueSession(user);
}

export function login(emailInput, password) {
  const email = typeof emailInput === 'string' ? emailInput.trim().toLowerCase() : '';
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || typeof password !== 'string') fail('Incorrect email or password.', 401);
  const supplied = scryptSync(password, user.salt, 64);
  if (!timingSafeEqual(supplied, Buffer.from(user.password_hash, 'hex'))) fail('Incorrect email or password.', 401);
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
  return { user: publicUser(user), profile: getProfile(user.id) };
}

const choices = {
  goal: ['lose', 'gain', 'maintain'], setting: ['gym', 'home'],
  activity: ['sedentary', 'light', 'moderate', 'high'], equation: ['', 'female', 'male'],
};
export function saveProfile(authorization, profile) {
  const user = currentUser(authorization);
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) fail('Invalid profile.');
  for (const field of ['name', 'dob', 'heightCm', 'allergies', 'concerns', 'fitnessPlan']) {
    if (typeof profile[field] !== 'string' || profile[field].length > 2000) fail(`Invalid ${field}.`);
  }
  if (!profile.name.trim()) fail('Enter your name.');
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(profile.dob);
  const birth = date && new Date(Number(date[1]), Number(date[2]) - 1, Number(date[3]));
  if (!birth || birth.getFullYear() !== Number(date[1]) || birth.getMonth() !== Number(date[2]) - 1 || birth.getDate() !== Number(date[3]) || birth > new Date()) fail('Enter a valid date of birth.');
  if (Number(profile.heightCm) < 100 || Number(profile.heightCm) > 250) fail('Enter a height between 100 and 250 cm.');
  if (!Number.isFinite(profile.weightKg) || profile.weightKg < 25 || profile.weightKg > 400) fail('Enter a weight between 25 and 400 kg.');
  for (const [field, allowed] of Object.entries(choices)) if (!allowed.includes(profile[field])) fail(`Invalid ${field}.`);
  if (typeof profile.nutritionCaution !== 'boolean') fail('Invalid special dietary care selection.');
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO profiles (user_id, details, completed_at, updated_at) VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET details = excluded.details, updated_at = excluded.updated_at`)
    .run(user.id, JSON.stringify(profile), now, now);
  return { profile: getProfile(user.id) };
}

export function logout(authorization) {
  const token = /^Bearer ([a-f0-9]{64})$/.exec(authorization || '')?.[1];
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hash(token));
}
