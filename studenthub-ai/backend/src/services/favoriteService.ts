import { withDatabase } from '../prisma/client.js';

export type FavoriteRecord = {
  placeId: string;
  createdAt: string;
};

/**
 * Favourites for a signed-in student; guests fall back to device storage.
 *
 * `Favorite.userId` is a foreign key, so the guest sentinel 'guest' only ever
 * produces the graceful not-persisted result from `withDatabase` — which is
 * exactly what V1 wants. Signed-in students (real `req.user.id` from the auth
 * middleware) get rows that persist and follow them across devices.
 */
export async function listFavorites(userId: string): Promise<FavoriteRecord[]> {
  return withDatabase(
    async (prisma) => {
      const rows = await prisma.favorite.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      return rows.map((row) => ({
        placeId: row.placeId,
        createdAt: row.createdAt.toISOString(),
      }));
    },
    [],
  );
}

export async function addFavorite(
  userId: string,
  placeId: string,
): Promise<FavoriteRecord> {
  const created = await withDatabase(
    (prisma) =>
      prisma.favorite.upsert({
        where: { userId_placeId: { userId, placeId } },
        create: { userId, placeId },
        update: {},
      }),
    null,
  );

  return {
    placeId,
    createdAt: (created?.createdAt ?? new Date()).toISOString(),
  };
}

export async function removeFavorite(
  userId: string,
  placeId: string,
): Promise<{ placeId: string; removed: boolean }> {
  const removed = await withDatabase(
    async (prisma) => {
      const result = await prisma.favorite.deleteMany({ where: { userId, placeId } });
      return result.count > 0;
    },
    false,
  );

  return { placeId, removed };
}