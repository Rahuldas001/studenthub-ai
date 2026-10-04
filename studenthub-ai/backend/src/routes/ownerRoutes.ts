import { Router } from 'express';
import {
  deleteOwnerOfferHandler,
  deleteOwnerPlaceHandler,
  deleteOwnerReviewReplyHandler,
  getOwnerAnalyticsHandler,
  getOwnerOffers,
  getOwnerPlaces,
  getOwnerProfileHandler,
  getOwnerReviews,
  getOwnerVisitRequests,
  patchOwnerOffer,
  patchOwnerPlace,
  patchOwnerVisitRequest,
  postOwnerOffer,
  postOwnerPlace,
  postOwnerProfile,
  postOwnerReviewReply,
} from '../controllers/ownerController.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { optionalAuth, requireRole } from '../middleware/auth.js';
import { requireOwnerProfile } from '../middleware/owner.js';
import { rateLimit } from '../middleware/rateLimit.js';
import {
  ownerPlaceCreateSchema,
  ownerPlaceUpdateSchema,
  ownerProfileInputSchema,
  visitRequestStatusUpdateSchema,
} from '../schemas/placeSchemas.js';
import {
  ownerAnalyticsQuerySchema,
  ownerOfferInputSchema,
  ownerOfferUpdateSchema,
  ownerPlacesQuerySchema,
  ownerReviewReplySchema,
  ownerReviewsQuerySchema,
  ownerVisitRequestsQuerySchema,
} from '../schemas/ownerSchemas.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Owner area: every route runs bearer auth → OWNER role → business profile.
 *
 * Profile creation is the exception: `POST /profile` runs before the profile
 * loader because it *creates* the profile. `GET /profile` also runs before
 * the loader, reporting 404 for accounts still in onboarding.
 */
export const ownerRoutes: Router = Router();

ownerRoutes.use(optionalAuth, requireRole('OWNER'));

ownerRoutes.post(
  '/profile',
  validateBody(ownerProfileInputSchema),
  rateLimit({ windowMs: 60_000, max: 10 }),
  asyncHandler(postOwnerProfile),
);

ownerRoutes.get('/profile', asyncHandler(getOwnerProfileHandler));

ownerRoutes.use(requireOwnerProfile);

ownerRoutes.get(
  '/places',
  validateQuery(ownerPlacesQuerySchema),
  asyncHandler(getOwnerPlaces),
);

ownerRoutes.post(
  '/places',
  validateBody(ownerPlaceCreateSchema),
  rateLimit({ windowMs: 60_000, max: 20 }),
  asyncHandler(postOwnerPlace),
);

ownerRoutes.patch(
  '/places/:id',
  validateBody(ownerPlaceUpdateSchema),
  rateLimit({ windowMs: 60_000, max: 30 }),
  asyncHandler(patchOwnerPlace),
);

ownerRoutes.delete('/places/:id', asyncHandler(deleteOwnerPlaceHandler));

ownerRoutes.get(
  '/visit-requests',
  validateQuery(ownerVisitRequestsQuerySchema),
  asyncHandler(getOwnerVisitRequests),
);

ownerRoutes.patch(
  '/visit-requests/:id',
  validateBody(visitRequestStatusUpdateSchema),
  rateLimit({ windowMs: 60_000, max: 30 }),
  asyncHandler(patchOwnerVisitRequest),
);

ownerRoutes.get('/offers', asyncHandler(getOwnerOffers));

ownerRoutes.post(
  '/offers',
  validateBody(ownerOfferInputSchema),
  rateLimit({ windowMs: 60_000, max: 20 }),
  asyncHandler(postOwnerOffer),
);

ownerRoutes.patch(
  '/offers/:id',
  validateBody(ownerOfferUpdateSchema),
  rateLimit({ windowMs: 60_000, max: 30 }),
  asyncHandler(patchOwnerOffer),
);

ownerRoutes.delete('/offers/:id', asyncHandler(deleteOwnerOfferHandler));

ownerRoutes.get(
  '/reviews',
  validateQuery(ownerReviewsQuerySchema),
  asyncHandler(getOwnerReviews),
);

ownerRoutes.post(
  '/reviews/:id/reply',
  validateBody(ownerReviewReplySchema),
  rateLimit({ windowMs: 60_000, max: 20 }),
  asyncHandler(postOwnerReviewReply),
);

ownerRoutes.delete('/reviews/:id/reply', asyncHandler(deleteOwnerReviewReplyHandler));

ownerRoutes.get(
  '/analytics',
  validateQuery(ownerAnalyticsQuerySchema),
  asyncHandler(getOwnerAnalyticsHandler),
);
