import { theme } from '@/lib/theme';
export default function BirthDatePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const today = new Date();
  const max = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return <input aria-label="Date of birth" type="date" min="1900-01-01" max={max} value={value} onChange={(event) => onChange(event.target.value)} style={{ boxSizing: 'border-box', width: '100%', minHeight: 48, background: theme.cardAlt, color: theme.text, border: `1px solid ${theme.line}`, borderRadius: 14, padding: '10px 14px', fontSize: 16, colorScheme: 'dark' }} />;
}
