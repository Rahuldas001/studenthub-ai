import { Router } from 'express';
import { postReview } from '../controllers/reviewController.js';
import { validateBody } from '../middleware/validate.js';
import { optionalAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { reviewInputSchema } from '../schemas/placeSchemas.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const reviewRoutes: Router = Router();

reviewRoutes.post(
  '/',
  rateLimit({ windowMs: 60_000, max: 20 }),
  optionalAuth,
  validateBody(reviewInputSchema),
  asyncHandler(postReview),
);