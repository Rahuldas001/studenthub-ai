import * as FileSystem from 'expo-file-system/legacy';
import type { AuthPayload, LoginInput, OwnerAuthPayload, OwnerProfile, OwnerRegisterInput, RegisterInput, SessionUser } from '@studenthub/types';
import { apiConfigured, apiRequest } from './api';

export interface StoredSession {
  token: string;
  user: SessionUser;
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

export async function clearSession(): Promise<void> {
  if (!AUTH_FILE) return;
  try {
    await FileSystem.deleteAsync(AUTH_FILE, { idempotent: true });
  } catch {
    // Nothing to clean up.
  }
}

function requireApi(): void {
  if (!apiConfigured()) {
    throw new Error('Accounts need the API. Set EXPO_PUBLIC_API_BASE_URL in apps/mobile-app/.env.');
  }
}

export async function registerAccount(input: RegisterInput): Promise<StoredSession> {
  requireApi();
  const payload = await apiRequest<AuthPayload>('/auth/register', { method: 'POST', body: input });
  return { token: payload.token, user: payload.user };
}

export async function registerOwnerAccount(input: OwnerRegisterInput): Promise<StoredSession> {
  requireApi();
  const payload = await apiRequest<OwnerAuthPayload>('/auth/owner/register', { method: 'POST', body: input });
  return { token: payload.token, user: payload.user, owner: payload.owner };
}

export async function loginAccount(input: LoginInput): Promise<StoredSession> {
  requireApi();
  const payload = await apiRequest<AuthPayload>('/auth/login', { method: 'POST', body: input });
  return { token: payload.token, user: payload.user };
}

/** Requests a 6-digit verification code for password reset. */
export async function requestForgotPassword(identifier: string): Promise<{ message: string; code: string }> {
  requireApi();
  return apiRequest<{ message: string; code: string }>('/auth/forgot-password', {
    method: 'POST',
    body: { identifier },
  });
}

/** Resets password using the 6-digit verification code. */
export async function confirmResetPassword(identifier: string, code: string, newPassword: string): Promise<{ message: string }> {
  requireApi();
  return apiRequest<{ message: string }>('/auth/reset-password', {
    method: 'POST',
    body: { identifier, code, newPassword },
  });
}

/** Updates student or owner profile fields (displayName, email, phone). */
export async function updateProfileDetails(token: string, details: { displayName?: string; email?: string; phone?: string }): Promise<SessionUser> {
  requireApi();
  return apiRequest<SessionUser>('/auth/profile', {
    method: 'PATCH',
    body: details,
    token,
  });
}

export interface DeletedAccountSummary {
  deleted: true;
  email: string | null;
  reviewsRemoved: number;
  visitRequestsRemoved: number;
  favoritesRemoved: number;
  listingsReleased: number;
}

export async function deleteAccount(token: string): Promise<DeletedAccountSummary> {
  return apiRequest<DeletedAccountSummary>('/auth/account', {
    method: 'DELETE',
    body: { confirm: 'DELETE' },
    token,
  });
}
