import { BrandMark } from '@/components/BrandMark';
import { ActivityIndicator, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/lib/theme';

export default function Loading() {
  return <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
    <BrandMark size={72} />
    <ActivityIndicator size="large" color={theme.accent} />
    <Text style={{ color: theme.text, fontSize: 18, fontFamily: theme.font }}>Opening Gym Buddy</Text>
    <Text style={{ color: theme.muted, fontSize: 13 }}>Restoring your account and activity…</Text>
  </SafeAreaView>;
}
