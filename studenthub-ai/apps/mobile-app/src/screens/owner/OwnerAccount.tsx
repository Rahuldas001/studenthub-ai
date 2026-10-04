import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, colors, ui } from '../../components/ui';
import { useOwner } from '../../context/OwnerContext';
import { useOwnerExtras } from '../../context/OwnerExtrasContext';
import { useStudent } from '../../context/StudentContext';
import { Notice, OwnerTopBar, kit, type OwnerNav } from './OwnerKit';

/**
 * Screen 10 - account & security.
 *
 * Everything the session knows about the owner account, plus the two ways out:
 * leave owner tools (stay signed in as a student) or sign out completely. The
 * data summary below is read from the API cache, so it matches any device.
 */

export default function OwnerAccount({ onBack, onExit }: { onBack: () => void; onExit: () => void }) {
  const { profile, places, requestCounts } = useOwner();
  const { offers, reviews, refreshOffers, refreshReviews } = useOwnerExtras();
  const { session, signOut } = useStudent();

  const user = session?.user;
  const liveOffers = offers.filter((offer) => offer.active).length;
  const answeredReviews = reviews.filter((review) => review.reply).length;
  const confirmSignOut = () => Alert.alert(
    'Sign out of StudentHub?',
    'Listings, offers, bookings and review replies live on your account, so the next device shows exactly this.',
    [{ text: 'Stay signed in', style: 'cancel' }, {
      text: 'Sign out',
      style: 'destructive',
      onPress: () => { signOut(); onExit(); },
    }],
  );

  const row = (label: string, value: string) => <View key={label} style={ui.between}>
    <Text style={ui.caption}>{label}</Text>
    <Text style={styles.value} numberOfLines={1}>{value}</Text>
  </View>;

  return <ScrollView contentContainerStyle={kit.body}>
    <OwnerTopBar title="Account & security" subtitle="Session, verification and your data" right={<Button title="Back" secondary onPress={onBack} />} />

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
      <Button title="Leave owner tools" onPress={onExit} />
      <Button title="Sign out" secondary onPress={confirmSignOut} />
      {user?.role !== 'OWNER' ? <Text style={kit.hint}>You are signed in as a {user?.role ?? 'guest'} account; sign in with an owner account to publish listings.</Text> : null}
    </View>

    <Notice title="Need a hand?" text="StudentHub support reaches you through the phone and email on your account. Update the business phone on your Profile tab so booking calls reach the right person." />
  </ScrollView>;
}

const styles = StyleSheet.create({
  value: { fontSize: 13, fontWeight: '700', color: colors.ink, flexShrink: 1, textAlign: 'right' },
});
