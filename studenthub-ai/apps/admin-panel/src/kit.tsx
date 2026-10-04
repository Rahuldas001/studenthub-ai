import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from './ui';

/**
 * Dashboard building blocks.
 *
 * The console's dashboard needs a richer vocabulary than the moderation kit in
 * `ui.tsx`: stat cards with sparklines, a multi-series line chart, a donut, an
 * activity feed and a projection-only mini-map. Everything is drawn with plain
 * `View`s (plus `expo-linear-gradient` for the two gradient surfaces) — no SVG
 * or chart library is pulled in, matching the sibling apps' dependency set.
 * Charts are proportional renderings of real counts, never illustrations.
 */

/** Accent tones shared by tiles, badges and chart series. */
export type KitTone = 'purple' | 'blue' | 'green' | 'orange' | 'pink' | 'cyan' | 'violet' | 'indigo' | 'amber' | 'slate';

export const TONE: Record<KitTone, { fg: string; bg: string }> = {
  purple: { fg: colors.purple, bg: colors.pale },
  blue: { fg: colors.blue, bg: colors.blueSoft },
  green: { fg: colors.greenDark, bg: colors.okBg },
  orange: { fg: colors.orange, bg: colors.orangeBg },
  pink: { fg: colors.pink, bg: '#FDEBF7' },
  cyan: { fg: colors.cyan, bg: colors.cyanSoft },
  violet: { fg: colors.violet, bg: '#F1EBFE' },
  indigo: { fg: colors.indigo, bg: '#E8EAFF' },
  amber: { fg: colors.amber, bg: colors.amberBg },
  slate: { fg: colors.slate, bg: colors.bg },
};

export const dash = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  card: {
    backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: colors.line, padding: 18, gap: 12,
    shadowColor: colors.purpleDeep, shadowOpacity: 0.05, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 2,
  },
  cardTight: { padding: 16, gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: colors.ink, flexShrink: 1 },
  cardSub: { fontSize: 12, color: colors.muted },
  grow: { flex: 1, minWidth: 0 },
  link: { color: colors.purple, fontWeight: '800', fontSize: 12 },
  linkAction: { minHeight: 32, justifyContent: 'center' },
  iconBox: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 28, fontWeight: '900', color: colors.ink, letterSpacing: -1 },
  statLabel: { fontSize: 12, color: colors.muted, fontWeight: '700' },
  pill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
  pillText: { fontSize: 10, fontWeight: '800' },
  delta: { fontSize: 12, fontWeight: '800', color: colors.greenDark },
  divider: { height: 1, backgroundColor: colors.line },
  avatar: { borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.pale },
  avatarText: { fontWeight: '800', color: colors.purple },
});

/** White panel with the dashboard's soft shadow. */
export function Card({ children, style, tight = false }: { children: ReactNode; style?: StyleProp<ViewStyle>; tight?: boolean }) {
  return <View style={[dash.card, tight && dash.cardTight, style]}>{children}</View>;
}

/** Card title row with an optional right-aligned action link. */
export function CardHeader({ title, action, onAction, right }: { title: string; action?: string; onAction?: () => void; right?: ReactNode }) {
  return <View style={dash.between}>
    <Text style={dash.cardTitle} numberOfLines={1}>{title}</Text>
    {right}
    {action && onAction
      ? <Pressable accessibilityRole="button" onPress={onAction} style={dash.linkAction}><Text style={dash.link}>{action} →</Text></Pressable>
      : null}
  </View>;
}

/** Small tinted pill (statuses, badges, "Sample data"). */
export function SoftBadge({ label, tone = 'slate', style }: { label: string; tone?: KitTone; style?: StyleProp<ViewStyle> }) {
  const palette = TONE[tone];
  return <View style={[dash.pill, { backgroundColor: palette.bg }, style]}><Text style={[dash.pillText, { color: palette.fg }]}>{label}</Text></View>;
}

/** `▲ 18%` delta pill; green when up, red when down. */
export function DeltaPill({ value }: { value: number }) {
  const up = value >= 0;
  return <Text style={[dash.pillText, { color: up ? colors.greenDark : colors.error }]}>{up ? '▲' : '▼'} {Math.abs(value)}%</Text>;
}

/** Circle avatar showing the account's initials. */
export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'A';
  return <View style={[dash.avatar, { width: size, height: size }]}><Text style={[dash.avatarText, { fontSize: size * 0.4 }]}>{initials}</Text></View>;
}

/** Round icon button for the top bar; optional count badge in the corner. */
export function IconButton({ glyph, label, onPress, badge }: { glyph: string; label: string; onPress?: () => void; badge?: number }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}>
    <Text style={styles.iconGlyph}>{glyph}</Text>
    {badge ? <View style={styles.iconBadge}><Text style={styles.iconBadgeText}>{badge > 99 ? '99+' : badge}</Text></View> : null}
  </Pressable>;
}

/** Thin share bar for category / status breakdowns. */
export function ProgressBar({ fraction, color }: { fraction: number; color: string }) {
  const width = `${Math.max(2, Math.min(100, Math.round(fraction * 100)))}%` as const;
  return <View style={styles.bar}><View style={[styles.barFill, { width, backgroundColor: color }]} /></View>;
}

/** Blue→violet gradient surface (premium card, Pro upsell). */
export function GradientSurface({ children, colors: stops = ['#2563EB', '#7C3AED'], style, radius = 20 }: {
  children: ReactNode;
  colors?: readonly [string, string, ...string[]];
  style?: StyleProp<ViewStyle>;
  radius?: number;
}) {
  return <LinearGradient colors={stops} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[{ borderRadius: radius, padding: 18, gap: 10 }, style]}>
    {children}
  </LinearGradient>;
}

/** Tiny column sparkline from a short count series (stat cards). */
export function Sparkline({ values, color, height = 34 }: { values: number[]; color: string; height?: number }) {
  const max = Math.max(1, ...values);
  const series = values.length ? values : [0];
  return <View style={[styles.spark, { height }]}>
    {series.map((value, index) => (
      <View key={index} style={[styles.sparkBar, { height: Math.max(3, Math.round((value / max) * height)), backgroundColor: color, opacity: 0.35 + 0.65 * (index / Math.max(1, series.length - 1)) }]} />
    ))}
  </View>;
}

/** One data series for `LineChart`. */
export interface Series {
  id: string;
  label: string;
  color: string;
  values: number[];
}

/**
 * Multi-series line chart drawn from plain `View`s.
 *
 * Each pair of points becomes a rotated 3px segment (origin pinned to its left
 * edge), with an outlined dot on every point, light horizontal gridlines and a
 * y-axis of four round ticks. The width is measured on layout so the chart
 * fills its card on any viewport; the y-scale is shared across every series.
 */
export function LineChart({ labels, series, height = 190 }: { labels: string[]; series: Series[]; height?: number }) {
  const [width, setWidth] = useState(0);
  const padLeft = 36;
  const padRight = 10;
  const padTop = 12;
  const padBottom = 24;
  const plotW = Math.max(0, width - padLeft - padRight);
  const plotH = Math.max(0, height - padTop - padBottom);
  const max = Math.max(1, ...series.flatMap((entry) => entry.values));
  const points = Math.max(1, labels.length - 1);
  const xAt = (index: number) => (index / points) * plotW;
  const yAt = (value: number) => plotH - (value / max) * plotH;
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return <View>
    <View style={{ height }} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 ? <>
        {ticks.map((fraction) => <View key={`grid-${fraction}`} style={{ position: 'absolute', left: padLeft, right: padRight, top: padTop + fraction * plotH, height: 1, backgroundColor: colors.line }} />)}
        {ticks.map((fraction) => <Text key={`ylab-${fraction}`} style={[styles.yLabel, { top: padTop + fraction * plotH - 7 }]}>{Math.round(max * (1 - fraction))}</Text>)}
        {series.map((entry) => entry.values.slice(0, -1).map((value, index) => {
          const x0 = padLeft + xAt(index);
          const y0 = padTop + yAt(value);
          const x1 = padLeft + xAt(index + 1);
          const y1 = padTop + yAt(entry.values[index + 1] ?? value);
          const length = Math.hypot(x1 - x0, y1 - y0);
          const angle = (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI;
          return <View key={`${entry.id}-seg-${index}`} style={{
            position: 'absolute', left: x0, top: y0 - 1.5, width: length, height: 3, borderRadius: 2,
            backgroundColor: entry.color, transformOrigin: '0% 50%', transform: [{ rotate: `${angle}deg` }],
          }} />;
        }))}
        {series.map((entry) => entry.values.map((value, index) => <View key={`${entry.id}-dot-${index}`} style={{
          position: 'absolute', left: padLeft + xAt(index) - 3.5, top: padTop + yAt(value) - 3.5,
          width: 7, height: 7, borderRadius: 4, backgroundColor: '#fff', borderWidth: 2, borderColor: entry.color,
        }} />))}
      </> : null}
    </View>
    <View style={styles.xRow}>
      {labels.map((label, index) => <Text key={`${label}-${index}`} style={styles.xLabel}>{label}</Text>)}
    </View>
  </View>;
}

/** Donut chart: a dense ring of ticks coloured by slice, with a centre figure. */
export function Donut({ data, total, size = 176, centreLabel = 'Total' }: {
  data: { label: string; value: number; color: string }[];
  total: number;
  size?: number;
  centreLabel?: string;
}) {
  const ticks = 108;
  const thick = Math.round(size * 0.14);
  const radius = size / 2 - thick / 2 - 2;
  const centre = size / 2;
  const hole = Math.max(24, size - thick * 2 - 8);
  const sum = Math.max(1, data.reduce((accumulator, slice) => accumulator + slice.value, 0));
  const cumulative: number[] = [];
  data.reduce((running, slice) => { const next = running + slice.value / sum; cumulative.push(next); return next; }, 0);
  const colorAt = (fraction: number) => {
    const index = cumulative.findIndex((boundary) => fraction <= boundary);
    return data[index === -1 ? data.length - 1 : index]?.color ?? colors.lineSoft;
  };
  return <View style={{ width: size, height: size }}>
    {Array.from({ length: ticks }, (_, index) => {
      const angle = (index / ticks) * Math.PI * 2 - Math.PI / 2;
      const x = centre + radius * Math.cos(angle) - thick / 2;
      const y = centre + radius * Math.sin(angle) - thick / 2;
      return <View key={index} style={{ position: 'absolute', left: x, top: y, width: thick, height: thick, borderRadius: thick * 0.4, backgroundColor: colorAt(index / ticks) }} />;
    })}
    <View style={[styles.donutHole, { left: (size - hole) / 2, top: (size - hole) / 2, width: hole, height: hole, borderRadius: hole / 2 }]}>
      <Text style={styles.donutValue}>{total.toLocaleString('en-IN')}</Text>
      <Text style={styles.donutLabel}>{centreLabel}</Text>
    </View>
  </View>;
}

/** A dashboard KPI card: icon, label, big value, delta, note and sparkline. */
export function StatCard({ icon, tone, label, value, note, delta, trend, onPress }: {
  icon: string;
  tone: KitTone;
  label: string;
  value: string;
  note: string;
  delta?: number;
  trend?: number[];
  onPress?: () => void;
}) {
  const palette = TONE[tone];
  return <Card style={styles.statCard}>
    <View style={dash.between}>
      <View style={[dash.iconBox, { backgroundColor: palette.bg }]}><Text style={{ fontSize: 17 }}>{icon}</Text></View>
      {onPress ? <Pressable accessibilityRole="button" onPress={onPress} style={dash.linkAction}><Text style={dash.link}>View →</Text></Pressable> : null}
    </View>
    <Text style={dash.statLabel}>{label}</Text>
    <View style={dash.row}>
      <Text style={dash.statValue}>{value}</Text>
      {delta !== undefined ? <DeltaPill value={delta} /> : null}
    </View>
    <Text style={dash.cardSub}>{note}</Text>
    {trend ? <Sparkline values={trend} color={palette.fg} /> : null}
  </Card>;
}

/** A timeline of coloured icon + title/detail/time rows. */
export function ActivityFeed({ items }: {
  items: { id: string; tone: KitTone; icon: string; title: string; detail: string; time: string }[];
}) {
  if (!items.length) return <Text style={dash.cardSub}>Nothing has happened yet.</Text>;
  return <View style={{ gap: 12 }}>
    {items.map((item) => {
      const palette = TONE[item.tone];
      return <View key={item.id} style={dash.row}>
        <View style={[styles.feedIcon, { backgroundColor: palette.bg }]}><Text style={{ color: palette.fg, fontWeight: '800' }}>{item.icon}</Text></View>
        <View style={dash.grow}>
          <Text style={styles.feedTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={dash.cardSub} numberOfLines={1}>{item.detail}</Text>
        </View>
        <Text style={styles.feedTime}>{item.time}</Text>
      </View>;
    })}
  </View>;
}

/** A horizontal action card (icon + title + caption). */
export function QuickAction({ icon, tone, title, body, onPress }: {
  icon: string;
  tone: KitTone;
  title: string;
  body: string;
  onPress?: () => void;
}) {
  const palette = TONE[tone];
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.quick, pressed && { opacity: 0.75 }]}>
    <View style={[dash.iconBox, { backgroundColor: palette.bg }]}><Text style={{ fontSize: 16 }}>{icon}</Text></View>
    <View style={dash.grow}>
      <Text style={styles.quickTitle} numberOfLines={1}>{title}</Text>
      <Text style={dash.cardSub} numberOfLines={1}>{body}</Text>
    </View>
  </Pressable>;
}

/**
 * Projection-only mini-map: a light grid with one pin per college.
 *
 * There is no tile/basemap dependency in this workspace, so the map plots the
 * real college coordinates into the box (`mapPins`) and labels the busiest one.
 */
export function MiniMap({ pins, height = 200 }: {
  pins: { id: string; label: string; city: string; x: number; y: number; primary: boolean }[];
  height?: number;
}) {
  const [width, setWidth] = useState(0);
  return <View style={[styles.map, { height }]} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
    {[0.2, 0.4, 0.6, 0.8].map((fraction) => <View key={`h${fraction}`} style={{ position: 'absolute', left: 0, right: 0, top: `${fraction * 100}%`, height: 1, backgroundColor: '#DCE7F5' }} />)}
    {[0.2, 0.4, 0.6, 0.8].map((fraction) => <View key={`v${fraction}`} style={{ position: 'absolute', top: 0, bottom: 0, left: `${fraction * 100}%`, width: 1, backgroundColor: '#DCE7F5' }} />)}
    {!pins.length ? <View style={styles.mapEmpty}><Text style={dash.cardSub}>Add a college to plot your launch map.</Text></View> : null}
    {width > 0 ? pins.map((pin) => <View key={pin.id} style={{ position: 'absolute', left: pin.x * width - 10, top: pin.y * height - 10, alignItems: 'center' }}>
      <View style={[styles.pin, pin.primary && styles.pinPrimary]} />
      {pin.primary ? <View style={styles.pinLabel}><Text style={styles.pinLabelText} numberOfLines={1}>{pin.label}</Text></View> : null}
    </View>) : null}
  </View>;
}

const styles = StyleSheet.create({
  iconBtn: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  iconGlyph: { fontSize: 16 },
  iconBadge: { position: 'absolute', top: -5, right: -5, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.heart, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  iconBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  bar: { height: 8, borderRadius: 999, backgroundColor: colors.lineSoft, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999 },
  spark: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, marginTop: 4 },
  sparkBar: { flex: 1, borderRadius: 2, minWidth: 2 },
  yLabel: { position: 'absolute', left: 0, width: 30, textAlign: 'right', fontSize: 10, color: colors.muted, fontWeight: '700' },
  xRow: { flexDirection: 'row', paddingLeft: 36, paddingRight: 10, marginTop: 6 },
  xLabel: { flex: 1, textAlign: 'center', fontSize: 10, color: colors.muted, fontWeight: '700' },
  donutHole: { position: 'absolute', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', gap: 2 },
  donutValue: { fontSize: 22, fontWeight: '900', color: colors.ink },
  donutLabel: { fontSize: 10, color: colors.muted, fontWeight: '700' },
  statCard: { flexGrow: 1, flexBasis: 210, minWidth: 190, gap: 6 },
  feedIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  feedTitle: { fontSize: 13, fontWeight: '800', color: colors.ink },
  feedTime: { fontSize: 10, color: colors.muted, fontWeight: '700' },
  quick: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 10, backgroundColor: '#fff', flexGrow: 1, flexBasis: 190 },
  quickTitle: { fontSize: 13, fontWeight: '800', color: colors.ink },
  map: { position: 'relative', borderRadius: 16, overflow: 'hidden', backgroundColor: '#F2F7FE', borderWidth: 1, borderColor: '#DCE7F5' },
  mapEmpty: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', padding: 12 },
  pin: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.blue, borderWidth: 3, borderColor: '#fff' },
  pinPrimary: { backgroundColor: colors.purple, width: 22, height: 22, borderRadius: 11 },
  pinLabel: { marginTop: 3, backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: colors.line, maxWidth: 130 },
  pinLabelText: { fontSize: 9, fontWeight: '800', color: colors.ink },
});

