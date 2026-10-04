import { Router } from 'express';
import { getPlace, getPlaces } from '../controllers/placeController.js';
import { validateQuery } from '../middleware/validate.js';
import { placesQuerySchema } from '../schemas/placeSchemas.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const placeRoutes: Router = Router();

placeRoutes.get(
  '/',
  validateQuery(placesQuerySchema),
  asyncHandler(getPlaces),
);

placeRoutes.get('/:id', asyncHandler(getPlace));