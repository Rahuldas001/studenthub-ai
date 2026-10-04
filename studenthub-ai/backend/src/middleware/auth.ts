import type { RequestHandler } from 'express';
import { verifySessionToken } from '../services/authService.js';
import { HttpError } from '../utils/httpError.js';

/** Authenticated principal attached to the request by auth middleware. */
export type AuthenticatedUser = {
  id: string;
  role: 'STUDENT' | 'OWNER' | 'ADMIN';
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Bearer-token authentication.
 *
 * `optionalAuth` resolves `Authorization: Bearer <token>` into `req.user` and
 * lets guests continue unauthenticated. `requireAuth` refuses the request when
 * no valid token was presented. Tokens come from `/api/auth/login|register`
 * and stay valid until their 30-day expiry or an `AUTH_SECRET` rotation.
 */
export const optionalAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    const claims = verifySessionToken(header.slice(7).trim());
    if (claims) {
      req.user = { id: claims.sub, role: claims.role };
    }
  }
  next();
};

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.user) {
    next(HttpError.unauthorized('Sign in to continue.'));
    return;
  }
  next();
};

/**
 * Role gate for owner/admin areas.
 *
 * Runs after `optionalAuth` (and usually after `requireAuth`, though it
 * re-checks sign-in itself): anonymous callers get 401, signed-in users with
 * the wrong role get 403. Reused by the admin panel later.
 */
export function requireRole(
  ...roles: Array<AuthenticatedUser['role']>
): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      next(HttpError.unauthorized('Sign in to continue.'));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(HttpError.forbidden('This area is restricted.'));
      return;
    }
    next();
  };
}