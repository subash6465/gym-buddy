export type MacroKey = 'protein' | 'carbs' | 'fat' | 'fibre' | 'sugar';
export type MacroAmounts = Record<MacroKey, number>;
export const macroLabels: Record<MacroKey, string> = { protein: 'Protein', carbs: 'Carbs', fat: 'Fat', fibre: 'Fibre', sugar: 'Total sugar' };
export const macroKeys: MacroKey[] = ['protein', 'carbs', 'fat', 'fibre', 'sugar'];

// Adult reference ranges from EFSA. These are daily guides, not meal prescriptions.
// https://www.efsa.europa.eu/en/press/news/nda100326
export function macroGuides(targets: { calories: number; protein: number } | null): Record<MacroKey, string | null> {
  if (!targets || !Number.isFinite(targets.calories) || targets.calories <= 0) return { protein: null, carbs: null, fat: null, fibre: null, sugar: null };
  const range = (min: number, max: number, kcalPerGram: number) => `${Math.round(targets.calories * min / kcalPerGram)}–${Math.round(targets.calories * max / kcalPerGram)}`;
  return { protein: Number.isFinite(targets.protein) && targets.protein > 0 ? String(targets.protein) : null, carbs: range(.45, .60, 4), fat: range(.20, .35, 9), fibre: '25', sugar: null };
}

export function macroAmount(value: number, guide: string | null) {
  return `${Math.round(value).toLocaleString()} / ${guide ?? '—'} g`;
}

export function macroTotals(items: MacroAmounts[]): MacroAmounts {
  return items.reduce((totals, item) => {
    for (const key of macroKeys) totals[key] += Number(item[key]) || 0;
    return totals;
  }, { protein: 0, carbs: 0, fat: 0, fibre: 0, sugar: 0 });
}
