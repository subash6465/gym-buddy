import type { NutritionPlan, NutritionKey } from './plan';
export type MacroKey = NutritionKey;
export type MacroAmounts = Record<'protein' | 'carbs' | 'fat' | 'fibre' | 'sugar', number> & { addedSugar?: number | null; saturatedFat?: number | null };
export const macroLabels: Record<MacroKey, string> = { protein: 'Protein', carbs: 'Carbs', fat: 'Fat', fibre: 'Fibre', sugar: 'Total sugar', addedSugar: 'Added sugar', saturatedFat: 'Saturated fat' };
export const macroKeys: MacroKey[] = ['protein', 'carbs', 'fat', 'fibre', 'sugar', 'addedSugar', 'saturatedFat'];

// Adult reference ranges from EFSA. These are daily guides, not meal prescriptions.
// https://www.efsa.europa.eu/en/press/news/nda100326
export function macroGuides(targets: { calories: number; protein: number } | null, nutrition?: NutritionPlan): Record<MacroKey, string | null> {
  if (nutrition) return Object.fromEntries(macroKeys.map((key) => {
    const guide = nutrition.guides[key];
    return [key, guide?.kind === 'clinician-required' ? 'Clinician target needed' : guide?.value !== undefined ? `${guide.kind === 'limit' ? '≤ ' : ''}${guide.value}` : guide?.kind === 'range' ? `${guide.min}–${guide.max}` : 'No daily target'];
  })) as Record<MacroKey, string | null>;
  if (!targets || !Number.isFinite(targets.calories) || targets.calories <= 0) return { protein: null, carbs: null, fat: null, fibre: null, sugar: null, addedSugar: null, saturatedFat: null };
  const range = (min: number, max: number, kcalPerGram: number) => `${Math.round(targets.calories * min / kcalPerGram)}–${Math.round(targets.calories * max / kcalPerGram)}`;
  return { protein: Number.isFinite(targets.protein) && targets.protein > 0 ? String(targets.protein) : null, carbs: range(.45, .60, 4), fat: range(.20, .35, 9), fibre: '25', sugar: 'No daily target', addedSugar: null, saturatedFat: null };
}

export function macroAmount(value: number | null | undefined, guide: string | null) {
  const amount = value == null ? 'Not recorded' : Math.round(value).toLocaleString();
  if (guide && !/^\d|^≤/.test(guide)) return `${amount}${value == null ? '' : ' g'} / ${guide}`;
  return `${amount} / ${guide ?? '—'} g`;
}

export function macroTotals(items: MacroAmounts[]): MacroAmounts {
  return items.reduce<MacroAmounts>((totals, item) => {
    for (const key of macroKeys) {
      if (key === 'addedSugar' || key === 'saturatedFat') totals[key] = totals[key] === null || item[key] == null ? null : (totals[key] ?? 0) + item[key];
      else totals[key] += Number(item[key]) || 0;
    }
    return totals;
  }, { protein: 0, carbs: 0, fat: 0, fibre: 0, sugar: 0, addedSugar: 0, saturatedFat: 0 });
}
