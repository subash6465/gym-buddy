import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Row, ui } from './UI';
import type { NutritionPlan, NutritionGuide } from '@/lib/plan';
import { primaryMacroKeys, macroSubsets, macroLabels, type MacroKey } from '@/lib/macros';
import { theme } from '@/lib/theme';
import NutritionDetails from './NutritionDetails';

export const guideKind = (guide: NutritionGuide) => ({ target: 'Daily target', limit: 'Upper limit', range: 'Reference range', 'clinician-required': 'Clinician guidance needed', informational: 'Informational' }[guide.kind]);
export const guideSource = (guide: NutritionGuide) => guide.source === 'clinician' ? 'Clinician-supplied / entered by you' : guide.source === 'ai' ? guide.adjusted ? 'AI / adjusted and validated' : 'AI / validated' : guide.source === 'reference' ? 'General reference' : '';
export const guideValue = (guide?: NutritionGuide) => guide?.value !== undefined ? `${guide.kind === 'limit' ? '≤ ' : ''}${guide.value} g` : guide?.kind === 'range' ? `${guide.min}–${guide.max} g` : guide?.kind === 'clinician-required' ? 'Needs clinician target' : 'No daily target';

export default function NutritionGuideList({ nutrition, previous }: { nutrition?: NutritionPlan; previous?: NutritionPlan }) {
  if (!nutrition) return <Text style={ui.muted}>This saved plan predates personalized nutrition guides. Request a nutrition review to create them.</Text>;
  const details = (key: MacroKey) => <>
    <Text style={[ui.muted, { fontSize: 11 }]}>{guideKind(nutrition.guides[key])}{guideSource(nutrition.guides[key]) ? ` / ${guideSource(nutrition.guides[key])}` : ''}</Text>
    {previous && guideValue(previous.guides[key]) !== guideValue(nutrition.guides[key]) ? <Text style={[ui.muted, { fontSize: 11 }]}>Previously: {guideValue(previous.guides[key])}</Text> : null}
    <Text style={[ui.muted, { fontSize: 12 }]}>{nutrition.guides[key].rationale}</Text>
  </>;
  return <View style={{ gap: 14 }}>
    <Text style={[ui.muted, { color: theme.text }]}>{nutrition.rationale}</Text>
    {primaryMacroKeys.map((key) => {
      const subset = macroSubsets[key];
      const changedSubset = subset && previous && guideValue(previous.guides[subset]) !== guideValue(nutrition.guides[subset]);
      const header = (arrow?: ReactNode) => <Row>{arrow || <View style={{ width: 12 }} />}<Text style={{ color: theme.text, fontWeight: '700', flex: 1 }}>{macroLabels[key]}</Text><Text style={{ color: theme.accent, fontWeight: '700', maxWidth: '55%', textAlign: 'right' }}>{guideValue(nutrition.guides[key])}</Text></Row>;
      return <View key={key} style={{ gap: 7, borderTopWidth: 1, borderColor: theme.line, paddingTop: 12 }}>
        {subset ? <NutritionDetails label={`${macroLabels[key]}: ${guideValue(nutrition.guides[key])}. Includes ${macroLabels[subset].toLowerCase()}.`} header={header} summary={<View style={{ gap: 5, marginLeft: 24 }}>{details(key)}</View>} initiallyOpen={Boolean(changedSubset)}>
          <Row><Text style={[ui.muted, { flex: 1, fontSize: 12 }]}>{macroLabels[subset]}</Text><Text style={{ color: theme.accent, fontWeight: '600', fontSize: 12, maxWidth: '55%', textAlign: 'right' }}>{guideValue(nutrition.guides[subset])}</Text></Row>
          {details(subset)}
          <Text style={[ui.muted, { fontSize: 11 }]}>Already included in {macroLabels[key].toLowerCase()}. This limit is not an additional allowance.</Text>
        </NutritionDetails> : <><View style={{ minHeight: 28, justifyContent: 'center' }}>{header()}</View><View style={{ gap: 5, marginLeft: 24 }}>{details(key)}</View></>}
      </View>;
    })}
  </View>;
}
