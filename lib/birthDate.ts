/** Profiles store an ISO date; forms display day-month-year. */
export function displayBirthDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : '';
}

export function parseBirthDate(display: string): string | null {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(display);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day || date > new Date() || year < 1900) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}
