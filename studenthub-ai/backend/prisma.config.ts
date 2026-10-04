import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * Prisma CLI configuration (Prisma 7+).
 *
 * The CLI resolves the migration/seed datasource here; the runtime gets its
 * connection through the `@prisma/adapter-pg` driver adapter in
 * `src/prisma/client.ts`. Keep the two in sync via DATABASE_URL.
 *
 * Note on dotenv: `import 'dotenv/config'` resolves `./.env` against the current
 * working directory, which for Prisma CLI commands is `backend/`. The repo's
 * shared `.env` lives at the monorepo root, so it is not picked up here. Since
 * `prisma generate` never opens a connection, a missing DATABASE_URL must not
 * break it on a fresh clone: we fall back to the docker-compose default, which
 * is identical to `.env.example`. Migrations and seeds still fail loudly
 * against an unreachable database.
 */
const DOCKER_COMPOSE_DATABASE_URL =
  'postgresql://studenthub:studenthub@localhost:5432/studenthub_ai?schema=public';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? DOCKER_COMPOSE_DATABASE_URL,
  },
});