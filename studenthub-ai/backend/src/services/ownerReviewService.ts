import type { OwnerReview } from '@studenthub/types';
import { getPrismaClient } from '../prisma/client.js';
import { unwrapInfrastructureError } from './authService.js';
import { HttpError } from '../utils/httpError.js';
import { sanitizeText } from '../utils/sanitize.js';

/**
 * Owner review inbox and public replies.
 *
 * Reviews were already public API data, but the owner inbox used to fan out one
 * `GET /api/places/:id` per listing and keep replies on the device. Both are
 * server-side now: one owner-scoped query spans every listing, and a reply is
 * written to `Review.reply` so students see it on the place page.
 */

const DATABASE_MESSAGE =
  'The owner dashboard needs the database. Start PostgreSQL and try again.';

type ReviewRow = {
  id: string;
  placeId: string;
  authorName: string;
  rating: number;
  comment: string;
  reply: string | null;
  repliedAt: Date | null;
  createdAt: Date;
  place: { name: string } | null;
};

function toOwnerReview(row: ReviewRow): OwnerReview {
  return {
    id: row.id,
    placeId: row.placeId,
    placeName: row.place?.name ?? 'Unknown place',
    authorName: row.authorName,
    rating: row.rating,
    comment: row.comment,
    reply: row.reply,
    repliedAt: row.repliedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Reviews across every listing the owner manages, newest first.
 *
 * Optional `placeId` narrows to one listing (ownership-checked) and `filter`
 * separates reviews that still need an answer from the ones already answered.
 */
export async function listOwnerReviews(
  ownerId: string,
  options?: { placeId?: string; filter?: 'ALL' | 'UNANSWERED' | 'ANSWERED' },
): Promise<OwnerReview[]> {
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

    const rows = await prisma.review.findMany({
      where: {
        place: { ownerId },
        ...(options?.placeId ? { placeId: options.placeId } : {}),
        ...(options?.filter === 'UNANSWERED' ? { reply: null } : {}),
        ...(options?.filter === 'ANSWERED' ? { reply: { not: null } } : {}),
      },
      include: { place: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return rows.map((row) => toOwnerReview(row as ReviewRow));
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw unwrapInfrastructureError(error);
  }
}

/** Loads one review that belongs to the caller, or 404s. */
async function findOwnedReview(
  prisma: NonNullable<ReturnType<typeof getPrismaClient>>,
  ownerId: string,
  reviewId: string,
): Promise<ReviewRow> {
  const row = await prisma.review.findFirst({
    where: { id: reviewId, place: { ownerId } },
    include: { place: { select: { name: true } } },
  });

  if (!row) {
    throw HttpError.notFound('Review not found');
  }

  return row as ReviewRow;
}

/** Writes (or replaces) the public reply to one of the owner's reviews. */
export async function replyToOwnerReview(
  ownerId: string,
  reviewId: string,
  reply: string,
): Promise<OwnerReview> {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new HttpError(503, DATABASE_MESSAGE);
  }

  try {
    await findOwnedReview(prisma, ownerId, reviewId);

    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: { reply: sanitizeText(reply, 400), repliedAt: new Date() },
      include: { place: { select: { name: true } } },
    });

    return toOwnerReview(updated as ReviewRow);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw unwrapInfrastructureError(error);
  }
}

/** Removes the public reply, leaving the review itself untouched. */
export async function deleteOwnerReviewReply(ownerId: string, reviewId: string): Promise<OwnerReview> {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new HttpError(503, DATABASE_MESSAGE);
  }

  try {
    const existing = await findOwnedReview(prisma, ownerId, reviewId);
    if (!existing.reply) {
      throw new HttpError(409, 'This review has no reply to delete.');
    }

    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: { reply: null, repliedAt: null },
      include: { place: { select: { name: true } } },
    });

    return toOwnerReview(updated as ReviewRow);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw unwrapInfrastructureError(error);
  }
}
