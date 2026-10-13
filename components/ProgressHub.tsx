import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Card, Icon, Row, ui, MotionPressable } from './UI';
import ProgressChart from './ProgressChart';
import { rangeTotals, type Logs } from '@/lib/analytics';
import { formatDate, shiftDay } from '@/lib/dates';
import { theme } from '@/lib/theme';

export default function ProgressHub({ logs, today }: { logs: Logs; today: string }) {
  const days = rangeTotals(logs, shiftDay(today, -6), today);
  const activeDays = days.filter((day) => day.meals || day.workouts || day.water || day.steps || logs.weighIns.some((entry) => entry.date === day.date)).length;
  const sessions = days.reduce((total, day) => total + day.workouts, 0);
  const minutes = days.reduce((total, day) => total + day.workoutMinutes, 0);
  const weights = [...new Map([...logs.weighIns].reverse().filter((entry) => entry.date >= shiftDay(today, -29) && entry.date <= today).map((entry) => [entry.date, entry])).values()].sort((a, b) => a.date.localeCompare(b.date));
  const delta = weights.length > 1 ? weights[weights.length - 1].kg - weights[0].kg : null;
  return <>
    <Card style={{ backgroundColor: theme.hero, borderColor: theme.heroLine }}>
      <Row><Icon name="progress" color={theme.accent} /><Text style={ui.eyebrow}>CONSISTENCY / LAST 7 DAYS</Text></Row>
      <Row><Text style={{ color: theme.text, fontFamily: theme.font, fontSize: 42, letterSpacing: -2 }}>{activeDays}<Text style={{ color: theme.muted, fontSize: 18 }}> / 7</Text></Text><Text style={[ui.muted, { flex: 1 }]}>days with a logged activity.{activeDays ? ' Every check-in builds the picture.' : ' Your first check-in starts here.'}</Text></Row>
      <View style={{ flexDirection: 'row', gap: 8 }}>{days.map((day) => {
        const logged = Boolean(day.meals || day.workouts || day.water || day.steps || logs.weighIns.some((entry) => entry.date === day.date));
        return <View key={day.date} style={{ flex: 1, alignItems: 'center', gap: 9 }}>
          <View accessibilityLabel={`${formatDate(day.date)}: ${logged ? 'activity logged' : 'no activity logged'}`} style={{ width: '100%', height: 8, borderRadius: 4, backgroundColor: logged ? theme.accent : theme.line }} />
          <Text style={{ color: day.date === today ? theme.accent : theme.muted, fontSize: 11 }}>{new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'narrow' })}</Text>
        </View>;
      })}</View>
    </Card>
    <Row>{[[sessions, 'Sessions / 7D'], [minutes, 'Minutes / 7D'], [delta === null ? '—' : `${delta > 0 ? '+' : ''}${delta.toFixed(1)}`, 'kg change / 30D']].map(([value, label]) => <Card key={label} style={{ flex: 1, padding: 13, gap: 6 }}><Text style={{ color: theme.text, fontSize: 25, fontFamily: theme.font }}>{value}</Text><Text style={{ color: theme.muted, fontSize: 10, fontWeight: '600', lineHeight: 14 }}>{label}</Text></Card>)}</Row>
    <ProgressChart logs={logs} today={today} />
    <MotionPressable onPress={() => router.push('/reviews')} style={{ width: '100%' }}><Card style={{ width: '100%' }}><Row><View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: theme.accentSoft, justifyContent: 'center', alignItems: 'center' }}><Icon name="sparkles" color={theme.secondary} /></View><View style={{ flex: 1 }}><Text style={{ color: theme.text, fontSize: 17, fontFamily: theme.font }}>Beyond the numbers</Text><Text style={ui.muted}>Open weekly & monthly AI reviews</Text></View><Icon name="arrow" color={theme.muted} size={18} /></Row></Card></MotionPressable>
  </>;
}
