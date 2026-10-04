import type { College } from '@studenthub/types';

/**
 * Real reference data for a fresh install.
 *
 * These are genuine institutions and a generic amenity vocabulary - NOT fake
 * businesses. Actual listings come from OpenStreetMap via `prisma/import-osm.ts`.
 */

/** Campuses that anchor the launch geography (used by `prisma/seed.ts`). */
export const LAUNCH_COLLEGES: College[] = [
  { id: 'college-gauhati-university', name: 'Gauhati University', city: 'Guwahati', state: 'Assam', latitude: 26.1535, longitude: 91.6646 },
  { id: 'college-adtu', name: 'Assam Down Town University', city: 'Guwahati', state: 'Assam', latitude: 26.1249, longitude: 91.6563 },
  { id: 'college-cotton', name: 'Cotton University', city: 'Guwahati', state: 'Assam', latitude: 26.1848, longitude: 91.7465 },
  { id: 'college-dibrugarh', name: 'Dibrugarh University', city: 'Dibrugarh', state: 'Assam', latitude: 27.4728, longitude: 94.9119 },
  { id: 'college-dhubri', name: 'Dhubri College', city: 'Dhubri', state: 'Assam', latitude: 26.0207, longitude: 89.9753 },
];

/** Amenity vocabulary owners can attach to a listing (name + Lucide icon). */
export const FACILITY_CATALOGUE: { name: string; icon: string | null }[] = [
  { name: 'Wi-Fi', icon: 'Wifi' },
  { name: 'Meals', icon: 'UtensilsCrossed' },
  { name: 'AC', icon: 'Snowflake' },
  { name: 'Laundry', icon: 'Shirt' },
  { name: 'Power Backup', icon: 'BatteryCharging' },
  { name: 'CCTV', icon: 'Cctv' },
  { name: 'Parking', icon: 'Bike' },
  { name: 'Study Area', icon: 'BookOpen' },
];
