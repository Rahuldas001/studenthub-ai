import { createApp } from './app.js';
import { env } from './config/env.js';
import { disconnectPrisma, isDatabaseConfigured } from './prisma/client.js';

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(
    `[studenthub] API listening on http://localhost:${env.port} (${env.nodeEnv})`,
  );
  console.log(
    isDatabaseConfigured()
      ? '[studenthub] DATABASE_URL detected — PostgreSQL will be used when reachable.'
      : '[studenthub] No DATABASE_URL — serving the bundled demo dataset.',
  );
  console.log(`[studenthub] Health check: http://localhost:${env.port}/api/health`);
});

/** Drains connections so `tsx watch` restarts and deploys exit cleanly. */
function shutdown(signal: string): void {
  console.log(`[studenthub] ${signal} received, shutting down.`);
  server.close(() => {
    void disconnectPrisma().finally(() => process.exit(0));
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));