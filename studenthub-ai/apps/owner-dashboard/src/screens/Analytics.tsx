import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Button, Empty, colors, ui } from '../ui';
import { useOwner } from '../OwnerContext';
import { useOwnerExtras } from '../OwnerExtrasContext';
import { MetricRow, Notice, OptionRow, OwnerTopBar, StatTile, StatusPill, kit, shortDate, type OwnerNav } from '../OwnerKit';

/**
 * Screen 7 - analytics, straight from `GET /api/owner/analytics?range=`.
 *
 * Mirrors `apps/mobile-app/src/screens/owner/OwnerAnalytics.tsx`. Views are
 * listing-page opens, saves are student bookmarks, enquiries are visit requests,
 * and confirmed/completed are the visit requests the owner acted on. Deltas
 * compare against the equally long window right before it.
 */

type Span = 7 | 30;

export default function Analytics({ nav }: { nav: OwnerNav }) {
  const { places } = useOwner();
  const { analytics, analyticsRange, analyticsLoading, analyticsError, loadAnalytics, answeredCount } = useOwnerExtras();
  const [span, setSpan] = useState<Span>(7);

  // The context warms up on 7 days; honour the window this screen was opened with.
  useEffect(() => {
    if (span !== analyticsRange) void loadAnalytics(span);
  }, [span, analyticsRange, loadAnalytics]);

  const pickSpan = (next: Span) => {
    setSpan(next);
    void loadAnalytics(next);
  };

  const totals = analytics?.totals ?? null;
  const series = analytics?.series ?? [];
  const rows = analytics?.listings ?? [];
  const peak = series.reduce((best, point) => (point.views > best.views ? point : best),
    series[0] ?? { date: '', label: '', views: 0, saves: 0, enquiries: 0 });
  const top = Math.max(1, ...series.map((point) => point.views));
  /** How many of every 100 views turned into this action. */
  const per100 = (value: number) => (totals && totals.views ? Math.round((value / totals.views) * 100) : 0);

  return <View style={kit.body}>
    <OwnerTopBar
      title="Analytics"
      subtitle={totals
        ? `${totals.views} views · ${places.length} listing${places.length === 1 ? '' : 's'} · last ${span} days`
        : `${places.length} listing${places.length === 1 ? '' : 's'} · last ${span} days`}
      right={<Button title="Overview" secondary onPress={() => nav.tab('overview')} />}
    />

    <OptionRow<Span>
      options={[{ id: 7, label: 'Last 7 days' }, { id: 30, label: 'Last 30 days' }]}
      value={span}
      onChange={pickSpan}
    />

    {analyticsError ? <Text style={kit.error}>{analyticsError}</Text> : null}

    {analyticsLoading || !totals ? <View style={[ui.panel, { alignItems: 'center', paddingVertical: 20, gap: 10 }]}>
      <ActivityIndicator color={colors.purple} />
      <Text style={ui.caption}>Counting your last {span} days…</Text>
    </View> : null}

    {totals && !analyticsLoading ? <>
      <View style={kit.grid}>
        <StatTile icon="👁" label={`Views · ${span}d`} value={String(totals.views)} delta={totals.viewsDelta ?? undefined} />
        <StatTile icon="♡" label="Saves" value={String(totals.saves)} delta={totals.savesDelta ?? undefined} />
        <StatTile icon="✆" label="Enquiries" value={String(totals.enquiries)} delta={totals.enquiriesDelta ?? undefined} />
        <StatTile icon="★" label="Reviews" value={String(totals.reviews)} />
      </View>

      <View style={[ui.panel, { gap: 12 }]}>
        <View style={ui.between}>
          <Text style={ui.cardTitle}>Views per day</Text>
          {peak.views ? <Text style={ui.caption}>Best: {span === 7 ? peak.label : shortDate(peak.date)} · {peak.views}</Text> : null}
        </View>
        {totals.views === 0
          ? <Text style={ui.body}>No views yet in this window. Only approved listings earn traffic — publish a listing and share it with students on campus.</Text>
          : <View style={styles.chart}>
            {series.map((point, index) => <View key={point.date} style={styles.chartCol}>
              <View style={[styles.chartBar, { height: Math.max(4, Math.round((point.views / top) * 96)) }]} />
              <Text style={styles.chartLabel}>{span === 7 ? point.label : index % 5 === 0 ? point.label : ' '}</Text>
            </View>)}
          </View>}
      </View>

      <View style={[ui.panel, { gap: 12 }]}>
        <Text style={ui.cardTitle}>Where students go from there</Text>
        {[
          { label: 'Saved for later', value: totals.saves },
          { label: 'Asked to visit', value: totals.enquiries },
          { label: 'Visits confirmed', value: totals.confirmed },
        ].map((step) => <View key={step.label} style={{ gap: 6 }}>
          <View style={ui.between}>
            <Text style={styles.sourceLabel}>{step.label}</Text>
            <Text style={styles.sourceShare}>{per100(step.value)} per 100 views</Text>
          </View>
          <View style={kit.bar}><View style={[kit.barFill, { width: `${Math.min(100, per100(step.value))}%` }]} /></View>
        </View>)}
        <View style={ui.between}>
          <Text style={ui.caption}>Average rating · replies you published</Text>
          <Text style={styles.sourceShare}>{totals.rating ? totals.rating.toFixed(1) : '—'} ★ · {answeredCount}</Text>
        </View>
      </View>
    </> : null}

    {!places.length ? <Empty icon="▦" title="Nothing to analyse yet"
      body="Analytics follow your listings. Create one, get it approved, and every student who opens it starts showing up here.">
      <Button title="Create a listing" onPress={() => nav.form()} />
    </Empty> : null}

    {!!places.length && totals && !analyticsLoading ? <View style={[ui.panel, { gap: 12 }]}>
      <Text style={ui.cardTitle}>Per listing · last {span} days</Text>
      {rows.map((row) => <View key={row.placeId} style={styles.listingRow}>
        <View style={ui.between}>
          <Text numberOfLines={1} style={[styles.listingName, { flexShrink: 1 }]}>{row.name}</Text>
          <StatusPill status={row.status} />
        </View>
        <MetricRow items={[
          { label: 'Views', value: String(row.views) },
          { label: 'Saves', value: String(row.saves) },
          { label: 'Enquiries', value: String(row.enquiries) },
          { label: 'Rating', value: row.rating ? row.rating.toFixed(1) : '—' },
        ]} />
        <View style={[ui.between, { paddingTop: 2 }]}>
          <Text style={ui.caption}>{row.share}% of your views in this window</Text>
          <Text style={ui.caption}>{row.reviews} review{row.reviews === 1 ? '' : 's'}</Text>
        </View>
        <Button title="Open in editor" secondary onPress={() => nav.form(row.placeId)} />
      </View>)}
    </View> : null}

    <Notice
      title="About these numbers"
      text="Views are listing-page opens, saves are student bookmarks, and enquiries are visit requests. Deltas compare against the equally long window right before this one."
      action={analyticsLoading ? undefined : { label: 'Reload', onPress: () => void loadAnalytics(span) }}
    />
  </View>;
}

const styles = StyleSheet.create({
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 120 },
  chartCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  chartBar: { width: '100%', borderRadius: 6, backgroundColor: colors.purple, opacity: 0.85 },
  chartLabel: { fontSize: 9, color: colors.muted, fontWeight: '700' },
  sourceLabel: { fontSize: 12, fontWeight: '700', color: colors.ink },
  sourceShare: { fontSize: 12, fontWeight: '800', color: colors.purple },
  listingRow: { gap: 10, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 },
  listingName: { fontSize: 14, fontWeight: '800', color: colors.ink },
});
