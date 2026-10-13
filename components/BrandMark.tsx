import Svg, { Path } from 'react-native-svg';
import { theme } from '@/lib/theme';

// Two interlocking forward strokes: a training partner and continual movement.
export function BrandMark({ size = 32, color = theme.accent }: { size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 64 64" accessibilityLabel="Gym Buddy logo">
    <Path d="M28 8H46L34 28H51L33 56H15L27 36H10Z" fill={color} />
    <Path d="M36 8H46L34 28H24Z" fill={theme.bg} opacity={0.24} />
  </Svg>;
}
