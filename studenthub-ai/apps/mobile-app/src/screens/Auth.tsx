import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, colors, ui } from '../components/ui';
import { useStudent } from '../context/StudentContext';

type Mode = 'signup' | 'login';

/**
 * Registration / login step reached from "Get Started" or the business welcome.
 *
 * Signing up creates a student account (email or phone + password); the owner
 * variant adds the business name/phone and creates an OWNER account with its
 * business profile in one call. Logging in restores either kind of account and
 * `initialMode` opens straight on sign-in when the business welcome asked for
 * it. Already-signed-in sessions are routed by role: OWNER accounts get the
 * owner dashboard, students get their places (or a sign-out path when they
 * meant to register a business). "Continue as guest" keeps the app usable
 * offline; it is only offered on the student path, because owner tools need an
 * account.
 */
export default function Auth({ onAuthenticated, onGuest, onBack, intent = 'student', initialMode = 'signup' }: { onAuthenticated: () => void; onGuest: () => void; onBack: () => void; intent?: 'student' | 'owner'; initialMode?: 'signup' | 'login' }) {
  const { signIn, signUp, signUpOwner, authBusy, session, signOut } = useStudent();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [business, setBusiness] = useState(intent === 'owner');
  const [businessName, setBusinessName] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const submit = () => {
    setError('');
    if (authBusy) return;
    if (mode === 'login') {
      if (identifier.trim().length < 3 || !password) { setError('Enter your email or phone and password.'); return; }
      signIn(identifier.trim(), password).then(onAuthenticated)
        .catch((problem: unknown) => setError(problem instanceof Error ? problem.message : 'Sign-in failed. Try again.'));
      return;
    }
    if (name.trim().length < 2) { setError('Enter at least 2 characters for your name.'); return; }
    if (password.length < 8) { setError('Password needs at least 8 characters.'); return; }
    if (!email.trim() && !phone.trim()) { setError('Add an email address or a phone number.'); return; }
    if (business) {
      if (businessName.trim().length < 2) { setError('Enter your business name (at least 2 characters).'); return; }
      const contact = businessPhone.trim();
      if (contact && (contact.length < 10 || !/^[+\d][\d\s-]*$/.test(contact))) { setError('Business phone needs 10–16 digits and may start with +.'); return; }
      signUpOwner({ displayName: name.trim(), email: email.trim() || undefined, phone: phone.trim() || undefined, password, businessName: businessName.trim(), businessPhone: contact || undefined })
        .then(onAuthenticated)
        .catch((problem: unknown) => setError(problem instanceof Error ? problem.message : 'Business registration failed. Try again.'));
      return;
    }
    signUp({ displayName: name.trim(), email: email.trim() || undefined, phone: phone.trim() || undefined, password })
      .then(onAuthenticated)
      .catch((problem: unknown) => setError(problem instanceof Error ? problem.message : 'Sign-up failed. Try again.'));
  };
  /** Already signed in: route by role and intent so owners never land in the student app. */
  if (session) {
    const contact = session.user.email ?? session.user.phone ?? 'your account';
    const first = session.user.displayName.trim().split(' ')[0] || 'student';
    const isOwnerAccount = session.user.role === 'OWNER';
    return <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.brandRow}>
        <View style={styles.logo}><Text style={{ fontSize: 22 }}>⌂</Text></View>
        <Text style={styles.brand}>StudentHub <Text style={{ color: colors.purple }}>AI</Text></Text>
      </View>
      <Text style={ui.title}>{isOwnerAccount ? 'Welcome back, owner 👋' : `Welcome back, ${first} 👋`}</Text>
      <Text style={ui.body}>
        {isOwnerAccount
          ? `Signed in as ${contact}. Your listings, offers and reviews are waiting in the owner dashboard.`
          : intent === 'owner'
            ? `Signed in as ${contact} — a student account. Sign out to register your business, or continue as yourself.`
            : `You're signed in as ${contact}. Your saved places, visit plans and history stay in sync on this device.`}
      </Text>
      {isOwnerAccount
        ? <Button title="Open owner dashboard" onPress={onAuthenticated} />
        : <Button title="Continue to Home" onPress={onAuthenticated} />}
      {intent === 'owner' && !isOwnerAccount
        ? <Button title="Sign out to register my business" secondary onPress={() => signOut()} />
        : <Button title="Use a different account" secondary onPress={signOut} />}
      <Text style={styles.note}>Switching accounts keeps saved places and visit plans on this device.</Text>
    </ScrollView>;
  }
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
    <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={styles.back}><Text style={{ fontSize: 22, color: colors.ink }}>←</Text></Pressable>
    <View style={styles.brandRow}>
      <View style={styles.logo}><Text style={{ fontSize: 22 }}>⌂</Text></View>
      <Text style={styles.brand}>StudentHub <Text style={{ color: colors.purple }}>AI</Text></Text>
    </View>
    <Text style={ui.title}>{mode === 'signup' ? (business ? 'Register your business' : 'Create your account') : 'Welcome back'}</Text>
    <Text style={ui.body}>{mode === 'signup' ? (business ? 'Create your owner account and list your hostel, PG, cafe or food place for students to discover.' : 'Save places, book visits and keep everything in sync.') : 'Sign in to pick up where you left off.'}</Text>
    <View style={styles.segment}>
      {(['signup', 'login'] as Mode[]).map((item) => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: mode === item }} onPress={() => { setMode(item); setError(''); }} style={[styles.segmentItem, mode === item && styles.segmentActive]}>
        <Text style={[styles.segmentText, mode === item && styles.segmentTextActive]}>{item === 'signup' ? 'Sign up' : 'Log in'}</Text>
      </Pressable>)}
    </View>
    {mode === 'signup' ? <>
      <Text style={ui.cardTitle}>Your name</Text>
      <TextInput accessibilityLabel="Your name" maxLength={80} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={colors.muted} style={ui.input} />
      <Text style={ui.cardTitle}>Email (optional with phone)</Text>
      <TextInput accessibilityLabel="Email" autoCapitalize="none" keyboardType="email-address" maxLength={200} value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor={colors.muted} style={ui.input} />
      <Text style={ui.cardTitle}>Phone (optional with email)</Text>
      <TextInput accessibilityLabel="Phone" keyboardType="phone-pad" maxLength={16} value={phone} onChangeText={setPhone} placeholder="Phone number" placeholderTextColor={colors.muted} style={ui.input} />
      {business ? <>
        <Text style={ui.cardTitle}>Business name</Text>
        <TextInput accessibilityLabel="Business name" maxLength={120} value={businessName} onChangeText={setBusinessName} placeholder="e.g. Green Valley PG" placeholderTextColor={colors.muted} style={ui.input} />
        <Text style={ui.cardTitle}>Business phone (optional)</Text>
        <TextInput accessibilityLabel="Business phone" keyboardType="phone-pad" maxLength={16} value={businessPhone} onChangeText={setBusinessPhone} placeholder="Contact number" placeholderTextColor={colors.muted} style={ui.input} />
      </> : null}
    </> : <>
      <Text style={ui.cardTitle}>Email or phone</Text>
      <TextInput accessibilityLabel="Email or phone" autoCapitalize="none" keyboardType="email-address" maxLength={200} value={identifier} onChangeText={setIdentifier} placeholder="you@example.com or phone" placeholderTextColor={colors.muted} style={ui.input} />
    </>}
    <Text style={ui.cardTitle}>Password</Text>
    <TextInput accessibilityLabel="Password" secureTextEntry maxLength={200} value={password} onChangeText={setPassword} placeholder="At least 8 characters" placeholderTextColor={colors.muted} style={ui.input} onSubmitEditing={submit} />
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <Button title={authBusy ? 'Please wait…' : mode === 'signup' ? (business ? 'Register business' : 'Create account') : 'Log in'} onPress={submit} disabled={authBusy} />
    {mode === 'signup' && <Pressable accessibilityRole="button" accessibilityLabel={business ? 'Sign up as a student instead' : 'Register your business instead'} onPress={() => { setBusiness(!business); setError(''); }} style={styles.guest}>
      <Text style={ui.body}>{business ? 'Signing up as a student instead? ' : 'Own a business? '}<Text style={ui.link}>{business ? 'Create a student account' : 'Register your business'}</Text></Text>
    </Pressable>}
    {intent === 'student' ? <>
      <Pressable accessibilityRole="button" onPress={onGuest} style={styles.guest}><Text style={ui.body}>Continue as <Text style={ui.link}>Guest</Text></Text></Pressable>
      <Text style={styles.note}>Accounts need the API and internet. Everything works offline as a guest.</Text>
    </> : <Text style={styles.note}>Owner tools need an account: listings, offers, bookings and reviews live behind the API.</Text>}
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { padding: 24, gap: 12, paddingBottom: 40, width: '100%', maxWidth: 520, alignSelf: 'center' },
  back: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  logo: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center' },
  brand: { fontSize: 18, fontWeight: '800', color: colors.ink },
  segment: { flexDirection: 'row', backgroundColor: colors.pale, borderRadius: 16, padding: 4, gap: 4, marginVertical: 6 },
  segmentItem: { flex: 1, minHeight: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { backgroundColor: '#fff' },
  segmentText: { fontSize: 13, fontWeight: '700', color: colors.muted },
  segmentTextActive: { color: colors.purple },
  error: { color: '#B42338', fontSize: 13 },
  guest: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  note: { color: colors.muted, fontSize: 11, textAlign: 'center', lineHeight: 17 },
});
