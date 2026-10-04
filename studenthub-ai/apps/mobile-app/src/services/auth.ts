import * as FileSystem from 'expo-file-system/legacy';
import type { AuthPayload, LoginInput, OwnerAuthPayload, OwnerProfile, OwnerRegisterInput, RegisterInput, SessionUser } from '@studenthub/types';
import { apiConfigured, apiRequest } from './api';

/** Signed-in session persisted on the device (token + public account). */
export interface StoredSession {
  token: string;
  user: SessionUser;
  /** Present for OWNER accounts once the business profile is known. */
  owner?: OwnerProfile;
}

const AUTH_FILE = FileSystem.documentDirectory ? `${FileSystem.documentDirectory}studenthub-auth.json` : null;

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
export async function loadSession(): Promise<StoredSession | null> {
  try {
    if (!AUTH_FILE) return null;
    const info = await FileSystem.getInfoAsync(AUTH_FILE);
    if (!info.exists || info.isDirectory) return null;
    const raw = await FileSystem.readAsStringAsync(AUTH_FILE, { encoding: FileSystem.EncodingType.UTF8 });
    const parsed: unknown = JSON.parse(raw);
    return isSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Persist the session; failures never break the in-memory sign-in. */
export async function saveSession(session: StoredSession): Promise<void> {
  if (!AUTH_FILE) return;
  try {
    await FileSystem.writeAsStringAsync(AUTH_FILE, JSON.stringify(session), {
      encoding: FileSystem.EncodingType.UTF8,
    });
  } catch {
    // Storage unavailable: the session stays valid until the app restarts.
  }
}

/** Remove the session after sign-out (idempotent). */
export async function clearSession(): Promise<void> {
  if (!AUTH_FILE) return;
  try {
    await FileSystem.deleteAsync(AUTH_FILE, { idempotent: true });
  } catch {
    // Nothing to clean up.
  }
}

/** Accounts require the API; without it registration is unavailable. */
function requireApi(): void {
  if (!apiConfigured()) {
    throw new Error('Accounts need the API. Set EXPO_PUBLIC_API_BASE_URL in apps/mobile-app/.env.');
  }
}

/** Creates an account and returns the signed-in session. */
export async function registerAccount(input: RegisterInput): Promise<StoredSession> {
  requireApi();
  const payload = await apiRequest<AuthPayload>('/auth/register', { method: 'POST', body: input });
  return { token: payload.token, user: payload.user };
}

/** Creates an OWNER account with its business profile. */
export async function registerOwnerAccount(input: OwnerRegisterInput): Promise<StoredSession> {
  requireApi();
  const payload = await apiRequest<OwnerAuthPayload>('/auth/owner/register', { method: 'POST', body: input });
  return { token: payload.token, user: payload.user, owner: payload.owner };
}

/** Signs in with an email address or phone number. */
export async function loginAccount(input: LoginInput): Promise<StoredSession> {
  requireApi();
  const payload = await apiRequest<AuthPayload>('/auth/login', { method: 'POST', body: input });
  return { token: payload.token, user: payload.user };
}

/** What the server removed, echoed back for the confirmation message. */
export interface DeletedAccountSummary {
  deleted: true;
  email: string | null;
  reviewsRemoved: number;
  visitRequestsRemoved: number;
  favoritesRemoved: number;
  listingsReleased: number;
}

/**
 * Permanently deletes the signed-in account on the server.
 *
 * Irreversible — callers must confirm with the user first. The `DELETE` phrase
 * is the confirmation the API demands, so it cannot be triggered by a stray
 * request body.
 */
export async function deleteAccount(token: string): Promise<DeletedAccountSummary> {
  return apiRequest<DeletedAccountSummary>('/auth/account', {
    method: 'DELETE',
    body: { confirm: 'DELETE' },
    token,
  });
}