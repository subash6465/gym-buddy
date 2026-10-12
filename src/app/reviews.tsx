import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button, Card, Page, Title, ui } from '@/components/UI';
import { useAuth } from '@/lib/auth';
import type { ReviewKind } from '@/lib/reviews';
import { completedPeriods } from '@/lib/reviews';
import { localDay } from '@/lib/dates';
import { theme } from '@/lib/theme';
import { useStore } from '@/lib/store';

export default function ReviewsScreen() {
  const auth = useAuth();
  const store = useStore();
  const [kind, setKind] = useState<ReviewKind>('weekly');
  const [open, setOpen] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const list = auth.reviews.filter((review) => review.kind === kind).sort((a, b) => b.endDay.localeCompare(a.endDay));
  const due = auth.startedOn ? completedPeriods(auth.startedOn, localDay()).filter((period) => period.kind === kind && period.startDay >= store.historyStartDay && !list.some((review) => review.startDay === period.startDay)).length : 0;
  const refresh = async () => {
    setLoading(true); setError('');
    try { await auth.refreshReviews(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load your reviews.'); }
    finally { setLoading(false); }
  };
  return <Page>
    <Title eyebrow="YOUR LONG VIEW" subtitle="One saved AI review for each completed period. Past reviews stay available for your coach chat.">Progress reviews</Title>
    <Button secondary onPress={() => router.back()}>Back</Button>
    <View style={{ flexDirection: 'row', gap: 8 }}>{(['weekly', 'monthly'] as const).map((option) => <Pressable key={option} onPress={() => { setKind(option); setOpen(''); }} accessibilityRole="button" accessibilityState={{ selected: option === kind }} style={{ flex: 1, padding: 13, borderRadius: 13, alignItems: 'center', backgroundColor: option === kind ? theme.accent : theme.cardAlt }}><Text style={{ color: option === kind ? theme.ink : theme.text, fontWeight: '800' }}>{option === 'weekly' ? 'Weekly' : 'Monthly'}</Text></Pressable>)}</View>
    <Text style={ui.muted}>Weekly periods start on your first setup day. Monthly periods run from that date to the day before the same date next month. Reviews generate after a period ends when the app opens online.</Text>
    {error ? <Text accessibilityRole="alert" style={{ color: theme.red }}>{error}</Text> : null}
    <Button secondary disabled={loading} onPress={() => { void refresh(); }}>{loading ? 'Refreshing…' : 'Refresh saved reviews'}</Button>
    {due ? <Card><Text style={ui.muted}>{due} completed {kind} {due === 1 ? 'period is' : 'periods are'} waiting for a saved review. Keep the app open online; generation retries automatically.</Text></Card> : null}
    {list.length ? list.map((review) => {
      const key = `${review.kind}:${review.startDay}`;
      const expanded = open === key;
      return <Card key={key}><Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setOpen(expanded ? '' : key)}><Text style={{ color: theme.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>{review.kind.toUpperCase()} REVIEW</Text><Text style={{ color: theme.text, fontSize: 18, fontWeight: '800', marginTop: 5 }}>{review.startDay} – {review.endDay}</Text><Text style={[ui.muted, { marginTop: 5 }]}>{expanded ? 'Tap to collapse' : review.summary}</Text></Pressable>
        {expanded ? <View style={{ gap: 12 }}><Text style={{ color: theme.text }}>{review.summary}</Text>{([['What went well', review.wins], ['Room to improve', review.improvements], ['Next steps', review.nextSteps]] as const).map(([heading, items]) => <View key={heading} style={{ gap: 5 }}><Text style={{ color: theme.accent, fontWeight: '800' }}>{heading}</Text>{items.map((item, index) => <Text key={index} style={ui.muted}>• {item}</Text>)}</View>)}<Text style={[ui.muted, { fontSize: 11 }]}>Saved {new Date(review.generatedAt).toLocaleDateString()}. Missing logs are treated as unknown, not a missed goal.</Text></View> : null}
      </Card>;
    }) : <Card><Text style={ui.muted}>No {kind} review yet. Your first one becomes available after a full {kind === 'weekly' ? '7-day week' : 'month'} from setup.</Text></Card>}
  </Page>;
}
