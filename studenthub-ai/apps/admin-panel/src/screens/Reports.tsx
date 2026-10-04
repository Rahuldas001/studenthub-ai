import { StyleSheet, Text, View } from 'react-native';
import { useAdmin } from '../AdminContext';
import { categoryRows, placeSummaryRows, totalReviews, visitSummaryRows } from '../dashboardData';
import { Card, CardHeader, ProgressBar, StatCard, dash } from '../kit';
import { Button, Empty, colors, ui } from '../ui';

/** Triggers a client-side CSV download (web only; a no-op elsewhere). */
function downloadCsv(name: string, rows: string[][]): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Reports screen.
 *
 * Every figure is live, and each panel can be exported as CSV built from the
 * same payload the screen renders — a real, deterministic export of API data
 * rather than a generated document.
 */
export default function Reports() {
  const { overview, places } = useAdmin();
  if (!overview) return <Empty icon="📄" title="Reports unavailable" body="Waiting on GET /api/admin/overview. Check the backend, then refresh." />;

  const statuses = placeSummaryRows(overview);
  const categories = categoryRows(places);
  const visits = visitSummaryRows(overview);
  const usersTotal = overview.users.students + overview.users.owners + overview.users.admins;
  const generatedAt = new Date().toLocaleString();

  return <View style={{ gap: 18 }}>
    <View style={dash.wrap}>
      <StatCard icon="👥" tone="blue" label="Users" value={usersTotal.toLocaleString('en-IN')} note="All accounts" />
      <StatCard icon="🗂️" tone="violet" label="Listings" value={String(places.length)} note="In the queue payload" />
      <StatCard icon="📅" tone="orange" label="Bookings" value={String(visits.reduce((sum, row) => sum + row.count, 0))} note="Visit requests" />
      <StatCard icon="⭐" tone="purple" label="Reviews" value={totalReviews(places).toLocaleString('en-IN')} note="Across listings" />
    </View>

    <Card>
      <CardHeader title="Listings by status" action="Download CSV" onAction={() => downloadCsv('studenthub-listings-by-status.csv', [['status', 'count', 'share_percent'], ...statuses.map((row) => [row.status, String(row.count), String(row.share)])])} />
      {statuses.length === 0 ? <Text style={ui.caption}>No listings yet.</Text> : statuses.map((row) => <View key={row.status} style={styles.block}>
        <View style={styles.head}><Text style={styles.label}>{row.status}</Text><Text style={styles.value}>{row.count} · {row.share}%</Text></View>
        <ProgressBar fraction={row.share / 100} color={colors.violet} />
      </View>)}
    </Card>

    <Card>
      <CardHeader title="Bookings by status" action="Download CSV" onAction={() => downloadCsv('studenthub-bookings-by-status.csv', [['status', 'count', 'share_percent'], ...visits.map((row) => [row.status, String(row.count), String(row.share)])])} />
      {visits.length === 0 ? <Text style={ui.caption}>No visit requests yet.</Text> : visits.map((row) => <View key={row.status} style={styles.block}>
        <View style={styles.head}><Text style={styles.label}>{row.status}</Text><Text style={styles.value}>{row.count} · {row.share}%</Text></View>
        <ProgressBar fraction={row.share / 100} color={colors.blue} />
      </View>)}
    </Card>

    <Card>
      <CardHeader title="Categories" action="Download CSV" onAction={() => downloadCsv('studenthub-categories.csv', [['category', 'count', 'share_percent'], ...categories.map((row) => [row.label, String(row.count), String(row.share)])])} />
      {categories.length === 0 ? <Text style={ui.caption}>No listings yet.</Text> : categories.map((row) => <View key={row.category} style={styles.lineRow}>
        <View style={[styles.dot, { backgroundColor: row.color }]} />
        <Text style={styles.label} numberOfLines={1}>{row.label}</Text>
        <Text style={styles.value}>{row.count} · {row.share}%</Text>
      </View>)}
    </Card>

    <Card style={styles.exportCard}>
      <View style={dash.grow}>
        <Text style={dash.cardTitle}>Snapshot</Text>
        <Text style={ui.caption}>Generated {generatedAt} · {places.length} listings · {usersTotal} users</Text>
      </View>
      <Button title="Download full snapshot" onPress={() => downloadCsv('studenthub-snapshot.csv', [
        ['metric', 'value'],
        ['generated_at', generatedAt],
        ['users_total', String(usersTotal)],
        ['users_students', String(overview.users.students)],
        ['users_owners', String(overview.users.owners)],
        ['users_admins', String(overview.users.admins)],
        ['listings_total', String(places.length)],
        ['owners_total', String(overview.ownersTotal)],
        ['owners_verified', String(overview.ownersVerified)],
        ['reviews_total', String(totalReviews(places))],
      ])} />
    </Card>
  </View>;
}

const styles = StyleSheet.create({
  block: { gap: 6, paddingVertical: 4 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { flex: 1, fontSize: 12.5, fontWeight: '700', color: colors.ink },
  value: { fontSize: 12, fontWeight: '800', color: colors.muted },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.line },
  dot: { width: 10, height: 10, borderRadius: 5 },
  exportCard: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
});
