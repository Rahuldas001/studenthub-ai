import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { PlaceDetails as PlaceDetailsData, PlaceSummary, Review } from '@studenthub/types';
import { Button, Chip, IconButton, PlaceImage, colors, facilityGlyph, genderLabel, ui } from '../components/ui';
import HomeMap from '../components/HomeMap';
import { useStudent } from '../context/StudentContext';
import { apiConfigured, apiRequest } from '../services/api';
import { fetchPlaceDetails } from '../services/places';
import { distanceLabel, priceLabel, validateVisit } from '../utils/discovery';

export default function PlaceDetails({ place, onBack, onBookings }: { place: PlaceSummary; onBack: () => void; onBookings: () => void }) {
  const { savedIds, toggleSaved, name: profileName, addVisit, session } = useStudent();
  const [planning, setPlanning] = useState(false);
  const [name, setName] = useState(profileName);
  const [date, setDate] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const saved = savedIds.has(place.id);
  const save = () => {
    const phoneOk = !session || phone.replace(/\D/g, '').length >= 10;
    const problem = !phoneOk ? 'Enter a valid phone number so your request can reach the owner.' : validateVisit(name, date);
    setError(problem);
    if (problem) return;
    addVisit({ place, name: name.trim(), date, note: note.trim(), phone: session ? phone.trim() : undefined });
    onBookings();
  };
  const openMaps = () => { void Linking.openURL(`https://www.openstreetmap.org/?mlat=${place.latitude}&mlon=${place.longitude}#map=17/${place.latitude}/${place.longitude}`).catch(() => setError('Unable to open maps on this device.')); };
  const [details, setDetails] = useState<PlaceDetailsData | null>(null);
  useEffect(() => {
    let active = true;
    fetchPlaceDetails(place.id)
      .then((found) => { if (active) setDetails(found); })
      .catch(() => { if (active) setDetails(null); });
    return () => { active = false; };
  }, [place.id]);
  const contactPhone = details?.phone?.trim() || '';
  const noPhone = () => Alert.alert('No phone number', 'This listing does not include a contact number yet.');
  const openDialer = () => {
    if (!contactPhone) { noPhone(); return; }
    void Linking.openURL(`tel:${contactPhone.replace(/[^\d+]/g, '')}`).catch(() => Alert.alert('Cannot dial', 'No phone app is available on this device.'));
  };
  const openWhatsApp = () => {
    if (!contactPhone) { noPhone(); return; }
    const digits = contactPhone.replace(/\D/g, '');
    const text = encodeURIComponent(`Hi, I found ${place.name} on StudentHub AI and would like to know more.`);
    void Linking.openURL(`https://wa.me/${digits}?text=${text}`).catch(() => Alert.alert('WhatsApp not available', 'Install WhatsApp to chat with the owner.'));
  };
  return <View style={{ flex: 1, backgroundColor: colors.bg }}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 120 }}>
      <View>
        <PlaceImage uri={place.imageUrl} style={{ height: 290, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }} />
        <View pointerEvents="box-none" style={styles.floatRow}>
          <IconButton icon="←" label="Back to places" onPress={onBack} />
          <IconButton icon={saved ? '♥' : '♡'} label={saved ? 'Unsave place' : 'Save place'} onPress={() => toggleSaved(place)} />
        </View>
        <View style={styles.countBadge}><Text style={styles.countText}>1/1</Text></View>
      </View>
      <View style={styles.sheet}>
        <View style={ui.row}>
          <Text style={styles.categoryChip}>{place.category}{place.gender ? ` · ${genderLabel(place.gender)}` : ''}</Text>
          <Text style={ui.rating}>★ {place.rating.toFixed(1)}</Text>
          <Text style={ui.caption}>{place.reviewCount} reviews</Text>
        </View>
        <Text style={ui.title}>{place.name}</Text>
        <Text style={ui.body}>📍 {place.address} · {distanceLabel(place)}</Text>
        <View style={[ui.panel, ui.between]}>
          <View>
            <Text style={ui.caption}>{place.price === null ? 'Contact for rates' : 'Starting price'}</Text>
            <Text style={ui.price}>{priceLabel(place)}{place.priceUnit ? <Text style={ui.caption}> {place.priceUnit}</Text> : null}</Text>
          </View>
          {place.priceUnit === '/month' && <View style={styles.inclusive}><Text style={styles.inclusiveText}>All Inclusive</Text></View>}
        </View>
        {place.facilities.length > 0 && <View style={[ui.row, { flexWrap: 'wrap', gap: 10 }]}>
          {place.facilities.map((facility) => <View key={facility.id} style={styles.amenity}>
            <Text style={{ fontSize: 17 }}>{facilityGlyph(facility.icon)}</Text>
            <Text style={styles.amenityText}>{facility.name}</Text>
          </View>)}
        </View>}
        <Text style={ui.heading}>About this place</Text>
        <Text style={ui.body}>{details?.description?.trim() || 'The owner has not added a description yet. Check the facilities, map and reviews above before planning your visit.'}</Text>
        <View style={[ui.row, { gap: 10 }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Get directions" onPress={openMaps} style={({ pressed }) => [ui.button, styles.sheetWide, { backgroundColor: colors.pale, opacity: pressed ? 0.8 : 1 }]}>
            <Text style={[ui.buttonText, { color: colors.purple }]}>🗺 Directions</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Book a visit" onPress={() => setPlanning(true)} style={({ pressed }) => [ui.button, styles.sheetWide, { opacity: pressed ? 0.8 : 1 }]}>
            <Text style={ui.buttonText}>▦ Book a visit</Text>
          </Pressable>
        </View>
        <View style={[ui.panel, { gap: 10 }]}>
          <Text style={ui.heading}>Facilities & services</Text>
          {place.facilities.length ? <View style={[ui.row, { flexWrap: 'wrap', gap: 9 }]}>
            {place.facilities.map((facility) => <Text key={facility.id} style={[styles.checkItem, { flexBasis: '46%' }]}>✓ {facility.name}</Text>)}
          </View> : <Text style={ui.caption}>Facilities have not been provided.</Text>}
          <Text style={ui.body}>Explore this {place.category.toLowerCase()} around Gauhati University. Check the location and listed facilities before planning your visit.</Text>
        </View>
        <Text style={ui.heading}>Find it on the map</Text>
        <HomeMap places={[place]} />
        <ReviewsSection placeId={place.id} />
        <View style={[ui.panel, { backgroundColor: colors.pale }]}>
          <Text style={ui.cardTitle}>A little heads-up</Text>
          <Text style={ui.body}>Development listings may be fictional. A visit plan is a personal reminder, not a booking or an owner-confirmed request. Never pay without checking the property.</Text>
        </View>
        {planning && <View style={ui.panel}>
          <Text style={ui.heading}>Plan your visit</Text>
          <Text style={ui.caption}>{session ? 'Saved here and sent as a visit request to the place.' : 'Stored in this session only. Not sent to an owner.'}</Text>
          <Text style={ui.cardTitle}>Your name</Text>
          <TextInput accessibilityLabel="Visitor name" maxLength={80} value={name} onChangeText={setName} style={ui.input} placeholder="Your name" placeholderTextColor={colors.muted} />
          {session && <>
            <Text style={ui.cardTitle}>Your phone</Text>
            <TextInput accessibilityLabel="Visitor phone" maxLength={16} keyboardType="phone-pad" value={phone} onChangeText={setPhone} style={ui.input} placeholder="Phone number" placeholderTextColor={colors.muted} />
          </>}
          <Text style={ui.cardTitle}>Visit date</Text>
          <TextInput accessibilityLabel="Visit date YYYY-MM-DD" value={date} onChangeText={setDate} maxLength={10} placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} style={ui.input} />
          <Text style={ui.cardTitle}>Notes (optional)</Text>
          <TextInput accessibilityLabel="Visit notes" value={note} onChangeText={setNote} maxLength={500} multiline placeholder="Questions to ask, room preferences…" placeholderTextColor={colors.muted} style={[ui.input, { minHeight: 90, textAlignVertical: 'top' }]} />
          <Pressable accessibilityRole="button" onPress={save} style={({ pressed }) => [ui.button, { opacity: pressed ? 0.8 : 1 }]}><Text style={ui.buttonText}>Save visit plan</Text></Pressable>
          <Chip label="Cancel" onPress={() => { setPlanning(false); setError(null); }} />
        </View>}
        {error && <Text accessibilityRole="alert" style={{ color: '#B42338' }}>{error}</Text>}
      </View>
    </ScrollView>
    <View style={styles.actionBar}>
      <Pressable accessibilityRole="button" accessibilityLabel="Call the owner" onPress={openDialer} style={({ pressed }) => [styles.barCall, { opacity: pressed ? 0.85 : 1 }]}>
        <Text style={styles.barCallText}>☎ Call</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Chat on WhatsApp" onPress={openWhatsApp} style={({ pressed }) => [styles.barWhats, { opacity: pressed ? 0.85 : 1 }]}>
        <Text style={styles.barWhatsText}>WhatsApp</Text>
      </Pressable>
    </View>
  </View>;
}

/** Reviews list + write form. Reads come with the place payload; posts go to the API when configured. */
function ReviewsSection({ placeId }: { placeId: string }) {
  const { session, name: profileName } = useStudent();
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [writing, setWriting] = useState(false);
  const [author, setAuthor] = useState(profileName);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    fetchPlaceDetails(placeId)
      .then((details) => { if (active) setReviews(details?.reviews ?? null); })
      .catch(() => { if (active) setReviews(null); });
    return () => { active = false; };
  }, [placeId]);
  const submit = () => {
    setError(null);
    if (busy) return;
    if (rating < 1 || rating > 5) { setError('Tap a star to rate from 1 to 5.'); return; }
    if (comment.trim().length < 5) { setError('Write at least 5 characters about the place.'); return; }
    if (!author.trim() || author.trim().length < 2) { setError('Add your name (at least 2 characters).'); return; }
    if (!apiConfigured()) { setError('Reviews need the API (EXPO_PUBLIC_API_BASE_URL).'); return; }
    setBusy(true);
    apiRequest<Review>('/reviews', {
      method: 'POST',
      token: session?.token,
      body: { placeId, rating, comment: comment.trim(), authorName: author.trim() },
    })
      .then((review) => { setReviews((current) => [review, ...(current ?? [])]); setWriting(false); setComment(''); setRating(0); })
      .catch((failure: unknown) => setError(failure instanceof Error ? failure.message : 'Could not post the review.'))
      .finally(() => setBusy(false));
  };
  return <View style={[ui.panel, { gap: 12 }]}>
    <View style={ui.between}>
      <Text style={ui.heading}>Reviews</Text>
      <Chip label={writing ? 'Close' : '✎ Write one'} onPress={() => { setWriting(!writing); setError(null); }} />
    </View>
    {writing && <View style={{ gap: 10 }}>
      <View style={ui.row}>
        {[1, 2, 3, 4, 5].map((value) => <Pressable key={value} accessibilityRole="button" accessibilityLabel={`Rate ${value} star${value === 1 ? '' : 's'}`} onPress={() => setRating(value)} hitSlop={6}>
          <Text style={{ fontSize: 30, color: value <= rating ? '#F0A429' : colors.line }}>★</Text>
        </Pressable>)}
        {rating > 0 && <Text style={ui.caption}>{rating}/5</Text>}
      </View>
      {!session && <>
        <Text style={ui.cardTitle}>Your name</Text>
        <TextInput accessibilityLabel="Review author name" maxLength={80} value={author} onChangeText={setAuthor} placeholder="Your name" placeholderTextColor={colors.muted} style={ui.input} />
      </>}
      <Text style={ui.cardTitle}>Your review</Text>
      <TextInput accessibilityLabel="Review comment" maxLength={1000} multiline value={comment} onChangeText={setComment} placeholder="What should other students know?" placeholderTextColor={colors.muted} style={[ui.input, { minHeight: 90, textAlignVertical: 'top' }]} />
      <Button title={busy ? 'Posting…' : 'Post review'} onPress={submit} />
      {!!error && <Text accessibilityRole="alert" style={{ color: '#B42338' }}>{error}</Text>}
    </View>}
    {reviews === null
      ? <Text style={ui.caption}>Reviews load when the API is configured. Offline demo places have sample reviews only.</Text>
      : reviews.length === 0
        ? <Text style={ui.caption}>No reviews yet — be the first to share your experience.</Text>
        : <View style={{ gap: 10 }}>
          {reviews.map((review) => <View key={review.id} style={[ui.panel, { backgroundColor: colors.bg, gap: 6 }]}>
            <View style={ui.between}>
              <Text numberOfLines={1} style={[ui.cardTitle, { flexShrink: 1, fontSize: 14 }]}>{review.authorName}</Text>
              <Text style={ui.rating}>★ {review.rating}</Text>
            </View>
            <Text style={ui.body}>{review.comment}</Text>
            <Text style={ui.caption}>{new Date(review.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
          </View>)}
        </View>}
  </View>;
}

const styles = StyleSheet.create({
  floatRow: { position: 'absolute', top: 16, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  countBadge: { position: 'absolute', bottom: 20, right: 16, backgroundColor: 'rgba(31,27,58,0.72)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7 },
  countText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  sheet: { marginTop: -24, marginHorizontal: 20, backgroundColor: '#fff', borderRadius: 26, padding: 20, gap: 14, borderWidth: 1, borderColor: colors.line },
  categoryChip: { fontSize: 11, color: colors.purple, backgroundColor: colors.pale, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9 },
  inclusive: { backgroundColor: '#E9F9F0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  inclusiveText: { color: colors.greenDark, fontSize: 11, fontWeight: '800' },
  amenity: { alignItems: 'center', gap: 5, backgroundColor: colors.bg, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9 },
  amenityText: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  checkItem: { fontSize: 12, color: colors.ink, backgroundColor: colors.pale, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 9, fontWeight: '600' },
  actionBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 10, padding: 14, paddingBottom: 18, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.line },
  sheetWide: { flex: 1, minHeight: 50 },
  barCall: { flex: 1, minHeight: 52, borderRadius: 16, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  barCallText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  barWhats: { flex: 1, minHeight: 52, borderRadius: 16, backgroundColor: '#25D366', alignItems: 'center', justifyContent: 'center' },
  barWhatsText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});