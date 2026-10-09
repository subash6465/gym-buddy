import { useState } from 'react';
import { Alert, Platform, Pressable, Text, View } from 'react-native';
import BirthDatePicker from '@/components/BirthDatePicker';
import { Button, Card, Input, Label, MotionPressable, Page, Reveal, Row, Title, ui } from '@/components/UI';
import { Goal, useStore } from '@/lib/store';
import { ageOnDate, suggestedTargets } from '@/lib/targets';
import { useClock } from '@/lib/clock';
import { theme } from '@/lib/theme';
import { AiProvider, useAuth } from '@/lib/auth';

function Choice<T extends string>({ options, value, onChange }: { options: readonly (readonly [T, string])[]; value: T; onChange: (value: T) => void }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{options.map(([option, label]) => <MotionPressable key={option} onPress={() => onChange(option)} accessibilityState={{ selected: value === option }} style={{ paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, backgroundColor: value === option ? theme.accent : theme.cardAlt }}><Text style={{ color: value === option ? theme.bg : theme.text, fontWeight: '800' }}>{label}</Text></MotionPressable>)}</View>;
}
export default function ProfileScreen() {
  const store = useStore();
  const auth = useAuth();
  const { profile } = store;
  const [showHistory, setShowHistory] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [aiProvider, setAiProvider] = useState<AiProvider>(auth.ai.provider || 'openai');
  const [aiKey, setAiKey] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const saveAi = async () => {
    if (aiBusy) return;
    setAiBusy(true); setAiMessage('');
    try { await auth.saveAiConfig(aiProvider, aiKey.trim()); setAiKey(''); setAiMessage('AI provider saved.'); }
    catch (error) { setAiMessage(error instanceof Error ? error.message : 'Could not save AI provider.'); }
    finally { setAiBusy(false); }
  };
  const deleteAccount = async () => {
    if (deletingAccount) return;
    setDeletingAccount(true); setDeleteError('');
    try { await auth.deleteAccount(store.clearAccountData); }
    catch (error) { setDeleteError(error instanceof Error ? error.message : 'Could not delete your account.'); }
    finally { setDeletingAccount(false); }
  };
  const confirmDelete = () => {
    const message = 'Are you sure you want to delete your account? Your login, profile, and all logged data will be permanently deleted. This cannot be reversed.';
    if (Platform.OS === 'web') { if (window.confirm(message)) void deleteAccount(); }
    else Alert.alert('Delete account?', message, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete account', style: 'destructive', onPress: () => { void deleteAccount(); } }]);
  };
  const now = useClock();
  const latest = store.weighIns[0];
  const age = ageOnDate(profile.dob, now);
  const targets = suggestedTargets(profile, latest?.kg, now);
  const height = Number(profile.heightCm);
  const bmi = latest && height > 0 ? latest.kg / ((height / 100) ** 2) : null;
  return <Page>
    <Title eyebrow="YOUR JOURNEY" subtitle={`Signed in as ${auth.user.email}. Your profile is saved to your account.`}>Made for your goals.</Title>
    {store.profileSyncError ? <Card><Text style={{ color: theme.red }}>Profile changes have not synced: {store.profileSyncError}</Text><Button secondary onPress={() => store.syncProfile().catch(() => {})}>Try saving again</Button></Card> : null}
    <Card><Text style={{ color: theme.text, fontSize: 20, fontWeight: '800' }}>About you</Text>
      <Label>NAME</Label><Input value={profile.name} onChangeText={(name) => store.updateProfile({ name })} placeholder="Your name" />
      <Label>DATE OF BIRTH</Label><BirthDatePicker value={profile.dob} onChange={(dob) => store.updateProfile({ dob })} />
      <Text style={ui.muted}>{age === null ? 'Select your birth date; your age will update automatically.' : `Age today: ${age} years. This updates on each birthday.`}</Text>
      <Label>HEIGHT (CM)</Label><Input value={profile.heightCm} onChangeText={(heightCm) => store.updateProfile({ heightCm })} keyboardType="decimal-pad" placeholder="Centimetres" />
      {latest ? <Text style={ui.muted}>Latest weight: {latest.kg} kg{bmi ? ` · BMI ${bmi.toFixed(1)}` : ''}. BMI is a screening measure, not a calorie calculator.</Text> : <Text style={ui.muted}>Log your current weight on the Log tab to calculate suggested targets.</Text>}
    </Card>
    <Card><Text style={{ color: theme.text, fontSize: 20, fontWeight: '800' }}>Your direction</Text>
      <Label>GOAL</Label><Choice options={[["lose", "Lose weight"], ["gain", "Gain weight"], ["maintain", "Maintain"]] as const} value={profile.goal} onChange={(goal: Goal) => store.updateProfile({ goal })} />
      <Label>WORKOUT LOCATION</Label><Choice options={[["gym", "Gym"], ["home", "Home"]] as const} value={profile.setting} onChange={(setting) => store.updateProfile({ setting })} />
      <Label>USUAL ACTIVITY</Label><Choice options={[["sedentary", "Mostly seated"], ["light", "Light"], ["moderate", "Moderate"], ["high", "Very active"]] as const} value={profile.activity} onChange={(activity) => store.updateProfile({ activity })} />
      <Text style={ui.muted}>Include your usual exercise when choosing an activity level. The estimate changes as your activity changes.</Text>
      <Label>METABOLIC EQUATION REFERENCE</Label><Choice options={[["female", "Female equation"], ["male", "Male equation"], ["", "Skip"]] as const} value={profile.equation} onChange={(equation) => store.updateProfile({ equation })} />
      <Text style={ui.muted}>The published equation has female and male versions. Choose the one appropriate for your physiology or skip automatic estimates. This is separate from gender identity.</Text>
      <Pressable onPress={() => store.updateProfile({ nutritionCaution: !profile.nutritionCaution })} style={{ padding: 14, backgroundColor: profile.nutritionCaution ? '#493A31' : theme.cardAlt, borderRadius: 12 }}><Text style={{ color: theme.text, fontWeight: '700' }}>{profile.nutritionCaution ? '☑' : '□'} Pregnancy, breastfeeding, or a condition needing a special diet</Text></Pressable>
    </Card>
    <Card style={{ backgroundColor: 'rgba(45,104,106,0.28)', borderColor: 'rgba(118,240,219,0.3)' }}><Text style={{ color: theme.accent, fontWeight: '800' }}>SUGGESTED DAILY TARGETS</Text>
      {targets ? <><Text style={{ color: theme.text, fontSize: 27, fontWeight: '800' }}>{targets.calories} kcal</Text><Text style={{ color: theme.text, fontSize: 18, fontWeight: '700' }}>{targets.protein} g protein · {targets.water} ml drinks</Text><Text style={ui.muted}>Estimated maintenance: {targets.maintenance} kcal. Goal adjustment: {profile.goal === 'lose' ? 'about −300 kcal' : profile.goal === 'gain' ? 'about +200 kcal' : 'none'}. Protein guide: {targets.proteinFactor} g/kg.</Text><Text style={ui.muted}>Water is a starting drinks target; food also supplies water. Heat, exercise, illness and medical conditions can change your needs. These are estimates, not prescriptions.</Text></> : <Text style={ui.muted}>Enter a valid birth date (age 20+), height, current weight, and equation reference to see estimates. Automatic targets are paused when special dietary care is selected or when weight loss is selected at a low BMI.</Text>}
    </Card>
    <Card><Text style={{ color: theme.text, fontSize: 20, fontWeight: '800' }}>Preferences & care</Text><Label>YOUR FITNESS PLAN OR SCHEDULE</Label><Input value={profile.fitnessPlan} onChangeText={(fitnessPlan) => store.updateProfile({ fitnessPlan })} placeholder="Your training rhythm" multiline /><Label>ALLERGIES OR FOODS TO AVOID</Label><Input value={profile.allergies} onChangeText={(allergies) => store.updateProfile({ allergies })} placeholder="e.g. peanuts, dairy" multiline /><Label>INJURIES, PAIN OR OTHER CONCERNS</Label><Input value={profile.concerns} onChangeText={(concerns) => store.updateProfile({ concerns })} placeholder="Anything your plan should consider" multiline style={{ minHeight: 72, textAlignVertical: 'top' }} /><Text style={ui.muted}>Seek qualified guidance for injuries, symptoms, or dietary restrictions needing medical care.</Text></Card>
    <Card><Text style={{ color: theme.text, fontSize: 20, fontWeight: '800' }}>AI provider</Text>
      <Text style={ui.muted}>Current: {auth.ai.configured ? auth.ai.provider?.toUpperCase() : 'Not configured'}. A new key replaces the saved key for this account.</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>{([['openai', 'OpenAI'], ['claude', 'Claude'], ['gemini', 'Gemini']] as const).map(([value, label]) => <Pressable key={value} onPress={() => { setAiProvider(value); setAiKey(''); }} accessibilityRole="button" accessibilityState={{ selected: aiProvider === value }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 42, borderRadius: 12, backgroundColor: aiProvider === value ? theme.accent : theme.cardAlt }}><Text style={{ color: aiProvider === value ? theme.ink : theme.text, fontWeight: '800' }}>{label}</Text></Pressable>)}</View>
      <Label>NEW API KEY</Label><Input value={aiKey} onChangeText={setAiKey} secureTextEntry autoCapitalize="none" autoCorrect={false} placeholder="Paste a new API key" />
      {aiMessage ? <Text accessibilityRole="alert" style={{ color: aiMessage === 'AI provider saved.' ? theme.accent : theme.red }}>{aiMessage}</Text> : null}
      <Button disabled={aiBusy || aiKey.trim().length < 10} onPress={() => { void saveAi(); }}>{aiBusy ? 'Saving…' : 'Save AI provider'}</Button>
    </Card>
    <Button secondary onPress={() => auth.signOut()}>Sign out</Button>
    <Card><Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>Delete account</Text>
      <Text style={ui.muted}>Permanently removes your login, profile, and activity saved on this device.</Text>
      {deleteError ? <Text accessibilityRole="alert" style={{ color: theme.red }}>{deleteError}</Text> : null}
      <Button secondary disabled={deletingAccount} onPress={confirmDelete}>{deletingAccount ? 'Deleting account…' : 'Delete my account'}</Button>
    </Card>
    <Button secondary onPress={() => setShowHistory(!showHistory)}>{showHistory ? 'Hide' : 'Show'} log history</Button>
    {showHistory && <Reveal><Card><Text style={{ color: theme.text, fontSize: 20, fontWeight: '800' }}>Log history</Text>
      {store.meals.length + store.workouts.length + store.weighIns.length === 0 ? <Text style={ui.muted}>No entries yet.</Text> : null}
      {store.meals.map((meal) => <Row key={meal.id}><View style={{ flex: 1 }}><Text style={{ color: theme.text, fontWeight: '700' }}>{meal.name}</Text><Text style={ui.muted}>{meal.date} · {meal.time} · {meal.type} · {meal.calories} kcal</Text></View><Pressable onPress={() => Alert.alert('Delete meal?', meal.name, [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: () => store.removeMeal(meal.id) }])}><Text style={{ color: theme.red }}>Delete</Text></Pressable></Row>)}
      {store.workouts.map((workout) => <Row key={workout.id}><View style={{ flex: 1 }}><Text style={{ color: theme.text, fontWeight: '700' }}>{workout.name}</Text><Text style={ui.muted}>{workout.date} · {workout.minutes} min</Text></View><Pressable onPress={() => Alert.alert('Delete workout?', workout.name, [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: () => store.removeWorkout(workout.id) }])}><Text style={{ color: theme.red }}>Delete</Text></Pressable></Row>)}
      {store.weighIns.map((entry) => <Text key={entry.id} style={ui.muted}>{entry.date} · {entry.kg} kg</Text>)}
    </Card></Reveal>}
  </Page>;
}
