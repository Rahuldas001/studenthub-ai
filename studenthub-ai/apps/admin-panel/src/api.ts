import type { ApiResponse } from '@studenthub/types';

/**
 * Envelope-aware API client for the admin panel.
 *
 * Mirrors `apps/mobile-app/src/services/api.ts` (and the owner dashboard's
 * copy): the backend answers `{ success: true, data }` or
 * `{ success: false, message }`, so this is the single place that unwraps the
 * envelope, attaches the bearer token and applies the same 8-second timeout
 * the retry states expect.
 */
export const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? '';

/** True when the panel was pointed at an API via EXPO_PUBLIC_API_BASE_URL. */
export function apiConfigured(): boolean {
  return API_BASE.length > 0;
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'DELETE' | 'PATCH';
  body?: unknown;
  token?: string | null;
  timeoutMs?: number;
};

/** Backend failures carry the HTTP status so screens can branch on it. */
export class ApiRequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
  }
}

/** Runs a request and resolves with the unwrapped `data`. Throws on failure. */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(options.timeoutMs ?? 8000),
  });

  const result = await response.json() as ApiResponse<T>;
  if (!result.success) throw new ApiRequestError(response.status, result.message);
  return result.data;
}