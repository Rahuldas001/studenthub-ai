import type {
  OwnerAuthPayload,
  OwnerProfile,
  OwnerProfileInput,
  OwnerRegisterInput,
  UserRole,
} from '@studenthub/types';
import { env } from '../config/env.js';
import { getPrismaClient } from '../prisma/client.js';
import {
  hashPassword,
  signSessionToken,
  toSessionUser,
  unwrapInfrastructureError,
} from './authService.js';
import { HttpError } from '../utils/httpError.js';
import { sanitizePhone, sanitizeText } from '../utils/sanitize.js';

const DATABASE_MESSAGE =
  'The owner dashboard needs the database. Start PostgreSQL and try again.';

/**
 * Owner onboarding and business profiles.
 *
 * Owner rows are 1:1 with users (`Owner.userId @unique`). Registration creates
 * both sides atomically; existing OWNER accounts without a profile (for
 * example the seeded demo owner or a role promoted later) use `upsertProfile`.
 */
export function toOwnerProfile(owner: {
  id: string;
  businessName: string;
  phone: string | null;
  verified: boolean;
  city?: string | null;
}): OwnerProfile {
  return {
    id: owner.id,
    businessName: owner.businessName,
    phone: owner.phone,
    verified: owner.verified,
    city: owner.city ?? null,
  };
}

/**
 * Creates an OWNER account with its business profile and returns a session.
 *
 * Duplicate email/phone surfaces as 409 via Prisma P2002, matching student
 * registration. Tokens carry `role: 'OWNER'` so the same bearer middleware
 * authorises the owner area.
 */
export async function registerOwner(input: OwnerRegisterInput): Promise<OwnerAuthPayload> {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new HttpError(503, DATABASE_MESSAGE);
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
        role: 'OWNER' as UserRole,
        owner: {
          create: {
            businessName: sanitizeText(input.businessName, 120),
            phone: input.businessPhone ? sanitizePhone(input.businessPhone) : null,
            city: input.city ? sanitizeText(input.city, 80) : null,
          },
        },
      },
      include: { owner: true },
    });

    if (!user.owner) {
      throw new HttpError(500, 'Owner profile was not created. Please try again.');
    }

    if (!env.authSecret || env.authSecret.length === 0) {
      throw new HttpError(500, 'Server auth is not configured. Set AUTH_SECRET.');
    }

    return {
      token: signSessionToken(user.id, user.role),
      user: toSessionUser(user),
      owner: toOwnerProfile(user.owner),
    };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if ((error as { code?: string }).code === 'P2002') {
      throw new HttpError(409, 'An account with this email or phone already exists.');
    }
    throw unwrapInfrastructureError(error);
  }
}

/**
 * Loads the business profile for an OWNER account.
 *
 * 404 when the account has no profile yet — the dashboard treats that as the
 * onboarding state and calls `upsertOwnerProfile` via POST /api/owner/profile.
 */
export async function getOwnerProfile(userId: string): Promise<OwnerProfile> {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new HttpError(503, DATABASE_MESSAGE);
  }

  try {
    const owner = await prisma.owner.findUnique({ where: { userId } });
    if (!owner) {
      throw new HttpError(404, 'Owner profile not found. Register as an owner first.');
    }
    return toOwnerProfile(owner);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw unwrapInfrastructureError(error);
  }
}

/**
 * Creates the business profile for an OWNER account that lacks one.
 *
 * Rejects 409 when a profile already exists; the upsert keeps registration
 * idempotent for retries and seeded/promoted accounts.
 */
export async function upsertOwnerProfile(userId: string, input: OwnerProfileInput): Promise<OwnerProfile> {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new HttpError(503, DATABASE_MESSAGE);
  }

  try {
    const existing = await prisma.owner.findUnique({ where: { userId } });
    if (existing) {
      throw new HttpError(409, 'This account already has an owner profile.');
    }

    const owner = await prisma.owner.create({
      data: {
        userId,
        businessName: sanitizeText(input.businessName, 120),
        phone: input.businessPhone ? sanitizePhone(input.businessPhone) : null,
        city: input.city ? sanitizeText(input.city, 80) : null,
      },
    });

    return toOwnerProfile(owner);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw unwrapInfrastructureError(error);
  }
}