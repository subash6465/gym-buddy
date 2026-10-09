import { useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, Platform, Pressable, Text, View } from 'react-native';
import { Button, Card, Input, Label, Page, Title, ui } from '@/components/UI';
import { useAuth } from '@/lib/auth';
import type { AiProvider } from '@/lib/auth';
import { theme } from '@/lib/theme';

export default function Welcome() {
  const auth = useAuth();
  const [create, setCreate] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<'account' | 'ai'>('account');
  const [provider, setProvider] = useState<AiProvider>('openai');
  const [apiKey, setApiKey] = useState('');
  const [ticket, setTicket] = useState('');
  const [verifiedKey, setVerifiedKey] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const showError = (message: string) => {
    setError(message);
    if (Platform.OS !== 'web') Alert.alert('Account setup', message);
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
    if (busy) return;
    Keyboard.dismiss();
    setError('');
    if (step === 'account') {
      if (!email.trim() || !password) { showError('Enter your email and password.'); return; }
      if (create && password.length < 10) { showError('Use a password of at least 10 characters.'); return; }
      setStep('ai'); return;
    }
    if (!ticket || verifiedKey !== `${provider}:${apiKey.trim()}`) { showError('Verify your AI key before continuing.'); return; }
    setBusy(true);
    try { await auth.signIn(email, password, create, provider, apiKey.trim(), ticket); setApiKey(''); }
    catch (cause) { showError(cause instanceof Error ? cause.message : 'Could not sign in.'); }
    finally { setBusy(false); }
  };
  return <Page>
      <Title eyebrow="YOUR STRONGER START" subtitle="A simple place to plan, move, and keep track of what matters to you.">Make progress feel personal.</Title>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {['Build your plan', 'Track each day', 'Find your rhythm'].map((item, index) => <View key={item} style={{ flex: 1, minHeight: 75, borderRadius: 16, padding: 11, backgroundColor: index === 0 ? 'rgba(118,240,219,.16)' : theme.cardAlt, borderWidth: 1, borderColor: theme.line }}><Text style={{ color: theme.accent, fontSize: 11, fontWeight: '800' }}>0{index + 1}</Text><Text style={{ color: theme.text, fontSize: 12, fontWeight: '700', marginTop: 7 }}>{item}</Text></View>)}
      </View>
      <Card>
        <Text style={{ color: theme.text, fontSize: 22, fontWeight: '800' }}>{step === 'ai' ? 'Choose your AI provider' : create ? 'Create your account' : 'Welcome back'}</Text>
        <Text style={ui.muted}>{step === 'ai' ? 'Your key is saved to your account and used for meal estimates and chat.' : create ? 'Tell us a little about yourself next. Your plan starts there.' : 'Sign in to continue your journey.'}</Text>
        {step === 'account' ? <>
          <Label>EMAIL</Label><Input value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" />
          <Label>PASSWORD</Label><Input value={password} onChangeText={setPassword} placeholder={create ? 'At least 10 characters' : 'Your password'} secureTextEntry autoCapitalize="none" autoComplete={create ? 'new-password' : 'current-password'} textContentType={create ? 'newPassword' : 'password'} onSubmitEditing={submit} />
        </> : <>
          <Label>AI PROVIDER</Label>
          <View style={{ flexDirection: 'row', gap: 8 }}>{([['openai', 'OpenAI'], ['claude', 'Claude'], ['gemini', 'Gemini']] as const).map(([value, label]) => <Pressable key={value} disabled={verifying} onPress={() => { setProvider(value); setApiKey(''); setTicket(''); setVerifiedKey(''); }} accessibilityRole="button" accessibilityState={{ selected: provider === value }} style={{ flex: 1, minHeight: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: provider === value ? theme.accent : theme.cardAlt }}><Text style={{ color: provider === value ? theme.ink : theme.text, fontWeight: '800' }}>{label}</Text></Pressable>)}</View>
          <Label>{provider.toUpperCase()} API KEY</Label><Input value={apiKey} editable={!verifying} onChangeText={(value) => { setApiKey(value); setTicket(''); setVerifiedKey(''); }} placeholder="Paste your API key" secureTextEntry autoCapitalize="none" autoCorrect={false} onSubmitEditing={() => { void verify(); }} />
          <Pressable onPress={() => { void verify(); }} disabled={verifying || busy} accessibilityRole="button" style={{ minHeight: 48, borderRadius: 13, backgroundColor: theme.cardAlt, justifyContent: 'center', alignItems: 'center' }}><View style={{ flexDirection: 'row', gap: 9, alignItems: 'center' }}>{verifying ? <ActivityIndicator color={theme.accent} /> : null}<Text style={{ color: theme.accent, fontWeight: '800' }}>{verifying ? 'Verifying your API key…' : ticket ? 'Verified successfully ✓' : 'Verify API key'}</Text></View></Pressable>
          <Text style={[ui.muted, { fontSize: 11 }]}>The key is sent to your Gym Buddy API server, encrypted there, and never shown again. Use a trusted connection.</Text>
        </>}
        {error ? <Text accessibilityRole="alert" style={{ color: theme.red, fontSize: 13 }}>{error}</Text> : null}
        <Pressable onPress={() => { void submit(); }} disabled={busy || verifying || (step === 'ai' && !ticket)} accessibilityRole="button" accessibilityState={{ disabled: busy || verifying || (step === 'ai' && !ticket), busy }} style={{ minHeight: 50, borderRadius: 13, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center', opacity: busy || verifying || (step === 'ai' && !ticket) ? .55 : 1 }}><Text style={{ color: theme.ink, fontSize: 14, fontWeight: '800' }}>{busy ? 'Connecting…' : step === 'account' ? 'Continue to AI setup' : create ? 'Create account' : 'Sign in'}</Text></Pressable>
        <Button secondary onPress={() => { if (step === 'ai') { setStep('account'); setApiKey(''); } else setCreate(!create); setError(''); }}>{step === 'ai' ? 'Back to account details' : create ? 'Already have an account? Sign in' : 'New here? Create an account'}</Button>
      </Card>
      <Text style={[ui.muted, { textAlign: 'center' }]}>Your health details are saved to your account after setup. Use a trusted connection when signing in.</Text>
  </Page>;
}
