import { router } from 'expo-router';
import { Button, Card, Page, Title, ui } from '@/components/UI';
import { Text } from 'react-native';

export default function NotFoundScreen() {
  return <Page>
    <Title eyebrow="LET’S GET YOU BACK" subtitle="This page is no longer available.">A small detour.</Title>
    <Card><Text style={ui.muted}>Head back to your daily overview to find your plan, log an activity, or check your progress.</Text><Button onPress={() => router.replace('/')}>Back to Gym Buddy</Button></Card>
  </Page>;
}
