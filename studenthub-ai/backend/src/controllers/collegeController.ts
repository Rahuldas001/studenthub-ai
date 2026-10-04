import type { Request, Response } from 'express';
import { listColleges } from '../services/collegeService.js';
import { ok } from '../utils/response.js';

/** GET /api/colleges — public list of launch cities / campuses. */
export async function getColleges(_req: Request, res: Response): Promise<void> {
  res.json(ok(await listColleges()));
}
