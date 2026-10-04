import type { RequestHandler } from 'express';
import { getPrismaClient } from '../prisma/client.js';
import { unwrapInfrastructureError } from '../services/authService.js';
import { HttpError } from '../utils/httpError.js';

/** Business profile of the signed-in owner, resolved per request. */
export type OwnerContext = {
  id: string;
  businessName: string;
  phone: string | null;
  verified: boolean;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      owner?: OwnerContext;
    }
  }
}

/**
 * Loads the `Owner` profile for the signed-in OWNER user into `req.owner`.
 *
 * Chain after `optionalAuth` + `requireRole('OWNER')`: 503 without a database,
 * 404 when the account has no business profile yet (create one via
 * `POST /api/owner/profile`). Wrap with `asyncHandler` at the route.
 */
export const requireOwnerProfile: RequestHandler = (req, _res, next) => {
  const prisma = getPrismaClient();
  if (!prisma) {
    next(new HttpError(503, 'The owner dashboard needs the database. Start PostgreSQL and try again.'));
    return;
  }

  prisma.owner
    .findUnique({ where: { userId: req.user!.id } })
    .then((owner) => {
      if (!owner) {
        next(new HttpError(404, 'Owner profile not found. Register as an owner first.'));
        return;
      }
      req.owner = {
        id: owner.id,
        businessName: owner.businessName,
        phone: owner.phone,
        verified: owner.verified,
      };
      next();
    })
    .catch((error: unknown) => next(unwrapInfrastructureError(error)));
};