export const conditionOptions = ['diabetes', 'high-cholesterol', 'kidney-disease', 'other'];
export const clinicianFields = ['calories', 'protein', 'carbs', 'fat', 'fibre', 'sugar', 'addedSugar', 'saturatedFat', 'water'];
const maximums = { calories: 8000, protein: 500, carbs: 1000, fat: 500, fibre: 100, sugar: 500, addedSugar: 500, saturatedFat: 200, water: 10000 };
const fail = (message) => { throw Object.assign(new Error(message), { status: 400 }); };

export function nutritionRestrictions(profile) {
  const conditions = profile.healthConditions || [];
  const context = profile.concerns || '';
  return {
    requiresClinician: Boolean(profile.nutritionCaution || conditions.some((item) => ['diabetes', 'kidney-disease', 'other'].includes(item)) || /diabet|insulin|kidney|renal|dialysis|pregnan|breastfeed|eating disorder|heart failure|liver disease|hypertension/i.test(context)),
    highCholesterol: conditions.includes('high-cholesterol') || /cholesterol|\bLDL\b/i.test(context),
  };
}

export function validateNutritionProfile(profile) {
  const conditions = profile.healthConditions ?? [];
  if (!Array.isArray(conditions) || conditions.length > conditionOptions.length || conditions.some((item) => !conditionOptions.includes(item)) || new Set(conditions).size !== conditions.length) fail('Choose valid health conditions.');
  const supplied = profile.clinicianTargets ?? {};
  if (!supplied || typeof supplied !== 'object' || Array.isArray(supplied)) fail('Enter valid clinician-provided targets.');
  const targets = {};
  for (const [key, input] of Object.entries(supplied)) {
    if (!clinicianFields.includes(key)) fail('Unknown clinician target.');
    if (input === '' || input === undefined) continue;
    if (!['number', 'string'].includes(typeof input) || (typeof input === 'string' && !/^\d+(?:\.\d+)?$/.test(input.trim()))) fail(`Check your clinician ${key} target.`);
    const value = Number(input);
    const minimum = key === 'calories' ? 500 : key === 'water' ? 100 : key === 'protein' ? 1 : 0;
    if (!Number.isFinite(value) || value < minimum || value > maximums[key]) fail(`Check your clinician ${key} target (${minimum}–${maximums[key]}).`);
    targets[key] = value;
  }
  if (targets.calories !== undefined && ['protein', 'carbs', 'fat'].every((key) => targets[key] !== undefined)) {
    const energy = targets.protein * 4 + targets.carbs * 4 + targets.fat * 9;
    if (Math.abs(energy - targets.calories) > targets.calories * .15) fail('The clinician calorie and macro targets do not agree. Check the entered values with your clinician.');
  }
  if (targets.saturatedFat !== undefined && targets.fat !== undefined && targets.saturatedFat > targets.fat) fail('Saturated fat cannot exceed total fat.');
  if (targets.addedSugar !== undefined && targets.sugar !== undefined && targets.addedSugar > targets.sugar) fail('Added sugar cannot exceed total sugar.');
  return { healthConditions: [...conditions].sort(), clinicianTargets: targets };
}
