/**
 * Creates the local `.env` files each workspace needs, without ever
 * overwriting an existing file.
 *
 * Why per-package files instead of one root `.env`:
 *  - the backend loads its env with `dotenv` relative to its own working
 *    directory (`backend/`), and Prisma 7's `prisma.config.ts` does the same;
 *  - Expo loads `.env` from the app root (`apps/mobile-app/`) by default.
 *
 * Run with `npm run setup:env`. All generated files are gitignored.
 */
import { access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** package dir → keys that package needs from its own `.env`. */
const TARGETS = [
  {
    dir: 'backend',
    contents: [
      'NODE_ENV=development',
      'PORT=4000',
      'CORS_ORIGIN=http://localhost:8081,http://127.0.0.1:8081',
      'DATABASE_URL="postgresql://studenthub:studenthub@localhost:5432/studenthub_ai?schema=public"',
      '',
    ].join('\n'),
  },
  {
    dir: 'apps/mobile-app',
    contents: [
      '# Optional: set your computer LAN IP for physical devices; localhost works for web.',
      '# EXPO_PUBLIC_API_BASE_URL=http://localhost:4000/api',
      '',
    ].join('\n'),
  },
];

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  for (const target of TARGETS) {
    const envPath = resolve(rootDir, target.dir, '.env');

    if (await exists(envPath)) {
      console.log(`[setup-env] kept existing ${target.dir}/.env`);
      continue;
    }

    // Write via a template sibling so the file stays plain text if a future
    // target needs more than the defaults.
    const { writeFile } = await import('node:fs/promises');
    await writeFile(envPath, target.contents, 'utf8');
    console.log(`[setup-env] created ${target.dir}/.env`);
  }
}

await main();