import type { Request, Response } from 'express';
import type { VisitRequestInput } from '@studenthub/types';
import { createVisitRequest } from '../services/visitRequestService.js';
import { ok } from '../utils/response.js';

/** POST /api/visit-requests */
export async function postVisitRequest(req: Request, res: Response): Promise<void> {
  const input = req.body as VisitRequestInput;
  const visitRequest = await createVisitRequest(input, req.user?.id);

  res.status(201).json(ok(visitRequest));
}