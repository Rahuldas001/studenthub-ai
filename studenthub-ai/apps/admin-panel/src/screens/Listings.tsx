import { useState } from 'react';
import { Text, View } from 'react-native';
import type { AdminPlaceSummary } from '@studenthub/types';
import { useAdmin } from '../AdminContext';
import { ADMIN_PLACE_FILTERS, deleteAdminPlace, moderateAdminPlace } from '../admin';
import { moderationActions } from '../adminExtras';
import { Button, Chip, Empty, StatusChip, Thumb, colors, ui } from '../ui';

/**
 * One listing row in the moderation queue.
 *
 * Approve/reject/unpublish appear only when the transition is legal (the same
 * rules as the in-app console), so buttons mirror the backend instead of
 * inviting 409s. Delete is irreversible, so unlike the mobile console — which
 * deletes on the first tap — this one asks for a second click.
 */
function ModerationRow({ place, onDone }: { place: AdminPlaceSummary; onDone: () => void }) {
  const { token } = useAdmin();
  const [busy, setBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState('');
  const actions = moderationActions(place.status);

  const act = (action: () => Promise<unknown>) => {
    setError('');
    setConfirmingDelete(false);
    setBusy(true);
    action().then(onDone).catch((failure: unknown) =>
      setError(failure instanceof Error ? failure.message : 'Action failed.')).finally(() => setBusy(false));
  };

  const onDelete = () => {
    if (busy || !token) return;
    if (!confirmingDelete) { setConfirmingDelete(true); return; }
    act(() => deleteAdminPlace(token, place.id));
  };

  return <View style={ui.panel}>
    <View style={ui.between}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 }}>
        {place.imageUrl ? <Thumb uri={place.imageUrl} /> : null}
        <View style={{ gap: 2, flexShrink: 1 }}>
          <Text style={ui.cardTitle} numberOfLines={1}>{place.name}</Text>
          <Text style={ui.caption} numberOfLines={2}>{place.category} · {place.address}</Text>
        </View>
      </View>
      <StatusChip status={place.status} />
    </View>
    <Text style={ui.caption}>Owner: {place.ownerName ?? 'Added by StudentHub'}</Text>
    <View style={[ui.row, { flexWrap: 'wrap' }]}>
      <Text style={ui.rating}>★ {place.rating.toFixed(1)}</Text>
      <Text style={ui.facility}>{place.reviewCount} reviews</Text>
      <Text style={ui.facility}>▦ {place.pendingRequests} pending</Text>
      {place.price !== null && <Text style={ui.price}>{place.price}<Text style={ui.caption}> {place.priceUnit ?? ''}</Text></Text>}
    </View>
    <View style={[ui.row, { flexWrap: 'wrap', gap: 10 }]}>
      {actions.approve && <Button title={busy ? '…' : 'Approve'} disabled={busy} onPress={() => token && act(() => moderateAdminPlace(token, place.id, 'ACTIVE'))} />}
      {actions.reject && <Button title={busy ? '…' : 'Reject'} secondary disabled={busy} onPress={() => token && act(() => moderateAdminPlace(token, place.id, 'REJECTED'))} />}
      {actions.unpublish && <Button title={busy ? '…' : 'Unpublish'} secondary disabled={busy} onPress={() => token && act(() => moderateAdminPlace(token, place.id, 'INACTIVE'))} />}
      <Button title={busy ? '…' : confirmingDelete ? 'Confirm delete?' : 'Delete'} secondary disabled={busy} onPress={onDelete} />
      {confirmingDelete && !busy && <Button title="Keep it" secondary onPress={() => setConfirmingDelete(false)} />}
    </View>
    {!!error && <Text accessibilityRole="alert" style={{ color: colors.error, fontSize: 12 }}>{error}</Text>}
  </View>;
}

/**
 * The moderation queue: status filters with counts, a text search from the
 * header, then the rows. Same filter set and payload as the in-app console
 * (`Admin.tsx`), rendered as this shell's chips.
 */
export default function Listings({ query = '' }: { query?: string }) {
  const { places, placeCounts, refresh } = useAdmin();
  const [filter, setFilter] = useState('PENDING');
  const activeFilter = ADMIN_PLACE_FILTERS.find((entry) => entry.id === filter);
  const needle = query.trim().toLowerCase();
  const visiblePlaces = places
    .filter((place) => (activeFilter?.status ? place.status === activeFilter.status : true))
    .filter((place) => !needle || [place.name, place.category, place.address, place.ownerName ?? '']
      .some((field) => field.toLowerCase().includes(needle)));

  return <View style={{ gap: 16 }}>
    <View style={[ui.row, { flexWrap: 'wrap', gap: 10 }]}>
      {ADMIN_PLACE_FILTERS.map((entry) => (
        <Chip
          key={entry.id}
          label={`${entry.label}${entry.status && placeCounts[entry.status] ? ` (${placeCounts[entry.status]})` : ''}`}
          selected={filter === entry.id}
          onPress={() => setFilter(entry.id)}
        />
      ))}
    </View>
    {needle ? <Text style={ui.caption}>Showing matches for “{query.trim()}” · {visiblePlaces.length} found · <Text style={ui.link} onPress={() => setFilter('all')}>search all statuses</Text></Text> : null}
    {visiblePlaces.length === 0
      ? <Empty icon="✓" title="Nothing here" body={needle ? 'No listings match this search and filter.' : 'No listings match this filter right now.'} />
      : visiblePlaces.map((place) => <ModerationRow key={place.id} place={place} onDone={refresh} />)}
  </View>;
}