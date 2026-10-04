import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createApp } from '../src/app.js';
import { signSessionToken } from '../src/services/authService.js';

let baseUrl = '';
let closeServer: (() => void) | null = null;

async function api(method: string, path: string, body?: unknown, token?: string) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, payload: (await response.json()) as unknown };
}

/** Asserts the standard success envelope and returns its unwrapped data. */
function expectSuccess<T>(payload: unknown): T {
  assert.equal(typeof payload, 'object');
  const body = payload as { success: boolean; data?: T };
  assert.equal(body.success, true);
  return body.data as T;
}

/** Asserts the standard failure envelope and returns its message. */
function expectFailure(payload: unknown): string {
  assert.equal(typeof payload, 'object');
  const body = payload as { success: boolean; message?: string };
  assert.equal(body.success, false);
  return body.message as string;
}

before(async () => {
  const app = createApp();
  const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
    const listener = app.listen(0, () => resolve(listener));
  });
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}/api`;
  closeServer = () => server.close();
});

after(() => {
  closeServer?.();
});

test('register validation rejects weak input before touching the database', async () => {
  const { status, payload } = await api('POST', '/auth/register', {
    displayName: 'A',
    password: 'short',
  });
  assert.equal(status, 400);
  assert.match(expectFailure(payload), /validation failed/i);
});

test('register and login fail fast with 503 when no database is configured', async () => {
  const valid = { displayName: 'No Database', email: 'nodb@example.com', password: 'password123' };
  const registerAttempt = await api('POST', '/auth/register', valid);
  assert.equal(registerAttempt.status, 503);
  assert.match((registerAttempt.payload as { message: string }).message, /database/i);

  const loginAttempt = await api('POST', '/auth/login', {
    identifier: 'nodb@example.com',
    password: 'password123',
  });
  assert.equal(loginAttempt.status, 503);
});

test('login validation rejects empty credentials', async () => {
  const { status } = await api('POST', '/auth/login', { identifier: 'x', password: '' });
  assert.equal(status, 400);
});

test('/me requires a token and accepts a signed session', async () => {
  const anonymous = await api('GET', '/auth/me');
  assert.equal(anonymous.status, 401);
  assert.match((anonymous.payload as { message: string }).message, /sign in/i);

  const token = signSessionToken('route-test-user', 'STUDENT');
  const { status, payload } = await api('GET', '/auth/me', undefined, token);
  // No user row exists in the test environment (no database), so the route
  // proves auth passed and then reports the missing account downstream.
  assert.equal(status, 503);
  assert.match((payload as { message: string }).message, /database/i);
});

test('logout acknowledges the client-side sign-out', async () => {
  const { status, payload } = await api('POST', '/auth/logout');
  assert.equal(status, 200);
  assert.deepEqual(expectSuccess<{ signedOut: boolean }>(payload), { signedOut: true });
});

test('delete account refuses anonymous callers', async () => {
  const { status, payload } = await api('DELETE', '/auth/account', { confirm: 'DELETE' });
  assert.equal(status, 401);
  assert.match(expectFailure(payload), /sign in/i);
});

test('delete account rejects a body without the DELETE confirmation', async () => {
  const token = signSessionToken('route-test-user', 'STUDENT');
  const { status, payload } = await api('DELETE', '/auth/account', { confirm: 'yes' }, token);
  assert.equal(status, 400);
  assert.match(expectFailure(payload), /validation failed/i);
});

test('delete account passes auth and validation, then needs the database', async () => {
  const token = signSessionToken('route-test-user', 'STUDENT');
  const { status, payload } = await api('DELETE', '/auth/account', { confirm: 'DELETE' }, token);
  // Auth and the confirmation phrase both cleared; only the missing database
  // stops the deletion, which proves the whole chain is wired.
  assert.equal(status, 503);
  assert.match(expectFailure(payload), /database/i);
});

test('guest favorites still resolve to the empty demo fallback', async () => {
  const { status, payload } = await api('GET', '/favorites');
  assert.equal(status, 200);
  assert.deepEqual(expectSuccess<{ favorites: unknown[] }>(payload), { favorites: [] });
});
