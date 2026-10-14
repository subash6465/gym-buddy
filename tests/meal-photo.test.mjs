import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import { mealInstructions } from '../server/meal-instructions.mjs';
import { mealSchema, validateMealNutrition } from '../server/meal-nutrition.mjs';

process.env.DATABASE_PATH = ':memory:';
const { createApiServer } = await import('../server/api.mjs');
const { register } = await import('../server/accounts.mjs');

const meal = { mealFound: true, name: 'Rice, dal and vegetables', calories: 490, protein: 30, carbs: 70, fat: 10, fibre: 8, sugar: 12, addedSugar: null, saturatedFat: null,
  assumptions: 'Cooked rice approx 150 g, dal approx 100 g, visible carrot/peas approx 80 g. Rice/dal likely boiled; vegetables likely sauteed. Estimated retained oil approx 5 g, included once. Home/restaurant origin unknown. Portion sizes are visual estimates.' };

test('photo detection is mandatory and no-food results never become zero-calorie meal estimates', () => {
  assert.equal(mealSchema.properties.mealFound.type, 'boolean');
  assert.ok(mealSchema.required.includes('mealFound'));
  for (const result of [{ mealFound: false }, { ...meal, mealFound: false, calories: 0 }]) assert.throws(() => validateMealNutrition(result, { photo: true }), { status: 422, message: 'No meal found in the photo. Please choose a clear photo of your food and try again.' });
  assert.throws(() => validateMealNutrition({ mealFound: false }), { status: 422, message: 'No meal found in the description. Please describe the food you ate and try again.' });
  const { mealFound: _flag, ...legacy } = meal;
  assert.throws(() => validateMealNutrition(legacy, { photo: true }), { status: 502 });
  assert.throws(() => validateMealNutrition({ ...meal, mealFound: 'true' }, { photo: true }), { status: 502 });
  assert.equal(validateMealNutrition(legacy).name, meal.name, 'legacy text estimates stay compatible');
  assert.equal(validateMealNutrition(meal, { photo: true }).assumptions, meal.assumptions);
});

test('instructions require component portions and oil accounting without false certainty', () => {
  for (const instruction of [/FIRST establish/, /mealFound=false immediately/, /weight in grams of EACH component/, /visible fruit or vegetable/, /amount consumed\/retained in grams/, /include preparation fats ONCE/i, /Explicit measured quantities are more reliable/, /SAME meal/, /Plating or appearance alone is not reliable proof/, /not your private reasoning/, /never claim near-perfect/]) assert.match(mealInstructions, instruction);
});

test('every provider returns a recoverable no-meal message and valid meals retain their portion breakdown', async (t) => {
  const server = createApiServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  let result = { mealFound: false };
  const calls = [];
  globalThis.fetch = async (url, options) => {
    if (String(url).startsWith(base)) return original(url, options);
    calls.push({ url: String(url), body: JSON.parse(options.body) });
    const text = JSON.stringify(result);
    return new Response(JSON.stringify(String(url).includes('anthropic') ? { content: [{ type: 'text', text }] }
      : String(url).includes('googleapis') ? { candidates: [{ content: { parts: [{ text }] } }] }
        : { output: [{ type: 'message', content: [{ type: 'output_text', text }] }] }));
  };
  const photo = 'data:image/png;base64,aGVsbG8=';
  for (const provider of ['openai', 'claude', 'gemini']) {
    const { token } = register(`photo-${provider}@example.com`, 'test-only-password', provider, 'fake-test-key');
    const post = () => fetch(`${base}/estimate-meal`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ description: 'Home cooked, used 1 tsp oil for my portion.', imageDataUrl: photo }) });
    result = { mealFound: false };
    const before = calls.length;
    const rejected = await post();
    assert.equal(rejected.status, 422); assert.match((await rejected.json()).error, /^No meal found in the photo\./);
    assert.equal(calls.length, before + 1, 'no-meal classification must not call the provider again');
    const request = calls.at(-1).body;
    const instructions = request.instructions || request.system || request.systemInstruction.parts[0].text;
    assert.equal(instructions, mealInstructions);
    assert.match(JSON.stringify(request), /Home cooked, used 1 tsp oil/);
    assert.match(JSON.stringify(request), /aGVsbG8=/);
    result = meal;
    const accepted = await post(); const details = await accepted.json();
    assert.equal(accepted.status, 200); assert.equal(details.mealFound, true);
    assert.equal(details.assumptions, meal.assumptions);
    assert.equal(details.calories, 490);
  }
});
