import type { OwnerOffer, OwnerOfferInput, OwnerOfferUpdateInput } from '@studenthub/types';
import { getPrismaClient } from '../prisma/client.js';
import { unwrapInfrastructureError } from './authService.js';
import { HttpError } from '../utils/httpError.js';
import { sanitizeText } from '../utils/sanitize.js';

/**
 * Promotional offers owned by a business.
 *
 * Offers are real rows now: every read/write is constrained to
 * `Offer.ownerId`, and `placeId` (when present) must point at a listing the
 * same owner manages. Dates are stored at end-of-day UTC so a promo is valid
 * *through* the day the owner picked, and read back as `YYYY-MM-DD`.
 */

const DATABASE_MESSAGE =
  'The owner dashboard needs the database. Start PostgreSQL and try again.';

type OfferRow = {
  id: string;
  placeId: string | null;
  title: string;
  description: string;
  discount: number;
  validTill: Date | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  place?: { name: string } | null;
};

/** End of the picked day in UTC, so `validTill` means "valid through". */
function endOfDay(value: string): Date {
  return new Date(`${value}T23:59:59.999Z`);
}

/** Back to the `YYYY-MM-DD` the form and the UI expect. */
function toDateInput(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

function toOwnerOffer(row: OfferRow): OwnerOffer {
  return {
    id: row.id,
    placeId: row.placeId,
    placeName: row.place?.name ?? null,
    title: row.title,
    description: row.description,
    discount: row.discount,
    validTill: toDateInput(row.validTill),
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** 404s unless the listing exists *and* belongs to the caller. */
async function assertOwnedPlace(
  prisma: NonNullable<ReturnType<typeof getPrismaClient>>,
  ownerId: string,
  placeId: string,
): Promise<void> {
  const place = await prisma.place.findFirst({ where: { id: placeId, ownerId }, select: { id: true } });
  if (!place) {
    throw HttpError.notFound('Place not found');
  }
}

/** Newest first; large histories are capped so one owner cannot stall the API. */
export async function listOwnerOffers(ownerId: string): Promise<OwnerOffer[]> {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new HttpError(503, DATABASE_MESSAGE);
  }

  try {
    const rows = await prisma.offer.findMany({
      where: { ownerId },
      include: { place: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return rows.map((row) => toOwnerOffer(row as OfferRow));
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw unwrapInfrastructureError(error);
  }
}

/** Creates an offer for one listing, or for every listing when `placeId` is null. */
export async function createOwnerOffer(ownerId: string, input: OwnerOfferInput): Promise<OwnerOffer> {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new HttpError(503, DATABASE_MESSAGE);
  }

  try {
    const placeId = input.placeId ?? null;
    if (placeId) {
      await assertOwnedPlace(prisma, ownerId, placeId);
    }

    const created = await prisma.offer.create({
      data: {
        ownerId,
        placeId,
        title: sanitizeText(input.title, 60),
        description: sanitizeText(input.description, 160),
        discount: input.discount,
        validTill: input.validTill ? endOfDay(input.validTill) : null,
      },
      include: { place: { select: { name: true } } },
    });

    return toOwnerOffer(created as OfferRow);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw unwrapInfrastructureError(error);
  }
}

/** Edits or pauses one owned offer; `active` is the pause/resume switch. */
export async function updateOwnerOffer(
  ownerId: string,
  offerId: string,
  input: OwnerOfferUpdateInput,
): Promise<OwnerOffer> {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new HttpError(503, DATABASE_MESSAGE);
  }

  try {
    const existing = await prisma.offer.findFirst({ where: { id: offerId, ownerId } });
    if (!existing) {
      throw HttpError.notFound('Offer not found');
    }

    if (input.placeId) {
      await assertOwnedPlace(prisma, ownerId, input.placeId);
    }

    const updated = await prisma.offer.update({
      where: { id: offerId },
      data: {
        ...(input.placeId !== undefined ? { placeId: input.placeId || null } : {}),
        ...(input.title !== undefined ? { title: sanitizeText(input.title, 60) } : {}),
        ...(input.description !== undefined ? { description: sanitizeText(input.description, 160) } : {}),
        ...(input.discount !== undefined ? { discount: input.discount } : {}),
        ...(input.validTill !== undefined
          ? { validTill: input.validTill ? endOfDay(input.validTill) : null }
          : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
      },
      include: { place: { select: { name: true } } },
    });

    return toOwnerOffer(updated as OfferRow);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw unwrapInfrastructureError(error);
  }
}

/** Deletes an owned offer. Deleting a listing cascades its offers too. */
export async function deleteOwnerOffer(
  ownerId: string,
  offerId: string,
): Promise<{ id: string; removed: boolean }> {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new HttpError(503, DATABASE_MESSAGE);
  }

  try {
    const result = await prisma.offer.deleteMany({ where: { id: offerId, ownerId } });
    if (result.count === 0) {
      throw HttpError.notFound('Offer not found');
    }

    return { id: offerId, removed: true };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw unwrapInfrastructureError(error);
  }
}
