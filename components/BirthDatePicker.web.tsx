import { localDay, parseDay } from '@/lib/dates';
import { theme } from '@/lib/theme';
export default function BirthDatePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <input aria-label="Choose date of birth" type="date" min="1900-01-01" max={localDay()} value={value} onChange={(event) => onChange(parseDay(event.target.value) ? event.target.value : '')} style={{ boxSizing: 'border-box', width: '100%', minHeight: 48, background: theme.cardAlt, color: theme.text, border: `1px solid ${theme.line}`, borderRadius: 14, padding: '10px 14px', fontSize: 16, colorScheme: 'dark' }} />;
}
