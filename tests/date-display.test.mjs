import assert from 'node:assert/strict';
import test from 'node:test';
import { calendarDays, displayDatesInText, formatDate, parseDisplayDate } from '../lib/dates.ts';

test('dates display consistently without changing ISO storage values', () => {
  assert.equal(formatDate('2026-10-13'), '13-10-2026');
  assert.equal(formatDate(new Date(2026, 0, 2, 12)), '02-01-2026');
  assert.equal(parseDisplayDate('13-10-2026'), '2026-10-13');
  assert.equal(displayDatesInText('From 2026-10-01 to 2026-10-13.'), 'From 01-10-2026 to 13-10-2026.');
});

test('date entry validates real calendar dates, including leap years', () => {
  assert.equal(parseDisplayDate('29-02-2024'), '2024-02-29');
  assert.equal(parseDisplayDate('29-02-2025'), null);
  assert.equal(parseDisplayDate('31-04-2026'), null);
  assert.equal(parseDisplayDate('2026-10-13'), null);
  assert.equal(formatDate('2026-02-30'), '—');
});

test('calendar grids align weekdays across month and year boundaries', () => {
  const february = calendarDays(2024, 1);
  assert.equal(february.length, 42);
  assert.equal(february[0].date, '2024-01-28');
  assert.equal(february.filter((day) => day.inMonth).length, 29);
  assert.equal(calendarDays(2026, 0)[0].date, '2025-12-28');
});
