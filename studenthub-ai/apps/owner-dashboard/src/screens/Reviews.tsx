import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { OwnerReview } from '@studenthub/types';
import { Button, Empty, colors, ui } from '../ui';
import { useOwner } from '../OwnerContext';
import { useOwnerExtras } from '../OwnerExtrasContext';
import { Notice, OptionRow, OwnerInput, OwnerTopBar, RatingPill, Stars, kit, shortDate, type OwnerNav } from '../OwnerKit';

/**
 * Screen 6 - the review inbox across every listing the owner runs.
 *
 * Mirrors `apps/mobile-app/src/screens/owner/OwnerReviews.tsx`. Reviews and
 * replies both come from `/api/owner/reviews`, so the reply typed here is the
 * reply students read on the listing page, on any device.
 */

type Filter = 'ALL' | 'UNANSWERED' | 'ANSWERED';

/** Rating histogram helpers; they only ever look at the rows in hand. */
function averageRating(reviews: OwnerReview[]): number {
  if (!reviews.length) return 0;
  return reviews.reduce((total, review) => total + review.rating, 0) / reviews.length;
}

function ratingBreakdown(reviews: OwnerReview[]): { stars: number; count: number; share: number }[] {
  return [5, 4, 3, 2, 1].map((stars) => {
    const count = reviews.filter((review) => review.rating === stars).length;
    return { stars, count, share: reviews.length ? (count / reviews.length) * 100 : 0 };
  });
}

export default function Reviews({ nav }: { nav: OwnerNav }) {
  const { places } = useOwner();
  const { reviews, reviewsLoading, reviewsError, refreshReviews, saveReply } = useOwnerExtras();
  const [filter, setFilter] = useState<Filter>('ALL');
  const [openId, setOpenId] = useState('');
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const answered = (review: OwnerReview) => Boolean(review.reply);
  const unanswered = reviews.filter((review) => !answered(review));
  const rows = (filter === 'ALL' ? reviews : filter === 'UNANSWERED' ? unanswered : reviews.filter(answered))
    .slice()
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const average = averageRating(reviews);
  const breakdown = ratingBreakdown(reviews);
  const open = (review: OwnerReview) => {
    setOpenId(review.id);
    setDraft(review.reply ?? '');
    setError('');
  };

  const submitReply = async (review: OwnerReview) => {
    if (busy) return;
    setBusy(true);
    const problem = await saveReply(review.id, draft);
    setBusy(false);
    if (problem) { setError(problem); return; }
    setError('');
    setOpenId('');
  };
  const removeReply = async (review: OwnerReview) => {
    setError(await saveReply(review.id, '') ?? '');
  };

  return <View style={kit.body}>
    <OwnerTopBar
      title="Reviews"
      subtitle={`${reviews.length} review${reviews.length === 1 ? '' : 's'} across ${places.length} listing${places.length === 1 ? '' : 's'}`}
      right={unanswered.length ? <View style={[kit.pill, { backgroundColor: '#FFF6DC' }]}><Text style={[kit.pillText, { color: '#946600' }]}>{unanswered.length} to answer</Text></View> : undefined}
    />

    {reviewsLoading ? <View style={[ui.panel, { alignItems: 'center', paddingVertical: 20, gap: 10 }]}>
      <ActivityIndicator color={colors.purple} />
      <Text style={ui.caption}>Loading your review inbox…</Text>
    </View> : null}

    {!reviewsLoading ? <View style={[ui.panel, { gap: 12 }]}>
      <View style={ui.between}>
        <View style={{ gap: 2 }}>
          <Text style={kit.metricValue}>{reviews.length ? average.toFixed(1) : '—'}</Text>
          <Text style={kit.metricLabel}>Average rating</Text>
        </View>
        {reviews.length ? <RatingPill value={average} count={reviews.length} /> : null}
      </View>
      <Stars value={average} size={18} />
      <View style={{ gap: 6 }}>
        {breakdown.map((row) => <View key={row.stars} style={ui.row}>
          <Text style={styles.starLabel}>{row.stars}★</Text>
          <View style={kit.bar}><View style={[kit.barFill, { width: `${row.share}%` }]} /></View>
          <Text style={styles.starCount}>{row.count}</Text>
        </View>)}
      </View>
      {reviews.length === 0
        ? <Text style={ui.caption}>No reviews yet. Confirmed visits turn into reviews fastest — follow up with students after their visit.</Text>
        : null}
    </View> : null}

    {reviewsError ? <Text style={kit.error}>{reviewsError}</Text> : null}
    <Notice
      title="Replies are published to your listing"
      text="A reply is saved with the review on the StudentHub servers, so students see it on the listing page and you see it from any device."
      action={reviewsLoading ? undefined : { label: 'Refresh inbox', onPress: () => void refreshReviews() }}
    />

    <OptionRow<Filter>
      options={[
        { id: 'ALL', label: `All (${reviews.length})` },
        { id: 'UNANSWERED', label: `To answer (${unanswered.length})` },
        { id: 'ANSWERED', label: `Answered (${reviews.length - unanswered.length})` },
      ]}
      value={filter}
      onChange={setFilter}
    />

    {!places.length && !reviewsLoading ? <Empty icon="★" title="No listings yet"
      body="Reviews attach to listings. Publish a listing (and get it approved) before students can rate it.">
      <Button title="Open listings" onPress={() => nav.tab('listings')} />
    </Empty> : null}

    {!!places.length && !rows.length && !reviewsLoading ? <Empty icon="★" title={filter === 'ALL' ? 'No reviews yet' : 'Nothing in this filter'}
      body={filter === 'ALL' ? 'Students can rate your listings after a visit.' : 'Switch the filter to read your other reviews.'} /> : null}

    {rows.map((review) => {
      const stored = review.reply ?? '';
      const editing = openId === review.id;
      return <View key={review.id} style={[ui.panel, { gap: 10 }]}>
        <View style={ui.between}>
          <View style={{ flexShrink: 1, gap: 2 }}>
            <Text style={ui.cardTitle}>{review.authorName}</Text>
            <Text style={ui.caption}>{review.placeName} · {shortDate(review.createdAt)}</Text>
          </View>
          <RatingPill value={review.rating} count={0} />
        </View>
        <Stars value={review.rating} />
        <Text style={ui.body}>{review.comment}</Text>

        {stored ? <View style={styles.reply}>
          <Text style={styles.replyLabel}>Your reply · live on your listing{review.repliedAt ? ` · ${shortDate(review.repliedAt)}` : ''}</Text>
          <Text style={styles.replyText}>{stored}</Text>
        </View> : null}

        {editing ? <View style={{ gap: 10 }}>
          <OwnerInput label="Your reply" value={draft} onChange={setDraft} placeholder="Thanks for visiting — see you again soon!" multiline />
          {error ? <Text style={kit.error}>{error}</Text> : null}
          <View style={[ui.row, { gap: 10, flexWrap: 'wrap' }]}>
            <Button title={busy ? 'Publishing…' : 'Publish reply'} onPress={() => void submitReply(review)} disabled={busy} />
            <Button title="Cancel" secondary onPress={() => { setOpenId(''); setError(''); }} />
          </View>
        </View> : <View style={[ui.row, { gap: 10, flexWrap: 'wrap' }]}>
          <Button title={stored ? 'Edit reply' : 'Write a reply'} secondary onPress={() => open(review)} />
          {stored ? <Button title="Delete reply" secondary onPress={() => void removeReply(review)} /> : null}
        </View>}
      </View>;
    })}

    <Button title="Back to overview" secondary onPress={() => nav.tab('overview')} />
  </View>;
}

const styles = StyleSheet.create({
  starLabel: { width: 26, fontSize: 11, fontWeight: '700', color: colors.muted },
  starCount: { width: 28, textAlign: 'right', fontSize: 11, fontWeight: '700', color: colors.ink },
  reply: { backgroundColor: colors.pale, borderRadius: 14, padding: 12, gap: 4 },
  replyLabel: { fontSize: 10, fontWeight: '800', color: colors.purple },
  replyText: { fontSize: 13, color: colors.ink, lineHeight: 20 },
});
