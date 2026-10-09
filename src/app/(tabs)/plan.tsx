import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Card, Icon, Page, Title, ui } from '@/components/UI';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { theme } from '@/lib/theme';

export default function Plan() {
  const { profile } = useStore();
  const auth = useAuth();
  const { plan } = auth;
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const goalLabel = { lose: 'Weight loss', gain: 'Weight gain', maintain: 'Maintenance' }[profile.goal];
  return <Page>
    <Title eyebrow="YOUR PERSONAL WEEK" subtitle="A starting plan built from your details and preferences.">Your plan. Your pace.</Title>
    {plan ? <>
      <Card style={{ backgroundColor: 'rgba(45,104,106,0.28)', borderColor: 'rgba(118,240,219,0.3)' }}>
        <Text style={{ color: theme.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>CURRENT DIRECTION</Text>
        <Text style={{ color: theme.text, fontSize: 26, fontWeight: '800' }}>{goalLabel}</Text>
        <Text style={ui.muted}>{plan.summary}</Text>
        <Text style={{ color: theme.text, fontWeight: '700' }}>{plan.recommendedDays} training day{plan.recommendedDays === 1 ? '' : 's'} recommended · {plan.requestedDays} requested · {plan.pace} pace</Text>
        <Text style={ui.muted}>{plan.guidanceNote}</Text>
      </Card>
      <Card><Text style={{ color: theme.text, fontSize: 19, fontWeight: '800' }}>Daily goals</Text>
        {plan.calorieTarget ? <>
          <Text style={{ color: theme.text, fontSize: 22, fontWeight: '800' }}>{plan.calorieTarget.toLocaleString()} kcal intake</Text>
          <Text style={ui.muted}>Estimated maintenance {plan.maintenanceCalories.toLocaleString()} kcal · planned deficit {plan.deficitCalories.toLocaleString()} kcal</Text>
          <Text style={ui.muted}>Protein {plan.proteinGrams} g · Drinks {plan.waterMl.toLocaleString()} ml · Steps {plan.stepsTarget.toLocaleString()}</Text>
        </> : <Text style={ui.muted}>Personal calorie and drink goals are paused for this profile. Steps starting point: {plan.stepsTarget.toLocaleString()} per day.</Text>}
      </Card>
      {profile.fitnessPlan ? <Card><Text style={{ color: theme.accent, fontSize: 11, fontWeight: '800' }}>YOUR ORIGINAL PLAN</Text><Text style={ui.muted}>{profile.fitnessPlan}</Text></Card> : null}
      <Text style={{ color: theme.text, fontSize: 19, fontWeight: '800' }}>This week</Text>
      {plan.days.map((day) => <Card key={day.day} style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: theme.cardAlt, alignItems: 'center', justifyContent: 'center' }}><Icon name={day.isRest ? 'water' : 'workout'} color={theme.accent} size={20} /></View>
        <View style={{ flex: 1, gap: 5 }}><Text style={{ color: theme.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>{day.day.toUpperCase()} · {day.isRest ? 'RECOVERY' : `${day.minutes} MIN`}</Text>
          <Text style={{ color: theme.text, fontSize: 17, fontWeight: '800' }}>{day.title}</Text>
          <Text style={ui.muted}>{day.focus}</Text>
          {day.activities.map((activity, index) => <Text key={`${day.day}-${index}`} style={ui.muted}>• {activity}</Text>)}
        </View>
      </Card>)}
      <Card><Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>Suggestions</Text><Text style={ui.muted}>{plan.suggestions}</Text><Text style={[ui.muted, { fontSize: 11 }]}>Chat with Gym Buddy AI and use “Update my plan using this chat” to revise this week.</Text></Card>
    </> : <Card><Text style={ui.muted}>Generate a weekly plan from your saved profile and training preferences.</Text>
      {error ? <Text accessibilityRole="alert" style={{ color: theme.red }}>{error}</Text> : null}
      <Button disabled={generating} onPress={() => { setGenerating(true); setError(''); auth.revisePlan([{ role: 'user', content: 'Create a practical weekly plan from my saved profile and preferences.' }]).catch((cause) => setError(cause instanceof Error ? cause.message : 'Could not generate a plan.')).finally(() => setGenerating(false)); }}>{generating ? 'Building your plan…' : 'Generate my plan'}</Button>
    </Card>}
  </Page>;
}
