import { useState, type ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import type { PlaceSummary } from '@studenthub/types';
import { useStudent } from '../context/StudentContext';
import { distanceLabel, priceLabel } from '../utils/discovery';

export { priceLabel };

export const colors = { purple: '#6D28D9', purpleDeep: '#241A5E', pink: '#C026D3', pinkSoft: '#F0ABFC', ink: '#1F1B3A', muted: '#8A87A0', line: '#EEEBF5', pale: '#F3EFFF', bg: '#F7F6FB', green: '#22A45D', greenDark: '#15815E', star: '#B45309', heart: '#E0426E' };
export const categoryIcons: Record<string, string> = { ALL: '✦', PG: '⌂', HOSTEL: '▥', RESTAURANT: '♨', CAFE: '☕', MESS: '🍱', LIBRARY: '▤', PHARMACY: '✚', GYM: '◇', ATM: '₹', GROCERY: '▧', BUS_STOP: '▣' };
export const facilityGlyph = (icon: string | null): string => icon === null ? '✦' : ({ Wifi: '📶', Meals: '🍱', UtensilsCrossed: '🍱', BookOpen: '📚', Laundry: '🧺', Parking: '🅿️', Ac: '❄️', Power: '🔌' } as Record<string, string>)[icon] ?? '✦';
export const genderLabel = (gender: string): string => gender === 'CO_ED' ? 'Co-ed' : gender === 'BOYS' ? 'Boys' : 'Girls';
export function Button({ title, onPress, secondary = false, disabled = false }: { title: string; onPress: () => void; secondary?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} accessibilityState={{ disabled }} onPress={onPress} style={({ pressed }) => [ui.button, secondary && ui.secondary, { opacity: disabled ? 0.45 : pressed ? 0.75 : 1 }]}>
    <Text style={[ui.buttonText, secondary && { color: colors.purple }]}>{title}</Text>
  </Pressable>;
}
export function IconButton({ icon, label, onPress, active = false }: { icon: string; label: string; onPress: () => void; active?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[ui.iconButton, active && { backgroundColor: colors.pale }]}><Text style={{ fontSize: 23, color: colors.purple }}>{icon}</Text></Pressable>;
}
export function Chip({ label, selected = false, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[ui.chip, selected && { backgroundColor: colors.purple, borderColor: colors.purple }]}><Text style={[ui.chipText, selected && { color: '#fff' }]}>{label}</Text></Pressable>;
}
export function Section({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  return <View style={ui.between}><Text style={ui.heading}>{title}</Text>{action && onPress && <Pressable accessibilityRole="button" onPress={onPress} style={ui.textAction}><Text style={ui.link}>{action} →</Text></Pressable>}</View>;
}
export function Empty({ icon = '⌕', title, body, children }: { icon?: string; title: string; body: string; children?: ReactNode }) {
  return <View style={ui.empty}><Text style={ui.emptyIcon}>{icon}</Text><Text style={ui.heading}>{title}</Text><Text style={[ui.body, { textAlign: 'center' }]}>{body}</Text>{children}</View>;
}
export function PlaceImage({ uri, style }: { uri: string; style?: StyleProp<ViewStyle> }) {
  const [failed, setFailed] = useState(false);
  return <View style={[{ backgroundColor: colors.pale, overflow: 'hidden' }, style]}>{failed ? <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 40, color: colors.purple }}>⌂</Text><Text style={ui.caption}>Image unavailable</Text></View> : <Image accessibilityLabel="Listing image" source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => setFailed(true)} />}</View>;
}
export function PlaceCard({ place, onPress, compact = false }: { place: PlaceSummary; onPress: () => void; compact?: boolean }) {
  const { savedIds, toggleSaved } = useStudent();
  const saved = savedIds.has(place.id);
  return <View style={[ui.card, compact && { width: 265 }]}>
    <View><Pressable accessibilityRole="button" accessibilityLabel={`View ${place.name}`} onPress={onPress}><PlaceImage key={place.imageUrl} uri={place.imageUrl} style={{ height: compact ? 146 : 178 }} /></Pressable>
      <View style={ui.imageBadge}><Text style={ui.badgeText}>{categoryIcons[place.category]} {place.gender ? place.gender === 'CO_ED' ? 'Co-ed' : place.gender === 'BOYS' ? 'Boys' : 'Girls' : place.category.replace('_', ' ')} · {place.category}</Text></View>
      <View style={{ position: 'absolute', top: 10, right: 10 }}><IconButton label={`${saved ? 'Unsave' : 'Save'} ${place.name}`} icon={saved ? '♥' : '♡'} active={saved} onPress={() => toggleSaved(place)} /></View>
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={`View details for ${place.name}`} onPress={onPress} style={{ padding: 15, gap: 9 }}>
      <View style={ui.between}><Text numberOfLines={1} style={[ui.cardTitle, { flex: 1 }]}>{place.name}</Text><Text style={ui.rating}>★ {place.rating.toFixed(1)}</Text></View>
      <Text style={ui.caption}>⌖ {distanceLabel(place)}</Text>
      <View style={[ui.row, { flexWrap: 'wrap', gap: 6 }]}>{place.facilities.slice(0, 3).map((facility) => <Text key={facility.id} style={ui.facility}>{facility.name}</Text>)}</View>
      <View style={ui.between}><Text style={ui.price}>{priceLabel(place)}<Text style={ui.caption}> {place.priceUnit}</Text></Text><Text style={ui.link}>View →</Text></View>
    </Pressable>
  </View>;
}
/** Mockup results list item: thumbnail on the left, details on the right. */
export function ResultCard({ place, onPress }: { place: PlaceSummary; onPress: () => void }) {
  const { savedIds, toggleSaved } = useStudent();
  const saved = savedIds.has(place.id);
  return <Pressable accessibilityRole="button" accessibilityLabel={`View ${place.name}`} onPress={onPress} style={({ pressed }) => [ui.resultCard, { opacity: pressed ? 0.9 : 1 }]}>
    <PlaceImage uri={place.imageUrl} style={ui.resultThumb} />
    <View style={{ flex: 1, gap: 6 }}>
      <View style={ui.between}>
        <Text numberOfLines={1} style={[ui.cardTitle, { flexShrink: 1 }]}>{place.name}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`${saved ? 'Unsave' : 'Save'} ${place.name}`} onPress={() => toggleSaved(place)} hitSlop={8}>
          <Text style={{ fontSize: 20, color: saved ? colors.heart : colors.muted }}>{saved ? '♥' : '♡'}</Text>
        </Pressable>
      </View>
      <Text numberOfLines={1} style={ui.caption}>{categoryIcons[place.category]} {place.category}{place.gender ? ` · ${genderLabel(place.gender)}` : ''} · ⌖ {distanceLabel(place)}</Text>
      <View style={ui.row}><Text style={ui.rating}>★ {place.rating.toFixed(1)}</Text><Text style={ui.facility}>{place.reviewCount} reviews</Text></View>
      <Text style={ui.price}>{priceLabel(place)}{place.priceUnit ? <Text style={ui.caption}> {place.priceUnit}</Text> : null}</Text>
    </View>
  </Pressable>;
}
export const ui = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  content: { padding: 20, gap: 20, paddingBottom: 32 },
  heading: { fontSize: 19, color: colors.ink, fontWeight: '800', flexShrink: 1 },
  title: { fontSize: 28, color: colors.ink, fontWeight: '800', letterSpacing: -0.8 },
  body: { color: colors.muted, fontSize: 14, lineHeight: 22 },
  caption: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  link: { color: colors.purple, fontWeight: '700', fontSize: 12 },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 22, overflow: 'hidden' },
  panel: { backgroundColor: '#fff', borderRadius: 22, padding: 20, gap: 14, borderWidth: 1, borderColor: colors.line },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  button: { backgroundColor: colors.purple, borderRadius: 15, paddingHorizontal: 20, minHeight: 50, alignItems: 'center', justifyContent: 'center' },
  secondary: { backgroundColor: colors.pale },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  iconButton: { width: 44, height: 44, backgroundColor: '#fff', borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  chip: { minHeight: 44, paddingHorizontal: 17, borderRadius: 24, justifyContent: 'center', borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff' },
  chipText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  textAction: { minHeight: 44, justifyContent: 'center' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 15, minHeight: 50, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: colors.ink },
  price: { color: colors.purple, fontSize: 18, fontWeight: '800' },
  rating: { fontSize: 12, fontWeight: '700', color: '#946600', backgroundColor: '#FFF6DC', padding: 5, borderRadius: 7 },
  facility: { fontSize: 10, color: colors.muted, backgroundColor: colors.bg, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6 },
  imageBadge: { position: 'absolute', top: 12, left: 12, backgroundColor: '#fff', borderRadius: 8, padding: 7 },
  badgeText: { fontSize: 10, color: colors.purple, fontWeight: '700' },
  empty: { padding: 28, alignItems: 'center', gap: 16, backgroundColor: '#fff', borderRadius: 24 },
  emptyIcon: { fontSize: 44, color: colors.purple, backgroundColor: colors.pale, borderRadius: 22, paddingHorizontal: 24, paddingVertical: 12 },
  resultCard: { flexDirection: 'row', backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 10, gap: 12 },
  resultThumb: { width: 92, height: 92, borderRadius: 14 },
});