import type { Request, Response } from 'express';
import type { LoginInput, RegisterInput } from '@studenthub/types';
import { getAccount, login, register } from '../services/authService.js';
import { ok } from '../utils/response.js';

/** POST /api/auth/register */
export async function postRegister(req: Request, res: Response): Promise<void> {
  const input = req.body as RegisterInput;
  const payload = await register(input);

  res.status(201).json(ok(payload));
}

/** POST /api/auth/login */
export async function postLogin(req: Request, res: Response): Promise<void> {
  const input = req.body as LoginInput;
  const payload = await login(input);

  res.json(ok(payload));
}

/** GET /api/auth/me */
export async function getMe(req: Request, res: Response): Promise<void> {
  const user = await getAccount(req.user!.id);
  res.json(ok(user));
}

/**
 * POST /api/auth/logout
 *
 * Tokens are stateless, so the client simply discards it; this endpoint exists
 * so the app has a single, explicit sign-out call.
 */
export async function postLogout(_req: Request, res: Response): Promise<void> {
  res.json(ok({ signedOut: true }));
}