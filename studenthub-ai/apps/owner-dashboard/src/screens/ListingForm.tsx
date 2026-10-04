import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, PlaceImage, colors, ui } from '../ui';
import { useOwner } from '../OwnerContext';
import {
  OWNER_CATEGORIES,
  createOwnerPlace,
  emptyPlaceForm,
  fieldErrors,
  placeFormFrom,
  toOwnerPlaceInput,
  updateOwnerPlace,
  validateOwnerPlaceForm,
  type OwnerPlaceForm,
} from '../owner';
import {
  FACILITY_SUGGESTIONS,
  OPENING_HOURS_OPTIONS,
  PRICE_BANDS,
  priceBandLabel,
  type PriceBandChoice,
} from '../ownerExtras';
import { Field, Notice, OptionRow, OwnerInput, OwnerTopBar, StatusPill, kit, type OwnerNav } from '../OwnerKit';

/**
 * Screen 4 - create / edit listing.
 *
 * Mirrors `apps/mobile-app/src/screens/owner/BusinessForm.tsx`. Every field on
 * this form — coordinates, audience, facilities, the WhatsApp number, opening
 * hours and the price band — posts to the owner API and lands on the listing
 * row, so students see it as soon as the listing is approved. The preview card
 * shows the student-facing card live as the owner types.
 */

const PRICE_UNITS = [
  { id: '/month', label: 'per month' },
  { id: '/meal', label: 'per meal' },
  { id: '/person', label: 'per person' },
  { id: '/plate', label: 'per plate' },
  { id: '', label: 'no unit' },
];

const GENDERS = [
  { id: '', label: 'Everyone' },
  { id: 'BOYS', label: 'Boys' },
  { id: 'GIRLS', label: 'Girls' },
  { id: 'CO_ED', label: 'Co-ed' },
];

const HOUR_CHOICES = [{ id: '', label: 'Not set' }, ...OPENING_HOURS_OPTIONS.map((hours) => ({ id: hours, label: hours }))];

const BAND_CHOICES: { id: PriceBandChoice; label: string }[] = [
  { id: '', label: 'Not set' },
  ...PRICE_BANDS.map((band) => ({ id: band.id as PriceBandChoice, label: `${band.label} · ${band.hint}` })),
];

export default function ListingForm({ placeId, nav }: { placeId?: string | null; nav: OwnerNav }) {
  const { token, places, refresh } = useOwner();
  const editing = placeId ? places.find((place) => place.id === placeId) ?? null : null;
  const [form, setForm] = useState<OwnerPlaceForm>(() => (editing ? placeFormFrom(editing) : emptyPlaceForm()));
  const [errors, setErrors] = useState<Partial<Record<keyof OwnerPlaceForm, string>>>({});
  const [problem, setProblem] = useState('');
  const [saved, setSaved] = useState('');
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof OwnerPlaceForm>(key: K, value: OwnerPlaceForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const facilityList = form.facilities.split(',').map((item) => item.trim()).filter(Boolean);
  const toggleFacility = (name: string) => set('facilities', (facilityList.includes(name)
    ? facilityList.filter((item) => item !== name)
    : [...facilityList, name]).join(', '));

  const submit = () => {
    if (!token || busy) return;
    const validation = validateOwnerPlaceForm(form);
    setProblem(validation ?? '');
    if (validation) { setErrors({}); return; }
    setBusy(true);
    setErrors({});
    const input = toOwnerPlaceInput(form);
    const action = editing ? updateOwnerPlace(token, editing.id, input) : createOwnerPlace(token, input);
    action
      .then((place) => {
        refresh();
        setSaved(editing
          ? `${place.name} saved. Edits to a live listing go back to review.`
          : `${place.name} is in review — StudentHub approves new listings before students see them.`);
      })
      .catch((failure: unknown) => {
        setErrors(fieldErrors(failure));
        setProblem(failure instanceof Error ? failure.message : 'Could not save the listing.');
      })
      .finally(() => setBusy(false));
  };

  return <View style={kit.body}>
    <OwnerTopBar
      title={editing ? 'Edit listing' : 'New listing'}
      subtitle={editing ? `${editing.name} · ${editing.status.replace('_', ' ').toLowerCase()}` : 'Goes live after StudentHub review'}
      right={editing ? <StatusPill status={editing.status} /> : undefined}
    />

    {saved ? <View style={styles.success}>
      <Text style={styles.successText}>{saved}</Text>
      <View style={[ui.row, { gap: 10, flexWrap: 'wrap' }]}>
        <Button title="Back to listings" onPress={() => nav.tab('listings')} />
        {editing ? null : <Button title="Add another" secondary onPress={() => { setForm(emptyPlaceForm()); setSaved(''); }} />}
      </View>
    </View> : null}

    <View style={[ui.panel, { gap: 10 }]}>
      <Text style={ui.cardTitle}>Student preview</Text>
      <Text style={ui.caption}>Exactly how your card reads in student search.</Text>
      <View style={[ui.card, { overflow: 'hidden' }]}>
        {form.imageUrl
          ? <PlaceImage uri={form.imageUrl} style={{ height: 150 }} />
          : <View style={styles.blank}><Text style={styles.blankIcon}>⌂</Text></View>}
        <View style={{ padding: 14, gap: 8 }}>
          <View style={ui.between}>
            <Text numberOfLines={1} style={[ui.cardTitle, { flexShrink: 1 }]}>{form.name || 'Your listing name'}</Text>
            <Text style={ui.rating}>★ {editing ? editing.rating.toFixed(1) : '4.5'}</Text>
          </View>
          <Text style={ui.caption}>{form.category} · ⌖ {form.address || 'Your address'}</Text>
          <View style={[ui.row, { flexWrap: 'wrap', gap: 6 }]}>
            {facilityList.slice(0, 3).map((facility) => <Text key={facility} style={ui.facility}>{facility}</Text>)}
            {form.priceBand ? <Text style={ui.facility}>{priceBandLabel(form.priceBand)}</Text> : null}
            {form.openingHours ? <Text style={ui.facility}>{form.openingHours}</Text> : null}
          </View>
          <Text style={ui.price}>{form.price ? `₹${Number(form.price).toLocaleString('en-IN')}` : 'Ask for pricing'}<Text style={ui.caption}> {form.priceUnit}</Text></Text>
          <Text numberOfLines={3} style={ui.body}>{form.description || 'Your description appears here on the student listing page.'}</Text>
        </View>
      </View>
      <Notice title="Preview only" text="Reviews, photos and coordinates stay as they are on the student page; everything else here is exactly what students will read once the listing is ACTIVE." />
    </View>

    <View style={ui.panel}>
      <Text style={ui.cardTitle}>Basics</Text>
      <Field label="Listing name" error={errors.name}>
        <OwnerInput label="Listing name" value={form.name} onChange={(value) => set('name', value)} placeholder="Green Leaf PG" />
      </Field>
      <Field label="Category">
        <OptionRow
          options={OWNER_CATEGORIES.map((category) => ({ id: category, label: category.replace('_', ' ') }))}
          value={form.category as typeof OWNER_CATEGORIES[number]}
          onChange={(value) => set('category', value)}
        />
      </Field>
      <Field label="Description" hint="What makes this place worth a visit? 2-3 sentences is plenty." error={errors.description}>
        <OwnerInput label="Description" value={form.description} onChange={(value) => set('description', value)} placeholder="Walking distance from campus, home-cooked meals, 24x7 water." multiline />
      </Field>
      <Field label="Who is it for?">
        <OptionRow options={GENDERS} value={form.gender} onChange={(value) => set('gender', value)} />
      </Field>
      <Field label="Facilities" hint="Tap a suggestion or type your own, separated by commas.">
        <OptionRow
          options={FACILITY_SUGGESTIONS.map((name) => ({ id: name, label: facilityList.includes(name) ? `✓ ${name}` : name }))}
          value={''}
          onChange={toggleFacility}
        />
        <OwnerInput label="Facilities" value={form.facilities} onChange={(value) => set('facilities', value)} placeholder="Wi-Fi, Meals, Laundry" multiline />
      </Field>
    </View>

    <View style={ui.panel}>
      <Text style={ui.cardTitle}>Location</Text>
      <Field label="Full address" error={errors.address}>
        <OwnerInput label="Full address" value={form.address} onChange={(value) => set('address', value)} placeholder="House 12, Jalukbari, Guwahati" />
      </Field>
      <View style={[ui.row, { gap: 12, alignItems: 'flex-start' }]}>
        <View style={{ flex: 1 }}>
          <Field label="Latitude" error={errors.latitude}>
            <OwnerInput label="Latitude" value={form.latitude} onChange={(value) => set('latitude', value)} placeholder="26.1535" keyboardType="numeric" />
          </Field>
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Longitude" error={errors.longitude}>
            <OwnerInput label="Longitude" value={form.longitude} onChange={(value) => set('longitude', value)} placeholder="91.6646" keyboardType="numeric" />
          </Field>
        </View>
      </View>
      <Text style={ui.caption}>Students pin the listing on the campus map, so keep both numbers inside Guwahati.</Text>
    </View>

    <View style={ui.panel}>
      <Text style={ui.cardTitle}>Price & contact</Text>
      <View style={[ui.row, { gap: 12, alignItems: 'flex-start' }]}>
        <View style={{ flex: 1 }}>
          <Field label="Price" hint="Optional — leave empty for ask-for-pricing." error={errors.price}>
            <OwnerInput label="Price" value={form.price} onChange={(value) => set('price', value)} placeholder="5500" keyboardType="numeric" />
          </Field>
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Billing period">
            <OptionRow options={PRICE_UNITS} value={form.priceUnit} onChange={(value) => set('priceUnit', value)} />
          </Field>
        </View>
      </View>
      <Field label="Public phone" hint="Students call this number from your listing." error={errors.phone}>
        <OwnerInput label="Public phone" value={form.phone} onChange={(value) => set('phone', value)} placeholder="+91 98765 43210" keyboardType="phone-pad" />
      </Field>
      <Field label="WhatsApp number" hint="Shown as a chat button on your listing when it differs from the public phone.">
        <OwnerInput label="WhatsApp number" value={form.whatsapp} onChange={(value) => set('whatsapp', value)} placeholder="Same as phone if empty" keyboardType="phone-pad" />
      </Field>
      <Field label="Cover image URL" error={errors.imageUrl}>
        <OwnerInput label="Cover image URL" value={form.imageUrl} onChange={(value) => set('imageUrl', value)} placeholder="https://images.example.com/pg.jpg" keyboardType="url" />
      </Field>
      <Field label="Opening hours" hint="Students read this on your listing page.">
        <OptionRow options={HOUR_CHOICES} value={form.openingHours} onChange={(value) => set('openingHours', value)} />
      </Field>
      <Field label="Price band" hint="The quick ₹ / ₹₹ / ₹₹₹ cue students scan for.">
        <OptionRow<PriceBandChoice> options={BAND_CHOICES} value={form.priceBand as PriceBandChoice} onChange={(value) => set('priceBand', value)} />
      </Field>
    </View>

    {problem ? <Text style={kit.error}>{problem}</Text> : null}
    <Button title={busy ? 'Saving…' : editing ? 'Save changes' : 'Submit for review'} onPress={submit} disabled={busy} />
    <Button title="Cancel" secondary onPress={() => nav.tab('listings')} />
  </View>;
}

const styles = StyleSheet.create({
  success: { backgroundColor: '#E7F7EE', borderRadius: 18, padding: 16, gap: 12, borderWidth: 1, borderColor: '#C6EBD9' },
  successText: { color: colors.greenDark, fontSize: 13, fontWeight: '700', lineHeight: 19 },
  blank: { height: 150, backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center' },
  blankIcon: { fontSize: 38, color: colors.purple },
});
