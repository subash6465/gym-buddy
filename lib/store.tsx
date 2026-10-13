import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { withSavedMeal } from './meals';
import { useAuth } from './auth';
import { localDay } from './dates';
import type { HealthCondition, ClinicianTargets } from '@/shared/nutrition-profile.mjs';

export type Goal = 'lose' | 'gain' | 'maintain';
export type Meal = {
  id: string; date: string; time: string; type: 'breakfast' | 'lunch' | 'dinner' | 'snack'; name: string; note: string;
  calories: number; protein: number; carbs: number; fat: number; fibre: number; sugar: number;
  addedSugar?: number | null; saturatedFat?: number | null;
};
export type Workout = { id: string; date: string; time?: string; name: string; minutes: number; note: string };
export type WeighIn = { id: string; date: string; kg: number };
export type WaterEntry = { id: string; date: string; time: string; ml: number };
export type StepEntry = { id: string; date: string; time: string; count: number };
export type Profile = {
  healthConditions?: HealthCondition[];
  clinicianTargets?: ClinicianTargets;
  name: string; goal: Goal; setting: 'gym' | 'home'; dob: string; heightCm: string;
  equation: 'female' | 'male' | ''; activity: 'sedentary' | 'light' | 'moderate' | 'high'; nutritionCaution: boolean;
  allergies: string; concerns: string;
  fitnessPlan: string; weightKg: number;
  daysPerWeek: number; pace: 'light' | 'moderate' | 'aggressive';
};
type Data = { profile: Profile; historyStartDay: string; meals: Meal[]; workouts: Workout[]; weighIns: WeighIn[]; water: Record<string, number>; waterEntries: WaterEntry[]; stepEntries: StepEntry[] };
type Store = Data & {
  ready: boolean;
  completeOnboarding: (ticket: string) => Promise<void>;
  replaceProfile: (profile: Profile) => void;
  addMeal: (meal: Omit<Meal, 'id'>) => void;
  editMeal: (meal: Meal) => void;
  addWorkout: (workout: Omit<Workout, 'id'>) => void;
  editWorkout: (workout: Workout) => void;
  addWeighIn: (date: string, kg: number) => void;
  editWeighIn: (entry: WeighIn) => void;
  addWater: (date: string, ml: number) => void;
  editWater: (entry: WaterEntry) => void;
  setLegacyWater: (date: string, ml: number) => void;
  addSteps: (date: string, count: number) => void;
  editSteps: (entry: StepEntry) => void;
  setDayWater: (date: string, ml: number) => void;
  setDaySteps: (date: string, count: number) => void;
  setDayWeight: (date: string, kg: number) => void;
  clearAccountData: () => Promise<void>;
  removeMeal: (id: string) => void;
  removeWorkout: (id: string) => void;
  removeWeighIn: (id: string) => void;
  removeWater: (id: string) => void;
  removeSteps: (id: string) => void;
};

const initial: Data = {
  profile: { name: '', goal: 'maintain', setting: 'gym', dob: '', heightCm: '', equation: '', activity: 'light', nutritionCaution: false, healthConditions: [], clinicianTargets: {}, allergies: '', concerns: '', fitnessPlan: '', weightKg: 0, daysPerWeek: 3, pace: 'moderate' },
  historyStartDay: '',
  meals: [], workouts: [], weighIns: [], water: {}, waterEntries: [], stepEntries: [],
};
const Context = createContext<Store | null>(null);
export const today = localDay;
const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const clockTime = () => { const date = new Date(); return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`; };

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const [data, setData] = useState<Data>(initial);
  const [ready, setReady] = useState(false);
  const [loadedUserId, setLoadedUserId] = useState('');
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
      setData({ ...initial, ...saved, historyStartDay: raw ? saved.historyStartDay || auth.startedOn || today() : today(), profile: { ...initial.profile, ...saved.profile, ...auth.profile },
        meals: (saved.meals || []).map((meal) => ({ ...meal, type: meal.type || 'snack', time: meal.time || '12:00' })),
        weighIns: saved.weighIns?.length ? [...saved.weighIns].sort((a, b) => b.date.localeCompare(a.date)) : auth.profile?.weightKg ? [{ id: newId(), date: auth.startedOn || today(), kg: auth.profile.weightKg }] : [], });
    }).catch(() => {}).finally(() => { if (active) { setLoadedUserId(auth.user.id); setReady(true); } });
    return () => { active = false; };
  }, [auth.ready, auth.user.id]);
  useEffect(() => { if (ready && auth.user.id && loadedUserId === auth.user.id && !deleting.current) {
    const snapshot = JSON.stringify(data);
    writes.current = writes.current.catch(() => {}).then(() => deleting.current ? undefined : AsyncStorage.setItem(key, snapshot));
  } }, [data, ready, key, auth.user.id, loadedUserId]);
  const effectiveReady = ready && auth.user.id === loadedUserId;
  const value = useMemo<Store>(() => ({
    ...data, ready: effectiveReady,
    completeOnboarding: async (ticket) => {
      const profile = await auth.approveAccountPlan(ticket, true);
      setData((old) => ({ ...old, profile, historyStartDay: today(), weighIns: [{ id: newId(), date: today(), kg: profile.weightKg }, ...old.weighIns] }));
    },
    replaceProfile: (profile) => setData((old) => ({ ...old, profile })),
    addMeal: (meal) => setData((old) => ({ ...old, meals: withSavedMeal(old.meals, { ...meal, id: newId() }) })),
    editMeal: (meal) => setData((old) => ({ ...old, meals: withSavedMeal(old.meals.filter((item) => item.id !== meal.id), meal) })),
    addWorkout: (workout) => setData((old) => ({ ...old, workouts: [{ ...workout, id: newId() }, ...old.workouts] })),
    editWorkout: (workout) => setData((old) => ({ ...old, workouts: old.workouts.map((item) => item.id === workout.id ? workout : item) })),
    addWeighIn: (date, kg) => setData((old) => ({ ...old, weighIns: [{ id: newId(), date, kg }, ...old.weighIns].sort((a, b) => b.date.localeCompare(a.date)) })),
    editWeighIn: (entry) => setData((old) => ({ ...old, weighIns: old.weighIns.map((item) => item.id === entry.id ? entry : item).sort((a, b) => b.date.localeCompare(a.date)) })),
    addWater: (date, ml) => setData((old) => ({ ...old, water: { ...old.water, [date]: Math.max(0, (old.water[date] || 0) + ml) }, waterEntries: [{ id: newId(), date, time: clockTime(), ml }, ...old.waterEntries] })),
    addSteps: (date, count) => setData((old) => ({ ...old, stepEntries: [{ id: newId(), date, time: clockTime(), count }, ...old.stepEntries] })),
    editWater: (entry) => setData((old) => {
      const previous = old.waterEntries.find((item) => item.id === entry.id);
      if (!previous) return old;
      const water = { ...old.water, [previous.date]: Math.max(0, (old.water[previous.date] || 0) - previous.ml) };
      water[entry.date] = (water[entry.date] || 0) + entry.ml;
      return { ...old, water, waterEntries: old.waterEntries.map((item) => item.id === entry.id ? entry : item) };
    }),
    setLegacyWater: (date, ml) => setData((old) => ({ ...old, water: { ...old.water,
      [date]: old.waterEntries.filter((item) => item.date === date).reduce((sum, item) => sum + item.ml, 0) + ml } })),
    editSteps: (entry) => setData((old) => ({ ...old, stepEntries: old.stepEntries.map((item) => item.id === entry.id ? entry : item) })),
    setDayWater: (date, ml) => setData((old) => ({ ...old, water: { ...old.water, [date]: ml },
      waterEntries: [{ id: newId(), date, time: clockTime(), ml }, ...old.waterEntries.filter((item) => item.date !== date)] })),
    setDaySteps: (date, count) => setData((old) => ({ ...old,
      stepEntries: [{ id: newId(), date, time: clockTime(), count }, ...old.stepEntries.filter((item) => item.date !== date)] })),
    setDayWeight: (date, kg) => setData((old) => ({ ...old,
      weighIns: [{ id: newId(), date, kg }, ...old.weighIns.filter((item) => item.date !== date)].sort((a, b) => b.date.localeCompare(a.date)) })),
    clearAccountData: async () => {
      deleting.current = true;
      await writes.current.catch(() => {});
      await AsyncStorage.removeItem(key);
      setData(initial);
    },
    removeMeal: (id) => setData((old) => ({ ...old, meals: old.meals.filter((item) => item.id !== id) })),
    removeWorkout: (id) => setData((old) => ({ ...old, workouts: old.workouts.filter((item) => item.id !== id) })),
    removeWeighIn: (id) => setData((old) => ({ ...old, weighIns: old.weighIns.filter((item) => item.id !== id) })),
    removeWater: (id) => setData((old) => { const entry = old.waterEntries.find((item) => item.id === id); return entry ? { ...old, waterEntries: old.waterEntries.filter((item) => item.id !== id), water: { ...old.water, [entry.date]: Math.max(0, (old.water[entry.date] || 0) - entry.ml) } } : old; }),
    removeSteps: (id) => setData((old) => ({ ...old, stepEntries: old.stepEntries.filter((item) => item.id !== id) })),
  }), [data, effectiveReady, auth]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useStore() {
  const store = useContext(Context);
  if (!store) throw new Error('StoreProvider is missing');
  return store;
}
