import type {
  Facility,
  OwnerPlaceInput,
  OwnerPlaceSummary,
  OwnerPlaceUpdateInput,
  OwnerVisitRequest,
  PlaceCategory,
  PlaceGender,
  PlaceStatus,
  PriceBand,
} from '@studenthub/types';
import { getPrismaClient } from '../prisma/client.js';
import { unwrapInfrastructureError } from './authService.js';
import { HttpError } from '../utils/httpError.js';
import { sanitizePhone, sanitizeText } from '../utils/sanitize.js';

const DATABASE_MESSAGE =
  'The owner dashboard needs the database. Start PostgreSQL and try again.';

/**
 * Owner-scoped listings and visit-request inbox.
 *
 * Every read/write is constrained to `Place.ownerId = req.owner.id`, so one
 * business can never see or mutate another's listings. Errors follow the
 * existing conventions: 503 without a database, 404 for foreign rows, and 409
 * for forbidden lifecycle transitions.
 */
type PlaceRow = {
  id: string;
  category: PlaceCategory;
  name: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  gender: PlaceGender | null;
  price: number | null;
  priceUnit: string | null;
  phone: string | null;
  whatsapp: string | null;
  openingHours: string | null;
  priceBand: PriceBand | null;
  imageUrl: string;
  status: PlaceStatus;
  verified: boolean;
  ratingAvg: number;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
  facilities?: { facility: Facility }[];
  _count: { visitRequests: number };
};

/** Rows joined through PlaceFacility collapse back to plain facilities. */
function linkedFacilities(row: PlaceRow): Facility[] {
  return (row.facilities ?? []).map((link) => link.facility);
}

function toOwnerPlaceSummary(
  row: PlaceRow,
  pendingRequests: number,
  facilities?: Facility[],
): OwnerPlaceSummary {
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
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    imageUrl: row.imageUrl ?? null,
    description: row.description ?? '',
    phone: row.phone ?? null,
    whatsapp: row.whatsapp ?? null,
    openingHours: row.openingHours ?? null,
    priceBand: row.priceBand ?? null,
    facilities: facilities ?? linkedFacilities(row),
    latitude: row.latitude,
    longitude: row.longitude,
    gender: row.gender,
  };
}

function facilityName(value: string): string {
  return sanitizeText(value, 80);
}

/** Lists the owner's places, with optional moderation-status filtering. */
export async function listOwnerPlaces(
  ownerId: string,
  status?: PlaceStatus,
): Promise<{ places: OwnerPlaceSummary[]; counts: Partial<Record<PlaceStatus, number>> }> {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new HttpError(503, DATABASE_MESSAGE);
  }

  try {
    const [rows, grouped, pending] = await Promise.all([
      prisma.place.findMany({
        where: { ownerId, ...(status ? { status } : {}) },
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: { select: { visitRequests: true } },
          facilities: { include: { facility: true } },
        },
      }),
      prisma.place.groupBy({
        by: ['status'],
        where: { ownerId },
        _count: { _all: true },
      }),
      prisma.visitRequest.groupBy({
        by: ['placeId'],
        where: { place: { ownerId }, status: 'PENDING' },
        _count: { _all: true },
      }),
    ]);

    const pendingByPlace = new Map(pending.map((row) => [row.placeId, row._count._all]));
    const counts = Object.fromEntries(
      grouped.map((row) => [row.status, row._count._all]),
    ) as Partial<Record<PlaceStatus, number>>;

    return {
      places: rows.map((row) =>
        toOwnerPlaceSummary(row as PlaceRow, pendingByPlace.get(row.id) ?? 0),
      ),
      counts,
    };
  } catch (error) {
    throw unwrapInfrastructureError(error);
  }
}

/**
 * Creates a PENDING listing owned by the caller.
 *
 * Facility names are linked to the shared catalogue (creating catalogue rows
 * on demand); unknown `collegeId` values are rejected with 404 so owners
 * cannot attach listings to colleges that do not exist.
 */
export async function createOwnerPlace(ownerId: string, input: OwnerPlaceInput): Promise<OwnerPlaceSummary> {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new HttpError(503, DATABASE_MESSAGE);
  }

  try {
    if (input.collegeId) {
      const college = await prisma.college.findUnique({ where: { id: input.collegeId } });
      if (!college) {
        throw HttpError.notFound('College not found');
      }
    }

    const place = await prisma.place.create({
      data: {
        ownerId,
        category: input.category,
        name: sanitizeText(input.name, 120),
        description: input.description ? sanitizeText(input.description, 2000) : '',
        address: sanitizeText(input.address, 300),
        latitude: input.latitude,
        longitude: input.longitude,
        price: input.price ?? null,
        priceUnit: input.priceUnit === null ? null : sanitizeText(input.priceUnit ?? '', 20) || null,
        phone: input.phone ? sanitizePhone(input.phone) : null,
        whatsapp: input.whatsapp ? sanitizePhone(input.whatsapp) : null,
        openingHours: input.openingHours ? sanitizeText(input.openingHours, 60) : null,
        priceBand: input.priceBand ?? null,
        imageUrl: sanitizeText(input.imageUrl, 2000),
        gender: input.gender ?? null,
        collegeId: input.collegeId ?? null,
        status: 'PENDING',
      },
      include: { _count: { select: { visitRequests: true } } },
    });

    const facilities = [...new Set((input.facilities ?? []).map(facilityName).filter(Boolean))];
    const attached: Facility[] = [];
    for (const facility of facilities) {
      const row = await prisma.facility.upsert({
        where: { name: facility },
        update: {},
        create: { name: facility },
      });
      await prisma.placeFacility.upsert({
        where: { placeId_facilityId: { placeId: place.id, facilityId: row.id } },
        update: {},
        create: { placeId: place.id, facilityId: row.id },
      });
      attached.push({ id: row.id, name: row.name, icon: row.icon });
    }

    return toOwnerPlaceSummary(place as PlaceRow, 0, attached);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw unwrapInfrastructureError(error);
  }
}

/**
 * Updates an owned listing.
 *
 * Editing content on an ACTIVE listing resets it to PENDING for re-review;
 * owners cannot set any other status through this path (the schema allows
 * only PENDING/INACTIVE). Facility lists replace the previous set.
 */
export async function updateOwnerPlace(
  ownerId: string,
  placeId: string,
  input: OwnerPlaceUpdateInput,
): Promise<OwnerPlaceSummary> {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new HttpError(503, DATABASE_MESSAGE);
  }

  try {
    const existing = await prisma.place.findFirst({ where: { id: placeId, ownerId } });
    if (!existing) {
      throw HttpError.notFound('Place not found');
    }

    if (input.collegeId && input.collegeId !== existing.collegeId) {
      const college = await prisma.college.findUnique({ where: { id: input.collegeId } });
      if (!college) {
        throw HttpError.notFound('College not found');
      }
    }

    const contentEdited = (
      ['category', 'name', 'description', 'address', 'latitude', 'longitude',
        'price', 'priceUnit', 'phone', 'whatsapp', 'openingHours', 'priceBand',
        'imageUrl', 'gender', 'collegeId', 'facilities'] as const
    ).some((key) => input[key] !== undefined);

    const updated = await prisma.place.update({
      where: { id: placeId },
      data: {
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.name !== undefined ? { name: sanitizeText(input.name, 120) } : {}),
        ...(input.description !== undefined ? { description: sanitizeText(input.description, 2000) } : {}),
        ...(input.address !== undefined ? { address: sanitizeText(input.address, 300) } : {}),
        ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
        ...(input.longitude !== undefined ? { longitude: input.longitude } : {}),
        ...(input.price !== undefined ? { price: input.price ?? null } : {}),
        ...(input.priceUnit !== undefined
          ? { priceUnit: input.priceUnit === null ? null : sanitizeText(input.priceUnit, 20) || null }
          : {}),
        ...(input.phone !== undefined ? { phone: input.phone ? sanitizePhone(input.phone) : null } : {}),
        ...(input.whatsapp !== undefined ? { whatsapp: input.whatsapp ? sanitizePhone(input.whatsapp) : null } : {}),
        ...(input.openingHours !== undefined
          ? { openingHours: input.openingHours ? sanitizeText(input.openingHours, 60) : null }
          : {}),
        ...(input.priceBand !== undefined ? { priceBand: input.priceBand ?? null } : {}),
        ...(input.imageUrl !== undefined ? { imageUrl: sanitizeText(input.imageUrl, 2000) } : {}),
        ...(input.gender !== undefined ? { gender: input.gender ?? null } : {}),
        ...(input.collegeId !== undefined ? { collegeId: input.collegeId ?? null } : {}),
        status:
          input.status ??
          (contentEdited && existing.status === 'ACTIVE' ? 'PENDING' : existing.status),
      },
      include: {
        _count: { select: { visitRequests: true } },
        facilities: { include: { facility: true } },
      },
    });

    // Facilities are a join table, so the refreshed row is stale whenever the
    // caller replaced them; the freshly upserted rows are authoritative.
    let attached: Facility[] | undefined;
    if (input.facilities !== undefined) {
      const facilities = [...new Set(input.facilities.map(facilityName).filter(Boolean))];
      await prisma.placeFacility.deleteMany({ where: { placeId } });
      attached = [];
      for (const facility of facilities) {
        const row = await prisma.facility.upsert({
          where: { name: facility },
          update: {},
          create: { name: facility },
        });
        await prisma.placeFacility.create({ data: { placeId, facilityId: row.id } });
        attached.push({ id: row.id, name: row.name, icon: row.icon });
      }
    }

    const pendingRequests = await prisma.visitRequest.count({
      where: { place: { ownerId }, placeId, status: 'PENDING' },
    });

    return toOwnerPlaceSummary(updated as PlaceRow, pendingRequests, attached);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw unwrapInfrastructureError(error);
  }
}

/** Deletes an owned listing (cascades reviews, favorites, requests). */
export async function deleteOwnerPlace(ownerId: string, placeId: string): Promise<{ id: string; removed: boolean }> {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new HttpError(503, DATABASE_MESSAGE);
  }

  try {
    const result = await prisma.place.deleteMany({ where: { id: placeId, ownerId } });
    if (result.count === 0) {
      throw HttpError.notFound('Place not found');
    }
    return { id: placeId, removed: true };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw unwrapInfrastructureError(error);
  }
}

/**
 * Owner inbox: visit requests across all owned places, newest first.
 *
 * Optional `placeId` narrows to one listing (still ownership-checked) and
 * optional `status` narrows to a lifecycle stage.
 */
export async function listOwnerVisitRequests(
  ownerId: string,
  options?: { placeId?: string; status?: OwnerVisitRequest['status'] },
): Promise<{ requests: OwnerVisitRequest[]; counts: Partial<Record<OwnerVisitRequest['status'], number>> }> {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new HttpError(503, DATABASE_MESSAGE);
  }

  try {
    if (options?.placeId) {
      const place = await prisma.place.findFirst({
        where: { id: options.placeId, ownerId },
        select: { id: true },
      });
      if (!place) {
        throw HttpError.notFound('Place not found');
      }
    }

    const [rows, grouped] = await Promise.all([
      prisma.visitRequest.findMany({
        where: {
          place: { ownerId },
          ...(options?.placeId ? { placeId: options.placeId } : {}),
          ...(options?.status ? { status: options.status } : {}),
        },
        include: { place: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      prisma.visitRequest.groupBy({
        by: ['status'],
        where: {
          place: { ownerId },
          ...(options?.placeId ? { placeId: options.placeId } : {}),
        },
        _count: { _all: true },
      }),
    ]);

    const counts = Object.fromEntries(
      grouped.map((row) => [row.status, row._count._all]),
    ) as Partial<Record<OwnerVisitRequest['status'], number>>;

    return {
      requests: rows.map((row) => ({
        id: row.id,
        placeId: row.placeId,
        placeName: row.place?.name ?? 'Unknown place',
        name: row.name,
        phone: row.phone,
        preferredDate: row.preferredDate?.toISOString() ?? null,
        note: row.note,
        status: row.status as OwnerVisitRequest['status'],
        createdAt: row.createdAt.toISOString(),
      })),
      counts,
    };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw unwrapInfrastructureError(error);
  }
}

/**
 * Moves one owned visit request through its lifecycle.
 *
 * Only PENDING requests may transition, and only to CONFIRMED or CANCELLED;
 * a CONFIRMED request may additionally move to COMPLETED once the visit has
 * happened. Invalid transitions are 409 (not 400): the input is well-formed,
 * but the current state forbids the change.
 */
export async function updateOwnerVisitRequest(
  ownerId: string,
  requestId: string,
  status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED',
): Promise<OwnerVisitRequest> {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new HttpError(503, DATABASE_MESSAGE);
  }

  try {
    const existing = await prisma.visitRequest.findFirst({
      where: { id: requestId, place: { ownerId } },
      include: { place: { select: { id: true, name: true } } },
    });
    if (!existing) {
      throw HttpError.notFound('Visit request not found');
    }

    const allowed =
      existing.status === 'PENDING'
        ? ['CONFIRMED', 'CANCELLED']
        : existing.status === 'CONFIRMED' && status === 'COMPLETED'
          ? ['COMPLETED']
          : [];

    if (!allowed.includes(status)) {
      throw new HttpError(409, `Cannot move a ${existing.status} request to ${status}.`);
    }

    const updated = await prisma.visitRequest.update({
      where: { id: requestId },
      data: { status },
      include: { place: { select: { id: true, name: true } } },
    });

    return {
      id: updated.id,
      placeId: updated.placeId,
      placeName: updated.place?.name ?? 'Unknown place',
      name: updated.name,
      phone: updated.phone,
      preferredDate: updated.preferredDate?.toISOString() ?? null,
      note: updated.note,
      status: updated.status as OwnerVisitRequest['status'],
      createdAt: updated.createdAt.toISOString(),
    };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw unwrapInfrastructureError(error);
  }
}
