import type { ApiError, ApiSuccess } from '@studenthub/types';

/**
 * Every endpoint returns the same envelope:
 *   success → { success: true, data }
 *   failure → { success: false, message, errors? }
 * so the student app has exactly one response shape to unwrap.
 */
export function ok<T>(data: T): ApiSuccess<T> {
  return { success: true, data };
}

export function fail(message: string, errors?: Record<string, string[]>): ApiError {
  return errors ? { success: false, message, errors } : { success: false, message };
}