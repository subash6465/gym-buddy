import { Text } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, ui } from './UI';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store';
import { useClock } from '@/lib/clock';
import { theme } from '@/lib/theme';

export default function NutritionStatus() {
  const { plan } = useAuth();
  const store = useStore();
  const now = useClock();
  const nutrition = plan?.nutrition;
  const weight = store.weighIns[0]?.kg;
  const changedWeight = nutrition && weight && nutrition.basedOnWeightKg > 0 && Math.abs(weight - nutrition.basedOnWeightKg) / nutrition.basedOnWeightKg >= .05;
  const due = nutrition && new Date(nutrition.reviewAfter).getTime() <= now.getTime();
  const missing = nutrition && Object.values(nutrition.guides).some((guide) => guide.kind === 'clinician-required');
  if (nutrition && !changedWeight && !due && !missing) return null;
  return <Card style={{ borderColor: theme.heroLine }}>
    <Text style={{ color: theme.accent, fontFamily: theme.font }}>{missing ? 'Complete your clinician guides' : nutrition ? 'Time to review your nutrition' : 'Personalize your nutrition guides'}</Text>
    <Text style={ui.muted}>{missing ? 'Some targets need clinician guidance. Enter the values your clinician gave you in Personal details & goals, then review and approve a new plan.' : changedWeight ? 'Your logged weight has changed by at least 5% since these guides were approved. Review them with your coach.' : due ? 'These guides are due for their four-week review. Check whether your goals, health or training have changed.' : 'Ask your coach for a nutrition review. Preview the validated targets and limits before saving them.'}</Text>
    <Button secondary onPress={() => missing ? router.push('/(tabs)/profile') : router.push({ pathname: '/chat', params: { prompt: 'Review my nutrition targets and training plan using my saved profile and current weight. Prepare a preview for approval.' } })}>{missing ? 'Open personal details' : 'Review with AI coach'}</Button>
  </Card>;
}
