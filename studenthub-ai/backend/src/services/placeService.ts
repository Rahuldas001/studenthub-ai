import type {
  CategoryCounts,
  PlaceCategory,
  PlaceDetails,
  PlacesPayload,
  PlacesQuery,
  PlaceSummary,
} from '@studenthub/types';
import { withDatabase } from '../prisma/client.js';
import type { DemoPlace } from '../data/demoPlaces.js';
import {
  DEMO_COLLEGE,
  DEMO_PLACES,
  DEMO_REVIEWS,
  demoFacilitiesFor,
  demoImagesFor,
} from '../data/demoPlaces.js';
import { distanceInKm } from '../utils/geo.js';
import { sanitizeText } from '../utils/sanitize.js';

/**
 * Place queries.
 *
 * Every function prefers PostgreSQL and silently falls back to the bundled demo
 * dataset when the database is unavailable, so the student app always has a
 * working API during development.
 */

const CATEGORY_ORDER: PlaceCategory[] = [
  'HOSTEL',
  'PG',
  'RESTAURANT',
  'MESS',
  'CAFE',
  'LIBRARY',
  'PHARMACY',
  'ATM',
  'GROCERY',
  'BUS_STOP',
  'GYM',
];

/** Reference point used for distance when the client sends no coordinates. */
const DEFAULT_ORIGIN = {
  latitude: DEMO_COLLEGE.latitude,
  longitude: DEMO_COLLEGE.longitude,
};

export async function listPlaces(query: PlacesQuery): Promise<PlacesPayload> {
  const origin =
    query.latitude !== undefined && query.longitude !== undefined
      ? { latitude: query.latitude, longitude: query.longitude }
      : DEFAULT_ORIGIN;

  const fromDatabase = await withDatabase(
    async (prisma) => {
      const rows = await prisma.place.findMany({
        where: {
          status: 'ACTIVE',
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
                  {
                    description: {
                      contains: query.search,
                      mode: 'insensitive' as const,
                    },
                  },
                  {
                    address: { contains: query.search, mode: 'insensitive' as const },
                  },
                ],
              }
            : {}),
        },
        include: { facilities: { include: { facility: true } } },
        take: 200,
      });

      return rows.map((row) => mapDatabasePlace(row, origin));
    },
    null,
    (error) =>
      console.warn(
        '[studenthub] places: using demo dataset —',
        error instanceof Error ? error.message : error,
      ),
  );

  const places = sortPlaces(
    (fromDatabase ?? mapDemoPlaces(origin)).filter((place) =>
      matchesFilters(place, query),
    ),
    query.sort ?? 'relevance',
  );

  return {
    places,
    meta: {
      total: places.length,
      countsByCategory: await countByCategory(),
      demoData: fromDatabase === null,
    },
  };
}

export async function getPlaceById(id: string): Promise<PlaceDetails | null> {
  const fromDatabase = await withDatabase(
    (prisma) =>
      prisma.place.findFirst({
        // Only approved listings are public: PENDING/REJECTED/INACTIVE entries
        // must stay invisible even when someone knows the id.
        where: { id, status: 'ACTIVE' },
        include: {
          facilities: { include: { facility: true } },
          reviews: { orderBy: { createdAt: 'desc' }, take: 20 },
        },
      }),
    undefined,
  );

  if (fromDatabase) {
    const row = fromDatabase as DatabasePlaceRow;
    const summary = mapDatabasePlace(row, DEFAULT_ORIGIN);
    return {
      ...summary,
      description: row.description,
      phone: row.phone,
      whatsapp: row.whatsapp,
      openingHours: row.openingHours,
      priceBand: row.priceBand as PlaceDetails['priceBand'],
      status: row.status as PlaceDetails['status'],
      images: row.images.length > 0 ? row.images : [row.imageUrl],
      reviews: (row.reviews ?? []).map((review) => ({
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
  }

  return getDemoPlaceById(id);
}

/**
 * Records one anonymous listing view.
 *
 * Called after a successful `GET /api/places/:id`, which is what the owner
 * analytics screen counts. No user id, no IP: just "this listing was opened".
 * Failures are swallowed by `withDatabase`, so traffic recording can never
 * break a student's read (and is skipped entirely in demo mode).
 */
export async function recordPlaceView(placeId: string): Promise<void> {
  await withDatabase(
    (prisma) => prisma.placeView.create({ data: { placeId } }),
    null,
  );
}

/** Detail lookup against the demo dataset (also used as an API fallback). */
export function getDemoPlaceById(id: string): PlaceDetails | null {
  const found = DEMO_PLACES.find((place) => place.id === id);
  if (!found) return null;

  const [located] = withDistance([found]);
  if (!located) return null;

  return {
    ...toSummary(located),
    description: located.description,
    phone: located.phone,
    // The bundled demo dataset has no owner-authored contact extras.
    whatsapp: null,
    openingHours: null,
    priceBand: null,
    status: located.status,
    images: demoImagesFor(id),
    reviews: DEMO_REVIEWS.filter((review) => review.placeId === id).map((review) => ({
      ...review,
    })),
  };
}

export async function countByCategory(): Promise<CategoryCounts> {
  const fromDatabase = await withDatabase(
    (prisma) =>
      prisma.place.groupBy({
        by: ['category'],
        where: { status: 'ACTIVE' },
        _count: { _all: true },
      }),
    null,
  );

  if (fromDatabase) {
    const counts: CategoryCounts = {};
    for (const row of fromDatabase) {
      counts[row.category] = row._count._all;
    }
    return counts;
  }

  // Demo counts: intentionally larger than the seeded sample so the Home cards
  // resemble a populated city while remaining clearly labelled as demo data.
  const counts: CategoryCounts = {
    HOSTEL: 128,
    PG: 312,
    RESTAURANT: 245,
    MESS: 64,
    CAFE: 86,
    LIBRARY: 12,
    PHARMACY: 27,
    ATM: 22,
    GROCERY: 41,
    BUS_STOP: 9,
    GYM: 18,
  };
  return counts;
}

function matchesFilters(place: PlaceSummary, query: PlacesQuery): boolean {
  if (query.category && place.category !== query.category) return false;
  if (query.gender && place.gender !== query.gender) return false;
  if (query.maxPrice !== undefined && (place.price ?? Infinity) > query.maxPrice) {
    return false;
  }
  if (query.minPrice !== undefined && (place.price ?? 0) < query.minPrice) {
    return false;
  }
  if (
    query.radius !== undefined &&
    (place.distanceKm ?? Infinity) > query.radius
  ) {
    return false;
  }
  if (query.search) {
    const haystack = [
      place.name,
      place.address,
      place.category,
      ...place.facilities.map((facility) => facility.name),
    ]
      .join(' ')
      .toLowerCase();

    const keywords = sanitizeText(query.search, 200)
      .toLowerCase()
      .split(' ')
      .filter((word) => word.length > 2 && !STOP_WORDS.has(word));

    if (keywords.length > 0 && !keywords.every((word) => haystack.includes(word))) {
      return false;
    }
  }
  return true;
}

const STOP_WORDS = new Set(['near', 'under', 'within', 'the', 'and', 'for', 'with']);

function sortPlaces(places: PlaceSummary[], sort: PlacesQuery['sort']): PlaceSummary[] {
  const sorted = [...places];

  switch (sort) {
    case 'distance':
      return sorted.sort(
        (a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity),
      );
    case 'price':
      return sorted.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    case 'rating':
      return sorted.sort((a, b) => b.rating - a.rating);
    default:
      return sorted.sort((a, b) => {
        const scoreA = a.rating * 10 - (a.distanceKm ?? 5) * 4 - (a.verified ? 0 : 2);
        const scoreB = b.rating * 10 - (b.distanceKm ?? 5) * 4 - (b.verified ? 0 : 2);
        return scoreB - scoreA;
      });
  }
}

function mapDemoPlaces(origin: { latitude: number; longitude: number }): PlaceSummary[] {
  return DEMO_PLACES.map((place) =>
    toSummary({
      ...place,
      distanceKm: distanceInKm(origin, {
        latitude: place.latitude,
        longitude: place.longitude,
      }),
    }),
  );
}

/**
 * Fills in `distanceKm` for demo places that carry absolute coordinates only.
 *
 * Generic over the demo shape so detail-only fields (`description`, `phone`) are
 * preserved for `getDemoPlaceById`.
 */
function withDistance(places: DemoPlace[]): DemoPlace[] {
  return places.map((place) => ({
    ...place,
    distanceKm:
      place.distanceKm ??
      distanceInKm(DEFAULT_ORIGIN, {
        latitude: place.latitude,
        longitude: place.longitude,
      }),
  }));
}

/**
 * Source shape for `toSummary`: a summary whose facilities may not be resolved
 * yet, as is the case for the bundled demo dataset.
 */
type SummarySource = Omit<PlaceSummary, 'facilities'> & {
  facilities?: PlaceSummary['facilities'];
};

/**
 * Drops detail-only fields so list payloads stay small, resolving demo
 * facilities when they are not already attached.
 */
function toSummary(place: SummarySource): PlaceSummary {
  return {
    id: place.id,
    category: place.category,
    name: place.name,
    address: place.address,
    latitude: place.latitude,
    longitude: place.longitude,
    price: place.price,
    priceUnit: place.priceUnit,
    rating: place.rating,
    reviewCount: place.reviewCount,
    distanceKm: place.distanceKm,
    imageUrl: place.imageUrl,
    gender: place.gender,
    verified: place.verified,
    facilities: place.facilities ?? demoFacilitiesFor(place.id),
  };
}

/**
 * Structural view of a Prisma `Place` row with the relations the API needs.
 *
 * Declared structurally instead of importing generated Prisma types so the
 * service keeps working (and type-checking) before `prisma generate` has been
 * run on a fresh clone.
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
  facilities?: Array<{
    facility: { id: string; name: string; icon: string | null };
  }>;
  reviews?: Array<{
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
    distanceKm: distanceInKm(origin, {
      latitude: row.latitude,
      longitude: row.longitude,
    }),
    imageUrl: row.imageUrl,
    gender: row.gender as PlaceSummary['gender'],
    verified: row.verified,
    facilities: (row.facilities ?? []).map((link) => link.facility),
  };
}

export { CATEGORY_ORDER };