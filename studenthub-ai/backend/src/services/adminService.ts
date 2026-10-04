import type {
  AdminCollegeInput,
  AdminCollegeSummary,
  AdminOverview,
  AdminOwnerCounts,
  AdminOwnerSummary,
  PlaceStatus,
  UserRole,
  VisitRequestStatus,
} from '@studenthub/types';
import { getPrismaClient } from '../prisma/client.js';
import { unwrapInfrastructureError } from './authService.js';
import { HttpError } from '../utils/httpError.js';
import { sanitizeText } from '../utils/sanitize.js';

const DATABASE_MESSAGE = 'The admin panel needs the database. Start PostgreSQL and try again.';

type AdminOwnerRow = {
  id: string;
  businessName: string;
  phone: string | null;
  verified: boolean;
  createdAt: Date;
  user: { displayName: string; email: string | null };
  _count: { places: number };
};

type AdminCollegeRow = {
  id: string;
  name: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  createdAt: Date;
  _count: { places: number };
};

/** Prisma handle or a 503 explaining how to start the database. */
function requirePrisma() {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new HttpError(503, DATABASE_MESSAGE);
  }
  return prisma;
}

/** Maps an Owner row (with its account and listing count) to the admin shape. */
export function toAdminOwnerSummary(row: AdminOwnerRow): AdminOwnerSummary {
  return {
    id: row.id,
    businessName: row.businessName,
    phone: row.phone,
    verified: row.verified,
    displayName: row.user.displayName,
    email: row.user.email,
    listingCount: row._count.places,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Maps a College row (with its listing count) to the admin shape. */
export function toAdminCollegeSummary(row: AdminCollegeRow): AdminCollegeSummary {
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    state: row.state,
    latitude: row.latitude,
    longitude: row.longitude,
    placeCount: row._count.places,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Platform-wide counts for the admin landing view.
 *
 * One grouped query per table plus two owner counts; the numbers feed the
 * moderation queue badges, so they are read live on every request.
 */
export async function getAdminOverview(): Promise<AdminOverview> {
  const prisma = requirePrisma();

  try {
    const [usersByRole, placesByStatus, requestsByStatus, ownersTotal, ownersVerified] =
      await Promise.all([
        prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
        prisma.place.groupBy({ by: ['status'], _count: { _all: true } }),
        prisma.visitRequest.groupBy({ by: ['status'], _count: { _all: true } }),
        prisma.owner.count(),
        prisma.owner.count({ where: { verified: true } }),
      ]);

    const roleCount = (role: UserRole): number =>
      usersByRole.find((row) => row.role === role)?._count._all ?? 0;

    return {
      users: {
        students: roleCount('STUDENT'),
        owners: roleCount('OWNER'),
        admins: roleCount('ADMIN'),
      },
      places: Object.fromEntries(
        placesByStatus.map((row) => [row.status, row._count._all]),
      ) as Partial<Record<PlaceStatus, number>>,
      visitRequests: Object.fromEntries(
        requestsByStatus.map((row) => [row.status, row._count._all]),
      ) as Partial<Record<VisitRequestStatus, number>>,
      ownersTotal,
      ownersVerified,
    };
  } catch (error) {
    throw unwrapInfrastructureError(error);
  }
}

/** Owner businesses with account details and listing counts. */
export async function listAdminOwners(
  verified?: boolean,
): Promise<{ owners: AdminOwnerSummary[]; counts: AdminOwnerCounts }> {
  const prisma = requirePrisma();

  try {
    const [rows, total, verifiedCount] = await Promise.all([
      prisma.owner.findMany({
        where: verified === undefined ? undefined : { verified },
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { displayName: true, email: true } },
          _count: { select: { places: true } },
        },
      }),
      prisma.owner.count(),
      prisma.owner.count({ where: { verified: true } }),
    ]);

    return {
      owners: rows.map((row) => toAdminOwnerSummary(row as AdminOwnerRow)),
      counts: { total, verified: verifiedCount, unverified: total - verifiedCount },
    };
  } catch (error) {
    throw unwrapInfrastructureError(error);
  }
}

/**
 * Verifies or un-verifies a business.
 *
 * Setting the value the owner already has is a 409, matching the moderation
 * transitions, so double-clicks surface instead of silently succeeding.
 */
export async function setOwnerVerified(
  ownerId: string,
  verified: boolean,
): Promise<AdminOwnerSummary> {
  const prisma = requirePrisma();

  try {
    const existing = await prisma.owner.findUnique({
      where: { id: ownerId },
      include: {
        user: { select: { displayName: true, email: true } },
        _count: { select: { places: true } },
      },
    });

    if (!existing) {
      throw HttpError.notFound('Owner not found');
    }

    if (existing.verified === verified) {
      throw new HttpError(
        409,
        verified ? 'This business is already verified.' : 'This business is not verified.',
      );
    }

    const updated = await prisma.owner.update({
      where: { id: ownerId },
      data: { verified },
      include: {
        user: { select: { displayName: true, email: true } },
        _count: { select: { places: true } },
      },
    });

    return toAdminOwnerSummary(updated as AdminOwnerRow);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw unwrapInfrastructureError(error);
  }
}

/** Colleges drive the launch geography and place association. */
export async function listAdminColleges(): Promise<{ colleges: AdminCollegeSummary[] }> {
  const prisma = requirePrisma();

  try {
    const rows = await prisma.college.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { places: true } } },
    });

    return { colleges: rows.map((row) => toAdminCollegeSummary(row as AdminCollegeRow)) };
  } catch (error) {
    throw unwrapInfrastructureError(error);
  }
}

/** Creates a college; name + city is unique, so duplicates surface as 409. */
export async function createAdminCollege(input: AdminCollegeInput): Promise<AdminCollegeSummary> {
  const prisma = requirePrisma();

  try {
    const college = await prisma.college.create({
      data: {
        name: sanitizeText(input.name, 120),
        city: sanitizeText(input.city, 80),
        state: sanitizeText(input.state, 80),
        latitude: input.latitude,
        longitude: input.longitude,
      },
      include: { _count: { select: { places: true } } },
    });

    return toAdminCollegeSummary(college as AdminCollegeRow);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if ((error as { code?: string }).code === 'P2002') {
      throw new HttpError(409, 'A college with this name already exists in that city.');
    }
    throw unwrapInfrastructureError(error);
  }
}
