import { Text, View } from 'react-native';
import { Card, Page, Title, ui } from '@/components/UI';
import { useStore } from '@/lib/store';
import { useClock } from '@/lib/clock';
import { suggestedTargets } from '@/lib/targets';
import { theme } from '@/lib/theme';

const routines = {
  gym: [
    ['Day 1 · Full body', 'Squat or leg press · row · chest press · core'],
    ['Day 2 · Move', 'Comfortable walk, bike, or mobility work'],
    ['Day 3 · Full body', 'Hip hinge · pulldown · shoulder press · core'],
  ],
  home: [
    ['Day 1 · Full body', 'Chair squat · wall push-up · band row · core'],
    ['Day 2 · Move', 'Comfortable walk or gentle mobility work'],
    ['Day 3 · Full body', 'Step-up · glute bridge · incline push-up · core'],
  ],
};
export default function Plan() {
  const { profile, weighIns } = useStore();
  const now = useClock();
  const targets = suggestedTargets(profile, weighIns[0]?.kg, now);
  const goalLabel = { lose: 'Weight loss', gain: 'Weight gain', maintain: 'Maintenance' }[profile.goal];
  return <Page>
    <Title eyebrow="A STEADY PATH" subtitle="A simple starting structure that you can adapt to your day.">Your plan</Title>
    <Card style={{ backgroundColor: '#20352B', borderColor: '#385140' }}>
      <Text style={{ color: theme.accent, fontSize: 12, fontWeight: '800' }}>CURRENT DIRECTION</Text>
      <Text style={{ color: theme.text, fontSize: 24, fontWeight: '800' }}>{goalLabel}</Text>
      <Text style={ui.muted}>{profile.setting === 'gym' ? 'Gym' : 'Home'} workouts{targets ? ` · ~${targets.calories} kcal daily · ~${targets.protein} g protein` : ' · Add your details and weight for suggested targets'}</Text>
    </Card>
    <Text style={{ color: theme.text, fontSize: 20, fontWeight: '800' }}>Movement starter</Text>
    {routines[profile.setting].map(([day, work]) => <Card key={day}><Text style={{ color: theme.accent, fontWeight: '800' }}>{day}</Text><Text style={{ color: theme.text, fontSize: 16, lineHeight: 24 }}>{work}</Text><Text style={ui.muted}>Choose a comfortable effort and record what you actually do.</Text></Card>)}
    <Text style={{ color: theme.text, fontSize: 20, fontWeight: '800' }}>Meal planning rhythm</Text>
    <Card>
      <Text style={{ color: theme.text, fontSize: 16, lineHeight: 25 }}>Build meals around a protein source, vegetables or fruit, a carbohydrate source, and fats that suit your preferences. Log portions to learn what works for you.</Text>
      <View style={{ borderTopWidth: 1, borderColor: theme.line, paddingTop: 12 }}><Text style={ui.muted}>{profile.allergies ? `Your allergy note: ${profile.allergies}. Always verify ingredients directly.` : 'Add allergies in You so they stay visible while planning.'}</Text></View>
    </Card>
    {profile.concerns ? <Card><Text style={{ color: theme.orange, fontWeight: '800' }}>YOUR CONCERNS</Text><Text style={ui.muted}>{profile.concerns}</Text><Text style={ui.muted}>This starter routine has not been tailored to an injury or medical condition. Get qualified advice before trying movements that cause pain.</Text></Card> : null}
    <Card><Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>AI coach is next</Text><Text style={ui.muted}>The planned coach will use your goal, food logs, activity and preferences to suggest plans and answer questions. It is not connected yet, so this starter plan does not claim to be personalized medical or nutrition advice.</Text></Card>
  </Page>;
}
