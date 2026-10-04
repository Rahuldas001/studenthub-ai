import {
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
import type { LoginInput, RegisterInput, SessionUser, UserRole } from '@studenthub/types';
import { env } from '../config/env.js';
import { getPrismaClient } from '../prisma/client.js';
import { HttpError } from '../utils/httpError.js';
import { sanitizePhone, sanitizeText } from '../utils/sanitize.js';

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

/** Sessions last 30 days; re-signing in rotates the token. */
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
const KEY_LENGTH = 64;

/**
 * Account and session logic for student sign-in.
 *
 * Deliberately dependency-free: passwords use Node's scrypt (format
 * `scrypt:<salt>:<hash>`), and sessions are HMAC-SHA256 signed bearer tokens
 * (`base64url(payload).base64url(signature)`), so no session table or cookie
 * jar is needed in V1. Rotating `AUTH_SECRET` invalidates every token.
 */
type SessionClaims = { sub: string; role: UserRole; exp: number };

/**
 * True for infrastructure failures (Postgres down/unreachable) rather than
 * request problems, so auth endpoints answer with a helpful 503 instead of a
 * generic 500 — mirroring how discovery endpoints fall back to demo data.
 */
export function unwrapInfrastructureError(error: unknown): unknown {
  const code = (error as { code?: string }).code ?? '';
  const message = (error as Error).message ?? '';
  if (
    ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET', 'P1001', 'P1002', 'P2021'].includes(code) ||
    /can't reach database|no response|connection refused|econnrefused/i.test(message)
  ) {
    return new HttpError(503, 'Database is unreachable. Start PostgreSQL (npm run db:up) and try again.');
  }
  return error;
}

export function toSessionUser(user: {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
}): SessionUser {
  return {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    phone: user.phone,
    role: user.role,
  };
}

/** Hashes a plaintext password. Only the salted result is ever stored. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = await scrypt(password, salt, KEY_LENGTH);
  return `scrypt:${salt}:${derived.toString('hex')}`;
}

/** Constant-time password check; false for malformed or missing hashes. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, hash] = stored.split(':');
  if (scheme !== 'scrypt' || !salt || !hash) return false;

  const derived = await scrypt(password, salt, KEY_LENGTH);
  const expected = Buffer.from(hash, 'hex');
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

/** Signs `{ sub, role, exp }` into a compact bearer token. */
export function signSessionToken(userId: string, role: UserRole): string {
  const claims: SessionClaims = {
    sub: userId,
    role,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const body = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signature = createHmac('sha256', env.authSecret).update(body).digest('base64url');
  return `${body}.${signature}`;
}

/** Verifies signature and expiry; null means "treat as signed out". */
export function verifySessionToken(token: string): SessionClaims | null {
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;

  const expected = createHmac('sha256', env.authSecret).update(body).digest('base64url');
  const given = Buffer.from(signature);
  const candidate = Buffer.from(expected);
  if (given.length !== candidate.length || !timingSafeEqual(given, candidate)) return null;

  try {
    const claims = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionClaims;
    return typeof claims.sub === 'string' && claims.exp > Math.floor(Date.now() / 1000)
      ? claims
      : null;
  } catch {
    return null;
  }
}

/**
 * Creates a student account and returns a signed-in session.
 *
 * Requires PostgreSQL: unlike discovery endpoints there is no demo fallback,
 * because credentials must be stored. Duplicate email/phone (Prisma P2002)
 * surfaces as a friendly 409.
 */
export async function register(input: RegisterInput): Promise<{ token: string; user: SessionUser }> {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new HttpError(503, 'Accounts need the database. Start PostgreSQL and try again.');
  }

  const passwordHash = await hashPassword(input.password);
  const email = input.email?.trim().toLowerCase() ?? null;
  const phone = input.phone ? sanitizePhone(input.phone) : null;

  try {
    const user = await prisma.user.create({
      data: {
        displayName: sanitizeText(input.displayName, 80),
        email,
        phone,
        passwordHash,
        role: 'STUDENT',
      },
    });

    return { token: signSessionToken(user.id, user.role), user: toSessionUser(user) };
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
      throw new HttpError(409, 'An account with this email or phone already exists.');
    }
    throw unwrapInfrastructureError(error);
  }
}

/**
 * Signs in with an email address or phone number.
 *
 * The generic message covers both "no such account" and "wrong password" so
 * the endpoint cannot be used to enumerate registered identifiers.
 */
export async function login(input: LoginInput): Promise<{ token: string; user: SessionUser }> {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new HttpError(503, 'Accounts need the database. Start PostgreSQL and try again.');
  }

  const identifier = input.identifier.trim();
  let user: Awaited<ReturnType<typeof prisma.user.findFirst>> = null;
  try {
    user = await prisma.user.findFirst({
      where: identifier.includes('@')
        ? { email: identifier.toLowerCase() }
        : { phone: sanitizePhone(identifier) },
    });
  } catch (error) {
    throw unwrapInfrastructureError(error);
  }

  if (!user?.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) {
    throw HttpError.unauthorized('Invalid email/phone or password.');
  }

  return { token: signSessionToken(user.id, user.role), user: toSessionUser(user) };
}

/** Loads the signed-in account; 404 when the user row vanished (e.g. reseed). */
export async function getAccount(userId: string): Promise<SessionUser> {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new HttpError(503, 'Accounts need the database. Start PostgreSQL and try again.');
  }

  let user: Awaited<ReturnType<typeof prisma.user.findUnique>> = null;
  try {
    user = await prisma.user.findUnique({ where: { id: userId } });
  } catch (error) {
    throw unwrapInfrastructureError(error);
  }
  if (!user) throw HttpError.notFound('Account not found');
  return toSessionUser(user);
}