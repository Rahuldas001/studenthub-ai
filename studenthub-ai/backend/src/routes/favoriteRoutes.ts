import { Router } from 'express';
import {
  deleteFavorite,
  getFavorites,
  postFavorite,
} from '../controllers/favoriteController.js';
import { validateBody } from '../middleware/validate.js';
import { optionalAuth } from '../middleware/auth.js';
import { favoriteInputSchema } from '../schemas/placeSchemas.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const favoriteRoutes: Router = Router();

favoriteRoutes.get('/', optionalAuth, asyncHandler(getFavorites));

favoriteRoutes.post(
  '/',
  optionalAuth,
  validateBody(favoriteInputSchema),
  asyncHandler(postFavorite),
);

favoriteRoutes.delete('/:placeId', optionalAuth, asyncHandler(deleteFavorite));