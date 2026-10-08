import { test } from 'node:test';
import assert from 'node:assert/strict';
import { displayBirthDate, parseBirthDate } from '../lib/birthDate.ts';

test('birth dates display as DD-MM-YYYY while profiles retain ISO dates', () => {
  assert.equal(displayBirthDate('1999-07-05'), '05-07-1999');
  assert.equal(parseBirthDate('05-07-1999'), '1999-07-05');
  assert.equal(parseBirthDate('31-02-1999'), null);
  assert.equal(parseBirthDate('05-07-2099'), null);
  assert.equal(parseBirthDate('5-7-1999'), null);
});
