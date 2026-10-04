import type { Request, Response } from 'express';
import type { FavoriteInput } from '@studenthub/types';
import {
  addFavorite,
  listFavorites,
  removeFavorite,
} from '../services/favoriteService.js';
import { ok } from '../utils/response.js';

/**
 * Guest placeholder id.
 *
 * Until sign-in exists, favourites are keyed to this sentinel and requests are
 * acknowledged without persisting. Real accounts replace it via `req.user.id`.
 */
const GUEST_USER_ID = 'guest';

/** GET /api/favorites */
export async function getFavorites(req: Request, res: Response): Promise<void> {
  const favorites = await listFavorites(req.user?.id ?? GUEST_USER_ID);
  res.json(ok({ favorites }));
}

/** POST /api/favorites */
export async function postFavorite(req: Request, res: Response): Promise<void> {
  const { placeId } = req.body as FavoriteInput;
  const favorite = await addFavorite(req.user?.id ?? GUEST_USER_ID, placeId);

  res.status(201).json(ok(favorite));
}

/**
 * DELETE /api/favorites/:placeId
 *
 * Param typing is explicit: Express 5 types route params as `string | string[]`.
 */
export async function deleteFavorite(
  req: Request<{ placeId: string }>,
  res: Response,
): Promise<void> {
  const result = await removeFavorite(
    req.user?.id ?? GUEST_USER_ID,
    req.params.placeId,
  );

  res.json(ok(result));
}