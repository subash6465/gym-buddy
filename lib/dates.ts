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

/** Display only; persisted dates and API parameters remain ISO for sorting. */
export function formatDate(value: string | Date): string {
  const day = value instanceof Date ? localDay(value) : value;
  if (!parseDay(day)) return '—';
  const [year, month, date] = day.split('-');
  return `${date}-${month}-${year}`;
}

export function parseDisplayDate(value: string): string | null {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value);
  if (!match) return null;
  const day = `${match[3]}-${match[2]}-${match[1]}`;
  return parseDay(day) ? day : null;
}

export function displayDatesInText(text: string): string {
  return text.replace(/\b\d{4}-\d{2}-\d{2}\b/g, (day) => parseDay(day) ? formatDate(day) : day);
}

export function calendarDays(year: number, month: number) {
  const first = new Date(year, month, 1, 12);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(year, month, index - first.getDay() + 1, 12);
    return { date: localDay(date), day: date.getDate(), inMonth: date.getMonth() === month };
  });
}

export function clockTime(date = new Date()) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
