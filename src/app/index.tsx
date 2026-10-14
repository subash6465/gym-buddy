import { WelcomeVisual } from '@/components/WelcomeVisual';
import { useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, Platform, Pressable, Text, View } from 'react-native';
import { Button, Card, Input, Label, Page, Title, ui } from '@/components/UI';
import { useAuth } from '@/lib/auth';
import type { AiProvider } from '@/lib/auth';
import { theme } from '@/lib/theme';

export default function Welcome() {
  const auth = useAuth();
  const [provider, setProvider] = useState<AiProvider>('openai');
  const [apiKey, setApiKey] = useState('');
  const [ticket, setTicket] = useState('');
  const [verifiedKey, setVerifiedKey] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const showError = (message: string) => {
    setError(message);
    if (Platform.OS !== 'web') Alert.alert('Device setup', message);
  };
  const verify = async () => {
    if (verifying || busy) return;
    setError(''); setTicket(''); setVerifiedKey('');
    if (apiKey.trim().length < 10 || /\s/.test(apiKey.trim())) return showError('Enter a valid API key for the selected provider.');
    setVerifying(true);
    try { setTicket(await auth.verifyAiKey(provider, apiKey.trim())); setVerifiedKey(`${provider}:${apiKey.trim()}`); }
    catch (cause) { showError(cause instanceof Error ? cause.message : 'Could not verify this key.'); }
    finally { setVerifying(false); }
  };
  const submit = async () => {
    if (busy || auth.setupError) return;
    Keyboard.dismiss();
    setError('');
    if (!ticket || verifiedKey !== `${provider}:${apiKey.trim()}`) { showError('Verify your AI key before continuing.'); return; }
    setBusy(true);
    try { await auth.connectAi(provider, apiKey.trim(), ticket); setApiKey(''); }
    catch (cause) { showError(cause instanceof Error ? cause.message : 'Could not complete device setup.'); }
    finally { setBusy(false); }
  };
  return <Page>
      <Title eyebrow="MEET YOUR DAILY EDGE" subtitle="Train with intent. Fuel your goals. See how far you go.">Stronger starts here.</Title>
      <WelcomeVisual />
      <Card>
        <Text style={ui.eyebrow}>YOUR AI COACH</Text>
        <Text style={{ color: theme.text, fontSize: 24, fontFamily: theme.font, letterSpacing: -.5 }}>Choose your AI provider</Text>
        <Text style={ui.muted}>Your profile and activity stay on this device. Connect your own AI key for meal estimates, plans and chat.</Text>
        {auth.setupError ? <><Text accessibilityRole="alert" style={{ color: theme.red }}>{auth.setupError}</Text><Button secondary onPress={auth.retrySetup}>Retry reading saved setup</Button></> : null}
          <Label>AI PROVIDER</Label>
          <View style={{ flexDirection: 'row', gap: 8 }}>{([['openai', 'OpenAI'], ['claude', 'Claude'], ['gemini', 'Gemini']] as const).map(([value, label]) => <Pressable key={value} disabled={verifying} onPress={() => { setProvider(value); setApiKey(''); setTicket(''); setVerifiedKey(''); }} accessibilityRole="button" accessibilityState={{ selected: provider === value }} style={{ flex: 1, minHeight: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: provider === value ? theme.accent : theme.cardAlt }}><Text style={{ color: provider === value ? theme.ink : theme.text, fontFamily: theme.font }}>{label}</Text></Pressable>)}</View>
          <Label>{provider.toUpperCase()} API KEY</Label><Input value={apiKey} editable={!verifying} onChangeText={(value) => { setApiKey(value); setTicket(''); setVerifiedKey(''); }} placeholder="Paste your API key" secureTextEntry autoCapitalize="none" autoCorrect={false} onSubmitEditing={() => { void verify(); }} />
          <Pressable onPress={() => { void verify(); }} disabled={verifying || busy} accessibilityRole="button" style={{ minHeight: 48, borderRadius: 13, backgroundColor: theme.cardAlt, justifyContent: 'center', alignItems: 'center' }}><View style={{ flexDirection: 'row', gap: 9, alignItems: 'center' }}>{verifying ? <ActivityIndicator color={theme.accent} /> : null}<Text style={{ color: theme.accent, fontFamily: theme.font }}>{verifying ? 'Verifying your API key…' : ticket ? 'Verified successfully ✓' : 'Verify API key'}</Text></View></Pressable>
          <Text style={[ui.muted, { fontSize: 11 }]}>Your key is saved securely on your phone and sent only to your chosen AI provider. AI requests need internet access. Browser previews keep the key only until the page is closed or reloaded.</Text>
        {error ? <Text accessibilityRole="alert" style={{ color: theme.red, fontSize: 13 }}>{error}</Text> : null}
        <Pressable onPress={() => { void submit(); }} disabled={busy || verifying || (!ticket || Boolean(auth.setupError))} accessibilityRole="button" accessibilityState={{ disabled: busy || verifying || (!ticket || Boolean(auth.setupError)), busy }} style={{ minHeight: 50, borderRadius: 13, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center', opacity: busy || verifying || (!ticket || Boolean(auth.setupError)) ? .55 : 1 }}><Text style={{ color: theme.ink, fontSize: 14, fontFamily: theme.font }}>{busy ? 'Connecting…' : 'Continue on this device'}</Text></Pressable>
      </Card>
      <Text style={[ui.muted, { textAlign: 'center' }]}>No account or separate server is required. Data does not sync between devices.</Text>
  </Page>;
}
