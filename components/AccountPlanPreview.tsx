import { planDayLabel } from '@/lib/workouts';
import { Text, View } from 'react-native';
import { Card, ui } from './UI';
import NutritionGuideList from './NutritionGuideList';
import type { AiPlan } from '@/lib/plan';
import { theme } from '@/lib/theme';

export default function AccountPlanPreview({ plan }: { plan: AiPlan }) {
  return <Card style={{ borderColor: theme.heroLine }}><Text style={{ color: theme.accent, fontFamily: theme.font, fontSize: 20 }}>Review your proposed plan</Text><Text style={ui.muted}>{plan.summary}</Text><Text style={{ color: theme.text, fontWeight: '700' }}>{plan.calorieTarget ? `${plan.calorieTarget.toLocaleString()} kcal/day / ${plan.nutrition?.calorieSource === 'clinician' ? 'Clinician-supplied' : 'Starting estimate'}` : 'Calorie guide needs clinician input'}</Text><Text style={ui.muted}>{plan.waterMl ? `${plan.waterMl} ml drinks/day / ${plan.nutrition?.waterSource === 'clinician' ? 'Clinician-supplied' : 'Starting estimate'}` : 'Drink guide needs clinician input'} / {plan.stepsTarget.toLocaleString()} steps/day</Text><NutritionGuideList nutrition={plan.nutrition} /><View style={{ gap: 6 }}><Text style={{ color: theme.text, fontWeight: '700' }}>Training week</Text>{plan.days.map((day, index) => <Text key={day.day} style={ui.muted}>{planDayLabel(plan.days, index)}: {day.title} / {day.minutes} min{day.isRest ? ' / recovery' : ''}</Text>)}</View><Text style={ui.muted}>Approve to save this profile and plan together. Cancel to return to your details. Nutrition limits are ceilings, not goals to reach.</Text></Card>;
}
