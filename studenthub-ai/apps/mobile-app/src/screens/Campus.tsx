import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, colors, ui } from '../components/ui';
import { useStudent } from '../context/StudentContext';

/** Demo seed campuses; student counts mirror the sample listings bundle. */
const COLLEGES = [
  { id: 'gauhati', name: 'Gauhati University', city: 'Guwahati, Assam', students: '14,600 students nearby' },
  { id: 'adtu', name: 'ASSAM DOWN TOWN UNIVERSITY', city: 'Guwahati, Assam', students: '21,000 students nearby' },
  { id: 'cotton', name: 'Cotton University', city: 'Guwahati, Assam', students: '18,200 students nearby' },
  { id: 'dibrugarh', name: 'Dibrugarh University', city: 'Dibrugarh, Assam', students: '9,400 students nearby' },
] as const;

/**
 * "Select your college" picker reached from the Home location row.
 *
 * The selection is persisted with the rest of the device state so the chosen
 * campus survives app restarts; counts are demo figures from the sample data.
 */
export default function Campus({ onBack, onContinue }: { onBack: () => void; onContinue: () => void }) {
  const { campus, setCampus } = useStudent();
  const [query, setQuery] = useState('');
  const results = useMemo(() => COLLEGES.filter((college) => `${college.name} ${college.city}`.toLowerCase().includes(query.trim().toLowerCase())), [query]);
  const pick = (name: string) => setCampus(name);
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
    <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={styles.back}><Text style={{ fontSize: 22, color: colors.ink }}>←</Text></Pressable>
    <View style={[ui.row, styles.search]}>
      <Text style={{ color: colors.muted, fontSize: 17 }}>⌕</Text>
      <TextInput accessibilityLabel="Search college or city" value={query} onChangeText={setQuery} placeholder="Search college or city…" placeholderTextColor={colors.muted} style={styles.searchInput} returnKeyType="search" />
    </View>
    <Text style={ui.title}>Select your college</Text>
    <View style={{ gap: 12 }}>
      {results.map((college) => {
        const selected = campus === college.name;
        return <Pressable key={college.id} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => pick(college.name)} style={[styles.card, selected && styles.cardSelected]}>
          <View style={styles.pin}><Text style={{ fontSize: 16, color: colors.purple }}>📍</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardName}>{college.name}</Text>
            <Text style={ui.caption}>{college.city}</Text>
            {selected && <View style={styles.badge}><Text style={styles.badgeText}>{college.students}</Text></View>}
          </View>
          <View style={[styles.check, selected && styles.checkOn]}>{selected && <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>✓</Text>}</View>
        </Pressable>;
      })}
      {results.length === 0 && <Text style={ui.caption}>No college matches "{query}". Try a city name like Guwahati.</Text>}
    </View>
    <Button title="Continue" onPress={onContinue} />
    <Text style={styles.note}>Student counts are sample data for this demo.</Text>
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { padding: 24, gap: 16, paddingBottom: 40, width: '100%', maxWidth: 520, alignSelf: 'center' },
  back: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  search: { backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 14, minHeight: 52, gap: 8, borderWidth: 1, borderColor: colors.line },
  searchInput: { flex: 1, color: colors.ink, fontSize: 14, minHeight: 30 },
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