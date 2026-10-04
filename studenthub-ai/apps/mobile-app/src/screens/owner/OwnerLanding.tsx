import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, colors, ui } from '../../components/ui';
import { useOwner } from '../../context/OwnerContext';
import { useStudent } from '../../context/StudentContext';
import { createOwnerProfile } from '../../services/owner';
import { Field, Notice, OwnerInput } from './OwnerKit';

/**
 * Screen 1 - the business welcome / owner gate.
 *
 * Shown as its own stage right after the student Welcome's "List your
 * business", and again inside owner tools for non-owner sessions. It either
 * registers a new business, signs an existing OWNER account in (through the
 * shared `Auth` screen), or — when the session is already an OWNER — opens the
 * dashboard directly. `OwnerProfileSetup` below covers the rarer case: an
 * OWNER token issued without a business profile yet.
 */

const PERKS = [
  { icon: '▦', text: 'List your business' },
  { icon: '☺', text: 'Get more students' },
  { icon: '▲', text: 'Grow faster' },
];

export default function OwnerLanding({ onCreate, onSignIn, onBack, onDashboard, onSignOut }: {
  onCreate: () => void;
  onSignIn: () => void;
  onBack: () => void;
  /** Present at the app root when the session is already an OWNER. */
  onDashboard?: () => void;
  /** Signing out drops back to the student Welcome screen. */
  onSignOut?: () => void;
}) {
  const { session, signOutToWelcome } = useStudent();
  const isOwnerAccount = session?.user.role === 'OWNER';
  return <ScrollView contentContainerStyle={styles.fill}>
    <LinearGradient colors={['#241A5E', '#4C1D95', '#7C3AED']} style={styles.hero}>
      <View style={styles.topRow}>
        <Pressable accessibilityRole="button" accessibilityLabel="Leave owner tools" onPress={onBack} style={styles.back}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.brand}>StudentHub · Business</Text>
      </View>

      <View style={styles.badge}><Text style={styles.badgeText}>★ Trusted by 1,000+ local businesses</Text></View>
      <Text style={styles.title}>Grow Your Business With Students</Text>
      <Text style={styles.lede}>
        List your PG, café, gym or shop where students actually search. Manage bookings,
        offers and reviews from one place.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Start selling to your campus</Text>
        <Text style={styles.cardBody}>
          {isOwnerAccount
            ? `Signed in as ${session?.user.displayName}. Your listings, bookings, offers and reviews are ready in the owner dashboard.`
            : session
              ? `Signed in as ${session.user.displayName}. Owner tools need an OWNER account, so sign in with one or register your business.`
              : 'Create a business profile, or sign in with an existing OWNER account.'}
        </Text>
        {isOwnerAccount
          ? <>
              <Button title="Open owner dashboard" onPress={() => onDashboard?.()} />
              <Button title="Sign out" secondary onPress={() => { signOutToWelcome(); onSignOut?.(); }} />
            </>
          : <>
              <Button title="Create Business Profile" onPress={onCreate} />
              <Button title="Sign In" secondary onPress={onSignIn} />
            </>}
        <View style={styles.perks}>
          {PERKS.map((perk) => <View key={perk.text} style={styles.perk}>
            <Text style={styles.perkIcon}>{perk.icon}</Text>
            <Text style={styles.perkText}>{perk.text}</Text>
          </View>)}
        </View>
      </View>

      <Text style={styles.footnote}>Listings go live after StudentHub review, so students only see verified places.</Text>
    </LinearGradient>
  </ScrollView>;
}

/** Business-profile form for OWNER accounts that have none yet. */
export function OwnerProfileSetup() {
  const { token, setProfile, refresh } = useOwner();
  const { setSessionOwner } = useStudent();
  const [businessName, setBusinessName] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = () => {
    if (!token || busy) return;
    if (businessName.trim().length < 2) { setError('Add your business name (at least 2 characters).'); return; }
    setBusy(true);
    setError('');
    createOwnerProfile(token, { businessName: businessName.trim(), businessPhone: businessPhone.trim() || undefined })
      .then((owner) => {
        setProfile(owner);
        setSessionOwner(owner);
        refresh();
      })
      .catch((failure: unknown) => setError(failure instanceof Error ? failure.message : 'Could not save the business profile.'))
      .finally(() => setBusy(false));
  };

  return <View style={[ui.panel, { gap: 14 }]}>
    <Text style={ui.heading}>Complete your business profile</Text>
    <Text style={ui.body}>Your OWNER account works, but StudentHub needs the business name before you can publish listings.</Text>
    <Field label="Business name" error={error || undefined}>
      <OwnerInput label="Business name" value={businessName} onChange={setBusinessName} placeholder="Campus Kitchen" />
    </Field>
    <Field label="Business phone" hint="Optional — shown on your listing page.">
      <OwnerInput label="Business phone" value={businessPhone} onChange={setBusinessPhone} placeholder="+91 98765 43210" keyboardType="phone-pad" />
    </Field>
    <Button title={busy ? 'Saving…' : 'Save business profile'} onPress={submit} disabled={busy} />
    <Notice title="Where is this stored?" text="Business profiles, listings, bookings, offers and review replies all live in the StudentHub API, so the same data appears on every device you sign in on." />
  </View>;
}

const styles = StyleSheet.create({
  fill: { flexGrow: 1 },
  hero: { flex: 1, padding: 20, gap: 16, justifyContent: 'center', minHeight: 560 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 20, color: '#fff', lineHeight: 24 },
  brand: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '800', letterSpacing: 0.4 },
  badge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  title: { color: '#fff', fontSize: 30, fontWeight: '800', letterSpacing: -0.9, lineHeight: 38 },
  lede: { color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 22 },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 18, gap: 12 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: colors.ink },
  cardBody: { fontSize: 13, color: colors.muted, lineHeight: 20 },
  perks: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 },
  perk: { alignItems: 'center', gap: 6, flex: 1, minWidth: 92 },
  perkIcon: { fontSize: 15, color: colors.purple, backgroundColor: colors.pale, borderRadius: 17, width: 34, height: 34, textAlign: 'center', lineHeight: 34 },
  perkText: { fontSize: 11, color: colors.muted, fontWeight: '700', textAlign: 'center' },
  footnote: { color: 'rgba(255,255,255,0.75)', fontSize: 11, textAlign: 'center', lineHeight: 17 },
});

