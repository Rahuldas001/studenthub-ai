import { StyleSheet, Text, View } from 'react-native';
import { useAdmin } from '../AdminContext';
import { categoryRows } from '../dashboardData';
import { Card, CardHeader, Donut, ProgressBar, StatCard, dash } from '../kit';
import { Empty, colors, ui } from '../ui';

/**
 * Categories screen.
 *
 * Groups the moderation queue (every listing) by `category`, so the donut,
 * legend and bars are the platform's true category mix.
 */
export default function Categories() {
  const { places } = useAdmin();
  if (!places.length) return <Empty icon="🧩" title="No categories yet" body="Category distribution appears once owners publish listings." />;

  const rows = categoryRows(places);
  const top = rows[0];

  return <View style={{ gap: 18 }}>
    <View style={dash.wrap}>
      <StatCard icon="🧩" tone="violet" label="Categories in use" value={String(rows.length)} note="Distinct listing categories" />
      <StatCard icon="🏆" tone="blue" label="Largest category" value={top?.label ?? '—'} note={top ? `${top.count} listings · ${top.share}%` : 'No listings'} />
      <StatCard icon="🗂️" tone="green" label="Total Listings" value={String(places.length)} note="Across every category" />
    </View>

    <Card>
      <CardHeader title="Categories Distribution" />
      <View style={styles.donutRow}>
        <Donut data={rows.map((row) => ({ label: row.label, value: row.count, color: row.color }))} total={places.length} />
        <View style={styles.legendCol}>
          {rows.map((row) => <View key={row.category} style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: row.color }]} />
            <Text style={styles.label} numberOfLines={1}>{row.label}</Text>
            <Text style={styles.share}>{row.share}%</Text>
            <Text style={styles.count}>{row.count}</Text>
          </View>)}
        </View>
      </View>
    </Card>

    <Card>
      <CardHeader title="Share of listings" />
      {rows.map((row) => <View key={row.category} style={styles.block}>
        <View style={styles.head}><Text style={styles.label}>{row.label}</Text><Text style={styles.share}>{row.count} · {row.share}%</Text></View>
        <ProgressBar fraction={row.share / 100} color={row.color} />
      </View>)}
      <Text style={ui.caption}>Source: GET /api/admin/places grouped by category.</Text>
    </Card>
  </View>;
}

const styles = StyleSheet.create({
  donutRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 20 },
  legendCol: { flexGrow: 1, flexBasis: 200, gap: 9 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  label: { flex: 1, fontSize: 12.5, fontWeight: '700', color: colors.ink },
  share: { fontSize: 12, fontWeight: '800', color: colors.muted },
  count: { fontSize: 12, fontWeight: '700', color: colors.muted, width: 40, textAlign: 'right' },
  block: { gap: 6, paddingVertical: 4 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
