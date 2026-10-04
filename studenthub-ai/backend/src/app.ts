import express from 'express';
import type { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { corsOptions } from './config/cors.js';
import { env } from './config/env.js';
import { apiRouter } from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

/**
 * Builds the Express application.
 *
 * Kept separate from `server.ts` so tests (and a future serverless target) can
 * create the app without binding a port.
 */
export function createApp(): Express {
  const app = express();

  // Sensible security headers, with CSP disabled for the API surface: this
  // process only returns JSON, and the strict default breaks nothing but is
  // unnecessary here.
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors(corsOptions));
  app.use(express.json({ limit: '100kb' }));
  app.disable('x-powered-by');
  app.set('trust proxy', env.isProduction ? 1 : false);

  app.use('/api', apiRouter);

  // Root hint for anyone opening the API in a browser.
  app.get('/', (_req, res) => {
    res.json({
      success: true,
      data: {
        service: 'StudentHub AI API',
        docs: 'GET /api/health',
        endpoints: [
          'GET /api/health',
          'POST /api/auth/register',
          'POST /api/auth/login',
          'GET /api/auth/me',
          'POST /api/auth/logout',
          'POST /api/auth/owner/register',
          'POST /api/owner/profile',
          'GET /api/owner/profile',
          'GET /api/owner/places',
          'POST /api/owner/places',
          'PATCH /api/owner/places/:id',
          'DELETE /api/owner/places/:id',
          'GET /api/owner/visit-requests',
          'PATCH /api/owner/visit-requests/:id',
          'GET /api/owner/offers',
          'POST /api/owner/offers',
          'PATCH /api/owner/offers/:id',
          'DELETE /api/owner/offers/:id',
          'GET /api/owner/reviews',
          'POST /api/owner/reviews/:id/reply',
          'DELETE /api/owner/reviews/:id/reply',
          'GET /api/owner/analytics',
          'GET /api/admin/overview',
          'GET /api/admin/places',
          'PATCH /api/admin/places/:id',
          'DELETE /api/admin/places/:id',
          'GET /api/admin/owners',
          'PATCH /api/admin/owners/:id',
          'GET /api/admin/colleges',
          'POST /api/admin/colleges',
          'GET /api/places',
          'GET /api/places/:id',
          'POST /api/reviews',
          'GET /api/favorites',
          'POST /api/favorites',
          'DELETE /api/favorites/:placeId',
          'POST /api/visit-requests',
        ],
      },
    });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}