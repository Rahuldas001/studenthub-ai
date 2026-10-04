import type { ReviewInput } from '@studenthub/types';
import { withDatabase } from '../prisma/client.js';
import { HttpError } from '../utils/httpError.js';
import { sanitizeText } from '../utils/sanitize.js';

export type CreatedReview = {
  id: string;
  placeId: string;
  authorName: string;
  rating: number;
  comment: string;
  createdAt: string;
};

/**
 * Creates a review and refreshes the denormalised rating aggregates on the
 * place in the same transaction, so list/map queries never need an aggregate
 * scan.
 */
export async function createReview(
  input: ReviewInput,
  userId?: string,
): Promise<CreatedReview> {
  const comment = sanitizeText(input.comment, 1000);
  const authorName = sanitizeText(input.authorName ?? 'Anonymous Student', 80);

  const created = await withDatabase(
    (prisma) =>
      prisma.$transaction(async (tx) => {
        const place = await tx.place.findUnique({
          where: { id: input.placeId },
          select: { id: true },
        });

        if (!place) {
          throw HttpError.notFound('Place not found');
        }

        const review = await tx.review.create({
          data: {
            placeId: input.placeId,
            userId: userId ?? null,
            authorName,
            rating: input.rating,
            comment,
          },
        });

        const aggregate = await tx.review.aggregate({
          where: { placeId: input.placeId },
          _avg: { rating: true },
          _count: { _all: true },
        });

        await tx.place.update({
          where: { id: input.placeId },
          data: {
            ratingAvg: aggregate._avg.rating ?? 0,
            reviewCount: aggregate._count._all,
          },
        });

        return review;
      }),
    null,
  );

  if (created) {
    return {
      id: created.id,
      placeId: created.placeId,
      authorName: created.authorName,
      rating: created.rating,
      comment: created.comment,
      createdAt: created.createdAt.toISOString(),
    };
  }

  // Demo mode: echo the accepted review without persisting it.
  return {
    id: `demo-review-${Date.now()}`,
    placeId: input.placeId,
    authorName,
    rating: input.rating,
    comment,
    createdAt: new Date().toISOString(),
  };
}