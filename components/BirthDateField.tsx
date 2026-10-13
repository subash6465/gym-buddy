import DatePickerField from './DatePickerField';
import { localDay } from '@/lib/dates';

export default function BirthDatePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <DatePickerField value={value} onChange={onChange} minimum="1900-01-01" maximum={localDay()} initialDate="2000-01-01" label="Choose date of birth" placeholder="DD-MM-YYYY" />;
}
