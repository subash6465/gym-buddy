import { Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { BrandMark } from './BrandMark';
import { theme } from '@/lib/theme';

export function WelcomeVisual() {
  return <View style={{ height: 200, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }} accessibilityLabel="Gym Buddy: training, nutrition and progress in sync">
    <Svg width="100%" height={200} viewBox="0 0 340 200" style={{ position: 'absolute' }}>
      <Circle cx={170} cy={100} r={90} stroke={theme.line} strokeWidth={1} fill="none" />
      <Circle cx={170} cy={100} r={65} stroke={theme.heroLine} strokeWidth={1} fill="none" strokeDasharray="3 7" />
      <Circle cx={170} cy={100} r={42} fill={theme.accentSoft} />
      <Path d="M80 100A90 90 0 0 1 228 31" stroke={theme.accent} strokeWidth={2} strokeLinecap="round" fill="none" />
      <Circle cx={228} cy={31} r={4} fill={theme.accent} />
      <Circle cx={109} cy={166} r={4} fill={theme.blue} />
      <Line x1={10} x2={85} y1={100} y2={100} stroke={theme.line} />
      <Line x1={255} x2={330} y1={100} y2={100} stroke={theme.line} />
    </Svg>
    <BrandMark size={57} />
    <View style={{ position: 'absolute', left: 0, top: 35, borderRadius: 12, padding: 11, backgroundColor: '#1B2022', borderWidth: 1, borderColor: theme.line }}><Text style={{ color: theme.accent, fontSize: 9, fontFamily: theme.font, letterSpacing: 1 }}>TRAIN WITH PURPOSE</Text><Text style={{ color: theme.text, fontSize: 13, fontWeight: '700', marginTop: 4 }}>Your plan. Your pace.</Text></View>
    <View style={{ position: 'absolute', right: 0, bottom: 26, borderRadius: 12, padding: 11, backgroundColor: '#1B2022', borderWidth: 1, borderColor: theme.line }}><Text style={{ color: theme.blue, fontSize: 9, fontFamily: theme.font, letterSpacing: 1 }}>SEE YOUR PROGRESS</Text><Text style={{ color: theme.text, fontSize: 13, fontWeight: '700', marginTop: 4 }}>Every check-in counts.</Text></View>
  </View>;
}
