export type HealthCondition = 'diabetes' | 'high-cholesterol' | 'kidney-disease' | 'other';
export type ClinicianKey = 'calories' | 'protein' | 'carbs' | 'fat' | 'fibre' | 'sugar' | 'addedSugar' | 'saturatedFat' | 'water';
export type ClinicianTargets = Partial<Record<ClinicianKey, number | string>>;
export const conditionOptions: HealthCondition[];
export const clinicianFields: ClinicianKey[];
export function nutritionRestrictions(profile: { healthConditions?: HealthCondition[]; concerns?: string; nutritionCaution?: boolean }): { requiresClinician: boolean; highCholesterol: boolean };
export function validateNutritionProfile(profile: { healthConditions?: HealthCondition[]; clinicianTargets?: ClinicianTargets }): { healthConditions: HealthCondition[]; clinicianTargets: Partial<Record<ClinicianKey, number>> };
