import type { OwnerAnalytics, OwnerAnalyticsListing, OwnerAnalyticsPoint } from '@studenthub/types';
import { getPrismaClient } from '../prisma/client.js';
import { unwrapInfrastructureError } from './authService.js';
import { HttpError } from '../utils/httpError.js';

/**
 * Owner analytics, measured from rows the API actually stores.
 *
 * - `views`     ← `PlaceView`, written once per listing-detail fetch
 * - `saves`     ← `Favorite`, a student hearting the listing
 * - `enquiries` ← `VisitRequest`, a student asking to visit
 * - `reviews` / `rating` ← the denormalised counters on `Place`
 *
 * Nothing here is estimated: the only derived number is the percent delta
 * against the previous equally-long window, and it stays `null` when the
 * previous window has no baseline. Buckets are UTC days, and a per-read cap
 * keeps a long history from unbounded memory use.
 */

const DATABASE_MESSAGE =
  'The owner dashboard needs the database. Start PostgreSQL and try again.';

/** Rows read per metric per window; far above real launch volume. */
const ROW_CAP = 50_000;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type Bucket = { views: number; saves: number; enquiries: number };

function emptyBucket(): Bucket {
  return { views: 0, saves: 0, enquiries: 0 };
}

/** UTC midnight `offsetDays` ago; buckets never drift with server timezone. */
function utcDayStart(offsetDays: number): Date {
  const day = new Date();
  day.setUTCHours(0, 0, 0, 0);
  day.setUTCDate(day.getUTCDate() - offsetDays);
  return day;
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Percent change against the previous window, or null without a baseline.
 * Zero-to-zero counts as no change rather than a divide by zero.
 */
export function percentDelta(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Whole-percent shares that always add up to 100 (largest remainder method),
 * so the traffic breakdown never reads 99% or 101%.
 */
export function normalisedShares(values: number[]): number[] {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return values.map(() => 0);

  const exact = values.map((value) => (value / total) * 100);
  const shares = exact.map((value) => Math.floor(value));
  const order = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((left, right) => right.remainder - left.remainder);

  let remaining = 100 - shares.reduce((sum, value) => sum + value, 0);
  for (const entry of order) {
    if (remaining <= 0) break;
    shares[entry.index] += 1;
    remaining -= 1;
  }
  return shares;
}

/** One chart bucket per day, oldest first, always exactly `range` points. */
export function buildSeries(range: 7 | 30, buckets: Map<string, Bucket>): OwnerAnalyticsPoint[] {
  const points: OwnerAnalyticsPoint[] = [];
  for (let offset = range - 1; offset >= 0; offset -= 1) {
    const day = utcDayStart(offset);
    const bucket = buckets.get(isoDay(day)) ?? emptyBucket();
    points.push({
      date: isoDay(day),
      label: range === 7 ? WEEKDAYS[day.getUTCDay()] : String(day.getUTCDate()),
      views: bucket.views,
      saves: bucket.saves,
      enquiries: bucket.enquiries,
    });
  }
  return points;
}


type WindowCounts = {
  /** `YYYY-MM-DD` → counts for that day. */
  buckets: Map<string, Bucket>;
  /** placeId → counts across the window. */
  perPlace: Map<string, Bucket>;
  totals: Bucket;
};

/**
 * Daily and per-listing buckets for one window.
 *
 * Three indexed reads (views, saves, enquiries) are bucketed in memory, which
 * keeps this free of raw SQL while staying cheap: the rows carry only the ids
 * and timestamps the aggregation needs.
 */
async function loadWindow(
  prisma: NonNullable<ReturnType<typeof getPrismaClient>>,
  ownerId: string,
  start: Date,
  end: Date,
): Promise<WindowCounts> {
  const where = { createdAt: { gte: start, lt: end } };
  const buckets = new Map<string, Bucket>();
  const perPlace = new Map<string, Bucket>();
  const totals = emptyBucket();

  const [views, saves, enquiries] = await Promise.all([
    prisma.placeView.findMany({
      where: { place: { ownerId }, ...where },
      select: { placeId: true, createdAt: true },
      take: ROW_CAP,
    }),
    prisma.favorite.findMany({
      where: { place: { ownerId }, ...where },
      select: { placeId: true, createdAt: true },
      take: ROW_CAP,
    }),
    prisma.visitRequest.findMany({
      where: { place: { ownerId }, ...where },
      select: { placeId: true, createdAt: true },
      take: ROW_CAP,
    }),
  ]);

  const tally = (rows: { placeId: string; createdAt: Date }[], key: keyof Bucket) => {
    for (const row of rows) {
      const day = isoDay(row.createdAt);
      const dayBucket = buckets.get(day) ?? emptyBucket();
      dayBucket[key] += 1;
      buckets.set(day, dayBucket);

      const placeBucket = perPlace.get(row.placeId) ?? emptyBucket();
      placeBucket[key] += 1;
      perPlace.set(row.placeId, placeBucket);

      totals[key] += 1;
    }
  };

  tally(views, 'views');
  tally(saves, 'saves');
  tally(enquiries, 'enquiries');

  return { buckets, perPlace, totals };
}


/** GET /api/owner/analytics?range=7|30 */
export async function getOwnerAnalytics(ownerId: string, range: 7 | 30 = 7): Promise<OwnerAnalytics> {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new HttpError(503, DATABASE_MESSAGE);
  }

  try {
    const windowStart = utcDayStart(range - 1);
    const previousStart = utcDayStart(range * 2 - 1);
    const tomorrow = utcDayStart(-1);

    const [places, current, previous, statusRows] = await Promise.all([
      prisma.place.findMany({
        where: { ownerId },
        select: { id: true, name: true, status: true, ratingAvg: true, reviewCount: true },
        orderBy: { name: 'asc' },
      }),
      loadWindow(prisma, ownerId, windowStart, tomorrow),
      loadWindow(prisma, ownerId, previousStart, windowStart),
      prisma.visitRequest.groupBy({
        by: ['status'],
        where: { place: { ownerId }, createdAt: { gte: windowStart, lt: tomorrow } },
        _count: { _all: true },
      }),
    ]);

    const performance = places.map((place) => current.perPlace.get(place.id) ?? emptyBucket());
    const shares = normalisedShares(performance.map((bucket) => bucket.views));
    const reviewTotal = places.reduce((total, place) => total + place.reviewCount, 0);
    const rating = reviewTotal
      ? Number(
          (
            places.reduce((total, place) => total + place.ratingAvg * place.reviewCount, 0) / reviewTotal
          ).toFixed(1),
        )
      : 0;

    const statusCounts = new Map(statusRows.map((row) => [row.status, row._count._all]));

    const listings: OwnerAnalyticsListing[] = places
      .map((place, index) => ({
        placeId: place.id,
        name: place.name,
        status: place.status as OwnerAnalyticsListing['status'],
        views: performance[index].views,
        saves: performance[index].saves,
        enquiries: performance[index].enquiries,
        reviews: place.reviewCount,
        rating: Number(place.ratingAvg.toFixed(1)),
        share: shares[index],
      }))
      .sort((left, right) => right.views - left.views || left.name.localeCompare(right.name));

    return {
      range,
      generatedAt: new Date().toISOString(),
      totals: {
        views: current.totals.views,
        saves: current.totals.saves,
        enquiries: current.totals.enquiries,
        confirmed: statusCounts.get('CONFIRMED') ?? 0,
        completed: statusCounts.get('COMPLETED') ?? 0,
        reviews: reviewTotal,
        rating,
        viewsDelta: percentDelta(current.totals.views, previous.totals.views),
        savesDelta: percentDelta(current.totals.saves, previous.totals.saves),
        enquiriesDelta: percentDelta(current.totals.enquiries, previous.totals.enquiries),
      },
      series: buildSeries(range, current.buckets),
      listings,
    };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw unwrapInfrastructureError(error);
  }
}
