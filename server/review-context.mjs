export function reviewsForQuestion(question, reviews, now = new Date()) {
  const prompt = question.toLowerCase();
  const isoDate = /\b\d{4}-\d{2}-\d{2}\b/.exec(prompt)?.[0];
  const localDate = /\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/.exec(prompt);
  const namedDate = /\b(?:\d{1,2}\s+)?(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b|\b\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}\b/.exec(prompt)?.[0];
  const parsedNamed = namedDate ? Date.parse(namedDate) : NaN;
  const date = isoDate || (localDate ? `${localDate[3]}-${localDate[2].padStart(2, '0')}-${localDate[1].padStart(2, '0')}` : Number.isFinite(parsedNamed) ? new Date(parsedNamed).toISOString().slice(0, 10) : undefined);
  const weeksAgo = /\b(\d{1,2}|one|two|three|four) weeks? (?:ago|before)\b/.exec(prompt)?.[1];
  const count = { one: 1, two: 2, three: 3, four: 4 }[weeksAgo] || Number(weeksAgo);
  const reference = Number.isFinite(count) && count > 0 ? new Date(now.getTime() - count * 7 * 86400_000).toISOString().slice(0, 10) : date;
  const selected = reference ? reviews.filter((review) => review.startDay <= reference && review.endDay >= reference)
    : /progress|review|last week|last month|how (?:did|am) i/.test(prompt) ? reviews.slice(0, 6) : [];
  return { catalog: reviews.map((review) => `${review.kind} ${review.startDay} to ${review.endDay}`).slice(0, 100), selected: selected.slice(0, 6) };
}
