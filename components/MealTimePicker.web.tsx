import { theme } from '@/lib/theme';
export default function MealTimePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <input aria-label="Meal time" type="time" value={value} onChange={(event) => onChange(event.target.value)} style={{ boxSizing: 'border-box', width: '100%', minHeight: 48, background: theme.cardAlt, color: theme.text, border: `1px solid ${theme.line}`, borderRadius: 14, padding: '10px 14px', fontSize: 16, colorScheme: 'dark' }} />;
}
