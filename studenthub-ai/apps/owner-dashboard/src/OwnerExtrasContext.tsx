import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { OwnerAnalytics, OwnerAnalyticsListing, OwnerOffer, OwnerReview } from '@studenthub/types';
import { useOwner } from './OwnerContext';
import {
  createOwnerOffer,
  deleteOwnerOffer,
  deleteOwnerReviewReply,
  fetchOwnerAnalytics,
  fetchOwnerOffers,
  fetchOwnerReviews,
  replyToOwnerReview,
  updateOwnerOffer,
} from './owner';
import { toOfferInput, validateOfferDraft, type OfferDraft } from './ownerExtras';

/**
 * Server-backed owner tools for the standalone dashboard: promotional offers,
 * the review reply inbox and the analytics figures.
 *
 * Mirrors `apps/mobile-app/src/context/OwnerExtrasContext.tsx`. Everything here
 * is cached API state, so offers, replies and traffic look identical on every
 * device the owner signs in on. The listing extras (WhatsApp number, opening
 * hours, price band) are columns on the listing itself and therefore arrive with
 * `places` from `OwnerContext`.
 *
 * Mutations are optimistic-free: they wait for the API, and problems come back
 * as a message string so the calling screen can render it next to the button.
 */

/** Backend/network failures surface as the message the API already wrote. */
function reason(failure: unknown, fallback: string): string {
  return failure instanceof Error && failure.message ? failure.message : fallback;
}

function useOwnerExtrasState() {
  const { token } = useOwner();

  const [offers, setOffers] = useState<OwnerOffer[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [offersError, setOffersError] = useState('');

  const [reviews, setReviews] = useState<OwnerReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsLoaded, setReviewsLoaded] = useState(false);
  const [reviewsError, setReviewsError] = useState('');

  const [analytics, setAnalytics] = useState<OwnerAnalytics | null>(null);
  const [analyticsRange, setAnalyticsRange] = useState<7 | 30>(7);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState('');

  const refreshOffers = useCallback(async () => {
    if (!token) return;
    setOffersLoading(true);
    try {
      setOffers(await fetchOwnerOffers(token));
      setOffersError('');
    } catch (failure) {
      setOffersError(reason(failure, 'Could not load your offers.'));
    } finally {
      setOffersLoading(false);
    }
  }, [token]);

  const refreshReviews = useCallback(async () => {
    if (!token) return;
    setReviewsLoading(true);
    try {
      setReviews(await fetchOwnerReviews(token));
      setReviewsError('');
    } catch (failure) {
      setReviewsError(reason(failure, 'Could not load your reviews.'));
    } finally {
      setReviewsLoading(false);
      setReviewsLoaded(true);
    }
  }, [token]);

  const loadAnalytics = useCallback(async (range: 7 | 30 = 7) => {
    if (!token) return;
    setAnalyticsRange(range);
    setAnalyticsLoading(true);
    try {
      setAnalytics(await fetchOwnerAnalytics(token, range));
      setAnalyticsError('');
    } catch (failure) {
      setAnalyticsError(reason(failure, 'Could not load your analytics.'));
    } finally {
      setAnalyticsLoading(false);
    }
  }, [token]);

  // One warm-up per session: overview, listings and profile all read it.
  useEffect(() => {
    if (!token) {
      setOffers([]);
      setReviews([]);
      setAnalytics(null);
      return;
    }
    void refreshOffers();
    void refreshReviews();
    void loadAnalytics(7);
  }, [token, refreshOffers, refreshReviews, loadAnalytics]);

  /** Validates first, then POST/PATCHes. Returns the problem, or null on success. */
  const saveOffer = useCallback(async (draft: OfferDraft, id?: string): Promise<string | null> => {
    if (!token) return 'Sign in with an owner account to publish offers.';
    const problem = validateOfferDraft(draft);
    if (problem) return problem;
    const input = toOfferInput(draft);
    try {
      const saved = id
        ? await updateOwnerOffer(token, id, input)
        : await createOwnerOffer(token, input);
      setOffers((current) => (id
        ? current.map((offer) => (offer.id === id ? saved : offer))
        : [saved, ...current]));
      return null;
    } catch (failure) {
      return reason(failure, 'Could not save the offer.');
    }
  }, [token]);

  const removeOffer = useCallback(async (id: string): Promise<string | null> => {
    if (!token) return 'Sign in with an owner account to delete offers.';
    try {
      await deleteOwnerOffer(token, id);
      setOffers((current) => current.filter((offer) => offer.id !== id));
      return null;
    } catch (failure) {
      return reason(failure, 'Could not delete the offer.');
    }
  }, [token]);

  /** Pause/resume; the row is replaced with what the server stored. */
  const toggleOffer = useCallback(async (id: string): Promise<string | null> => {
    if (!token) return 'Sign in with an owner account to change offers.';
    const current = offers.find((offer) => offer.id === id);
    if (!current) return 'That offer is not in your list any more.';
    try {
      const saved = await updateOwnerOffer(token, id, { active: !current.active });
      setOffers((list) => list.map((offer) => (offer.id === id ? saved : offer)));
      return null;
    } catch (failure) {
      return reason(failure, 'Could not update the offer.');
    }
  }, [offers, token]);

  /** Writes (or clears, with an empty string) the public reply on a review. */
  const saveReply = useCallback(async (reviewId: string, reply: string): Promise<string | null> => {
    if (!token) return 'Sign in with an owner account to reply.';
    const text = reply.trim().slice(0, 400);
    if (text.length && text.length < 2) return 'A reply needs at least 2 characters.';
    try {
      const saved = text
        ? await replyToOwnerReview(token, reviewId, text)
        : await deleteOwnerReviewReply(token, reviewId);
      setReviews((current) => current.map((review) => (review.id === reviewId ? saved : review)));
      return null;
    } catch (failure) {
      return reason(failure, text ? 'Could not publish the reply.' : 'Could not delete the reply.');
    }
  }, [token]);

  /** Per-listing row of the current analytics window; undefined before load. */
  const analyticsFor = useCallback((placeId: string): OwnerAnalyticsListing | undefined => (
    analytics?.listings.find((row) => row.placeId === placeId)
  ), [analytics]);

  const answered = reviews.filter((review) => Boolean(review.reply)).length;

  return {
    offers,
    offersLoading,
    offersError,
    refreshOffers,
    saveOffer,
    removeOffer,
    toggleOffer,
    reviews,
    reviewsLoading,
    reviewsLoaded,
    reviewsError,
    refreshReviews,
    saveReply,
    answeredCount: answered,
    unansweredCount: reviews.length - answered,
    analytics,
    analyticsRange,
    analyticsLoading,
    analyticsError,
    loadAnalytics,
    analyticsFor,
  };
}

const OwnerExtrasContext = createContext<ReturnType<typeof useOwnerExtrasState> | null>(null);

export function OwnerExtrasProvider({ children }: { children: ReactNode }) {
  return <OwnerExtrasContext.Provider value={useOwnerExtrasState()}>{children}</OwnerExtrasContext.Provider>;
}

export function useOwnerExtras() {
  const value = useContext(OwnerExtrasContext);
  if (!value) throw new Error('OwnerExtrasProvider is required');
  return value;
}
