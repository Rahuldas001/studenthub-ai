import type { Request, Response } from 'express';
import type { ReviewInput } from '@studenthub/types';
import { createReview } from '../services/reviewService.js';
import { ok } from '../utils/response.js';

/** POST /api/reviews */
export async function postReview(req: Request, res: Response): Promise<void> {
  const input = req.body as ReviewInput;
  const review = await createReview(input, req.user?.id);

  res.status(201).json(ok(review));
}