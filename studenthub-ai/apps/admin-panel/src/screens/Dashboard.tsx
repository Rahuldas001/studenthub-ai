import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAdmin } from '../AdminContext';
import { useSession } from '../SessionContext';
import { statTrends, totalReviews } from '../dashboardData';
import { SAMPLE_DELTAS } from '../sample';
import { Avatar, Card, GradientSurface, IconButton, SoftBadge, TONE, dash } from '../kit';
import { colors } from '../ui';
import Analytics from './Analytics';
import Bookings from './Bookings';
import Businesses from './Businesses';
import Categories from './Categories';
import Colleges from './Colleges';
import Listings from './Listings';
import Overview from './Overview';
import Reports from './Reports';
import Reviews from './Reviews';
import Settings from './Settings';
import Users from './Users';

/** The ten console surfaces, in sidebar order. */
export type AdminTab =
  | 'overview' | 'users' | 'listings' | 'bookings' | 'reviews'
  | 'categories' | 'analytics' | 'businesses' | 'colleges' | 'reports' | 'settings';

const NAV: { id: AdminTab; label: string; icon: string; hint: string }[] = [
  { id: 'overview', label: 'Dashboard', icon: '🏠', hint: 'Platform overview' },
  { id: 'users', label: 'Users', icon: '👥', hint: 'Students · owners · admins' },
  { id: 'listings', label: 'Listings', icon: '🗂️', hint: 'Moderation queue' },
  { id: 'bookings', label: 'Bookings', icon: '📅', hint: 'Student visit requests' },
  { id: 'reviews', label: 'Reviews', icon: '⭐', hint: 'Ratings & feedback' },
  { id: 'categories', label: 'Categories', icon: '🧩', hint: 'Listing mix' },
  { id: 'analytics', label: 'Analytics', icon: '📈', hint: 'Growth & trends' },
  { id: 'businesses', label: 'Business Owners', icon: '🏢', hint: 'Verification' },
  { id: 'colleges', label: 'Colleges', icon: '🎓', hint: 'Launch geography' },
  { id: 'reports', label: 'Reports', icon: '📄', hint: 'Exports & summaries' },
  { id: 'settings', label: 'Settings', icon: '⚙️', hint: 'Account & panel' },
];

const TITLES: Record<AdminTab, { title: string; subtitle: string }> = {
  overview: { title: 'Dashboard', subtitle: 'Platform health at a glance.' },
  users: { title: 'Users', subtitle: 'Every account on StudentHub, by role.' },
  listings: { title: 'Listings', subtitle: 'Approve, reject, unpublish or delete owner listings.' },
  bookings: { title: 'Bookings', subtitle: 'Student visit requests across every listing.' },
  reviews: { title: 'Reviews', subtitle: 'Ratings and review volume per listing.' },
  categories: { title: 'Categories', subtitle: 'How the marketplace is distributed.' },
  analytics: { title: 'Analytics', subtitle: 'Growth, distribution and the moderation pipeline.' },
  businesses: { title: 'Business Owners', subtitle: 'Verify the businesses that operate on StudentHub.' },
  colleges: { title: 'Colleges', subtitle: 'Campus locations that anchor student discovery.' },
  reports: { title: 'Reports', subtitle: 'Export-ready summaries of live platform data.' },
  settings: { title: 'Settings', subtitle: 'Your session, the API connection and sample data.' },
};

/** Window options for the header's date control. */
const RANGES: { id: number; label: string }[] = [
  { id: 7, label: 'Last 7 days' },
  { id: 30, label: 'Last 30 days' },
  { id: 90, label: 'Last 90 days' },
  { id: 365, label: 'This year' },
];

/** `May 1, 2025` — the header's date read-out. */
function dayLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Global search with the Ctrl/Cmd + K shortcut; jumps to and filters the queue. */
function SearchBar({ value, onChange, onSubmit }: { value: string; onChange: (text: string) => void; onSubmit: () => void }) {
  const inputRef = useRef<TextInput>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return <View style={styles.search}>
    <Text style={styles.searchIcon}>⌕</Text>
    <TextInput
      ref={inputRef}
      accessibilityLabel="Search users, listings, bookings, reviews"
      value={value}
      onChangeText={onChange}
      onSubmitEditing={onSubmit}
      placeholder="Search users, listings, bookings, reviews…"
      placeholderTextColor={colors.muted}
      style={styles.searchInput}
    />
    {value
      ? <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => onChange('')} style={styles.searchClear}><Text style={styles.searchClearText}>✕</Text></Pressable>
      : <Text style={styles.searchHint}>{Platform.OS === 'web' ? 'Ctrl + K' : '⌘ K'}</Text>}
  </View>;
}

/** Date control: a from → to read-out plus a working span dropdown. */
function RangePicker({ days, onDays }: { days: number; onDays: (days: number) => void }) {
  const [open, setOpen] = useState(false);
  const to = new Date();
  const from = new Date(to.getTime() - (days - 1) * 86_400_000);
  const active = RANGES.find((range) => range.id === days) ?? RANGES[1];
  return <View style={styles.rangeWrap}>
    <View style={styles.rangeBox}>
      <Text style={styles.rangeIcon}>🗓</Text>
      <Text style={styles.rangeText}>{dayLabel(from)}</Text>
      <Text style={styles.rangeArrow}>→</Text>
      <Text style={styles.rangeText}>{dayLabel(to)}</Text>
    </View>
    <View>
      <Pressable accessibilityRole="button" accessibilityLabel="Select date range" onPress={() => setOpen((current) => !current)} style={styles.rangeSelect}>
        <Text style={styles.rangeText}>{active.label}</Text>
        <Text style={styles.rangeArrow}>▾</Text>
      </Pressable>
      {open
        ? <View style={styles.menu}>
          {RANGES.map((range) => <Pressable key={range.id} accessibilityRole="button" onPress={() => { onDays(range.id); setOpen(false); }} style={styles.menuItem}>
            <Text style={[styles.menuText, range.id === days && styles.menuTextActive]}>{range.label}</Text>
          </Pressable>)}
        </View>
        : null}
    </View>
  </View>;
}

/**
 * The console shell: sidebar, top bar, welcome header and the active screen.
 *
 * Web counterpart of the in-app console, widened to the reference dashboard's
 * ten surfaces. Every sidebar entry maps to a real, API-backed screen, and the
 * Quick Stats card and header read the same live payloads the screens do.
 */
export default function Dashboard() {
  const { session, signOut } = useSession();
  const { placeCounts, owners, overview, places, loading, refresh, sampleOn, setSampleOn } = useAdmin();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [query, setQuery] = useState('');
  const [days, setDays] = useState(30);

  const header = TITLES[tab];
  const user = session?.user;
  const name = user?.displayName ?? 'Admin';
  const firstName = name.trim().split(/\s+/)[0];
  const role = user?.role === 'ADMIN' ? 'Super Admin' : (user?.role ?? 'Admin');

  const usersTotal = overview ? overview.users.students + overview.users.owners + overview.users.admins : 0;
  const listingsTotal = overview ? Object.values(overview.places).reduce((sum, count) => sum + (count ?? 0), 0) : 0;
  const bookingsTotal = overview ? Object.values(overview.visitRequests).reduce((sum, count) => sum + (count ?? 0), 0) : 0;
  const reviewsTotal = totalReviews(places);

  const quickStats = [
    { id: 'users', label: 'Total Users', value: usersTotal, icon: '👥', tone: 'green' as const, delta: SAMPLE_DELTAS.users },
    { id: 'listings', label: 'Total Listings', value: listingsTotal, icon: '🗂️', tone: 'blue' as const, delta: SAMPLE_DELTAS.listings },
    { id: 'bookings', label: 'Total Bookings', value: bookingsTotal, icon: '📅', tone: 'orange' as const, delta: SAMPLE_DELTAS.bookings },
    { id: 'reviews', label: 'Total Reviews', value: reviewsTotal, icon: '⭐', tone: 'purple' as const, delta: SAMPLE_DELTAS.reviews },
  ];

  const badge = (id: AdminTab): number | undefined => {
    if (id === 'listings') return placeCounts.PENDING || undefined;
    if (id === 'businesses') return owners.length || undefined;
    if (id === 'bookings') return overview?.visitRequests.PENDING || undefined;
    if (id === 'users') return usersTotal || undefined;
    return undefined;
  };

  const screen = (): ReactNode => {
    switch (tab) {
      case 'overview': return <Overview go={setTab} />;
      case 'users': return <Users go={setTab} />;
      case 'listings': return <Listings query={query} />;
      case 'bookings': return <Bookings />;
      case 'reviews': return <Reviews />;
      case 'categories': return <Categories />;
      case 'analytics': return <Analytics />;
      case 'businesses': return <Businesses />;
      case 'colleges': return <Colleges />;
      case 'reports': return <Reports />;
      default: return <Settings />;
    }
  };

  return <View style={styles.shell}>
    <View style={styles.sidebar}>
      <View style={styles.brand}>
        <View style={styles.logo}><Text style={{ fontSize: 20 }}>🎓</Text></View>
        <View style={dash.grow}>
          <Text style={styles.brandName}>StudentHub <Text style={{ color: colors.purple }}>AI</Text></Text>
          <Text style={styles.brandTag}>Everything a Student Needs</Text>
        </View>
      </View>

      <ScrollView style={styles.nav} contentContainerStyle={styles.navContent} showsVerticalScrollIndicator={false}>
        {NAV.map((item) => {
          const count = badge(item.id);
          const on = tab === item.id;
          return <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setTab(item.id)}
            style={({ pressed }) => [styles.navItem, on && styles.navItemOn, pressed && { opacity: 0.8 }]}>
            <Text style={styles.navGlyph}>{item.icon}</Text>
            <View style={dash.grow}>
              <Text style={[styles.navLabel, on && { color: colors.purple }]} numberOfLines={1}>{item.label}</Text>
              <Text style={styles.navHint} numberOfLines={1}>{item.hint}</Text>
            </View>
            {count ? <View style={[styles.navBadge, on && { backgroundColor: colors.purple }]}><Text style={[styles.navBadgeText, on && { color: '#fff' }]}>{count > 99 ? '99+' : count}</Text></View> : null}
          </Pressable>;
        })}
      </ScrollView>

      <View style={styles.quick}>
        <Text style={styles.quickHeading}>QUICK STATS</Text>
        {quickStats.map((stat) => {
          const palette = TONE[stat.tone];
          return <View key={stat.id} style={styles.quickRow}>
            <View style={[styles.quickIcon, { backgroundColor: palette.bg }]}><Text style={{ fontSize: 12 }}>{stat.icon}</Text></View>
            <View style={dash.grow}>
              <Text style={styles.quickLabel} numberOfLines={1}>{stat.label}</Text>
              <Text style={styles.quickValue}>{stat.value.toLocaleString('en-IN')}</Text>
            </View>
            {sampleOn ? <Text style={styles.quickDelta}>+{stat.delta}%</Text> : null}
          </View>;
        })}
      </View>

      <GradientSurface radius={18} style={styles.premium}>
        <View style={dash.between}>
          <Text style={styles.premiumTitle}>StudentHub AI Premium</Text>
          <Text style={styles.premiumBadge}>ACTIVE</Text>
        </View>
        <Text style={styles.premiumBody}>Advanced analytics · Featured listings · Business insights</Text>
        <Pressable accessibilityRole="button" onPress={() => setTab('settings')} style={styles.premiumCta}>
          <Text style={styles.premiumCtaText}>Manage Plan →</Text>
        </Pressable>
      </GradientSurface>

      <Pressable accessibilityRole="button" onPress={signOut} style={({ pressed }) => [styles.logout, pressed && { opacity: 0.75 }]}>
        <Text style={styles.logoutGlyph}>↪</Text>
        <Text style={styles.logoutText}>Log Out</Text>
      </Pressable>
    </View>

    <View style={styles.main}>
      <View style={styles.topbar}>
        <SearchBar value={query} onChange={setQuery} onSubmit={() => { if (query.trim()) setTab('listings'); }} />
        <View style={styles.topActions}>
          <IconButton glyph="🔔" label="Notifications" badge={placeCounts.PENDING ?? 0} onPress={() => setTab('listings')} />
          <IconButton glyph="✉" label="Messages" badge={overview?.visitRequests.PENDING ?? 0} onPress={() => setTab('bookings')} />
          <View style={styles.account}>
            <Avatar name={name} />
            <View style={dash.grow}>
              <Text style={styles.accountName} numberOfLines={1}>{name}</Text>
              <View style={styles.accountRoleRow}>
                <View style={styles.online} />
                <Text style={styles.accountRole} numberOfLines={1}>{role}</Text>
              </View>
            </View>
          </View>
          <IconButton glyph="☀" label="Theme" onPress={() => setTab('settings')} />
          <IconButton glyph="⚙" label="Settings" onPress={() => setTab('settings')} />
          <IconButton glyph="↪" label="Sign out" onPress={signOut} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.welcome}>
          <View style={dash.grow}>
            <Text style={styles.welcomeTitle}>Welcome back, {firstName}. 👋</Text>
            <Text style={styles.welcomeSub}>Here&apos;s what&apos;s happening with StudentHub today.</Text>
          </View>
          <RangePicker days={days} onDays={setDays} />
        </View>

        <View style={styles.sectionHead}>
          <View style={dash.grow}>
            <Text style={styles.sectionTitle}>{header.title}</Text>
            <Text style={styles.sectionSub}>{header.subtitle}</Text>
          </View>
          {sampleOn ? <SoftBadge label="SAMPLE DATA" tone="amber" /> : null}
          <Pressable accessibilityRole="button" onPress={refresh} style={({ pressed }) => [styles.refresh, pressed && { opacity: 0.75 }]}>
            <Text style={styles.refreshText}>⟳ Refresh</Text>
          </Pressable>
        </View>

        {loading ? <Card><Text style={dash.cardSub}>Loading the console…</Text></Card> : screen()}

        <View style={styles.footer}>
          <Text style={styles.footerText}>StudentHub AI Admin Panel v1.0.0</Text>
          <Text style={styles.footerText} numberOfLines={1}>{NAV.map((item) => item.label).join(' • ')}</Text>
          <View style={dash.row}><View style={styles.online} /><Text style={styles.footerText}>System Online</Text></View>
          <Text style={styles.footerText}>© 2025 StudentHub AI. All rights reserved.</Text>
        </View>
      </ScrollView>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  shell: { flex: 1, flexDirection: 'row', backgroundColor: colors.bg },
  sidebar: { width: 258, flexShrink: 0, backgroundColor: '#fff', borderRightWidth: 1, borderRightColor: colors.line, padding: 16, gap: 14 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center' },
  brandName: { fontSize: 15, fontWeight: '900', color: colors.ink },
  brandTag: { fontSize: 9.5, color: colors.muted, fontWeight: '600' },
  nav: { flex: 1 },
  navContent: { gap: 3 },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: 'transparent' },
  navItemOn: { backgroundColor: colors.pale, borderColor: '#E4DBFF' },
  navGlyph: { fontSize: 15, width: 20, textAlign: 'center' },
  navLabel: { fontSize: 12.5, fontWeight: '800', color: colors.ink },
  navHint: { fontSize: 9.5, color: colors.muted },
  navBadge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.line, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  navBadgeText: { fontSize: 9.5, fontWeight: '800', color: colors.muted },
  quick: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12, gap: 8 },
  quickHeading: { fontSize: 9, fontWeight: '900', letterSpacing: 1, color: colors.muted },
  quickRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  quickIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 10, color: colors.muted, fontWeight: '700' },
  quickValue: { fontSize: 14, fontWeight: '900', color: colors.ink },
  quickDelta: { fontSize: 10, fontWeight: '800', color: colors.greenDark },
  premium: { padding: 14, gap: 8 },
  premiumTitle: { fontSize: 13, fontWeight: '900', color: '#fff', flexShrink: 1 },
  premiumBadge: { fontSize: 8, fontWeight: '900', color: '#7C3AED', backgroundColor: '#FDE68A', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3, overflow: 'hidden' },
  premiumBody: { fontSize: 10, color: 'rgba(255,255,255,0.9)', lineHeight: 15 },
  premiumCta: { backgroundColor: '#fff', borderRadius: 10, minHeight: 34, alignItems: 'center', justifyContent: 'center' },
  premiumCtaText: { color: colors.violet, fontWeight: '800', fontSize: 12 },
  logout: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 42, borderRadius: 12, backgroundColor: colors.errorBg, paddingHorizontal: 12 },
  logoutGlyph: { fontSize: 15, color: colors.error },
  logoutText: { fontSize: 12.5, fontWeight: '800', color: colors.error },
  main: { flex: 1 },
  topbar: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.line },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, flexGrow: 1, flexBasis: 260, minWidth: 220, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 12, minHeight: 40 },
  searchIcon: { fontSize: 16, color: colors.muted },
  searchInput: { flex: 1, fontSize: 13, color: colors.ink, minHeight: 38, paddingVertical: 8 },
  searchClear: { padding: 4 },
  searchClearText: { fontSize: 12, color: colors.muted, fontWeight: '800' },
  searchHint: { fontSize: 10, fontWeight: '800', color: colors.muted, borderWidth: 1, borderColor: colors.line, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: '#fff' },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 10, minHeight: 38, backgroundColor: '#fff' },
  toggleOn: { backgroundColor: colors.purple, borderColor: colors.purple },
  toggleDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.muted },
  toggleDotOn: { backgroundColor: '#fff' },
  toggleText: { fontSize: 11.5, fontWeight: '800', color: colors.muted },
  account: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: colors.line, maxWidth: 190 },
  accountName: { fontSize: 12, fontWeight: '800', color: colors.ink },
  accountRoleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  online: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.green },
  accountRole: { fontSize: 10, color: colors.muted, fontWeight: '600' },
  content: { padding: 20, gap: 18, paddingBottom: 32 },
  welcome: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  welcomeTitle: { fontSize: 22, fontWeight: '900', color: colors.ink, letterSpacing: -0.5 },
  welcomeSub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  rangeWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  rangeBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.line, borderRadius: 12, backgroundColor: '#fff', paddingHorizontal: 12, minHeight: 40 },
  rangeIcon: { fontSize: 13 },
  rangeText: { fontSize: 12, fontWeight: '700', color: colors.ink },
  rangeArrow: { fontSize: 12, color: colors.muted },
  rangeSelect: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.line, borderRadius: 12, backgroundColor: '#fff', paddingHorizontal: 12, minHeight: 40 },
  menu: { position: 'absolute', top: 46, right: 0, minWidth: 160, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingVertical: 6, zIndex: 20, shadowColor: colors.purpleDeep, shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  menuItem: { paddingHorizontal: 14, paddingVertical: 9 },
  menuText: { fontSize: 12.5, color: colors.ink, fontWeight: '600' },
  menuTextActive: { color: colors.purple, fontWeight: '800' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  sectionTitle: { fontSize: 15, fontWeight: '900', color: colors.ink },
  sectionSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  refresh: { borderWidth: 1, borderColor: colors.line, borderRadius: 999, backgroundColor: '#fff', paddingHorizontal: 12, minHeight: 34, alignItems: 'center', justifyContent: 'center' },
  refreshText: { fontSize: 11.5, fontWeight: '800', color: colors.purple },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 16 },
  footerText: { fontSize: 11, color: colors.muted, flexShrink: 1 },
});




