export const localDay = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export function parseDay(day: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const date = new Date(`${day}T12:00:00`);
  return localDay(date) === day ? date : null;
}

export function shiftDay(day: string, count: number) {
  const date = parseDay(day);
  if (!date) return day;
  date.setDate(date.getDate() + count);
  return localDay(date);
}

export function daysBetween(start: string, end: string) {
  const a = parseDay(start); const b = parseDay(end);
  return a && b ? Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86400_000) : 0;
}
