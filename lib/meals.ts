import type { Meal } from './store';

export function withSavedMeal(existing: Meal[], meal: Meal): Meal[] {
  return [meal, ...existing.filter((item) => meal.type === 'snack' || item.date !== meal.date || item.type !== meal.type)];
}
