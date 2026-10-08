import { useState } from 'react';
import { Alert, Keyboard, KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { Button, Card, Input, Label, Page, Title, ui } from '@/components/UI';
import { useAuth } from '@/lib/auth';
import { theme } from '@/lib/theme';

export default function Welcome() {
  const auth = useAuth();
  const [create, setCreate] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const showError = (message: string) => {
    setError(message);
    if (Platform.OS !== 'web') Alert.alert('Account setup', message);
  };
  const submit = async () => {
    if (busy) return;
    Keyboard.dismiss();
    setError('');
    if (!email.trim() || !password) { showError('Enter your email and password.'); return; }
    setBusy(true);
    try { await auth.signIn(email, password, create); }
    catch (cause) { showError(cause instanceof Error ? cause.message : 'Could not sign in.'); }
    finally { setBusy(false); }
  };
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <Page>
      <Title eyebrow="YOUR STRONGER START" subtitle="A simple place to plan, move, and keep track of what matters to you.">Make progress feel personal.</Title>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {['Build your plan', 'Track each day', 'Find your rhythm'].map((item, index) => <View key={item} style={{ flex: 1, minHeight: 75, borderRadius: 16, padding: 11, backgroundColor: index === 0 ? 'rgba(118,240,219,.16)' : theme.cardAlt, borderWidth: 1, borderColor: theme.line }}><Text style={{ color: theme.accent, fontSize: 11, fontWeight: '800' }}>0{index + 1}</Text><Text style={{ color: theme.text, fontSize: 12, fontWeight: '700', marginTop: 7 }}>{item}</Text></View>)}
      </View>
      <Card>
        <Text style={{ color: theme.text, fontSize: 22, fontWeight: '800' }}>{create ? 'Create your account' : 'Welcome back'}</Text>
        <Text style={ui.muted}>{create ? 'Tell us a little about yourself next. Your plan starts there.' : 'Sign in to continue your journey.'}</Text>
        <Label>EMAIL</Label><Input value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" />
        <Label>PASSWORD</Label><Input value={password} onChangeText={setPassword} placeholder={create ? 'At least 10 characters' : 'Your password'} secureTextEntry autoCapitalize="none" autoComplete={create ? 'new-password' : 'current-password'} textContentType={create ? 'newPassword' : 'password'} onSubmitEditing={submit} />
        {error ? <Text accessibilityRole="alert" style={{ color: theme.red, fontSize: 13 }}>{error}</Text> : null}
        <Pressable onPress={() => { void submit(); }} disabled={busy} accessibilityRole="button" accessibilityState={{ disabled: busy, busy }} style={{ minHeight: 50, borderRadius: 13, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center', opacity: busy ? .55 : 1 }}><Text style={{ color: theme.ink, fontSize: 14, fontWeight: '800' }}>{busy ? 'Connecting…' : create ? 'Create account' : 'Sign in'}</Text></Pressable>
        <Button secondary onPress={() => { setCreate(!create); setError(''); }}>{create ? 'Already have an account? Sign in' : 'New here? Create an account'}</Button>
      </Card>
      <Text style={[ui.muted, { textAlign: 'center' }]}>Your health details are saved to your account after setup. Use a trusted connection when signing in.</Text>
    </Page>
  </KeyboardAvoidingView>;
}
