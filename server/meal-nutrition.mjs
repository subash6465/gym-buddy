export const mealSchema = { type: 'object', additionalProperties: false, properties: {
  name: { type: 'string' }, calories: { type: 'number' }, protein: { type: 'number' }, carbs: { type: 'number' }, fat: { type: 'number' }, fibre: { type: 'number' }, sugar: { type: 'number' },
  addedSugar: { type: ['number', 'null'] }, saturatedFat: { type: ['number', 'null'] }, assumptions: { type: 'string' },
}, required: ['name', 'calories', 'protein', 'carbs', 'fat', 'fibre', 'sugar', 'addedSugar', 'saturatedFat', 'assumptions'] };

export function validateMealNutrition(raw) {
  const result = { ...raw };
  const fail = () => { throw Object.assign(new Error('The AI returned invalid nutrition values. Try again.'), { status: 502 }); };
  for (const field of ['calories', 'protein', 'carbs', 'fat', 'fibre', 'sugar']) if (!Number.isFinite(result[field]) || result[field] < 0 || result[field] > 10000) fail();
  for (const [key, total] of [['addedSugar', 'sugar'], ['saturatedFat', 'fat']]) {
    result[key] ??= null;
    if (result[key] !== null && (!Number.isFinite(result[key]) || result[key] < 0 || result[key] > result[total] + .1)) fail();
  }
  if (typeof result.name !== 'string' || !result.name.trim() || typeof result.assumptions !== 'string') fail();
  const macroCalories = result.protein * 4 + result.carbs * 4 + result.fat * 9;
  if (macroCalories > 0 && Math.abs(result.calories - macroCalories) / macroCalories > .15) {
    result.calories = Math.round(macroCalories / 10) * 10;
    result.assumptions += ' Calories were aligned with the estimated macronutrients.';
  }
  return result;
}
