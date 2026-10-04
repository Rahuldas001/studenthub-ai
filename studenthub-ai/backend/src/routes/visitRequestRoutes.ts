import { Router } from 'express';
import { postVisitRequest } from '../controllers/visitRequestController.js';
import { validateBody } from '../middleware/validate.js';
import { optionalAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { visitRequestInputSchema } from '../schemas/placeSchemas.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const visitRequestRoutes: Router = Router();

visitRequestRoutes.post(
  '/',
  rateLimit({ windowMs: 60_000, max: 10 }),
  optionalAuth,
  validateBody(visitRequestInputSchema),
  asyncHandler(postVisitRequest),
);