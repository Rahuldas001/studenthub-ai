import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AdminOwnerSummary, AdminPlaceSummary } from '@studenthub/types';
import { useAdmin } from '../AdminContext';
import { setAdminOwnerVerified } from '../admin';
import { unverifiedOwners } from '../adminExtras';
import {
  activityFromReal,
  categoryRows,
  mapPins,
  priceLabel,
  statTrends,
  topRatedPlaces,
  totalReviews,
  visitSummaryRows,
} from '../dashboardData';
import {
  ActivityFeed,
  Card,
  CardHeader,
  Donut,
  GradientSurface,
  LineChart,
  MiniMap,
  ProgressBar,
  QuickAction,
  SoftBadge,
  StatCard,
  TONE,
  dash,
  type Series,
} from '../kit';
import {
  SAMPLE_ACTIVITY,
  SAMPLE_BOOKINGS,
  SAMPLE_BOOKING_STATUS_COLORS,
  SAMPLE_DELTAS,
  SAMPLE_GROWTH,
  SAMPLE_NOTIFICATIONS,
} from '../sample';
import { Button, Empty, StatusChip, Thumb, colors, ui } from '../ui';
import type { AdminTab } from './Dashboard';

/** Status → colour for the real visit-request breakdown. */
const VISIT_TONE: Record<string, { fg: string; bg: string }> = {
  PENDING: { fg: colors.amber, bg: colors.amberBg },
  CONFIRMED: { fg: colors.greenDark, bg: colors.okBg },
  COMPLETED: { fg: colors.slate, bg: colors.lineSoft },
  CANCELLED: { fg: colors.error, bg: colors.errorBg },
};

/** Icon + accent per quick action. */
const QUICK_ACTIONS: { icon: string; tone: 'blue' | 'orange' | 'pink' | 'green' | 'violet'; title: string; body: string; go: AdminTab }[] = [
  { icon: '＋', tone: 'blue', title: 'Add New Listing', body: 'Review the submission queue', go: 'listings' },
  { icon: '📅', tone: 'orange', title: 'View Bookings', body: 'Track visit requests', go: 'bookings' },
  { icon: '⭐', tone: 'pink', title: 'Manage Reviews', body: 'Ratings per listing', go: 'reviews' },
  { icon: '📈', tone: 'green', title: 'View Analytics', body: 'Growth & distribution', go: 'analytics' },
  { icon: '📄', tone: 'violet', title: 'Generate Report', body: 'Export live summaries', go: 'reports' },
];

/** One recent-listing row: thumbnail, name/address, rating, price and status. */
function ListingRow({ place, onOpen }: { place: AdminPlaceSummary; onOpen: () => void }) {
  const price = priceLabel(place);
  return <View style={styles.tableRow}>
    {place.imageUrl ? <Thumb uri={place.imageUrl} size={44} /> : <View style={styles.thumbFallback}><Text style={{ fontSize: 18 }}>🏪</Text></View>}
    <View style={dash.grow}>
      <Text style={styles.tableName} numberOfLines={1}>{place.name}</Text>
      <Text style={ui.caption} numberOfLines={1}>{place.address}</Text>
    </View>
    <Text style={ui.rating}>★ {place.rating.toFixed(1)}</Text>
    <Text style={styles.tablePrice} numberOfLines={1}>{price ?? '—'}</Text>
    <StatusChip status={place.status} />
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${place.name}`} onPress={onOpen} style={styles.rowAction}><Text style={styles.rowActionText}>👁</Text></Pressable>
  </View>;
}

/**
 * The dashboard.
 *
 * Everything here is derived from `GET /api/admin/*` via `AdminContext`. The
 * four stat cards, the category donut, the recent-listings table, the top-rated
 * leaderboard, the mini-map and the business-owner queue are live. The monthly
 * growth series, the per-cent deltas, the named booking rows and the
 * notification stream have no API source, so they come from the fenced
 * `sample.ts` and only render while the header's **Sample data** toggle is on.
 */
export default function Overview({ go }: { go: (tab: AdminTab) => void }) {
  const { token, overview, places, owners, colleges, sampleOn, refresh } = useAdmin();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  if (!overview) {
    return <Empty icon="⚠" title="Overview unavailable" body="The API did not return the platform overview. Check that the backend is running, then refresh." />;
  }

  const trends = statTrends(overview, places);
  const usersTotal = overview.users.students + overview.users.owners + overview.users.admins;
  const listingsTotal = places.length || Object.values(overview.places).reduce((sum, count) => sum + (count ?? 0), 0);
  const bookingsTotal = Object.values(overview.visitRequests).reduce((sum, count) => sum + (count ?? 0), 0);
  const reviewsTotal = totalReviews(places);

  const categories = categoryRows(places);
  const topCategories = categories.slice(0, 5);
  const rated = topRatedPlaces(places, 3);
  const pins = mapPins(colleges);
  const waiting = unverifiedOwners(owners).slice(0, 3);
  const recentListings = [...places].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 4);

  const growthLabels = sampleOn ? [...SAMPLE_GROWTH.labels] : categories.map((row) => row.label);
  const growthSeries: Series[] = sampleOn
    ? [
      { id: 'users', label: 'Users', color: colors.blue, values: [...SAMPLE_GROWTH.users] },
      { id: 'listings', label: 'Listings', color: colors.violet, values: [...SAMPLE_GROWTH.listings] },
      { id: 'bookings', label: 'Bookings', color: colors.green, values: [...SAMPLE_GROWTH.bookings] },
    ]
    : [{ id: 'listings', label: 'Listings', color: colors.violet, values: categories.map((row) => row.count) }];

  const activity = sampleOn ? SAMPLE_ACTIVITY : activityFromReal(places, owners, overview);

  const verify = (owner: AdminOwnerSummary) => {
    if (!token || busyId) return;
    setError('');
    setBusyId(owner.id);
    setAdminOwnerVerified(token, owner.id, true)
      .then(refresh)
      .catch((failure: unknown) => setError(failure instanceof Error ? failure.message : 'Action failed.'))
      .finally(() => setBusyId(null));
  };

  return <View style={{ gap: 18 }}>
    <View style={dash.wrap}>
      <StatCard icon="👥" tone="green" label="Total Users" value={usersTotal.toLocaleString('en-IN')} delta={sampleOn ? SAMPLE_DELTAS.users : undefined} note="Registered accounts" trend={trends.users} onPress={() => go('users')} />
      <StatCard icon="🗂️" tone="blue" label="Total Listings" value={listingsTotal.toLocaleString('en-IN')} delta={sampleOn ? SAMPLE_DELTAS.listings : undefined} note={`${overview.places.ACTIVE ?? 0} live places`} trend={trends.listings} onPress={() => go('listings')} />
      <StatCard icon="📅" tone="orange" label="Total Bookings" value={bookingsTotal.toLocaleString('en-IN')} delta={sampleOn ? SAMPLE_DELTAS.bookings : undefined} note={`${overview.visitRequests.PENDING ?? 0} awaiting confirmation`} trend={trends.bookings} onPress={() => go('bookings')} />
      <StatCard icon="⭐" tone="purple" label="Total Reviews" value={reviewsTotal.toLocaleString('en-IN')} delta={sampleOn ? SAMPLE_DELTAS.reviews : undefined} note="Across every listing" trend={trends.reviews} onPress={() => go('reviews')} />
      <GradientSurface radius={20} style={styles.premiumCard}>
        <View style={dash.between}>
          <Text style={styles.premiumTitle}>StudentHub AI Premium</Text>
          <Text style={styles.premiumBadge}>ACTIVE</Text>
        </View>
        <Text style={styles.premiumBody}>Advanced analytics · Featured listings · Business insights</Text>
        <Pressable accessibilityRole="button" onPress={() => go('settings')} style={styles.premiumCta}><Text style={styles.premiumCtaText}>Manage Plan →</Text></Pressable>
      </GradientSurface>
    </View>

    <View style={dash.wrap}>
      <Card style={styles.wide}>
        <CardHeader title={sampleOn ? 'Platform Growth' : 'Listings by category'} action="View Details" onAction={() => go('analytics')} right={sampleOn ? <SoftBadge label="SAMPLE" tone="amber" /> : undefined} />
        {sampleOn
          ? <View style={styles.legend}>{growthSeries.map((entry) => <View key={entry.id} style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: entry.color }]} /><Text style={ui.caption}>{entry.label}</Text></View>)}</View>
          : null}
        {growthLabels.length ? <LineChart labels={growthLabels} series={growthSeries} /> : <Text style={ui.caption}>No listings to chart yet.</Text>}
      </Card>

      <Card style={styles.wide}>
        <CardHeader title="Categories Distribution" action="View All" onAction={() => go('categories')} />
        {categories.length === 0 ? <Text style={ui.caption}>No listings yet.</Text> : <View style={styles.donutRow}>
          <Donut data={categories.map((row) => ({ label: row.label, value: row.count, color: row.color }))} total={places.length} />
          <View style={styles.legendCol}>
            {categories.slice(0, 6).map((row) => <View key={row.category} style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: row.color }]} />
              <Text style={styles.legendLabel} numberOfLines={1}>{row.label}</Text>
              <Text style={styles.legendValue}>{row.share}%</Text>
            </View>)}
          </View>
        </View>}
      </Card>

      <Card style={styles.wide}>
        <CardHeader title="Recent Activity" action="View All" onAction={() => go('analytics')} right={sampleOn ? <SoftBadge label="SAMPLE" tone="amber" /> : undefined} />
        <ActivityFeed items={activity} />
      </Card>
    </View>

    <View style={dash.wrap}>
      {QUICK_ACTIONS.map((action) => <QuickAction key={action.title} icon={action.icon} tone={action.tone} title={action.title} body={action.body} onPress={() => go(action.go)} />)}
    </View>

    <View style={dash.wrap}>
      <Card style={styles.wide}>
        <CardHeader title="Recent Listings" action="View All" onAction={() => go('listings')} />
        <View style={styles.filterRow}>
          <SoftBadge label={`All (${places.length})`} tone="purple" />
          {categories.slice(0, 4).map((row) => <SoftBadge key={row.category} label={`${row.label} (${row.count})`} />)}
        </View>
        {recentListings.length === 0
          ? <Text style={ui.caption}>No listings yet — owner submissions appear here.</Text>
          : recentListings.map((place) => <ListingRow key={place.id} place={place} onOpen={() => go('listings')} />)}
      </Card>

      <Card style={styles.wide}>
        <CardHeader title="Recent Bookings" action="View All" onAction={() => go('bookings')} right={sampleOn ? <SoftBadge label="SAMPLE" tone="amber" /> : undefined} />
        {sampleOn
          ? <View>
            <View style={styles.headRow}>
              <Text style={[styles.headCell, styles.seq]}>#</Text>
              <Text style={[styles.headCell, dash.grow]}>Student</Text>
              <Text style={[styles.headCell, { flex: 1.4 }]}>Place</Text>
              <Text style={[styles.headCell, { flex: 1 }]}>Date</Text>
              <Text style={[styles.headCell, { flex: 0.9 }]}>Status</Text>
            </View>
            {SAMPLE_BOOKINGS.map((booking, index) => {
              const tone = SAMPLE_BOOKING_STATUS_COLORS[booking.status] ?? { fg: colors.slate, bg: colors.lineSoft };
              return <View key={booking.id} style={styles.tableRow}>
                <Text style={[styles.seq, styles.cell]}>{index + 1}</Text>
                <View style={dash.grow}>
                  <Text style={styles.tableName} numberOfLines={1}>{booking.student}</Text>
                  <Text style={ui.caption} numberOfLines={1}>{booking.course}</Text>
                </View>
                <Text style={[styles.cell, { flex: 1.4 }]} numberOfLines={1}>{booking.place}</Text>
                <Text style={[styles.cell, { flex: 1 }]} numberOfLines={1}>{booking.date}</Text>
                <View style={{ flex: 0.9 }}><Text style={[styles.statusPill, { color: tone.fg, backgroundColor: tone.bg }]}>{booking.status}</Text></View>
              </View>;
            })}
          </View>
          : (visitSummaryRows(overview).length === 0
            ? <Text style={ui.caption}>No visit requests yet.</Text>
            : visitSummaryRows(overview).map((row) => {
              const tone = VISIT_TONE[row.status] ?? { fg: colors.slate, bg: colors.lineSoft };
              return <View key={row.status} style={styles.shareRow}>
                <View style={styles.shareHead}><Text style={styles.shareLabel}>{row.status}</Text><Text style={styles.shareValue}>{row.count}</Text></View>
                <ProgressBar fraction={row.share / 100} color={tone.fg} />
              </View>;
            }))}
      </Card>

      <Card style={styles.wide}>
        <CardHeader title="Notifications" action="View All" onAction={() => go('analytics')} right={sampleOn ? <SoftBadge label="SAMPLE" tone="amber" /> : undefined} />
        {sampleOn
          ? SAMPLE_NOTIFICATIONS.map((note) => {
            const palette = TONE[note.tone];
            return <View key={note.id} style={dash.row}>
              <View style={[styles.noteIcon, { backgroundColor: palette.bg }]}><Text style={{ color: palette.fg, fontWeight: '800' }}>{note.icon}</Text></View>
              <View style={dash.grow}>
                <Text style={styles.tableName} numberOfLines={1}>{note.title}</Text>
                <Text style={ui.caption} numberOfLines={1}>{note.body}</Text>
              </View>
              <Text style={styles.noteTime}>{note.time}</Text>
            </View>;
          })
          : <ActivityFeed items={activity} />}
      </Card>
    </View>

    <View style={dash.wrap}>
      <Card style={styles.wide}>
        <CardHeader title="Top Categories" action="View All" onAction={() => go('categories')} />
        {topCategories.length === 0 ? <Text style={ui.caption}>No listings yet.</Text> : <View style={styles.legendCol}>
          {topCategories.map((row) => <View key={row.category} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: row.color }]} />
            <Text style={styles.legendLabel} numberOfLines={1}>{row.label}</Text>
            <Text style={styles.legendValue}>{row.count}</Text>
          </View>)}
          {categories.length > topCategories.length ? <Text style={ui.caption}>+{categories.length - topCategories.length} more</Text> : null}
        </View>}
      </Card>

      <Card style={styles.wide}>
        <CardHeader title="Top Rated Places" action="View All" onAction={() => go('reviews')} />
        {rated.length === 0 ? <Text style={ui.caption}>No reviews yet — ratings appear once students visit.</Text> : <View style={styles.ratedRow}>
          {rated.map((row) => <View key={row.id} style={styles.ratedCard}>
            {row.image ? <Thumb uri={row.image} size={44} /> : <View style={styles.thumbFallback}><Text style={{ fontSize: 18 }}>🏪</Text></View>}
            <Text style={styles.tableName} numberOfLines={1}>{row.name}</Text>
            <Text style={ui.rating}>★ {row.rating.toFixed(1)}</Text>
            <Text style={styles.tablePrice} numberOfLines={1}>{row.price ?? row.category}</Text>
          </View>)}
        </View>}
      </Card>

      <Card style={styles.wide}>
        <CardHeader title="Live Map" action="View All" onAction={() => go('categories')} />
        <MiniMap pins={pins} />
        <Text style={ui.caption}>{colleges.length} campus{colleges.length === 1 ? '' : 'es'} across the launch geography.</Text>
      </Card>

      <Card style={styles.wide}>
        <CardHeader title="Business Owner Requests" action="View All" onAction={() => go('businesses')} />
        {waiting.length === 0 ? <Text style={ui.caption}>Every registered business is verified.</Text> : waiting.map((owner) => <View key={owner.id} style={styles.requestRow}>
          <View style={dash.grow}>
            <Text style={styles.tableName} numberOfLines={1}>{owner.displayName}</Text>
            <Text style={ui.caption} numberOfLines={1}>{owner.businessName} · {owner.listingCount} listing{owner.listingCount === 1 ? '' : 's'}</Text>
          </View>
          <SoftBadge label={owner.verified ? 'Approved' : 'Pending'} tone={owner.verified ? 'green' : 'orange'} />
          <Button title={busyId === owner.id ? '…' : 'Verify'} disabled={busyId !== null} onPress={() => verify(owner)} />
        </View>)}
        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      </Card>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  premiumCard: { flexGrow: 1, flexBasis: 210, minWidth: 190, padding: 16, gap: 8, justifyContent: 'center' },
  premiumTitle: { fontSize: 14, fontWeight: '900', color: '#fff', flexShrink: 1 },
  premiumBadge: { fontSize: 8, fontWeight: '900', color: '#7C3AED', backgroundColor: '#FDE68A', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3, overflow: 'hidden' },
  premiumBody: { fontSize: 11, color: 'rgba(255,255,255,0.92)' },
  premiumCta: { backgroundColor: '#fff', borderRadius: 10, minHeight: 34, alignItems: 'center', justifyContent: 'center' },
  premiumCtaText: { color: colors.violet, fontWeight: '800', fontSize: 12 },
  wide: { flexGrow: 1, flexBasis: 320, minWidth: 280, gap: 12 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  donutRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 18 },
  legendCol: { flexGrow: 1, flexBasis: 160, gap: 10 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  legendLabel: { flex: 1, fontSize: 12.5, color: colors.ink, fontWeight: '700' },
  legendValue: { fontSize: 12.5, color: colors.muted, fontWeight: '800' },
  tableRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line },
  thumbFallback: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center' },
  tableName: { fontSize: 13, fontWeight: '800', color: colors.ink },
  tablePrice: { fontSize: 12, fontWeight: '800', color: colors.purple, width: 96, textAlign: 'right' },
  rowAction: { width: 30, height: 30, borderRadius: 10, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  rowActionText: { fontSize: 13 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 6 },
  headCell: { fontSize: 10, fontWeight: '900', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  seq: { width: 22, textAlign: 'center' },
  cell: { fontSize: 12, color: colors.ink, fontWeight: '600' },
  statusPill: { fontSize: 10, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, overflow: 'hidden', alignSelf: 'flex-start' },
  shareRow: { gap: 6, paddingVertical: 4 },
  shareHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shareLabel: { fontSize: 12, fontWeight: '700', color: colors.ink },
  shareValue: { fontSize: 12, fontWeight: '800', color: colors.purple },
  noteIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  noteTime: { fontSize: 10, color: colors.muted, fontWeight: '700' },
  ratedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  ratedCard: { flexGrow: 1, flexBasis: 130, gap: 6, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 10 },
  requestRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line, flexWrap: 'wrap' },
  error: { color: colors.error, fontSize: 12, fontWeight: '600' },
});




