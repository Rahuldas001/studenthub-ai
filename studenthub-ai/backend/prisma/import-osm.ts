import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import type { PlaceCategory } from '@studenthub/types';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { distanceInKm } from '../src/utils/geo.js';

/**
 * REAL BUSINESS IMPORT - OpenStreetMap via Overpass.
 *
 * Replaces bundled fictional listings with genuine amenities: hostels, PGs,
 * restaurants, mess/fast-food, cafes, libraries, pharmacies, ATMs, grocery
 * shops, bus stops and gyms. OSM is open data (ODbL) and needs no API key.
 *
 * Usage:  npm run db:import        (from the repository root)
 *
 * Idempotent: every row gets a stable `osm-<type>-<id>` primary key and is
 * upserted, so re-running refreshes names, addresses and opening hours in place.
 * OSM carries no photos or ratings, so those stay placeholder/unset rather than
 * invented - listings land with `verified: false` and an OpenStreetMap note.
 */

/** Areas to import: a bounding box plus the colleges they surround. */
const AREAS = [
  { label: 'Guwahati', city: 'Guwahati', state: 'Assam', south: 26.105, west: 91.635, north: 26.205, east: 91.770 },
  { label: 'Dhubri', city: 'Dhubri', state: 'Assam', south: 25.998, west: 89.948, north: 26.048, east: 90.005 },
  { label: 'Dibrugarh', city: 'Dibrugarh', state: 'Assam', south: 27.450, west: 94.878, north: 27.500, east: 94.952 },
] as const;

const ENDPOINTS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
] as const;

/** Placeholder photography per category; OSM has no images of its own. */
const IMAGES: Record<string, string> = {
  HOSTEL: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80',
  PG: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
  RESTAURANT: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
  MESS: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
  CAFE: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80',
  LIBRARY: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=800&q=80',
  PHARMACY: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=800&q=80',
  ATM: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&w=800&q=80',
  GROCERY: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
  BUS_STOP: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80',
  GYM: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80',
};

type Tags = Record<string, string>;
type OverpassElement = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Tags;
};

/** Maps an OSM element onto a StudentHub category, or null when unsupported. */
function categoryFor(tags: Tags): PlaceCategory | null {
  const amenity = tags.amenity;
  if (tags.tourism === 'hostel' || amenity === 'hostel' || amenity === 'guest_hotel') return 'HOSTEL';
  if (amenity === 'dormitory') return 'PG';
  if (amenity === 'restaurant') return 'RESTAURANT';
  if (amenity === 'fast_food') return 'MESS';
  if (amenity === 'cafe') return 'CAFE';
  if (amenity === 'library') return 'LIBRARY';
  if (amenity === 'pharmacy' || tags.healthcare === 'pharmacy') return 'PHARMACY';
  if (amenity === 'atm') return 'ATM';
  if (amenity === 'gym' || tags.leisure === 'fitness_centre') return 'GYM';
  if (amenity === 'bus_station' || tags.highway === 'bus_stop') return 'BUS_STOP';
  if (amenity === 'college' || amenity === 'university' || amenity === 'school') return null;
  if (tags.shop && ['supermarket', 'convenience', 'grocery', 'general', 'bakery', 'department_store'].includes(tags.shop)) {
    return 'GROCERY';
  }
  return null;
}

/** Builds a human address from OSM `addr:*` tags, falling back to the city. */
function addressFor(tags: Tags, area: (typeof AREAS)[number]): string {
  const street = [tags['addr:housenumber'], tags['addr:street'], tags['addr:suburb']]
    .filter(Boolean)
    .join(', ');
  const city = tags['addr:city'] ?? area.city;
  return [street, city, area.state].filter(Boolean).join(', ') || `${area.city}, ${area.state}`;
}

/** Summary of the tags a student actually scans for. */
function descriptionFor(tags: Tags, category: PlaceCategory): string {
  const bits: string[] = [];
  if (tags.cuisine) bits.push(`Cuisine: ${tags.cuisine.split(';').join(', ')}.`);
  if (tags.operator) bits.push(`Operator: ${tags.operator}.`);
  if (tags['addr:full']) bits.push(tags['addr:full']);
  const details = bits.join(' ');
  return `Real listing from OpenStreetMap (ODbL). Confirm timings and prices with the owner.${details ? ` ${details}` : ''} Category: ${category}.`;
}

function phoneFor(tags: Tags): string | null {
  const raw = tags.phone ?? tags['contact:phone'];
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, '');
  return digits.length >= 10 && digits.length <= 16 ? digits : null;
}

/** Overpass query: every amenity StudentHub can show, plus their tags. */
function buildQuery(area: (typeof AREAS)[number]): string {
  const bbox = `${area.south},${area.west},${area.north},${area.east}`;
  return `[out:json][timeout:180];(
  nwr["amenity"~"^(restaurant|fast_food|cafe|hostel|guest_hotel|dormitory|library|pharmacy|atm|gym|fitness_centre|bus_station)$"](${bbox});
  nwr["healthcare"="pharmacy"](${bbox});
  nwr["tourism"="hostel"](${bbox});
  nwr["leisure"="fitness_centre"](${bbox});
  nwr["shop"~"^(supermarket|convenience|grocery|general|bakery|department_store)$"](${bbox});
  nwr["highway"="bus_stop"](${bbox});
);out center tags qt;`;
}

/** POSTs the query, trying each mirror twice before giving up. */
async function fetchElements(queryText: string, label: string): Promise<OverpassElement[]> {
  for (const endpoint of ENDPOINTS) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'StudentHubAI/1.0 (real business import)' },
          body: new URLSearchParams({ data: queryText }).toString(),
          signal: AbortSignal.timeout(200_000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json() as { elements?: OverpassElement[] };
        console.log(`[import] ${label}: ${payload.elements?.length ?? 0} raw elements`);
        return payload.elements ?? [];
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        console.warn(`[import] ${label}: ${endpoint} attempt ${attempt} failed - ${reason}`);
      }
    }
  }
  throw new Error(`[import] ${label}: every Overpass endpoint failed`);
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('[import] DATABASE_URL is not set. Start PostgreSQL (npm run db:up) and try again.');
    process.exit(1);
  }
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    const colleges = await prisma.college.findMany();
    if (colleges.length === 0) {
      console.error('[import] No colleges found. Run `npm run db:seed` first so listings can be anchored.');
      process.exit(1);
    }
    console.log(`[import] anchoring listings to ${colleges.length} colleges`);

    let created = 0;
    let refreshed = 0;

    for (const area of AREAS) {
      const elements = await fetchElements(buildQuery(area), area.label);
      // OSM often maps the same shop twice (node + way); keep one row per name
      // rounded to ~11 m so the list does not repeat a business.
      const seen = new Set<string>();
      for (const element of elements) {
        const tags = element.tags ?? {};
        const name = (tags.name ?? tags.official_name ?? tags.brand ?? '').trim();
        if (!name) continue;
        const category = categoryFor(tags);
        if (!category) continue;
        const latitude = element.lat ?? element.center?.lat;
        const longitude = element.lon ?? element.center?.lon;
        if (typeof latitude !== 'number' || typeof longitude !== 'number') continue;

        const fingerprint = `${name.toLowerCase().replace(/\s+/g, ' ')}|${latitude.toFixed(3)}|${longitude.toFixed(3)}`;
        if (seen.has(fingerprint)) continue;
        seen.add(fingerprint);

        const nearest = colleges.reduce(
          (best, college) => {
            const distance = distanceInKm({ latitude, longitude }, college);
            return distance < best.distance ? { college, distance } : best;
          },
          { college: colleges[0], distance: Number.POSITIVE_INFINITY },
        );

        const image = IMAGES[category] ?? IMAGES.GROCERY;
        const id = `osm-${element.type}-${element.id}`;
        const data = {
          category,
          name: name.slice(0, 120),
          description: descriptionFor(tags, category).slice(0, 2000),
          address: addressFor(tags, area).slice(0, 300),
          latitude,
          longitude,
          price: null,
          priceUnit: null,
          phone: phoneFor(tags),
          whatsapp: null,
          openingHours: (tags.opening_hours ?? '').slice(0, 60) || null,
          priceBand: null,
          imageUrl: image,
          images: [image],
          verified: false,
          status: 'ACTIVE',
          ratingAvg: 0,
          reviewCount: 0,
          collegeId: nearest.college.id,
          ownerId: null,
        } as const;

        const existing = await prisma.place.findUnique({ where: { id }, select: { id: true } });
        if (existing) {
          await prisma.place.update({ where: { id }, data });
          refreshed += 1;
        } else {
          await prisma.place.create({ data: { id, ...data } });
          created += 1;
        }
      }
      console.log(`[import] ${area.label} done (running total: ${created} new, ${refreshed} refreshed)`);
    }

    const byCategory = await prisma.place.groupBy({ by: ['category'], _count: { _all: true } });
    console.log('[import] listings by category:');
    for (const row of byCategory.sort((a, b) => b._count._all - a._count._all)) {
      console.log(`[import]   ${row.category}: ${row._count._all}`);
    }
    console.log(`[import] Done. ${created} created, ${refreshed} refreshed. All rows are real OpenStreetMap data (ODbL).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('[import] Failed:', error);
  process.exitCode = 1;
});
