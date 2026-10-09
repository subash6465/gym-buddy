import type { Profile } from './store';
import type { AiPlan } from './plan';

export function ageOnDate(dob: string, now = new Date()): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  const birth = new Date(y, m - 1, d);
  if (birth.getFullYear() !== y || birth.getMonth() !== m - 1 || birth.getDate() !== d || birth > now) return null;
  return now.getFullYear() - y - (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d) ? 1 : 0);
}

export function suggestedTargets(profile: Profile, weightKg?: number, now = new Date()) {
  const age = ageOnDate(profile.dob, now);
  const height = Number(profile.heightCm);
  if (age === null || age < 20 || !weightKg || weightKg <= 0 || height < 100 || height > 250 || !profile.equation || profile.nutritionCaution) return null;
  const bmi = weightKg / ((height / 100) ** 2);
  if (profile.goal === 'lose' && bmi < 18.5) return null;
  const resting = 10 * weightKg + 6.25 * height - 5 * age + (profile.equation === 'male' ? 5 : -161);
  const factor = { sedentary: 1.2, light: 1.375, moderate: 1.55, high: 1.725 }[profile.activity];
  const maintenance = resting * factor;
  const calorieDelta = profile.goal === 'lose' ? -300 : profile.goal === 'gain' ? 200 : 0;
  const calories = Math.round(Math.max(resting, maintenance + calorieDelta) / 25) * 25;
  const proteinFactor = profile.activity === 'sedentary' ? 0.8 : profile.activity === 'light' ? 1.2 : profile.goal === 'maintain' ? 1.4 : 1.6;
  const protein = Math.round(weightKg * proteinFactor);
  // Approximate beverage portion of adult total water adequate intake; food supplies about 20%.
  const water = profile.equation === 'male' ? 3000 : 2200;
  return { age, bmi, resting: Math.round(resting), maintenance: Math.round(maintenance), calories, protein, water, proteinFactor };
}

export function planTargets(profile: Profile, weightKg: number | undefined, plan: AiPlan | null, now = new Date()) {
  const base = suggestedTargets(profile, weightKg, now);
  if (!base || !plan || !plan.calorieTarget) return base;
  return { ...base, calories: plan.calorieTarget, maintenance: plan.maintenanceCalories,
    protein: plan.proteinGrams, water: plan.waterMl, steps: plan.stepsTarget, deficit: plan.deficitCalories };
}
