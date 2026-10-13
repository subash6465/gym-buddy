import { nutritionRestrictions, validateNutritionProfile } from '../shared/nutrition-profile.mjs';

export const nutritionProposalSchema = { type: 'object', additionalProperties: false, properties: {
  carbsGrams: { type: 'number' }, fatGrams: { type: 'number' }, fibreGrams: { type: 'number' },
  addedSugarLimitGrams: { type: 'number' }, saturatedFatLimitGrams: { type: 'number' },
  requiresClinicianReview: { type: 'boolean' }, rationale: { type: 'string' },
}, required: ['carbsGrams', 'fatGrams', 'fibreGrams', 'addedSugarLimitGrams', 'saturatedFatLimitGrams', 'requiresClinicianReview', 'rationale'] };
const keys = ['protein', 'carbs', 'fat', 'fibre', 'sugar', 'addedSugar', 'saturatedFat'];
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const fail = () => { throw Object.assign(new Error('The AI returned invalid nutrition guides. Try generating the plan again.'), { status: 502 }); };

export function normalizeNutrition(proposal, profile, plan) {
  const { clinicianTargets: clinician } = validateNutritionProfile(profile);
  const flags = nutritionRestrictions(profile);
  if (proposal !== undefined && (!proposal || ['carbsGrams', 'fatGrams', 'fibreGrams', 'addedSugarLimitGrams', 'saturatedFatLimitGrams'].some((key) => !Number.isFinite(proposal[key]) || proposal[key] < 0) || typeof proposal.requiresClinicianReview !== 'boolean' || typeof proposal.rationale !== 'string' || !proposal.rationale.trim())) fail();
  const requiresClinician = flags.requiresClinician || !plan.calorieTarget || Boolean(proposal?.requiresClinicianReview);
  const calories = clinician.calories ?? (requiresClinician ? 0 : plan.calorieTarget);
  let protein = clinician.protein ?? (requiresClinician ? 0 : plan.proteinGrams);
  const water = clinician.water ?? (requiresClinician ? 0 : plan.waterMl);
  const guides = Object.fromEntries(keys.map((key) => [key, { kind: 'clinician-required', source: 'none', rationale: 'Ask your clinician for a suitable daily target or limit.' }]));
  guides.sugar = { kind: 'informational', source: 'none', rationale: 'Total sugar includes naturally occurring sugar. There is no general daily target; track added sugar separately.' };
  const guide = (kind, value, rationale, adjusted = false) => ({ kind, value, source: proposal ? 'ai' : 'reference', adjusted, rationale });
  const clinicianMacros = ['protein', 'carbs', 'fat'].some((key) => clinician[key] !== undefined);
  if (!requiresClinician && calories > 0) {
    // Ensure the general adult macro distribution can fit within the calorie budget.
    protein = clinicianMacros ? clinician.protein ?? 0 : Math.min(protein, Math.floor(calories * .35 / 4));
    const remaining = calories - protein * 4;
    const minFat = Math.max(calories * .20, remaining - calories * .65) / 9;
    const maxFat = Math.min(calories * .35, remaining - calories * .45) / 9;
    if (!clinicianMacros && (minFat > maxFat || protein <= 0)) fail();
    const fat = clinicianMacros ? clinician.fat ?? Math.round(calories * .30 / 9) : Math.round(clamp(proposal?.fatGrams ?? calories * .30 / 9, minFat, maxFat));
    const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
    const fibre = Math.round(clamp(proposal?.fibreGrams ?? 25, 25, 40));
    const addedSugar = Math.floor(clamp(proposal?.addedSugarLimitGrams ?? calories * .10 / 4, 0, Math.min(clinician.sugar ?? Infinity, calories * .10 / 4)));
    const saturatedFat = Math.floor(clamp(proposal?.saturatedFatLimitGrams ?? calories * (flags.highCholesterol ? .06 : .10) / 9, 0, Math.min(clinician.fat ?? fat, calories * (flags.highCholesterol ? .06 : .10) / 9)));
    const rationale = proposal?.rationale.trim().slice(0, 500) || 'General adult reference, awaiting an AI nutrition review.';
    guides.protein = guide('target', protein, 'Approved protein guide, bounded for weight and the calorie budget.', protein !== plan.proteinGrams);
    guides.carbs = guide('target', carbs, 'Adjusted with protein and fat to match the approved calorie guide.', proposal?.carbsGrams !== carbs);
    guides.fat = guide('target', fat, 'Bounded to a general adult fat distribution.', proposal?.fatGrams !== fat);
    if (clinicianMacros) for (const key of ['protein', 'carbs', 'fat']) guides[key] = { kind: 'clinician-required', source: 'none', rationale: 'Complete your clinician macro targets; automatic targets cannot replace a partial clinician plan.' };
    guides.fibre = guide('target', fibre, rationale, proposal?.fibreGrams !== fibre);
    guides.addedSugar = guide('limit', addedSugar, 'Daily added-sugar ceiling, not an amount to consume. This does not measure all free sugars.', proposal?.addedSugarLimitGrams !== addedSugar);
    guides.saturatedFat = guide('limit', saturatedFat, flags.highCholesterol ? 'General heart-health ceiling for high cholesterol; confirm individual needs with your clinician.' : 'Daily saturated-fat ceiling, not an amount to consume.', proposal?.saturatedFatLimitGrams !== saturatedFat);
  }
  for (const key of keys) if (clinician[key] !== undefined) {
    guides[key] = { kind: ['sugar', 'addedSugar', 'saturatedFat'].includes(key) ? 'limit' : 'target', value: clinician[key], source: 'clinician', rationale: 'Clinician-provided value entered by you. The AI cannot replace this value.' };
  }
  if (guides.fat.value !== undefined && guides.saturatedFat.value > guides.fat.value) {
    throw Object.assign(new Error('The saturated-fat limit exceeds the total-fat target. Check the clinician values before approving.'), { status: 400 });
  }
  // Never silently modify clinician values to repair a contradictory macro budget.
  if (calories > 0 && ['protein', 'carbs', 'fat'].every((key) => guides[key].kind === 'target')) {
    const energy = guides.protein.value * 4 + guides.carbs.value * 4 + guides.fat.value * 9;
    if (Math.abs(energy - calories) > calories * .15) {
      if (['protein', 'carbs', 'fat'].every((key) => clinician[key] !== undefined)) throw Object.assign(new Error('Check your clinician calorie and macro targets; they do not agree.'), { status: 400 });
      for (const key of ['protein', 'carbs', 'fat']) if (clinician[key] === undefined) guides[key] = { kind: 'clinician-required', source: 'none', rationale: 'Complete the clinician macro targets to reconcile the calorie budget.' };
      protein = clinician.protein ?? 0;
    }
  }
  return { calorieTarget: calories, proteinGrams: protein, waterMl: water,
    nutrition: { version: 1, guides, requiresClinicianReview: requiresClinician || (clinicianMacros && ['protein', 'carbs', 'fat'].some((key) => clinician[key] === undefined)),
      rationale: requiresClinician ? 'Use clinician-provided targets for this health context. Missing values require clinician guidance.' : proposal?.rationale.trim().slice(0, 500) || 'General adult references.',
      basedOnWeightKg: profile.weightKg, reviewAfter: new Date(Date.now() + 28 * 86400_000).toISOString(),
      calorieSource: clinician.calories !== undefined ? 'clinician' : calories > 0 ? 'ai' : 'none', waterSource: clinician.water !== undefined ? 'clinician' : water > 0 ? 'ai' : 'none' } };
}
