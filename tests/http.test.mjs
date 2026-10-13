import assert from 'node:assert/strict';
import test from 'node:test';
import { Readable } from 'node:stream';
import { Buffer } from 'node:buffer';
import { readJson, sendError } from '../server/http.mjs';

test('chunked body limits count UTF-8 bytes and reject oversized objects', async () => {
  await assert.rejects(readJson(Readable.from([Buffer.from('{"a":"界"}')]), 10), { status: 413 });
  assert.deepEqual(await readJson(Readable.from([Buffer.from('{"a":'), Buffer.from('1}')]), 20), { a: 1 });
});

test('unexpected internal error messages are never returned to clients', () => {
  const response = { writeHead(status) { this.status = status; }, end(body) { this.body = JSON.parse(body); } };
  sendError(response, new Error('secret database path and credentials'));
  assert.equal(response.status, 500);
  assert.doesNotMatch(response.body.error, /secret/);
  sendError(response, Object.assign(new Error('Invalid profile.'), { status: 400 }));
  assert.equal(response.status, 400);
  assert.equal(response.body.error, 'Invalid profile.');
});
