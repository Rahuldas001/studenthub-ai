import type {
  CategoryCounts,
  PlaceCategory,
  PlaceDetails,
  PlacesPayload,
  PlacesQuery,
  PlaceSummary,
} from '@studenthub/types';
import { getPrismaClient } from '../prisma/client.js';
import { distanceInKm } from '../utils/geo.js';
import { HttpError } from '../utils/httpError.js';
import { sanitizeText } from '../utils/sanitize.js';
import { unwrapInfrastructureError } from './authService.js';

/**
 * Place queries over PostgreSQL.
 *
 * Listings are REAL businesses imported from OpenStreetMap (see
 * `prisma/import-osm.ts`). There is no bundled demo dataset any more, so a
 * missing database is an explicit 503 rather than a silent fallback to
 * fictional places.
 */

/** Reference point used for distance when the client sends no coordinates. */
const DEFAULT_ORIGIN = { latitude: 26.1535, longitude: 91.6646 };

/** Rows read per geo query; the radius filter is applied in SQL first. */
const GEO_TAKE = 1000;

const DATABASE_MESSAGE =
  'Place listings need the database. Start PostgreSQL (npm run db:up) and try again.';

function requirePrisma() {
  const prisma = getPrismaClient();
  if (!prisma) throw new HttpError(503, DATABASE_MESSAGE);
  return prisma;
}

/**
 * Latitude/longitude window covering `radius` km around the origin.
 *
 * Filtering in the database matters: with hundreds of real listings a plain
 * `take` truncates *before* the distance filter, so a city outside the first
 * slice (Dhubri, say) would come back empty. ~111 km per degree of latitude;
 * longitude is scaled by cos(latitude).
 */
function boundingBox(origin: { latitude: number; longitude: number }, radiusKm: number) {
  const latDelta = radiusKm / 111;
  const cosLat = Math.max(Math.cos((origin.latitude * Math.PI) / 180), 0.01);
  const lonDelta = radiusKm / (111 * cosLat);
  return {
    latitude: { gte: origin.latitude - latDelta, lte: origin.latitude + latDelta },
    longitude: { gte: origin.longitude - lonDelta, lte: origin.longitude + lonDelta },
  };
}

export async function listPlaces(query: PlacesQuery): Promise<PlacesPayload> {
  const prisma = requirePrisma();
  const origin =
    query.latitude !== undefined && query.longitude !== undefined
      ? { latitude: query.latitude, longitude: query.longitude }
      : DEFAULT_ORIGIN;

  try {
    const rows = await prisma.place.findMany({
      where: {
        status: 'ACTIVE',
        // Narrow to the requested neighbourhood in SQL, so the row cap cannot
        // hide a whole city behind whatever happened to sort first.
        ...(query.radius !== undefined ? boundingBox(origin, query.radius) : {}),
        ...(query.category ? { category: query.category } : {}),
        ...(query.gender ? { gender: query.gender } : {}),
        ...(query.maxPrice || query.minPrice
          ? {
              price: {
                ...(query.minPrice ? { gte: query.minPrice } : {}),
                ...(query.maxPrice ? { lte: query.maxPrice } : {}),
              },
            }
          : {}),
        ...(query.search
          ? {
              OR: [
                { name: { contains: query.search, mode: 'insensitive' as const } },
                { description: { contains: query.search, mode: 'insensitive' as const } },
                { address: { contains: query.search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      include: { facilities: { include: { facility: true } } },
      take: GEO_TAKE,
    });

    const places = sortPlaces(
      rows.map((row) => mapDatabasePlace(row as unknown as DatabasePlaceRow, origin)).filter((place) =>
        matchesFilters(place, query),
      ),
      query.sort ?? 'relevance',
    );

    return {
      places,
      meta: {
        total: places.length,
        countsByCategory: await countByCategory(),
        // All listings come from PostgreSQL, so this is never demo data.
        demoData: false,
      },
    };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw unwrapInfrastructureError(error);
  }
}

export async function getPlaceById(id: string): Promise<PlaceDetails | null> {
  const prisma = requirePrisma();

  try {
    // Only approved listings are public: PENDING/REJECTED/INACTIVE entries must
    // stay invisible even when someone knows the id.
    const row = await prisma.place.findFirst({
      where: { id, status: 'ACTIVE' },
      include: {
        facilities: { include: { facility: true } },
        reviews: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!row) return null;

    const data = row as unknown as DatabasePlaceRow & {
      reviews: Array<{
        id: string;
        placeId: string;
        authorName: string;
        rating: number;
        comment: string;
        reply: string | null;
        repliedAt: Date | null;
        createdAt: Date;
      }>;
    };
    const summary = mapDatabasePlace(data, DEFAULT_ORIGIN);
    return {
      ...summary,
      description: data.description,
      phone: data.phone,
      whatsapp: data.whatsapp,
      openingHours: data.openingHours,
      priceBand: data.priceBand as PlaceDetails['priceBand'],
      status: data.status as PlaceDetails['status'],
      images: data.images.length > 0 ? data.images : [data.imageUrl],
      reviews: data.reviews.map((review) => ({
        id: review.id,
        placeId: review.placeId,
        authorName: review.authorName,
        rating: review.rating,
        comment: review.comment,
        reply: review.reply,
        repliedAt: review.repliedAt?.toISOString() ?? null,
        createdAt: review.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw unwrapInfrastructureError(error);
  }
}

/**
 * Records one anonymous listing view.
 *
 * Called after a successful `GET /api/places/:id`, which is what the owner
 * analytics screen counts. No user id, no IP: just "this listing was opened".
 */
export async function recordPlaceView(placeId: string): Promise<void> {
  const prisma = getPrismaClient();
  if (!prisma) return;
  try {
    await prisma.placeView.create({ data: { placeId } });
  } catch {
    // Traffic recording must never break a student's read.
  }
}

export async function countByCategory(): Promise<CategoryCounts> {
  const prisma = requirePrisma();
  const rows = await prisma.place.groupBy({
    by: ['category'],
    where: { status: 'ACTIVE' },
    _count: { _all: true },
  });
  const counts: CategoryCounts = {};
  for (const row of rows) counts[row.category] = row._count._all;
  return counts;
}

const STOP_WORDS = new Set(['near', 'under', 'within', 'the', 'and', 'for', 'with']);

function matchesFilters(place: PlaceSummary, query: PlacesQuery): boolean {
  if (query.category && place.category !== query.category) return false;
  if (query.gender && place.gender !== query.gender) return false;
  if (query.maxPrice !== undefined && (place.price ?? Infinity) > query.maxPrice) return false;
  if (query.minPrice !== undefined && (place.price ?? 0) < query.minPrice) return false;
  if (query.radius !== undefined && (place.distanceKm ?? Infinity) > query.radius) return false;
  if (query.search) {
    const haystack = [place.name, place.address, place.category]
      .join(' ')
      .toLowerCase();
    const keywords = sanitizeText(query.search, 200)
      .toLowerCase()
      .split(' ')
      .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
    if (keywords.length > 0 && !keywords.every((word) => haystack.includes(word))) return false;
  }
  return true;
}

function sortPlaces(places: PlaceSummary[], sort: PlacesQuery['sort']): PlaceSummary[] {
  const sorted = [...places];
  switch (sort) {
    case 'distance':
      return sorted.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    case 'price':
      return sorted.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    case 'rating':
      return sorted.sort((a, b) => b.rating - a.rating);
    default:
      // Listings start unrated (OSM has no ratings), so distance leads and
      // rating only breaks ties between equally close places.
      return sorted.sort((a, b) => {
        const scoreA = a.rating * 2 - (a.distanceKm ?? 5) - (a.verified ? 0 : 0.25);
        const scoreB = b.rating * 2 - (b.distanceKm ?? 5) - (b.verified ? 0 : 0.25);
        return scoreB - scoreA;
      });
  }
}

/**
 * Structural view of a Prisma `Place` row.
 *
 * Declared structurally instead of importing generated Prisma types so the
 * service keeps type-checking before `prisma generate` on a fresh clone.
 */
type DatabasePlaceRow = {
  id: string;
  category: string;
  name: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  price: number | null;
  priceUnit: string | null;
  phone: string | null;
  whatsapp: string | null;
  openingHours: string | null;
  priceBand: string | null;
  imageUrl: string;
  images: string[];
  gender: string | null;
  verified: boolean;
  status: string;
  ratingAvg: number;
  reviewCount: number;
  facilities?: Array<{ facility: { id: string; name: string; icon: string | null } }>;
};

function mapDatabasePlace(
  row: DatabasePlaceRow,
  origin: { latitude: number; longitude: number },
): PlaceSummary {
  return {
    id: row.id,
    category: row.category as PlaceCategory,
    name: row.name,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    price: row.price,
    priceUnit: row.priceUnit,
    rating: Number(row.ratingAvg.toFixed(1)),
    reviewCount: row.reviewCount,
    distanceKm: distanceInKm(origin, { latitude: row.latitude, longitude: row.longitude }),
    imageUrl: row.imageUrl,
    gender: row.gender as PlaceSummary['gender'],
    verified: row.verified,
    facilities: (row.facilities ?? []).map((link) => link.facility),
  };
}
