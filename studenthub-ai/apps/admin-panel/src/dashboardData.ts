import type {
  AdminCollegeSummary,
  AdminOverview,
  AdminOwnerSummary,
  AdminPlaceSummary,
  PlaceCategory,
  PlaceStatus,
  VisitRequestStatus,
} from '@studenthub/types';

/**
 * Pure presentation rules for the dashboard.
 *
 * Everything here is side-effect free (type-only imports) so
 * `tests/admin.test.cjs` can transpile and exercise the shipped logic: the
 * category distribution, the rating leaderboard, the review total, the booking
 * breakdown, the real activity feed and the mini-map projection. The screen
 * renders whatever these functions return — no widget invents a number.
 */

/** Human labels for the eleven listing categories. */
export const CATEGORY_LABELS: Record<PlaceCategory, string> = {
  PG: 'PGs',
  HOSTEL: 'Hostels',
  RESTAURANT: 'Restaurants',
  MESS: 'Mess',
  CAFE: 'Cafes',
  LIBRARY: 'Libraries',
  PHARMACY: 'Pharmacies',
  ATM: 'ATMs',
  GROCERY: 'Grocery',
  BUS_STOP: 'Bus Stops',
  GYM: 'Gyms',
};

/** Stable donut/legend colour per category (mirrors the console palette). */
export const CATEGORY_COLORS: Record<PlaceCategory, string> = {
  PG: '#6D28D9',
  HOSTEL: '#EA580C',
  RESTAURANT: '#22A45D',
  MESS: '#0891B2',
  CAFE: '#2563EB',
  LIBRARY: '#7C3AED',
  PHARMACY: '#C026D3',
  ATM: '#4F46E5',
  GROCERY: '#B45309',
  BUS_STOP: '#15815E',
  GYM: '#E0426E',
};

/** One slice of the categories distribution. */
export interface CategoryRow {
  category: PlaceCategory;
  label: string;
  color: string;
  count: number;
  /** Share of all listings, 0-100, rounded. */
  share: number;
}

/**
 * Groups the moderation queue by category.
 *
 * The queue endpoint returns every listing, so this is the whole platform
 * distribution; sorted by count (highest first), then by label for ties.
 */
export function categoryRows(places: AdminPlaceSummary[]): CategoryRow[] {
  const counts = new Map<PlaceCategory, number>();
  for (const place of places) counts.set(place.category, (counts.get(place.category) ?? 0) + 1);
  const total = places.length;
  return [...counts.entries()]
    .map(([category, count]) => ({
      category,
      label: CATEGORY_LABELS[category] ?? category,
      color: CATEGORY_COLORS[category] ?? '#8A87A0',
      count,
      share: total ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/** Total reviews across every listing (sum of each listing's review count). */
export function totalReviews(places: AdminPlaceSummary[]): number {
  return places.reduce((total, place) => total + place.reviewCount, 0);
}

/** `₹5,500/month`, or null when the owner set no price. */
export function priceLabel(place: Pick<AdminPlaceSummary, 'price' | 'priceUnit'>): string | null {
  if (place.price === null) return null;
  return `₹${place.price.toLocaleString('en-IN')}${place.priceUnit ?? ''}`;
}

/** One row of a listing leaderboard (top-rated or most-reviewed). */
export interface RatedRow {
  id: string;
  name: string;
  category: string;
  rating: number;
  reviewCount: number;
  price: string | null;
  image: string | null;
}

function ratedRow(place: AdminPlaceSummary): RatedRow {
  return {
    id: place.id,
    name: place.name,
    category: CATEGORY_LABELS[place.category] ?? place.category,
    rating: place.rating,
    reviewCount: place.reviewCount,
    price: priceLabel(place),
    image: place.imageUrl ?? null,
  };
}

/**
 * The best-rated listings, highest rating first.
 *
 * Listings with no reviews are excluded (a 0-review 5.0 is not a ranking), and
 * ties fall back to review volume so the leaderboard is stable.
 */
export function topRatedPlaces(places: AdminPlaceSummary[], limit = 3): RatedRow[] {
  return places
    .filter((place) => place.reviewCount > 0)
    .sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount)
    .slice(0, limit)
    .map(ratedRow);
}

/** The most-reviewed listings (drives the Reviews screen table). */
export function mostReviewedPlaces(places: AdminPlaceSummary[], limit = 8): RatedRow[] {
  return places
    .filter((place) => place.reviewCount > 0)
    .sort((a, b) => b.reviewCount - a.reviewCount || b.rating - a.rating)
    .slice(0, limit)
    .map(ratedRow);
}

/** A generic `label + count + share` breakdown row. */
export interface SummaryRow {
  status: string;
  count: number;
  /** Share of the total, 0-100, rounded. */
  share: number;
}

function summarise(counts: { status: string; count: number }[]): SummaryRow[] {
  const total = counts.reduce((sum, row) => sum + row.count, 0);
  return counts
    .filter((row) => row.count > 0)
    .map((row) => ({ ...row, share: total ? Math.round((row.count / total) * 100) : 0 }));
}

/** Real booking (visit-request) breakdown, lifecycle order. */
export function visitSummaryRows(overview: AdminOverview): SummaryRow[] {
  const order: VisitRequestStatus[] = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];
  return summarise(order.map((status) => ({ status, count: overview.visitRequests[status] ?? 0 })));
}

/** Listing-status breakdown as summary rows (Listings / Reports tables). */
export function placeSummaryRows(overview: AdminOverview): SummaryRow[] {
  const order: PlaceStatus[] = ['PENDING', 'ACTIVE', 'REJECTED', 'INACTIVE', 'DRAFT'];
  return summarise(order.map((status) => ({ status, count: overview.places[status] ?? 0 })));
}

/** Small trend arrays feeding the stat-card sparklines (real counts, no time axis). */
export interface TrendSet {
  users: number[];
  listings: number[];
  bookings: number[];
  reviews: number[];
}

export function statTrends(overview: AdminOverview, places: AdminPlaceSummary[]): TrendSet {
  const statusOrder: PlaceStatus[] = ['PENDING', 'ACTIVE', 'REJECTED', 'INACTIVE', 'DRAFT'];
  const visitOrder: VisitRequestStatus[] = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];
  const reviews = [...places]
    .sort((a, b) => a.reviewCount - b.reviewCount)
    .slice(-6)
    .map((place) => place.reviewCount);
  return {
    users: [overview.users.students, overview.users.owners, overview.users.admins],
    listings: statusOrder.map((status) => overview.places[status] ?? 0),
    bookings: visitOrder.map((status) => overview.visitRequests[status] ?? 0),
    reviews: reviews.length ? reviews : [0],
  };
}

/** One entry of the real activity feed. */
export interface ActivityItem {
  id: string;
  tone: 'green' | 'orange' | 'pink' | 'blue';
  icon: string;
  title: string;
  detail: string;
  time: string;
}

/** `2 mins ago` / `3 hours ago` / `5 days ago` from an ISO timestamp. */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return '';
  const minutes = Math.max(0, Math.round((now - then) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

/**
 * The activity feed, built only from real rows: the newest listing, the newest
 * business, the pending-queue size and the platform review total. Nothing here
 * appears unless the corresponding row exists in the payload.
 */
export function activityFromReal(
  places: AdminPlaceSummary[],
  owners: AdminOwnerSummary[],
  overview: AdminOverview,
  now: number = Date.now(),
): ActivityItem[] {
  const items: ActivityItem[] = [];
  const newest = [...places].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
  if (newest) {
    items.push({
      id: `place-${newest.id}`,
      tone: 'green',
      icon: '＋',
      title: 'New listing added',
      detail: `${newest.name} · ${CATEGORY_LABELS[newest.category] ?? newest.category}`,
      time: relativeTime(newest.createdAt, now),
    });
  }
  const newestOwner = [...owners].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
  if (newestOwner) {
    items.push({
      id: `owner-${newestOwner.id}`,
      tone: 'blue',
      icon: '☺',
      title: 'Business registered',
      detail: newestOwner.businessName,
      time: relativeTime(newestOwner.createdAt, now),
    });
  }
  const pending = overview.places.PENDING ?? 0;
  if (pending > 0) {
    items.push({
      id: 'pending',
      tone: 'orange',
      icon: '⏳',
      title: 'Listings awaiting review',
      detail: `${pending} listing${pending === 1 ? '' : 's'} in the moderation queue`,
      time: 'now',
    });
  }
  const reviews = totalReviews(places);
  if (reviews > 0) {
    items.push({
      id: 'reviews',
      tone: 'pink',
      icon: '★',
      title: 'Reviews on the platform',
      detail: `${reviews} review${reviews === 1 ? '' : 's'} across ${places.length} listing${places.length === 1 ? '' : 's'}`,
      time: 'today',
    });
  }
  return items;
}

/** A college pin projected into the mini-map box (0-1 coordinates). */
export interface MapPin {
  id: string;
  label: string;
  city: string;
  /** Horizontal position, 0 (left) - 1 (right). */
  x: number;
  /** Vertical position, 0 (top) - 1 (bottom). */
  y: number;
  primary: boolean;
}

/**
 * Projects college coordinates into the mini-map box.
 *
 * Longitude maps left→right and latitude top→bottom (north up), padded so pins
 * never sit on the border. A single college — or a cluster at one point — is
 * centred. The busiest college is the primary pin.
 */
export function mapPins(colleges: AdminCollegeSummary[]): MapPin[] {
  if (colleges.length === 0) return [];
  const lngs = colleges.map((college) => college.longitude);
  const lats = colleges.map((college) => college.latitude);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const spanLng = maxLng - minLng || 1;
  const spanLat = maxLat - minLat || 1;
  const pad = 0.14;
  /** Position along one axis, padded so pins clear the edge; centred when alone. */
  const axis = (value: number, min: number, span: number) =>
    colleges.length === 1 ? 0.5 : pad + ((value - min) / span) * (1 - 2 * pad);
  const busiest = [...colleges].sort((a, b) => b.placeCount - a.placeCount)[0];
  return colleges.map((college) => ({
    id: college.id,
    label: college.name,
    city: college.city,
    x: axis(college.longitude, minLng, spanLng),
    y: 1 - axis(college.latitude, minLat, spanLat),
    primary: college.id === busiest.id,
  }));
}



