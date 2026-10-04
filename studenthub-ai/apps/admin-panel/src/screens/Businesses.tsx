import { useState } from 'react';
import { Text, View } from 'react-native';
import type { AdminOwnerSummary } from '@studenthub/types';
import { useAdmin } from '../AdminContext';
import { setAdminOwnerVerified } from '../admin';
import { verifyActionLabel } from '../adminExtras';
import { Button, Empty, colors, ui } from '../ui';

/**
 * Business verification row: toggles the `verified` flag on an owner.
 * Same row as the in-app console, with the same two states and labels.
 */
function OwnerRow({ owner, onDone }: { owner: AdminOwnerSummary; onDone: () => void }) {
  const { token } = useAdmin();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const act = () => {
    if (!token || busy) return;
    setError('');
    setBusy(true);
    setAdminOwnerVerified(token, owner.id, !owner.verified)
      .then(onDone)
      .catch((failure: unknown) => setError(failure instanceof Error ? failure.message : 'Action failed.'))
      .finally(() => setBusy(false));
  };
  return <View style={ui.panel}>
    <View style={ui.between}>
      <Text style={[ui.cardTitle, { flexShrink: 1 }]}>{owner.businessName}</Text>
      <Text style={[ui.facility, { fontWeight: '700', flexShrink: 0 }, owner.verified
        ? { color: colors.greenDark, backgroundColor: colors.okBg }
        : { color: colors.amber, backgroundColor: colors.amberBg }]}>{owner.verified ? 'VERIFIED' : 'UNVERIFIED'}</Text>
    </View>
    <Text style={ui.caption}>{owner.displayName}{owner.email ? ` · ${owner.email}` : ''}</Text>
    <View style={[ui.row, { flexWrap: 'wrap' }]}>
      <Text style={ui.facility}>{owner.listingCount} listings</Text>
      {owner.phone && <Text style={ui.facility}>{owner.phone}</Text>}
      <Text style={ui.facility}>Joined {new Date(owner.createdAt).toLocaleDateString()}</Text>
    </View>
    <View style={[ui.row, { flexWrap: 'wrap', gap: 10 }]}>
      <Button
        title={busy ? '…' : verifyActionLabel(owner.verified)}
        secondary={owner.verified}
        disabled={busy}
        onPress={act}
      />
    </View>
    {!!error && <Text accessibilityRole="alert" style={{ color: colors.error, fontSize: 12 }}>{error}</Text>}
  </View>;
}

/**
 * The business list with verification counts.
 * Mirrors the in-app console's owners tab (`Admin.tsx`).
 */
export default function Businesses() {
  const { owners, refresh } = useAdmin();
  const verified = owners.filter((owner) => owner.verified).length;

  return <View style={{ gap: 16 }}>
    <Text style={ui.caption}>
      {owners.length} business{owners.length === 1 ? '' : 'es'} · {verified} verified · {owners.length - verified} awaiting verification
    </Text>
    {owners.length === 0
      ? <Empty icon="⌂" title="No businesses yet" body="Owner accounts appear here once they register." />
      : owners.map((owner) => <OwnerRow key={owner.id} owner={owner} onDone={refresh} />)}
  </View>;
}