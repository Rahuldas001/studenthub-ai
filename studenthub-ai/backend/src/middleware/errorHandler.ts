import type { ErrorRequestHandler, RequestHandler } from 'express';
import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';
import { fail } from '../utils/response.js';

/** 404 handler for unmatched routes. */
export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json(fail(`Route ${req.method} ${req.originalUrl} not found`));
};

/**
 * Single error funnel. Known `HttpError`s keep their status and validation
 * details; anything else becomes a generic 500 so internals never leak.
 */
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    res.status(error.status).json(fail(error.message, error.details));
    return;
  }

  if (!env.isProduction) {
    console.error('[studenthub] unhandled error:', error);
  }

  res.status(500).json(fail('Something went wrong'));
};