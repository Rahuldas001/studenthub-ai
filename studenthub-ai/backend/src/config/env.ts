import { config as loadDotenv } from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export type AppEnv = 'development' | 'test' | 'production';

/**
 * Loads environment variables from the nearest `.env`.
 *
 * The repo keeps a single root `.env` (copied from `.env.example`) so both the
 * backend and the student app read the same configuration. Backend-local
 * overrides in `backend/.env` take precedence when present.
 */
function loadEnvironment(): void {
  const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const candidates = [
    resolve(backendRoot, '.env'),
    resolve(backendRoot, '../.env'),
  ];

  for (const path of candidates) {
    if (existsSync(path)) {
      loadDotenv({ path });
      return;
    }
  }

  // No .env file: rely on the process environment and defaults below.
  loadDotenv();
}

loadEnvironment();

function readInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;

  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a number, received "${raw}"`);
  }
  return parsed;
}

function readList(name: string, fallback: string[]): string[] {
  const raw = process.env[name];
  if (!raw) return fallback;
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

const nodeEnv = (process.env.NODE_ENV ?? 'development') as AppEnv;

export const env = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port: readInt('PORT', 4000),
  corsOrigins: readList('CORS_ORIGIN', [
    'http://localhost:8081',
    'http://127.0.0.1:8081',
  ]),
  /** Absent until the developer starts PostgreSQL — the API still boots. */
  databaseUrl: process.env.DATABASE_URL ?? null,
  /**
   * Secret for signing session tokens. A stable development default keeps a
   * fresh clone working, but production MUST set AUTH_SECRET to a long random
   * value — rotating it signs every active session out.
   */
  authSecret: process.env.AUTH_SECRET ?? 'studenthub-development-secret-change-me',
} as const;