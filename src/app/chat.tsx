import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/components/UI';
import { ChatAction, useAuth } from '@/lib/auth';
import { today, useStore } from '@/lib/store';
import { parseDay } from '@/lib/dates';
import { planTargets } from '@/lib/targets';
import type { AiPlan } from '@/lib/plan';
import { theme } from '@/lib/theme';

type Proposal = { action: ChatAction; oldValue: number; newValue: number; status: 'pending' | 'approved' | 'rejected' | 'stale' };
type Message = { role: 'user' | 'assistant'; content: string; proposal?: Proposal };

export default function Chat() {
  const auth = useAuth();
  const store = useStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [revising, setRevising] = useState(false);
  const [planMessage, setPlanMessage] = useState('');
  const [planPending, setPlanPending] = useState<{ plan: AiPlan; prior: AiPlan | null; ticket: string } | null>(null);
  const [error, setError] = useState('');
  const scroll = useRef<ScrollView>(null);
  const savedValue = (action: ChatAction) => action.kind === 'water' ? store.water[action.date] || 0
    : action.kind === 'steps' ? store.stepEntries.filter((entry) => entry.date === action.date).reduce((sum, entry) => sum + entry.count, 0)
      : store.weighIns.find((entry) => entry.date === action.date)?.kg || 0;
  const decide = (index: number, approve: boolean) => {
    if (busy) return;
    const proposal = messages[index]?.proposal;
    if (!proposal || proposal.status !== 'pending') return;
    const current = savedValue(proposal.action);
    if (approve && current === proposal.oldValue) {
      const { kind, date } = proposal.action;
      if (kind === 'water') store.setDayWater(date, proposal.newValue);
      else if (kind === 'steps') store.setDaySteps(date, proposal.newValue);
      else store.setDayWeight(date, proposal.newValue);
    }
    setMessages((old) => old.map((message, at) => at === index ? { ...message, proposal: { ...proposal, status: !approve ? 'rejected' : current === proposal.oldValue ? 'approved' : 'stale' } } : message));
  };
  const send = async () => {
    const content = draft.trim();
    if (!content || busy) return;
    const next: Message[] = [...messages, { role: 'user', content }];
    setMessages(next); setDraft(''); setError(''); setBusy(true);
    const date = today();
    const meals = store.meals.filter((x) => x.date === date);
    const workouts = store.workouts.filter((x) => x.date === date);
    const targets = planTargets(store.profile, store.weighIns[0]?.kg, auth.plan);
    const context = JSON.stringify({ date, goal: store.profile.goal, workoutLocation: store.profile.setting,
      allergies: store.profile.allergies, concerns: store.profile.concerns,
      todaysMeals: meals.map((x) => ({ name: x.name, calories: x.calories, protein: x.protein })),
      todaysWorkouts: workouts.map((x) => ({ name: x.name, minutes: x.minutes })),
      waterMl: store.water[date] || 0, steps: store.stepEntries.filter((x) => x.date === date).reduce((sum, x) => sum + x.count, 0),
      calorieGuide: targets?.calories, proteinGuide: targets?.protein, stepsGuide: auth.plan?.stepsTarget,
      weeklyPlan: auth.plan?.days.map((day) => ({ day: day.day, title: day.title, activities: day.activities })) });
    try {
      const result = await auth.chat(next.slice(-20).map(({ role, content }) => ({ role, content })), context.slice(0, 3000));
      const action = result.action;
      const valid = action && parseDay(action.date) && action.date <= today() &&
        (action.kind === 'water' ? Number.isInteger(action.value) && action.value > 0 && action.value <= 5000
          : action.kind === 'steps' ? Number.isInteger(action.value) && action.value > 0 && action.value <= 100000
            : action.value >= 25 && action.value <= 400);
      const oldValue = valid && action ? savedValue(action) : 0;
      const newValue = action?.mode === 'add' ? oldValue + action.value : action?.value || 0;
      const withinRange = action && newValue <= (action.kind === 'water' ? 5000 : action.kind === 'steps' ? 100000 : 400);
      const reply = valid && action && oldValue === newValue ? `${result.reply}\nThat value is already saved, so nothing changed.`
        : valid && !withinRange ? `${result.reply}\nThe proposed total is outside the supported range, so nothing changed.` : result.reply;
      setMessages([...next, { role: 'assistant', content: reply,
        ...(valid && withinRange && action && oldValue !== newValue ? { proposal: { action, oldValue, newValue, status: 'pending' as const } } : {}) }]);
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Chat is unavailable.'); }
    finally { setBusy(false); }
  };
  return <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top', 'bottom']}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: theme.line, gap: 12 }}>
        <Pressable onPress={() => router.replace('/(tabs)')} accessibilityRole="button" accessibilityLabel="Close chat" style={{ padding: 8 }}><Text style={{ color: theme.accent, fontSize: 16, fontWeight: '800' }}>‹ Back</Text></Pressable>
        <Icon name="chat" color={theme.accent} size={22} /><Text style={{ color: theme.text, fontSize: 20, fontWeight: '800' }}>Gym Buddy AI</Text>
      </View>
      <ScrollView ref={scroll} contentContainerStyle={{ padding: 18, gap: 12, flexGrow: 1 }} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })} keyboardShouldPersistTaps="handled">
        {messages.length === 0 ? <View style={{ marginTop: 20, gap: 8 }}><Text style={{ color: theme.text, fontSize: 24, fontWeight: '800' }}>What can I help with?</Text><Text style={{ color: theme.muted, lineHeight: 21 }}>Ask about your meals, training, or daily progress. I can use today’s logged details to give more relevant suggestions.</Text></View> : null}
        {messages.map((message, index) => <View key={index} style={{ alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%', backgroundColor: message.role === 'user' ? theme.accent : theme.card, borderRadius: 18, padding: 14, gap: 10 }}>
          <Text style={{ color: message.role === 'user' ? theme.ink : theme.text, fontSize: 14, lineHeight: 21 }}>{message.content}</Text>
          {message.proposal ? <View style={{ backgroundColor: theme.cardAlt, borderRadius: 12, padding: 12, gap: 8, borderWidth: 1, borderColor: theme.line }}>
            <Text style={{ color: theme.accent, fontWeight: '800' }}>Approve change · {message.proposal.action.date}</Text>
            <Text style={{ color: theme.text }}>{message.proposal.action.kind === 'water' ? 'Daily water total' : message.proposal.action.kind === 'steps' ? 'Daily steps total' : 'Weight'}: {message.proposal.oldValue || 'No entry'} → {message.proposal.newValue} {message.proposal.action.kind === 'water' ? 'ml' : message.proposal.action.kind === 'weight' ? 'kg' : 'steps'}</Text>
            <Text style={{ color: theme.muted, fontSize: 12 }}>Approval replaces the saved entries for this date with this value.</Text>
            {message.proposal.status === 'pending' ? <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable accessibilityRole="button" disabled={busy} onPress={() => decide(index, true)} style={{ backgroundColor: theme.accent, padding: 10, borderRadius: 10, opacity: busy ? .5 : 1 }}><Text style={{ color: theme.ink, fontWeight: '800' }}>Approve</Text></Pressable>
              <Pressable accessibilityRole="button" disabled={busy} onPress={() => decide(index, false)} style={{ backgroundColor: theme.card, padding: 10, borderRadius: 10, opacity: busy ? .5 : 1 }}><Text style={{ color: theme.text, fontWeight: '800' }}>Reject</Text></Pressable>
            </View> : <Text style={{ color: message.proposal.status === 'approved' ? theme.accent : theme.muted }}>{message.proposal.status === 'approved' ? 'Approved and saved' : message.proposal.status === 'stale' ? 'Saved value changed. Ask again to review a fresh proposal.' : 'Rejected. No change saved.'}</Text>}
          </View> : null}
        </View>)}
        {planPending ? <View style={{ padding: 12, borderRadius: 12, backgroundColor: theme.cardAlt, gap: 8, borderWidth: 1, borderColor: theme.line }}>
          <Text style={{ color: theme.accent, fontWeight: '800' }}>Approve weekly plan revision</Text>
          <Text style={{ color: theme.text, fontWeight: '700' }}>Current week</Text>
          <Text style={{ color: theme.muted }}>{planPending.prior?.summary || 'No saved plan'}</Text>
          {planPending.prior ? <Text style={{ color: theme.muted, fontSize: 12 }}>{planPending.prior.days.map((day) => `${day.day.slice(0, 3)}: ${day.title}`).join(' · ')}</Text> : null}
          <Text style={{ color: theme.text, fontWeight: '700' }}>Proposed week</Text>
          <Text style={{ color: theme.text }}>{planPending.plan.summary}</Text>
          <Text style={{ color: theme.muted, fontSize: 12 }}>Daily goals: {planPending.prior?.calorieTarget || 0} → {planPending.plan.calorieTarget} kcal · {planPending.prior?.proteinGrams || 0} → {planPending.plan.proteinGrams} g protein · {planPending.prior?.stepsTarget || 0} → {planPending.plan.stepsTarget} steps</Text>
          {planPending.plan.days.map((day) => <View key={day.day} style={{ borderTopWidth: 1, borderColor: theme.line, paddingTop: 6 }}><Text style={{ color: theme.text, fontWeight: '700' }}>{day.day}: {day.title}</Text><Text style={{ color: theme.muted, fontSize: 12 }}>{day.focus} · {day.activities.join(', ')}</Text></View>)}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable accessibilityRole="button" disabled={revising} onPress={async () => {
              setRevising(true); setPlanMessage('');
              try { await auth.approvePlan(planPending.ticket); setPlanMessage('Your weekly plan was updated. Open the Plan tab to review it.'); setPlanPending(null); }
              catch (cause) { setPlanMessage(cause instanceof Error ? cause.message : 'Could not update your plan.'); }
              finally { setRevising(false); }
            }} style={{ backgroundColor: theme.accent, padding: 10, borderRadius: 10 }}><Text style={{ color: theme.ink, fontWeight: '800' }}>{revising ? 'Updating…' : 'Approve'}</Text></Pressable>
            <Pressable accessibilityRole="button" disabled={revising} onPress={() => { setPlanPending(null); setPlanMessage('Plan change rejected.'); }} style={{ backgroundColor: theme.card, padding: 10, borderRadius: 10 }}><Text style={{ color: theme.text, fontWeight: '800' }}>Reject</Text></Pressable>
          </View>
        </View> : null}
        {busy ? <Text style={{ color: theme.muted }}>Thinking…</Text> : null}
        {error ? <Text accessibilityRole="alert" style={{ color: theme.red }}>{error}</Text> : null}
      </ScrollView>
      {messages.some((message) => message.role === 'user') && !planPending ? <Pressable onPress={async () => {
        if (revising || busy) return;
        setRevising(true); setPlanMessage('');
        try {
          const preview = await auth.previewPlan(messages.slice(-12).map(({ role, content }) => ({ role, content })), store.weighIns[0]?.kg);
          if (preview.ticket) setPlanPending({ plan: preview.plan, prior: auth.plan, ticket: preview.ticket });
          else setPlanMessage('Your plan already matches this request. Nothing was changed.');
        } catch (cause) { setPlanMessage(cause instanceof Error ? cause.message : 'Could not preview your plan.'); }
        finally { setRevising(false); }
      }} disabled={revising || busy} accessibilityRole="button" style={{ marginHorizontal: 12, marginBottom: 5, padding: 11, borderRadius: 12, backgroundColor: theme.cardAlt, alignItems: 'center', opacity: revising || busy ? .5 : 1 }}><Text style={{ color: theme.accent, fontWeight: '800' }}>{revising ? 'Preparing preview…' : 'Update my plan using this chat'}</Text></Pressable> : null}
      {planMessage ? <Text accessibilityRole="alert" style={{ color: theme.accent, paddingHorizontal: 16, paddingBottom: 5 }}>{planMessage}</Text> : null}
      <View style={{ flexDirection: 'row', padding: 12, gap: 8, borderTopWidth: 1, borderColor: theme.line, alignItems: 'flex-end' }}>
        <TextInput value={draft} onChangeText={setDraft} placeholder="Ask anything about your progress…" placeholderTextColor={theme.muted} multiline maxLength={2000} style={{ flex: 1, maxHeight: 110, minHeight: 48, borderRadius: 15, backgroundColor: theme.cardAlt, color: theme.text, paddingHorizontal: 14, paddingVertical: 12 }} />
        <Pressable onPress={() => { void send(); }} disabled={busy || !draft.trim()} accessibilityRole="button" accessibilityLabel="Send message" style={{ backgroundColor: theme.accent, borderRadius: 14, minHeight: 48, paddingHorizontal: 16, justifyContent: 'center', opacity: busy || !draft.trim() ? .5 : 1 }}><Text style={{ color: theme.ink, fontWeight: '800' }}>Send</Text></Pressable>
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
