const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

/**
 * Compiles a real `src/` module with the TypeScript transpiler so the tests run
 * the shipped code, not a copy. `adminExtras.ts` only has type-only imports, so
 * it needs no stubs; `admin.ts` and `auth.ts` also pull in the fetch client,
 * which is resolved by hand (and recorded, so service tests can assert the
 * exact paths/methods/bodies the panel sends).
 */
function loadModule(relativePath, requireImpl) {
  const source = fs.readFileSync(path.join(__dirname, relativePath), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const moduleExports = {};
  new Function('require', 'exports', 'module', compiled)(
    requireImpl ?? ((id) => { throw new Error(`unexpected import: ${id}`); }),
    moduleExports,
    { exports: moduleExports },
  );
  return moduleExports;
}

/** Records every apiRequest call; `respond` sets what the next call resolves. */
function apiStub(configured = true) {
  const stub = {
    calls: [],
    next: undefined,
    apiConfigured: () => configured,
    respond(value) { stub.next = value; return stub; },
    apiRequest: async (path, options = {}) => {
      stub.calls.push({ path, options: { method: options.method ?? 'GET', token: options.token, body: options.body } });
      const value = stub.next;
      stub.next = undefined;
      return value;
    },
  };
  return stub;
}

const extras = loadModule('../src/adminExtras.ts');
const services = apiStub();
const admin = loadModule('../src/admin.ts', (id) => {
  if (id === './api') return services;
  throw new Error(`unexpected import: ${id}`);
});

// auth.ts touches localStorage directly (web-only storage), so give Node one.
const store = new Map();
global.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => { store.set(key, String(value)); },
  removeItem: (key) => { store.delete(key); },
};
const authApi = apiStub();
const auth = loadModule('../src/auth.ts', (id) => {
  if (id === './api') return authApi;
  throw new Error(`unexpected import: ${id}`);
});

const overview = {
  users: { students: 10, owners: 3, admins: 1 },
  places: { PENDING: 2, ACTIVE: 5, REJECTED: 1, INACTIVE: 1 },
  visitRequests: { PENDING: 4, CONFIRMED: 1, COMPLETED: 2, CANCELLED: 3 },
  ownersTotal: 3,
  ownersVerified: 2,
};

const place = (overrides) => ({
  id: 'p1', category: 'PG', name: 'Green Valley PG', address: 'Jalukbari, Guwahati',
  status: 'PENDING', ownerName: 'Green Valley', rating: 4.5, reviewCount: 10,
  price: 5500, priceUnit: '/month', pendingRequests: 0, verified: false,
  createdAt: '2026-05-01T00:00:00.000Z', updatedAt: '2026-05-01T00:00:00.000Z',
  ...overrides,
});

const ownerRow = (overrides) => ({
  id: 'o1', businessName: 'Green Valley PG', phone: null, verified: false,
  displayName: 'Demo Owner', email: 'demo.owner@studenthub.local', listingCount: 2,
  createdAt: '2026-04-01T00:00:00.000Z',
  ...overrides,
});

test('moderation buttons mirror the backend transition rules', () => {
  assert.deepEqual(extras.moderationActions('PENDING'), { approve: true, reject: true, unpublish: false });
  assert.deepEqual(extras.moderationActions('ACTIVE'), { approve: false, reject: false, unpublish: true });
  assert.deepEqual(extras.moderationActions('REJECTED'), { approve: true, reject: false, unpublish: false });
  assert.deepEqual(extras.moderationActions('INACTIVE'), { approve: true, reject: false, unpublish: false });
  assert.deepEqual(extras.moderationActions('DRAFT'), { approve: true, reject: false, unpublish: false });
});

test('overview tiles are derived from the real counters', () => {
  const stats = extras.overviewStats(overview);
  assert.deepEqual(stats.map((tile) => tile.id), ['users', 'listings', 'pending', 'businesses']);
  assert.equal(stats[0].value, '14');
  assert.equal(stats[0].note, '10 students · 3 owners');
  assert.equal(stats[1].value, '9');
  assert.equal(stats[1].note, '5 live · 1 rejected · 1 unpublished');
  assert.equal(stats[2].value, '2');
  assert.equal(stats[2].note, 'Waiting on moderation');
  assert.equal(stats[3].value, '2/3');
  assert.equal(stats[3].note, '1 awaiting verification');
  assert.equal(extras.countPlaces(overview.places), 9);
  assert.equal(extras.countPlaces({}), 0);
  const clear = extras.overviewStats({ ...overview, places: { ACTIVE: 4 }, ownersVerified: 3 });
  assert.equal(clear[2].note, 'Queue is clear');
  assert.equal(clear[3].note, 'Every business verified');
});

test('status breakdowns keep actionable order and drop empty rows', () => {
  assert.deepEqual(extras.placeStatusRows(overview).map((row) => row.status),
    ['PENDING', 'ACTIVE', 'REJECTED', 'INACTIVE']);
  assert.deepEqual(extras.visitStatusRows(overview).map((row) => row.status),
    ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']);
  assert.deepEqual(extras.placeStatusRows({ ...overview, places: { ACTIVE: 3 } }).map((row) => row.status), ['ACTIVE']);
  assert.deepEqual(extras.visitStatusRows({ ...overview, visitRequests: {} }), []);
});

test('recent listings sort newest first without touching the input', () => {
  const places = [
    place({ id: 'old', createdAt: '2026-01-01T00:00:00.000Z' }),
    place({ id: 'new', createdAt: '2026-06-01T00:00:00.000Z' }),
    place({ id: 'mid', createdAt: '2026-03-01T00:00:00.000Z' }),
  ];
  assert.deepEqual(extras.recentPlaces(places).map((row) => row.id), ['new', 'mid', 'old']);
  assert.deepEqual(extras.recentPlaces(places, 2).map((row) => row.id), ['new', 'mid']);
  assert.deepEqual(places.map((row) => row.id), ['old', 'new', 'mid']);
});

test('verification helpers read the way the console shows them', () => {
  const owners = [ownerRow({}), ownerRow({ id: 'o2', verified: true })];
  assert.deepEqual(extras.unverifiedOwners(owners).map((row) => row.id), ['o1']);
  assert.equal(extras.verifyActionLabel(false), 'Verify business');
  assert.equal(extras.verifyActionLabel(true), 'Remove verification');
});

test('the college form rejects values the API would reject', () => {
  const base = extras.emptyCollegeDraft();
  assert.deepEqual(base, { name: '', city: 'Guwahati', state: 'Assam', latitude: '26.1535', longitude: '91.6646' });
  assert.match(extras.validateCollegeDraft(base), /college name/);
  assert.match(extras.validateCollegeDraft({ ...base, name: 'Gauhati University', city: ' ' }), /city/);
  assert.match(extras.validateCollegeDraft({ ...base, name: 'Gauhati University', state: '' }), /state/);
  assert.match(extras.validateCollegeDraft({ ...base, name: 'Gauhati University', latitude: '95' }), /Latitude/);
  assert.match(extras.validateCollegeDraft({ ...base, name: 'Gauhati University', longitude: 'north' }), /Longitude/);
  assert.equal(extras.validateCollegeDraft({ ...base, name: 'Gauhati University' }), null);
});

test('the college payload trims copy and converts coordinates', () => {
  const input = extras.collegeInputFrom({ name: '  Cotton University  ', city: ' Guwahati ', state: ' Assam ', latitude: '26.1445', longitude: '91.7366' });
  assert.deepEqual(input, { name: 'Cotton University', city: 'Guwahati', state: 'Assam', latitude: 26.1445, longitude: 91.7366 });
});

test('admin services call the documented paths, methods and bodies', async () => {
  await admin.fetchAdminOverview('tok');
  assert.deepEqual(services.calls.at(-1), { path: '/admin/overview', options: { method: 'GET', token: 'tok', body: undefined } });

  await admin.fetchAdminPlaces('tok', 'PENDING');
  assert.equal(services.calls.at(-1).path, '/admin/places?status=PENDING');
  await admin.fetchAdminPlaces('tok');
  assert.equal(services.calls.at(-1).path, '/admin/places');

  await admin.moderateAdminPlace('tok', 'p1', 'REJECTED');
  assert.deepEqual(services.calls.at(-1), { path: '/admin/places/p1', options: { method: 'PATCH', token: 'tok', body: { status: 'REJECTED' } } });

  await admin.deleteAdminPlace('tok', 'p1');
  assert.deepEqual(services.calls.at(-1), { path: '/admin/places/p1', options: { method: 'DELETE', token: 'tok', body: undefined } });

  await admin.fetchAdminOwners('tok', false);
  assert.equal(services.calls.at(-1).path, '/admin/owners?verified=false');
  await admin.setAdminOwnerVerified('tok', 'o1', true);
  assert.deepEqual(services.calls.at(-1), { path: '/admin/owners/o1', options: { method: 'PATCH', token: 'tok', body: { verified: true } } });

  services.respond({ colleges: [{ id: 'c1' }] });
  assert.deepEqual(await admin.fetchAdminColleges('tok'), [{ id: 'c1' }]);

  const body = { name: 'Gauhati University', city: 'Guwahati', state: 'Assam', latitude: 26.1535, longitude: 91.6646 };
  await admin.createAdminCollege('tok', body);
  assert.deepEqual(services.calls.at(-1), { path: '/admin/colleges', options: { method: 'POST', token: 'tok', body } });
});

test('the filter and status constants match the console copy', () => {
  assert.deepEqual(admin.ADMIN_MODERATION_STATUSES, ['ACTIVE', 'REJECTED', 'INACTIVE']);
  assert.deepEqual(admin.ADMIN_PLACE_FILTERS.map((entry) => entry.id),
    ['PENDING', 'ACTIVE', 'REJECTED', 'INACTIVE', 'all']);
  assert.equal(admin.ADMIN_PLACE_FILTERS[4].status, undefined);
});

test('sign-in posts to the shared login endpoint and returns the session', async () => {
  const user = { id: 'u1', displayName: 'Demo Admin', email: 'demo.admin@studenthub.local', phone: null, role: 'ADMIN' };
  authApi.respond({ token: 'jwt-token', user });
  const session = await auth.loginAccount({ identifier: 'demo.admin@studenthub.local', password: 'admin-password-123' });
  assert.deepEqual(authApi.calls.at(-1), {
    path: '/auth/login',
    options: { method: 'POST', token: undefined, body: { identifier: 'demo.admin@studenthub.local', password: 'admin-password-123' } },
  });
  assert.deepEqual(session, { token: 'jwt-token', user });
});

test('the stored session round-trips and survives corrupt storage', () => {
  store.clear();
  assert.equal(auth.loadSession(), null);

  const session = { token: 'jwt-token', user: { id: 'u1', displayName: 'Demo Admin', email: null, phone: null, role: 'ADMIN' } };
  auth.saveSession(session);
  assert.deepEqual(auth.loadSession(), session);

  auth.clearSession();
  assert.equal(auth.loadSession(), null);

  store.set('studenthub-admin-session', '{not json');
  assert.equal(auth.loadSession(), null);
  store.set('studenthub-admin-session', JSON.stringify({ token: '', user: { id: 'u1' } }));
  assert.equal(auth.loadSession(), null);
  store.set('studenthub-admin-session', JSON.stringify({ token: 't', user: { id: 'u1', displayName: 'A', email: null, phone: null, role: 'OWNER' } }));
  assert.equal(auth.loadSession()?.user.role, 'OWNER');
});

test('without an API configured, sign-in fails loudly instead of faking data', async () => {
  const offline = loadModule('../src/auth.ts', (id) => {
    if (id === './api') return { apiConfigured: () => false, apiRequest: async () => { throw new Error('never called'); } };
    throw new Error(`unexpected import: ${id}`);
  });
  await assert.rejects(
    offline.loginAccount({ identifier: 'demo.admin@studenthub.local', password: 'x' }),
    /EXPO_PUBLIC_API_BASE_URL/,
  );
});

// --- Dashboard derivation rules (src/dashboardData.ts) ---------------------
// Type-only imports, so this module needs no stubs.

const dashboard = loadModule('../src/dashboardData.ts');
const sample = loadModule('../src/sample.ts');

test('categoryRows groups listings by category with rounded shares', () => {
  const rows = dashboard.categoryRows([
    place({ id: 'a', category: 'PG' }),
    place({ id: 'b', category: 'PG' }),
    place({ id: 'c', category: 'CAFE' }),
    place({ id: 'd', category: 'RESTAURANT' }),
  ]);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].label, 'PGs');
  assert.equal(rows[0].count, 2);
  assert.equal(rows[0].share, 50);
  assert.equal(rows.find((row) => row.category === 'CAFE').share, 25);
  assert.deepEqual(dashboard.categoryRows([]), []);
});

test('totalReviews sums listing review counts; priceLabel renders ₹', () => {
  assert.equal(dashboard.totalReviews([place({ reviewCount: 3 }), place({ reviewCount: 7 })]), 10);
  assert.equal(dashboard.priceLabel(place({ price: 5500, priceUnit: '/month' })), '₹5,500/month');
  assert.equal(dashboard.priceLabel(place({ price: null, priceUnit: null })), null);
});

test('topRatedPlaces drops unreviewed listings and breaks ties by volume', () => {
  const rows = dashboard.topRatedPlaces([
    place({ id: 'a', name: 'A', rating: 4.2, reviewCount: 5 }),
    place({ id: 'b', name: 'B', rating: 4.9, reviewCount: 2 }),
    place({ id: 'c', name: 'C', rating: 5, reviewCount: 0 }),
    place({ id: 'd', name: 'D', rating: 4.9, reviewCount: 9 }),
  ], 2);
  assert.deepEqual(rows.map((row) => row.name), ['D', 'B']);
  assert.deepEqual(dashboard.mostReviewedPlaces([
    place({ id: 'a', name: 'A', reviewCount: 4 }),
    place({ id: 'b', name: 'B', reviewCount: 12 }),
  ]).map((row) => row.name), ['B', 'A']);
});

test('status summaries keep lifecycle order and drop empty rows', () => {
  const visits = dashboard.visitSummaryRows(overview);
  assert.deepEqual(visits.map((row) => row.status), ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']);
  assert.equal(visits.reduce((sum, row) => sum + row.count, 0), 10);
  assert.deepEqual(dashboard.visitSummaryRows({ ...overview, visitRequests: {} }), []);
  assert.equal(
    dashboard.placeSummaryRows(overview).map((row) => row.status).join(','),
    'PENDING,ACTIVE,REJECTED,INACTIVE',
  );
});

test('statTrends builds sparkline arrays from live counts', () => {
  const trends = dashboard.statTrends(overview, [place({ reviewCount: 2 }), place({ reviewCount: 8 })]);
  assert.deepEqual(trends.users, [10, 3, 1]);
  assert.deepEqual(trends.listings, [2, 5, 1, 1, 0]);
  assert.deepEqual(trends.bookings, [4, 1, 2, 3]);
  assert.deepEqual(trends.reviews, [2, 8]);
});

test('relativeTime phrases ages and tolerates bad input', () => {
  const now = Date.parse('2025-05-31T12:00:00.000Z');
  assert.equal(dashboard.relativeTime('2025-05-31T11:58:00.000Z', now), '2 mins ago');
  assert.equal(dashboard.relativeTime('2025-05-31T09:00:00.000Z', now), '3 hours ago');
  assert.equal(dashboard.relativeTime('2025-05-28T12:00:00.000Z', now), '3 days ago');
  assert.equal(dashboard.relativeTime('nonsense', now), '');
});

test('activityFromReal reports only rows the payload actually has', () => {
  const now = Date.parse('2026-05-02T00:00:00.000Z');
  const items = dashboard.activityFromReal(
    [place({ id: 'p9', name: 'Green Valley PG', createdAt: '2026-05-01T23:58:00.000Z' })],
    [ownerRow({})],
    overview,
    now,
  );
  const titles = items.map((item) => item.title);
  assert.ok(titles.includes('New listing added'));
  assert.ok(titles.includes('Listings awaiting review'));
  assert.equal(items.find((item) => item.title === 'New listing added').time, '2 mins ago');
  assert.deepEqual(dashboard.activityFromReal([], [], { ...overview, places: {} }), []);
});

test('mapPins projects colleges, north-up, busiest primary', () => {
  const college = (id, name, latitude, longitude, placeCount) => ({ id, name, city: 'Guwahati', state: 'Assam', latitude, longitude, placeCount, createdAt: '' });
  const pins = dashboard.mapPins([college('c1', 'GU', 26.1, 91.6, 3), college('c2', 'IITG', 26.2, 91.7, 9)]);
  assert.equal(pins.length, 2);
  pins.forEach((pin) => { assert.ok(pin.x >= 0 && pin.x <= 1); assert.ok(pin.y >= 0 && pin.y <= 1); });
  const north = pins.find((pin) => pin.id === 'c2');
  const south = pins.find((pin) => pin.id === 'c1');
  assert.equal(north.primary, true);
  assert.equal(south.primary, false);
  assert.ok(north.y < south.y);
  const solo = dashboard.mapPins([college('c1', 'GU', 1, 2, 0)]);
  assert.deepEqual([solo[0].x, solo[0].y], [0.5, 0.5]);
  assert.deepEqual(dashboard.mapPins([]), []);
});

test('sample fixtures stay internally consistent', () => {
  assert.equal(sample.SAMPLE_GROWTH.labels.length, sample.SAMPLE_GROWTH.users.length);
  assert.equal(sample.SAMPLE_GROWTH.labels.length, sample.SAMPLE_GROWTH.listings.length);
  assert.equal(sample.SAMPLE_GROWTH.labels.length, sample.SAMPLE_GROWTH.bookings.length);
  assert.equal(sample.SAMPLE_BOOKINGS.length, 5);
  assert.ok(sample.SAMPLE_BOOKINGS.every((booking) => sample.SAMPLE_BOOKING_STATUS_COLORS[booking.status]));
  assert.equal(sample.SAMPLE_NOTIFICATIONS.length, 4);
  assert.equal(sample.SAMPLE_ACTIVITY.length, 4);
});