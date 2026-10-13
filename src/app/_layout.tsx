import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreProvider, useStore } from '@/lib/store';
import { theme } from '@/lib/theme';
import { MotionProvider, useReduceMotion } from '@/lib/motion';
import { AuthProvider, useAuth } from '@/lib/auth';
import ReviewAutomation from '@/components/ReviewAutomation';

SplashScreen.preventAutoHideAsync().catch(console.warn);

const navigationTheme = { ...DarkTheme, colors: { ...DarkTheme.colors, primary: theme.accent, background: theme.bg, card: theme.bg, text: theme.text, border: theme.line, notification: theme.accent } };

function Routes() {
  const reduced = useReduceMotion();
  const auth = useAuth();
  const store = useStore();
  const loading = !auth.ready || !store.ready;
  return <ThemeProvider value={navigationTheme}><StatusBar style="light" />{!loading && auth.profile ? <ReviewAutomation /> : null}<Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg }, animation: reduced === false ? 'fade_from_bottom' : 'none', animationDuration: 280, animationTypeForReplace: 'pop' }}>
    <Stack.Protected guard={loading}><Stack.Screen name="loading" /></Stack.Protected>
    <Stack.Protected guard={!loading && !auth.user.id}><Stack.Screen name="index" /></Stack.Protected>
    <Stack.Protected guard={!loading && Boolean(auth.user.id) && !auth.profile}><Stack.Screen name="onboarding" /></Stack.Protected>
    <Stack.Protected guard={!loading && Boolean(auth.user.id && auth.profile)}><Stack.Screen name="(tabs)" /><Stack.Screen name="chat" /><Stack.Screen name="reviews" /><Stack.Screen name="edit-entry" /><Stack.Screen name="modal" /></Stack.Protected>
  </Stack></ThemeProvider>;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceGroteskBold: require('../../assets/fonts/SpaceGrotesk-700.ttf'),
  });
  useEffect(() => { if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(console.warn); }, [fontsLoaded, fontError]);
  if (!fontsLoaded && !fontError) return null;
  return <SafeAreaProvider><MotionProvider><AuthProvider><StoreProvider><Routes /></StoreProvider></AuthProvider></MotionProvider></SafeAreaProvider>;
}
