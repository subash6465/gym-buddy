import { useState } from 'react';
import { theme } from '@/lib/theme';
import { displayBirthDate, parseBirthDate } from '@/lib/birthDate';
export default function BirthDatePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [draft, setDraft] = useState(() => displayBirthDate(value));
  return <input aria-label="Date of birth in day-month-year format" type="text" inputMode="numeric" maxLength={10} placeholder="DD-MM-YYYY" value={draft} onChange={(event) => {
    const next = event.target.value;
    setDraft(next);
    onChange(parseBirthDate(next) || '');
  }} style={{ boxSizing: 'border-box', width: '100%', minHeight: 48, background: theme.cardAlt, color: theme.text, border: `1px solid ${theme.line}`, borderRadius: 14, padding: '10px 14px', fontSize: 16 }} />;
}
