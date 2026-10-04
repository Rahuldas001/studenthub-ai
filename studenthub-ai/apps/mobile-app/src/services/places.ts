import type { ApiResponse, PlaceDetails, PlaceSummary, PlacesPayload } from '@studenthub/types';

export const COLLEGE = { name: 'Gauhati University', latitude: 26.1535, longitude: 91.6646 };
export const CATEGORIES = ['ALL', 'PG', 'HOSTEL', 'RESTAURANT', 'MESS', 'CAFE', 'LIBRARY', 'PHARMACY', 'GYM', 'ATM', 'GROCERY', 'BUS_STOP'] as const;
export type Category = typeof CATEGORIES[number];
export const LABELS: Record<Category, string> = {
  ALL: 'All', HOSTEL: 'Hostels', PG: 'PGs', RESTAURANT: 'Restaurants', CAFE: 'Cafes', MESS: 'Mess & tiffin', LIBRARY: 'Libraries', PHARMACY: 'Pharmacies', GYM: 'Gyms', ATM: 'ATMs', GROCERY: 'Groceries', BUS_STOP: 'Bus stops',
};

// Small, explicitly fictional offline dataset. The shared API replaces this
// when EXPO_PUBLIC_API_BASE_URL points to the development machine on the LAN.
export const DEMO_PLACES: PlaceSummary[] = [
  { id: 'place-green-valley-pg', name: 'Green Valley PG', category: 'PG', latitude: 26.1589, longitude: 91.666, price: 5500, priceUnit: '/month', gender: 'BOYS', distanceKm: 0.6 },
  { id: 'place-modern-stay-pg', name: 'Modern Stay PG', category: 'PG', latitude: 26.159, longitude: 91.671, price: 6500, priceUnit: '/month', gender: 'GIRLS', distanceKm: 0.9 },
  { id: 'demo-campus-hostel', name: 'Campus Hostel', category: 'HOSTEL', latitude: 26.151, longitude: 91.669, price: 4200, priceUnit: '/month', gender: 'CO_ED', distanceKm: 0.5 },
  { id: 'place-spice-garden', name: 'Spice Garden', category: 'RESTAURANT', latitude: 26.16, longitude: 91.662, price: 180, priceUnit: '/meal', gender: null, distanceKm: 0.8 },
  { id: 'demo-foodies-cafe', name: 'Foodies Cafe', category: 'CAFE', latitude: 26.15, longitude: 91.659, price: 120, priceUnit: '/person', gender: null, distanceKm: 0.7 },
  { id: 'place-annapurna-mess', name: 'Annapurna Mess', category: 'MESS', latitude: 26.1601, longitude: 91.6645, price: 2600, priceUnit: '/month', gender: null, distanceKm: 0.8 },
  { id: 'demo-study-corner', name: 'Campus Study Corner', category: 'LIBRARY', latitude: 26.1548, longitude: 91.6649, price: null, priceUnit: null, gender: null, distanceKm: 0.2 },
  { id: 'demo-campus-pharmacy', name: 'Campus Care Pharmacy', category: 'PHARMACY', latitude: 26.1661, longitude: 91.6652, price: null, priceUnit: null, gender: null, distanceKm: 1.4 },
  { id: 'place-fitzone-gym', name: 'FitZone Gym', category: 'GYM', latitude: 26.175, longitude: 91.669, price: 800, priceUnit: '/month', gender: null, distanceKm: 2.4 },
].map((p) => ({
  ...p,
  category: p.category as PlaceSummary['category'],
  gender: p.gender as PlaceSummary['gender'],
  address: 'Jalukbari, Guwahati, Assam',
  rating: 4.6, reviewCount: 2, verified: false,
  imageUrl: `https://images.unsplash.com/${p.category === 'PG' || p.category === 'HOSTEL' ? 'photo-1522708323590-d24dbb6b0267' : p.category === 'CAFE' ? 'photo-1501339847302-ac426a4a7cbb' : p.category === 'RESTAURANT' || p.category === 'MESS' ? 'photo-1517248135467-4c7edcad34c4' : p.category === 'LIBRARY' ? 'photo-1507842217343-583bb7270b66' : p.category === 'GYM' ? 'photo-1534438327276-14e5300c3a48' : 'photo-1471864190281-a93c3070b6de'}?auto=format&fit=crop&w=800&q=80`,
  facilities: p.category === 'PG' || p.category === 'HOSTEL' ? [{ id: 'wifi', name: 'Wi-Fi', icon: 'Wifi' }, { id: 'meals', name: 'Meals', icon: 'UtensilsCrossed' }, { id: 'study', name: 'Study area', icon: 'BookOpen' }] : [],
}));

/** GET /api/places/:id — null when the API is not configured or it fails. */
export async function fetchPlaceDetails(id: string): Promise<PlaceDetails | null> {
  const base = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '');
  if (!base) return null;
  try {
    const response = await fetch(`${base}/places/${encodeURIComponent(id)}`);
    if (!response.ok) return null;
    const result = await response.json() as ApiResponse<PlaceDetails>;
    if (!result.success) return null;
    return result.data;
  } catch {
    return null;
  }
}

export async function loadPlaces(signal: AbortSignal): Promise<{ places: PlaceSummary[]; source: string }> {
  const base = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '');
  if (!base) return { places: DEMO_PLACES, source: 'Offline demo · fictional listings' };
  const response = await fetch(`${base}/places`, { signal });
  if (!response.ok) throw new Error('API unavailable');
  const result = await response.json() as ApiResponse<PlacesPayload>;
  if (!result.success) throw new Error(result.message);
  return {
    places: result.data.places,
    source: result.data.meta.demoData ? 'API demo · fictional listings' : 'API listings · confirm details with owners',
  };
}