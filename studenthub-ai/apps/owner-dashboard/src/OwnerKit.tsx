import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { PlaceStatus } from '@studenthub/types';
import { colors, ui } from './ui';

/**
 * Shared building blocks for the owner dashboard.
 *
 * Mirrors `apps/mobile-app/src/screens/owner/OwnerKit.tsx` so the standalone web
 * dashboard renders the same cards, pills and figures as the in-app owner tools.
 * The bottom tab bar from the mobile copy is intentionally absent: this app is
 * a single scrolling page, so the shell swaps screens with chips instead.
 */

/** Moderation status → owner-friendly label and colours. */
export const STATUS_META: Record<PlaceStatus, { label: string; bg: string; fg: string }> = {
  ACTIVE: { label: 'Active', bg: '#E7F7EE', fg: colors.greenDark },
  PENDING: { label: 'In review', bg: '#FFF6DC', fg: '#946600' },
  DRAFT: { label: 'Draft', bg: colors.bg, fg: colors.muted },
  REJECTED: { label: 'Rejected', bg: '#FEECEC', fg: '#B42318' },
  INACTIVE: { label: 'Paused', bg: '#EFECF7', fg: '#5B5470' },
};

export const kit = StyleSheet.create({
  body: { gap: 16 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  greet: { fontSize: 22, fontWeight: '800', color: colors.ink, letterSpacing: -0.5, flexShrink: 1 },
  sub: { color: colors.muted, fontSize: 12, marginTop: 3 },
  iconWrap: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 18, color: colors.ink },
  badge: { position: 'absolute', top: -6, right: -6, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.heart, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { flexGrow: 1, flexBasis: 160, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 6 },
  tileIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center' },
  tileGlyph: { fontSize: 15, color: colors.purple },
  tileValue: { fontSize: 20, fontWeight: '800', color: colors.ink },
  tileLabel: { fontSize: 11, color: colors.muted, fontWeight: '700' },
  pill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  pillText: { fontSize: 10, fontWeight: '800' },
  deltaUp: { color: colors.greenDark, backgroundColor: '#E7F7EE' },
  deltaDown: { color: '#B42318', backgroundColor: '#FEECEC' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: colors.ink },
  hint: { fontSize: 11, color: colors.muted },
  error: { color: '#B42318', fontSize: 12, fontWeight: '600' },
  notice: { backgroundColor: '#FFF6DC', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#F5E3B8', gap: 4 },
  noticeTitle: { fontSize: 11, fontWeight: '800', color: '#7A5B12' },
  noticeText: { fontSize: 11, color: '#7A5B12', lineHeight: 17 },
  noticeAction: { alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center', marginTop: 2 },
  noticeActionText: { fontSize: 11, fontWeight: '800', color: colors.purple },
  toggleTrack: { width: 44, height: 26, borderRadius: 13, backgroundColor: '#DDD8EC', justifyContent: 'center', paddingHorizontal: 3 },
  toggleOn: { backgroundColor: colors.purple },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  bar: { height: 8, borderRadius: 4, backgroundColor: colors.line, overflow: 'hidden', flex: 1 },
  barFill: { height: 8, borderRadius: 4, backgroundColor: colors.purple },
  metricRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 },
  metric: { flex: 1, gap: 2 },
  metricValue: { fontSize: 15, fontWeight: '800', color: colors.ink },
  metricLabel: { fontSize: 10, color: colors.muted, fontWeight: '700' },
});

/** The screens this dashboard can show; the shell owns which one is active. */
export type OwnerTab = 'overview' | 'listings' | 'requests' | 'offers' | 'reviews' | 'analytics' | 'profile' | 'account';

/** Navigation surface handed to every screen by the shell. */
export interface OwnerNav {
  tab: (tab: OwnerTab) => void;
  /** `placeId` opens the editor for that listing; omitted opens a new one. */
  form: (placeId?: string | null) => void;
}

/** Header used by every screen: title, caption, optional right slot. */
export function OwnerTopBar({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return <View style={kit.topBar}>
    <View style={{ flexShrink: 1 }}>
      <Text style={kit.greet}>{title}</Text>
      {subtitle ? <Text style={kit.sub}>{subtitle}</Text> : null}
    </View>
    {right}
  </View>;
}

export function IconButton({ icon, label, onPress, badge }: { icon: string; label: string; onPress: () => void; badge?: number }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={kit.iconWrap}>
    <Text style={kit.icon}>{icon}</Text>
    {badge ? <View style={kit.badge}><Text style={kit.badgeText}>{badge > 9 ? '9+' : badge}</Text></View> : null}
  </Pressable>;
}

/** Trend badge: `+12%` green, negative red. */
export function Delta({ value }: { value: number }) {
  const up = value >= 0;
  return <View style={[kit.pill, up ? kit.deltaUp : kit.deltaDown]}>
    <Text style={[kit.pillText, { color: up ? colors.greenDark : '#B42318' }]}>{up ? '▲' : '▼'} {up ? '+' : ''}{value}%</Text>
  </View>;
}

export function StatTile({ icon, label, value, delta }: { icon: string; label: string; value: string; delta?: number }) {
  return <View style={kit.tile}>
    <View style={kit.tileIcon}><Text style={kit.tileGlyph}>{icon}</Text></View>
    <Text style={kit.tileValue}>{value}</Text>
    <Text style={kit.tileLabel}>{label}</Text>
    {delta === undefined ? null : <Delta value={delta} />}
  </View>;
}

export function StatusPill({ status }: { status: PlaceStatus }) {
  const meta = STATUS_META[status];
  return <View style={[kit.pill, { backgroundColor: meta.bg }]}><Text style={[kit.pillText, { color: meta.fg }]}>{meta.label}</Text></View>;
}

export function Stars({ value, size = 13 }: { value: number; size?: number }) {
  const full = Math.max(0, Math.min(5, Math.round(value)));
  return <Text style={{ fontSize: size, color: colors.star, letterSpacing: 2 }}>
    {'★★★★★'.slice(0, full)}
    <Text style={{ color: '#DDD8EC' }}>{'★★★★★'.slice(full)}</Text>
  </Text>;
}

export function RatingPill({ value, count }: { value: number; count: number }) {
  return <View style={[kit.pill, { backgroundColor: '#FFF6DC' }]}>
    <Text style={[kit.pillText, { color: '#946600' }]}>★ {value.toFixed(1)}{count ? ` · ${count}` : ''}</Text>
  </View>;
}

/** Views / saves / enquiries strip along the bottom of a listing card. */
export function MetricRow({ items }: { items: { label: string; value: string }[] }) {
  return <View style={kit.metricRow}>
    {items.map((item) => <View key={item.label} style={kit.metric}>
      <Text style={kit.metricValue}>{item.value}</Text>
      <Text style={kit.metricLabel}>{item.label}</Text>
    </View>)}
  </View>;
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return <View style={kit.field}>
    <Text style={kit.fieldLabel}>{label}</Text>
    {children}
    {error ? <Text style={kit.error}>{error}</Text> : hint ? <Text style={kit.hint}>{hint}</Text> : null}
  </View>;
}

export function OwnerInput({ value, onChange, placeholder, keyboardType, multiline, label, password = false }: {
  value: string;
  onChange: (text: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'numeric' | 'phone-pad' | 'email-address' | 'url';
  multiline?: boolean;
  label: string;
  password?: boolean;
}) {
  return <TextInput
    accessibilityLabel={label}
    value={value}
    onChangeText={onChange}
    placeholder={placeholder}
    placeholderTextColor={colors.muted}
    secureTextEntry={password}
    keyboardType={keyboardType ?? 'default'}
    autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
    multiline={multiline}
    style={[ui.input, multiline ? { minHeight: 96, textAlignVertical: 'top' } : null]}
  />;
}

/** Chip selector for category, price band, opening hours, status filters. */
export function OptionRow<T extends string | number>({ options, value, onChange }: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return <View style={kit.chipRow}>
    {options.map((option) => {
      const on = option.id === value;
      return <Pressable key={String(option.id) || 'ALL'} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => onChange(option.id)}
        style={[ui.chip, on && { backgroundColor: colors.purple, borderColor: colors.purple }]}>
        <Text style={[ui.chipText, on && { color: '#fff' }]}>{option.label}</Text>
      </Pressable>;
    })}
  </View>;
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return <Pressable accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: on }} onPress={onChange} style={[kit.toggleTrack, on && kit.toggleOn]}>
    <View style={[kit.toggleThumb, { alignSelf: on ? 'flex-end' : 'flex-start' }]} />
  </Pressable>;
}

/** Amber explainer for anything the owner should know but cannot change. */
export function Notice({ title, text, action }: { title: string; text: string; action?: { label: string; onPress: () => void } }) {
  return <View style={kit.notice}>
    <Text style={kit.noticeTitle}>{title}</Text>
    <Text style={kit.noticeText}>{text}</Text>
    {action ? <Pressable accessibilityRole="button" onPress={action.onPress} style={kit.noticeAction}>
      <Text style={kit.noticeActionText}>{action.label}</Text>
    </Pressable> : null}
  </View>;
}

export function SectionCard({ title, action, onPress, children }: {
  title: string;
  action?: string;
  onPress?: () => void;
  children: ReactNode;
}) {
  return <View style={[ui.panel, { gap: 12 }]}>
    <View style={ui.between}>
      <Text style={ui.cardTitle}>{title}</Text>
      {action && onPress ? <Pressable accessibilityRole="button" onPress={onPress} style={ui.textAction}><Text style={ui.link}>{action} →</Text></Pressable> : null}
    </View>
    {children}
  </View>;
}

/** `12 Sep` for chart labels and lists. */
export function shortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** `12 Sep, 4:35 pm` for booking and review rows. */
export function shortDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}
