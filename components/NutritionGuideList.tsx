import { Text, View } from 'react-native';
import { Row, ui } from './UI';
import type { NutritionPlan, NutritionGuide } from '@/lib/plan';
import { macroKeys, macroLabels } from '@/lib/macros';
import { theme } from '@/lib/theme';

export const guideKind = (guide: NutritionGuide) => ({ target: 'Daily target', limit: 'Upper limit', range: 'Reference range', 'clinician-required': 'Clinician guidance needed', informational: 'Informational' }[guide.kind]);
export const guideSource = (guide: NutritionGuide) => guide.source === 'clinician' ? 'Clinician-supplied / entered by you' : guide.source === 'ai' ? guide.adjusted ? 'AI / adjusted and validated' : 'AI / validated' : guide.source === 'reference' ? 'General reference' : '';
export const guideValue = (guide?: NutritionGuide) => guide?.value !== undefined ? `${guide.kind === 'limit' ? '≤ ' : ''}${guide.value} g` : guide?.kind === 'range' ? `${guide.min}–${guide.max} g` : guide?.kind === 'clinician-required' ? 'Needs clinician target' : 'No daily target';

export default function NutritionGuideList({ nutrition, previous }: { nutrition?: NutritionPlan; previous?: NutritionPlan }) {
  if (!nutrition) return <Text style={ui.muted}>This saved plan predates personalized nutrition guides. Request a nutrition review to create them.</Text>;
  return <View style={{ gap: 14 }}>
    <Text style={[ui.muted, { color: theme.text }]}>{nutrition.rationale}</Text>
    {macroKeys.map((key) => <View key={key} style={{ gap: 5, borderTopWidth: 1, borderColor: theme.line, paddingTop: 12 }}>
      <Row><Text style={{ color: theme.text, fontWeight: '700', flex: 1 }}>{macroLabels[key]}</Text><Text style={{ color: theme.accent, fontWeight: '700', maxWidth: '55%', textAlign: 'right' }}>{guideValue(nutrition.guides[key])}</Text></Row>
      <Text style={[ui.muted, { fontSize: 11 }]}>{guideKind(nutrition.guides[key])}{guideSource(nutrition.guides[key]) ? ` / ${guideSource(nutrition.guides[key])}` : ''}</Text>
      {previous && guideValue(previous.guides[key]) !== guideValue(nutrition.guides[key]) ? <Text style={[ui.muted, { fontSize: 11 }]}>Previously: {guideValue(previous.guides[key])}</Text> : null}
      <Text style={[ui.muted, { fontSize: 12 }]}>{nutrition.guides[key].rationale}</Text>
    </View>)}
  </View>;
}
