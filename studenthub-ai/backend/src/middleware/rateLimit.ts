import type { RequestHandler } from 'express';
import { fail } from '../utils/response.js';

type Bucket = { count: number; resetAt: number };

/**
 * Small in-memory rate limiter for write endpoints.
 *
 * Deliberately dependency-free for V1. A shared store (Redis) is required
 * before running multiple backend instances.
 */
export function rateLimit(options: {
  windowMs: number;
  max: number;
}): RequestHandler {
  const buckets = new Map<string, Bucket>();

  return (req, res, next) => {
    const key = req.ip ?? 'unknown';
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      next();
      return;
    }

    if (bucket.count >= options.max) {
      res
        .status(429)
        .json(fail('Too many requests. Please wait a moment and try again.'));
      return;
    }

    bucket.count += 1;
    next();
  };
}