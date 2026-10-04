import type {
  AdminCollegeInput,
  AdminOverview,
  AdminOwnerSummary,
  AdminPlaceSummary,
  PlaceStatus,
  VisitRequestStatus,
} from '@studenthub/types';

/**
 * Pure presentation rules for the admin panel.
 *
 * Everything here is side-effect free (type-only imports) so
 * `tests/admin.test.cjs` can transpile and exercise the shipped logic: which
 * moderation buttons a status may show, the overview tile derivation, the
 * recent/unverified slices, and the college form validation the API would
 * otherwise reject with a 422.
 */

/**
 * Legal moderation transitions for a listing's current status.
 *
 * Mirrors `apps/mobile-app/src/screens/Admin.tsx` and the backend rules:
 * approve anything that is not already live, reject only what is pending,
 * unpublish only what is live — so the buttons never invite a 409.
 */
export interface ModerationActions {
  approve: boolean;
  reject: boolean;
  unpublish: boolean;
}

export function moderationActions(status: PlaceStatus): ModerationActions {
  return {
    approve: status !== 'ACTIVE',
    reject: status === 'PENDING',
    unpublish: status === 'ACTIVE',
  };
}

/** Accent used by an overview tile (id → palette lookup in Overview.tsx). */
export type StatTone = 'purple' | 'pink' | 'amber' | 'green';

/** One stat card on the Dashboard screen. */
export interface OverviewStat {
  id: 'users' | 'listings' | 'pending' | 'businesses';
  label: string;
  value: string;
  note: string;
  icon: string;
  tone: StatTone;
}

/** Sums every place-status counter in an overview payload. */
export function countPlaces(places: Partial<Record<PlaceStatus, number>>): number {
  return Object.values(places).reduce((total, count) => total + (count ?? 0), 0);
}

/** Derives the four Dashboard tiles from `GET /api/admin/overview`. */
export function overviewStats(overview: AdminOverview): OverviewStat[] {
  const users = overview.users.students + overview.users.owners + overview.users.admins;
  const listings = countPlaces(overview.places);
  const pending = overview.places.PENDING ?? 0;
  const live = overview.places.ACTIVE ?? 0;
  const awaiting = overview.ownersTotal - overview.ownersVerified;
  return [
    {
      id: 'users',
      label: 'Total users',
      value: String(users),
      note: `${overview.users.students} students · ${overview.users.owners} owner${overview.users.owners === 1 ? '' : 's'}`,
      icon: '👥',
      tone: 'purple',
    },
    {
      id: 'listings',
      label: 'Total listings',
      value: String(listings),
      note: `${live} live · ${overview.places.REJECTED ?? 0} rejected · ${overview.places.INACTIVE ?? 0} unpublished`,
      icon: '🗂️',
      tone: 'pink',
    },
    {
      id: 'pending',
      label: 'Pending review',
      value: String(pending),
      note: pending === 0 ? 'Queue is clear' : 'Waiting on moderation',
      icon: '⏳',
      tone: 'amber',
    },
    {
      id: 'businesses',
      label: 'Verified businesses',
      value: `${overview.ownersVerified}/${overview.ownersTotal}`,
      note: awaiting === 0 ? 'Every business verified' : `${awaiting} awaiting verification`,
      icon: '✅',
      tone: 'green',
    },
  ];
}

/** Listing-status breakdown rows, most actionable first. */
export const PLACE_STATUS_ORDER: PlaceStatus[] = ['PENDING', 'ACTIVE', 'REJECTED', 'INACTIVE', 'DRAFT'];

export function placeStatusRows(overview: AdminOverview): { status: PlaceStatus; count: number }[] {
  return PLACE_STATUS_ORDER
    .map((status) => ({ status, count: overview.places[status] ?? 0 }))
    .filter((row) => row.count > 0);
}

/** Visit-request breakdown rows in lifecycle order. */
export const VISIT_STATUS_ORDER: VisitRequestStatus[] = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

export function visitStatusRows(overview: AdminOverview): { status: VisitRequestStatus; count: number }[] {
  return VISIT_STATUS_ORDER
    .map((status) => ({ status, count: overview.visitRequests[status] ?? 0 }))
    .filter((row) => row.count > 0);
}

/** The newest listings first, capped for the Dashboard preview list. */
export function recentPlaces(places: AdminPlaceSummary[], limit = 6): AdminPlaceSummary[] {
  return [...places]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, limit);
}

/** Businesses still waiting for verification (the Dashboard action queue). */
export function unverifiedOwners(owners: AdminOwnerSummary[]): AdminOwnerSummary[] {
  return owners.filter((owner) => !owner.verified);
}

/** Button label for the verification toggle. */
export function verifyActionLabel(verified: boolean): string {
  return verified ? 'Remove verification' : 'Verify business';
}

/** College form draft — strings, straight from the text inputs. */
export interface CollegeDraft {
  name: string;
  city: string;
  state: string;
  latitude: string;
  longitude: string;
}

/** Launch-geography defaults matching the mobile console's form. */
export function emptyCollegeDraft(): CollegeDraft {
  return { name: '', city: 'Guwahati', state: 'Assam', latitude: '26.1535', longitude: '91.6646' };
}

/** Returns an error message, or null when the draft is ready for the API. */
export function validateCollegeDraft(draft: CollegeDraft): string | null {
  if (draft.name.trim().length < 2) return 'Add the college name.';
  if (draft.city.trim().length === 0) return 'Add the city.';
  if (draft.state.trim().length === 0) return 'Add the state.';
  const lat = Number(draft.latitude);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return 'Latitude must be between -90 and 90.';
  const lng = Number(draft.longitude);
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) return 'Longitude must be between -180 and 180.';
  return null;
}

/** Trims the copy and converts the coordinates for `POST /api/admin/colleges`. */
export function collegeInputFrom(draft: CollegeDraft): AdminCollegeInput {
  return {
    name: draft.name.trim(),
    city: draft.city.trim(),
    state: draft.state.trim(),
    latitude: Number(draft.latitude),
    longitude: Number(draft.longitude),
  };
}