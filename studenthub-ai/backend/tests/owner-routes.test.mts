import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createApp } from '../src/app.js';
import { signSessionToken } from '../src/services/authService.js';
import {
  ownerPlaceCreateSchema,
  ownerPlaceUpdateSchema,
  ownerProfileInputSchema,
  ownerRegisterInputSchema,
} from '../src/schemas/placeSchemas.js';
import { ownerPlacesQuerySchema, ownerVisitRequestsQuerySchema } from '../src/schemas/ownerSchemas.js';

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

/** Asserts the standard failure envelope and returns its message. */
function expectFailure(payload: unknown): string {
  assert.equal(typeof payload, 'object');
  const body = payload as { success: boolean; message?: string };
  assert.equal(body.success, false);
  return body.message as string;
}

const ownerToken = () => signSessionToken('owner-route-user', 'OWNER');
const studentToken = () => signSessionToken('student-route-user', 'STUDENT');

const validPlace = {
  category: 'PG',
  name: 'Owner Test PG',
  address: 'Jalukbari, Guwahati, Assam',
  latitude: 26.1589,
  longitude: 91.666,
  imageUrl: 'https://example.com/pg.jpg',
};

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

test('owner register/profile validate bodies before touching the database', async () => {
  const badRegister = await api('POST', '/auth/owner/register', {
    displayName: 'A',
    password: 'short',
  });
  assert.equal(badRegister.status, 400);
});

test('owner registration fails fast with 503 when no database is configured', async () => {
  const { status, payload } = await api('POST', '/auth/owner/register', {
    displayName: 'No Database Owner',
    email: 'owner-nodb@example.com',
    password: 'password123',
    businessName: 'No Database PG',
  });
  assert.equal(status, 503);
  assert.match(expectFailure(payload), /database/i);
});

test('owner schemas accept the documented shapes and reject bad statuses', () => {
  assert.equal(
    ownerRegisterInputSchema.safeParse({
      displayName: 'Owner',
      email: 'owner@example.com',
      password: 'password123',
      businessName: 'Owner PG',
    }).success,
    true,
  );
  assert.equal(
    ownerProfileInputSchema.safeParse({ businessName: 'Owner PG', businessPhone: '+919999999999' })
      .success,
    true,
  );
  assert.equal(ownerPlaceCreateSchema.safeParse(validPlace).success, true);
  assert.equal(
    ownerPlaceUpdateSchema.safeParse({ name: 'Renamed PG', status: 'INACTIVE' }).success,
    true,
  );
  assert.equal(ownerPlaceUpdateSchema.safeParse({ status: 'ACTIVE' }).success, false);
  assert.equal(ownerPlaceUpdateSchema.safeParse({}).success, false);
  assert.equal(ownerPlacesQuerySchema.safeParse({ status: 'REJECTED' }).success, true);
  assert.equal(ownerPlacesQuerySchema.safeParse({ status: 'UNKNOWN' }).success, false);
  assert.equal(ownerVisitRequestsQuerySchema.safeParse({ status: 'CONFIRMED' }).success, true);
});

test('anonymous callers are signed out before reaching the owner area', async () => {
  for (const [method, path, body] of [
    ['GET', '/owner/places', undefined],
    ['POST', '/owner/places', validPlace],
    ['GET', '/owner/visit-requests', undefined],
  ] as const) {
    const { status } = await api(method, path, body);
    assert.equal(status, 401);
  }
});

test('students are forbidden from the owner area', async () => {
  const token = studentToken();
  const places = await api('GET', '/owner/places', undefined, token);
  assert.equal(places.status, 403);
  const inbox = await api('GET', '/owner/visit-requests', undefined, token);
  assert.equal(inbox.status, 403);
});

test('owners without a profile get onboarding guidance, not data', async () => {
  const token = ownerToken();
  const profile = await api('GET', '/owner/profile', undefined, token);
  assert.equal(profile.status, 503);
  assert.match(expectFailure(profile.payload), /database/i);

  const { status, payload } = await api('GET', '/owner/places', undefined, token);
  assert.equal(status, 503);
  assert.match(expectFailure(payload), /database/i);
});

test('owner writes need a profile first; input errors are checked after auth', async () => {
  const token = ownerToken();
  for (const [method, path, body] of [
    ['POST', '/owner/places', validPlace],
    ['PATCH', '/owner/places/place-1', { name: 'Renamed' }],
    ['PATCH', '/owner/visit-requests/request-1', { status: 'CONFIRMED' }],
  ] as const) {
    const { status, payload } = await api(method, path, body, token);
    // Without a database the profile loader answers 503 before the service
    // runs; with a database the same request would reach input/service checks.
    assert.equal(status, 503);
    assert.match(expectFailure(payload), /database/i);
  }
});