import { Router } from 'express';
import { postOwnerRegister } from '../controllers/ownerController.js';
import { validateBody } from '../middleware/validate.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { ownerRegisterInputSchema } from '../schemas/placeSchemas.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const ownerAuthRoutes: Router = Router();

ownerAuthRoutes.post(
  '/owner/register',
  rateLimit({ windowMs: 60_000, max: 5 }),
  validateBody(ownerRegisterInputSchema),
  asyncHandler(postOwnerRegister),
);