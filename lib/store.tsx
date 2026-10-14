import { normalizeCatalog, type CatalogExercise } from '../shared/exercise-catalog.mjs';
import type { LoggedExercise } from './workouts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { withSavedMeal } from './meals';
import { useAuth } from './auth';
import { localDay, clockTime } from './dates';
import { restoreData } from './persistence';
import type { HealthCondition, ClinicianTargets } from '@/shared/nutrition-profile.mjs';

export type Goal = 'lose' | 'gain' | 'maintain';
export type Meal = {
  id: string; date: string; time: string; type: 'breakfast' | 'lunch' | 'dinner' | 'snack'; name: string; note: string;
  calories: number; protein: number; carbs: number; fat: number; fibre: number; sugar: number;
  addedSugar?: number | null; saturatedFat?: number | null;
};
export type Workout = { id: string; date: string; time?: string; name: string; minutes: number; note: string; planDay?: string; planLabel?: string; exercises?: LoggedExercise[] };
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
export type Data = { profile: Profile; historyStartDay: string; exerciseLibrary: CatalogExercise[]; meals: Meal[]; workouts: Workout[]; weighIns: WeighIn[]; water: Record<string, number>; waterEntries: WaterEntry[]; stepEntries: StepEntry[] };
type Store = Data & {
  rememberExercise: (exercise: CatalogExercise) => void;
  ready: boolean;
  storageError: string;
  storageSaveError: string;
  retryLoad: () => void;
  retrySave: () => void;
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
  historyStartDay: '', exerciseLibrary: [],
  meals: [], workouts: [], weighIns: [], water: {}, waterEntries: [], stepEntries: [],
};
const Context = createContext<Store | null>(null);
export const today = localDay;
const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const [data, setData] = useState<Data>(initial);
  const [ready, setReady] = useState(false);
  const [loadedUserId, setLoadedUserId] = useState('');
  const [storageError, setStorageError] = useState('');
  const [storageSaveError, setStorageSaveError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [saveAttempt, setSaveAttempt] = useState(0);
  const currentUserId = useRef(auth.user.id);
  currentUserId.current = auth.user.id;
  const writes = useRef<Promise<unknown>>(Promise.resolve());
  const deleting = useRef(false);
  const key = `gym-buddy-data-v2-${auth.user.id}`;
  useEffect(() => {
    if (!auth.ready) return;
    let active = true;
    setData(initial);
    deleting.current = false;
    setStorageError('');
    setStorageSaveError('');
    if (!auth.user.id) { setData(initial); setLoadedUserId(''); setReady(true); deleting.current = false; return; }
    setReady(false);
    writes.current.catch(() => {}).then(() => AsyncStorage.getItem(key)).then((raw) => {
      if (!active) return;
      const restored = restoreData(raw, initial, auth.profile);
      restored.historyStartDay = raw ? restored.historyStartDay || auth.startedOn || today() : today();
      restored.weighIns = restored.weighIns.length ? [...restored.weighIns].sort((a, b) => b.date.localeCompare(a.date)) : auth.profile?.weightKg ? [{ id: newId(), date: auth.startedOn || today(), kg: auth.profile.weightKg }] : [];
      setData(restored);
      setLoadedUserId(auth.user.id);
      setReady(true);
    }).catch(() => { if (active) setStorageError('Could not read your saved activity. Try again. Your saved data has been kept.'); });
    return () => { active = false; };
  }, [auth.ready, auth.user.id, loadAttempt]);
  useEffect(() => { if (ready && auth.user.id && loadedUserId === auth.user.id && !deleting.current) {
    const snapshot = JSON.stringify(data);
    let active = true;
    writes.current = writes.current.catch(() => {}).then(() => deleting.current ? undefined : AsyncStorage.setItem(key, snapshot))
      .then(() => { if (active) setStorageSaveError(''); })
      .catch(() => { if (active) setStorageSaveError('Activity could not be saved on this device. Keep the app open and try saving again.'); });
    return () => { active = false; };
  } }, [data, ready, key, auth.user.id, loadedUserId, saveAttempt]);
  const effectiveReady = ready && auth.user.id === loadedUserId;
  const value = useMemo<Store>(() => ({
    ...data, ready: effectiveReady, storageError, storageSaveError,
    retryLoad: () => setLoadAttempt((attempt) => attempt + 1),
    retrySave: () => setSaveAttempt((attempt) => attempt + 1),
    completeOnboarding: async (ticket) => {
      const profile = await auth.approveAccountPlan(ticket, true);
      if (currentUserId.current !== auth.user.id) return;
      setData((old) => ({ ...old, profile, historyStartDay: today(), weighIns: [{ id: newId(), date: today(), kg: profile.weightKg }, ...old.weighIns] }));
    },
    rememberExercise: (exercise) => setData((old) => ({ ...old, exerciseLibrary: normalizeCatalog([...(old.exerciseLibrary || []), exercise]) })),
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
      try { await AsyncStorage.removeItem(key); }
      catch (error) { deleting.current = false; throw error; }
      setData(initial);
    },
    removeMeal: (id) => setData((old) => ({ ...old, meals: old.meals.filter((item) => item.id !== id) })),
    removeWorkout: (id) => setData((old) => ({ ...old, workouts: old.workouts.filter((item) => item.id !== id) })),
    removeWeighIn: (id) => setData((old) => ({ ...old, weighIns: old.weighIns.filter((item) => item.id !== id) })),
    removeWater: (id) => setData((old) => { const entry = old.waterEntries.find((item) => item.id === id); return entry ? { ...old, waterEntries: old.waterEntries.filter((item) => item.id !== id), water: { ...old.water, [entry.date]: Math.max(0, (old.water[entry.date] || 0) - entry.ml) } } : old; }),
    removeSteps: (id) => setData((old) => ({ ...old, stepEntries: old.stepEntries.filter((item) => item.id !== id) })),
  }), [data, effectiveReady, auth, storageError, storageSaveError]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useStore() {
  const store = useContext(Context);
  if (!store) throw new Error('StoreProvider is missing');
  return store;
}
