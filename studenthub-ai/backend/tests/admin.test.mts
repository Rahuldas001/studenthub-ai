import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkModerationTransition } from '../src/services/adminPlaceService.js';
import {
  createAdminCollege,
  getAdminOverview,
  listAdminColleges,
  listAdminOwners,
  setOwnerVerified,
  toAdminCollegeSummary,
  toAdminOwnerSummary,
} from '../src/services/adminService.js';
import { HttpError } from '../src/utils/httpError.js';

test('moderation accepts real transitions and refuses no-op ones', () => {
  for (const [current, next] of [
    ['PENDING', 'ACTIVE'],
    ['PENDING', 'REJECTED'],
    ['ACTIVE', 'INACTIVE'],
    ['INACTIVE', 'ACTIVE'],
    ['REJECTED', 'ACTIVE'],
  ] as const) {
    assert.doesNotThrow(() => checkModerationTransition(current, next));
  }

  for (const status of ['ACTIVE', 'REJECTED', 'INACTIVE'] as const) {
    assert.throws(
      () => checkModerationTransition(status, status),
      (error: unknown) => error instanceof HttpError && error.status === 409,
    );
  }
});

test('admin owner rows map to the public shape without internals', () => {
  const owner = toAdminOwnerSummary({
    id: 'owner-1',
    businessName: 'Green Valley PG',
    phone: '+919000000001',
    verified: true,
    createdAt: new Date('2026-01-02T03:04:05.000Z'),
    user: { displayName: 'Demo Owner', email: 'owner@example.com' },
    _count: { places: 3 },
  });

  assert.deepEqual(owner, {
    id: 'owner-1',
    businessName: 'Green Valley PG',
    phone: '+919000000001',
    verified: true,
    displayName: 'Demo Owner',
    email: 'owner@example.com',
    listingCount: 3,
    createdAt: '2026-01-02T03:04:05.000Z',
  });
});

test('admin college rows map to the public shape without internals', () => {
  const college = toAdminCollegeSummary({
    id: 'college-1',
    name: 'Gauhati University',
    city: 'Guwahati',
    state: 'Assam',
    latitude: 26.1554,
    longitude: 91.6664,
    createdAt: new Date('2026-01-02T03:04:05.000Z'),
    _count: { places: 12 },
  });

  assert.deepEqual(college, {
    id: 'college-1',
    name: 'Gauhati University',
    city: 'Guwahati',
    state: 'Assam',
    latitude: 26.1554,
    longitude: 91.6664,
    placeCount: 12,
    createdAt: '2026-01-02T03:04:05.000Z',
  });
});

test('admin services fail fast without a database', async () => {
  const expected = /admin panel needs the database/i;

  await assert.rejects(() => getAdminOverview(), expected);
  await assert.rejects(() => listAdminOwners(), expected);
  await assert.rejects(() => listAdminOwners(false), expected);
  await assert.rejects(() => setOwnerVerified('owner-1', true), expected);
  await assert.rejects(() => listAdminColleges(), expected);
  await assert.rejects(
    () =>
      createAdminCollege({
        name: 'No Database College',
        city: 'Guwahati',
        state: 'Assam',
        latitude: 26.15,
        longitude: 91.66,
      }),
    expected,
  );
});
