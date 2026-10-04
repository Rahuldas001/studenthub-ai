import type { Request, Response } from 'express';
import type {
  OwnerOfferInput,
  OwnerOfferUpdateInput,
  OwnerPlaceInput,
  OwnerPlaceUpdateInput,
  OwnerProfileInput,
  OwnerRegisterInput,
  OwnerReview,
  OwnerVisitRequest,
  PlaceStatus,
} from '@studenthub/types';
import { getOwnerProfile, registerOwner, upsertOwnerProfile } from '../services/ownerService.js';
import {
  createOwnerPlace,
  deleteOwnerPlace,
  listOwnerPlaces,
  listOwnerVisitRequests,
  updateOwnerPlace,
  updateOwnerVisitRequest,
} from '../services/ownerPlaceService.js';
import {
  createOwnerOffer,
  deleteOwnerOffer,
  listOwnerOffers,
  updateOwnerOffer,
} from '../services/offerService.js';
import {
  deleteOwnerReviewReply,
  listOwnerReviews,
  replyToOwnerReview,
} from '../services/ownerReviewService.js';
import { getOwnerAnalytics } from '../services/ownerAnalyticsService.js';
import { ok } from '../utils/response.js';

/** POST /api/auth/owner/register */
export async function postOwnerRegister(req: Request, res: Response): Promise<void> {
  const input = req.body as OwnerRegisterInput;
  const payload = await registerOwner(input);

  res.status(201).json(ok(payload));
}

/** POST /api/owner/profile */
export async function postOwnerProfile(req: Request, res: Response): Promise<void> {
  const input = req.body as OwnerProfileInput;
  const owner = await upsertOwnerProfile(req.user!.id, input);

  res.status(201).json(ok({ owner }));
}

/** GET /api/owner/profile */
export async function getOwnerProfileHandler(req: Request, res: Response): Promise<void> {
  const owner = await getOwnerProfile(req.user!.id);

  res.json(ok({ owner }));
}

/** GET /api/owner/places?status=PENDING */
export async function getOwnerPlaces(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as { status?: PlaceStatus };
  const payload = await listOwnerPlaces(req.owner!.id, query.status);

  res.json(ok(payload));
}

/** POST /api/owner/places */
export async function postOwnerPlace(req: Request, res: Response): Promise<void> {
  const input = req.body as OwnerPlaceInput;
  const place = await createOwnerPlace(req.owner!.id, input);

  res.status(201).json(ok(place));
}

/**
 * PATCH /api/owner/places/:id
 *
 * Param typing is explicit: Express 5 types route params as `string | string[]`.
 */
export async function patchOwnerPlace(req: Request<{ id: string }>, res: Response): Promise<void> {
  const input = req.body as OwnerPlaceUpdateInput;
  const place = await updateOwnerPlace(req.owner!.id, req.params.id, input);

  res.json(ok(place));
}

/** DELETE /api/owner/places/:id */
export async function deleteOwnerPlaceHandler(
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> {
  const result = await deleteOwnerPlace(req.owner!.id, req.params.id);

  res.json(ok(result));
}

/** GET /api/owner/visit-requests?placeId=&status= */
export async function getOwnerVisitRequests(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as {
    placeId?: string;
    status?: OwnerVisitRequest['status'];
  };
  const payload = await listOwnerVisitRequests(req.owner!.id, {
    placeId: query.placeId,
    status: query.status,
  });

  res.json(ok(payload));
}

/** PATCH /api/owner/visit-requests/:id */
export async function patchOwnerVisitRequest(
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> {
  const { status } = req.body as { status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' };
  const request = await updateOwnerVisitRequest(req.owner!.id, req.params.id, status);

  res.json(ok(request));
}

/** GET /api/owner/offers — every promo the business runs, newest first. */
export async function getOwnerOffers(req: Request, res: Response): Promise<void> {
  const offers = await listOwnerOffers(req.owner!.id);

  res.json(ok({ offers }));
}

/** POST /api/owner/offers */
export async function postOwnerOffer(req: Request, res: Response): Promise<void> {
  const input = req.body as OwnerOfferInput;
  const offer = await createOwnerOffer(req.owner!.id, input);

  res.status(201).json(ok(offer));
}

/** PATCH /api/owner/offers/:id — edit details or pause/resume via `active`. */
export async function patchOwnerOffer(req: Request<{ id: string }>, res: Response): Promise<void> {
  const input = req.body as OwnerOfferUpdateInput;
  const offer = await updateOwnerOffer(req.owner!.id, req.params.id, input);

  res.json(ok(offer));
}

/** DELETE /api/owner/offers/:id */
export async function deleteOwnerOfferHandler(
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> {
  const result = await deleteOwnerOffer(req.owner!.id, req.params.id);

  res.json(ok(result));
}

/** GET /api/owner/reviews?placeId=&filter=ALL|UNANSWERED|ANSWERED */
export async function getOwnerReviews(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as {
    placeId?: string;
    filter?: 'ALL' | 'UNANSWERED' | 'ANSWERED';
  };
  const reviews = await listOwnerReviews(req.owner!.id, query);

  res.json(ok({ reviews }));
}

/** POST /api/owner/reviews/:id/reply — publishes the reply on the place page. */
export async function postOwnerReviewReply(
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> {
  const { reply } = req.body as { reply: string };
  const review: OwnerReview = await replyToOwnerReview(req.owner!.id, req.params.id, reply);

  res.status(201).json(ok(review));
}

/** DELETE /api/owner/reviews/:id/reply */
export async function deleteOwnerReviewReplyHandler(
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> {
  const review = await deleteOwnerReviewReply(req.owner!.id, req.params.id);

  res.json(ok(review));
}

/** GET /api/owner/analytics?range=7|30 — measured traffic, not estimates. */
export async function getOwnerAnalyticsHandler(req: Request, res: Response): Promise<void> {
  const { range } = res.locals.query as { range?: 7 | 30 };
  const analytics = await getOwnerAnalytics(req.owner!.id, range ?? 7);

  res.json(ok(analytics));
}
