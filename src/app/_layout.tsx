import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreProvider, useStore } from '@/lib/store';
import { theme } from '@/lib/theme';
import { MotionProvider } from '@/lib/motion';
import { AuthProvider, useAuth } from '@/lib/auth';

function Routes() {
  const auth = useAuth();
  const store = useStore();
  if (!auth.ready || !store.ready) return null;
  return <><StatusBar style="light" /><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }}>
    <Stack.Protected guard={!auth.user.id}><Stack.Screen name="index" /></Stack.Protected>
    <Stack.Protected guard={Boolean(auth.user.id) && !auth.profile}><Stack.Screen name="onboarding" /></Stack.Protected>
    <Stack.Protected guard={Boolean(auth.user.id && auth.profile)}><Stack.Screen name="(tabs)" /><Stack.Screen name="chat" /><Stack.Screen name="modal" /></Stack.Protected>
  </Stack></>;
}

export default function RootLayout() {
  return <SafeAreaProvider><MotionProvider><AuthProvider><StoreProvider><Routes /></StoreProvider></AuthProvider></MotionProvider></SafeAreaProvider>;
}
