import type { Request, Response } from 'express';
import type {
  AdminCollegeInput,
  AdminModerationStatus,
  AdminOwnerUpdateInput,
  PlaceStatus,
} from '@studenthub/types';
import {
  deleteAdminPlace,
  listAdminPlaces,
  moderatePlace,
} from '../services/adminPlaceService.js';
import {
  createAdminCollege,
  getAdminOverview,
  listAdminColleges,
  listAdminOwners,
  setOwnerVerified,
} from '../services/adminService.js';
import { ok } from '../utils/response.js';

/**
 * Admin handlers.
 *
 * Every route sits behind `requireRole('ADMIN')`, so handlers can assume an
 * authenticated admin; services take plain ids and inputs, which keeps them
 * unit-testable without a request object.
 */

/** GET /api/admin/overview */
export async function getAdminOverviewHandler(_req: Request, res: Response): Promise<void> {
  res.json(ok(await getAdminOverview()));
}

/** GET /api/admin/places?status=PENDING */
export async function getAdminPlaces(_req: Request, res: Response): Promise<void> {
  const query = res.locals.query as { status?: PlaceStatus };
  res.json(ok(await listAdminPlaces(query.status)));
}

/** PATCH /api/admin/places/:id */
export async function patchAdminPlace(
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> {
  const { status } = req.body as { status: AdminModerationStatus };
  res.json(ok(await moderatePlace(req.params.id, status)));
}

/** DELETE /api/admin/places/:id */
export async function deleteAdminPlaceHandler(
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> {
  res.json(ok(await deleteAdminPlace(req.params.id)));
}

/** GET /api/admin/owners?verified=false */
export async function getAdminOwners(_req: Request, res: Response): Promise<void> {
  const query = res.locals.query as { verified?: boolean };
  res.json(ok(await listAdminOwners(query.verified)));
}

/** PATCH /api/admin/owners/:id */
export async function patchAdminOwner(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { verified } = req.body as AdminOwnerUpdateInput;
  res.json(ok(await setOwnerVerified(req.params.id, verified)));
}

/** GET /api/admin/colleges */
export async function getAdminColleges(_req: Request, res: Response): Promise<void> {
  res.json(ok(await listAdminColleges()));
}

/** POST /api/admin/colleges */
export async function postAdminCollege(req: Request, res: Response): Promise<void> {
  const input = req.body as AdminCollegeInput;
  res.status(201).json(ok(await createAdminCollege(input)));
}
