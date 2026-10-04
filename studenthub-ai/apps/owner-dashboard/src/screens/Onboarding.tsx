import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useOwner } from '../OwnerContext';
import { createOwnerProfile } from '../owner';
import { Button, colors, ui } from '../ui';

/** Business profile onboarding for OWNER accounts created without one. */
export default function Onboarding() {
  const { token, refresh } = useOwner();
  const [businessName, setBusinessName] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  return <View style={[ui.panel, { maxWidth: 520, width: '100%', alignSelf: 'center' }]}>
    <Text style={ui.heading}>Set up your business</Text>
    <Text style={ui.body}>Your account is an owner account, but it has no business profile yet. Add one to manage listings.</Text>
    <Text style={ui.cardTitle}>Business name</Text>
    <TextInput accessibilityLabel="Business name" maxLength={120} value={businessName} onChangeText={setBusinessName} placeholder="e.g. Green Valley PG" placeholderTextColor={colors.muted} style={ui.input} />
    <Text style={ui.cardTitle}>Business phone (optional)</Text>
    <TextInput accessibilityLabel="Business phone" keyboardType="phone-pad" maxLength={16} value={businessPhone} onChangeText={setBusinessPhone} placeholder="Contact number" placeholderTextColor={colors.muted} style={ui.input} />
    <Button title={busy ? 'Saving…' : 'Save business profile'} onPress={() => {
      setError('');
      if (businessName.trim().length < 2) { setError('Add your business name (at least 2 characters).'); return; }
      if (!token) { setError('Sign in again to continue.'); return; }
      setBusy(true);
      createOwnerProfile(token, { businessName: businessName.trim(), businessPhone: businessPhone.trim() || undefined })
        .then(() => refresh())
        .catch((failure: unknown) => setError(failure instanceof Error ? failure.message : 'Could not save the profile.'))
        .finally(() => setBusy(false));
    }} />
    {!!error && <Text accessibilityRole="alert" style={{ color: '#B42338' }}>{error}</Text>}
  </View>;
}
