import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Empty, colors, ui } from '../ui';
import { useOwner } from '../OwnerContext';
import { useOwnerExtras } from '../OwnerExtrasContext';
import { useSession } from '../SessionContext';
import {
  MetricRow,
  Notice,
  OwnerTopBar,
  SectionCard,
  StatTile,
  StatusPill,
  kit,
  shortDate,
  type OwnerNav,
} from '../OwnerKit';

/**
 * Screen 2 - overview.
 *
 * Mirrors `apps/mobile-app/src/screens/owner/OwnerHome.tsx`: every number is
 * real API state. Listings and the visit-request inbox come from
 * `OwnerContext`, and views/saves/enquiries plus the offer and reply counts come
 * from `OwnerExtrasContext`, which reads `/api/owner/analytics`.
 */

/** Time-of-day aware greeting; a plain Hello would read as a form letter. */
function greeting(name: string, now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 5) return `Still up, ${name}?`;
  if (hour < 12) return `Good morning, ${name}`;
  if (hour < 18) return `Good afternoon, ${name}`;
  return `Good evening, ${name}`;
}

export default function Overview({ nav }: { nav: OwnerNav }) {
  const { session } = useSession();
  const { places, loading, refresh, requests, requestCounts } = useOwner();
  const {
    analytics,
    analyticsLoading,
    analyticsError,
    loadAnalytics,
    analyticsFor,
    offers,
    reviews,
    unansweredCount,
  } = useOwnerExtras();

  // The provider warms the cache at sign-in; re-asking on mount keeps the
  // dashboard honest right after a listing or offer edit elsewhere.
  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const totals = analytics?.totals ?? null;
  const trend = analytics?.series ?? [];
  const top = Math.max(1, ...trend.map((point) => point.views));
  const pending = requestCounts.PENDING ?? 0;
  const confirmed = requestCounts.CONFIRMED ?? 0;
  const completed = requestCounts.COMPLETED ?? 0;
  const liveOffers = offers.filter((offer) => offer.active).length;
  const firstName = (session?.user.displayName ?? 'there').trim().split(' ')[0];

  return <View style={kit.body}>
    <OwnerTopBar
      title={greeting(firstName)}
      subtitle={analyticsLoading
        ? `${places.length} listing${places.length === 1 ? '' : 's'} · counting views…`
        : `${totals?.views ?? 0} views · ${places.length} listing${places.length === 1 ? '' : 's'} · last 7 days`}
      right={
        <View style={ui.row}>
          <Button title="Refresh" secondary onPress={() => { refresh(); void loadAnalytics(); }} />
          <Button title="Analytics" secondary onPress={() => nav.tab('analytics')} />
        </View>
      }
    />

    {loading ? (
      <View style={[ui.panel, { alignItems: 'center', gap: 8 }]}>
        <Text style={ui.cardTitle}>Loading your listings…</Text>
        <Text style={ui.caption}>Fetching everything you own from StudentHub.</Text>
      </View>
    ) : null}

    {!loading && analyticsError ? (
      <Notice
        title="Analytics unavailable"
        text={analyticsError}
        action={{ label: 'Try again', onPress: () => void loadAnalytics() }}
      />
    ) : null}

    {!loading && !places.length ? (
      <Empty
        icon="⌂"
        title="No listings yet"
        body="Listings you create appear here with their views, saves and visit requests, measured from real student activity."
      >
        <Button title="Create a listing" onPress={() => nav.form()} />
      </Empty>
    ) : null}

    {!loading && places.length ? (
      <>
        <View style={kit.grid}>
          <StatTile icon="👁" label="Views · 7d" value={String(totals?.views ?? 0)} delta={totals?.viewsDelta ?? undefined} />
          <StatTile icon="♡" label="Saves" value={String(totals?.saves ?? 0)} delta={totals?.savesDelta ?? undefined} />
          <StatTile icon="✆" label="Enquiries" value={String(totals?.enquiries ?? 0)} delta={totals?.enquiriesDelta ?? undefined} />
          <StatTile icon="★" label="Rating" value={totals?.rating ? totals.rating.toFixed(1) : '—'} />
        </View>

        <View style={[ui.panel, { gap: 10 }]}>
          <Text style={ui.cardTitle}>Visit requests</Text>
          <View style={styles.requestRow}>
            {[
              { label: 'New', count: pending },
              { label: 'Confirmed', count: confirmed },
              { label: 'Completed', count: completed },
              { label: 'Offers live', count: liveOffers },
            ].map((cell) => (
              <View key={cell.label} style={styles.requestCell}>
                <Text style={styles.requestCount}>{cell.count}</Text>
                <Text style={styles.requestLabel}>{cell.label}</Text>
              </View>
            ))}
          </View>
          {requests.slice(0, 2).map((request) => (
            <View key={request.id} style={ui.between}>
              <Text numberOfLines={1} style={styles.requestWho}>{request.name} · {request.placeName}</Text>
              <Text style={ui.caption}>{shortDate(request.preferredDate ?? request.createdAt)}</Text>
            </View>
          ))}
          {!requests.length ? (
            <Text style={ui.caption}>No new requests right now — every confirmed visit lands here first.</Text>
          ) : null}
          <Button title="Open booking inbox" secondary onPress={() => nav.tab('requests')} />
        </View>

        <View style={[ui.panel, { gap: 10 }]}>
          <View style={ui.between}>
            <Text style={ui.cardTitle}>Your listings</Text>
            <Text style={ui.caption}>{places.length} total</Text>
          </View>
          {places.slice(0, 4).map((place) => {
            const metrics = analyticsFor(place.id);
            return (
              <View key={place.id} style={styles.listingRow}>
                <View style={ui.between}>
                  <Text numberOfLines={1} style={[ui.cardTitle, { flexShrink: 1 }]}>{place.name}</Text>
                  <StatusPill status={place.status} />
                </View>
                <Text style={ui.caption}>{place.category} · {place.address}</Text>
                <MetricRow items={[
                  { label: 'Views', value: String(metrics?.views ?? 0) },
                  { label: 'Saves', value: String(metrics?.saves ?? 0) },
                  { label: 'Enquiries', value: String(metrics?.enquiries ?? 0) },
                  { label: 'Rating', value: place.reviewCount ? place.rating.toFixed(1) : '—' },
                ]} />
              </View>
            );
          })}
          <View style={ui.row}>
            <Button title="All listings" secondary onPress={() => nav.tab('listings')} />
            <Button title="New listing" onPress={() => nav.form()} />
          </View>
        </View>

        <View style={[ui.panel, { gap: 10 }]}>
          <Text style={ui.cardTitle}>Views per day · last 7 days</Text>
          {analyticsLoading && !trend.length ? (
            <Text style={ui.caption}>Counting your views…</Text>
          ) : totals?.views ? (
            <View style={styles.chart}>
              {trend.map((point) => (
                <View key={point.date} style={styles.chartCol}>
                  <View style={[styles.chartBar, { height: Math.max(4, Math.round((point.views / top) * 72)) }]} />
                  <Text style={styles.chartLabel}>{point.label}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={ui.body}>
              No views yet in the last 7 days. Only approved listings earn traffic — publish one and share it with students on campus.
            </Text>
          )}
          <Button title="Open analytics" secondary onPress={() => nav.tab('analytics')} />
        </View>

        <SectionCard title="Promotions" action="Offers" onPress={() => nav.tab('offers')}>
          <Text style={ui.body}>
            {liveOffers
              ? `${liveOffers} offer${liveOffers === 1 ? '' : 's'} live right now.`
              : 'Lower the price for a week and watch the enquiries land.'}
          </Text>
          <View style={ui.row}>
            <Button title="Manage offers" secondary onPress={() => nav.tab('offers')} />
            <Button title="New listing" onPress={() => nav.form()} />
          </View>
        </SectionCard>

        <SectionCard title="Student questions" action="Reviews" onPress={() => nav.tab('reviews')}>
          <Text style={ui.body}>
            {unansweredCount
              ? `${unansweredCount} review${unansweredCount === 1 ? '' : 's'} of ${reviews.length} still waiting for your reply.`
              : reviews.length
                ? `All ${reviews.length} reviews answered — every reply is live on your listing.`
                : 'Reviews arrive once students visit. Answering them fast is the next booking.'}
          </Text>
          <Button title="Read & reply" secondary onPress={() => nav.tab('reviews')} />
        </SectionCard>

        <Button title="Create another listing" onPress={() => nav.form()} />
      </>
    ) : null}
  </View>;
}

const styles = StyleSheet.create({
  requestRow: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10, columnGap: 12 },
  requestCell: { flexGrow: 1, flexBasis: 140, backgroundColor: colors.pale, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 10, alignItems: 'center', gap: 2 },
  requestCount: { fontSize: 18, fontWeight: '900', color: colors.purple },
  requestLabel: { fontSize: 10, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: '700' },
  requestWho: { fontSize: 12, fontWeight: '700', color: colors.ink, flexShrink: 1 },
  listingRow: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12, gap: 8 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 100 },
  chartCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  chartBar: { width: '100%', borderRadius: 6, backgroundColor: colors.purple, opacity: 0.85 },
  chartLabel: { fontSize: 9, color: colors.muted, fontWeight: '700' },
});
