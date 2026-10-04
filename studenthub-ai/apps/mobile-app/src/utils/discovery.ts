import type { PlaceSummary } from '@studenthub/types';

export type Sort = 'recommended' | 'distance' | 'price';
/** Gender preference applied to PG/hostel stays; '' means no preference. */
export type Gender = '' | 'BOYS' | 'GIRLS' | 'CO_ED';

/**
 * Client-side filtering for the Home list.
 *
 * Gender only narrows PG/hostel listings: food, cafes and services have no
 * gender and stay visible while a stay preference is selected.
 */
export function filterPlaces(places: PlaceSummary[], query: string, category: string, budget: string, sort: Sort, gender: Gender = '') {
  const maximum = budget.trim() === '' ? Infinity : Number(budget);
  return places.filter((place) =>
    (category === 'ALL' || place.category === category) &&
    `${place.name} ${place.category} ${place.address}`.toLowerCase().includes(query.trim().toLowerCase()) &&
    (maximum === Infinity || (place.price !== null && place.price <= maximum)) &&
    (gender === '' || (place.category !== 'PG' && place.category !== 'HOSTEL') || place.gender === gender),
  ).sort((a, b) => sort === 'price'
    ? (a.price ?? Infinity) - (b.price ?? Infinity)
    : sort === 'distance' ? (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity) : b.rating - a.rating);
}

export const priceLabel = (place: PlaceSummary) => place.price === null ? 'Ask for pricing' : `₹${place.price.toLocaleString('en-IN')}`;
export const distanceLabel = (place: PlaceSummary) => place.distanceKm === null ? 'Near campus' : `${place.distanceKm.toFixed(1)} km from campus`;

export function validateVisit(name: string, date: string) {
  if (name.trim().length < 2) return 'Please enter your name (at least 2 characters).';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'Use YYYY-MM-DD for the visit date.';
  const parsed = new Date(`${date}T12:00:00`);
  if (!Number.isFinite(parsed.getTime()) || parsed.getFullYear() !== Number(date.slice(0, 4)) || parsed.getMonth() + 1 !== Number(date.slice(5, 7)) || parsed.getDate() !== Number(date.slice(8, 10))) return 'Please enter a valid calendar date.';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (parsed < today) return 'Choose today or a future date.';
  return null;
}