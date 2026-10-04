import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, colors, ui } from '../components/ui';
import { OwnerProvider, useOwner } from '../context/OwnerContext';
import { OwnerExtrasProvider } from '../context/OwnerExtrasContext';
import { useStudent } from '../context/StudentContext';
import BusinessForm from './owner/BusinessForm';
import OwnerAccount from './owner/OwnerAccount';
import OwnerAnalytics from './owner/OwnerAnalytics';
import OwnerAuth from './owner/OwnerAuth';
import OwnerBookings from './owner/OwnerBookings';
import OwnerHome from './owner/OwnerHome';
import OwnerLanding, { OwnerProfileSetup } from './owner/OwnerLanding';
import OwnerListings from './owner/OwnerListings';
import OwnerOffers from './owner/OwnerOffers';
import OwnerProfile from './owner/OwnerProfile';
import OwnerReviews from './owner/OwnerReviews';
import { OwnerTabBar, OwnerTopBar, kit, type OwnerNav, type OwnerPage, type OwnerTab } from './owner/OwnerKit';

/**
 * Screen 1 + the owner shell.
 *
 * Nine screens behind one provider stack: the four bottom tabs (Home, Listings,
 * Bookings, Profile), the pushed pages (Reviews, Analytics, Offers, Account) and
 * the full-screen listing editor. `OwnerContext` owns the listings and inbox,
 * and `OwnerExtrasContext` wraps the offers, review-reply and analytics
 * endpoints so every screen reads the same API-backed cache.
 */
function OwnerTools({ onBack }: { onBack: () => void }) {
  const { session } = useStudent();
  const { profile, loading, requestCounts } = useOwner();
  /** Which gate panel a non-owner session sees. */
  const [gate, setGate] = useState<'landing' | 'auth'>('landing');
  const [tab, setTab] = useState<OwnerTab>('home');
  const [page, setPage] = useState<OwnerPage | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formPlaceId, setFormPlaceId] = useState<string | null>(null);
  const isOwner = session?.user.role === 'OWNER';

  const nav: OwnerNav = {
    tab: (next) => { setFormOpen(false); setPage(null); setTab(next); },
    page: (next) => setPage(next),
    form: (placeId) => { setFormOpen(true); setFormPlaceId(placeId ?? null); },
  };

  // Screen 1: guests and students get the gate, never the dashboard.
  if (!isOwner) {
    return <View style={kit.screen}>
      {gate === 'auth'
        ? <OwnerAuth onBack={() => setGate('landing')} />
        : <OwnerLanding onBack={onBack} onCreate={() => setGate('auth')} onSignIn={() => setGate('auth')} />}
    </View>;
  }

  if (loading) {
    return <View style={[kit.screen, styles.center]}>
      <ActivityIndicator color={colors.purple} />
      <Text accessibilityLiveRegion="polite" style={ui.body}>Loading your dashboard…</Text>
    </View>;
  }

  // OWNER accounts created without a business profile finish setup first.
  if (!profile) {
    return <View style={kit.screen}>
      <ScrollView contentContainerStyle={kit.body} keyboardShouldPersistTaps="handled">
        <OwnerTopBar title="Set up your business" subtitle="One step before you can publish listings" right={<Button title="Back" secondary onPress={onBack} />} />
        <OwnerProfileSetup />
        <Button title="Leave owner tools" secondary onPress={onBack} />
      </ScrollView>
    </View>;
  }
  const close = () => setPage(null);
  const body = formOpen
    ? <BusinessForm placeId={formPlaceId} nav={nav} />
    : page === 'reviews' ? <OwnerReviews nav={nav} />
      : page === 'analytics' ? <OwnerAnalytics nav={nav} onBack={close} />
        : page === 'offers' ? <OwnerOffers nav={nav} />
          : page === 'account' ? <OwnerAccount onBack={close} onExit={onBack} />
            : tab === 'listings' ? <OwnerListings nav={nav} />
              : tab === 'bookings' ? <OwnerBookings nav={nav} />
                : tab === 'profile' ? <OwnerProfile nav={nav} />
                  : <OwnerHome nav={nav} />;

  return <View style={kit.screen}>
    <View style={styles.body}>{body}</View>
    {formOpen ? null : <OwnerTabBar
      active={page ? null : tab}
      bookings={requestCounts.PENDING ?? 0}
      onSelect={nav.tab}
      onCreate={() => nav.form()}
    />}
  </View>;
}

/** Owner tools screen: mounts both owner providers over the shared session. */
export default function Owner({ onBack }: { onBack: () => void }) {
  return <OwnerProvider>
    <OwnerExtrasProvider>
      <OwnerTools onBack={onBack} />
    </OwnerExtrasProvider>
  </OwnerProvider>;
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  body: { flex: 1 },
});
