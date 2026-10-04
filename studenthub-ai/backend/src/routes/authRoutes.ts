import { Router } from 'express';
import {
  deleteAccountHandler,
  getMe,
  postLogin,
  postLogout,
  postRegister,
} from '../controllers/authController.js';
import { validateBody } from '../middleware/validate.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import {
  deleteAccountInputSchema,
  loginInputSchema,
  registerInputSchema,
} from '../schemas/placeSchemas.js';
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

/**
 * Account deletion (Google Play production requirement). Needs a signed-in
 * session *and* the `DELETE` confirmation phrase, and is rate-limited so a
 * token cannot be brute-replayed.
 */
authRoutes.delete(
  '/account',
  rateLimit({ windowMs: 60_000, max: 5 }),
  optionalAuth,
  requireAuth,
  validateBody(deleteAccountInputSchema),
  asyncHandler(deleteAccountHandler),
);