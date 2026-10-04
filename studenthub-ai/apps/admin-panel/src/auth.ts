import type { AuthPayload, LoginInput, SessionUser } from '@studenthub/types';
import { apiConfigured, apiRequest } from './api';

/**
 * Signed-in admin session (token + public account), persisted in the browser.
 *
 * Admin accounts are ordinary accounts with `role: ADMIN` — `POST /api/auth/login`
 * issues the token and there is no separate admin login — so this mirrors the
 * owner dashboard's stored session, minus the business profile. localStorage
 * replaces the mobile app's file storage: this panel signs in independently
 * while reading and writing the same Postgres rows.
 */
export interface StoredSession {
  token: string;
  user: SessionUser;
}

const SESSION_KEY = 'studenthub-admin-session';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

function isSession(value: unknown): value is StoredSession {
  if (!isRecord(value) || typeof value.token !== 'string' || value.token.length === 0) return false;
  const user = value.user;
  return isRecord(user) && typeof user.id === 'string' && typeof user.displayName === 'string'
    && (user.email === null || typeof user.email === 'string')
    && (user.phone === null || typeof user.phone === 'string')
    && typeof user.role === 'string';
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

/** The console is API-only: there is no offline demo mode for admins. */
function requireApi(): void {
  if (!apiConfigured()) {
    throw new Error('Admin accounts need the API. Set EXPO_PUBLIC_API_BASE_URL in apps/admin-panel/.env.');
  }
}

/**
 * Signs in with an email address or phone number.
 *
 * The same `POST /api/auth/login` the student app uses — the role gate lives
 * in the UI: a token whose `role` is not ADMIN never reaches the admin client.
 */
export async function loginAccount(input: LoginInput): Promise<StoredSession> {
  requireApi();
  const payload = await apiRequest<AuthPayload>('/auth/login', { method: 'POST', body: input });
  return { token: payload.token, user: payload.user };
}