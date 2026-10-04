import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useSession } from '../SessionContext';
import { Button, colors, ui } from '../ui';

/**
 * Owner sign-in plus one-call business registration.
 *
 * Same fields and validation as the mobile app's owner panel: password 8+
 * chars, email or phone required, business name required, business phone
 * optional. A signed-in student/owner can also switch accounts from here.
 */
export default function SignIn() {
  const { authBusy, signIn, signUpOwner, session, signOut } = useSession();
  const [form, setForm] = useState<'signin' | 'signup'>('signin');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    setError('');
    if (authBusy) return;
    if (form === 'signin') {
      if (identifier.trim().length < 3 || !password) { setError('Enter your email or phone and password.'); return; }
      signIn(identifier.trim(), password)
        .then(() => setPassword(''))
        .catch((failure: unknown) => setError(failure instanceof Error ? failure.message : 'Sign-in failed.'));
      return;
    }
    if (displayName.trim().length < 2) { setError('Enter at least 2 characters for your name.'); return; }
    if (password.length < 8) { setError('Password needs at least 8 characters.'); return; }
    if (!email.trim() && !phone.trim()) { setError('Add an email address or a phone number.'); return; }
    if (businessName.trim().length < 2) { setError('Add your business name to register as an owner.'); return; }
    const contact = businessPhone.trim();
    if (contact && (contact.length < 10 || !/^[+\d][\d\s-]*$/.test(contact))) { setError('Business phone needs 10–16 digits and may start with +.'); return; }
    signUpOwner({
      displayName: displayName.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      password,
      businessName: businessName.trim(),
      businessPhone: contact || undefined,
    })
      .then(() => setPassword(''))
      .catch((failure: unknown) => setError(failure instanceof Error ? failure.message : 'Registration failed.'));
  };

  return <View style={[ui.panel, { maxWidth: 520, width: '100%', alignSelf: 'center' }]}>
    <Text style={ui.heading}>{form === 'signin' ? 'Owner sign in' : 'Register your business'}</Text>
    <Text style={ui.caption}>
      {session
        ? `Signed in as ${session.user.displayName} — owner tools need an OWNER account.`
        : 'Sign in with your OWNER account, or register your business in one step.'}
    </Text>
    {form === 'signup' && <>
      <Text style={ui.cardTitle}>Your name</Text>
      <TextInput accessibilityLabel="Owner name" maxLength={80} value={displayName} onChangeText={setDisplayName} placeholder="Your name" placeholderTextColor={colors.muted} style={ui.input} />
      <Text style={ui.cardTitle}>Email (optional with phone)</Text>
      <TextInput accessibilityLabel="Owner email" autoCapitalize="none" keyboardType="email-address" maxLength={200} value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor={colors.muted} style={ui.input} />
      <Text style={ui.cardTitle}>Phone (optional with email)</Text>
      <TextInput accessibilityLabel="Owner phone" keyboardType="phone-pad" maxLength={16} value={phone} onChangeText={setPhone} placeholder="Phone number" placeholderTextColor={colors.muted} style={ui.input} />
      <Text style={ui.cardTitle}>Business name</Text>
      <TextInput accessibilityLabel="Business name" maxLength={120} value={businessName} onChangeText={setBusinessName} placeholder="e.g. Green Valley PG" placeholderTextColor={colors.muted} style={ui.input} />
      <Text style={ui.cardTitle}>Business phone (optional)</Text>
      <TextInput accessibilityLabel="Business phone" keyboardType="phone-pad" maxLength={16} value={businessPhone} onChangeText={setBusinessPhone} placeholder="Contact number" placeholderTextColor={colors.muted} style={ui.input} />
    </>}
    {form === 'signin' && <>
      <Text style={ui.cardTitle}>Email or phone</Text>
      <TextInput accessibilityLabel="Email or phone" autoCapitalize="none" maxLength={200} value={identifier} onChangeText={setIdentifier} placeholder="you@example.com or phone" placeholderTextColor={colors.muted} style={ui.input} />
    </>}
    <Text style={ui.cardTitle}>Password</Text>
    <TextInput accessibilityLabel="Password" secureTextEntry maxLength={200} value={password} onChangeText={setPassword} placeholder={form === 'signup' ? 'At least 8 characters' : 'Password'} placeholderTextColor={colors.muted} style={ui.input} onSubmitEditing={submit} />
    <Button title={authBusy ? 'Please wait…' : form === 'signin' ? 'Sign in' : 'Register business'} onPress={submit} disabled={authBusy} />
    <Button title={form === 'signin' ? 'New here? Register your business' : 'Already registered? Sign in'} secondary onPress={() => { setForm(form === 'signin' ? 'signup' : 'signin'); setError(''); }} />
    {session && <Button title="Sign out of this account" secondary onPress={signOut} />}
    {!!error && <Text accessibilityRole="alert" style={{ color: '#B42338' }}>{error}</Text>}
    <Text style={ui.caption}>Owner accounts need the API (EXPO_PUBLIC_API_BASE_URL in apps/owner-dashboard/.env).</Text>
  </View>;
}
