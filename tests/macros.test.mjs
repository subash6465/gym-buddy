import assert from 'node:assert/strict';
import test from 'node:test';
import { macroAmount, macroGuides, macroTotals } from '../lib/macros.ts';

test('macro references convert energy ranges to grams and retain the approved protein guide', () => {
  const guides = macroGuides({ calories: 2000, protein: 120 });
  assert.deepEqual(guides, { protein: '120', carbs: '225–300', fat: '44–78', fibre: '25', sugar: null });
  assert.equal(macroGuides({ calories: 2500, protein: 150 }).carbs, '281–375');
  assert.equal(macroAmount(80, guides.carbs), '80 / 225–300 g');
});

test('paused profiles and unknown total-sugar recommendations do not receive invented targets', () => {
  assert.ok(Object.values(macroGuides(null)).every((guide) => guide === null));
  assert.ok(Object.values(macroGuides({ calories: NaN, protein: 100 })).every((guide) => guide === null));
  assert.equal(macroAmount(30, null), '30 / — g');
});

test('daily macro totals retain all five nutrient amounts', () => {
  const totals = macroTotals([{ protein: 20, carbs: 40, fat: 10, fibre: 5, sugar: 7 }, { protein: 30, carbs: 50, fat: 15, fibre: 6, sugar: 8 }]);
  assert.deepEqual(totals, { protein: 50, carbs: 90, fat: 25, fibre: 11, sugar: 15 });
  assert.deepEqual(macroTotals([]), { protein: 0, carbs: 0, fat: 0, fibre: 0, sugar: 0 });
});
