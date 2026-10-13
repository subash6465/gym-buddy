import { Buffer } from 'node:buffer';

export async function readJson(req, limit) {
  if (Number(req.headers?.['content-length']) > limit) {
    req.resume();
    throw Object.assign(new Error('Request is too large.'), { status: 413 });
  }
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes <= limit) chunks.push(chunk);
  }
  // Drain chunked oversized bodies without retaining them or destroying the
  // socket before the client receives the error response.
  if (bytes > limit) throw Object.assign(new Error('Request is too large.'), { status: 413 });
  let body;
  try { body = bytes ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}; }
  catch { throw Object.assign(new Error('Send a valid JSON object.'), { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw Object.assign(new Error('Send a valid JSON object.'), { status: 400 });
  }
  return body;
}

export function sendError(res, error) {
  const status = Number.isInteger(error?.status) && error.status >= 400 && error.status <= 599 ? error.status : 500;
  // Unexpected database, filesystem, and parsing errors must not reach clients.
  const message = status === 500 ? 'The API could not complete the request. Try again.' : error.message;
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify({ error: message }));
}
