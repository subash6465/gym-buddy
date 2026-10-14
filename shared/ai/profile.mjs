import { validateNutritionProfile } from '../nutrition-profile.mjs';
const fail = (message) => { throw Object.assign(new Error(message), { status: 400 }); };
const choices = {
  goal: ['lose', 'gain', 'maintain'], setting: ['gym', 'home'],
  activity: ['sedentary', 'light', 'moderate', 'high'], equation: ['', 'female', 'male'],
};
export function validateProfile(profile) {
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) fail('Invalid profile.');
  Object.assign(profile, validateNutritionProfile(profile));
  profile.daysPerWeek ??= 3;
  profile.pace ??= 'moderate';
  for (const field of ['name', 'dob', 'heightCm', 'allergies', 'concerns', 'fitnessPlan']) {
    if (typeof profile[field] !== 'string' || profile[field].length > 2000) fail(`Invalid ${field}.`);
  }
  if (!profile.name.trim()) fail('Enter your name.');
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(profile.dob);
  const birth = date && new Date(Number(date[1]), Number(date[2]) - 1, Number(date[3]));
  if (!birth || birth.getFullYear() !== Number(date[1]) || birth.getMonth() !== Number(date[2]) - 1 || birth.getDate() !== Number(date[3]) || birth > new Date()) fail('Enter a valid date of birth.');
  if (!Number.isFinite(Number(profile.heightCm)) || Number(profile.heightCm) < 100 || Number(profile.heightCm) > 250) fail('Enter a height between 100 and 250 cm.');
  if (!Number.isFinite(profile.weightKg) || profile.weightKg < 25 || profile.weightKg > 400) fail('Enter a weight between 25 and 400 kg.');
  for (const [field, allowed] of Object.entries(choices)) if (!allowed.includes(profile[field])) fail(`Invalid ${field}.`);
  if (typeof profile.nutritionCaution !== 'boolean') fail('Invalid special dietary care selection.');
  if (!Number.isInteger(profile.daysPerWeek) || profile.daysPerWeek < 1 || profile.daysPerWeek > 7) fail('Choose 1 to 7 training days per week.');
  if (!['light', 'moderate', 'aggressive'].includes(profile.pace)) fail('Choose a training pace.');
}
