import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useSession } from '../SessionContext';
import { Button, colors, ui } from '../ui';

/**
 * Admin sign-in gate.
 *
 * Same copy and validation as the in-app console (`Admin.tsx`'s AdminGate):
 * signed-in non-admin accounts are told plainly which account is required
 * rather than being shown a form that would silently fail with a 403. The
 * dev login hint mirrors the mobile panel so operators can get started.
 */
export default function SignIn() {
  const { authBusy, signIn, session, signOut } = useSession();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const signedIn = Boolean(session);
  const needsAdmin = signedIn && session?.user.role !== 'ADMIN';

  const submit = () => {
    setError('');
    if (authBusy) return;
    if (identifier.trim().length < 3 || !password) { setError('Enter your email or phone and password.'); return; }
    signIn(identifier.trim(), password)
      .then(() => setPassword(''))
      .catch((failure: unknown) => setError(failure instanceof Error ? failure.message : 'Sign-in failed.'));
  };

  return <View style={[ui.panel, { maxWidth: 520, width: '100%', alignSelf: 'center' }]}>
    <Text style={ui.heading}>{needsAdmin ? 'Admin account required' : 'Sign in as an admin'}</Text>
    <Text style={ui.body}>
      {needsAdmin
        ? `You are signed in as ${session?.user.displayName}, but this account is not an admin. Sign in with an admin account to moderate listings.`
        : 'The moderation console reviews owner listings, verifies businesses, and manages colleges.'}
    </Text>
    <Text style={ui.cardTitle}>Email or phone</Text>
    <TextInput accessibilityLabel="Email or phone" autoCapitalize="none" maxLength={200} value={identifier} onChangeText={setIdentifier} placeholder="admin email or phone" placeholderTextColor={colors.muted} style={ui.input} />
    <Text style={ui.cardTitle}>Password</Text>
    <TextInput accessibilityLabel="Password" secureTextEntry maxLength={200} value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor={colors.muted} style={ui.input} onSubmitEditing={submit} />
    <Button title={authBusy ? 'Please wait…' : 'Sign in'} onPress={submit} disabled={authBusy} />
    {needsAdmin && <Button title="Sign out of this account" secondary onPress={signOut} />}
    {!!error && <Text accessibilityRole="alert" style={{ color: colors.error }}>{error}</Text>}
    <Text style={ui.caption}>Admins need the API (EXPO_PUBLIC_API_BASE_URL). Dev login: demo.admin@studenthub.local / admin-password-123.</Text>
  </View>;
}