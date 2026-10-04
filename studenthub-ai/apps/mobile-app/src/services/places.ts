import type { ApiResponse, College, PlaceDetails, PlaceSummary, PlacesPayload } from '@studenthub/types';

export const COLLEGE = { name: 'Gauhati University', latitude: 26.1535, longitude: 91.6646 };

export const CATEGORIES = ['ALL', 'PG', 'HOSTEL', 'RESTAURANT', 'MESS', 'CAFE', 'LIBRARY', 'PHARMACY', 'GYM', 'ATM', 'GROCERY', 'BUS_STOP'] as const;
export type Category = typeof CATEGORIES[number];
export const LABELS: Record<Category, string> = {
  ALL: 'All', HOSTEL: 'Hostels', PG: 'PGs', RESTAURANT: 'Restaurants', CAFE: 'Cafes', MESS: 'Mess & tiffin', LIBRARY: 'Libraries', PHARMACY: 'Pharmacies', GYM: 'Gyms', ATM: 'ATMs', GROCERY: 'Groceries', BUS_STOP: 'Bus stops',
};

/** The city + coordinates the app discovers places around. */
export interface StudentLocation { city: string; latitude: number; longitude: number }

/** Fallback launch city used before a location is detected or chosen. */
export const DEFAULT_LOCATION: StudentLocation = { city: 'Guwahati', latitude: 26.1535, longitude: 91.6646 };

/** How far around the chosen location listings are fetched (kilometres). */
export const NEARBY_RADIUS_KM = 30;

/** Raised when the API is not configured or unreachable; there is no demo data. */
const NO_API =
  'Place listings need the StudentHub API. Set EXPO_PUBLIC_API_BASE_URL and make sure the backend is running.';

function apiBase(): string {
  const base = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '');
  if (!base) throw new Error(NO_API);
  return base;
}

/** Great-circle distance (km) between two points - mirrors the backend helper. */
export function distanceKm(from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(from.latitude)) * Math.cos(toRad(to.latitude)) * Math.sin(dLon / 2) ** 2;
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

/** Nearest college to a coordinate, used to turn a GPS fix into a launch city. */
export function nearestCollege(colleges: College[], latitude: number, longitude: number): College | null {
  let best: College | null = null;
  let bestDistance = Infinity;
  for (const college of colleges) {
    const distance = distanceKm({ latitude, longitude }, college);
    if (distance < bestDistance) { bestDistance = distance; best = college; }
  }
  return best;
}

/** GET /api/colleges - the real campuses the app can geo-filter around. */
export async function fetchColleges(): Promise<College[]> {
  const response = await fetch(`${apiBase()}/colleges`);
  if (!response.ok) throw new Error(`Colleges request failed (${response.status})`);
  const result = await response.json() as ApiResponse<{ colleges: College[]; demoData: boolean }>;
  if (!result.success) throw new Error(result.message);
  return result.data.colleges;
}

/** GET /api/places/:id - null when the API fails or the id is unknown. */
export async function fetchPlaceDetails(id: string): Promise<PlaceDetails | null> {
  try {
    const response = await fetch(`${apiBase()}/places/${encodeURIComponent(id)}`);
    if (!response.ok) return null;
    const result = await response.json() as ApiResponse<PlaceDetails>;
    if (!result.success) return null;
    return result.data;
  } catch {
    return null;
  }
}

/**
 * GET /api/places, centred on `origin`.
 *
 * Listings are real businesses from PostgreSQL, so a failure is surfaced rather
 * than masked with bundled sample data.
 */
export async function loadPlaces(signal: AbortSignal, origin?: StudentLocation): Promise<{ places: PlaceSummary[]; source: string }> {
  const params = origin
    ? `?latitude=${origin.latitude}&longitude=${origin.longitude}&radius=${NEARBY_RADIUS_KM}`
    : '';
  const response = await fetch(`${apiBase()}/places${params}`, { signal });
  if (!response.ok) throw new Error(`Places request failed (${response.status})`);
  const result = await response.json() as ApiResponse<PlacesPayload>;
  if (!result.success) throw new Error(result.message);
  return {
    places: result.data.places,
    source: `Real places near ${origin?.city ?? 'campus'} - confirm details with the owner`,
  };
}
