import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deleteAccount } from '../src/services/accountService.js';
import { deleteAccountInputSchema } from '../src/schemas/placeSchemas.js';

test('account deletion fails fast when PostgreSQL is not configured', async () => {
  await assert.rejects(
    () => deleteAccount('user-under-deletion'),
    /account deletion needs the database/i,
  );
});

test('only the exact DELETE phrase unlocks account deletion', () => {
  assert.equal(deleteAccountInputSchema.safeParse({ confirm: 'DELETE' }).success, true);

  for (const body of [{}, { confirm: '' }, { confirm: 'delete' }, { confirm: 'DELETE ' }, { confirm: 'yes' }]) {
    const result = deleteAccountInputSchema.safeParse(body);
    assert.equal(result.success, false, `expected ${JSON.stringify(body)} to be rejected`);
  }
});
