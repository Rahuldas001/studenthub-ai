import { Router } from 'express';
import { isDatabaseConfigured } from '../prisma/client.js';
import { ok } from '../utils/response.js';

export const healthRouter: Router = Router();

/** GET /api/health — liveness probe plus environment summary. */
healthRouter.get('/', (_req, res) => {
  res.json(
    ok({
      status: 'ok',
      service: 'studenthub-ai-backend',
      environment: process.env.NODE_ENV ?? 'development',
      // Only reports whether a database is configured; never the credentials.
      databaseConfigured: isDatabaseConfigured(),
      timestamp: new Date().toISOString(),
    }),
  );
});