import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { PlaceSummary } from '@studenthub/types';
import HomeMap from '../components/HomeMap';
import { Button, Chip, Empty, IconButton, PlaceCard, ResultCard, Section, categoryIcons, colors, ui } from '../components/ui';
import { useStudent } from '../context/StudentContext';
import { useDeviceLocation } from '../services/location';
import { CATEGORIES, COLLEGE, LABELS, type Category } from '../services/places';
import { filterPlaces, type Gender, type Sort } from '../utils/discovery';

/** Tile colours for the "Near <college>" category cards. */
const tileColors: Record<string, { bg: string; fg: string }> = {
  HOSTEL: { bg: '#E3ECFF', fg: '#2563EB' },
  PG: { bg: '#EFE6FE', fg: '#6D28D9' },
  RESTAURANT: { bg: '#FDE4EF', fg: '#DB2777' },
  CAFE: { bg: '#FDF0D9', fg: '#B45309' },
};
const TILES: Category[] = ['HOSTEL', 'PG', 'RESTAURANT', 'CAFE'];

export default function Discover({ onPlace, onAssistant, onCampus }: { onPlace: (place: PlaceSummary) => void; onAssistant: () => void; onCampus: () => void }) {
  const { places, loading, source, refresh, name, location } = useStudent();
  const deviceLocation = useDeviceLocation();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category>('ALL');
  const [budget, setBudget] = useState('');
  const [sort, setSort] = useState<Sort>('recommended');
  const [gender, setGender] = useState<Gender>('');
  const [filters, setFilters] = useState(false);
  const [map, setMap] = useState(true);
  const results = useMemo(() => filterPlaces(places, query, category, budget, sort, gender), [places, query, category, budget, sort, gender]);
  const counts = useMemo(() => {
    const tally: Partial<Record<string, number>> = {};
    for (const place of places) tally[place.category] = (tally[place.category] ?? 0) + 1;
    return tally;
  }, [places]);
  const popular = useMemo(() => [...places].sort((a, b) => b.rating - a.rating).slice(0, 6), [places]);
  const narrowed = query !== '' || category !== 'ALL' || budget !== '' || gender !== '';
  const reset = () => { setQuery(''); setCategory('ALL'); setBudget(''); setSort('recommended'); setGender(''); };
  return <ScrollView keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.purple} />} contentContainerStyle={ui.content}>
    <View style={ui.between}>
      <View>
        <Text style={styles.greeting}>Hello, {name.trim().split(' ')[0] || 'student'} 👋</Text>
        <Text style={ui.caption}>Let's find your place around campus</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={onAssistant} style={styles.bell}>
        <Text style={{ fontSize: 18, color: colors.ink }}>🔔</Text>
        <View style={styles.bellDot} />
      </Pressable>
    </View>

    <Pressable accessibilityRole="button" onPress={onCampus} style={[ui.row, { alignSelf: 'flex-start' }]}>
      <Text style={{ color: colors.purple, fontSize: 16 }}>⌖</Text>
      <Text style={styles.location}>{location.city}, Assam</Text>
      <Text style={{ color: colors.muted, fontSize: 13 }}>⌄</Text>
    </Pressable>

    <View style={ui.row}>
      <View style={[styles.search, ui.row]}>
        <Text style={{ color: colors.muted, fontSize: 18 }}>⌕</Text>
        <TextInput value={query} onChangeText={setQuery} accessibilityLabel="Search places" placeholder="Search for PG, Hostel, Food, etc." placeholderTextColor={colors.muted} returnKeyType="search" style={styles.searchInput} />
        {query !== '' && <IconButton label="Clear search" icon="×" onPress={() => setQuery('')} />}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Toggle search filters" onPress={() => setFilters(!filters)} style={styles.filterButton}>
        <Text style={{ color: '#fff', fontSize: 17 }}>☷</Text>
      </Pressable>
    </View>

    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{CATEGORIES.map((item) => <Chip key={item} label={`${categoryIcons[item]}  ${LABELS[item]}`} selected={category === item} onPress={() => setCategory(item)} />)}</ScrollView>

    {filters && <View style={ui.panel}><Text style={ui.heading}>Make it your kind of place</Text><Text style={ui.caption}>Maximum price (₹). Prices may be per meal, month or person; choose a category to compare.</Text><TextInput accessibilityLabel="Maximum price in rupees" placeholder="Any budget" placeholderTextColor={colors.muted} keyboardType="number-pad" value={budget} onChangeText={(value) => setBudget(value.replace(/[^0-9]/g, '').slice(0, 7))} style={ui.input} /><View style={[ui.row, { flexWrap: 'wrap' }]}>{(['recommended', 'distance', 'price'] as Sort[]).map((item) => <Chip key={item} label={item === 'recommended' ? 'Top rated' : item === 'distance' ? 'Nearest' : 'Price: low first'} selected={sort === item} onPress={() => setSort(item)} />)}</View><Text style={[ui.caption, { marginTop: 4 }]}>Stay preference (PGs & hostels) — food and services stay visible.</Text><View style={[ui.row, { flexWrap: 'wrap' }]}>{(['', 'BOYS', 'GIRLS', 'CO_ED'] as Gender[]).map((item) => <Chip key={item || 'any'} label={item === '' ? 'Any' : item === 'BOYS' ? 'Boys' : item === 'GIRLS' ? 'Girls' : 'Co-ed'} selected={gender === item} onPress={() => setGender(item)} />)}</View><Button title="Reset filters" secondary onPress={reset} /></View>}

    <View style={ui.between}>
      <View><Text style={ui.heading}>Near {COLLEGE.name}</Text><Text style={ui.caption}>Explore nearby</Text></View>
      <View style={ui.row}><Chip label="Map" selected={map} onPress={() => setMap(true)} /><Chip label="List" selected={!map} onPress={() => setMap(false)} /></View>
    </View>
    {map && <View style={styles.mapCard}><HomeMap places={results} userLocation={deviceLocation} /></View>}
    <Text accessibilityLiveRegion="polite" style={ui.caption}>{source} · {results.length} places{loading ? ' · refreshing' : ''}{deviceLocation ? (deviceLocation.granted ? ' · 📍 centered on you' : ' · 📍 location off, showing campus') : ''}</Text>
    {loading && <ActivityIndicator color={colors.purple} accessibilityLabel="Refreshing listings" />}

    {!narrowed && <View style={[ui.row, { flexWrap: 'wrap' }]}>{TILES.map((item) => <Pressable key={item} accessibilityRole="button" accessibilityLabel={`${LABELS[item]}, ${counts[item] ?? 0} places`} onPress={() => { setCategory(item); setMap(false); }} style={styles.tile}>
      <View style={[styles.tileIcon, { backgroundColor: tileColors[item].bg }]}><Text style={{ fontSize: 20, color: tileColors[item].fg }}>{categoryIcons[item]}</Text></View>
      <Text style={styles.tileLabel}>{LABELS[item]}</Text>
      <Text style={styles.tileCount}>{counts[item] ?? 0}</Text>
    </Pressable>)}</View>}

    <Pressable accessibilityRole="button" accessibilityLabel="Open AI assistant" onPress={onAssistant} style={{ borderRadius: 22 }}>
      <LinearGradient colors={[colors.purpleDeep, '#5B33C9', colors.pink]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.aiCard}>
        <View style={[ui.between, { width: '100%' }]}>
          <View style={[ui.row, { flexShrink: 1 }]}>
            <View style={styles.aiIcon}><Text style={{ fontSize: 18 }}>✦</Text></View>
            <Text style={styles.aiTitle}>AI Assistant</Text>
            <Text style={styles.aiBadge}>BETA</Text>
          </View>
          <View style={styles.aiChat}><Text style={{ fontSize: 18 }}>💬</Text></View>
        </View>
        <Text style={styles.aiBody}>Ask anything. Find the best places for you in seconds!</Text>
      </LinearGradient>
    </Pressable>

    {narrowed || !map ? <>
      <Section title={category === 'ALL' ? 'Recommended for you' : `${LABELS[category]} near you`} action={narrowed ? 'Clear' : undefined} onPress={reset} />
      {results.length === 0
        ? <Empty title="No places found" body="Try another category, a higher budget, or a different search."><Button title="Show all places" onPress={reset} /></Empty>
        : <View style={{ gap: 12 }}>{results.map((place) => <ResultCard key={place.id} place={place} onPress={() => onPlace(place)} />)}</View>}
    </> : <>
      <Section title="Popular near you" action="View all" onPress={reset} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: 4 }}>{popular.map((place) => <PlaceCard key={place.id} place={place} compact onPress={() => onPlace(place)} />)}</ScrollView>
    </>}

    <Text style={[ui.caption, { textAlign: 'center' }]}>Made for student life. Built around you.{'\n'}{location.city}, Assam ♡</Text>
  </ScrollView>;
}

const styles = StyleSheet.create({
  greeting: { fontSize: 22, fontWeight: '800', color: colors.ink, letterSpacing: -0.4 },
  bell: { width: 44, height: 44, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  bellDot: { position: 'absolute', top: 10, right: 11, width: 9, height: 9, borderRadius: 5, backgroundColor: '#E0426E', borderWidth: 1.5, borderColor: '#fff' },
  location: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  search: { flex: 1, backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 14, minHeight: 52, gap: 8, borderWidth: 1, borderColor: colors.line },
  searchInput: { flex: 1, color: colors.ink, fontSize: 14, minHeight: 30 },
  filterButton: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center' },
  mapCard: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff' },
  tile: { flexGrow: 1, flexBasis: '44%', backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 6, alignItems: 'flex-start' },
  tileIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { fontSize: 14, fontWeight: '800', color: colors.ink },
  tileCount: { fontSize: 12, color: colors.muted },
  aiCard: { borderRadius: 22, padding: 18, gap: 10 },
  aiIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  aiTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  aiBadge: { color: '#fff', backgroundColor: 'rgba(255,255,255,0.22)', fontSize: 10, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
  aiChat: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  aiBody: { color: '#EEE6FF', fontSize: 13, lineHeight: 20 },
});
