import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { PlaceSummary } from '@studenthub/types';
import { Button, Empty, ResultCard, colors, ui } from '../components/ui';
import { useStudent } from '../context/StudentContext';

export function Saved({ onPlace, onExplore }: { onPlace: (place: PlaceSummary) => void; onExplore: () => void }) {
  const { saved } = useStudent();
  return <ScrollView contentContainerStyle={ui.content}>
    <Text style={ui.title}>Your little shortlist ♡</Text>
    <Text style={ui.body}>{saved.length} saved place{saved.length === 1 ? '' : 's'} · kept on this device</Text>
    {saved.length ? <View style={{ gap: 12 }}>{saved.map((place) => <ResultCard key={place.id} place={place} onPress={() => onPlace(place)} />)}</View>
      : <Empty icon="♡" title="Good finds belong here" body="Tap the heart on any place to keep it close. Your next home or favourite café could be one tap away."><Button title="Explore places" onPress={onExplore} /></Empty>}
  </ScrollView>;
}

export function Bookings({ onPlace, onExplore }: { onPlace: (place: PlaceSummary) => void; onExplore: () => void }) {
  const { visits, cancelVisit } = useStudent();
  return <ScrollView contentContainerStyle={ui.content}>
    <Text style={ui.title}>Your visit plans</Text>
    <Text style={ui.body}>A small step toward your next place.</Text>
    <View style={[ui.panel, { backgroundColor: colors.pale }]}><Text style={ui.caption}>These are personal plans saved on this device, not confirmed bookings. No request is sent to an owner.</Text></View>
    {visits.length ? <View style={{ gap: 12 }}>{visits.map((visit) => <View key={visit.id} style={ui.panel}>
      <Text style={ui.facility}>PERSONAL VISIT PLAN</Text>
      <Text style={ui.heading}>{visit.place.name}</Text>
      <Text style={ui.body}>▦ {visit.date} · {visit.name}</Text>
      {!!visit.note && <Text style={ui.body}>{visit.note}</Text>}
      <View style={[ui.row, { gap: 10 }]}><Button title="View place" onPress={() => onPlace(visit.place)} /><Button title="Remove" secondary onPress={() => cancelVisit(visit.id)} /></View>
    </View>)}</View>
      : <Empty icon="▦" title="Your next chapter starts here" body="Found a place you like? Open its details and plan a visit. Your plans will appear here."><Button title="Find a place" onPress={onExplore} /></Empty>}
  </ScrollView>;
}

export function History({ onPlace, onExplore }: { onPlace: (place: PlaceSummary) => void; onExplore: () => void }) {
  const { history, clearHistory } = useStudent();
  const format = (viewedAt: string) => {
    const parsed = new Date(viewedAt);
    return Number.isFinite(parsed.getTime()) ? parsed.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '';
  };
  return <ScrollView contentContainerStyle={ui.content}>
    <Text style={ui.title}>Recently viewed</Text>
    <Text style={ui.body}>{history.length} place{history.length === 1 ? '' : 's'} you opened · kept on this device</Text>
    {history.length ? <>
      <View style={{ gap: 12 }}>{history.map((entry) => <View key={`${entry.place.id}-${entry.viewedAt}`} style={ui.panel}>
        <View style={ui.between}>
          <Text numberOfLines={1} style={[ui.cardTitle, { flexShrink: 1 }]}>{entry.place.name}</Text>
          <Text style={ui.facility}>{format(entry.viewedAt)}</Text>
        </View>
        <Text numberOfLines={1} style={ui.caption}>{entry.place.category} · {entry.place.address}</Text>
        <View style={[ui.row, { gap: 10 }]}><Button title="View place" onPress={() => onPlace(entry.place)} /></View>
      </View>)}</View>
      <Button title="Clear history" secondary onPress={clearHistory} />
    </> : <Empty icon="⏱" title="Nothing here yet" body="Places you open will show up here, so you can find them again later."><Button title="Find a place" onPress={onExplore} /></Empty>}
  </ScrollView>;
}

export function Profile({ onOpenSaved, onOpenBookings, onOpenHistory }: { onOpenSaved: () => void; onOpenBookings: () => void; onOpenHistory: () => void }) {
  const { name, saved, visits, session, authBusy, signIn, signUp, signOutToWelcome, deleteAccountAndSignOut, campus, location } = useStudent();
  const [message, setMessage] = useState('');
  const [soon, setSoon] = useState<string | null>(null);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [accountName, setAccountName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [accountError, setAccountError] = useState('');
  const submitAccount = () => {
    setAccountError('');
    if (authBusy) return;
    if (mode === 'signin') {
      if (identifier.trim().length < 3 || !password) { setAccountError('Enter your email or phone and password.'); return; }
      signIn(identifier.trim(), password)
        .then(() => { setPassword(''); setMessage('Signed in. Saved places now sync to the server.'); })
        .catch((error: unknown) => setAccountError(error instanceof Error ? error.message : 'Sign-in failed. Try again.'));
      return;
    }
    if (accountName.trim().length < 2) { setAccountError('Enter at least 2 characters for your name.'); return; }
    if (password.length < 8) { setAccountError('Password needs at least 8 characters.'); return; }
    if (!email.trim() && !phone.trim()) { setAccountError('Add an email address or a phone number.'); return; }
    signUp({ displayName: accountName.trim(), email: email.trim() || undefined, phone: phone.trim() || undefined, password })
      .then(() => { setPassword(''); setMessage('Account created. Saved places now sync to the server.'); })
      .catch((error: unknown) => setAccountError(error instanceof Error ? error.message : 'Sign-up failed. Try again.'));
  };
  const shortcuts: { icon: string; detail: string; label: string; tint: string; bg: string; onPress: () => void }[] = [
    { icon: '♥', detail: 'Saved Places', label: `${saved.length} places`, tint: '#fff', bg: '#E0426E', onPress: onOpenSaved },
    { icon: '▦', detail: 'Visit Plans', label: `${visits.length} planned`, tint: '#fff', bg: '#4287E0', onPress: onOpenBookings },
    { icon: '★', detail: 'Reviews', label: 'On place pages', tint: '#fff', bg: '#F0A429', onPress: onOpenSaved },
    { icon: '⏱', detail: 'History', label: 'Recently viewed', tint: '#fff', bg: '#15815E', onPress: onOpenHistory },
  ];

  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }}>
    <LinearGradient colors={[colors.purpleDeep, '#5B33C9', colors.purple]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
      <View style={ui.row}>
        <View style={styles.bigAvatar}><Text style={{ color: '#fff', fontSize: 26, fontWeight: '800' }}>{name ? name[0].toUpperCase() : '☺'}</Text></View>
        <View>
          <Text style={[ui.heading, { color: '#fff' }]}>Hi, {name || 'student'} 👋</Text>
          <Text style={{ color: '#CFC7F2', fontSize: 12 }}>Your campus · {location.city}</Text>
        </View>
      </View>
      <View style={styles.statRow}>
        <View style={styles.stat}><Text style={styles.statValue}>{saved.length}</Text><Text style={styles.statLabel}>saved</Text></View>
        <View style={styles.statDivider} />
        <View style={styles.stat}><Text style={styles.statValue}>{visits.length}</Text><Text style={styles.statLabel}>visit plans</Text></View>
      </View>
    </LinearGradient>
    <View style={styles.body}>
      <LinearGradient colors={['#3B2A7A', colors.purpleDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.premium}>
        <View style={ui.between}>
          <View style={ui.row}>
            <Text style={{ fontSize: 20 }}>✦</Text>
            <View>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Upgrade to Premium</Text>
              <Text style={{ color: '#CFC7F2', fontSize: 11 }}>Priority support & early access</Text>
            </View>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Upgrade to premium" onPress={() => setSoon('Premium')} style={styles.premiumButton}><Text style={{ color: colors.ink, fontSize: 11, fontWeight: '800' }}>Go Premium</Text></Pressable>
        </View>
      </LinearGradient>
      <View style={[ui.panel, { marginTop: 16 }]}>
        <Text style={ui.heading}>Shortcuts</Text>
        <View style={[ui.row, { flexWrap: 'wrap', gap: 10 }]}>{shortcuts.map((item) => <Pressable key={item.detail} accessibilityRole="button" accessibilityLabel={item.detail} onPress={item.onPress} style={[styles.shortcut, { backgroundColor: item.bg }]}>
          <Text style={{ color: item.tint, fontSize: 20 }}>{item.icon}</Text>
          <View><Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>{item.detail}</Text><Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10 }}>{item.label}</Text></View>
        </Pressable>)}</View>
        {!!soon && <Text accessibilityLiveRegion="polite" style={ui.caption}>{soon} is coming in a future update.</Text>}
      </View>
      <LinearGradient colors={[colors.pink, '#8B5CF6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.offer}>
        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: '800', letterSpacing: 2 }}>EXCLUSIVE FOR YOU</Text>
        <Text style={{ color: '#fff', fontSize: 19, fontWeight: '800', marginTop: 6 }}>First visit? Get a free campus guide 🎒</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Claim offer" onPress={() => setSoon('Offers')} style={styles.offerButton}><Text style={{ color: colors.pink, fontSize: 12, fontWeight: '800' }}>Claim offer</Text></Pressable>
      </LinearGradient>
      <View style={ui.panel}>
        <Text style={ui.heading}>Your campus</Text>
        <Text style={ui.cardTitle}>📍 {campus || location.city}</Text>
        <Text style={ui.body}>{location.city}, Assam, India</Text>
        <Text style={ui.caption}>Change your location any time from the location row on Home.</Text>
      </View>
      <View style={ui.panel}>
        {session ? <>
          <Text style={ui.heading}>Signed in</Text>
          <Text style={ui.cardTitle}>{session.user.displayName}</Text>
          <Text style={ui.caption}>{session.user.email ?? session.user.phone ?? ''}</Text>
          <Text style={ui.body}>Saved places and visit requests sync to the server on this device.</Text>
        </> : <>
          <Text style={ui.heading}>{mode === 'signin' ? 'Welcome back' : 'Create your account'}</Text>
          {mode === 'signup' ? <>
            <Text style={ui.cardTitle}>Your name</Text>
            <TextInput accessibilityLabel="Account name" maxLength={80} value={accountName} onChangeText={setAccountName} placeholder="Your name" placeholderTextColor={colors.muted} style={ui.input} />
            <Text style={ui.cardTitle}>Email (optional with phone)</Text>
            <TextInput accessibilityLabel="Account email" autoCapitalize="none" keyboardType="email-address" maxLength={200} value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor={colors.muted} style={ui.input} />
            <Text style={ui.cardTitle}>Phone (optional with email)</Text>
            <TextInput accessibilityLabel="Account phone" keyboardType="phone-pad" maxLength={16} value={phone} onChangeText={setPhone} placeholder="Phone number" placeholderTextColor={colors.muted} style={ui.input} />
          </> : <>
            <Text style={ui.cardTitle}>Email or phone</Text>
            <TextInput accessibilityLabel="Email or phone" autoCapitalize="none" keyboardType="email-address" maxLength={200} value={identifier} onChangeText={setIdentifier} placeholder="you@example.com or phone" placeholderTextColor={colors.muted} style={ui.input} />
          </>}
          <Text style={ui.cardTitle}>Password</Text>
          <TextInput accessibilityLabel="Password" secureTextEntry maxLength={200} value={password} onChangeText={setPassword} placeholder="At least 8 characters" placeholderTextColor={colors.muted} style={ui.input} />
          <Button title={authBusy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'} onPress={submitAccount} />
          <Button title={mode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in'} secondary onPress={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setAccountError(''); }} />
          {!!accountError && <Text accessibilityRole="alert" style={{ color: '#B42338' }}>{accountError}</Text>}
        </>}
      </View>
      {!!message && <Text accessibilityLiveRegion="polite" style={ui.caption}>{message}</Text>}
      {!!session && <Button title="Log out" secondary onPress={() => { signOutToWelcome(); }} />}
      {!!session && <Button title="Delete account" secondary onPress={() => {
        if (authBusy) return;
        Alert.alert(
          'Delete your account?',
          'This permanently removes your account, saved places, visit plans, history and reviews from the server and from this device. It cannot be undone.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () => {
                setMessage('');
                deleteAccountAndSignOut()
                  .then(() => setMessage('Your account and its data have been deleted.'))
                  .catch((problem: unknown) => {
                    setMessage(problem instanceof Error ? problem.message : 'Could not delete your account.');
                  });
              },
            },
          ],
        );
      }} />}
      <Text style={[ui.caption, { textAlign: 'center' }]}>StudentHub AI · V1{'\n'}Everything a Student Needs</Text>
    </View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  header: { padding: 22, paddingTop: 30, gap: 18, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  bigAvatar: { width: 62, height: 62, borderRadius: 31, backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center' },
  statRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 18, paddingVertical: 14 },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.25)' },
  statValue: { color: '#fff', fontSize: 20, fontWeight: '800' },
  statLabel: { color: '#CFC7F2', fontSize: 11 },
  premium: { borderRadius: 22, padding: 18, marginTop: 18, marginHorizontal: 20 },
  premiumButton: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  body: { paddingHorizontal: 20, gap: 16, paddingTop: 4 },
  shortcut: { flexGrow: 1, flexBasis: '46%', flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 18, padding: 14 },
  offer: { borderRadius: 22, padding: 20, gap: 12 },
  offerButton: { backgroundColor: '#fff', alignSelf: 'flex-start', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 9 },
});