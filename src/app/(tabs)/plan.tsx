import { Text, View } from 'react-native';
import { Card, Icon, Page, Title, ui } from '@/components/UI';
import { useStore } from '@/lib/store';
import { useClock } from '@/lib/clock';
import { suggestedTargets } from '@/lib/targets';
import { theme } from '@/lib/theme';

const routines = {
  gym: [
    ['Full body A', 'Squat or leg press · row · chest press · core'],
    ['Move + recover', 'Comfortable walk, bike, or mobility work'],
    ['Full body B', 'Hip hinge · pulldown · shoulder press · core'],
  ],
  home: [
    ['Full body A', 'Chair squat · wall push-up · band row · core'],
    ['Move + recover', 'Comfortable walk or gentle mobility work'],
    ['Full body B', 'Step-up · glute bridge · incline push-up · core'],
  ],
};

export default function Plan() {
  const { profile, weighIns } = useStore();
  const now = useClock();
  const targets = suggestedTargets(profile, weighIns[0]?.kg, now);
  const goalLabel = { lose: 'Weight loss', gain: 'Weight gain', maintain: 'Maintenance' }[profile.goal];
  return <Page>
    <Title eyebrow="A STEADY PATH" subtitle="A flexible starting structure for your week.">Your plan. Your pace.</Title>
    <Card style={{ backgroundColor: 'rgba(45,104,106,0.28)', borderColor: 'rgba(118,240,219,0.3)', paddingVertical: 22 }}>
      <Text style={{ color: theme.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1.4 }}>CURRENT DIRECTION</Text>
      <Text style={{ color: theme.text, fontSize: 27, fontWeight: '800', letterSpacing: -1.1 }}>{goalLabel}</Text>
      <Text style={ui.muted}>{profile.setting === 'gym' ? 'Gym' : 'Home'} workouts · three movement days</Text>
      {targets ? <Text style={{ color: theme.text, fontSize: 12, fontWeight: '700' }}>~{targets.calories} kcal daily · ~{targets.protein} g protein</Text> :
        <Text style={ui.muted}>Add your details and a current weight in You for suggested targets.</Text>}
    </Card>

    <Text style={{ color: theme.text, fontSize: 19, fontWeight: '800' }}>Movement rhythm</Text>
    {profile.fitnessPlan ? <Card><Text style={{ color: theme.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>YOUR SCHEDULE</Text><Text style={{ color: theme.text, fontSize: 15 }}>{profile.fitnessPlan}</Text></Card> : null}
    {routines[profile.setting].map(([name, work], index) => <Card key={name} style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
      <View style={{ width: 39, height: 39, borderRadius: 13, backgroundColor: 'rgba(118,240,219,0.14)', alignItems: 'center', justifyContent: 'center' }}>
        {index === 1 ? <Icon name="water" color={theme.accent} size={20} /> : <Icon name="workout" color={theme.accent} size={20} />}
      </View>
      <View style={{ flex: 1 }}><Text style={{ color: theme.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>DAY {index + 1}</Text>
        <Text style={{ color: theme.text, fontSize: 16, fontWeight: '800', marginTop: 3 }}>{name}</Text>
        <Text style={[ui.muted, { fontSize: 12, marginTop: 2 }]}>{work}</Text></View>
    </Card>)}
    <Text style={ui.muted}>Choose a comfortable effort and log what you actually do.</Text>

    <Text style={{ color: theme.text, fontSize: 19, fontWeight: '800' }}>Fuel the work</Text>
    <Card>
      <Text style={{ color: theme.text, fontSize: 15, lineHeight: 23 }}>Build meals around a protein source, vegetables or fruit, a carbohydrate source, and fats that suit your preferences. Log portions to learn what works for you.</Text>
      <View style={{ borderTopWidth: 1, borderColor: theme.line, paddingTop: 12 }}>
        <Text style={ui.muted}>{profile.allergies ? `Your allergy note: ${profile.allergies}. Always verify ingredients directly.` : 'Add allergies in You so they stay visible while planning.'}</Text>
      </View>
    </Card>
    {profile.concerns ? <Card><Text style={{ color: theme.orange, fontWeight: '800' }}>YOUR CONCERNS</Text><Text style={ui.muted}>{profile.concerns}</Text><Text style={ui.muted}>This starter routine has not been tailored to an injury or medical condition. Get qualified advice before trying movements that cause pain.</Text></Card> : null}
    <Card><Text style={{ color: theme.text, fontSize: 16, fontWeight: '800' }}>AI coach is next</Text><Text style={ui.muted}>The planned coach is not connected yet. This starter plan is not personalized medical or nutrition advice.</Text></Card>
  </Page>;
}
