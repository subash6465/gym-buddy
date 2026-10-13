export function chatClock(now = new Date()) {
  let timeZone: string | undefined;
  try { timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { /* The UTC offset still identifies local time. */ }
  return {
    localTime: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    timeZone,
    utcOffsetMinutes: -now.getTimezoneOffset(),
    capturedAt: now.toISOString(),
  };
}

// Preserve the clock and daily totals; omit detail instead of cutting JSON mid-field.
export function serializeChatContext(context: Record<string, unknown>) {
  const compact = { ...context };
  for (const field of ['weeklyPlan', 'nutritionGuides', 'concerns', 'allergies', 'todaysWorkouts', 'todaysMeals']) {
    if (JSON.stringify(compact).length <= 3000) break;
    delete compact[field];
    compact.contextDetailsOmitted = true;
  }
  return JSON.stringify(compact);
}
