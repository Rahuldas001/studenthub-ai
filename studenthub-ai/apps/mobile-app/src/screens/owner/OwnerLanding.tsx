import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, colors, ui } from '../../components/ui';
import { useOwner } from '../../context/OwnerContext';
import { useStudent } from '../../context/StudentContext';
import { createOwnerProfile } from '../../services/owner';
import { Field, Notice, OwnerInput } from './OwnerKit';

const PERKS = [
  { icon: '🏠', title: 'PGs & Hostels', desc: 'Direct student booking requests' },
  { icon: '🍱', title: 'Food & Cafés', desc: 'Daily campus footfall & deals' },
  { icon: '🛍', title: 'Shops & Services', desc: 'Top search visibility' },
];

export default function OwnerLanding({
  onCreate,
  onSignIn,
  onBack,
  onDashboard,
  onSignOut,
}: {
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

  return (
    <ScrollView contentContainerStyle={styles.fill} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={['#1E1B4B', '#311075', '#581C87']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        {/* Top Header Row */}
        <View style={styles.topRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Leave owner tools" onPress={onBack} style={styles.back}>
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
          <View style={styles.brandBadge}>
            <View style={styles.logoIcon}>
              <Text style={styles.logoEmoji}>⚡</Text>
            </View>
            <Text style={styles.brandText}>StudentHub · Business</Text>
          </View>
        </View>

        {/* Hero Banner */}
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>★ Trusted by 1,000+ Campus Businesses</Text>
          </View>
        </View>

        <Text style={styles.title}>Grow Your Business With Local Students</Text>
        <Text style={styles.lede}>
          List your PG, hostel, café, restaurant or service where students search every day around their college. Manage bookings, deals, and reviews from one place.
        </Text>

        {/* Feature Cards Grid */}
        <View style={styles.perksGrid}>
          {PERKS.map((perk) => (
            <View key={perk.title} style={styles.perkCard}>
              <Text style={styles.perkIcon}>{perk.icon}</Text>
              <View style={styles.perkContent}>
                <Text style={styles.perkTitle}>{perk.title}</Text>
                <Text style={styles.perkDesc}>{perk.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Main Action Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Start Reaching Students Today</Text>
          <Text style={styles.cardBody}>
            {isOwnerAccount
              ? `Signed in as ${session?.user.displayName}. Your listings, bookings, offers, and reviews are ready in the owner dashboard.`
              : session
                ? `Signed in as ${session.user.displayName}. Owner tools require an OWNER account, so sign in with one or register your business.`
                : 'Create a business profile, or sign in with an existing OWNER account.'}
          </Text>

          {isOwnerAccount ? (
            <View style={styles.buttonStack}>
              <Button title="Open Owner Dashboard →" onPress={() => onDashboard?.()} />
              <Button title="Sign Out" secondary onPress={() => { signOutToWelcome(); onSignOut?.(); }} />
            </View>
          ) : (
            <View style={styles.buttonStack}>
              <Button title="Create Business Profile →" onPress={onCreate} />
              <Button title="Sign In to Existing Account" secondary onPress={onSignIn} />
            </View>
          )}
        </View>

        <Text style={styles.footnote}>
          Listings go live after StudentHub verification so students only see verified places.
        </Text>
      </LinearGradient>
    </ScrollView>
  );
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

  return (
    <View style={[ui.panel, { gap: 14 }]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flexGrow: 1 },
  hero: { flex: 1, padding: 20, paddingTop: 28, gap: 18, justifyContent: 'center', minHeight: 600 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  back: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 20, color: '#fff', lineHeight: 24 },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  logoIcon: { width: 22, height: 22, borderRadius: 6, backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center' },
  logoEmoji: { fontSize: 13 },
  brandText: { color: '#ffffff', fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
  badgeRow: { flexDirection: 'row' },
  badge: { backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  badgeText: { color: '#F3E8FF', fontSize: 11, fontWeight: '800' },
  title: { color: '#ffffff', fontSize: 32, fontWeight: '900', letterSpacing: -0.9, lineHeight: 40 },
  lede: { color: 'rgba(255,255,255,0.88)', fontSize: 14, lineHeight: 22 },
  perksGrid: { gap: 10 },
  perkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  perkIcon: { fontSize: 22 },
  perkContent: { flex: 1, gap: 2 },
  perkTitle: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  perkDesc: { color: 'rgba(255, 255, 255, 0.75)', fontSize: 11, fontWeight: '500' },
  card: { backgroundColor: '#ffffff', borderRadius: 24, padding: 20, gap: 14, marginTop: 4 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: colors.ink },
  cardBody: { fontSize: 13, color: colors.muted, lineHeight: 20 },
  buttonStack: { gap: 10 },
  footnote: { color: 'rgba(255,255,255,0.75)', fontSize: 11, textAlign: 'center', lineHeight: 17, marginTop: 4 },
});
