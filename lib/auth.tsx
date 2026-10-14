import type { CatalogExercise, ExerciseIdentity } from './workouts';
import * as SecureStore from 'expo-secure-store';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import type { Profile } from './store';
import type { MealEstimate } from './mealEstimate';
import type { AiPlan } from './plan';
import { apiUrl } from './apiUrl';
import { apiRequest } from './request';
import { localDay } from './dates';
import type { Review, ReviewJob } from './reviews';

export type AiProvider = 'openai' | 'claude' | 'gemini';
export type ChatAction = { kind: 'water' | 'steps' | 'weight'; mode: 'set' | 'add'; date: string; value: number };
export type ChatReply = { reply: string; action: ChatAction | null; planPreview?: { plan: AiPlan; prior: AiPlan | null; ticket: string } | null };
export type AccountPlanPreview = { profile: Profile; plan: AiPlan; ticket: string };
type Account = { user: { id: string; email: string }; profile: Profile | null; startedOn: string | null; ai: { provider: AiProvider | null; configured: boolean }; plan: AiPlan | null };
type Auth = Account & {
  ready: boolean;
  verifyAiKey: (provider: AiProvider, apiKey: string) => Promise<string>;
  signIn: (email: string, password: string, create: boolean, provider: AiProvider, apiKey: string, verificationTicket: string) => Promise<void>;
  saveAiConfig: (provider: AiProvider, apiKey: string, verificationTicket: string) => Promise<void>;
  identifyExercise: (description: string, exercises: CatalogExercise[]) => Promise<ExerciseIdentity>;
  estimateMeal: (description: string, imageDataUrl: string | null) => Promise<MealEstimate>;
  previewAccountPlan: (profile: Profile, onboarding: boolean) => Promise<AccountPlanPreview>;
  approveAccountPlan: (ticket: string, onboarding: boolean) => Promise<Profile>;
  approvePlan: (ticket: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: (clearLocalData: () => Promise<void>) => Promise<void>;
  chat: (messages: { role: 'user' | 'assistant'; content: string }[], context: string, weightKg?: number) => Promise<ChatReply>;
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
  const timeoutMs = ['/chat', '/identify-exercise', '/estimate-meal', '/verify-ai-key', '/onboarding/preview', '/profile/preview', '/reviews'].includes(path) && method !== 'GET' ? 90_000 : 8000;
  return apiRequest<T>({ baseUrl: apiUrl(), path, method, token, body, timeoutMs });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const emptyAccount: Account = { user: { id: '', email: '' }, profile: null, startedOn: null, ai: { provider: null, configured: false }, plan: null };
  const [account, setAccount] = useState<Account>(emptyAccount);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const activeUserId = useRef(account.user.id);
  activeUserId.current = account.user.id;
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
      setAccount((old) => old.user.id === account.user.id ? { ...old, ai: result.ai } : old);
    },
    identifyExercise: async (description, exercises) => {
      if (!token) throw new Error('Sign in again to continue.');
      return request<ExerciseIdentity>('/identify-exercise', 'POST', token, { description, exercises });
    },
    estimateMeal: async (description, imageDataUrl) => {
      if (!token) throw new Error('Sign in again to continue.');
      return request<MealEstimate>('/estimate-meal', 'POST', token, { description, ...(imageDataUrl ? { imageDataUrl } : {}) });
    },
    previewAccountPlan: async (profile, onboarding) => {
      if (!token) throw new Error('Sign in again to continue.');
      return request<AccountPlanPreview>(onboarding ? '/onboarding/preview' : '/profile/preview', 'POST', token, { ...profile, ...(onboarding ? { startDay: localDay() } : {}) });
    },
    approveAccountPlan: async (ticket, onboarding) => {
      if (!token) throw new Error('Sign in again to continue.');
      const result = await request<{ profile: Profile; plan: AiPlan; startedOn?: string }>(onboarding ? '/onboarding/approve' : '/profile/approve', 'POST', token, { ticket });
      setAccount((old) => old.user.id === account.user.id ? { ...old, profile: result.profile, plan: result.plan, startedOn: result.startedOn || old.startedOn } : old);
      return result.profile;
    },
    approvePlan: async (ticket) => {
      if (!token) throw new Error('Sign in again to continue.');
      const result = await request<{ plan: AiPlan }>('/plan/approve', 'POST', token, { ticket });
      setAccount((old) => old.user.id === account.user.id ? { ...old, plan: result.plan } : old);
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
    chat: async (messages, context, weightKg) => {
      if (!token) throw new Error('Sign in again to continue.');
      return request<ChatReply>('/chat', 'POST', token, { messages, context, weightKg });
    },
    reviews,
    refreshReviews: async () => {
      if (!token) throw new Error('Sign in again to continue.');
      const result = await request<{ reviews: Review[] }>('/reviews', 'GET', token);
      if (activeUserId.current === account.user.id) setReviews(result.reviews);
      return result.reviews;
    },
    generateReview: async (job) => {
      if (!token) throw new Error('Sign in again to continue.');
      const result = await request<{ review: Review }>('/reviews', 'POST', token, job);
      if (activeUserId.current === account.user.id) setReviews((old) => old.some((item) => item.kind === result.review.kind && item.startDay === result.review.startDay) ? old : [result.review, ...old].sort((a, b) => b.endDay.localeCompare(a.endDay)));
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
