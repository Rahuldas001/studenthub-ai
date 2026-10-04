import type {
  PlaceCategory,
  PlaceStatus,
  PlaceSummary,
} from '@studenthub/types';

/**
 * DEMO DATA — development only.
 *
 * Used by the API when PostgreSQL is not running yet so the student app can be
 * built end to end. Every listing is fictional; coordinates are realistic for
 * Jalukbari / Gauhati University but nothing here is a verified real business.
 *
 * This mirrors `backend/prisma/seed.ts` (the database version of the same
 * dataset) and the offline fallback in the student app.
 */

export const DEMO_COLLEGE = {
  id: 'college-gauhati-university',
  name: 'Gauhati University',
  city: 'Guwahati',
  state: 'Assam',
  latitude: 26.1535,
  longitude: 91.6646,
} as const;

export type DemoFacility = { id: string; name: string; icon: string | null };

/**
 * A demo place carries its full detail plus the facility keys used to resolve
 * Facility rows, so a single record can serve both list and detail endpoints.
 *
 * `facilities` is omitted from `PlaceSummary` because this dataset stores
 * facility *keys* (`facilityKeys`) which `demoFacilitiesFor()` resolves.
 */
export type DemoPlace = Omit<PlaceSummary, 'facilities'> & {
  description: string;
  status: PlaceStatus;
  phone: string | null;
  facilityKeys: string[];
};

const FACILITIES: Record<string, DemoFacility> = {
  wifi: { id: 'fac-wifi', name: 'Wi-Fi', icon: 'Wifi' },
  meals: { id: 'fac-meals', name: 'Meals', icon: 'UtensilsCrossed' },
  ac: { id: 'fac-ac', name: 'AC', icon: 'Snowflake' },
  laundry: { id: 'fac-laundry', name: 'Laundry', icon: 'Shirt' },
  power: { id: 'fac-power', name: 'Power Backup', icon: 'BatteryCharging' },
  cctv: { id: 'fac-cctv', name: 'CCTV', icon: 'Cctv' },
  parking: { id: 'fac-parking', name: 'Parking', icon: 'Bike' },
  study: { id: 'fac-study', name: 'Study Area', icon: 'BookOpen' },
};

/**
 * Facility catalogue (name + Lucide icon) used to seed the `Facility` table and
 * to build the many-to-many links from `facilityKeys`.
 */
export const DEMO_FACILITIES: DemoFacility[] = Object.values(FACILITIES);

/** Deterministic placeholder imagery so nothing 404s in development. */
function images(seed: string, count = 3): string[] {
  return Array.from(
    { length: count },
    (_, index) => `https://picsum.photos/seed/${seed}-${index + 1}/800/600`,
  );
}

type DemoPlaceInput = {
  id: string;
  category: PlaceCategory;
  name: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  price: number | null;
  priceUnit?: string | null;
  rating: number;
  reviewCount: number;
  gender?: PlaceSummary['gender'];
  verified?: boolean;
  phone?: string | null;
  facilityKeys?: string[];
};

function place(input: DemoPlaceInput): DemoPlace {
  return {
    id: input.id,
    category: input.category,
    name: input.name,
    description: input.description,
    address: input.address,
    latitude: input.latitude,
    longitude: input.longitude,
    price: input.price,
    priceUnit: input.priceUnit ?? (input.price === null ? null : '/month'),
    rating: input.rating,
    reviewCount: input.reviewCount,
    distanceKm: null,
    imageUrl: images(input.id)[0],
    gender: input.gender ?? null,
    verified: input.verified ?? false,
    status: 'ACTIVE',
    phone: input.phone ?? null,
    facilityKeys: input.facilityKeys ?? [],
  };
}

export const DEMO_PLACES: DemoPlace[] = [
  place({
    id: 'place-green-valley-pg',
    category: 'PG',
    name: 'Green Valley PG',
    description:
      'Fully furnished PG with modern amenities, walking distance from the university.',
    address: 'Gopinath Bordoloi Nagar, Jalukbari, Guwahati',
    latitude: 26.1589,
    longitude: 91.666,
    price: 5500,
    rating: 4.6,
    reviewCount: 128,
    gender: 'BOYS',
    verified: true,
    phone: '+91 90000 00001',
    facilityKeys: ['wifi', 'meals', 'ac', 'laundry', 'power', 'cctv'],
  }),
  place({
    id: 'place-modern-stay-pg',
    category: 'PG',
    name: 'Modern Stay PG',
    description:
      'Newly built rooms with attached bathrooms, study tables and 24x7 water supply.',
    address: 'Adingiri Path, Jalukbari, Guwahati',
    latitude: 26.1612,
    longitude: 91.6689,
    price: 6500,
    rating: 4.4,
    reviewCount: 86,
    gender: 'GIRLS',
    verified: true,
    phone: '+91 90000 00002',
    facilityKeys: ['wifi', 'meals', 'ac', 'laundry', 'cctv'],
  }),
  place({
    id: 'place-north-point-pg',
    category: 'PG',
    name: 'North Point PG',
    description: 'Budget-friendly PG with home-style Assamese meals and Wi-Fi.',
    address: 'Near GU Gate 2, Jalukbari, Guwahati',
    latitude: 26.1568,
    longitude: 91.6632,
    price: 4200,
    rating: 4.1,
    reviewCount: 143,
    gender: 'BOYS',
    phone: '+91 90000 00003',
    facilityKeys: ['wifi', 'meals', 'laundry'],
  }),
  place({
    id: 'place-comfort-living-pg',
    category: 'PG',
    name: 'Comfort Living PG',
    description:
      'Premium co-ed PG with AC rooms, study lounge, laundry and power backup.',
    address: 'Gopinath Bordoloi Nagar, Jalukbari, Guwahati',
    latitude: 26.1666,
    longitude: 91.6701,
    price: 7800,
    rating: 4.7,
    reviewCount: 64,
    gender: 'CO_ED',
    verified: true,
    phone: '+91 90000 00004',
    facilityKeys: ['wifi', 'meals', 'ac', 'laundry', 'power', 'study'],
  }),
  place({
    id: 'place-university-home-pg',
    category: 'PG',
    name: 'University Home PG',
    description: 'Quiet rooms for serious students, five minutes from the campus.',
    address: 'Jalukbari Chariali, Guwahati',
    latitude: 26.1502,
    longitude: 91.6607,
    price: 5000,
    rating: 4.3,
    reviewCount: 57,
    gender: 'GIRLS',
    phone: '+91 90000 00005',
    facilityKeys: ['wifi', 'meals', 'power', 'study'],
  }),
  place({
    id: 'place-gaushala-hostel',
    category: 'HOSTEL',
    name: 'Brahmputra Boys Hostel',
    description: 'Hostel-style shared rooms with monthly mess included.',
    address: 'Jalukbari, Guwahati',
    latitude: 26.1487,
    longitude: 91.6665,
    price: 3200,
    rating: 3.9,
    reviewCount: 210,
    gender: 'BOYS',
    facilityKeys: ['meals', 'wifi', 'parking'],
  }),
  place({
    id: 'place-students-nest-hostel',
    category: 'HOSTEL',
    name: "Students' Nest Hostel",
    description: 'Affordable hostel for girls with warden, CCTV and mess facility.',
    address: 'Adingiri Path, Jalukbari, Guwahati',
    latitude: 26.1595,
    longitude: 91.6731,
    price: 3600,
    rating: 4.0,
    reviewCount: 97,
    gender: 'GIRLS',
    verified: true,
    phone: '+91 90000 00006',
    facilityKeys: ['meals', 'wifi', 'cctv'],
  }),
  place({
    id: 'place-spice-garden',
    category: 'RESTAURANT',
    name: 'Spice Garden',
    description: 'Assamese thali and Chinese favourites at student prices.',
    address: 'Jalukbari Chariali, Guwahati',
    latitude: 26.1642,
    longitude: 91.6638,
    price: 120,
    priceUnit: '/person',
    rating: 4.3,
    reviewCount: 321,
    phone: '+91 90000 00007',
    facilityKeys: ['parking', 'ac'],
  }),
  place({
    id: 'place-foodies-cafe',
    category: 'CAFE',
    name: 'Foodies Cafe',
    description: 'Cosy cafe with strong Wi-Fi, ideal for group study sessions.',
    address: 'Gopinath Bordoloi Nagar, Jalukbari, Guwahati',
    latitude: 26.1629,
    longitude: 91.6683,
    price: 250,
    priceUnit: '/person',
    rating: 4.5,
    reviewCount: 186,
    verified: true,
    phone: '+91 90000 00008',
    facilityKeys: ['wifi', 'ac', 'study'],
  }),
  place({
    id: 'place-biryani-house',
    category: 'RESTAURANT',
    name: 'Biryani House',
    description: 'Late-night biryani and rolls for hostel students.',
    address: 'NH-37, Jalukbari, Guwahati',
    latitude: 26.1698,
    longitude: 91.6619,
    price: 160,
    priceUnit: '/person',
    rating: 4.2,
    reviewCount: 264,
    phone: '+91 90000 00009',
    facilityKeys: ['parking'],
  }),
  place({
    id: 'place-breakfast-club',
    category: 'CAFE',
    name: 'The Breakfast Club',
    description: 'Early-morning breakfast and filter coffee before first class.',
    address: 'Jalukbari, Guwahati',
    latitude: 26.1553,
    longitude: 91.6712,
    price: 150,
    priceUnit: '/person',
    rating: 4.4,
    reviewCount: 118,
    phone: '+91 90000 00010',
    facilityKeys: ['wifi'],
  }),
  place({
    id: 'place-annapurna-mess',
    category: 'MESS',
    name: 'Annapurna Mess',
    description: 'Monthly tiffin service with home-cooked Assamese meals.',
    address: 'Gopinath Bordoloi Nagar, Jalukbari, Guwahati',
    latitude: 26.1601,
    longitude: 91.6645,
    price: 2600,
    rating: 4.2,
    reviewCount: 152,
    phone: '+91 90000 00011',
    facilityKeys: ['meals'],
  }),
  place({
    id: 'place-gu-central-library',
    category: 'LIBRARY',
    name: 'GU Central Library',
    description: 'Reading hall with reference section and quiet study zones.',
    address: 'Gauhati University Campus, Jalukbari',
    latitude: 26.1548,
    longitude: 91.6649,
    price: null,
    priceUnit: null,
    rating: 4.5,
    reviewCount: 74,
    verified: true,
    facilityKeys: ['study', 'wifi'],
  }),
  place({
    id: 'place-jalukbari-pharmacy',
    category: 'PHARMACY',
    name: 'Jalukbari Pharmacy',
    description: 'Medicines and first-aid essentials, open till late.',
    address: 'Jalukbari Chariali, Guwahati',
    latitude: 26.1661,
    longitude: 91.6652,
    price: null,
    priceUnit: null,
    rating: 4.0,
    reviewCount: 38,
    phone: '+91 90000 00012',
  }),
  place({
    id: 'place-fitzone-gym',
    category: 'GYM',
    name: 'FitZone Gym',
    description: 'Student membership plans with cardio, weights and a trainer.',
    address: 'Adingiri Path, Jalukbari, Guwahati',
    latitude: 26.175,
    longitude: 91.669,
    price: 800,
    rating: 4.3,
    reviewCount: 39,
    phone: '+91 90000 00013',
    facilityKeys: ['ac'],
  }),
];

/** Resolves the facility objects attached to a demo place. */
export function demoFacilitiesFor(placeId: string): DemoFacility[] {
  const found = DEMO_PLACES.find((item) => item.id === placeId);
  if (!found) return [];
  return found.facilityKeys
    .map((key) => FACILITIES[key])
    .filter((facility): facility is DemoFacility => Boolean(facility));
}

export function demoImagesFor(placeId: string): string[] {
  return images(placeId);
}

export const DEMO_REVIEWS = [
  {
    id: 'rev-001',
    placeId: 'place-green-valley-pg',
    authorName: 'Ankur Das',
    rating: 5,
    comment:
      'Walking distance to department. Meals are simple but good and the owner is responsive.',
    createdAt: new Date(Date.now() - 6 * 86_400_000).toISOString(),
  },
  {
    id: 'rev-002',
    placeId: 'place-green-valley-pg',
    authorName: 'Rahul Barman',
    rating: 4,
    comment: 'Wi-Fi is reliable for online classes. Water supply is fine in summer.',
    createdAt: new Date(Date.now() - 21 * 86_400_000).toISOString(),
  },
  {
    id: 'rev-003',
    placeId: 'place-foodies-cafe',
    authorName: 'Priya Kalita',
    rating: 5,
    comment: 'Best place for group study. Coffee is cheap and the staff never rushes you.',
    createdAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
  },
] as const;