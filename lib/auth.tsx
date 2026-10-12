import * as SecureStore from 'expo-secure-store';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import type { Profile } from './store';
import type { MealEstimate } from './mealEstimate';
import type { AiPlan } from './plan';
import { apiUrl } from './apiUrl';
import { localDay } from './dates';
import type { Review, ReviewJob } from './reviews';

export type AiProvider = 'openai' | 'claude' | 'gemini';
export type ChatAction = { kind: 'water' | 'steps' | 'weight'; mode: 'set' | 'add'; date: string; value: number };
export type ChatReply = { reply: string; action: ChatAction | null };
type Account = { user: { id: string; email: string }; profile: Profile | null; startedOn: string | null; ai: { provider: AiProvider | null; configured: boolean }; plan: AiPlan | null };
type Auth = Account & {
  ready: boolean;
  verifyAiKey: (provider: AiProvider, apiKey: string) => Promise<string>;
  signIn: (email: string, password: string, create: boolean, provider: AiProvider, apiKey: string, verificationTicket: string) => Promise<void>;
  saveAiConfig: (provider: AiProvider, apiKey: string, verificationTicket: string) => Promise<void>;
  estimateMeal: (description: string, imageDataUrl: string | null) => Promise<MealEstimate>;
  completeOnboarding: (profile: Profile) => Promise<void>;
  revisePlan: (messages: { role: 'user' | 'assistant'; content: string }[], weightKg?: number) => Promise<void>;
  previewPlan: (messages: { role: 'user' | 'assistant'; content: string }[], weightKg?: number) => Promise<{ plan: AiPlan; ticket: string | null }>;
  approvePlan: (ticket: string) => Promise<void>;
  recomputeProfile: (profile: Profile) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: (clearLocalData: () => Promise<void>) => Promise<void>;
  chat: (messages: { role: 'user' | 'assistant'; content: string }[], context: string) => Promise<ChatReply>;
  reviews: Review[];
  refreshReviews: () => Promise<Review[]>;
  generateReview: (job: ReviewJob) => Promise<Review>;
};
const Context = createContext<Auth | null>(null);
const sessionKey = 'gym-buddy-session';

const readToken = () => Platform.OS === 'web'
  ? Promise.resolve(typeof window === 'undefined' ? null : window.localStorage.getItem(sessionKey))
  : SecureStore.getItemAsync(sessionKey);
const writeToken = (token: string | null) => Platform.OS === 'web'
  ? Promise.resolve().then(() => { if (token) window.localStorage.setItem(sessionKey, token); else window.localStorage.removeItem(sessionKey); })
  : token ? SecureStore.setItemAsync(sessionKey, token) : SecureStore.deleteItemAsync(sessionKey);

async function request<T>(path: string, method: string, token?: string, body?: object): Promise<T> {
  let response: Response;
  const base = apiUrl();
  const controller = new AbortController();
  const timeoutMs = ['/chat', '/estimate-meal', '/verify-ai-key', '/onboarding', '/plan/revise', '/plan/preview', '/profile/recompute', '/reviews'].includes(path) && method !== 'GET' ? 90_000 : 8000;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    response = await Promise.race<Response>([fetch(`${base}${path}`, {
      method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: controller.signal,
    }), new Promise<Response>((_, reject) => { timeout = setTimeout(() => { controller.abort(); reject(new Error('timeout')); }, timeoutMs); })]);
  } catch (error) {
    if (error instanceof Error && error.message === 'timeout') throw new Error('The Gym Buddy API did not respond in time. Try again.');
    throw new Error(`Cannot reach the Gym Buddy API at ${base}. Start npm run api on your computer and keep your phone on the same Wi-Fi.`);
  } finally { if (timeout) clearTimeout(timeout); }
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.error || 'Request failed.'), { status: response.status });
  return result as T;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const emptyAccount: Account = { user: { id: '', email: '' }, profile: null, startedOn: null, ai: { provider: null, configured: false }, plan: null };
  const [account, setAccount] = useState<Account>(emptyAccount);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    readToken().then(async (saved) => {
      if (!saved) return;
      try {
        const result = await request<Account>('/account', 'GET', saved);
        if (active) { setToken(saved); setAccount(result); }
      } catch (error) {
        // Keep the token through network outages; only a rejected session is cleared.
        if (error instanceof Error && 'status' in error && error.status === 401) await writeToken(null);
      }
    }).catch(() => {}).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);
  const value = useMemo<Auth>(() => ({ ...account, ready,
    verifyAiKey: async (provider, apiKey) => {
      const result = await request<{ verified: boolean; ticket: string }>('/verify-ai-key', 'POST', undefined, { provider, apiKey });
      if (!result.verified || !result.ticket) throw new Error('The provider did not verify the key.');
      return result.ticket;
    },
    signIn: async (email, password, create, provider, apiKey, verificationTicket) => {
      const result = await request<Account & { token: string }>(create ? '/auth/register' : '/auth/login', 'POST', undefined, { email, password, provider, apiKey, verificationTicket });
      await writeToken(result.token);
      setToken(result.token);
      setAccount({ user: result.user, profile: result.profile, startedOn: result.startedOn, ai: result.ai, plan: result.plan });
      setReviews([]);
    },
    saveAiConfig: async (provider, apiKey, verificationTicket) => {
      if (!token) throw new Error('Sign in again to continue.');
      const result = await request<{ ai: Account['ai'] }>('/ai-config', 'PUT', token, { provider, apiKey, verificationTicket });
      setAccount((old) => ({ ...old, ai: result.ai }));
    },
    estimateMeal: async (description, imageDataUrl) => {
      if (!token) throw new Error('Sign in again to continue.');
      return request<MealEstimate>('/estimate-meal', 'POST', token, { description, ...(imageDataUrl ? { imageDataUrl } : {}) });
    },
    completeOnboarding: async (profile) => {
      if (!token) throw new Error('Sign in again to continue.');
      const result = await request<{ profile: Profile; plan: AiPlan; startedOn: string }>('/onboarding', 'POST', token, { ...profile, startDay: localDay() });
      setAccount((old) => ({ ...old, profile: result.profile, plan: result.plan, startedOn: result.startedOn }));
    },
    revisePlan: async (messages, weightKg) => {
      if (!token) throw new Error('Sign in again to continue.');
      const result = await request<{ plan: AiPlan }>('/plan/revise', 'POST', token, { messages, weightKg });
      setAccount((old) => ({ ...old, plan: result.plan }));
    },
    previewPlan: async (messages, weightKg) => {
      if (!token) throw new Error('Sign in again to continue.');
      return request<{ plan: AiPlan; ticket: string | null }>('/plan/preview', 'POST', token, { messages, weightKg });
    },
    approvePlan: async (ticket) => {
      if (!token) throw new Error('Sign in again to continue.');
      const result = await request<{ plan: AiPlan }>('/plan/approve', 'POST', token, { ticket });
      setAccount((old) => ({ ...old, plan: result.plan }));
    },
    recomputeProfile: async (profile) => {
      if (!token) throw new Error('Sign in again to continue.');
      const result = await request<{ profile: Profile; plan: AiPlan }>('/profile/recompute', 'POST', token, profile);
      setAccount((old) => ({ ...old, profile: result.profile, plan: result.plan }));
    },
    signOut: async () => {
      if (token) await request('/auth/logout', 'POST', token).catch(() => {});
      await writeToken(null);
      setToken(null);
      setAccount(emptyAccount);
      setReviews([]);
    },
    deleteAccount: async (clearLocalData) => {
      if (!token) throw new Error('Sign in again to continue.');
      await request('/account', 'DELETE', token);
      try { await clearLocalData(); }
      finally {
        await writeToken(null).catch(() => {});
        setToken(null);
        setAccount(emptyAccount);
        setReviews([]);
      }
    },
    chat: async (messages, context) => {
      if (!token) throw new Error('Sign in again to continue.');
      return request<ChatReply>('/chat', 'POST', token, { messages, context });
    },
    reviews,
    refreshReviews: async () => {
      if (!token) throw new Error('Sign in again to continue.');
      const result = await request<{ reviews: Review[] }>('/reviews', 'GET', token);
      setReviews(result.reviews);
      return result.reviews;
    },
    generateReview: async (job) => {
      if (!token) throw new Error('Sign in again to continue.');
      const result = await request<{ review: Review }>('/reviews', 'POST', token, job);
      setReviews((old) => old.some((item) => item.kind === result.review.kind && item.startDay === result.review.startDay) ? old : [result.review, ...old].sort((a, b) => b.endDay.localeCompare(a.endDay)));
      return result.review;
    },
  }), [account, ready, token, reviews]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error('AuthProvider is missing');
  return value;
}
