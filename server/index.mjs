import 'dotenv/config';
import { createApiServer } from './api.mjs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
export { chat, estimateMeal } from './api.mjs';

const port = Number(process.env.PORT || 8787);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535.');
const host = process.env.HOST || '0.0.0.0';
const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean);
export const server = createApiServer({ allowedOrigins });
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  server.listen(port, host, () => console.log(`Gym Buddy API listening on http://${host}:${port}`));
  server.on('error', (error) => { console.error('Could not start Gym Buddy API:', error.message); process.exitCode = 1; });

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => {
      server.close(() => process.exit(0));
      setTimeout(() => { server.closeAllConnections(); process.exit(0); }, 10_000).unref();
    });
  }
}
