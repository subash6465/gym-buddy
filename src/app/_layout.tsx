import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreProvider, useStore } from '@/lib/store';
import { theme } from '@/lib/theme';
import { MotionProvider } from '@/lib/motion';
import { AuthProvider, useAuth } from '@/lib/auth';
import ReviewAutomation from '@/components/ReviewAutomation';

function Routes() {
  const auth = useAuth();
  const store = useStore();
  const loading = !auth.ready || !store.ready;
  return <><StatusBar style="light" />{!loading && auth.profile ? <ReviewAutomation /> : null}<Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }}>
    <Stack.Protected guard={loading}><Stack.Screen name="loading" /></Stack.Protected>
    <Stack.Protected guard={!loading && !auth.user.id}><Stack.Screen name="index" /></Stack.Protected>
    <Stack.Protected guard={!loading && Boolean(auth.user.id) && !auth.profile}><Stack.Screen name="onboarding" /></Stack.Protected>
    <Stack.Protected guard={!loading && Boolean(auth.user.id && auth.profile)}><Stack.Screen name="(tabs)" /><Stack.Screen name="chat" /><Stack.Screen name="reviews" /><Stack.Screen name="edit-entry" /><Stack.Screen name="modal" /></Stack.Protected>
  </Stack></>;
}

export default function RootLayout() {
  useEffect(() => { SplashScreen.hideAsync().catch(console.warn); }, []);
  return <SafeAreaProvider><MotionProvider><AuthProvider><StoreProvider><Routes /></StoreProvider></AuthProvider></MotionProvider></SafeAreaProvider>;
}
