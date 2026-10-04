import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { env } from '../config/env.js';

/**
 * Prisma access is optional in V1.
 *
 * A fresh clone can run the whole student experience before PostgreSQL exists,
 * so every data access goes through `withDatabase()`: it returns `null` when
 * DATABASE_URL is unset or the server is unreachable, and callers fall back to
 * the bundled demo dataset.
 */
let client: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient | null {
  if (!env.databaseUrl) return null;
  if (!client) {
    // Prisma 7 talks to PostgreSQL through a driver adapter; `@prisma/client`
    // only ships the runtime, so the client itself comes from the generated
    // output in `src/generated/prisma` (see `prisma/schema.prisma`).
    const adapter = new PrismaPg({ connectionString: env.databaseUrl });

    client = new PrismaClient({
      adapter,
      log: env.isProduction ? ['error'] : ['warn', 'error'],
    });
  }
  return client;
}

/**
 * Runs `query` against PostgreSQL when available.
 *
 * @param query      Prisma operation to execute.
 * @param fallback   Value returned when the database is unavailable.
 * @param onFallback Optional side effect for logging/telemetry.
 */
export async function withDatabase<T>(
  query: (prisma: PrismaClient) => Promise<T>,
  fallback: T,
  onFallback?: (error: unknown) => void,
): Promise<T> {
  const prisma = getPrismaClient();
  if (!prisma) {
    onFallback?.(new Error('DATABASE_URL is not configured'));
    return fallback;
  }

  try {
    return await query(prisma);
  } catch (error) {
    onFallback?.(error);
    return fallback;
  }
}

/** True when a database connection is configured (not necessarily reachable). */
export function isDatabaseConfigured(): boolean {
  return env.databaseUrl !== null;
}

export async function disconnectPrisma(): Promise<void> {
  if (client) {
    await client.$disconnect();
    client = null;
  }
}