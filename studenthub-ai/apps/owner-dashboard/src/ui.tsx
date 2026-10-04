import { useState, type ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

/**
 * Shared visual language for the owner dashboard.
 *
 * The palette and styles mirror `apps/mobile-app/src/components/ui.tsx` so the
 * two frontends look like one product; only the pieces the dashboard renders
 * live here (no place cards, imagery, or discovery glyphs).
 */
export const colors = { purple: '#6D28D9', purpleDeep: '#241A5E', pink: '#C026D3', pinkSoft: '#F0ABFC', ink: '#1F1B3A', muted: '#8A87A0', line: '#EEEBF5', pale: '#F3EFFF', bg: '#F7F6FB', green: '#22A45D', greenDark: '#15815E', star: '#B45309', heart: '#E0426E' };

export function Button({ title, onPress, secondary = false, disabled = false }: { title: string; onPress: () => void; secondary?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} accessibilityState={{ disabled }} onPress={onPress} style={({ pressed }) => [ui.button, secondary && ui.secondary, { opacity: disabled ? 0.45 : pressed ? 0.75 : 1 }]}>
    <Text style={[ui.buttonText, secondary && { color: colors.purple }]}>{title}</Text>
  </Pressable>;
}

export function Chip({ label, selected = false, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[ui.chip, selected && { backgroundColor: colors.purple, borderColor: colors.purple }]}><Text style={[ui.chipText, selected && { color: '#fff' }]}>{label}</Text></Pressable>;
}

/**
 * Cover photo for a listing card, with an offline fallback.
 *
 * The standalone dashboard renders on the web only, so the failure path is a
 * plain glyph panel instead of the student app's "image unavailable" state.
 */
export function PlaceImage({ uri, style }: { uri: string; style?: StyleProp<ViewStyle> }) {
  const [failed, setFailed] = useState(false);
  return <View style={[{ backgroundColor: colors.pale, overflow: 'hidden' }, style]}>
    {failed
      ? <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 38, color: colors.purple }}>🏪</Text></View>
      : <Image accessibilityLabel="Listing image" source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => setFailed(true)} />}
  </View>;
}

/** Shared "nothing here yet" panel: icon, title, explainer and an action. */
export function Empty({ icon = '⌕', title, body, children }: { icon?: string; title: string; body: string; children?: ReactNode }) {
  return <View style={ui.empty}><Text style={ui.emptyIcon}>{icon}</Text><Text style={ui.heading}>{title}</Text><Text style={[ui.body, { textAlign: 'center' }]}>{body}</Text>{children}</View>;
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
  textAction: { minHeight: 44, justifyContent: 'center' },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 22, overflow: 'hidden' },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  panel: { backgroundColor: '#fff', borderRadius: 22, padding: 20, gap: 14, borderWidth: 1, borderColor: colors.line },
  button: { backgroundColor: colors.purple, borderRadius: 15, paddingHorizontal: 20, minHeight: 50, alignItems: 'center', justifyContent: 'center' },
  secondary: { backgroundColor: colors.pale },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  chip: { minHeight: 44, paddingHorizontal: 17, borderRadius: 24, justifyContent: 'center', borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff' },
  chipText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 15, minHeight: 50, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: colors.ink },
  price: { color: colors.purple, fontSize: 18, fontWeight: '800' },
  rating: { fontSize: 12, fontWeight: '700', color: '#946600', backgroundColor: '#FFF6DC', padding: 5, borderRadius: 7 },
  facility: { fontSize: 10, color: colors.muted, backgroundColor: colors.bg, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6 },
  empty: { padding: 28, alignItems: 'center', gap: 16, backgroundColor: '#fff', borderRadius: 24, borderWidth: 1, borderColor: colors.line },
  emptyIcon: { fontSize: 44, color: colors.purple, backgroundColor: colors.pale, borderRadius: 22, paddingHorizontal: 24, paddingVertical: 12 },
});
