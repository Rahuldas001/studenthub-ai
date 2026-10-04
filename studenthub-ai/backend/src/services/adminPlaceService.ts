import type { AdminModerationStatus, AdminPlaceSummary, PlaceCategory, PlaceStatus } from '@studenthub/types';
import { getPrismaClient } from '../prisma/client.js';
import { unwrapInfrastructureError } from './authService.js';
import { HttpError } from '../utils/httpError.js';

const DATABASE_MESSAGE =
  'The admin panel needs the database. Start PostgreSQL and try again.';

type AdminPlaceRow = {
  id: string;
  category: PlaceCategory;
  name: string;
  address: string;
  price: number | null;
  priceUnit: string | null;
  status: PlaceStatus;
  verified: boolean;
  ratingAvg: number;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
  owner: { businessName: string } | null;
  _count: { visitRequests: number };
};

function toAdminPlaceSummary(row: AdminPlaceRow, pendingRequests: number): AdminPlaceSummary {
  return {
    id: row.id,
    category: row.category,
    name: row.name?.trim() ? row.name : 'Untitled place',
    address: row.address,
    price: row.price,
    priceUnit: row.priceUnit,
    status: row.status,
    verified: row.verified,
    rating: Number(row.ratingAvg.toFixed(1)),
    reviewCount: row.reviewCount,
    pendingRequests,
    ownerName: row.owner?.businessName ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Moderation transition guard (pure; unit-testable without a database).
 *
 * Admins can approve, reject, unpublish, and also reinstate (INACTIVE or
 * REJECTED → ACTIVE). Setting the status the listing already has is a 409 so
 * accidental double-approvals surface in logs and tests.
 */
export function checkModerationTransition(current: PlaceStatus, next: AdminModerationStatus): void {
  if (current === next) {
    throw new HttpError(409, `The listing is already ${next}.`);
  }
}

/** Lists every listing with status counts and the owning business name. */
export async function listAdminPlaces(
  status?: PlaceStatus,
): Promise<{ places: AdminPlaceSummary[]; counts: Partial<Record<PlaceStatus, number>> }> {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new HttpError(503, DATABASE_MESSAGE);
  }
  try {
    const [rows, grouped, pending] = await Promise.all([
      prisma.place.findMany({
        where: status ? { status } : undefined,
        orderBy: { updatedAt: 'desc' },
        include: { owner: { select: { businessName: true } }, _count: { select: { visitRequests: true } } },
      }),
      prisma.place.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.visitRequest.groupBy({ by: ['placeId'], where: { status: 'PENDING' }, _count: { _all: true } }),
    ]);
    const pendingByPlace = new Map(pending.map((row) => [row.placeId, row._count._all]));
    const counts = Object.fromEntries(
      grouped.map((row) => [row.status, row._count._all]),
    ) as Partial<Record<PlaceStatus, number>>;
    return {
      places: rows.map((row) => toAdminPlaceSummary(row as AdminPlaceRow, pendingByPlace.get(row.id) ?? 0)),
      counts,
    };
  } catch (error) {
    throw unwrapInfrastructureError(error);
  }
}

/** Approves, rejects, or unpublishes any listing. */
export async function moderatePlace(placeId: string, next: AdminModerationStatus): Promise<AdminPlaceSummary> {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new HttpError(503, DATABASE_MESSAGE);
  }
  try {
    const place = await prisma.place.findUnique({
      where: { id: placeId },
      include: { owner: { select: { businessName: true } }, _count: { select: { visitRequests: true } } },
    });
    if (!place) {
      throw HttpError.notFound('Listing not found');
    }
    checkModerationTransition(place.status, next);
    const updated = await prisma.place.update({
      where: { id: placeId },
      data: { status: next },
      include: { owner: { select: { businessName: true } }, _count: { select: { visitRequests: true } } },
    });
    return toAdminPlaceSummary(updated as AdminPlaceRow, place._count.visitRequests);
  } catch (error) {
    throw unwrapInfrastructureError(error);
  }
}

/** Removes any listing outright (spam, duplicates, legal requests). */
export async function deleteAdminPlace(placeId: string): Promise<{ id: string; deleted: true }> {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new HttpError(503, DATABASE_MESSAGE);
  }
  try {
    const existing = await prisma.place.findUnique({ where: { id: placeId }, select: { id: true } });
    if (!existing) {
      throw HttpError.notFound('Listing not found');
    }
    await prisma.place.delete({ where: { id: placeId } });
    return { id: placeId, deleted: true };
  } catch (error) {
    throw unwrapInfrastructureError(error);
  }
}