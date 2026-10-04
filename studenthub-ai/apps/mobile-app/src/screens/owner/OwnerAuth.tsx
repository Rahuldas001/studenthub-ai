import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Button, colors, ui } from '../../components/ui';
import { useStudent } from '../../context/StudentContext';
import { Field, Notice, OwnerInput, OwnerTopBar, OptionRow, kit } from './OwnerKit';

/**
 * Screen 1 (auth surface) - owner sign in and business registration.
 *
 * The owner gate opens this instead of the shared `Auth` screen so the owner
 * copy ("business name", "students only see verified listings") stays in one
 * place; the session lifecycle is still `StudentContext`.
 */

type Mode = 'signin' | 'signup';

export default function OwnerAuth({ onBack }: { onBack: () => void }) {
  const { authBusy, signIn, signUpOwner, session } = useStudent();
  const [mode, setMode] = useState<Mode>('signin');
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
    if (mode === 'signin') {
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
    signUpOwner({
      displayName: displayName.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      password,
      businessName: businessName.trim(),
      businessPhone: businessPhone.trim() || undefined,
    })
      .then(() => setPassword(''))
      .catch((failure: unknown) => setError(failure instanceof Error ? failure.message : 'Registration failed.'));
  };

  return <ScrollView contentContainerStyle={kit.body} keyboardShouldPersistTaps="handled">
    <OwnerTopBar
      title={mode === 'signin' ? 'Owner sign in' : 'Register your business'}
      subtitle={session ? `Signed in as ${session.user.displayName} — owner tools need an OWNER account.` : 'Owner tools need an OWNER account.'}
      right={<Button title="Back" secondary onPress={onBack} />}
    />

    <OptionRow<Mode>
      options={[{ id: 'signin', label: 'Sign in' }, { id: 'signup', label: 'New business' }]}
      value={mode}
      onChange={(next) => { setMode(next); setError(''); }}
    />

    <View style={[ui.panel, { gap: 14 }]}>
      {mode === 'signin' ? <>
        <Field label="Email or phone">
          <OwnerInput label="Email or phone" value={identifier} onChange={setIdentifier} placeholder="you@example.com" keyboardType="email-address" />
        </Field>
      </> : <>
        <Field label="Your name">
          <OwnerInput label="Owner name" value={displayName} onChange={setDisplayName} placeholder="Your name" />
        </Field>
        <Field label="Email" hint="Optional when you add a phone number.">
          <OwnerInput label="Owner email" value={email} onChange={setEmail} placeholder="you@example.com" keyboardType="email-address" />
        </Field>
        <Field label="Phone" hint="Optional when you add an email.">
          <OwnerInput label="Owner phone" value={phone} onChange={setPhone} placeholder="+91 98765 43210" keyboardType="phone-pad" />
        </Field>
        <Field label="Business name">
          <OwnerInput label="Business name" value={businessName} onChange={setBusinessName} placeholder="e.g. Green Valley PG" />
        </Field>
        <Field label="Business phone" hint="Optional — shown on your listings when they go live.">
          <OwnerInput label="Business phone" value={businessPhone} onChange={setBusinessPhone} placeholder="Contact number" keyboardType="phone-pad" />
        </Field>
      </>}

      <Field label="Password" error={error || undefined}>
        <OwnerInput label="Password" value={password} onChange={setPassword} placeholder="Password" password />
      </Field>

      <Button title={authBusy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Register business'} onPress={submit} disabled={authBusy} />
      {mode === 'signup' ? <Text style={ui.caption}>New listings enter review before students can see them.</Text> : null}
    </View>

    <Notice title="Owner accounts need the API" text="Sign-in and registration call the StudentHub API, so set EXPO_PUBLIC_API_BASE_URL to use owner tools. Without it the app still runs in demo mode for students." />
  </ScrollView>;
}
