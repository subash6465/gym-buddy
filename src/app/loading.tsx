import { BrandMark } from '@/components/BrandMark';
import { ActivityIndicator, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/lib/theme';
import { Button } from '@/components/UI';
import { useStore } from '@/lib/store';

export default function Loading() {
  const store = useStore();
  return <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
    <BrandMark size={72} />
    {store.storageError ? <><Text accessibilityRole="alert" style={{ color: theme.red, paddingHorizontal: 24 }}>{store.storageError}</Text><Button onPress={store.retryLoad}>Try again</Button></> : <ActivityIndicator size="large" color={theme.accent} />}
    <Text style={{ color: theme.text, fontSize: 18, fontFamily: theme.font }}>Opening Gym Buddy</Text>
    <Text style={{ color: theme.muted, fontSize: 13 }}>Restoring your account and activity…</Text>
  </SafeAreaView>;
}
