import assert from 'node:assert/strict';
import test from 'node:test';
import { restoreData } from '../lib/persistence.ts';

const initial = { exerciseLibrary: [], historyStartDay: '', profile: { name: '' }, meals: [], workouts: [], weighIns: [], water: {}, waterEntries: [], stepEntries: [] };
test('account restoration starts empty and keeps legacy meal defaults', () => {
  assert.deepEqual(restoreData(null, initial, { name: 'Second account' }), { ...initial, profile: { name: 'Second account' } });
  const legacyMeal = { id: 'meal', date: '2026-01-01', name: 'Lunch', note: '', calories: 100, protein: 1, carbs: 1, fat: 1, fibre: 1, sugar: 1 };
  const restored = restoreData(JSON.stringify({ meals: [legacyMeal], profile: { name: 'Old name' } }), initial, { name: 'Server name' });
  assert.equal(restored.profile.name, 'Server name');
  assert.deepEqual(restored.meals, [{ ...legacyMeal, type: 'snack', time: '12:00' }]);
  assert.deepEqual(restored.stepEntries, []);
  assert.equal(restoreData(JSON.stringify({ meals: [{ ...legacyMeal, addedSugar: null, saturatedFat: null }] }), initial, null).meals[0].addedSugar, null);
});
test('damaged caches fail restoration instead of becoming empty persisted activity', () => {
  for (const raw of ['{', 'null', '[]', '{"historyStartDay":5}', '{"meals":{}}', '{"meals":[null]}', '{"water":{"today":"250"}}', '{"weighIns":[{"id":"1","date":"today","kg":null}]}']) {
    assert.throws(() => restoreData(raw, initial, null));
  }
});
