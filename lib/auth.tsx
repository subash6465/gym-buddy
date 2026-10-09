import * as SecureStore from 'expo-secure-store';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import type { Profile } from './store';
import { apiUrl } from './apiUrl';

type Account = { user: { id: string; email: string }; profile: Profile | null };
type Auth = Account & {
  ready: boolean;
  signIn: (email: string, password: string, create: boolean) => Promise<void>;
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
  const timeout = setTimeout(() => controller.abort(), path === '/chat' ? 125_000 : 8000);
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
  const [account, setAccount] = useState<Account>({ user: { id: '', email: '' }, profile: null });
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
    signIn: async (email, password, create) => {
      const result = await request<Account & { token: string }>(create ? '/auth/register' : '/auth/login', 'POST', undefined, { email, password });
      await writeToken(result.token);
      setToken(result.token);
      setAccount({ user: result.user, profile: result.profile });
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
      setAccount({ user: { id: '', email: '' }, profile: null });
    },
    deleteAccount: async (clearLocalData) => {
      if (!token) throw new Error('Sign in again to continue.');
      await saveQueue.current.catch(() => {});
      await request('/account', 'DELETE', token);
      try { await clearLocalData(); }
      finally {
        await writeToken(null).catch(() => {});
        setToken(null);
        setAccount({ user: { id: '', email: '' }, profile: null });
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
