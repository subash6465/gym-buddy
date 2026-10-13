import { Text, View } from 'react-native';
import { Row, ui } from './UI';
import { macroAmount, macroGuides, macroKeys, macroLabels, type MacroAmounts } from '@/lib/macros';
import { theme } from '@/lib/theme';

export default function MacroBreakdown({ amounts, targets, label = 'Consumed / daily guide' }: {
  amounts: MacroAmounts; targets: { calories: number; protein: number } | null; label?: string;
}) {
  const guides = macroGuides(targets);
  return <View style={{ gap: 13 }}>
    <Text style={ui.label}>{label.toUpperCase()}</Text>
    {macroKeys.map((key) => <Row key={key}><View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: key === 'protein' || key === 'carbs' ? theme.accent : theme.secondary }} /><Text style={[ui.muted, { flex: 1 }]}>{macroLabels[key]}</Text><Text style={{ color: theme.text, fontWeight: '700', fontSize: 13 }}>{macroAmount(amounts[key], guides[key])}</Text></Row>)}
    <Text style={[ui.muted, { fontSize: 11, lineHeight: 17 }]}>{targets ? 'Carbs and fat are general adult reference ranges. Total sugar has no guide set; it includes naturally occurring sugar.' : 'Personal nutrition guides are paused for this profile.'}</Text>
  </View>;
}
