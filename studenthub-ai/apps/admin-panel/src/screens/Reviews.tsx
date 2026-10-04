import { StyleSheet, Text, View } from 'react-native';
import { useAdmin } from '../AdminContext';
import { mostReviewedPlaces, totalReviews } from '../dashboardData';
import { Card, CardHeader, StatCard, dash } from '../kit';
import { Empty, Thumb, colors, ui } from '../ui';

/**
 * Reviews screen.
 *
 * The API returns each listing's `rating` and `reviewCount`, so this screen
 * ranks listings by review volume and computes the review-weighted average.
 * Individual review text lives on the student/owner surfaces, not the admin
 * aggregate endpoints.
 */
export default function Reviews() {
  const { places } = useAdmin();
  if (!places.length) return <Empty icon="⭐" title="No reviews yet" body="Ratings appear here once students review a listing." />;

  const rows = mostReviewedPlaces(places, 10);
  const total = totalReviews(places);
  const weighted = rows.reduce((sum, row) => sum + row.rating * row.reviewCount, 0) / Math.max(1, total);
  const rated = places.filter((place) => place.reviewCount > 0).length;

  return <View style={{ gap: 18 }}>
    <View style={dash.wrap}>
      <StatCard icon="⭐" tone="purple" label="Total Reviews" value={total.toLocaleString('en-IN')} note="Across every listing" />
      <StatCard icon="◎" tone="amber" label="Average Rating" value={total ? weighted.toFixed(2) : '—'} note="Weighted by review count" />
      <StatCard icon="🗂️" tone="blue" label="Rated Listings" value={String(rated)} note={`of ${places.length} listings`} />
    </View>

    <Card>
      <CardHeader title="Most-reviewed listings" />
      {rows.length === 0
        ? <Text style={ui.caption}>No listing has reviews yet.</Text>
        : rows.map((row, index) => <View key={row.id} style={styles.row}>
          <Text style={styles.rank}>{index + 1}</Text>
          {row.image ? <Thumb uri={row.image} size={40} /> : <View style={styles.thumbFallback}><Text style={{ fontSize: 16 }}>🏪</Text></View>}
          <View style={dash.grow}>
            <Text style={styles.name} numberOfLines={1}>{row.name}</Text>
            <Text style={ui.caption} numberOfLines={1}>{row.category}{row.price ? ` · ${row.price}` : ''}</Text>
          </View>
          <Text style={ui.rating}>★ {row.rating.toFixed(1)}</Text>
          <Text style={styles.count}>{row.reviewCount} review{row.reviewCount === 1 ? '' : 's'}</Text>
        </View>)}
      <Text style={ui.caption}>Source: GET /api/admin/places (rating and reviewCount per listing).</Text>
    </Card>
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line },
  rank: { width: 18, textAlign: 'center', fontSize: 12, fontWeight: '800', color: colors.muted },
  thumbFallback: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 13, fontWeight: '800', color: colors.ink },
  count: { fontSize: 11, color: colors.muted, fontWeight: '700' },
});
