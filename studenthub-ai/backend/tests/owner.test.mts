import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getOwnerProfile, registerOwner, toOwnerProfile, upsertOwnerProfile } from '../src/services/ownerService.js';

test('owner profiles map to the public shape without internals', () => {
  assert.deepEqual(
    toOwnerProfile({ id: 'owner-1', businessName: ' Test PG ', phone: '+919999999999', verified: true }),
    { id: 'owner-1', businessName: ' Test PG ', phone: '+919999999999', verified: true },
  );
});

test('owner registration and profiles fail fast without a database', async () => {
  await assert.rejects(
    () =>
      registerOwner({
        displayName: 'No Database Owner',
        email: 'owner-nodb@example.com',
        password: 'password123',
        businessName: 'No Database PG',
      }),
    /owner dashboard needs the database/i,
  );
  await assert.rejects(
    () => upsertOwnerProfile('user-1', { businessName: 'No Database PG' }),
    /owner dashboard needs the database/i,
  );
  await assert.rejects(
    () => getOwnerProfile('user-1'),
    /owner dashboard needs the database/i,
  );
});