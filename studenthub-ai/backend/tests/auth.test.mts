import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  hashPassword,
  register,
  login,
  signSessionToken,
  unwrapInfrastructureError,
  verifyPassword,
  verifySessionToken,
} from '../src/services/authService.js';

test('passwords hash and verify without leaking the plaintext', async () => {
  const stored = await hashPassword('correct horse battery staple');
  assert.match(stored, /^scrypt:[0-9a-f]{32}:[0-9a-f]{128}$/);
  assert.equal(await verifyPassword('correct horse battery staple', stored), true);
  assert.equal(await verifyPassword('wrong password', stored), false);
});

test('malformed stored hashes never authenticate', async () => {
  for (const stored of ['', 'garbage', 'scrypt:short', 'md5:salt:hash']) {
    assert.equal(await verifyPassword('anything', stored), false);
  }
});

test('session tokens round-trip and reject tampering', () => {
  const token = signSessionToken('user-1', 'STUDENT');
  const claims = verifySessionToken(token);
  assert.equal(claims?.sub, 'user-1');
  assert.equal(claims?.role, 'STUDENT');
  assert.equal(typeof claims?.exp, 'number');
  assert.equal(verifySessionToken(`${token.slice(0, -2)}xx`), null);
  assert.equal(verifySessionToken('not.a.token.at.all'), null);
  assert.equal(verifySessionToken(token.split('.')[0]), null);
});

test('expired tokens are rejected', () => {
  const body = Buffer.from(
    JSON.stringify({ sub: 'user-1', role: 'STUDENT', exp: 1 }),
  ).toString('base64url');
  assert.equal(verifySessionToken(`${body}.anything`), null);
});

test('unreachable databases surface as 503, not generic errors', () => {
  for (const error of [
    Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:5432'), { code: 'ECONNREFUSED' }),
    Object.assign(new Error("Can't reach database server"), { code: 'P1001' }),
  ]) {
    const mapped = unwrapInfrastructureError(error);
    assert.equal((mapped as { status?: number }).status, 503);
    assert.match((mapped as Error).message, /unreachable/i);
  }

  const conflict = Object.assign(new Error('unique'), { code: 'P2002' });
  assert.equal(unwrapInfrastructureError(conflict), conflict);
});

test('auth writes fail fast with a helpful message when no database is configured', async () => {
  await assert.rejects(
    () =>
      register({
        displayName: 'No Database',
        email: 'nodb@example.com',
        password: 'password123',
      }),
    /need the database/i,
  );
  await assert.rejects(
    () => login({ identifier: 'nodb@example.com', password: 'password123' }),
    /need the database/i,
  );
});
