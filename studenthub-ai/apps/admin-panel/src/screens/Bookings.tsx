import { StyleSheet, Text, View } from 'react-native';
import { useAdmin } from '../AdminContext';
import { visitSummaryRows } from '../dashboardData';
import { Card, CardHeader, ProgressBar, SoftBadge, StatCard, dash } from '../kit';
import { SAMPLE_BOOKINGS, SAMPLE_BOOKING_STATUS_COLORS } from '../sample';
import { Empty, colors, ui } from '../ui';

/** Status → colour for the real breakdown bars. */
const VISIT_TONE: Record<string, { fg: string; bg: string }> = {
  PENDING: { fg: colors.amber, bg: colors.amberBg },
  CONFIRMED: { fg: colors.greenDark, bg: colors.okBg },
  COMPLETED: { fg: colors.slate, bg: colors.lineSoft },
  CANCELLED: { fg: colors.error, bg: colors.errorBg },
};

/**
 * Bookings screen.
 *
 * Bookings are student visit requests; `GET /api/admin/overview` returns their
 * counts by status, which is what the bars and stat cards show. The API stores
 * counts, not per-student rows, so the named table only appears with **Sample
 * data** on.
 */
export default function Bookings() {
  const { overview, sampleOn } = useAdmin();
  if (!overview) return <Empty icon="⚠" title="Bookings unavailable" body="Waiting on GET /api/admin/overview. Check the backend, then refresh." />;

  const rows = visitSummaryRows(overview);
  const total = rows.reduce((sum, row) => sum + row.count, 0);

  return <View style={{ gap: 18 }}>
    <View style={dash.wrap}>
      <StatCard icon="📅" tone="orange" label="Total Bookings" value={String(total)} note="Student visit requests" />
      <StatCard icon="⏳" tone="amber" label="Pending" value={String(overview.visitRequests.PENDING ?? 0)} note="Awaiting a decision" />
      <StatCard icon="✓" tone="green" label="Confirmed" value={String(overview.visitRequests.CONFIRMED ?? 0)} note="Scheduled visits" />
      <StatCard icon="🏁" tone="slate" label="Completed" value={String(overview.visitRequests.COMPLETED ?? 0)} note="Finished visits" />
    </View>

    <Card>
      <CardHeader title="Visit requests by status" />
      {rows.length === 0
        ? <Text style={ui.caption}>No visit requests yet.</Text>
        : rows.map((row) => {
          const tone = VISIT_TONE[row.status] ?? { fg: colors.slate, bg: colors.lineSoft };
          return <View key={row.status} style={styles.block}>
            <View style={styles.head}><Text style={styles.label}>{row.status}</Text><Text style={styles.value}>{row.count} · {row.share}%</Text></View>
            <ProgressBar fraction={row.share / 100} color={tone.fg} />
          </View>;
        })}
      <Text style={ui.caption}>Source: GET /api/admin/overview (visitRequests grouped by status).</Text>
    </Card>

    <Card>
      <CardHeader title="Recent bookings" right={sampleOn ? <SoftBadge label="SAMPLE" tone="amber" /> : undefined} />
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
            return <View key={booking.id} style={styles.row}>
              <Text style={[styles.seq, styles.cell]}>{index + 1}</Text>
              <View style={dash.grow}>
                <Text style={styles.name} numberOfLines={1}>{booking.student}</Text>
                <Text style={ui.caption} numberOfLines={1}>{booking.course}</Text>
              </View>
              <Text style={[styles.cell, { flex: 1.4 }]} numberOfLines={1}>{booking.place}</Text>
              <Text style={[styles.cell, { flex: 1 }]} numberOfLines={1}>{booking.date}</Text>
              <View style={{ flex: 0.9 }}><Text style={[styles.pill, { color: tone.fg, backgroundColor: tone.bg }]}>{booking.status}</Text></View>
            </View>;
          })}
        </View>
        : <Text style={ui.caption}>The API stores visit-request counts, not named bookings. Turn on Sample data (header) to preview the per-student table.</Text>}
    </Card>
  </View>;
}

const styles = StyleSheet.create({
  block: { gap: 6, paddingVertical: 4 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 12.5, fontWeight: '700', color: colors.ink },
  value: { fontSize: 12.5, fontWeight: '800', color: colors.purple },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 6 },
  headCell: { fontSize: 10, fontWeight: '900', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  seq: { width: 22, textAlign: 'center' },
  cell: { fontSize: 12, color: colors.ink, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line },
  name: { fontSize: 13, fontWeight: '800', color: colors.ink },
  pill: { fontSize: 10, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, overflow: 'hidden', alignSelf: 'flex-start' },
});
