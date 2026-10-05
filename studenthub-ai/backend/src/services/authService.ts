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

type SessionClaims = { sub: string; role: UserRole; exp: number };

type OtpRecord = { code: string; expiresAt: number };
const otpStore = new Map<string, OtpRecord>();

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
  city?: string | null;
}): SessionUser {
  return {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    city: user.city ?? null,
  };
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = await scrypt(password, salt, KEY_LENGTH);
  return `scrypt:${salt}:${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, hash] = stored.split(':');
  if (scheme !== 'scrypt' || !salt || !hash) return false;

  const derived = await scrypt(password, salt, KEY_LENGTH);
  const expected = Buffer.from(hash, 'hex');
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

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
        city: input.city ? sanitizeText(input.city, 80) : null,
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

/** Generates a 6-digit verification code for password reset. */
export async function requestPasswordReset(identifier: string): Promise<{ message: string; code: string }> {
  const prisma = getPrismaClient();
  if (!prisma) throw new HttpError(503, 'Database is unreachable.');

  const clean = identifier.trim().toLowerCase();
  let user: Awaited<ReturnType<typeof prisma.user.findFirst>> = null;
  try {
    user = await prisma.user.findFirst({
      where: clean.includes('@') ? { email: clean } : { phone: sanitizePhone(clean) },
    });
  } catch (error) {
    throw unwrapInfrastructureError(error);
  }

  if (!user) {
    throw HttpError.notFound('No account found with this email or phone number.');
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(user.id, { code, expiresAt: Date.now() + 15 * 60 * 1000 });

  return {
    message: `Verification code generated for ${user.email ?? user.phone}`,
    code,
  };
}

/** Validates the OTP code and updates the password. */
export async function resetPasswordWithCode(identifier: string, code: string, newPassword: string): Promise<{ message: string }> {
  const prisma = getPrismaClient();
  if (!prisma) throw new HttpError(503, 'Database is unreachable.');

  const clean = identifier.trim().toLowerCase();
  let user: Awaited<ReturnType<typeof prisma.user.findFirst>> = null;
  try {
    user = await prisma.user.findFirst({
      where: clean.includes('@') ? { email: clean } : { phone: sanitizePhone(clean) },
    });
  } catch (error) {
    throw unwrapInfrastructureError(error);
  }

  if (!user) {
    throw HttpError.notFound('Account not found.');
  }

  const otp = otpStore.get(user.id);
  if (!otp || otp.code !== code.trim() || Date.now() > otp.expiresAt) {
    throw HttpError.badRequest('Invalid or expired 6-digit verification code.');
  }

  const passwordHash = await hashPassword(newPassword);
  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });
  } catch (error) {
    throw unwrapInfrastructureError(error);
  }

  otpStore.delete(user.id);
  return { message: 'Password reset successfully. You can now sign in with your new password.' };
}

/** Updates user profile fields (displayName, email, phone). */
export async function updateProfile(userId: string, input: { displayName?: string; email?: string; phone?: string }): Promise<SessionUser> {
  const prisma = getPrismaClient();
  if (!prisma) throw new HttpError(503, 'Database is unreachable.');

  const data: { displayName?: string; email?: string | null; phone?: string | null } = {};
  if (input.displayName) data.displayName = sanitizeText(input.displayName, 80);
  if (input.email !== undefined) data.email = input.email ? input.email.trim().toLowerCase() : null;
  if (input.phone !== undefined) data.phone = input.phone ? sanitizePhone(input.phone) : null;

  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data,
    });
    return toSessionUser(updated);
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
      throw new HttpError(409, 'An account with this email or phone already exists.');
    }
    throw unwrapInfrastructureError(error);
  }
}
