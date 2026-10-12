export function quickLog(message, today) {
  if (typeof message !== 'string' || typeof today !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(today)) return null;
  const normalized = message.trim().toLowerCase();
  if (!/^(?:please\s+)?(?:add|log|record)\b/.test(normalized) || !/\bwater\b/.test(normalized) || !/\btoday\b/.test(normalized)) return null;
  const amount = /\b(\d+(?:\.\d+)?)\s*(millilit(?:er|re)s?|ml|lit(?:er|re)s?|l)\b/.exec(normalized);
  if (!amount) return null;
  const ml = Math.round(Number(amount[1]) * (/^(?:l|lit)/.test(amount[2]) ? 1000 : 1));
  if (!Number.isInteger(ml) || ml < 1 || ml > 5000) return null;
  return { reply: `I can add ${ml.toLocaleString('en-US')} ml of water for today. Review the change below before it is saved.`,
    action: { kind: 'water', mode: 'add', date: today, value: ml } };
}
