import { Pressable, Text, View } from 'react-native';
import { Disclosure, Input, Label, ui } from './UI';
import type { Profile } from '@/lib/store';
import { clinicianFields, conditionOptions, type ClinicianKey, type HealthCondition } from '@/shared/nutrition-profile.mjs';
import { theme } from '@/lib/theme';

export const conditionLabels: Record<HealthCondition, string> = { diabetes: 'Diabetes', 'high-cholesterol': 'High cholesterol', 'kidney-disease': 'Kidney disease', other: 'Other dietary medical condition' };
const labels: Record<ClinicianKey, string> = { calories: 'Calories (kcal/day)', protein: 'Protein (g/day)', carbs: 'Carbohydrates (g/day)', fat: 'Total fat (g/day)', fibre: 'Fibre (g/day)', sugar: 'Total sugar limit (g/day)', addedSugar: 'Added sugar limit (g/day)', saturatedFat: 'Saturated fat limit (g/day)', water: 'Drinks (ml/day)' };

export default function NutritionSettings({ profile, onChange }: { profile: Profile; onChange: (updates: Pick<Profile, 'healthConditions' | 'clinicianTargets'>) => void }) {
  return <View style={{ gap: 14 }}>
    <Label>HEALTH CONDITIONS / SELECT ALL THAT APPLY</Label>
    <View style={{ gap: 8 }}>{conditionOptions.map((condition) => {
      const selected = profile.healthConditions?.includes(condition) || false;
      return <Pressable key={condition} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={() => onChange({ healthConditions: selected ? profile.healthConditions?.filter((item) => item !== condition) : [...(profile.healthConditions || []), condition].sort(), clinicianTargets: profile.clinicianTargets })} style={{ minHeight: 48, padding: 13, borderRadius: 14, borderWidth: 1, borderColor: selected ? theme.heroLine : theme.line, backgroundColor: selected ? theme.accentSoft : theme.cardAlt, flexDirection: 'row', gap: 10, alignItems: 'center' }}><Text style={{ color: selected ? theme.accent : theme.muted }}>{selected ? '✓' : '+'}</Text><Text style={{ color: theme.text, fontWeight: '600', flex: 1 }}>{conditionLabels[condition]}</Text></Pressable>;
    })}</View>
    <Text style={ui.muted}>Medical nutrition needs may require clinician-set targets. AI does not change medications, insulin, or treatment. These details go to your selected AI provider when generating a plan.</Text>
    <Disclosure title="Targets from your clinician" subtitle="Optional / enter only values your clinician provided">
      <Text style={ui.muted}>Values entered here take priority over AI. Leave a field empty if it was not supplied. Sugar and saturated fat are upper limits, not amounts to consume.</Text>
      {clinicianFields.map((key) => <View key={key} style={{ gap: 7 }}><Label>{labels[key].toUpperCase()}</Label><Input accessibilityLabel={labels[key]} placeholder="Not supplied" keyboardType="decimal-pad" value={String(profile.clinicianTargets?.[key] ?? '')} onChangeText={(text) => onChange({ healthConditions: profile.healthConditions, clinicianTargets: { ...profile.clinicianTargets, [key]: text } })} /></View>)}
      <Text style={[ui.muted, { fontSize: 11 }]}>You will review these values with the generated plan before saving. The app cannot verify who provided them.</Text>
    </Disclosure>
  </View>;
}
