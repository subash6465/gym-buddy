import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StoreProvider } from '@/lib/store';
import { theme } from '@/lib/theme';

export default function RootLayout() {
  return <StoreProvider><StatusBar style="light" /><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }} /></StoreProvider>;
}
