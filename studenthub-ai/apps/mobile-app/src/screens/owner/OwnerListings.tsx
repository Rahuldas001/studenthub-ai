import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { PlaceStatus } from '@studenthub/types';
import { Button, Empty, PlaceImage, colors, ui } from '../../components/ui';
import { useOwner } from '../../context/OwnerContext';
import { useOwnerExtras } from '../../context/OwnerExtrasContext';
import { deleteOwnerPlace, updateOwnerPlace } from '../../services/owner';
import { liveOffers, offerBadge, priceBandLabel } from '../../utils/ownerExtras';
import { IconButton, MetricRow, Notice, OptionRow, OwnerTopBar, RatingPill, StatusPill, kit, type OwnerNav } from './OwnerKit';

/**
 * Screen 3 - listings manager.
 *
 * Every moderation action (edit, pause, resubmit, delete) goes straight to the
 * API and then refreshes `OwnerContext`, so the filter counts always mirror the
 * server. The traffic numbers come from `/api/owner/analytics`, so a listing
 * deleted here drops its offers with it on the server too.
 */

type Filter = 'ALL' | PlaceStatus;

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'ACTIVE', label: 'Active' },
  { id: 'PENDING', label: 'In review' },
  { id: 'DRAFT', label: 'Drafts' },
  { id: 'INACTIVE', label: 'Paused' },
  { id: 'REJECTED', label: 'Rejected' },
];

export default function OwnerListings({ nav }: { nav: OwnerNav }) {
  const { token, places, placeCounts, refresh, loading } = useOwner();
  const { offers, analyticsFor, refreshOffers } = useOwnerExtras();
  const [filter, setFilter] = useState<Filter>('ALL');
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const live = liveOffers(offers);
  const rows = places.filter((place) => filter === 'ALL' || place.status === filter);

  const run = (placeId: string, action: Promise<unknown>, after?: () => void) => {
    setError('');
    setBusyId(placeId);
    action
      .then(() => { after?.(); refresh(); })
      .catch((failure: unknown) => setError(failure instanceof Error ? failure.message : 'That action failed.'))
      .finally(() => setBusyId(''));
  };
  const remove = (placeId: string, name: string) => Alert.alert(
    `Delete ${name}?`,
    'Students stop seeing this listing and any offers attached to it are removed with it. The API delete cannot be undone.',
    [{ text: 'Keep listing', style: 'cancel' }, {
      text: 'Delete',
      style: 'destructive',
      onPress: () => { if (token) run(placeId, deleteOwnerPlace(token, placeId), () => { void refreshOffers(); }); },
    }],
  );

  return <ScrollView contentContainerStyle={kit.body}>
    <OwnerTopBar
      title="Your listings"
      subtitle={`${places.length} total · ${placeCounts.ACTIVE ?? 0} live · ${placeCounts.PENDING ?? 0} in review`}
      right={<IconButton icon="＋" label="Add a listing" onPress={() => nav.form()} />}
    />

    <OptionRow<Filter>
      options={FILTERS.map((item) => ({
        id: item.id,
        label: item.id === 'ALL' ? `All (${places.length})` : `${item.label} (${placeCounts[item.id as PlaceStatus] ?? 0})`,
      }))}
      value={filter}
      onChange={setFilter}
    />

    {error ? <Text style={kit.error}>{error}</Text> : null}
    {loading ? <Notice title="Refreshing" text="Syncing your listings with StudentHub…" /> : null}

    {!rows.length && !loading ? <Empty
      icon="▦"
      title={places.length ? 'Nothing in this filter' : 'No listings yet'}
      body={places.length ? 'Switch the filter to see your other listings.' : 'Listings you create appear here with their views, reviews and requests.'}
    >
      <Button title="Create a listing" onPress={() => nav.form()} />
    </Empty> : null}

    {rows.map((place) => {
      const busy = busyId === place.id;
      const metrics = analyticsFor(place.id);
      const placeOffers = live.filter((offer) => offer.placeId === place.id);
      const band = priceBandLabel(place.priceBand ?? '');
      return <View key={place.id} style={[ui.panel, { padding: 0, overflow: 'hidden' }]}>
        <View>
          {place.imageUrl
            ? <PlaceImage uri={place.imageUrl} style={{ height: 150 }} />
            : <View style={styles.blank}><Text style={styles.blankIcon}>⌂</Text></View>}
          <View style={styles.coverRow}>
            <StatusPill status={place.status} />
            {placeOffers.map((offer) => <View key={offer.id} style={styles.offerPill}>
              <Text style={styles.offerText}>{offerBadge(offer)} live</Text>
            </View>)}
          </View>
        </View>
        <View style={styles.cardBody}>
          <View>
            <Text style={ui.cardTitle}>{place.name}</Text>
            <Text style={ui.caption}>{place.category}{band ? ` · ${band}` : ''} · {place.address}</Text>
          </View>
          <View style={[ui.row, { flexWrap: 'wrap', gap: 8 }]}>
            <RatingPill value={place.rating} count={place.reviewCount} />
            {place.verified ? <View style={styles.verified}><Text style={styles.verifiedText}>✓ Verified</Text></View> : null}
            <Text style={ui.facility}>▤ {place.pendingRequests} pending</Text>
          </View>
          <MetricRow items={[
            { label: 'Views 7d', value: String(metrics?.views ?? 0) },
            { label: 'Saves', value: String(metrics?.saves ?? 0) },
            { label: 'Enquiries', value: String(metrics?.enquiries ?? 0) },
          ]} />
          <View style={[ui.row, { flexWrap: 'wrap', gap: 10 }]}>
            <Button title={busy ? '…' : 'Edit & preview'} onPress={() => nav.form(place.id)} />
            {place.status === 'ACTIVE'
              ? <Button title={busy ? '…' : 'Pause'} secondary onPress={() => { if (token) run(place.id, updateOwnerPlace(token, place.id, { status: 'INACTIVE' })); }} />
              : <Button title={busy ? '…' : 'Send for review'} secondary onPress={() => { if (token) run(place.id, updateOwnerPlace(token, place.id, { status: 'PENDING' })); }} />}
            <Button title={busy ? '…' : 'Delete'} secondary onPress={() => remove(place.id, place.name)} />
          </View>
        </View>
      </View>;
    })}
  </ScrollView>;
}

const styles = StyleSheet.create({
  blank: { height: 150, backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center' },
  blankIcon: { fontSize: 38, color: colors.purple },
  coverRow: { position: 'absolute', bottom: 10, left: 10, flexDirection: 'row', gap: 6 },
  offerPill: { backgroundColor: colors.heart, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  offerText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  verified: { backgroundColor: '#E7F7EE', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  verifiedText: { color: colors.greenDark, fontSize: 10, fontWeight: '800' },
  cardBody: { padding: 16, gap: 10 },
});

