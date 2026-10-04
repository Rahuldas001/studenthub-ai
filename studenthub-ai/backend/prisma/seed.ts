import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { hashPassword } from '../src/services/authService.js';
import { FACILITY_CATALOGUE, LAUNCH_COLLEGES } from '../src/data/launchData.js';

/**
 * SEED - accounts, campuses and the amenity vocabulary.
 *
 * There are no fictional listings here: real businesses come from OpenStreetMap.
 * After seeding, run `npm run db:import` to pull the actual places for
 * Guwahati, Dhubri and Dibrugarh.
 *
 * Idempotent: every write is an upsert keyed by a stable id or unique field.
 */

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('[seed] DATABASE_URL is not set. Copy .env.example to .env and start PostgreSQL (npm run db:up).');
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

/** Development owner, admin and student logins documented in the README. */
const DEMO_OWNER_EMAIL = 'demo.owner@studenthub.local';
const DEMO_ADMIN_EMAIL = 'demo.admin@studenthub.local';
const DEMO_STUDENT_EMAIL = 'demo.student@studenthub.local';

async function main(): Promise<void> {
  console.log('[seed] Seeding StudentHub AI…');

  for (const college of LAUNCH_COLLEGES) {
    await prisma.college.upsert({
      where: { id: college.id },
      update: {
        name: college.name,
        city: college.city,
        state: college.state,
        latitude: college.latitude,
        longitude: college.longitude,
      },
      create: college,
    });
  }
  console.log(`[seed] colleges: ${LAUNCH_COLLEGES.length}`);

  for (const facility of FACILITY_CATALOGUE) {
    await prisma.facility.upsert({
      where: { name: facility.name },
      update: { icon: facility.icon },
      create: { name: facility.name, icon: facility.icon },
    });
  }
  console.log(`[seed] facilities: ${FACILITY_CATALOGUE.length}`);

  const owner = await prisma.user.upsert({
    where: { email: DEMO_OWNER_EMAIL },
    update: { passwordHash: await hashPassword('owner-password-123') },
    create: {
      email: DEMO_OWNER_EMAIL,
      // Development login for the owner dashboard.
      passwordHash: await hashPassword('owner-password-123'),
      displayName: 'StudentHub Business Owner',
      role: 'OWNER',
      city: 'Guwahati',
      owner: {
        create: {
          businessName: 'StudentHub Verified Properties',
          phone: '+91 90000 00001',
          city: 'Guwahati',
          verified: true,
        },
      },
    },
    include: { owner: true },
  });
  console.log(`[seed] owner: ${owner.displayName}`);

  const admin = await prisma.user.upsert({
    where: { email: DEMO_ADMIN_EMAIL },
    // Development login for the admin panel: `admin-password-123`.
    update: { passwordHash: await hashPassword('admin-password-123') },
    create: {
      email: DEMO_ADMIN_EMAIL,
      passwordHash: await hashPassword('admin-password-123'),
      displayName: 'StudentHub Admin',
      role: 'ADMIN',
    },
  });
  console.log(`[seed] admin: ${admin.displayName}`);

  const student = await prisma.user.upsert({
    where: { email: DEMO_STUDENT_EMAIL },
    // Development login for the student app: `student-password-123`.
    update: { passwordHash: await hashPassword('student-password-123') },
    create: {
      email: DEMO_STUDENT_EMAIL,
      passwordHash: await hashPassword('student-password-123'),
      displayName: 'StudentHub Student',
      role: 'STUDENT',
    },
  });
  console.log(`[seed] student: ${student.displayName}`);

  const places = await prisma.place.count();
  console.log(`[seed] places already in the database: ${places}`);
  if (places === 0) {
    console.log('[seed] No listings yet — run `npm run db:import` to load real OpenStreetMap businesses.');
  }
  console.log('[seed] Done. No fictional listings are created.');
}

main()
  .catch((error: unknown) => {
    console.error('[seed] Failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
