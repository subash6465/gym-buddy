import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { theme } from './theme';

export type Goal = 'lose' | 'gain' | 'maintain';
export type Meal = {
  id: string; date: string; name: string; note: string;
  calories: number; protein: number; carbs: number; fat: number; fibre: number; sugar: number;
};
export type Workout = { id: string; date: string; name: string; minutes: number; note: string };
export type WeighIn = { id: string; date: string; kg: number };
export type Profile = {
  name: string; goal: Goal; setting: 'gym' | 'home'; age: string; heightCm: string;
  allergies: string; concerns: string; calorieTarget: number; proteinTarget: number; waterTarget: number;
};
type Data = { profile: Profile; meals: Meal[]; workouts: Workout[]; weighIns: WeighIn[]; water: Record<string, number> };
type Store = Data & {
  ready: boolean;
  updateProfile: (patch: Partial<Profile>) => void;
  addMeal: (meal: Omit<Meal, 'id'>) => void;
  addWorkout: (workout: Omit<Workout, 'id'>) => void;
  addWeighIn: (kg: number) => void;
  addWater: (date: string, ml: number) => void;
  removeMeal: (id: string) => void;
  removeWorkout: (id: string) => void;
};

const initial: Data = {
  profile: { name: '', goal: 'maintain', setting: 'gym', age: '', heightCm: '', allergies: '', concerns: '', calorieTarget: 2000, proteinTarget: 100, waterTarget: 2500 },
  meals: [], workouts: [], weighIns: [], water: {},
};
const key = 'gym-buddy-data-v1';
const Context = createContext<Store | null>(null);
export const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Data>(initial);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(key).then((raw) => {
      if (raw) {
        const saved = JSON.parse(raw) as Partial<Data>;
        setData({ ...initial, ...saved, profile: { ...initial.profile, ...saved.profile } });
      }
    }).catch(() => {}).finally(() => setReady(true));
  }, []);
  useEffect(() => { if (ready) AsyncStorage.setItem(key, JSON.stringify(data)).catch(() => {}); }, [data, ready]);
  const value = useMemo<Store>(() => ({
    ...data, ready,
    updateProfile: (patch) => setData((old) => ({ ...old, profile: { ...old.profile, ...patch } })),
    addMeal: (meal) => setData((old) => ({ ...old, meals: [{ ...meal, id: newId() }, ...old.meals] })),
    addWorkout: (workout) => setData((old) => ({ ...old, workouts: [{ ...workout, id: newId() }, ...old.workouts] })),
    addWeighIn: (kg) => setData((old) => ({ ...old, weighIns: [{ id: newId(), date: today(), kg }, ...old.weighIns] })),
    addWater: (date, ml) => setData((old) => ({ ...old, water: { ...old.water, [date]: Math.max(0, (old.water[date] || 0) + ml) } })),
    removeMeal: (id) => setData((old) => ({ ...old, meals: old.meals.filter((item) => item.id !== id) })),
    removeWorkout: (id) => setData((old) => ({ ...old, workouts: old.workouts.filter((item) => item.id !== id) })),
  }), [data, ready]);
  if (!ready) return <View style={{ flex: 1, backgroundColor: theme.bg, justifyContent: 'center' }}><ActivityIndicator color={theme.accent} /></View>;
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useStore() {
  const store = useContext(Context);
  if (!store) throw new Error('StoreProvider is missing');
  return store;
}
