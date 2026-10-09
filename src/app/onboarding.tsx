import { useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import BirthDatePicker from '@/components/BirthDatePicker';
import { Button, Card, Input, Label, Page, Title, ui } from '@/components/UI';
import { useAuth } from '@/lib/auth';
import { Profile, useStore } from '@/lib/store';
import { ageOnDate } from '@/lib/targets';
import { theme } from '@/lib/theme';

function Choice<T extends string | number>({ options, value, onChange }: { options: readonly (readonly [T, string])[]; value: T; onChange: (value: T) => void }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{options.map(([key, label]) =>
    <Pressable key={key} onPress={() => onChange(key)} accessibilityRole="button" accessibilityState={{ selected: value === key }} style={{ paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, backgroundColor: value === key ? theme.accent : theme.cardAlt, borderWidth: 1, borderColor: value === key ? theme.accent : theme.line }}><Text style={{ color: value === key ? theme.ink : theme.text, fontWeight: '800' }}>{label}</Text></Pressable>)}</View>;
}

export default function Onboarding() {
  const auth = useAuth();
  const store = useStore();
  const [profile, setProfile] = useState<Profile>(store.profile);
  const [weight, setWeight] = useState('');
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const showError = (message: string) => {
    setError(message);
    if (Platform.OS !== 'web') Alert.alert('Check your details', message);
  };
  const set = <K extends keyof Profile>(key: K, value: Profile[K]) => { setError(''); setProfile((old) => ({ ...old, [key]: value })); };
  const next = async () => {
    if (busy) return;
    Keyboard.dismiss();
    setError('');
    if (step === 0) {
      if (!profile.name.trim()) return showError('Enter your name.');
      if (ageOnDate(profile.dob) === null) return showError('Select a valid date of birth.');
      if (Number(profile.heightCm) < 100 || Number(profile.heightCm) > 250) return showError('Enter a height from 100 to 250 cm.');
      if (Number(weight) < 25 || Number(weight) > 400) return showError('Enter a weight from 25 to 400 kg.');
    }
    if (step < 2) { setStep(step + 1); return; }
    setBusy(true);
    try { await store.completeOnboarding({ ...profile, name: profile.name.trim(), weightKg: Number(weight), allergies: profile.allergies.trim(), concerns: profile.concerns.trim(), fitnessPlan: profile.fitnessPlan.trim() }); }
    catch (cause) { showError(cause instanceof Error ? cause.message : 'Could not save your details.'); }
    finally { setBusy(false); }
  };
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><Page key={step}>
    <View style={{ flexDirection: 'row', gap: 7 }}>{[0, 1, 2].map((index) => <View key={index} style={{ flex: 1, height: 5, borderRadius: 5, backgroundColor: index <= step ? theme.accent : theme.line }} />)}</View>
    <Title eyebrow={`SETUP · ${step + 1} OF 3`} subtitle={['The basics help us shape useful starting targets.', 'Choose the direction and training style that fits your life.', 'Share anything your plan should take into account.'][step]}>{['First, about you.', 'Your way to move.', 'Care that counts.'][step]}</Title>
    {step === 0 ? <Card>
      <Label>YOUR NAME</Label><Input value={profile.name} onChangeText={(value) => set('name', value)} placeholder="What should we call you?" autoComplete="name" />
      <Label>DATE OF BIRTH</Label><BirthDatePicker value={profile.dob} onChange={(value) => set('dob', value)} />
      <Label>HEIGHT (CM)</Label><Input value={profile.heightCm} onChangeText={(value) => set('heightCm', value)} keyboardType="decimal-pad" placeholder="e.g. 170" />
      <Label>CURRENT WEIGHT (KG)</Label><Input value={weight} onChangeText={(value) => { setError(''); setWeight(value); }} keyboardType="decimal-pad" placeholder="e.g. 70" />
      <Text style={ui.muted}>Your age updates from your birth date. Weight is used as a starting point and can be changed later.</Text>
    </Card> : null}
    {step === 1 ? <Card>
      <Label>YOUR MAIN GOAL</Label><Choice options={[["lose", "Lose weight"], ["gain", "Gain weight"], ["maintain", "Maintain"]] as const} value={profile.goal} onChange={(value) => set('goal', value)} />
      <Label>WHERE YOU TRAIN</Label><Choice options={[["gym", "Gym"], ["home", "Home"]] as const} value={profile.setting} onChange={(value) => set('setting', value)} />
      <Label>USUAL ACTIVITY</Label><Choice options={[["sedentary", "Mostly seated"], ["light", "Light"], ["moderate", "Moderate"], ["high", "Very active"]] as const} value={profile.activity} onChange={(value) => set('activity', value)} />
      <Label>HOW MANY DAYS CAN YOU TRAIN EACH WEEK?</Label>
      <Choice options={([1, 2, 3, 4, 5, 6, 7] as const).map((day) => [day, `${day}`] as const)} value={profile.daysPerWeek} onChange={(value) => set('daysPerWeek', value)} />
      <Text style={ui.muted}>We may recommend fewer hard sessions and include recovery days.</Text>
      <Label>PREFERRED PACE</Label><Choice options={[["light", "Light"], ["moderate", "Moderate"], ["aggressive", "Aggressive"]] as const} value={profile.pace} onChange={(value) => set('pace', value)} />
      <Text style={ui.muted}>Aggressive means a stronger, still bounded starting plan. It does not override health or recovery limits.</Text>
      <Label>YOUR FITNESS PLAN OR SCHEDULE</Label><Input value={profile.fitnessPlan} onChangeText={(value) => set('fitnessPlan', value)} placeholder="e.g. strength 3 days, walks on weekends" multiline style={{ minHeight: 76, textAlignVertical: 'top' }} />
      <Text style={ui.muted}>If you have a plan, describe its days and exercises. AI will organize it into a week. Leave blank to generate one.</Text>
    </Card> : null}
    {step === 2 ? <Card>
      <Label>ALLERGIES OR FOODS TO AVOID</Label><Input value={profile.allergies} onChangeText={(value) => set('allergies', value)} placeholder="Enter details, or leave blank" multiline />
      <Label>INJURIES, PAIN, OR OTHER CONCERNS</Label><Input value={profile.concerns} onChangeText={(value) => set('concerns', value)} placeholder="Enter details, or leave blank" multiline style={{ minHeight: 76, textAlignVertical: 'top' }} />
      <Label>METABOLIC EQUATION REFERENCE</Label><Choice options={[["female", "Female equation"], ["male", "Male equation"], ["", "Skip estimates"]] as const} value={profile.equation} onChange={(value) => set('equation', value)} />
      <Text style={ui.muted}>The published energy equation has two versions. Choose the one appropriate for your physiology, or skip. This is separate from gender identity.</Text>
      <Pressable onPress={() => set('nutritionCaution', !profile.nutritionCaution)} accessibilityRole="checkbox" accessibilityState={{ checked: profile.nutritionCaution }} style={{ padding: 14, borderRadius: 12, backgroundColor: theme.cardAlt }}><Text style={{ color: theme.text, fontWeight: '700' }}>{profile.nutritionCaution ? '☑' : '□'} Pregnancy, breastfeeding, or a condition needing a special diet</Text></Pressable>
      <Text style={ui.muted}>Automatic nutrition targets pause when special dietary care is selected. This plan does not diagnose or treat injuries or allergies.</Text>
    </Card> : null}
    {error ? <Text accessibilityRole="alert" style={{ color: theme.red }}>{error}</Text> : null}
    {busy ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><ActivityIndicator color={theme.accent} /><Text style={ui.muted}>Reviewing your details and building your weekly plan…</Text></View> : null}
    <Button onPress={next} disabled={busy}>{busy ? 'Building your plan…' : step === 2 ? 'Generate my plan' : 'Continue'}</Button>
    {step > 0 ? <Button secondary onPress={() => { if (!busy) { setError(''); setStep(step - 1); } }}>Back</Button> : <Button secondary onPress={() => { void auth.signOut(); }}>Sign out</Button>}
  </Page></KeyboardAvoidingView>;
}
