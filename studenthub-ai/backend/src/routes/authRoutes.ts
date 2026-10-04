import { Router } from 'express';
import {
  getMe,
  postLogin,
  postLogout,
  postRegister,
} from '../controllers/authController.js';
import { validateBody } from '../middleware/validate.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { loginInputSchema, registerInputSchema } from '../schemas/placeSchemas.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const authRoutes: Router = Router();

authRoutes.post(
  '/register',
  rateLimit({ windowMs: 60_000, max: 5 }),
  validateBody(registerInputSchema),
  asyncHandler(postRegister),
);

authRoutes.post(
  '/login',
  rateLimit({ windowMs: 60_000, max: 10 }),
  validateBody(loginInputSchema),
  asyncHandler(postLogin),
);

authRoutes.get('/me', optionalAuth, requireAuth, asyncHandler(getMe));

authRoutes.post('/logout', optionalAuth, asyncHandler(postLogout));