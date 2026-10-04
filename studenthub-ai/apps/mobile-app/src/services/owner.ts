import type {
  OwnerAnalytics,
  OwnerAuthPayload,
  OwnerOffer,
  OwnerOfferInput,
  OwnerOfferUpdateInput,
  OwnerPlaceInput,
  OwnerPlaceSummary,
  OwnerPlaceUpdateInput,
  OwnerProfile,
  OwnerProfileInput,
  OwnerRegisterInput,
  OwnerReview,
  OwnerVisitRequest,
  PlaceCategory,
  PlaceGender,
  PlaceStatus,
  PriceBand,
  VisitRequestStatus,
} from '@studenthub/types';
import { apiRequest } from './api';
import { PRICE_BAND_IDS } from '../utils/ownerExtras';

/** Owner dashboard pickers (match the backend enums). */
export const OWNER_CATEGORIES: PlaceCategory[] = [
  'PG', 'HOSTEL', 'RESTAURANT', 'MESS', 'CAFE', 'LIBRARY',
  'PHARMACY', 'ATM', 'GROCERY', 'BUS_STOP', 'GYM',
];
export const OWNER_GENDERS: PlaceGender[] = ['BOYS', 'GIRLS', 'CO_ED'];
export const OWNER_STATUSES: PlaceStatus[] = ['DRAFT', 'PENDING', 'ACTIVE', 'REJECTED', 'INACTIVE'];
export const OWNER_REQUEST_STATUSES: VisitRequestStatus[] = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'];

/** Form state stays stringly-typed so TextInputs never fight number parsing. */
export interface OwnerPlaceForm {
  category: string;
  name: string;
  description: string;
  address: string;
  latitude: string;
  longitude: string;
  price: string;
  priceUnit: string;
  phone: string;
  /** WhatsApp number students can message; saved on the listing row. */
  whatsapp: string;
  /** Free-text hours shown on the student page. */
  openingHours: string;
  /** '' | BUDGET | MID | PREMIUM — see `PRICE_BANDS`. */
  priceBand: string;
  imageUrl: string;
  gender: string;
  facilities: string;
}

/** Fresh listing defaults, centered on Gauhati University like the student map. */
export function emptyPlaceForm(): OwnerPlaceForm {
  return {
    category: 'PG',
    name: '',
    description: '',
    address: '',
    latitude: '26.1535',
    longitude: '91.6646',
    price: '',
    priceUnit: '/month',
    phone: '',
    whatsapp: '',
    openingHours: '',
    priceBand: '',
    imageUrl: '',
    gender: '',
    facilities: '',
  };
}

/** Prefills the edit form from a listing the owner API returned. */
export function placeFormFrom(place: OwnerPlaceSummary): OwnerPlaceForm {
  return {
    category: place.category,
    name: place.name,
    description: place.description ?? '',
    address: place.address,
    latitude: place.latitude === undefined ? '' : String(place.latitude),
    longitude: place.longitude === undefined ? '' : String(place.longitude),
    price: place.price === null || place.price === undefined ? '' : String(place.price),
    priceUnit: place.priceUnit ?? '',
    phone: place.phone ?? '',
    whatsapp: place.whatsapp ?? '',
    openingHours: place.openingHours ?? '',
    priceBand: place.priceBand ?? '',
    imageUrl: place.imageUrl ?? '',
    gender: place.gender ?? '',
    facilities: (place.facilities ?? []).map((facility) => facility.name).join(', '),
  };
}

/** Client-side checks mirroring the backend schema; returns the first problem. */
export function validateOwnerPlaceForm(form: OwnerPlaceForm): string | null {
  if (form.name.trim().length < 2) return 'Give the listing a name (at least 2 characters).';
  if (form.address.trim().length < 5) return 'Add the full address so students can find it.';
  if (form.imageUrl.trim().length === 0) return 'Add an image URL for the listing card.';
  const latitude = Number(form.latitude);
  const longitude = Number(form.longitude);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return 'Latitude must be a number between -90 and 90.';
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return 'Longitude must be a number between -180 and 180.';
  if (form.price.trim() && (!/^\d+$/.test(form.price.trim()) || Number(form.price) < 0)) return 'Price must be a whole number, or left empty.';
  if (form.phone.trim() && form.phone.replace(/\D/g, '').length < 10) return 'Enter a valid contact phone number, or leave it empty.';
  if (form.whatsapp.trim() && form.whatsapp.replace(/\D/g, '').length < 10) return 'Enter a valid WhatsApp number, or leave it empty.';
  if (form.openingHours.trim().length > 60) return 'Keep the opening hours under 60 characters.';
  if (form.priceBand && !PRICE_BAND_IDS.includes(form.priceBand)) return 'Pick one of the price bands, or leave it unset.';
  return null;
}

/** Converts the stringly form into the typed API body. */
export function toOwnerPlaceInput(form: OwnerPlaceForm): OwnerPlaceInput {
  return {
    category: form.category as PlaceCategory,
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    address: form.address.trim(),
    latitude: Number(form.latitude),
    longitude: Number(form.longitude),
    price: form.price.trim() ? Number(form.price.trim()) : null,
    priceUnit: form.priceUnit.trim() || null,
    phone: form.phone.trim() || undefined,
    whatsapp: form.whatsapp.trim() || null,
    openingHours: form.openingHours.trim() || null,
    priceBand: (form.priceBand || null) as PriceBand | null,
    imageUrl: form.imageUrl.trim(),
    gender: (form.gender || undefined) as PlaceGender | undefined,
    facilities: form.facilities.split(',').map((item) => item.trim()).filter(Boolean),
  };
}

/** Backend field errors become per-input messages. */
export function fieldErrors(error: unknown): Partial<Record<keyof OwnerPlaceForm, string>> {
  const details = (error as { errors?: Record<string, string[]> })?.errors;
  if (!details || typeof details !== 'object') return {};
  const empty = emptyPlaceForm();
  const mapped: Partial<Record<keyof OwnerPlaceForm, string>> = {};
  for (const [key, messages] of Object.entries(details)) {
    if (key in empty && messages.length > 0) {
      mapped[key as keyof OwnerPlaceForm] = messages[0];
    }
  }
  return mapped;
}

/** GET /api/owner/profile — 404 means the OWNER account is still onboarding. */
export async function fetchOwnerProfile(token: string): Promise<OwnerProfile | null> {
  try {
    const payload = await apiRequest<{ owner: OwnerProfile }>('/owner/profile', { token });
    return payload.owner;
  } catch (error) {
    if ((error as { status?: number })?.status === 404) return null;
    throw error;
  }
}

/** POST /api/owner/profile — completes onboarding for profile-less accounts. */
export async function createOwnerProfile(token: string, input: OwnerProfileInput): Promise<OwnerProfile> {
  const payload = await apiRequest<{ owner: OwnerProfile }>('/owner/profile', {
    method: 'POST',
    token,
    body: input,
  });
  return payload.owner;
}

/** GET /api/owner/places?status= — listings plus moderation counts. */
export async function fetchOwnerPlaces(
  token: string,
  status?: PlaceStatus,
): Promise<{ places: OwnerPlaceSummary[]; counts: Partial<Record<PlaceStatus, number>> }> {
  const query = status ? `?status=${status}` : '';
  return apiRequest(`/owner/places${query}`, { token });
}

/** POST /api/owner/places — new listings always enter PENDING review. */
export async function createOwnerPlace(token: string, input: OwnerPlaceInput): Promise<OwnerPlaceSummary> {
  return apiRequest<OwnerPlaceSummary>('/owner/places', { method: 'POST', token, body: input });
}

/** PATCH /api/owner/places/:id — content edits; unpublish via INACTIVE. */
export async function updateOwnerPlace(
  token: string,
  placeId: string,
  input: OwnerPlaceUpdateInput,
): Promise<OwnerPlaceSummary> {
  return apiRequest<OwnerPlaceSummary>(`/owner/places/${placeId}`, { method: 'PATCH', token, body: input });
}

/** DELETE /api/owner/places/:id */
export async function deleteOwnerPlace(token: string, placeId: string): Promise<void> {
  await apiRequest(`/owner/places/${placeId}`, { method: 'DELETE', token });
}

/** GET /api/owner/visit-requests — inbox newest-first with status counts. */
export async function fetchOwnerVisitRequests(
  token: string,
  options?: { placeId?: string; status?: VisitRequestStatus },
): Promise<{ requests: OwnerVisitRequest[]; counts: Partial<Record<VisitRequestStatus, number>> }> {
  const params = new URLSearchParams();
  if (options?.placeId) params.set('placeId', options.placeId);
  if (options?.status) params.set('status', options.status);
  const query = params.size > 0 ? `?${params.toString()}` : '';
  return apiRequest(`/owner/visit-requests${query}`, { token });
}

/** PATCH /api/owner/visit-requests/:id — confirm, cancel, or complete. */
export async function updateOwnerVisitRequest(
  token: string,
  requestId: string,
  status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED',
): Promise<OwnerVisitRequest> {
  return apiRequest<OwnerVisitRequest>(`/owner/visit-requests/${requestId}`, {
    method: 'PATCH',
    token,
    body: { status },
  });
}

/** GET /api/owner/offers — saved promos, newest first. */
export async function fetchOwnerOffers(token: string): Promise<OwnerOffer[]> {
  const payload = await apiRequest<{ offers: OwnerOffer[] }>('/owner/offers', { token });
  return payload.offers;
}

/** POST /api/owner/offers */
export async function createOwnerOffer(token: string, input: OwnerOfferInput): Promise<OwnerOffer> {
  return apiRequest<OwnerOffer>('/owner/offers', { method: 'POST', token, body: input });
}

/** PATCH /api/owner/offers/:id — edit details, or pause/resume with `active`. */
export async function updateOwnerOffer(
  token: string,
  offerId: string,
  input: OwnerOfferUpdateInput,
): Promise<OwnerOffer> {
  return apiRequest<OwnerOffer>(`/owner/offers/${offerId}`, { method: 'PATCH', token, body: input });
}

/** DELETE /api/owner/offers/:id */
export async function deleteOwnerOffer(token: string, offerId: string): Promise<void> {
  await apiRequest(`/owner/offers/${offerId}`, { method: 'DELETE', token });
}

/**
 * GET /api/owner/reviews — the reply inbox across the owner's listings.
 * Each row carries the public review plus the owner's own `reply`.
 */
export async function fetchOwnerReviews(
  token: string,
  options?: { placeId?: string; filter?: 'ALL' | 'UNANSWERED' | 'ANSWERED' },
): Promise<OwnerReview[]> {
  const params = new URLSearchParams();
  if (options?.placeId) params.set('placeId', options.placeId);
  if (options?.filter && options.filter !== 'ALL') params.set('filter', options.filter);
  const query = params.size > 0 ? `?${params.toString()}` : '';
  const payload = await apiRequest<{ reviews: OwnerReview[] }>(`/owner/reviews${query}`, { token });
  return payload.reviews;
}

/** POST /api/owner/reviews/:id/reply — published on the student-facing page. */
export async function replyToOwnerReview(
  token: string,
  reviewId: string,
  reply: string,
): Promise<OwnerReview> {
  return apiRequest<OwnerReview>(`/owner/reviews/${reviewId}/reply`, {
    method: 'POST',
    token,
    body: { reply },
  });
}

/** DELETE /api/owner/reviews/:id/reply */
export async function deleteOwnerReviewReply(token: string, reviewId: string): Promise<OwnerReview> {
  return apiRequest<OwnerReview>(`/owner/reviews/${reviewId}/reply`, { method: 'DELETE', token });
}

/** GET /api/owner/analytics?range= — measured traffic for the owner's listings. */
export async function fetchOwnerAnalytics(token: string, range: 7 | 30): Promise<OwnerAnalytics> {
  return apiRequest<OwnerAnalytics>(`/owner/analytics?range=${range}`, { token });
}

export type { OwnerAuthPayload, OwnerRegisterInput };