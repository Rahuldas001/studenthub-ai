import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, colors, ui } from '../components/ui';
import { useStudent } from '../context/StudentContext';
import { useDeviceLocation } from '../services/location';
import { nearestCollege } from '../services/places';

/**
 * "Select your location" picker reached from the Home location row.
 *
 * Lists the launch colleges served by the API (Guwahati, Dhubri, Dibrugarh, …)
 * and can jump to the nearest one from a device fix. The selection is persisted
 * with the rest of the device state, so discovery stays centred on that city
 * across launches.
 */
export default function Campus({ onBack, onContinue }: { onBack: () => void; onContinue: () => void }) {
  const { campus, setCampus, colleges, location, chooseLocation } = useStudent();
  const deviceLocation = useDeviceLocation();
  const [query, setQuery] = useState('');
  const results = useMemo(() => colleges.filter((college) => `${college.name} ${college.city}`.toLowerCase().includes(query.trim().toLowerCase())), [colleges, query]);

  const pick = (college: { id: string; name: string; city: string; latitude: number; longitude: number }) => {
    setCampus(college.name);
    chooseLocation({ city: college.city, latitude: college.latitude, longitude: college.longitude });
  };

  /** Turns the current GPS fix into the closest launch city. */
  const useMyLocation = () => {
    if (!deviceLocation?.granted) return;
    const nearest = nearestCollege(colleges, deviceLocation.latitude, deviceLocation.longitude);
    if (nearest) pick(nearest);
  };

  const selected = (college: { name: string; city: string }) => campus === college.name || (!campus && location.city === college.city);

  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
    <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={styles.back}><Text style={{ fontSize: 22, color: colors.ink }}>←</Text></Pressable>
    <View style={[ui.row, styles.search]}>
      <Text style={{ color: colors.muted, fontSize: 17 }}>⌕</Text>
      <TextInput accessibilityLabel="Search college or city" value={query} onChangeText={setQuery} placeholder="Search college or city…" placeholderTextColor={colors.muted} style={styles.searchInput} returnKeyType="search" />
    </View>
    <Text style={ui.title}>Select your location</Text>
    <Text style={ui.body}>We show hostels, PGs, restaurants and services near you.</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Use my current location" accessibilityState={{ disabled: !deviceLocation?.granted }} onPress={useMyLocation} disabled={!deviceLocation?.granted} style={[styles.gps, !deviceLocation?.granted && { opacity: 0.55 }]}>
      <Text style={{ color: colors.purple, fontSize: 16 }}>◎</Text>
      <Text style={{ color: colors.purple, fontWeight: '700', fontSize: 14 }}>{deviceLocation?.granted ? 'Use my current location' : 'Location access off — pick a city below'}</Text>
    </Pressable>
    <View style={{ gap: 12 }}>
      {results.map((college) => {
        const active = selected(college);
        return <Pressable key={college.id} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => pick(college)} style={[styles.card, active && styles.cardSelected]}>
          <View style={styles.pin}><Text style={{ fontSize: 16, color: colors.purple }}>📍</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardName}>{college.name}</Text>
            <Text style={ui.caption}>{college.city}, {college.state}</Text>
            {active && <View style={styles.badge}><Text style={styles.badgeText}>Showing places near here</Text></View>}
          </View>
          <View style={[styles.check, active && styles.checkOn]}>{active && <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>✓</Text>}</View>
        </Pressable>;
      })}
      {results.length === 0 && <Text style={ui.caption}>No college matches "{query}". Try a city name like Guwahati or Dhubri.</Text>}
    </View>
    <Button title="Continue" onPress={onContinue} />
    <Text style={styles.note}>Showing places near {location.city}. Change it any time from Home.</Text>
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { padding: 24, gap: 16, paddingBottom: 40, width: '100%', maxWidth: 520, alignSelf: 'center' },
  back: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  search: { backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 14, minHeight: 52, gap: 8, borderWidth: 1, borderColor: colors.line },
  searchInput: { flex: 1, color: colors.ink, fontSize: 14, minHeight: 30 },
  gps: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, borderRadius: 16, borderWidth: 1.5, borderColor: colors.purple, backgroundColor: colors.pale },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 18, borderWidth: 2, borderColor: colors.line, padding: 14 },
  cardSelected: { borderColor: colors.purple },
  pin: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center' },
  cardName: { fontSize: 15, fontWeight: '800', color: colors.ink },
  badge: { alignSelf: 'flex-start', marginTop: 6, backgroundColor: colors.pale, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 4 },
  badgeText: { color: colors.purple, fontSize: 11, fontWeight: '800' },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.purple, borderColor: colors.purple },
  note: { color: colors.muted, fontSize: 11, textAlign: 'center' },
});