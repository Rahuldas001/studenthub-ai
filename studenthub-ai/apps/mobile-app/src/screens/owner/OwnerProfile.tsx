import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, colors, ui } from '../../components/ui';
import { useOwner } from '../../context/OwnerContext';
import { useOwnerExtras } from '../../context/OwnerExtrasContext';
import { useStudent } from '../../context/StudentContext';
import { createOwnerProfile } from '../../services/owner';
import { liveOffers } from '../../utils/ownerExtras';
import { Field, Notice, OwnerInput, OwnerTopBar, SectionCard, StatTile, kit, type OwnerNav } from './OwnerKit';

/**
 * Screen 9 - business profile.
 *
 * The profile itself (business name + phone) is API data, saved through the same
 * endpoint the onboarding gate uses, and the counts lower down come from the
 * offers/reviews caches, so every device shows the same numbers.
 */

export default function OwnerProfile({ nav }: { nav: OwnerNav }) {
  const { token, profile, places, placeCounts, setProfile, refresh } = useOwner();
  const { offers, reviews } = useOwnerExtras();
  const { session, setSessionOwner } = useStudent();
  const [businessName, setBusinessName] = useState(profile?.businessName ?? '');
  const [businessPhone, setBusinessPhone] = useState(profile?.phone ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setBusinessName(profile.businessName);
    setBusinessPhone(profile.phone ?? '');
  }, [profile]);

  const rated = places.filter((place) => place.reviewCount > 0);
  const reviewTotal = rated.reduce((total, place) => total + place.reviewCount, 0);
  const rating = reviewTotal
    ? Number((rated.reduce((total, place) => total + place.rating * place.reviewCount, 0) / reviewTotal).toFixed(1))
    : 0;
  const live = liveOffers(offers).length;
  const replyCount = reviews.filter((review) => review.reply).length;
  const extrasCount = places.filter((place) => Boolean(place.whatsapp || place.openingHours || place.priceBand)).length;

  const save = () => {
    if (busy) return;
    if (!token) { setError('Sign in with an owner account to update the business profile.'); return; }
    if (businessName.trim().length < 2) { setError('Add your business name (at least 2 characters).'); return; }
    setBusy(true);
    setError('');
    setSaved(false);
    createOwnerProfile(token, { businessName: businessName.trim(), businessPhone: businessPhone.trim() || undefined })
      .then((owner) => {
        setProfile(owner);
        setSessionOwner(owner);
        setSaved(true);
        refresh();
      })
      .catch((failure: unknown) => setError(failure instanceof Error ? failure.message : 'Could not save the business profile.'))
      .finally(() => setBusy(false));
  };
  const initial = (profile?.businessName ?? session?.user.displayName ?? 'S').trim().charAt(0).toUpperCase();

  return <ScrollView contentContainerStyle={kit.body} keyboardShouldPersistTaps="handled">
    <OwnerTopBar title="Profile" subtitle="Business identity and owner tools" />

    <View style={[ui.panel, { gap: 14 }]}>
      <View style={ui.row}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{initial}</Text></View>
        <View style={{ flexShrink: 1, gap: 3 }}>
          <Text style={ui.heading}>{profile?.businessName ?? 'Business name missing'}</Text>
          <Text style={ui.caption}>{session?.user.displayName}{session?.user.role ? ` · ${session.user.role} account` : ''}</Text>
          <Text style={ui.caption}>{session?.user.email ?? session?.user.phone ?? 'No contact on file'}</Text>
        </View>
      </View>
      <View style={[ui.row, { flexWrap: 'wrap' }]}>
        <View style={[kit.pill, { backgroundColor: profile?.verified ? '#E7F7EE' : '#FFF6DC' }]}>
          <Text style={[kit.pillText, { color: profile?.verified ? colors.greenDark : '#946600' }]}>
            {profile?.verified ? '✓ Verified business' : '◷ Verification pending'}
          </Text>
        </View>
      </View>
    </View>

    <View style={kit.grid}>
      <StatTile icon="▦" label="Listings" value={String(places.length)} />
      <StatTile icon="✓" label="Active" value={String(placeCounts.ACTIVE ?? 0)} />
      <StatTile icon="★" label="Average rating" value={rating ? rating.toFixed(1) : '—'} />
    </View>

    <View style={[ui.panel, { gap: 14 }]}>
      <Text style={ui.cardTitle}>Business details</Text>
      <Text style={ui.body}>Students see the business name on every listing you publish; the business phone is the default contact StudentHub support uses.</Text>
      <Field label="Business name">
        <OwnerInput label="Business name" value={businessName} onChange={(value) => { setBusinessName(value); setSaved(false); }} placeholder="Campus Kitchen" />
      </Field>
      <Field label="Business phone" hint="Optional — use a manager's number if someone else runs a listing.">
        <OwnerInput label="Business phone" value={businessPhone} onChange={(value) => { setBusinessPhone(value); setSaved(false); }} placeholder="+91 98765 43210" keyboardType="phone-pad" />
      </Field>
      {error ? <Text style={kit.error}>{error}</Text> : null}
      {saved && !error ? <Text style={styles.saved}>Business profile saved.</Text> : null}
      <Button title={busy ? 'Saving…' : 'Save business details'} onPress={save} disabled={busy} />
    </View>

    <SectionCard title="These screens">
      <View style={kit.chipRow}>
        <Button title="Reviews" secondary onPress={() => nav.page('reviews')} />
        <Button title="Analytics" secondary onPress={() => nav.page('analytics')} />
        <Button title="Offers" secondary onPress={() => nav.page('offers')} />
        <Button title="Bookings" secondary onPress={() => nav.tab('bookings')} />
        <Button title="Listings" secondary onPress={() => nav.tab('listings')} />
      </View>
    </SectionCard>

    <View style={[ui.panel, { gap: 12 }]}>
      <Text style={ui.cardTitle}>Saved on StudentHub</Text>
      <Text style={ui.body}>
        {live} live offer{live === 1 ? '' : 's'} · {replyCount} review repl{replyCount === 1 ? 'y' : 'ies'} published · {extrasCount} listing{extrasCount === 1 ? '' : 's'} with WhatsApp, hours or price band
      </Text>
      <View style={[ui.row, { flexWrap: 'wrap', gap: 10 }]}>
        <Button title="Manage offers" secondary onPress={() => nav.page('offers')} />
        <Button title="Read reviews" secondary onPress={() => nav.page('reviews')} />
      </View>
      <Text style={ui.caption}>These follow your account: sign in anywhere and the same offers, replies and extras are already there.</Text>
    </View>

    <Button title="Account & security" secondary onPress={() => nav.page('account')} />
    <Notice title="What lives where" text="Everything on this screen — business profile, listings, offers, per-listing extras and review replies — is stored by the StudentHub API, so it survives a reinstall and shows up on every device you sign in on." />
  </ScrollView>;
}

const styles = StyleSheet.create({
  avatar: { width: 56, height: 56, borderRadius: 20, backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 22, fontWeight: '800', color: colors.purple },
  saved: { fontSize: 12, color: colors.greenDark, fontWeight: '700' },
});

