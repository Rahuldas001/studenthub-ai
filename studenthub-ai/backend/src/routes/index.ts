import { Router } from 'express';
import { healthRouter } from './healthRoutes.js';
import { placeRoutes } from './placeRoutes.js';
import { reviewRoutes } from './reviewRoutes.js';
import { favoriteRoutes } from './favoriteRoutes.js';
import { visitRequestRoutes } from './visitRequestRoutes.js';
import { authRoutes } from './authRoutes.js';
import { ownerAuthRoutes } from './ownerAuthRoutes.js';
import { ownerRoutes } from './ownerRoutes.js';
import { adminRoutes } from './adminRoutes.js';

/** Mounts every versioned API surface behind `/api`. */
export const apiRouter: Router = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/auth', ownerAuthRoutes);
apiRouter.use('/owner', ownerRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/places', placeRoutes);
apiRouter.use('/reviews', reviewRoutes);
apiRouter.use('/favorites', favoriteRoutes);
apiRouter.use('/visit-requests', visitRequestRoutes);