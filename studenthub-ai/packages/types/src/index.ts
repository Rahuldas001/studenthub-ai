/**
 * Shared, type-only contracts for StudentHub AI.
 *
 * This package intentionally exposes types only (no runtime code) so the
 * student app and the backend can share contracts without a build step.
 * Always import from it with `import type { ... }`.
 */

/** Place categories supported in V1. */
export type PlaceCategory =
  | 'PG'
  | 'HOSTEL'
  | 'RESTAURANT'
  | 'MESS'
  | 'CAFE'
  | 'LIBRARY'
  | 'PHARMACY'
  | 'ATM'
  | 'GROCERY'
  | 'BUS_STOP'
  | 'GYM';

/** Moderation lifecycle for a listing. */
export type PlaceStatus = 'DRAFT' | 'PENDING' | 'ACTIVE' | 'REJECTED' | 'INACTIVE';

/** Who a PG/hostel listing is intended for. */
export type PlaceGender = 'BOYS' | 'GIRLS' | 'CO_ED';

/** Price cue students scan for (₹ / ₹₹ / ₹₹₹). */
export type PriceBand = 'BUDGET' | 'MID' | 'PREMIUM';

export interface Facility {
  id: string;
  name: string;
  /** Lucide icon name used by the student app to render the badge. */
  icon: string | null;
}

export interface Review {
  id: string;
  placeId: string;
  authorName: string;
  rating: number;
  comment: string;
  /** Public answer from the business owner; null until they reply. */
  reply?: string | null;
  repliedAt?: string | null;
  createdAt: string;
}

export interface PlaceSummary {
  id: string;
  category: PlaceCategory;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  price: number | null;
  priceUnit: string | null;
  rating: number;
  reviewCount: number;
  distanceKm: number | null;
  imageUrl: string;
  gender: PlaceGender | null;
  verified: boolean;
  facilities: Facility[];
}

export interface PlaceDetails extends PlaceSummary {
  description: string;
  phone: string | null;
  /** WhatsApp number, when the owner set one; falls back to `phone` in the UI. */
  whatsapp: string | null;
  /** Human-readable opening hours; null when the owner has not set them. */
  openingHours: string | null;
  priceBand: PriceBand | null;
  status: PlaceStatus;
  images: string[];
  reviews: Review[];
}

export interface College {
  id: string;
  name: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
}

/** Aggregated counts used by the Home screen "Near <college>" cards. */
export type CategoryCounts = Partial<Record<PlaceCategory, number>>;

export interface PlacesQuery {
  category?: PlaceCategory;
  search?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  minPrice?: number;
  maxPrice?: number;
  gender?: PlaceGender;
  sort?: 'relevance' | 'distance' | 'price' | 'rating';
}

export interface PlacesPayload {
  places: PlaceSummary[];
  meta: {
    total: number;
    countsByCategory: CategoryCounts;
    /** True when the payload was generated from demo seed data. */
    demoData: boolean;
  };
}

export interface ReviewInput {
  placeId: string;
  rating: number;
  comment: string;
  authorName?: string;
}

export interface FavoriteInput {
  placeId: string;
}

export interface VisitRequestInput {
  placeId: string;
  name: string;
  phone: string;
  preferredDate?: string;
  note?: string;
}

/** Roles a user account can hold. Owner/Admin dashboards arrive in later phases. */
export type UserRole = 'STUDENT' | 'OWNER' | 'ADMIN';

/** Public representation of an account. Never includes the password hash. */
export interface SessionUser {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  /** Home city chosen at registration; null for accounts created before this. */
  city?: string | null;
}

/** Returned by register/login: a bearer token plus the account it belongs to. */
export interface AuthPayload {
  token: string;
  user: SessionUser;
}

/** Body for POST /api/auth/register. At least one of email/phone is required. */
export interface RegisterInput {
  displayName: string;
  email?: string;
  phone?: string;
  password: string;
  /** Home city used for location-based discovery (e.g. "Dhubri"). */
  city?: string;
}

/** Body for POST /api/auth/login. The identifier is an email or phone number. */
export interface LoginInput {
  identifier: string;
  password: string;
}

/** Lifecycle of a student visit request; owners move PENDING → CONFIRMED/CANCELLED. */
export type VisitRequestStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

/** Business profile linked to an OWNER account. */
export interface OwnerProfile {
  id: string;
  businessName: string;
  phone: string | null;
  verified: boolean;
  /** City where the business operates; null for profiles created before this. */
  city?: string | null;
}

/** Body for POST /api/auth/owner/register. */
export interface OwnerRegisterInput extends RegisterInput {
  businessName: string;
  businessPhone?: string;
}

/** Owner registration response: session plus the business profile. */
export interface OwnerAuthPayload {
  token: string;
  user: SessionUser;
  owner: OwnerProfile;
}

/** Body for POST /api/owner/profile (OWNER accounts created without one). */
export interface OwnerProfileInput {
  businessName: string;
  businessPhone?: string;
  /** City where the business operates. */
  city?: string;
}

/**
 * Body for POST /api/owner/places.
 *
 * New listings enter PENDING review; only ACTIVE places appear in student
 * discovery. `collegeId` links the listing to a college when known.
 */
export interface OwnerPlaceInput {
  category: PlaceCategory;
  name: string;
  description?: string;
  address: string;
  latitude: number;
  longitude: number;
  price?: number | null;
  priceUnit?: string | null;
  phone?: string;
  /** Optional WhatsApp number students message instead of calling. */
  whatsapp?: string | null;
  /** Free-text opening hours, usually picked from the presets. */
  openingHours?: string | null;
  priceBand?: PriceBand | null;
  imageUrl: string;
  gender?: PlaceGender;
  collegeId?: string;
  /** Facility names; catalogue entries are created on demand. */
  facilities?: string[];
}

/**
 * Body for PATCH /api/owner/places/:id.
 *
 * Editing an ACTIVE listing sends it back to PENDING for re-review; owners
 * can also explicitly unpublish (INACTIVE) or resubmit (PENDING).
 */
export interface OwnerPlaceUpdateInput extends Partial<OwnerPlaceInput> {
  status?: 'PENDING' | 'INACTIVE';
}

/**
 * Owner-scoped listing row with moderation status and pending request count.
 *
 * `imageUrl`, `description`, `phone` and `facilities` are optional so other
 * summaries that extend this shape (admin rows) stay valid, but the owner
 * endpoints always fill them so the owner app can render cards and pre-fill
 * the edit form without a second request per listing.
 */
export interface OwnerPlaceSummary {
  id: string;
  category: PlaceCategory;
  name: string;
  address: string;
  price: number | null;
  priceUnit: string | null;
  status: PlaceStatus;
  verified: boolean;
  rating: number;
  reviewCount: number;
  pendingRequests: number;
  createdAt: string;
  updatedAt: string;
  /** Cover photo, used by the owner listing cards and profile preview. */
  imageUrl?: string | null;
  /** Listing description exactly as the owner saved it. */
  description?: string | null;
  /** Public contact number shown on the student page. */
  phone?: string | null;
  /** WhatsApp number students can message; null when unset. */
  whatsapp?: string | null;
  /** Opening hours shown on the student page; null when unset. */
  openingHours?: string | null;
  /** ₹ / ₹₹ / ₹₹₹ cue; null when the owner has not picked one. */
  priceBand?: PriceBand | null;
  /** Facility names attached to the listing. */
  facilities?: Facility[];
  /** Coordinates as saved, so the edit form prefills without a second call. */
  latitude?: number;
  longitude?: number;
  /** PG/hostel audience; null for categories open to everyone. */
  gender?: PlaceGender | null;
}

/** Visit request as seen in the owner inbox. */
export interface OwnerVisitRequest {
  id: string;
  placeId: string;
  placeName: string;
  name: string;
  phone: string;
  preferredDate: string | null;
  note: string | null;
  status: VisitRequestStatus;
  createdAt: string;
}

/**
 * Promotional offer as stored by the API.
 *
 * `placeId` is null when the offer applies to every listing the owner runs;
 * `validTill` is null when it never expires.
 */
export interface OwnerOffer {
  id: string;
  placeId: string | null;
  /** Listing name for the card caption, filled by the API. */
  placeName: string | null;
  title: string;
  description: string;
  /** Whole percent, 1-90. */
  discount: number;
  validTill: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Body for POST /api/owner/offers. */
export interface OwnerOfferInput {
  /** Omit or null to target every listing. */
  placeId?: string | null;
  title: string;
  description: string;
  discount: number;
  /** 'YYYY-MM-DD'; omit for no expiry. */
  validTill?: string | null;
}

/** Body for PATCH /api/owner/offers/:id. */
export interface OwnerOfferUpdateInput extends Partial<OwnerOfferInput> {
  active?: boolean;
}

/** Review as seen in the owner inbox: public fields plus the listing name. */
export interface OwnerReview extends Review {
  placeName: string;
}

/** Body for POST /api/owner/reviews/:id/reply. */
export interface OwnerReviewReplyInput {
  reply: string;
}

/**
 * One day of owner activity. Every number is measured from real rows:
 * `views` from `PlaceView`, `saves` from `Favorite`, `enquiries` from
 * `VisitRequest`.
 */
export interface OwnerAnalyticsPoint {
  /** 'YYYY-MM-DD'. */
  date: string;
  /** Short chart label: weekday for 7 days, day-of-month for 30. */
  label: string;
  views: number;
  saves: number;
  enquiries: number;
}

/** Window totals, with deltas against the immediately preceding window. */
export interface OwnerAnalyticsTotals {
  views: number;
  saves: number;
  enquiries: number;
  confirmed: number;
  completed: number;
  reviews: number;
  rating: number;
  /** Percent change vs the previous window; null when there is no baseline. */
  viewsDelta: number | null;
  savesDelta: number | null;
  enquiriesDelta: number | null;
}

/** Per-listing row for the analytics table. */
export interface OwnerAnalyticsListing {
  placeId: string;
  name: string;
  status: PlaceStatus;
  views: number;
  saves: number;
  enquiries: number;
  reviews: number;
  rating: number;
  /** Share of the owner's views in the window, 0-100. */
  share: number;
}

/** Payload for GET /api/owner/analytics?range=7|30. */
export interface OwnerAnalytics {
  range: 7 | 30;
  generatedAt: string;
  totals: OwnerAnalyticsTotals;
  /** Daily series, oldest first; always exactly `range` points. */
  series: OwnerAnalyticsPoint[];
  /** Sorted by views, highest first. */
  listings: OwnerAnalyticsListing[];
}


export type AdminModerationStatus = 'ACTIVE' | 'REJECTED' | 'INACTIVE';

/** Admin-scoped listing row; adds the owning business name to the owner view. */
export interface AdminPlaceSummary extends OwnerPlaceSummary {
  /** Business name of the listing's owner; null for admin-entered listings. */
  ownerName: string | null;
}

/** Platform overview numbers for the admin dashboard. */
export interface AdminOverview {
  users: { students: number; owners: number; admins: number };
  places: Partial<Record<PlaceStatus, number>>;
  visitRequests: Partial<Record<VisitRequestStatus, number>>;
  ownersTotal: number;
  ownersVerified: number;
}

/** Owner business as seen by admins, with account and listing context. */
export interface AdminOwnerSummary {
  id: string;
  businessName: string;
  phone: string | null;
  verified: boolean;
  displayName: string;
  email: string | null;
  listingCount: number;
  createdAt: string;
}

/** Body for PATCH /api/admin/owners/:id. */
export interface AdminOwnerUpdateInput {
  verified: boolean;
}

/** Body for POST /api/admin/colleges. */
export interface AdminCollegeInput {
  name: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
}

/** College row with how many listings are attached to it. */
export interface AdminCollegeSummary {
  id: string;
  name: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  placeCount: number;
  createdAt: string;
}

/** Verification counters shown above the admin owner list. */
export interface AdminOwnerCounts {
  total: number;
  verified: number;
  unverified: number;
}

/** Consistent API envelope returned by every backend endpoint. */
export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiError = {
  success: false;
  message: string;
  /** Field-level validation details, when applicable. */
  errors?: Record<string, string[]>;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;