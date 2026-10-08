import Constants from 'expo-constants';
import { Platform } from 'react-native';

export function apiUrl() {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');
  if (Platform.OS === 'web') return 'http://localhost:8787';

  // Expo Go's LAN URL points to the computer running Metro. The API uses that
  // same computer on port 8787. Tunnel URLs need an explicit API URL instead.
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host && /^(?:\d{1,3}\.){3}\d{1,3}$/.test(host)) return `http://${host}:8787`;
  throw new Error('Set EXPO_PUBLIC_API_URL to your computer’s API address, then restart Expo.');
}
