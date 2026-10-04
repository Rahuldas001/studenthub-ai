import type {
  AdminCollegeInput,
  AdminCollegeSummary,
  AdminModerationStatus,
  AdminOverview,
  AdminOwnerCounts,
  AdminOwnerSummary,
  AdminPlaceSummary,
  PlaceStatus,
} from '@studenthub/types';
import { apiRequest } from './api';

/** Statuses an admin can set; PENDING is what owners resubmit, not a target. */
export const ADMIN_MODERATION_STATUSES: AdminModerationStatus[] = ['ACTIVE', 'REJECTED', 'INACTIVE'];

/** Moderation queue tabs, including the "all listings" view. */
export const ADMIN_PLACE_FILTERS: { id: string; label: string; status?: PlaceStatus }[] = [
  { id: 'PENDING', label: 'Pending review', status: 'PENDING' },
  { id: 'ACTIVE', label: 'Live', status: 'ACTIVE' },
  { id: 'REJECTED', label: 'Rejected', status: 'REJECTED' },
  { id: 'INACTIVE', label: 'Unpublished', status: 'INACTIVE' },
  { id: 'all', label: 'All listings' },
];

/** GET /api/admin/overview — platform-wide counters. */
export async function fetchAdminOverview(token: string): Promise<AdminOverview> {
  return apiRequest<AdminOverview>('/admin/overview', { token });
}

/** GET /api/admin/places?status= — moderation queue plus counts and listings. */
export async function fetchAdminPlaces(
  token: string,
  status?: PlaceStatus,
): Promise<{
  places: AdminPlaceSummary[];
  counts: Partial<Record<PlaceStatus, number>>;
  total: number;
}> {
  const query = status ? `?status=${status}` : '';
  return apiRequest(`/admin/places${query}`, { token });
}

/** PATCH /api/admin/places/:id — approve, reject, or unpublish. */
export async function moderateAdminPlace(
  token: string,
  placeId: string,
  status: AdminModerationStatus,
): Promise<AdminPlaceSummary> {
  return apiRequest<AdminPlaceSummary>(`/admin/places/${placeId}`, {
    method: 'PATCH',
    token,
    body: { status },
  });
}

/** DELETE /api/admin/places/:id — removes a listing regardless of owner. */
export async function deleteAdminPlace(token: string, placeId: string): Promise<void> {
  await apiRequest(`/admin/places/${placeId}`, { method: 'DELETE', token });
}

/** GET /api/admin/owners?verified= — businesses with verification counts. */
export async function fetchAdminOwners(
  token: string,
  verified?: boolean,
): Promise<{ owners: AdminOwnerSummary[]; counts: AdminOwnerCounts }> {
  const query = verified === undefined ? '' : `?verified=${verified ? 'true' : 'false'}`;
  return apiRequest(`/admin/owners${query}`, { token });
}

/** PATCH /api/admin/owners/:id — verify or unverify a business. */
export async function setAdminOwnerVerified(
  token: string,
  ownerId: string,
  verified: boolean,
): Promise<AdminOwnerSummary> {
  return apiRequest<AdminOwnerSummary>(`/admin/owners/${ownerId}`, {
    method: 'PATCH',
    token,
    body: { verified },
  });
}

/** GET /api/admin/colleges — launch geography with listing counts. */
export async function fetchAdminColleges(
  token: string,
): Promise<AdminCollegeSummary[]> {
  const payload = await apiRequest<{ colleges: AdminCollegeSummary[] }>('/admin/colleges', {
    token,
  });
  return payload.colleges;
}

/** POST /api/admin/colleges — 409 when the name already exists in that city. */
export async function createAdminCollege(
  token: string,
  input: AdminCollegeInput,
): Promise<AdminCollegeSummary> {
  return apiRequest<AdminCollegeSummary>('/admin/colleges', { method: 'POST', token, body: input });
}
