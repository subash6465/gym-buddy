export type CatalogExercise = { name: string; kind: 'strength' | 'timed' };
export const exerciseNamingGuidance: string;
export function canonicalExerciseName(name: string): string;
export function exerciseKey(name: string): string;
export function normalizeCatalog(entries: CatalogExercise[]): CatalogExercise[];
export function normalizePlannedExercises<T extends CatalogExercise & { prescription: string; sets: number }>(entries: T[]): T[];
