import { z } from 'zod';
import { placeStatusSchema } from './placeSchemas.js';

/**
 * Query strings for the owner area.
 *
 * `placeId` follows the same length rule as the shared favorite schema (cuid
 * ids fit comfortably); status enums mirror the Prisma lifecycle so owners
 * can filter listings and inbox rows the same way the service groups them.
 */
export const ownerPlacesQuerySchema = z.object({
  status: placeStatusSchema.optional(),
});

export const ownerVisitRequestsQuerySchema = z.object({
  placeId: z.string().trim().min(1).max(64).optional(),
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']).optional(),
});

/**
 * Offer rules mirror the owner form exactly: a whole 1-90% discount, a short
 * title/description, and an optional `YYYY-MM-DD` expiry. `placeId` is null
 * (or absent) when the promo applies to every listing the owner runs.
 */
export const ownerOfferInputSchema = z.object({
  placeId: z.string().trim().min(1).max(64).nullable().optional(),
  title: z.string().trim().min(3).max(60),
  description: z.string().trim().min(5).max(160),
  discount: z.coerce.number().int().min(1).max(90),
  validTill: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
    .nullable()
    .optional(),
});

/** Body for PATCH /api/owner/offers/:id: any subset, plus the pause switch. */
export const ownerOfferUpdateSchema = ownerOfferInputSchema
  .partial()
  .extend({ active: z.boolean().optional() })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
    path: ['_'],
  });

/** Inbox filters: one listing, or only the reviews still waiting for a reply. */
export const ownerReviewsQuerySchema = z.object({
  placeId: z.string().trim().min(1).max(64).optional(),
  filter: z.enum(['ALL', 'UNANSWERED', 'ANSWERED']).optional(),
});

/** Body for POST /api/owner/reviews/:id/reply. */
export const ownerReviewReplySchema = z.object({
  reply: z.string().trim().min(2).max(400),
});

/** Traffic window for the analytics screen. */
export const ownerAnalyticsQuerySchema = z.object({
  range: z.coerce
    .number()
    .int()
    .refine((value) => value === 7 || value === 30, 'range must be 7 or 30')
    .optional(),
});

