import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, colors, ui } from '../components/ui';
import { useStudent } from '../context/StudentContext';
import { nearestCollege } from '../services/places';
import { requestDeviceLocation } from '../services/location';
import { ApiRequestError } from '../services/api';
import { confirmResetPassword, requestForgotPassword } from '../services/auth';

type Mode = 'signup' | 'login' | 'forgot';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[+\d][\d\s-]*$/;
const isValidPhone = (value: string): boolean => value.length >= 10 && value.length <= 16 && PHONE_PATTERN.test(value);

const FIELD_LABELS: Record<string, string> = { displayName: 'Name', email: 'Email', phone: 'Phone', password: 'Password', identifier: 'Email or phone', businessName: 'Business name', businessPhone: 'Business phone' };

function describeAuthError(problem: unknown, fallback: string): string {
  if (problem instanceof ApiRequestError && problem.errors) {
    const lines = Object.entries(problem.errors).map(([field, messages]) => `${FIELD_LABELS[field] ?? field}: ${messages.join(', ')}`);
    if (lines.length) return lines.join('\n');
  }
  return problem instanceof Error ? problem.message : fallback;
}

export default function Auth({ onAuthenticated, onBack, intent = 'student', initialMode = 'signup' }: { onAuthenticated: () => void; onBack: () => void; intent?: 'student' | 'owner'; initialMode?: 'signup' | 'login' }) {
  const { signIn, signUp, signUpOwner, authBusy, session, signOut, location, colleges, chooseLocation } = useStudent();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [business, setBusiness] = useState(intent === 'owner');
  const [businessName, setBusinessName] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [locating, setLocating] = useState(false);
  const [locationNote, setLocationNote] = useState('');
  const [error, setError] = useState('');

  /* Password Reset / OTP states */
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [generatedCodeHint, setGeneratedCodeHint] = useState<string | null>(null);

  const askForLocation = async () => {
    if (locating) return;
    setLocating(true);
    setLocationNote('');
    const fix = await requestDeviceLocation();
    setLocating(false);
    if (!fix.granted) {
      setLocationNote('Location access was declined. You can turn it on later from Home.');
      return;
    }
    const nearest = nearestCollege(colleges, fix.latitude, fix.longitude);
    if (!nearest) {
      setLocationNote('We could not match you to a campus yet.');
      return;
    }
    chooseLocation({ city: nearest.city, latitude: nearest.latitude, longitude: nearest.longitude });
    setLocationNote(`Location set — showing places near ${nearest.city}.`);
  };

  const handleSendOtp = () => {
    setError('');
    setResetSuccess('');
    if (!identifier.trim()) { setError('Enter your registered email address or phone number.'); return; }
    requestForgotPassword(identifier.trim())
      .then((res) => {
        setGeneratedCodeHint(res.code);
        setResetStep(2);
        setResetSuccess(`Verification code sent! Code: ${res.code}`);
      })
      .catch((problem: unknown) => setError(describeAuthError(problem, 'Could not request password reset.')));
  };

  const handleResetPasswordSubmit = () => {
    setError('');
    if (!identifier.trim() || !resetCode.trim() || !newPassword) {
      setError('Enter your identifier, 6-digit code, and new password.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    confirmResetPassword(identifier.trim(), resetCode.trim(), newPassword)
      .then((res) => {
        setResetSuccess(res.message);
        setPassword(newPassword);
        setTimeout(() => setMode('login'), 1500);
      })
      .catch((problem: unknown) => setError(describeAuthError(problem, 'Password reset failed.')));
  };

  const submit = () => {
    setError('');
    if (authBusy) return;
    if (mode === 'forgot') {
      if (resetStep === 1) handleSendOtp();
      else handleResetPasswordSubmit();
      return;
    }
    if (mode === 'login') {
      if (identifier.trim().length < 3 || !password) { setError('Enter your email or phone and password.'); return; }
      signIn(identifier.trim(), password).then(onAuthenticated)
        .catch((problem: unknown) => setError(describeAuthError(problem, 'Sign-in failed. Try again.')));
      return;
    }
    if (name.trim().length < 2) { setError('Enter at least 2 characters for your name.'); return; }
    if (password.length < 8) { setError('Password needs at least 8 characters.'); return; }
    const emailValue = email.trim();
    const phoneValue = phone.trim();
    if (!emailValue && !phoneValue) { setError('Add an email address or a phone number.'); return; }
    if (emailValue && !EMAIL_PATTERN.test(emailValue)) { setError('Email: Enter a valid email address, like you@example.com.'); return; }
    if (phoneValue && !isValidPhone(phoneValue)) { setError('Phone: Enter a valid phone number — 10 to 16 digits, optionally starting with +.'); return; }
    if (business) {
      if (businessName.trim().length < 2) { setError('Enter your business name (at least 2 characters).'); return; }
      const contact = businessPhone.trim();
      if (contact && !isValidPhone(contact)) { setError('Business phone: Enter a valid phone number — 10 to 16 digits, optionally starting with +.'); return; }
      signUpOwner({ displayName: name.trim(), email: emailValue || undefined, phone: phoneValue || undefined, password, businessName: businessName.trim(), businessPhone: contact || undefined })
        .then(onAuthenticated)
        .catch((problem: unknown) => setError(describeAuthError(problem, 'Business registration failed. Try again.')));
      return;
    }
    signUp({ displayName: name.trim(), email: emailValue || undefined, phone: phoneValue || undefined, password })
      .then(onAuthenticated)
      .catch((problem: unknown) => setError(describeAuthError(problem, 'Sign-up failed. Try again.')));
  };

  if (session) {
    const contact = session.user.email ?? session.user.phone ?? 'your account';
    const first = session.user.displayName.trim().split(' ')[0] || 'student';
    const isOwnerAccount = session.user.role === 'OWNER';
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.brandRow}>
          <View style={styles.logo}><Text style={{ fontSize: 22 }}>⚡</Text></View>
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
      </ScrollView>
    );
  }

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={styles.back}><Text style={{ fontSize: 22, color: colors.ink }}>←</Text></Pressable>
      <View style={styles.brandRow}>
        <View style={styles.logo}><Text style={{ fontSize: 22 }}>⚡</Text></View>
        <Text style={styles.brand}>StudentHub <Text style={{ color: colors.purple }}>AI</Text></Text>
      </View>
      <Text style={ui.title}>
        {mode === 'signup' ? (business ? 'Register your business' : 'Create your account') : mode === 'login' ? 'Welcome back' : 'Reset password'}
      </Text>
      <Text style={ui.body}>
        {mode === 'signup'
          ? (business ? 'Create your owner account and list your hostel, PG, cafe or food place for students to discover.' : 'Save places, book visits and keep everything in sync.')
          : mode === 'login'
            ? 'Sign in to pick up where you left off.'
            : 'Enter your registered email or phone to receive a 6-digit verification code.'}
      </Text>

      {/* Segment Selector */}
      <View style={styles.segment}>
        {(['signup', 'login', 'forgot'] as Mode[]).map((item) => (
          <Pressable
            key={item}
            accessibilityRole="button"
            accessibilityState={{ selected: mode === item }}
            onPress={() => { setMode(item); setError(''); setResetSuccess(''); setResetStep(1); }}
            style={[styles.segmentItem, mode === item && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, mode === item && styles.segmentTextActive]}>
              {item === 'signup' ? 'Sign up' : item === 'login' ? 'Log in' : 'Reset'}
            </Text>
          </Pressable>
        ))}
      </View>

      {mode === 'signup' ? (
        <>
          <Text style={ui.cardTitle}>Your name</Text>
          <TextInput accessibilityLabel="Your name" maxLength={80} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={colors.muted} style={ui.input} />
          <Text style={ui.cardTitle}>Email (optional with phone)</Text>
          <TextInput accessibilityLabel="Email" autoCapitalize="none" keyboardType="email-address" maxLength={200} value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor={colors.muted} style={ui.input} />
          <Text style={ui.cardTitle}>Phone (optional with email)</Text>
          <TextInput accessibilityLabel="Phone" keyboardType="phone-pad" maxLength={16} value={phone} onChangeText={setPhone} placeholder="Phone number" placeholderTextColor={colors.muted} style={ui.input} />
          <View style={styles.locationCard}>
            <View style={styles.locationIcon}><Text style={{ fontSize: 18, color: colors.purple }}>◎</Text></View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.locationTitle}>Your location</Text>
              <Text style={ui.caption}>{business ? 'Allow location access so students near your business can find you.' : 'Allow location access so we can show hostels, PGs, food and services near you.'}</Text>
              <Text style={styles.locationValue}>{locationNote || `Showing places near ${location.city}.`}</Text>
            </View>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Allow location access" accessibilityState={{ disabled: locating }} onPress={askForLocation} disabled={locating} style={[styles.locationCta, locating && { opacity: 0.7 }]}>
            <Text style={styles.locationCtaText}>{locating ? 'Locating…' : 'Allow location access'}</Text>
          </Pressable>
          {business ? (
            <>
              <Text style={ui.cardTitle}>Business name</Text>
              <TextInput accessibilityLabel="Business name" maxLength={120} value={businessName} onChangeText={setBusinessName} placeholder="e.g. Green Valley PG" placeholderTextColor={colors.muted} style={ui.input} />
              <Text style={ui.cardTitle}>Business phone (optional)</Text>
              <TextInput accessibilityLabel="Business phone" keyboardType="phone-pad" maxLength={16} value={businessPhone} onChangeText={setBusinessPhone} placeholder="Contact number" placeholderTextColor={colors.muted} style={ui.input} />
            </>
          ) : null}
          <Text style={ui.cardTitle}>Password</Text>
          <TextInput accessibilityLabel="Password" secureTextEntry maxLength={200} value={password} onChangeText={setPassword} placeholder="At least 8 characters" placeholderTextColor={colors.muted} style={ui.input} onSubmitEditing={submit} />
        </>
      ) : mode === 'login' ? (
        <>
          <Text style={ui.cardTitle}>Email or phone</Text>
          <TextInput accessibilityLabel="Email or phone" autoCapitalize="none" keyboardType="email-address" maxLength={200} value={identifier} onChangeText={setIdentifier} placeholder="you@example.com or phone" placeholderTextColor={colors.muted} style={ui.input} />
          <Text style={ui.cardTitle}>Password</Text>
          <TextInput accessibilityLabel="Password" secureTextEntry maxLength={200} value={password} onChangeText={setPassword} placeholder="Your password" placeholderTextColor={colors.muted} style={ui.input} onSubmitEditing={submit} />
          <Pressable accessibilityRole="button" onPress={() => { setMode('forgot'); setError(''); }} style={{ alignSelf: 'flex-end', marginTop: 4 }}>
            <Text style={ui.link}>Forgot password?</Text>
          </Pressable>
        </>
      ) : (
        /* Forgot / Reset Password Mode */
        <>
          <Text style={ui.cardTitle}>Registered Email or Phone</Text>
          <TextInput
            accessibilityLabel="Registered Email or Phone"
            autoCapitalize="none"
            keyboardType="email-address"
            maxLength={200}
            value={identifier}
            onChangeText={setIdentifier}
            placeholder="you@example.com or phone"
            placeholderTextColor={colors.muted}
            style={ui.input}
            editable={resetStep === 1}
          />

          {resetStep === 2 && (
            <>
              {generatedCodeHint ? (
                <View style={styles.codeBanner}>
                  <Text style={styles.codeBannerText}>🔑 Demo Verification Code: <Text style={{ fontWeight: '800' }}>{generatedCodeHint}</Text></Text>
                </View>
              ) : null}
              <Text style={ui.cardTitle}>6-Digit Verification Code</Text>
              <TextInput
                accessibilityLabel="Verification Code"
                keyboardType="number-pad"
                maxLength={6}
                value={resetCode}
                onChangeText={setResetCode}
                placeholder="123456"
                placeholderTextColor={colors.muted}
                style={ui.input}
              />
              <Text style={ui.cardTitle}>New Password</Text>
              <TextInput
                accessibilityLabel="New Password"
                secureTextEntry
                maxLength={200}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="At least 8 characters"
                placeholderTextColor={colors.muted}
                style={ui.input}
                onSubmitEditing={submit}
              />
            </>
          )}
        </>
      )}

      {!!resetSuccess && <Text style={styles.success}>{resetSuccess}</Text>}
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}

      <Button
        title={
          authBusy
            ? 'Please wait…'
            : mode === 'signup'
              ? (business ? 'Register business' : 'Create account')
              : mode === 'login'
                ? 'Log in'
                : resetStep === 1
                  ? 'Send Verification Code'
                  : 'Reset Password'
        }
        onPress={submit}
        disabled={authBusy}
      />

      {mode === 'signup' && (
        <Pressable accessibilityRole="button" accessibilityLabel={business ? 'Sign up as a student instead' : 'Register your business instead'} onPress={() => { setBusiness(!business); setError(''); }} style={styles.toggle}>
          <Text style={ui.body}>{business ? 'Signing up as a student instead? ' : 'Own a business? '}<Text style={ui.link}>{business ? 'Create a student account' : 'Register your business'}</Text></Text>
        </Pressable>
      )}

      {mode === 'forgot' && resetStep === 2 && (
        <Pressable accessibilityRole="button" onPress={() => setResetStep(1)} style={styles.toggle}>
          <Text style={ui.link}>← Change email / resend code</Text>
        </Pressable>
      )}

      <Text style={styles.note}>{intent === 'student' ? 'Accounts need the API and internet, so your saved places stay in sync.' : 'Owner tools need an account: listings, offers, bookings and reviews live behind the API.'}</Text>
    </ScrollView>
  );
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
  locationCard: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: colors.pale, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: colors.line },
  locationIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  locationTitle: { fontSize: 15, fontWeight: '800', color: colors.ink },
  locationValue: { color: colors.purple, fontWeight: '700', fontSize: 12 },
  locationCta: { backgroundColor: colors.pale, borderRadius: 14, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.purple },
  locationCtaText: { color: colors.purple, fontWeight: '700', fontSize: 13 },
  toggle: { marginTop: 4, alignItems: 'center' },
  note: { color: colors.muted, fontSize: 11, textAlign: 'center', lineHeight: 16 },
  error: { color: colors.star, fontSize: 12, lineHeight: 18 },
  success: { color: colors.green, fontSize: 12, lineHeight: 18, fontWeight: '700', textAlign: 'center' },
  codeBanner: { backgroundColor: '#E0F2FE', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#38BDF8', marginVertical: 4 },
  codeBannerText: { color: '#0369A1', fontSize: 13, textAlign: 'center' },
});
