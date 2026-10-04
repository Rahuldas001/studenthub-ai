import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { HttpError } from '../utils/httpError.js';

/**
 * Validates and replaces `req.body` with the parsed value.
 *
 * Zod errors are flattened into `field -> messages` so the client can highlight
 * individual inputs.
 */
export function validateBody<T>(schema: ZodType<T>): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const details: Record<string, string[]> = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join('.') || '_';
        details[key] = [...(details[key] ?? []), issue.message];
      }
      next(HttpError.badRequest('Validation failed', details));
      return;
    }

    req.body = result.data;
    next();
  };
}

/**
 * Validates query strings and exposes the parsed result on `res.locals.query`.
 *
 * Query params arrive as strings, so schemas coerce numbers and booleans.
 */
export function validateQuery<T>(schema: ZodType<T>): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const details: Record<string, string[]> = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join('.') || '_';
        details[key] = [...(details[key] ?? []), issue.message];
      }
      next(HttpError.badRequest('Invalid query parameters', details));
      return;
    }

    res.locals.query = result.data;
    next();
  };
}