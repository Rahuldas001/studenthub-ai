import type { Request, Response } from 'express';
import type { LoginInput, RegisterInput } from '@studenthub/types';
import { getAccount, login, register, requestPasswordReset, resetPasswordWithCode, updateProfile } from '../services/authService.js';
import { deleteAccount } from '../services/accountService.js';
import { ok } from '../utils/response.js';
import { HttpError } from '../utils/httpError.js';

export async function postRegister(req: Request, res: Response): Promise<void> {
  const input = req.body as RegisterInput;
  const payload = await register(input);

  res.status(201).json(ok(payload));
}

export async function postLogin(req: Request, res: Response): Promise<void> {
  const input = req.body as LoginInput;
  const payload = await login(input);

  res.json(ok(payload));
}

export async function getMe(req: Request, res: Response): Promise<void> {
  const user = await getAccount(req.user!.id);
  res.json(ok(user));
}

export async function postLogout(_req: Request, res: Response): Promise<void> {
  res.json(ok({ signedOut: true }));
}

export async function deleteAccountHandler(req: Request, res: Response): Promise<void> {
  const summary = await deleteAccount(req.user!.id);
  res.json(ok(summary));
}

export async function postForgotPassword(req: Request, res: Response): Promise<void> {
  const { identifier } = req.body as { identifier: string };
  if (!identifier || typeof identifier !== 'string') {
    throw HttpError.badRequest('Enter your registered email address or phone number.');
  }
  const result = await requestPasswordReset(identifier);
  res.json(ok(result));
}

export async function postResetPassword(req: Request, res: Response): Promise<void> {
  const { identifier, code, newPassword } = req.body as { identifier: string; code: string; newPassword: string };
  if (!identifier || !code || !newPassword) {
    throw HttpError.badRequest('Email/phone, verification code, and new password are required.');
  }
  if (newPassword.length < 8) {
    throw HttpError.badRequest('New password must be at least 8 characters long.');
  }
  const result = await resetPasswordWithCode(identifier, code, newPassword);
  res.json(ok(result));
}

export async function patchProfile(req: Request, res: Response): Promise<void> {
  const user = await updateProfile(req.user!.id, req.body);
  res.json(ok(user));
}
