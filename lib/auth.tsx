import * as SecureStore from 'expo-secure-store';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import type { Profile } from './store';
import type { MealEstimate } from './mealEstimate';
import type { AiPlan } from './plan';
import { apiUrl } from './apiUrl';

export type AiProvider = 'openai' | 'claude' | 'gemini';
type Account = { user: { id: string; email: string }; profile: Profile | null; ai: { provider: AiProvider | null; configured: boolean }; plan: AiPlan | null };
type Auth = Account & {
  ready: boolean;
  verifyAiKey: (provider: AiProvider, apiKey: string) => Promise<string>;
  signIn: (email: string, password: string, create: boolean, provider: AiProvider, apiKey: string, verificationTicket: string) => Promise<void>;
  saveAiConfig: (provider: AiProvider, apiKey: string, verificationTicket: string) => Promise<void>;
  estimateMeal: (description: string, imageDataUrl: string | null) => Promise<MealEstimate>;
  completeOnboarding: (profile: Profile) => Promise<void>;
  revisePlan: (messages: { role: 'user' | 'assistant'; content: string }[]) => Promise<void>;
  saveProfile: (profile: Profile) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: (clearLocalData: () => Promise<void>) => Promise<void>;
  chat: (messages: { role: 'user' | 'assistant'; content: string }[], context: string) => Promise<string>;
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
  const timeout = setTimeout(() => controller.abort(), ['/chat', '/estimate-meal', '/verify-ai-key', '/onboarding', '/plan/revise'].includes(path) ? 90_000 : 8000);
  try {
    response = await fetch(`${base}${path}`, {
      method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: controller.signal,
    });
  } catch {
    throw new Error(`Cannot reach the Gym Buddy API at ${base}. Start npm run api on your computer and keep your phone on the same Wi-Fi.`);
  } finally { clearTimeout(timeout); }
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.error || 'Request failed.'), { status: response.status });
  return result as T;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const emptyAccount: Account = { user: { id: '', email: '' }, profile: null, ai: { provider: null, configured: false }, plan: null };
  const [account, setAccount] = useState<Account>(emptyAccount);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
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
      setAccount({ user: result.user, profile: result.profile, ai: result.ai, plan: result.plan });
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
      const result = await request<{ profile: Profile; plan: AiPlan }>('/onboarding', 'POST', token, profile);
      setAccount((old) => ({ ...old, profile: result.profile, plan: result.plan }));
    },
    revisePlan: async (messages) => {
      if (!token) throw new Error('Sign in again to continue.');
      const result = await request<{ plan: AiPlan }>('/plan/revise', 'POST', token, { messages });
      setAccount((old) => ({ ...old, plan: result.plan }));
    },
    saveProfile: (profile) => {
      if (!token) return Promise.reject(new Error('Sign in again to continue.'));
      const currentUserId = account.user.id;
      const next = saveQueue.current.catch(() => {}).then(async () => {
        const result = await request<{ profile: Profile }>('/profile', 'PUT', token, profile);
        setAccount((old) => old.user.id === currentUserId ? { ...old, profile: result.profile } : old);
      });
      saveQueue.current = next;
      return next;
    },
    signOut: async () => {
      if (token) await request('/auth/logout', 'POST', token).catch(() => {});
      await writeToken(null);
      setToken(null);
      setAccount(emptyAccount);
    },
    deleteAccount: async (clearLocalData) => {
      if (!token) throw new Error('Sign in again to continue.');
      await saveQueue.current.catch(() => {});
      await request('/account', 'DELETE', token);
      try { await clearLocalData(); }
      finally {
        await writeToken(null).catch(() => {});
        setToken(null);
        setAccount(emptyAccount);
      }
    },
    chat: async (messages, context) => {
      if (!token) throw new Error('Sign in again to continue.');
      const result = await request<{ reply: string }>('/chat', 'POST', token, { messages, context });
      return result.reply;
    },
  }), [account, ready, token]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error('AuthProvider is missing');
  return value;
}
