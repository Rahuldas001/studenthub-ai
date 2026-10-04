import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createApp } from '../src/app.js';
import { signSessionToken } from '../src/services/authService.js';
import {
  adminCollegeInputSchema,
  adminModerationSchema,
  adminOwnerUpdateSchema,
  adminOwnersQuerySchema,
  adminPlacesQuerySchema,
} from '../src/schemas/adminSchemas.js';

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

const adminToken = () => signSessionToken('admin-route-user', 'ADMIN');

const validCollege = {
  name: 'No Database College',
  city: 'Guwahati',
  state: 'Assam',
  latitude: 26.15,
  longitude: 91.66,
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

test('admin schemas accept the documented shapes and reject bad input', () => {
  assert.equal(adminModerationSchema.safeParse({ status: 'ACTIVE' }).success, true);
  assert.equal(adminModerationSchema.safeParse({ status: 'INACTIVE' }).success, true);
  // PENDING/DRAFT are never moderation targets — owners resubmit instead.
  assert.equal(adminModerationSchema.safeParse({ status: 'PENDING' }).success, false);
  assert.equal(adminModerationSchema.safeParse({ status: 'DRAFT' }).success, false);

  assert.equal(adminOwnerUpdateSchema.safeParse({ verified: true }).success, true);
  assert.equal(adminOwnerUpdateSchema.safeParse({ verified: 'yes' }).success, false);
  assert.equal(adminOwnerUpdateSchema.safeParse({}).success, false);

  assert.equal(adminPlacesQuerySchema.safeParse({ status: 'REJECTED' }).success, true);
  assert.equal(adminPlacesQuerySchema.safeParse({ status: 'UNKNOWN' }).success, false);

  assert.deepEqual(adminOwnersQuerySchema.parse({ verified: 'false' }), { verified: false });
  assert.deepEqual(adminOwnersQuerySchema.parse({ verified: 'true' }), { verified: true });
  assert.deepEqual(adminOwnersQuerySchema.parse({}), {});
  assert.equal(adminOwnersQuerySchema.safeParse({ verified: 'maybe' }).success, false);

  assert.equal(adminCollegeInputSchema.safeParse(validCollege).success, true);
  assert.equal(
    adminCollegeInputSchema.safeParse({ ...validCollege, latitude: 999 }).success,
    false,
  );
});

test('anonymous callers are signed out before reaching the admin area', async () => {
  for (const [method, path, body] of [
    ['GET', '/admin/overview', undefined],
    ['GET', '/admin/places', undefined],
    ['PATCH', '/admin/places/place-1', { status: 'ACTIVE' }],
    ['DELETE', '/admin/places/place-1', undefined],
    ['GET', '/admin/owners', undefined],
    ['PATCH', '/admin/owners/owner-1', { verified: true }],
    ['GET', '/admin/colleges', undefined],
    ['POST', '/admin/colleges', validCollege],
  ] as const) {
    const { status } = await api(method, path, body);
    assert.equal(status, 401);
  }
});

test('students and owners are forbidden from the admin area', async () => {
  for (const role of ['STUDENT', 'OWNER'] as const) {
    const token = signSessionToken(`not-admin-${role.toLowerCase()}`, role);
    const overview = await api('GET', '/admin/overview', undefined, token);
    assert.equal(overview.status, 403);

    const colleges = await api('GET', '/admin/colleges', undefined, token);
    assert.equal(colleges.status, 403);

    const moderation = await api('PATCH', '/admin/places/place-1', { status: 'ACTIVE' }, token);
    assert.equal(moderation.status, 403);
  }
});

test('admin input is validated before the database is touched', async () => {
  const token = adminToken();

  const badModeration = await api('PATCH', '/admin/places/place-1', { status: 'PENDING' }, token);
  assert.equal(badModeration.status, 400);

  const badOwner = await api('PATCH', '/admin/owners/owner-1', {}, token);
  assert.equal(badOwner.status, 400);

  const badQuery = await api('GET', '/admin/owners?verified=maybe', undefined, token);
  assert.equal(badQuery.status, 400);

  const badCollege = await api('POST', '/admin/colleges', { name: 'X' }, token);
  assert.equal(badCollege.status, 400);
});

test('admin reads and writes report 503 while the database is unavailable', async () => {
  const token = adminToken();

  for (const [method, path, body] of [
    ['GET', '/admin/overview', undefined],
    ['GET', '/admin/places', undefined],
    ['PATCH', '/admin/places/place-1', { status: 'ACTIVE' }],
    ['DELETE', '/admin/places/place-1', undefined],
    ['GET', '/admin/owners', undefined],
    ['PATCH', '/admin/owners/owner-1', { verified: true }],
    ['GET', '/admin/colleges', undefined],
    ['POST', '/admin/colleges', validCollege],
  ] as const) {
    const { status, payload } = await api(method, path, body, token);
    assert.equal(status, 503);
    assert.match(expectFailure(payload), /database/i);
  }
});
