import { z } from 'zod';
import { placeStatusSchema } from './placeSchemas.js';

/**
 * Admin panel schemas.
 *
 * Moderation accepts only the three terminal/publishing statuses: approving
 * (PENDING → ACTIVE), rejecting (PENDING → REJECTED), and unpublishing
 * (ACTIVE → INACTIVE). PENDING and DRAFT are never valid targets — a listing
 * that should return to review is edited by its owner instead.
 */
export const adminModerationSchema = z.object({
  status: z.enum(['ACTIVE', 'REJECTED', 'INACTIVE']),
});

export const adminOwnerUpdateSchema = z.object({
  verified: z.boolean(),
});

export const adminCollegeInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});

/** Query for GET /api/admin/places — any lifecycle status can be listed. */
export const adminPlacesQuerySchema = z.object({
  status: placeStatusSchema.optional(),
});

/**
 * Query for GET /api/admin/owners.
 *
 * Query strings arrive as text, so the filter is declared as an enum and
 * converted to a boolean for the service (`verified=false` → unverified only).
 */
export const adminOwnersQuerySchema = z.object({
  verified: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});
