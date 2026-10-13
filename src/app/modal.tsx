import { router } from 'expo-router';
import { Text } from 'react-native';
import { Button, Card, Page, Title, ui } from '@/components/UI';

export default function AboutScreen() {
  return <Page>
    <Title eyebrow="YOUR DAILY EDGE" subtitle="Training, nutrition, and progress. Together.">Meet Gym Buddy.</Title>
    <Card><Text style={ui.muted}>Build a personal training week, keep track of daily check-ins, and turn your effort into a clearer picture of progress.</Text><Text style={ui.muted}>Your AI coach can help you explore your goals. Review its nutrition estimates and approve proposed plan changes before saving.</Text></Card>
    <Button onPress={() => router.replace('/(tabs)')}>Back to today</Button>
  </Page>;
}
