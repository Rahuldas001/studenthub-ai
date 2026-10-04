import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { hashPassword } from '../src/services/authService.js';
import {
  DEMO_COLLEGE,
  DEMO_FACILITIES,
  DEMO_PLACES,
  DEMO_REVIEWS,
  demoFacilitiesFor,
  demoImagesFor,
} from '../src/data/demoPlaces.js';

/**
 * DEVELOPMENT SEED — all rows below are fictional demo data.
 *
 * The dataset mirrors `src/data/demoPlaces.ts` (the API fallback used when
 * PostgreSQL is unavailable) so switching between "no database" and "seeded
 * database" produces the same experience in the student app.
 *
 * Run with: npm run db:seed  (from the repository root)
 * Idempotent: every write is an upsert keyed by a stable id.
 */

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    '[seed] DATABASE_URL is not set. Copy .env.example to .env and start PostgreSQL (npm run db:up).',
  );
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

/** Demo owner used to exercise the Owner → Place relation. */
const DEMO_OWNER_EMAIL = 'demo.owner@studenthub.local';

/** Demo admin used to exercise the admin panel (moderation, verification). */
const DEMO_ADMIN_EMAIL = 'demo.admin@studenthub.local';

/** Demo student used to exercise the student login. */
const DEMO_STUDENT_EMAIL = 'demo.student@studenthub.local';

async function main(): Promise<void> {
  console.log('[seed] Seeding StudentHub AI demo data…');

  const college = await prisma.college.upsert({
    where: { id: DEMO_COLLEGE.id },
    update: {
      name: DEMO_COLLEGE.name,
      city: DEMO_COLLEGE.city,
      state: DEMO_COLLEGE.state,
      latitude: DEMO_COLLEGE.latitude,
      longitude: DEMO_COLLEGE.longitude,
    },
    create: {
      id: DEMO_COLLEGE.id,
      name: DEMO_COLLEGE.name,
      city: DEMO_COLLEGE.city,
      state: DEMO_COLLEGE.state,
      latitude: DEMO_COLLEGE.latitude,
      longitude: DEMO_COLLEGE.longitude,
    },
  });
  console.log(`[seed] college: ${college.name}`);

  for (const facility of DEMO_FACILITIES) {
    await prisma.facility.upsert({
      where: { name: facility.name },
      update: { icon: facility.icon },
      create: { name: facility.name, icon: facility.icon },
    });
  }
  console.log(`[seed] facilities: ${DEMO_FACILITIES.length}`);

  const owner = await prisma.user.upsert({
    where: { email: DEMO_OWNER_EMAIL },
    // `update` keeps the development login working across reseeds: upsert
    // matches on email, so `create` is skipped once the row exists.
    update: { passwordHash: await hashPassword('owner-password-123') },
    create: {
      email: DEMO_OWNER_EMAIL,
      // Development login for the owner dashboard.
      // Password: `owner-password-123`. Change it after seeding in shared envs.
      passwordHash: await hashPassword('owner-password-123'),
      displayName: 'StudentHub Demo Owner',
      role: 'OWNER',
      owner: {
        create: {
          businessName: 'StudentHub Demo Properties',
          phone: '+91 90000 00001',
          verified: true,
        },
      },
    },
    include: { owner: true },
  });

  const ownerId = owner.owner?.id ?? null;
  console.log(`[seed] owner: ${owner.displayName}`);

  const admin = await prisma.user.upsert({
    where: { email: DEMO_ADMIN_EMAIL },
    // Development login for the admin panel:
    // Password: `admin-password-123`. Change it after seeding in shared envs.
    update: { passwordHash: await hashPassword('admin-password-123') },
    create: {
      email: DEMO_ADMIN_EMAIL,
      passwordHash: await hashPassword('admin-password-123'),
      displayName: 'StudentHub Demo Admin',
      role: 'ADMIN',
    },
  });
  console.log(`[seed] admin: ${admin.displayName}`);

  const student = await prisma.user.upsert({
    where: { email: DEMO_STUDENT_EMAIL },
    // Development login for the student app:
    // Password: `student-password-123`. Change it after seeding in shared envs.
    update: { passwordHash: await hashPassword('student-password-123') },
    create: {
      email: DEMO_STUDENT_EMAIL,
      passwordHash: await hashPassword('student-password-123'),
      displayName: 'StudentHub Demo Student',
      role: 'STUDENT',
    },
  });
  console.log(`[seed] student: ${student.displayName}`);

  for (const place of DEMO_PLACES) {
    const images = demoImagesFor(place.id);
    // Only the flagship demo PG is linked to the demo owner; the remaining rows
    // represent admin-entered listings with no owner account yet.
    const placeOwnerId = place.id === 'place-green-valley-pg' ? ownerId : null;

    await prisma.place.upsert({
      where: { id: place.id },
      update: {
        category: place.category,
        name: place.name,
        description: place.description,
        address: place.address,
        latitude: place.latitude,
        longitude: place.longitude,
        price: place.price,
        priceUnit: place.priceUnit,
        phone: place.phone,
        gender: place.gender,
        verified: place.verified,
        status: 'ACTIVE',
        ratingAvg: place.rating,
        reviewCount: place.reviewCount,
        imageUrl: images[0],
        images,
        collegeId: college.id,
        ownerId: placeOwnerId,
      },
      create: {
        id: place.id,
        category: place.category,
        name: place.name,
        description: place.description,
        address: place.address,
        latitude: place.latitude,
        longitude: place.longitude,
        price: place.price,
        priceUnit: place.priceUnit,
        phone: place.phone,
        gender: place.gender,
        verified: place.verified,
        status: 'ACTIVE',
        ratingAvg: place.rating,
        reviewCount: place.reviewCount,
        imageUrl: images[0],
        images,
        collegeId: college.id,
        ownerId: placeOwnerId,
      },
    });

    // Facilities are many-to-many: link the place to each catalogue entry.
    for (const facility of demoFacilitiesFor(place.id)) {
      const row = await prisma.facility.findUnique({
        where: { name: facility.name },
      });
      if (!row) continue;

      await prisma.placeFacility.upsert({
        where: { placeId_facilityId: { placeId: place.id, facilityId: row.id } },
        update: {},
        create: { placeId: place.id, facilityId: row.id },
      });
    }
  }
  console.log(`[seed] places: ${DEMO_PLACES.length}`);

  for (const review of DEMO_REVIEWS) {
    await prisma.review.upsert({
      where: { id: review.id },
      update: {
        rating: review.rating,
        comment: review.comment,
        authorName: review.authorName,
      },
      create: {
        id: review.id,
        placeId: review.placeId,
        authorName: review.authorName,
        rating: review.rating,
        comment: review.comment,
        createdAt: new Date(review.createdAt),
      },
    });
  }
  console.log(`[seed] reviews: ${DEMO_REVIEWS.length}`);

  // Keep the denormalised aggregates consistent with the seeded reviews, while
  // preserving the (larger) demo review counts used by the UI.
  const places = await prisma.place.findMany({ select: { id: true } });
  for (const place of places) {
    const aggregate = await prisma.review.aggregate({
      where: { placeId: place.id },
      _avg: { rating: true },
    });

    if (aggregate._avg.rating !== null) {
      await prisma.place.update({
        where: { id: place.id },
        data: { ratingAvg: Number(aggregate._avg.rating.toFixed(1)) },
      });
    }
  }

  console.log('[seed] Done. All rows are fictional demo data for development.');
}

main()
  .catch((error: unknown) => {
    console.error('[seed] Failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });