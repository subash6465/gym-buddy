import NutritionSettings, { conditionLabels } from '@/components/NutritionSettings';
import AccountPlanPreviewCard from '@/components/AccountPlanPreview';
import { validateNutritionProfile } from '@/shared/nutrition-profile.mjs';
import type { AccountPlanPreview } from '@/lib/auth';
import MacroBreakdown from '@/components/MacroBreakdown';
import { macroTotals } from '@/lib/macros';
import { formatDate } from '@/lib/dates';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, Text, View } from 'react-native';
import BirthDatePicker from '@/components/BirthDatePicker';
import { Button, Card, Disclosure, Input, Label, MotionPressable, Page, Row, Title, ui } from '@/components/UI';
import { Goal, Profile, today, useStore } from '@/lib/store';
import { ageOnDate, planTargets } from '@/lib/targets';
import { useClock } from '@/lib/clock';
import { theme } from '@/lib/theme';
import { AiProvider, useAuth } from '@/lib/auth';

function Choice<T extends string | number>({ options, value, onChange }: { options: readonly (readonly [T, string])[]; value: T; onChange: (value: T) => void }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{options.map(([option, label]) => <MotionPressable key={option} onPress={() => onChange(option)} accessibilityState={{ selected: value === option }} style={{ paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, backgroundColor: value === option ? theme.accent : theme.cardAlt }}><Text style={{ color: value === option ? theme.bg : theme.text, fontFamily: theme.font }}>{label}</Text></MotionPressable>)}</View>;
}
export default function ProfileScreen() {
  const store = useStore();
  const auth = useAuth();
  const { profile } = store;
  const [editing, setEditing] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [draft, setDraft] = useState<Profile>(profile);
  const [draftWeight, setDraftWeight] = useState('');
  const detailsVersion = useRef(0);
  const [preview, setPreview] = useState<AccountPlanPreview | null>(null);
  const nutritionDraft = (() => { try { return validateNutritionProfile(draft); } catch { return { healthConditions: draft.healthConditions, clinicianTargets: draft.clinicianTargets }; } })();
  const equalField = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  const normalizedDraft = { ...draft, ...nutritionDraft, name: draft.name.trim(), heightCm: draft.heightCm.trim(), allergies: draft.allergies.trim(), concerns: draft.concerns.trim(), fitnessPlan: profile.fitnessPlan, weightKg: Number(draftWeight) };
  const effectiveWeight = store.weighIns[0]?.kg || profile.weightKg;
  const hasProfileChanges = (Object.keys(profile) as (keyof Profile)[]).some((key) => key !== 'fitnessPlan' && key !== 'weightKg' && !equalField(normalizedDraft[key], profile[key])) || normalizedDraft.weightKg !== effectiveWeight;
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [aiProvider, setAiProvider] = useState<AiProvider>(auth.ai.provider || 'openai');
  const [aiKey, setAiKey] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiVerifying, setAiVerifying] = useState(false);
  const [aiTicket, setAiTicket] = useState('');
  const [aiVerifiedKey, setAiVerifiedKey] = useState('');
  const [aiMessage, setAiMessage] = useState('');
  const [disconnectError, setDisconnectError] = useState('');
  const [disconnecting, setDisconnecting] = useState(false);
  const disconnectAi = async () => {
    if (disconnecting || deletingAccount || aiBusy) return;
    setDisconnecting(true); setDisconnectError('');
    try { await auth.signOut(); }
    catch (error) { setDisconnectError(error instanceof Error ? error.message : 'Could not remove the saved key. Try again.'); }
    finally { setDisconnecting(false); }
  };
  const verifyAi = async () => {
    if (aiVerifying) return;
    setAiMessage(''); setAiTicket(''); setAiVerifying(true);
    try { setAiTicket(await auth.verifyAiKey(aiProvider, aiKey.trim())); setAiVerifiedKey(`${aiProvider}:${aiKey.trim()}`); setAiMessage('API key verified.'); }
    catch (error) { setAiMessage(error instanceof Error ? error.message : 'Could not verify this key.'); }
    finally { setAiVerifying(false); }
  };
  const saveAi = async () => {
    if (aiBusy || !aiTicket || aiVerifiedKey !== `${aiProvider}:${aiKey.trim()}`) return;
    setAiBusy(true); setAiMessage('');
    try { await auth.saveAiConfig(aiProvider, aiKey.trim(), aiTicket); setAiKey(''); setAiTicket(''); setAiMessage('AI provider saved.'); }
    catch (error) { setAiMessage(error instanceof Error ? error.message : 'Could not save AI provider.'); }
    finally { setAiBusy(false); }
  };
  const deleteAccount = async () => {
    if (deletingAccount) return;
    setDeletingAccount(true); setDeleteError('');
    try { await auth.deleteAccount(store.clearAccountData); }
    catch (error) { store.retryLoad(); setDeleteError(error instanceof Error ? error.message : 'Could not delete your device data.'); }
    finally { setDeletingAccount(false); }
  };
  const confirmDelete = () => {
    const message = 'Delete your data on this device? Your profile, AI key, and all logged data will be permanently deleted. This cannot be reversed.';
    if (Platform.OS === 'web') { if (window.confirm(message)) void deleteAccount(); }
    else Alert.alert('Delete device data?', message, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete data', style: 'destructive', onPress: () => { void deleteAccount(); } }]);
  };
  const startEdit = () => {
    const proceed = () => { setPreview(null); setDraft({ ...profile }); setDraftWeight(String(store.weighIns[0]?.kg || profile.weightKg)); setProfileError(''); setReviewing(false); setEditing(true); };
    const message = 'Changing your profile or goals will change future targets, coaching, and your weekly plan. Your past entries and saved reviews will remain as recorded.';
    if (Platform.OS === 'web') { if (window.confirm(message)) proceed(); }
    else Alert.alert('Edit your direction?', message, [{ text: 'Cancel', style: 'cancel' }, { text: 'Continue', onPress: proceed }]);
  };
  const setDraftField = <K extends keyof Profile>(key: K, value: Profile[K]) => { detailsVersion.current++; setProfileError(''); setReviewing(false); setPreview(null); setDraft((old) => ({ ...old, [key]: value })); };
  const reviewChanges = () => {
    try { validateNutritionProfile(draft); } catch (cause) { setProfileError(cause instanceof Error ? cause.message : 'Check your clinician targets.'); return; }
    const kg = Number(draftWeight);
    if (!draft.name.trim() || ageOnDate(draft.dob) === null || !Number.isFinite(Number(draft.heightCm)) || Number(draft.heightCm) < 100 || Number(draft.heightCm) > 250 || !Number.isFinite(kg) || kg < 25 || kg > 400) {
      setProfileError('Check your name, birth date, height (100–250 cm), and current weight (25–400 kg).'); return;
    }
    setProfileError(''); setReviewing(true);
  };
  const saveAndRecompute = async () => {
    if (profileBusy) return;
    if (!hasProfileChanges) { setEditing(false); setReviewing(false); return; }
    setProfileBusy(true); setProfileError('');
    const next = normalizedDraft;
    try {
      if (!preview) { const revision = detailsVersion.current; const proposed = await auth.previewAccountPlan(next, false); if (revision !== detailsVersion.current) throw new Error('Your details changed while the preview was prepared. Generate a new preview.'); setPreview(proposed); return; }
      const approved = await auth.approveAccountPlan(preview.ticket, false);
      store.replaceProfile(approved);
      if (store.weighIns[0]?.kg !== approved.weightKg) store.addWeighIn(today(), approved.weightKg);
      setEditing(false); setReviewing(false);
    } catch (error) { if (preview) setPreview(null); setProfileError(error instanceof Error ? error.message : 'Could not rebuild your plan. Your changes were not saved.'); }
    finally { setProfileBusy(false); }
  };
  const now = useClock();
  const latest = store.weighIns[0];
  const age = ageOnDate(profile.dob, now);
  const targets = planTargets(profile, latest?.kg, auth.plan, now);
  const height = Number(profile.heightCm);
  const bmi = latest && height > 0 ? latest.kg / ((height / 100) ** 2) : null;
  const changedFields = (Object.keys(profile) as (keyof Profile)[]).filter((key) => key !== 'weightKg' && key !== 'fitnessPlan' && !equalField(normalizedDraft[key], profile[key]));
  if (normalizedDraft.weightKg !== (latest?.kg || profile.weightKg)) changedFields.push('weightKg');
  return <Page>
    <Title eyebrow="YOUR SPACE" subtitle="Your goals, preferences, and personal settings.">Profile</Title>
    <Card style={{ backgroundColor: theme.hero, borderColor: theme.heroLine }}><Row><View style={{ width: 60, height: 60, borderRadius: 20, backgroundColor: theme.accentSoft, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: theme.accent, fontSize: 25, fontFamily: theme.font }}>{profile.name.slice(0, 1).toUpperCase()}</Text></View><View style={{ flex: 1, gap: 4 }}><Text style={{ color: theme.text, fontSize: 24, fontFamily: theme.font }}>{profile.name}</Text><Text style={ui.muted}>{auth.user.email}</Text></View></Row><Row>{[[latest ? `${latest.kg} kg` : '—', 'WEIGHT'], [`${profile.daysPerWeek} days`, 'TRAINING / WEEK'], [profile.goal === 'lose' ? 'Lose' : profile.goal === 'gain' ? 'Gain' : 'Maintain', 'DIRECTION']].map(([value, label]) => <View key={label} style={{ flex: 1, gap: 5 }}><Text style={{ color: theme.text, fontSize: 17, fontFamily: theme.font }}>{value}</Text><Text style={{ color: theme.muted, fontSize: 8, letterSpacing: .5 }}>{label}</Text></View>)}</Row></Card>
    {!editing ? <Disclosure title="Personal details & goals" subtitle="Measurements, training preferences & health context">
      {([
        ['Name', profile.name], ['Date of birth', formatDate(profile.dob)], ['Age today', age === null ? '—' : `${age} years`], ['Height', `${profile.heightCm} cm`],
        ['Latest weight', latest ? `${latest.kg} kg${bmi ? ` · BMI ${bmi.toFixed(1)}` : ''}` : 'No weigh-in'],
        ['Goal', profile.goal], ['Training location', profile.setting], ['Usual activity', profile.activity], ['Training days', `${profile.daysPerWeek} per week`],
        ['Pace', profile.pace], ['Equation reference', profile.equation || 'Skipped'], ['Special dietary care', profile.nutritionCaution ? 'Yes' : 'No'],
        ['Health conditions', profile.healthConditions?.map((condition) => conditionLabels[condition]).join(', ') || 'None selected'], ['Clinician targets', Object.entries(profile.clinicianTargets || {}).map(([key, value]) => `${key}: ${value}`).join(' / ') || 'Not supplied'],
        ['Allergies or foods to avoid', profile.allergies || 'Not entered'], ['Concerns', profile.concerns || 'Not entered'],
      ] as const).map(([label, value]) => <View key={label} style={{ borderTopWidth: 1, borderColor: theme.line, paddingTop: 9 }}><Label>{label.toUpperCase()}</Label><Text style={{ color: theme.text, marginTop: 3 }}>{value}</Text></View>)}
      <Button secondary onPress={startEdit}>Edit profile and goals</Button>
    </Disclosure> : <Card><Text style={{ color: theme.text, fontSize: 20, fontFamily: theme.font }}>Edit all preferences</Text>
      <Text style={ui.muted}>Review every field before saving. The plan will be rebuilt from these details.</Text>
      <Label>NAME</Label><Input value={draft.name} onChangeText={(value) => setDraftField('name', value)} />
      <Label>DATE OF BIRTH</Label><BirthDatePicker value={draft.dob} onChange={(value) => setDraftField('dob', value)} />
      <Label>HEIGHT (CM)</Label><Input value={draft.heightCm} onChangeText={(value) => setDraftField('heightCm', value)} keyboardType="decimal-pad" />
      <Label>CURRENT WEIGHT (KG)</Label><Input value={draftWeight} onChangeText={(value) => { detailsVersion.current++; setDraftWeight(value); setPreview(null); setReviewing(false); }} keyboardType="decimal-pad" />
      <Label>GOAL</Label><Choice options={[["lose", "Lose weight"], ["gain", "Gain weight"], ["maintain", "Maintain"]] as const} value={draft.goal} onChange={(value: Goal) => setDraftField('goal', value)} />
      <Label>WORKOUT LOCATION</Label><Choice options={[["gym", "Gym"], ["home", "Home"]] as const} value={draft.setting} onChange={(value) => setDraftField('setting', value)} />
      <Label>USUAL ACTIVITY</Label><Choice options={[["sedentary", "Mostly seated"], ["light", "Light"], ["moderate", "Moderate"], ["high", "Very active"]] as const} value={draft.activity} onChange={(value) => setDraftField('activity', value)} />
      <Label>TRAINING DAYS PER WEEK</Label><Choice options={([1, 2, 3, 4, 5, 6, 7] as const).map((day) => [day, String(day)] as const)} value={draft.daysPerWeek} onChange={(value) => setDraftField('daysPerWeek', value)} />
      <Label>PACE</Label><Choice options={[["light", "Light"], ["moderate", "Moderate"], ["aggressive", "Aggressive"]] as const} value={draft.pace} onChange={(value) => setDraftField('pace', value)} />
      <Label>METABOLIC EQUATION REFERENCE</Label><Choice options={[["female", "Female equation"], ["male", "Male equation"], ["", "Skip"]] as const} value={draft.equation} onChange={(value) => setDraftField('equation', value)} />
      <Pressable onPress={() => setDraftField('nutritionCaution', !draft.nutritionCaution)} accessibilityRole="checkbox" accessibilityState={{ checked: draft.nutritionCaution }} style={{ padding: 14, backgroundColor: theme.cardAlt, borderRadius: 12 }}><Text style={{ color: theme.text }}>{draft.nutritionCaution ? '☑' : '□'} Pregnancy, breastfeeding, or a condition needing a special diet</Text></Pressable>
      <NutritionSettings profile={draft} onChange={(updates) => { detailsVersion.current++; setDraft((old) => ({ ...old, ...updates })); setPreview(null); setReviewing(false); setProfileError(''); }} />
      <Label>ALLERGIES OR FOODS TO AVOID</Label><Input value={draft.allergies} onChangeText={(value) => setDraftField('allergies', value)} multiline />
      <Label>INJURIES, PAIN OR OTHER CONCERNS</Label><Input value={draft.concerns} onChangeText={(value) => setDraftField('concerns', value)} multiline />
      {preview ? <AccountPlanPreviewCard plan={preview.plan} /> : null}
      {profileError ? <Text accessibilityRole="alert" style={{ color: theme.red }}>{profileError}</Text> : null}
      {!reviewing ? hasProfileChanges ? <Button onPress={reviewChanges}>Review changes</Button> : <Button secondary onPress={() => setEditing(false)}>Done · no changes</Button> : <><Text style={{ color: theme.text, fontFamily: theme.font }}>Changes to save: {changedFields.length ? changedFields.join(', ') : 'No fields changed'}</Text><Text style={ui.muted}>Generate an AI preview, review the validated guides, then approve to update your profile and plan together. Previous logs and reviews stay in their original periods.</Text><Button disabled={profileBusy || !changedFields.length} onPress={() => { void saveAndRecompute(); }}>{profileBusy ? 'Preparing…' : preview ? 'Approve and save profile & plan' : 'Generate plan preview'}</Button></>}
      <Button secondary disabled={profileBusy} onPress={() => { setEditing(false); setReviewing(false); }}>Cancel without saving</Button>
    </Card>}
<Disclosure title="Your daily guides" subtitle={targets ? `${targets.calories.toLocaleString()} kcal / Nutrition & hydration estimates` : 'Personal estimates are paused'}>
      {targets ? <><Text style={{ color: theme.text, fontSize: 27, fontFamily: theme.font }}>{targets.calories} kcal</Text><Text style={{ color: theme.text, fontSize: 18, fontWeight: '700' }}>{targets.protein > 0 ? `${targets.protein} g protein` : 'Protein guide needed'} / {targets.water > 0 ? `${targets.water} ml drinks` : 'Drink guide needed'}</Text><MacroBreakdown amounts={macroTotals(store.meals.filter((meal) => meal.date === today(now)))} targets={targets} />{targets.maintenance > 0 ? <Text style={ui.muted}>Estimated maintenance: {targets.maintenance} kcal. Goal adjustment: {profile.goal === 'lose' ? 'about −300 kcal' : profile.goal === 'gain' ? 'about +200 kcal' : 'none'}. Protein guide: {targets.proteinFactor} g/kg.</Text> : <Text style={ui.muted}>Clinician-provided guides entered by you.</Text>}<Text style={ui.muted}>Water is a starting drinks target; food also supplies water. Heat, exercise, illness and medical conditions can change your needs. These are estimates, not prescriptions.</Text></> : <><MacroBreakdown amounts={macroTotals(store.meals.filter((meal) => meal.date === today(now)))} targets={targets} /><Text style={ui.muted}>Enter a valid birth date (age 20+), height, current weight, and equation reference to see estimates. Automatic targets are paused when special dietary care is selected or when weight loss is selected at a low BMI. Add clinician-provided values in Personal details & goals.</Text></>}
    </Disclosure>
    <Disclosure title="AI coach settings" subtitle={`Connected to ${auth.ai.provider?.toUpperCase() || 'your provider'}`}>
      <Text style={ui.muted}>Current: {auth.ai.configured ? auth.ai.provider?.toUpperCase() : 'Not configured'}. A new key replaces the saved key on this device.</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>{([['openai', 'OpenAI'], ['claude', 'Claude'], ['gemini', 'Gemini']] as const).map(([value, label]) => <Pressable key={value} disabled={aiVerifying} onPress={() => { setAiProvider(value); setAiKey(''); setAiTicket(''); }} accessibilityRole="button" accessibilityState={{ selected: aiProvider === value }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 42, borderRadius: 12, backgroundColor: aiProvider === value ? theme.accent : theme.cardAlt }}><Text style={{ color: aiProvider === value ? theme.ink : theme.text, fontFamily: theme.font }}>{label}</Text></Pressable>)}</View>
      <Label>NEW API KEY</Label><Input value={aiKey} editable={!aiVerifying} onChangeText={(value) => { setAiKey(value); setAiTicket(''); }} secureTextEntry autoCapitalize="none" autoCorrect={false} placeholder="Paste a new API key" />
      <Pressable onPress={() => { void verifyAi(); }} disabled={aiVerifying || aiBusy || aiKey.trim().length < 10} accessibilityRole="button" style={{ minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.cardAlt }}><View style={{ flexDirection: 'row', gap: 8 }}>{aiVerifying ? <ActivityIndicator color={theme.accent} /> : null}<Text style={{ color: theme.accent, fontFamily: theme.font }}>{aiVerifying ? 'Verifying…' : aiTicket ? 'Verified ✓' : 'Verify API key'}</Text></View></Pressable>
      {aiMessage ? <Text accessibilityRole="alert" style={{ color: aiMessage === 'AI provider saved.' ? theme.accent : theme.red }}>{aiMessage}</Text> : null}
      <Button disabled={aiBusy || aiVerifying || !aiTicket} onPress={() => { void saveAi(); }}>{aiBusy ? 'Saving…' : 'Save AI provider'}</Button>
    </Disclosure>
    <Button secondary disabled={disconnecting || deletingAccount || aiBusy} onPress={() => { void disconnectAi(); }}>{disconnecting ? 'Disconnecting...' : 'Disconnect AI key'}</Button>
    {disconnectError ? <Text accessibilityRole="alert" style={{ color: theme.red }}>{disconnectError}</Text> : null}
    <Disclosure title="Delete device data" subtitle="Permanently remove data from this device">
      <Text style={ui.muted}>Permanently removes your AI key, profile, plans, reviews, and activity saved on this device.</Text>
      {deleteError ? <Text accessibilityRole="alert" style={{ color: theme.red }}>{deleteError}</Text> : null}
      <Button secondary disabled={deletingAccount} onPress={confirmDelete}>{deletingAccount ? 'Deleting data…' : 'Delete device data'}</Button>
    </Disclosure>
  </Page>;
}
