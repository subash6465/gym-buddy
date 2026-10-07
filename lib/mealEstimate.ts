export type MealEstimate = { name: string; calories: number; protein: number; carbs: number; fat: number; fibre: number; sugar: number; assumptions: string };

export async function estimateMeal(description: string, imageDataUrl: string | null): Promise<MealEstimate> {
  const base = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8787';
  const response = await fetch(`${base}/estimate-meal`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description, ...(imageDataUrl ? { imageDataUrl } : {}) }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Could not estimate the meal.');
  return data as MealEstimate;
}
