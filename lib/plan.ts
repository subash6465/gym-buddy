export type PlanDay = {
  day: string; title: string; focus: string; activities: string[]; minutes: number; isRest: boolean;
};
export type AiPlan = {
  nutrition?: NutritionPlan;
  summary: string; suggestions: string; requestedDays: number; recommendedDays: number; pace: 'light' | 'moderate' | 'aggressive';
  maintenanceCalories: number; calorieTarget: number; deficitCalories: number; proteinGrams: number; waterMl: number; stepsTarget: number;
  days: PlanDay[]; generatedAt: string; guidanceNote: string;
};
export type NutritionKey = 'protein' | 'carbs' | 'fat' | 'fibre' | 'sugar' | 'addedSugar' | 'saturatedFat';
export type NutritionGuide = { kind: 'target' | 'limit' | 'range' | 'clinician-required' | 'informational'; source: 'ai' | 'reference' | 'clinician' | 'none'; value?: number; min?: number; max?: number; rationale: string; adjusted?: boolean };
export type NutritionPlan = { version: 1; guides: Record<NutritionKey, NutritionGuide>; requiresClinicianReview: boolean; rationale: string; basedOnWeightKg: number; reviewAfter: string; calorieSource: NutritionGuide['source']; waterSource: NutritionGuide['source'] };
