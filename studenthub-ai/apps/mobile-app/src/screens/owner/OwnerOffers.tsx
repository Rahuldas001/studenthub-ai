import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Empty, colors, ui } from '../../components/ui';
import { useOwner } from '../../context/OwnerContext';
import { useOwnerExtras } from '../../context/OwnerExtrasContext';
import type { OwnerOffer } from '@studenthub/types';
import {
  emptyOfferDraft,
  isOfferLive,
  offerBadge,
  offerDraftFrom,
  offerTarget,
  todayIso,
  type OfferDraft,
} from '../../utils/ownerExtras';
import { Notice, OptionRow, OwnerInput, OwnerTopBar, Toggle, kit, shortDate, type OwnerNav } from './OwnerKit';

/**
 * Screen 8 - promotional offers.
 *
 * Offers are saved through `/api/owner/offers`, so a promo created on the owner
 * phone shows up on every device and — once the student app reads the same
 * rows — on the listing card too. The screen shows API state only.
 */

type Filter = 'ALL' | 'LIVE' | 'PAUSED';

/** `YYYY-MM-DD` for a day offset, used by the quick-expiry chips. */
function isoInDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return todayIso(date);
}

export default function OwnerOffers({ nav }: { nav: OwnerNav }) {
  const { places } = useOwner();
  const { offers, offersLoading, offersError, refreshOffers, saveOffer, removeOffer, toggleOffer } = useOwnerExtras();
  const [filter, setFilter] = useState<Filter>('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<OfferDraft>(emptyOfferDraft());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const live = offers.filter((offer) => isOfferLive(offer));
  const rows = (filter === 'ALL' ? offers : filter === 'LIVE' ? live : offers.filter((offer) => !isOfferLive(offer)))
    .slice()
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const set = <K extends keyof OfferDraft>(key: K, value: OfferDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  const startNew = () => {
    setEditingId(null);
    setDraft(emptyOfferDraft(places[0]?.id ?? ''));
    setError('');
    setFormOpen(true);
  };
  const startEdit = (offer: OwnerOffer) => {
    setEditingId(offer.id);
    setDraft(offerDraftFrom(offer));
    setError('');
    setFormOpen(true);
  };
  const submit = async () => {
    if (busy) return;
    setBusy(true);
    const problem = await saveOffer(draft, editingId ?? undefined);
    setBusy(false);
    if (problem) { setError(problem); return; }
    setError('');
    setFormOpen(false);
  };
  const onDelete = async (offer: OwnerOffer) => {
    setError(await removeOffer(offer.id) ?? '');
  };
  const onToggle = async (offer: OwnerOffer) => {
    setError(await toggleOffer(offer.id) ?? '');
  };

  return <ScrollView contentContainerStyle={kit.body} keyboardShouldPersistTaps="handled">
    <OwnerTopBar
      title="Offers"
      subtitle={`${live.length} live · ${offers.length - live.length} paused or expired`}
      right={<Button title={formOpen ? 'Close' : 'New offer'} onPress={() => (formOpen ? setFormOpen(false) : startNew())} />}
    />

    <Notice title="Saved on your account" text="Offers are stored with your listings on the StudentHub servers, so they follow you across devices. When students pause a promo it stays paused everywhere." action={offersLoading ? undefined : { label: 'Refresh', onPress: () => void refreshOffers() }} />
    {offersError ? <Text style={kit.error}>{offersError}</Text> : null}
    {error && !formOpen ? <Text style={kit.error}>{error}</Text> : null}

    {formOpen ? <View style={[ui.panel, { gap: 14 }]}>
      <Text style={ui.cardTitle}>{editingId ? 'Edit offer' : 'Create an offer'}</Text>
      <View style={styles.preview}>
        <Text style={styles.previewBadge}>{draft.discount ? `${draft.discount}% OFF` : '20% OFF'}</Text>
        <Text style={styles.previewTitle} numberOfLines={1}>{draft.title || 'Your offer title'}</Text>
        <Text style={styles.previewBody} numberOfLines={2}>{draft.description || 'What students get when they show a student ID.'}</Text>
      </View>

      <View style={kit.field}>
        <Text style={kit.fieldLabel}>Applies to</Text>
        <OptionRow
          options={[{ id: '', label: 'All listings' }, ...places.map((place) => ({ id: place.id, label: place.name }))]}
          value={draft.placeId}
          onChange={(value) => set('placeId', value)}
        />
      </View>
      <View style={kit.field}>
        <Text style={kit.fieldLabel}>Offer title</Text>
        <OwnerInput label="Offer title" value={draft.title} onChange={(value) => set('title', value)} placeholder="Student combo meal" />
      </View>
      <View style={kit.field}>
        <Text style={kit.fieldLabel}>What students get</Text>
        <OwnerInput label="What students get" value={draft.description} onChange={(value) => set('description', value)} placeholder="Any thali plus a cold drink at 20% off." multiline />
      </View>
      <View style={[ui.row, { gap: 12, alignItems: 'flex-start' }]}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={kit.fieldLabel}>Discount %</Text>
          <OwnerInput label="Discount" value={draft.discount} onChange={(value) => set('discount', value)} placeholder="20" keyboardType="numeric" />
        </View>
        <View style={{ flex: 2, gap: 6 }}>
          <Text style={kit.fieldLabel}>Valid till</Text>
          <OwnerInput label="Valid till" value={draft.validTill} onChange={(value) => set('validTill', value)} placeholder={todayIso()} />
        </View>
      </View>
      <View style={kit.chipRow}>
        <Button title="7 days" secondary onPress={() => set('validTill', isoInDays(7))} />
        <Button title="30 days" secondary onPress={() => set('validTill', isoInDays(30))} />
        <Button title="No expiry" secondary onPress={() => set('validTill', '')} />
      </View>
      {error ? <Text style={kit.error}>{error}</Text> : null}
      <Button title={busy ? 'Saving…' : editingId ? 'Save changes' : 'Publish offer'} onPress={submit} disabled={busy} />
      <Button title="Cancel" secondary onPress={() => { setFormOpen(false); setError(''); }} />
    </View> : null}

    <OptionRow<Filter>
      options={[
        { id: 'ALL', label: `All (${offers.length})` },
        { id: 'LIVE', label: `Live (${live.length})` },
        { id: 'PAUSED', label: `Paused (${offers.length - live.length})` },
      ]}
      value={filter}
      onChange={setFilter}
    />

    {!rows.length && offersLoading ? <View style={[ui.panel, { alignItems: 'center', paddingVertical: 24 }]}>
      <ActivityIndicator color={colors.purple} />
      <Text style={ui.caption}>Loading your offers…</Text>
    </View> : !rows.length ? <Empty icon="％" title={offers.length ? 'Nothing in this filter' : 'No offers yet'}
      body={offers.length
        ? 'Switch the filter to see your other promos.'
        : 'A student discount is the cheapest marketing there is. Create one and mention it when you confirm bookings.'}>
      <Button title="Create an offer" onPress={startNew} />
    </Empty> : rows.map((offer) => {
      const on = isOfferLive(offer);
      return <View key={offer.id} style={[ui.panel, { gap: 12 }]}>
        <View style={ui.between}>
          <View style={[kit.pill, { backgroundColor: colors.pale }]}>
            <Text style={[kit.pillText, { color: colors.purple }]}>{offerBadge(offer)}</Text>
          </View>
          <Toggle on={offer.active} onChange={() => void onToggle(offer)} label={`Switch offer ${offer.title}`} />
        </View>
        <View style={{ gap: 4 }}>
          <Text style={ui.cardTitle}>{offer.title}</Text>
          <Text style={ui.body}>{offer.description}</Text>
        </View>
        <View style={styles.meta}>
          <Text style={styles.metaText}>{offerTarget(offer, places)}</Text>
          <Text style={styles.metaText}>{offer.validTill ? `Till ${shortDate(offer.validTill)}` : 'No expiry'}</Text>
          <Text style={[styles.metaText, { color: on ? colors.greenDark : '#B42318' }]}>
            {on ? 'Live' : offer.active ? 'Expired' : 'Paused'}
          </Text>
        </View>
        <View style={[ui.row, { gap: 10, flexWrap: 'wrap' }]}>
          <Button title="Edit" secondary onPress={() => startEdit(offer)} />
          <Button title="Delete" secondary onPress={() => void onDelete(offer)} />
        </View>
      </View>;
    })}

    <Button title="Back to dashboard" secondary onPress={() => nav.tab('home')} />
  </ScrollView>;
}

const styles = StyleSheet.create({
  preview: { backgroundColor: colors.bg, borderRadius: 16, padding: 14, gap: 4 },
  previewBadge: { alignSelf: 'flex-start', backgroundColor: colors.purple, color: '#fff', fontSize: 11, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
  previewTitle: { fontSize: 15, fontWeight: '800', color: colors.ink },
  previewBody: { fontSize: 12, color: colors.muted, lineHeight: 18 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, backgroundColor: colors.bg, borderRadius: 14, padding: 12 },
  metaText: { fontSize: 11, fontWeight: '700', color: colors.muted },
});

