import type { Request, Response } from 'express';
import type { PlacesQuery } from '@studenthub/types';
import { getPlaceById, listPlaces, recordPlaceView } from '../services/placeService.js';
import { ok } from '../utils/response.js';
import { HttpError } from '../utils/httpError.js';

/**
 * GET /api/places
 *
 * Supports `category`, `search`, `latitude`/`longitude`/`radius`,
 * `minPrice`/`maxPrice`, `gender` and `sort`. Query values are already coerced
 * and validated by `validateQuery`.
 */
export async function getPlaces(_req: Request, res: Response): Promise<void> {
  const query = res.locals.query as PlacesQuery;
  const payload = await listPlaces(query);
  res.json(ok(payload));
}

/**
 * GET /api/places/:id
 *
 * The route param is declared explicitly because Express 5 types route params
 * as `string | string[]` (array params are supported for wildcard routes).
 */
export async function getPlace(
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> {
  const place = await getPlaceById(req.params.id);

  if (!place) {
    throw HttpError.notFound('Place not found');
  }

  // Owner analytics counts these reads, so record after a successful lookup.
  // Deliberately not awaited: tracking must never delay the response.
  void recordPlaceView(place.id);

  res.json(ok(place));
}
