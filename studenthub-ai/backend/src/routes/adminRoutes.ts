import { Router } from 'express';
import {
  deleteAdminPlaceHandler,
  getAdminColleges,
  getAdminOverviewHandler,
  getAdminOwners,
  getAdminPlaces,
  patchAdminOwner,
  patchAdminPlace,
  postAdminCollege,
} from '../controllers/adminController.js';
import { optionalAuth, requireRole } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import {
  adminCollegeInputSchema,
  adminModerationSchema,
  adminOwnerUpdateSchema,
  adminOwnersQuerySchema,
  adminPlacesQuerySchema,
} from '../schemas/adminSchemas.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Admin area: moderation, owner verification, and geography.
 *
 * Every route runs bearer auth → ADMIN role. There is no profile loader:
 * admins act on the whole platform, so all scope checks live in the services.
 */
export const adminRoutes: Router = Router();

adminRoutes.use(optionalAuth, requireRole('ADMIN'));

adminRoutes.get('/overview', asyncHandler(getAdminOverviewHandler));

adminRoutes.get(
  '/places',
  validateQuery(adminPlacesQuerySchema),
  asyncHandler(getAdminPlaces),
);

adminRoutes.patch(
  '/places/:id',
  validateBody(adminModerationSchema),
  rateLimit({ windowMs: 60_000, max: 60 }),
  asyncHandler(patchAdminPlace),
);

adminRoutes.delete('/places/:id', asyncHandler(deleteAdminPlaceHandler));

adminRoutes.get('/owners', validateQuery(adminOwnersQuerySchema), asyncHandler(getAdminOwners));

adminRoutes.patch(
  '/owners/:id',
  validateBody(adminOwnerUpdateSchema),
  rateLimit({ windowMs: 60_000, max: 60 }),
  asyncHandler(patchAdminOwner),
);

adminRoutes.get('/colleges', asyncHandler(getAdminColleges));

adminRoutes.post(
  '/colleges',
  validateBody(adminCollegeInputSchema),
  rateLimit({ windowMs: 60_000, max: 10 }),
  asyncHandler(postAdminCollege),
);
