import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { theme } from './theme';
import { withSavedMeal } from './meals';
import { useAuth } from './auth';

export type Goal = 'lose' | 'gain' | 'maintain';
export type Meal = {
  id: string; date: string; time: string; type: 'breakfast' | 'lunch' | 'dinner' | 'snack'; name: string; note: string;
  calories: number; protein: number; carbs: number; fat: number; fibre: number; sugar: number;
};
export type Workout = { id: string; date: string; time?: string; name: string; minutes: number; note: string };
export type WeighIn = { id: string; date: string; kg: number };
export type WaterEntry = { id: string; date: string; time: string; ml: number };
export type StepEntry = { id: string; date: string; time: string; count: number };
export type Profile = {
  name: string; goal: Goal; setting: 'gym' | 'home'; dob: string; heightCm: string;
  equation: 'female' | 'male' | ''; activity: 'sedentary' | 'light' | 'moderate' | 'high'; nutritionCaution: boolean;
  allergies: string; concerns: string;
  fitnessPlan: string; weightKg: number;
};
type Data = { profile: Profile; meals: Meal[]; workouts: Workout[]; weighIns: WeighIn[]; water: Record<string, number>; waterEntries: WaterEntry[]; stepEntries: StepEntry[] };
type Store = Data & {
  ready: boolean;
  profileSyncError: string;
  syncProfile: () => Promise<void>;
  completeOnboarding: (profile: Profile) => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => void;
  addMeal: (meal: Omit<Meal, 'id'>) => void;
  addWorkout: (workout: Omit<Workout, 'id'>) => void;
  addWeighIn: (kg: number) => void;
  addWater: (date: string, ml: number) => void;
  addSteps: (date: string, count: number) => void;
  clearAccountData: () => Promise<void>;
  removeMeal: (id: string) => void;
  removeWorkout: (id: string) => void;
};

const initial: Data = {
  profile: { name: '', goal: 'maintain', setting: 'gym', dob: '', heightCm: '', equation: '', activity: 'light', nutritionCaution: false, allergies: '', concerns: '', fitnessPlan: '', weightKg: 0 },
  meals: [], workouts: [], weighIns: [], water: {}, waterEntries: [], stepEntries: [],
};
const Context = createContext<Store | null>(null);
export const today = (date = new Date()) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const clockTime = () => { const date = new Date(); return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`; };

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const [data, setData] = useState<Data>(initial);
  const [ready, setReady] = useState(false);
  const [loadedUserId, setLoadedUserId] = useState('');
  const [profileSyncError, setProfileSyncError] = useState('');
  const writes = useRef<Promise<unknown>>(Promise.resolve());
  const deleting = useRef(false);
  const key = `gym-buddy-data-v2-${auth.user.id}`;
  useEffect(() => {
    if (!auth.ready) return;
    let active = true;
    if (!auth.user.id) { setData(initial); setLoadedUserId(''); setReady(true); deleting.current = false; return; }
    setReady(false);
    AsyncStorage.getItem(key).then((raw) => {
      if (!active) return;
      let saved: Partial<Data> = {};
      if (raw) {
        saved = JSON.parse(raw) as Partial<Data>;
      }
      setData({ ...initial, ...saved, profile: { ...initial.profile, ...saved.profile, ...auth.profile },
        meals: (saved.meals || []).map((meal) => ({ ...meal, type: meal.type || 'snack', time: meal.time || '12:00' })),
        weighIns: saved.weighIns?.length ? saved.weighIns : auth.profile?.weightKg ? [{ id: newId(), date: today(), kg: auth.profile.weightKg }] : [], });
    }).catch(() => {}).finally(() => { if (active) { setLoadedUserId(auth.user.id); setReady(true); } });
    return () => { active = false; };
  }, [auth.ready, auth.user.id]);
  useEffect(() => { if (ready && auth.user.id && loadedUserId === auth.user.id && !deleting.current) {
    const snapshot = JSON.stringify(data);
    writes.current = writes.current.catch(() => {}).then(() => deleting.current ? undefined : AsyncStorage.setItem(key, snapshot));
  } }, [data, ready, key, auth.user.id, loadedUserId]);
  useEffect(() => {
    if (!ready || deleting.current || !auth.profile || JSON.stringify(data.profile) === JSON.stringify(auth.profile)) return;
    const timer = setTimeout(() => {
      auth.saveProfile(data.profile).then(() => setProfileSyncError('')).catch((error) => setProfileSyncError(error.message));
    }, 800);
    return () => clearTimeout(timer);
  }, [data.profile, auth.profile, ready]);
  const value = useMemo<Store>(() => ({
    ...data, ready, profileSyncError,
    syncProfile: async () => {
      try { await auth.saveProfile(data.profile); setProfileSyncError(''); }
      catch (error) { setProfileSyncError(error instanceof Error ? error.message : 'Could not save profile.'); throw error; }
    },
    completeOnboarding: async (profile) => {
      await auth.saveProfile(profile);
      setData((old) => ({ ...old, profile, weighIns: [{ id: newId(), date: today(), kg: profile.weightKg }, ...old.weighIns] }));
    },
    updateProfile: (patch) => setData((old) => ({ ...old, profile: { ...old.profile, ...patch } })),
    addMeal: (meal) => setData((old) => ({ ...old, meals: withSavedMeal(old.meals, { ...meal, id: newId() }) })),
    addWorkout: (workout) => setData((old) => ({ ...old, workouts: [{ ...workout, id: newId() }, ...old.workouts] })),
    addWeighIn: (kg) => setData((old) => ({ ...old, profile: { ...old.profile, weightKg: kg }, weighIns: [{ id: newId(), date: today(), kg }, ...old.weighIns] })),
    addWater: (date, ml) => setData((old) => ({ ...old, water: { ...old.water, [date]: Math.max(0, (old.water[date] || 0) + ml) }, waterEntries: [{ id: newId(), date, time: clockTime(), ml }, ...old.waterEntries] })),
    addSteps: (date, count) => setData((old) => ({ ...old, stepEntries: [{ id: newId(), date, time: clockTime(), count }, ...old.stepEntries] })),
    clearAccountData: async () => {
      deleting.current = true;
      await writes.current.catch(() => {});
      await AsyncStorage.removeItem(key);
      setData(initial);
    },
    removeMeal: (id) => setData((old) => ({ ...old, meals: old.meals.filter((item) => item.id !== id) })),
    removeWorkout: (id) => setData((old) => ({ ...old, workouts: old.workouts.filter((item) => item.id !== id) })),
  }), [data, ready, profileSyncError, auth]);
  if (!ready || auth.user.id !== loadedUserId) return <View style={{ flex: 1, backgroundColor: theme.bg, justifyContent: 'center' }}><ActivityIndicator color={theme.accent} /></View>;
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useStore() {
  const store = useContext(Context);
  if (!store) throw new Error('StoreProvider is missing');
  return store;
}
