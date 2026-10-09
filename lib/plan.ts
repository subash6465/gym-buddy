export type PlanDay = {
  day: string; title: string; focus: string; activities: string[]; minutes: number; isRest: boolean;
};
export type AiPlan = {
  summary: string; suggestions: string; requestedDays: number; recommendedDays: number; pace: 'light' | 'moderate' | 'aggressive';
  maintenanceCalories: number; calorieTarget: number; deficitCalories: number; proteinGrams: number; waterMl: number; stepsTarget: number;
  days: PlanDay[]; generatedAt: string; guidanceNote: string;
};
