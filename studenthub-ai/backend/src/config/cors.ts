import type { CorsOptions } from 'cors';
import { env } from './env.js';

/**
 * CORS policy.
 *
 * Only the configured origins may call the API with credentials. Requests with
 * no Origin header (curl, server-to-server, the Vite dev proxy) are allowed, and
 * restrictive browser defaults apply everywhere else.
 */
export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin || env.corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86_400,
};