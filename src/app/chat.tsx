import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/components/UI';
import { useAuth } from '@/lib/auth';
import { today, useStore } from '@/lib/store';
import { planTargets } from '@/lib/targets';
import { theme } from '@/lib/theme';

type Message = { role: 'user' | 'assistant'; content: string };

export default function Chat() {
  const auth = useAuth();
  const store = useStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [revising, setRevising] = useState(false);
  const [planMessage, setPlanMessage] = useState('');
  const [error, setError] = useState('');
  const scroll = useRef<ScrollView>(null);
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
      fitnessPlan: store.profile.fitnessPlan, allergies: store.profile.allergies, concerns: store.profile.concerns,
      todaysMeals: meals.map((x) => ({ name: x.name, calories: x.calories, protein: x.protein })),
      todaysWorkouts: workouts.map((x) => ({ name: x.name, minutes: x.minutes })),
      waterMl: store.water[date] || 0, steps: store.stepEntries.filter((x) => x.date === date).reduce((sum, x) => sum + x.count, 0),
      calorieGuide: targets?.calories, proteinGuide: targets?.protein, stepsGuide: auth.plan?.stepsTarget,
      weeklyPlan: auth.plan?.days.map((day) => ({ day: day.day, title: day.title, activities: day.activities })) });
    try { setMessages([...next, { role: 'assistant', content: await auth.chat(next.slice(-20), context.slice(0, 3000)) }]); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Chat is unavailable.'); }
    finally { setBusy(false); }
  };
  return <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top', 'bottom']}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: theme.line, gap: 12 }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Close chat" style={{ padding: 8 }}><Text style={{ color: theme.accent, fontSize: 16, fontWeight: '800' }}>‹ Back</Text></Pressable>
        <Icon name="chat" color={theme.accent} size={22} /><Text style={{ color: theme.text, fontSize: 20, fontWeight: '800' }}>Gym Buddy AI</Text>
      </View>
      <ScrollView ref={scroll} contentContainerStyle={{ padding: 18, gap: 12, flexGrow: 1 }} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })} keyboardShouldPersistTaps="handled">
        {messages.length === 0 ? <View style={{ marginTop: 20, gap: 8 }}><Text style={{ color: theme.text, fontSize: 24, fontWeight: '800' }}>What can I help with?</Text><Text style={{ color: theme.muted, lineHeight: 21 }}>Ask about your meals, training, or daily progress. I can use today’s logged details to give more relevant suggestions.</Text></View> : null}
        {messages.map((message, index) => <View key={index} style={{ alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%', backgroundColor: message.role === 'user' ? theme.accent : theme.card, borderRadius: 18, padding: 14 }}><Text style={{ color: message.role === 'user' ? theme.ink : theme.text, fontSize: 14, lineHeight: 21 }}>{message.content}</Text></View>)}
        {busy ? <Text style={{ color: theme.muted }}>Thinking…</Text> : null}
        {error ? <Text accessibilityRole="alert" style={{ color: theme.red }}>{error}</Text> : null}
      </ScrollView>
      {messages.some((message) => message.role === 'user') ? <Pressable onPress={async () => {
        if (revising || busy) return;
        setRevising(true); setPlanMessage('');
        try { await auth.revisePlan(messages.slice(-12)); setPlanMessage('Your weekly plan was updated. Open the Plan tab to review it.'); }
        catch (cause) { setPlanMessage(cause instanceof Error ? cause.message : 'Could not update your plan.'); }
        finally { setRevising(false); }
      }} disabled={revising || busy} accessibilityRole="button" style={{ marginHorizontal: 12, marginBottom: 5, padding: 11, borderRadius: 12, backgroundColor: theme.cardAlt, alignItems: 'center', opacity: revising || busy ? .5 : 1 }}><Text style={{ color: theme.accent, fontWeight: '800' }}>{revising ? 'Updating your plan…' : 'Update my plan using this chat'}</Text></Pressable> : null}
      {planMessage ? <Text accessibilityRole="alert" style={{ color: theme.accent, paddingHorizontal: 16, paddingBottom: 5 }}>{planMessage}</Text> : null}
      <View style={{ flexDirection: 'row', padding: 12, gap: 8, borderTopWidth: 1, borderColor: theme.line, alignItems: 'flex-end' }}>
        <TextInput value={draft} onChangeText={setDraft} placeholder="Ask anything about your progress…" placeholderTextColor={theme.muted} multiline maxLength={2000} style={{ flex: 1, maxHeight: 110, minHeight: 48, borderRadius: 15, backgroundColor: theme.cardAlt, color: theme.text, paddingHorizontal: 14, paddingVertical: 12 }} />
        <Pressable onPress={() => { void send(); }} disabled={busy || !draft.trim()} accessibilityRole="button" accessibilityLabel="Send message" style={{ backgroundColor: theme.accent, borderRadius: 14, minHeight: 48, paddingHorizontal: 16, justifyContent: 'center', opacity: busy || !draft.trim() ? .5 : 1 }}><Text style={{ color: theme.ink, fontWeight: '800' }}>Send</Text></Pressable>
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
