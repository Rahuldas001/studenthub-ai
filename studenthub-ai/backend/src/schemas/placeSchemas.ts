import { z } from 'zod';

/**
 * Auth request schemas.
 *
 * An account needs exactly one reachable identifier (email or phone) plus a
 * password; both is better. Identifiers are normalised here so lookups and
 * unique constraints stay predictable.
 */
export const registerInputSchema = z
  .object({
    displayName: z.string().trim().min(2).max(80),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .max(200)
      .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address')
      .optional(),
    phone: z
      .string()
      .trim()
      .min(10)
      .max(16)
      .regex(/^[+\d][\d\s-]*$/, 'Enter a valid phone number')
      .optional(),
    password: z.string().min(8).max(200),
  })
  .refine((value) => Boolean(value.email || value.phone), {
    message: 'Provide an email address or a phone number',
    path: ['email'],
  });

export const loginInputSchema = z.object({
  identifier: z.string().trim().min(3).max(200),
  password: z.string().min(1).max(200),
});

/** Shared enum mirrors of the Prisma enums (kept in sync manually in V1). */
export const placeCategorySchema = z.enum([
  'PG',
  'HOSTEL',
  'RESTAURANT',
  'MESS',
  'CAFE',
  'LIBRARY',
  'PHARMACY',
  'ATM',
  'GROCERY',
  'BUS_STOP',
  'GYM',
]);

export const placeGenderSchema = z.enum(['BOYS', 'GIRLS', 'CO_ED']);

export const priceBandSchema = z.enum(['BUDGET', 'MID', 'PREMIUM']);

export const placeStatusSchema = z.enum(['DRAFT', 'PENDING', 'ACTIVE', 'REJECTED', 'INACTIVE']);

/**
 * Query schema for GET /api/places.
 *
 * Values arrive as strings, so numbers are coerced. Latitude/longitude must be
 * supplied together — `radius` alone would have no reference point.
 */
export const placesQuerySchema = z
  .object({
    category: placeCategorySchema.optional(),
    search: z.string().trim().min(1).max(120).optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    radius: z.coerce.number().positive().max(50).optional(),
    minPrice: z.coerce.number().int().nonnegative().optional(),
    maxPrice: z.coerce.number().int().nonnegative().optional(),
    gender: placeGenderSchema.optional(),
    sort: z.enum(['relevance', 'distance', 'price', 'rating']).optional(),
  })
  .refine(
    (value) =>
      (value.latitude === undefined && value.longitude === undefined) ||
      (value.latitude !== undefined && value.longitude !== undefined),
    {
      message: 'latitude and longitude must be provided together',
      path: ['latitude'],
    },
  );

export const reviewInputSchema = z.object({
  placeId: z.string().trim().min(1).max(64),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().min(5).max(1000),
  authorName: z.string().trim().min(2).max(80).optional(),
});

export const favoriteInputSchema = z.object({
  placeId: z.string().trim().min(1).max(64),
});

export const visitRequestInputSchema = z.object({
  placeId: z.string().trim().min(1).max(64),
  name: z.string().trim().min(2).max(80),
  // Loose on formatting, strict on length: Indian numbers with or without +91.
  phone: z
    .string()
    .trim()
    .min(10)
    .max(16)
    .regex(/^[+\d][\d\s-]*$/, 'Enter a valid phone number'),
  preferredDate: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) => value === undefined || !Number.isNaN(Date.parse(value)),
      'preferredDate must be a valid date',
    ),
  note: z.string().trim().max(500).optional(),
});

/** Shared phone rule for owner inputs (business and listing contact numbers). */
const businessPhoneSchema = z
  .string()
  .trim()
  .min(10)
  .max(16)
  .regex(/^[+\d][\d\s-]*$/, 'Enter a valid phone number');

/** Body for POST /api/auth/owner/register: account plus business profile. */
export const ownerRegisterInputSchema = registerInputSchema.extend({
  businessName: z.string().trim().min(2).max(120),
  businessPhone: businessPhoneSchema.optional(),
});

/** Body for POST /api/owner/profile (OWNER accounts created without one). */
export const ownerProfileInputSchema = z.object({
  businessName: z.string().trim().min(2).max(120),
  businessPhone: businessPhoneSchema.optional(),
});

/**
 * Body for POST /api/owner/places.
 *
 * Mirrors the student-visible fields; moderation (`status`, `verified`) stays
 * server-controlled and new listings always enter PENDING review.
 */
export const ownerPlaceCreateSchema = z.object({
  category: placeCategorySchema,
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional(),
  address: z.string().trim().min(5).max(300),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  price: z.coerce.number().int().nonnegative().nullable().optional(),
  priceUnit: z.string().trim().max(20).nullable().optional(),
  phone: businessPhoneSchema.optional(),
  whatsapp: businessPhoneSchema.nullable().optional(),
  openingHours: z.string().trim().min(1).max(60).nullable().optional(),
  priceBand: priceBandSchema.nullable().optional(),
  imageUrl: z.string().trim().min(1).max(2000),
  gender: placeGenderSchema.optional(),
  collegeId: z.string().trim().min(1).max(64).optional(),
  facilities: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
});

/**
 * Body for PATCH /api/owner/places/:id.
 *
 * Owners may edit content fields and explicitly unpublish (INACTIVE) or
 * resubmit (PENDING); anything else is a 400. Editing an ACTIVE listing
 * additionally resets it to PENDING in the service for re-review.
 */
export const ownerPlaceUpdateSchema = ownerPlaceCreateSchema
  .partial()
  .extend({ status: z.enum(['PENDING', 'INACTIVE']).optional() })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
    path: ['_'],
  });

/** Body for PATCH /api/owner/visit-requests/:id. */
export const visitRequestStatusUpdateSchema = z.object({
  status: z.enum(['CONFIRMED', 'CANCELLED', 'COMPLETED']),
});