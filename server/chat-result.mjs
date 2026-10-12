const badReply = () => { throw Object.assign(new Error('The coach returned an invalid reply. Try again.'), { status: 502 }); };
const validDay = (day) => {
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const [year, month, date] = day.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, date));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === date;
};

export function parseChatResult(raw) {
  let result;
  try { result = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, '')); } catch { badReply(); }
  if (!result || typeof result.reply !== 'string' || !result.reply.trim()) badReply();
  const action = result.action;
  const valid = action && ['water', 'steps', 'weight'].includes(action.kind) && ['set', 'add'].includes(action.mode) &&
    (action.kind !== 'weight' || action.mode === 'set') && validDay(action.date) &&
    Number.isFinite(action.value) && action.value > 0 && action.value <= (action.kind === 'water' ? 5000 : action.kind === 'steps' ? 100000 : 400) &&
    (action.kind === 'weight' ? action.value >= 25 : Number.isInteger(action.value));
  return { reply: result.reply.trim().slice(0, 2000), action: valid ? { kind: action.kind, mode: action.mode, date: action.date, value: action.value } : null };
}
