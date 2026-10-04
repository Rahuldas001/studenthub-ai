import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, colors, ui } from '../ui';
import { useOwner } from '../OwnerContext';
import { useOwnerExtras } from '../OwnerExtrasContext';
import { useSession } from '../SessionContext';
import { Notice, OwnerTopBar, kit, type OwnerNav } from '../OwnerKit';

/**
 * Screen 10 - account & security.
 *
 * Mirrors `apps/mobile-app/src/screens/owner/OwnerAccount.tsx`. Everything the
 * session knows about the owner account, plus the two ways out: back to the
 * dashboard, or sign out completely. Signing out asks for a second click
 * instead of the mobile app's `Alert.alert`, which does not exist on the web.
 */

export default function Account({ nav }: { nav: OwnerNav }) {
  const { profile, places, requestCounts } = useOwner();
  const { offers, reviews, refreshOffers, refreshReviews } = useOwnerExtras();
  const { session, signOut } = useSession();
  const [confirmOut, setConfirmOut] = useState(false);

  const user = session?.user;
  const liveOffers = offers.filter((offer) => offer.active).length;
  const answeredReviews = reviews.filter((review) => review.reply).length;

  const row = (label: string, value: string) => <View key={label} style={ui.between}>
    <Text style={ui.caption}>{label}</Text>
    <Text style={styles.value} numberOfLines={1}>{value}</Text>
  </View>;

  return <View style={kit.body}>
    <OwnerTopBar title="Account & security" subtitle="Session, verification and your data" right={<Button title="Overview" secondary onPress={() => nav.tab('overview')} />} />

    <View style={[ui.panel, { gap: 12 }]}>
      <Text style={ui.cardTitle}>Signed in as</Text>
      {row('Name', user?.displayName ?? 'Unknown')}
      {row('Role', user?.role ?? '—')}
      {row('Email', user?.email ?? 'Not set')}
      {row('Phone', user?.phone ?? 'Not set')}
      {row('Account ID', user?.id ? `${user.id.slice(0, 8)}…` : '—')}
      <Text style={ui.caption}>Your owner session uses the same token as the student app, so switching tools never signs you out.</Text>
    </View>

    <View style={[ui.panel, { gap: 12 }]}>
      <View style={ui.between}>
        <Text style={ui.cardTitle}>Business verification</Text>
        <View style={[kit.pill, { backgroundColor: profile?.verified ? '#E7F7EE' : '#FFF6DC' }]}>
          <Text style={[kit.pillText, { color: profile?.verified ? colors.greenDark : '#946600' }]}>
            {profile?.verified ? '✓ Verified' : '◷ Pending'}
          </Text>
        </View>
      </View>
      {row('Business', profile?.businessName ?? 'Not set up')}
      {row('Business phone', profile?.phone ?? 'Not set')}
      {row('Listings', String(places.length))}
      {row('Confirmed bookings', String(requestCounts.CONFIRMED ?? 0))}
      <Text style={ui.caption}>StudentHub reviews every listing, so students only see businesses that were checked by the team.</Text>
    </View>

    <View style={[ui.panel, { gap: 12 }]}>
      <Text style={ui.cardTitle}>Your data</Text>
      {row('Offers', `${offers.length} total · ${liveOffers} live`)}
      {row('Review replies', `${answeredReviews}/${reviews.length} answered`)}
      {row('Stored in', 'Your StudentHub account')}
      <Text style={ui.caption}>Everything here comes from the API, so signing in on a phone, tablet or the web shows the same numbers.</Text>
      <Button title="Refresh from server" secondary onPress={() => { void refreshOffers(); void refreshReviews(); }} />
    </View>

    <View style={[ui.panel, { gap: 12 }]}>
      <Text style={ui.cardTitle}>Session</Text>
      <Button title="Back to overview" onPress={() => nav.tab('overview')} />
      {confirmOut
        ? <>
            <Button title="Sign out now" onPress={signOut} />
            <Text style={ui.caption}>Listings, offers, bookings and review replies live on your account, so the next device shows exactly this. Signing out only clears this browser's session.</Text>
            <Button title="Stay signed in" secondary onPress={() => setConfirmOut(false)} />
          </>
        : <Button title="Sign out" secondary onPress={() => setConfirmOut(true)} />}
      {user?.role !== 'OWNER' ? <Text style={kit.hint}>You are signed in with a {user?.role ?? 'guest'} account; sign in with an owner account to publish listings.</Text> : null}
    </View>

    <Notice title="Need a hand?" text="StudentHub support reaches you through the phone and email on your account. Update the business phone on the Profile tab so booking calls reach the right person." />
  </View>;
}

const styles = StyleSheet.create({
  value: { fontSize: 13, fontWeight: '700', color: colors.ink, flexShrink: 1, textAlign: 'right' },
});
