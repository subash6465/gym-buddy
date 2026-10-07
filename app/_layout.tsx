import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreProvider } from '@/lib/store';
import { theme } from '@/lib/theme';

export default function RootLayout() {
  return <SafeAreaProvider><StoreProvider><StatusBar style="light" /><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }} /></StoreProvider></SafeAreaProvider>;
}
