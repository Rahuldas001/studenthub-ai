import { StyleSheet, Text, View } from 'react-native';
import { useAdmin } from '../AdminContext';
import { categoryRows, placeSummaryRows, statTrends, visitSummaryRows } from '../dashboardData';
import { Card, CardHeader, Donut, LineChart, ProgressBar, SoftBadge, StatCard, dash, type Series } from '../kit';
import { SAMPLE_GROWTH } from '../sample';
import { Empty, colors, ui } from '../ui';

/**
 * Analytics screen.
 *
 * A live view of platform distribution: listings by status and by category,
 * visit requests by status and the moderation pipeline. The multi-series
 * month-over-month growth line has no API source, so it renders only while
 * **Sample data** is on — otherwise the chart falls back to the real per-status
 * listing counts.
 */
export default function Analytics() {
  const { overview, places, sampleOn } = useAdmin();
  if (!overview) return <Empty icon="📈" title="Analytics unavailable" body="Waiting on GET /api/admin/overview. Check the backend, then refresh." />;

  const trends = statTrends(overview, places);
  const statuses = placeSummaryRows(overview);
  const categories = categoryRows(places);
  const visits = visitSummaryRows(overview);

  const growthLabels = sampleOn ? [...SAMPLE_GROWTH.labels] : statuses.map((row) => row.status);
  const growthSeries: Series[] = sampleOn
    ? [
      { id: 'users', label: 'Users', color: colors.blue, values: [...SAMPLE_GROWTH.users] },
      { id: 'listings', label: 'Listings', color: colors.violet, values: [...SAMPLE_GROWTH.listings] },
      { id: 'bookings', label: 'Bookings', color: colors.green, values: [...SAMPLE_GROWTH.bookings] },
    ]
    : [{ id: 'listings', label: 'Listings', color: colors.violet, values: statuses.map((row) => row.count) }];

  return <View style={{ gap: 18 }}>
    <View style={dash.wrap}>
      <StatCard icon="⏳" tone="amber" label="Pending review" value={String(overview.places.PENDING ?? 0)} note="In the moderation queue" trend={trends.listings} />
      <StatCard icon="✅" tone="green" label="Live listings" value={String(overview.places.ACTIVE ?? 0)} note="Visible to students" />
      <StatCard icon="🏢" tone="purple" label="Verified businesses" value={`${overview.ownersVerified}/${overview.ownersTotal}`} note="Approved owners" />
      <StatCard icon="📅" tone="orange" label="Visit requests" value={String(visits.reduce((sum, row) => sum + row.count, 0))} note="All time" trend={trends.bookings} />
    </View>

    <Card>
      <CardHeader title={sampleOn ? 'Platform Growth' : 'Listings by status'} right={sampleOn ? <SoftBadge label="SAMPLE" tone="amber" /> : undefined} />
      {sampleOn
        ? <View style={styles.legend}>{growthSeries.map((entry) => <View key={entry.id} style={styles.legendItem}><View style={[styles.dot, { backgroundColor: entry.color }]} /><Text style={ui.caption}>{entry.label}</Text></View>)}</View>
        : null}
      {growthLabels.length ? <LineChart labels={growthLabels} series={growthSeries} /> : <Text style={ui.caption}>No listings to chart yet.</Text>}
      {!sampleOn ? <Text style={ui.caption}>Month-over-month history is not stored by the API; the toggle shares sample data for the growth view.</Text> : null}
    </Card>

    <View style={dash.wrap}>
      <Card style={styles.wide}>
        <CardHeader title="Listings by status" />
        {statuses.length === 0 ? <Text style={ui.caption}>No listings yet.</Text> : statuses.map((row) => <View key={row.status} style={styles.block}>
          <View style={styles.head}><Text style={styles.label}>{row.status}</Text><Text style={styles.value}>{row.count} · {row.share}%</Text></View>
          <ProgressBar fraction={row.share / 100} color={colors.violet} />
        </View>)}
      </Card>

      <Card style={styles.wide}>
        <CardHeader title="Visit requests" />
        {visits.length === 0 ? <Text style={ui.caption}>No visit requests yet.</Text> : visits.map((row) => <View key={row.status} style={styles.block}>
          <View style={styles.head}><Text style={styles.label}>{row.status}</Text><Text style={styles.value}>{row.count} · {row.share}%</Text></View>
          <ProgressBar fraction={row.share / 100} color={colors.blue} />
        </View>)}
      </Card>
    </View>

    <Card>
      <CardHeader title="Category mix" />
      {categories.length === 0 ? <Text style={ui.caption}>No listings yet.</Text> : <View style={styles.donutRow}>
        <Donut data={categories.map((row) => ({ label: row.label, value: row.count, color: row.color }))} total={places.length} />
        <View style={styles.legendCol}>
          {categories.map((row) => <View key={row.category} style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: row.color }]} />
            <Text style={styles.label} numberOfLines={1}>{row.label}</Text>
            <Text style={styles.value}>{row.count} · {row.share}%</Text>
          </View>)}
        </View>
      </View>}
    </Card>
  </View>;
}

const styles = StyleSheet.create({
  wide: { flexGrow: 1, flexBasis: 320, minWidth: 280, gap: 12 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  block: { gap: 6, paddingVertical: 4 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { flex: 1, fontSize: 12.5, fontWeight: '700', color: colors.ink },
  value: { fontSize: 12, fontWeight: '800', color: colors.muted },
  donutRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 20 },
  legendCol: { flexGrow: 1, flexBasis: 200, gap: 9 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
