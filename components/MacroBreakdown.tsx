import { Text, View } from 'react-native';
import { Row, ui } from './UI';
import { macroAmount, macroGuides, macroKeys, macroLabels, type MacroAmounts } from '@/lib/macros';
import { theme } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { guideKind, guideSource } from './NutritionGuideList';

export default function MacroBreakdown({ amounts, targets, label = 'Consumed / daily guide' }: {
  amounts: MacroAmounts; targets: { calories: number; protein: number } | null; label?: string;
}) {
  const auth = useAuth();
  const nutrition = auth.plan?.nutrition;
  const guides = macroGuides(targets, nutrition);
  return <View style={{ gap: 13 }}>
    <Text style={ui.label}>{label.toUpperCase()}</Text>
    {macroKeys.map((key) => <View key={key} style={{ gap: 4 }}><Row><View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: key === 'protein' || key === 'carbs' ? theme.accent : theme.secondary }} /><Text style={[ui.muted, { flex: 1 }]}>{macroLabels[key]}</Text><Text style={{ color: theme.text, fontWeight: '700', fontSize: 13, maxWidth: '58%', textAlign: 'right' }}>{macroAmount(amounts[key], guides[key])}</Text></Row>{nutrition ? <Text style={[ui.muted, { fontSize: 10, marginLeft: 18 }]}>{guideKind(nutrition.guides[key])}{guideSource(nutrition.guides[key]) ? ` / ${guideSource(nutrition.guides[key])}` : ''}</Text> : null}</View>)}
    <Text style={[ui.muted, { fontSize: 11, lineHeight: 17 }]}>{nutrition ? 'Limits are ceilings, not amounts to consume. Unrecorded added sugar or saturated fat is unknown, not zero.' : targets ? 'These are general adult references. Request an AI nutrition review to personalize your saved guides.' : 'Personal nutrition guides need clinician input for this profile.'}</Text>
  </View>;
}
