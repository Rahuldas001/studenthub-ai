import { useState } from 'react';
import { Text, View } from 'react-native';
import { Chip, colors, ui } from '../ui';
import { useOwner } from '../OwnerContext';
import { useOwnerExtras } from '../OwnerExtrasContext';
import { type OwnerNav, type OwnerTab } from '../OwnerKit';
import Account from './Account';
import Analytics from './Analytics';
import Listings from './Listings';
import ListingForm from './ListingForm';
import Offers from './Offers';
import Overview from './Overview';
import Profile from './Profile';
import Requests from './Requests';
import Reviews from './Reviews';

/**
 * The dashboard shell: business header, screen chips and the active screen.
 *
 * Replaces the mobile app's bottom tab bar plus pushed pages with one scrolling
 * page of chips — this dashboard is web-only, so there is no back gesture to
 * respect. Screens receive the same `OwnerNav` surface as their in-app twins
 * (`tab` switches screen, `form` opens the listing editor), which is why the
 * ported screens read almost identically to `apps/mobile-app`.
 */

const TABS: { id: OwnerTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'listings', label: 'Listings' },
  { id: 'requests', label: 'Requests' },
  { id: 'offers', label: 'Offers' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'profile', label: 'Profile' },
  { id: 'account', label: 'Account' },
];

export default function Dashboard() {
  const { profile, places, placeCounts, requestCounts } = useOwner();
  const { offers, unansweredCount, analytics } = useOwnerExtras();
  const [tab, setTab] = useState<OwnerTab>('overview');
  const [editor, setEditor] = useState<{ open: boolean; placeId: string | null }>({ open: false, placeId: null });

  /** Same shape the in-app owner screens receive, flattened for this shell. */
  const nav: OwnerNav = {
    tab: (next) => { setEditor({ open: false, placeId: null }); setTab(next); },
    form: (placeId) => setEditor({ open: true, placeId: placeId ?? null }),
  };

  const liveOffers = offers.filter((offer) => offer.active).length;
  const label = (item: { id: OwnerTab; label: string }) => {
    if (item.id === 'listings' && places.length) return `Listings (${places.length})`;
    if (item.id === 'requests' && requestCounts.PENDING) return `Requests (${requestCounts.PENDING})`;
    if (item.id === 'offers' && liveOffers) return `Offers (${liveOffers} live)`;
    if (item.id === 'reviews' && unansweredCount) return `Reviews (${unansweredCount} to answer)`;
    return item.label;
  };

  if (editor.open) return <ListingForm placeId={editor.placeId} nav={nav} />;

  return <View style={{ gap: 16 }}>
    <View style={[ui.panel, { backgroundColor: colors.pale, gap: 6 }]}>
      <View style={ui.between}>
        <Text style={ui.heading}>{profile?.businessName ?? 'Your business'}</Text>
        {profile?.verified && <Text style={ui.facility}>✔ Verified</Text>}
      </View>
      <Text style={ui.caption}>
        {places.length} listing{places.length === 1 ? '' : 's'} · {placeCounts.PENDING ?? 0} pending review · {requestCounts.PENDING ?? 0} new request{(requestCounts.PENDING ?? 0) === 1 ? '' : 's'}
        {analytics ? ` · ${analytics.totals.views} views in the last ${analytics.range} days` : ''}
      </Text>
    </View>

    <View style={[ui.row, { flexWrap: 'wrap' }]}>
      {TABS.map((item) => <Chip key={item.id} label={label(item)} selected={tab === item.id} onPress={() => nav.tab(item.id)} />)}
    </View>

    {tab === 'overview' ? <Overview nav={nav} /> : null}
    {tab === 'listings' ? <Listings nav={nav} /> : null}
    {tab === 'requests' ? <Requests nav={nav} /> : null}
    {tab === 'offers' ? <Offers nav={nav} /> : null}
    {tab === 'reviews' ? <Reviews nav={nav} /> : null}
    {tab === 'analytics' ? <Analytics nav={nav} /> : null}
    {tab === 'profile' ? <Profile nav={nav} /> : null}
    {tab === 'account' ? <Account nav={nav} /> : null}
  </View>;
}
