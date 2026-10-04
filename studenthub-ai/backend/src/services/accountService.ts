import { getPrismaClient } from '../prisma/client.js';
import { unwrapInfrastructureError } from './authService.js';
import { HttpError } from '../utils/httpError.js';

const DATABASE_MESSAGE =
  'Account deletion needs the database. Start PostgreSQL (npm run db:up) and try again.';

function requirePrisma() {
  const prisma = getPrismaClient();
  if (!prisma) throw new HttpError(503, DATABASE_MESSAGE);
  return prisma;
}

/** What an account removal touched, echoed back to the client for the audit trail. */
export interface DeletedAccountSummary {
  deleted: true;
  email: string | null;
  reviewsRemoved: number;
  visitRequestsRemoved: number;
  favoritesRemoved: number;
  listingsReleased: number;
}

/**
 * Permanently remove an account and everything tied to it.
 *
 * Two rows cannot lean on the schema's `onDelete: SetNull` because they carry
 * personal data that would otherwise *survive* the deletion with their foreign
 * key quietly cleared:
 *
 * - `VisitRequest` stores the student's **name, phone and note**.
 * - `Review` stores the author's **display name and comment**.
 *
 * Both are deleted outright here. `Favorite` already cascades but is removed
 * explicitly so the counts are truthful.
 *
 * Listings are deliberately **kept**: a place is a real OpenStreetMap business,
 * not the owner's personal data. Deleting the `Owner` row detaches it
 * (`Place.ownerId` is `onDelete: SetNull`), dropping the business name, phone and
 * verification badge while the listing itself stays browsable.
 *
 * Everything runs in one transaction so a failure cannot strand a half-deleted
 * account.
 */
export async function deleteAccount(userId: string): Promise<DeletedAccountSummary> {
  const prisma = requirePrisma();

  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw HttpError.notFound('This account no longer exists.');

      const owner = await tx.owner.findUnique({ where: { userId } });
      const listingsReleased = owner
        ? await tx.place.count({ where: { ownerId: owner.id } })
        : 0;

      const reviews = await tx.review.deleteMany({ where: { userId } });
      const visitRequests = await tx.visitRequest.deleteMany({ where: { userId } });
      const favorites = await tx.favorite.deleteMany({ where: { userId } });

      // Cascades the owner's offers and clears Place.ownerId via SetNull.
      await tx.owner.deleteMany({ where: { userId } });

      await tx.user.delete({ where: { id: userId } });

      return {
        deleted: true as const,
        email: user.email,
        reviewsRemoved: reviews.count,
        visitRequestsRemoved: visitRequests.count,
        favoritesRemoved: favorites.count,
        listingsReleased,
      };
    });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw unwrapInfrastructureError(error);
  }
}
