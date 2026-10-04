import type { College } from '@studenthub/types';
import { getPrismaClient } from '../prisma/client.js';
import { unwrapInfrastructureError } from './authService.js';
import { HttpError } from '../utils/httpError.js';

const DATABASE_MESSAGE = 'The launch geography needs the database. Start PostgreSQL and try again.';

/**
 * Public launch geography for the student app.
 *
 * Served straight from PostgreSQL: the app lists real campuses so it can geo-filter
 * listings and offer "use my location". A missing database is an explicit 503.
 */
export async function listColleges(): Promise<{ colleges: College[]; demoData: boolean }> {
  const prisma = getPrismaClient();
  if (!prisma) throw new HttpError(503, DATABASE_MESSAGE);

  try {
    const rows = await prisma.college.findMany({ orderBy: { name: 'asc' } });
    return {
      colleges: rows.map((row) => ({
        id: row.id,
        name: row.name,
        city: row.city,
        state: row.state,
        latitude: row.latitude,
        longitude: row.longitude,
      })),
      demoData: false,
    };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw unwrapInfrastructureError(error);
  }
}
