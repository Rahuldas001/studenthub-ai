import type { AuthPayload, LoginInput, OwnerAuthPayload, OwnerProfile, OwnerRegisterInput, SessionUser } from '@studenthub/types';
import { apiConfigured, apiRequest } from './api';

/**
 * Signed-in owner session (token + public account), persisted in the browser.
 *
 * Same shape as the mobile app's stored session — the token and `role` are
 * what authorise every `/api/owner/*` call — but this dashboard is web-only,
 * so localStorage replaces the mobile file storage.
 */
export interface StoredSession {
  token: string;
  user: SessionUser;
  /** Present for OWNER accounts once the business profile is known. */
  owner?: OwnerProfile;
}

const SESSION_KEY = 'studenthub-owner-session';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

function isOwnerProfile(value: unknown): value is OwnerProfile {
  return isRecord(value) && typeof value.id === 'string' && typeof value.businessName === 'string'
    && (value.phone === null || typeof value.phone === 'string')
    && typeof value.verified === 'boolean';
}

function isSession(value: unknown): value is StoredSession {
  if (!isRecord(value) || typeof value.token !== 'string' || value.token.length === 0) return false;
  const user = value.user;
  const validUser = isRecord(user) && typeof user.id === 'string' && typeof user.displayName === 'string'
    && (user.email === null || typeof user.email === 'string')
    && (user.phone === null || typeof user.phone === 'string');
  if (!validUser) return false;
  return value.owner === undefined || isOwnerProfile(value.owner);
}

/** Returns the stored session, or null when missing/corrupt. Never throws. */
export function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Persist the session; failures never break the in-memory sign-in. */
export function saveSession(session: StoredSession): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Storage unavailable (private mode quota): the session lasts until reload.
  }
}

/** Remove the session after sign-out (idempotent). */
export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // Nothing to clean up.
  }
}

/** The dashboard is API-only: there is no offline demo mode for owners. */
function requireApi(): void {
  if (!apiConfigured()) {
    throw new Error('Owner accounts need the API. Set EXPO_PUBLIC_API_BASE_URL in apps/owner-dashboard/.env.');
  }
}

/** Creates an OWNER account with its business profile in one call. */
export async function registerOwnerAccount(input: OwnerRegisterInput): Promise<StoredSession> {
  requireApi();
  const payload = await apiRequest<OwnerAuthPayload>('/auth/owner/register', { method: 'POST', body: input });
  return { token: payload.token, user: payload.user, owner: payload.owner };
}

/** Signs in with an email address or phone number (student or OWNER tokens). */
export async function loginAccount(input: LoginInput): Promise<StoredSession> {
  requireApi();
  const payload = await apiRequest<AuthPayload>('/auth/login', { method: 'POST', body: input });
  return { token: payload.token, user: payload.user };
}
