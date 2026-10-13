import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { useClock } from '@/lib/clock';
import { localDay } from '@/lib/dates';
import { completedPeriods, reviewJob } from '@/lib/reviews';
import { useStore } from '@/lib/store';
import { planTargets } from '@/lib/targets';

export default function ReviewAutomation() {
  const auth = useAuth();
  const store = useStore();
  const now = useClock();
  const running = useRef(false);
  const nextAttempt = useRef(0);
  const lastDay = useRef('');
  const day = localDay(now);
  useEffect(() => {
    if (lastDay.current !== day) { lastDay.current = day; nextAttempt.current = 0; }
    if (!store.ready || !auth.user.id || !auth.startedOn || !store.historyStartDay || running.current || now.getTime() < nextAttempt.current) return;
    running.current = true;
    const run = async () => {
      try {
        const saved = await auth.refreshReviews();
        const existing = new Set(saved.map((review) => `${review.kind}:${review.startDay}`));
        const missing = completedPeriods(auth.startedOn!, day).filter((period) => period.startDay >= store.historyStartDay && !existing.has(`${period.kind}:${period.startDay}`));
        const target = planTargets(store.profile, store.weighIns[0]?.kg, auth.plan, now);
        const plan = auth.plan;
        const planDay = plan?.generatedAt?.slice(0, 10);
        for (const period of missing.slice(0, 6)) {
          const targets = target && plan && planDay && planDay <= period.startDay
            ? { calories: target.calories, protein: target.protein, water: target.water, steps: plan.stepsTarget || 0 } : null;
          await auth.generateReview(reviewJob(period, store, store.profile, targets));
        }
        nextAttempt.current = now.getTime() + (missing.length > 6 ? 5 * 60_000 : 60 * 60_000);
      } catch {
        nextAttempt.current = Date.now() + 10 * 60_000;
      } finally { running.current = false; }
    };
    void run();
  }, [auth, store, now, day]);
  return null;
}
