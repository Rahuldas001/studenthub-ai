import type { OwnerOffer, OwnerOfferInput, OwnerPlaceSummary, PriceBand } from '@studenthub/types';

/**
 * Pure helpers for the owner tools.
 *
 * Offers, the per-listing extras (WhatsApp number, opening hours, price band)
 * and review replies all live in Postgres behind `/api/owner/*`, so nothing in
 * this file stores anything: it only holds the option lists, the stringly form
 * shapes and the validation rules that mirror the backend schemas.
 */

/** Form value: the API bands plus the empty "not set" choice. */
export type PriceBandChoice = PriceBand | '';

export interface PriceBandOption {
  id: PriceBand;
  /** Symbol shown on the chip and in the student preview. */
  label: string;
  hint: string;
}

/** Quick pick that mirrors the ₹ / ₹₹ / ₹₹₹ bands students scan for. */
export const PRICE_BANDS: PriceBandOption[] = [
  { id: 'BUDGET', label: '₹', hint: 'Budget friendly' },
  { id: 'MID', label: '₹₹', hint: 'Mid range' },
  { id: 'PREMIUM', label: '₹₹₹', hint: 'Premium' },
];

export const PRICE_BAND_IDS: string[] = PRICE_BANDS.map((band) => band.id);

export const OPENING_HOURS_OPTIONS = [
  'Open 24 hours',
  '6:00 AM – 10:00 PM',
  '7:00 AM – 9:00 PM',
  '9:00 AM – 11:00 PM',
  '10:00 AM – 12:00 AM',
];

/** Suggested facility names; the backend upserts the catalogue rows on save. */
export const FACILITY_SUGGESTIONS = [
  'Wi-Fi', 'Meals', 'Power Backup', 'Hot Water', 'Laundry', 'Parking', 'AC',
  'Study Room', 'CCTV', 'Water Included', 'Dine-in', 'Takeaway', 'Home Delivery',
  'Outdoor Seating', 'Combo Deals', 'Student Discount',
];

/** Stringly shape the listing form edits; saved onto the `Place` row itself. */
export interface PlaceExtras {
  /** Separate WhatsApp number when it differs from the public phone. */
  whatsapp: string;
  openingHours: string;
  priceBand: PriceBandChoice;
}

export function emptyPlaceExtras(): PlaceExtras {
  return { whatsapp: '', openingHours: OPENING_HOURS_OPTIONS[1], priceBand: '' };
}

/** Prefill the extras section from a listing the API already returned. */
export function placeExtrasFrom(place: OwnerPlaceSummary): PlaceExtras {
  return {
    whatsapp: place.whatsapp ?? '',
    openingHours: place.openingHours ?? '',
    priceBand: (place.priceBand ?? '') as PriceBandChoice,
  };
}

/** Accepts any string so form state can pass its raw value; unknown bands render empty. */
export function priceBandLabel(band: string): string {
  return PRICE_BANDS.find((option) => option.id === band)?.label ?? '';
}

/** Stringly form state so TextInputs never fight number parsing. */
export interface OfferDraft {
  placeId: string;
  title: string;
  description: string;
  discount: string;
  validTill: string;
}

export function emptyOfferDraft(placeId = ''): OfferDraft {
  return { placeId, title: '', description: '', discount: '', validTill: '' };
}

/** Prefill the editor from a saved offer. */
export function offerDraftFrom(offer: OwnerOffer): OfferDraft {
  return {
    placeId: offer.placeId ?? '',
    title: offer.title,
    description: offer.description,
    discount: String(offer.discount),
    validTill: offer.validTill ?? '',
  };
}

/** Mirrors `ownerOfferInputSchema`; returns the first problem, or null. */
export function validateOfferDraft(draft: OfferDraft): string | null {
  if (draft.title.trim().length < 3) return 'Give the offer a short title (at least 3 characters).';
  if (draft.title.trim().length > 60) return 'Keep the offer title under 60 characters.';
  if (draft.description.trim().length < 5) return 'Describe what students get (at least 5 characters).';
  if (draft.description.trim().length > 160) return 'Keep the description under 160 characters.';
  const discount = Number(draft.discount.trim());
  if (!/^\d+$/.test(draft.discount.trim()) || discount < 1 || discount > 90) {
    return 'Discount must be a whole number between 1 and 90.';
  }
  if (draft.validTill && !isValidDate(draft.validTill)) return 'Valid till must be a real date (YYYY-MM-DD).';
  if (draft.validTill && isPast(draft.validTill)) return 'Pick today or a future date for the offer to go live.';
  return null;
}

/** Builds the POST/PATCH body from a validated draft. */
export function toOfferInput(draft: OfferDraft): OwnerOfferInput {
  return {
    placeId: draft.placeId || null,
    title: draft.title.trim().slice(0, 60),
    description: draft.description.trim().slice(0, 160),
    discount: Number(draft.discount.trim()),
    validTill: draft.validTill || null,
  };
}

/** `10% OFF` style badge text. */
export function offerBadge(offer: OwnerOffer): string {
  return `${offer.discount}% OFF`;
}

/** Which listing the offer points at, for the card caption. */
export function offerTarget(offer: OwnerOffer, places: OwnerPlaceSummary[]): string {
  if (!offer.placeId) return 'All listings';
  return offer.placeName ?? places.find((place) => place.id === offer.placeId)?.name ?? 'Deleted listing';
}

/** Offers count as live while they are switched on and not expired. */
export function isOfferLive(offer: OwnerOffer, today: Date = new Date()): boolean {
  if (!offer.active) return false;
  if (!offer.validTill) return true;
  return !isPast(offer.validTill, today);
}

export function liveOffers(offers: OwnerOffer[], today: Date = new Date()): OwnerOffer[] {
  return offers.filter((offer) => isOfferLive(offer, today));
}

export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** True when the date is strictly before today (device local time). */
export function isPast(value: string, today: Date = new Date()): boolean {
  if (!isValidDate(value)) return false;
  return value < todayIso(today);
}

export function todayIso(today: Date = new Date()): string {
  const offset = today.getTimezoneOffset() * 60_000;
  return new Date(today.getTime() - offset).toISOString().slice(0, 10);
}

