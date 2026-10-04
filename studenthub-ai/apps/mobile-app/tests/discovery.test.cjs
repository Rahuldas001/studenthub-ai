const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Compile the real source; `@studenthub/types` is a type-only import and is
// erased by the compiler, so nothing needs to be stubbed at runtime.
const source = fs.readFileSync(path.join(__dirname, '../src/utils/discovery.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const moduleExports = {};
new Function('require', 'exports', 'module', compiled)(
  (id) => { throw new Error(`unexpected import: ${id}`); },
  moduleExports,
  { exports: moduleExports },
);
const { filterPlaces, validateVisit } = moduleExports;

const place = (overrides) => ({
  id: 'p', category: 'PG', name: 'Test PG', address: 'Jalukbari, Guwahati',
  latitude: 26.15, longitude: 91.66, price: 5000, priceUnit: '/month',
  rating: 4, reviewCount: 1, distanceKm: 1, imageUrl: '', gender: null,
  verified: false, facilities: [], ...overrides,
});

const places = [
  place({ id: 'boys-pg', name: 'Green Valley PG', category: 'PG', gender: 'BOYS', price: 5500, distanceKm: 0.6, rating: 4.6 }),
  place({ id: 'girls-pg', name: 'Modern Stay PG', category: 'PG', gender: 'GIRLS', price: 6500, distanceKm: 0.9, rating: 4.2 }),
  place({ id: 'coed-hostel', name: 'Campus Hostel', category: 'HOSTEL', gender: 'CO_ED', price: 4200, distanceKm: 0.5, rating: 3.9 }),
  place({ id: 'cafe', name: 'Foodies Cafe', category: 'CAFE', gender: null, price: 120, distanceKm: 0.7, rating: 4.8 }),
  place({ id: 'library', name: 'Campus Study Corner', category: 'LIBRARY', gender: null, price: null, distanceKm: 0.2, rating: 4.4 }),
];

const ids = (list) => list.map((item) => item.id);

test('category filtering narrows to one category, ALL keeps everything', () => {
  assert.deepEqual(ids(filterPlaces(places, '', 'PG', '', 'recommended')), ['boys-pg', 'girls-pg']);
  assert.equal(filterPlaces(places, '', 'ALL', '', 'recommended').length, places.length);
});

test('search matches name, category and address case-insensitively', () => {
  assert.deepEqual(ids(filterPlaces(places, 'green', 'ALL', '', 'recommended')), ['boys-pg']);
  assert.deepEqual(ids(filterPlaces(places, 'HOSTEL', 'ALL', '', 'recommended')), ['coed-hostel']);
  assert.deepEqual(ids(filterPlaces(places, 'guwahati', 'ALL', '', 'recommended')).length, places.length);
  assert.deepEqual(ids(filterPlaces(places, 'nothing', 'ALL', '', 'recommended')), []);
});

test('budget caps price and drops unpriced listings', () => {
  assert.deepEqual(ids(filterPlaces(places, '', 'ALL', '5500', 'recommended')).sort(), ['boys-pg', 'cafe', 'coed-hostel']);
  assert.deepEqual(ids(filterPlaces(places, '', 'ALL', '100', 'recommended')), []);
  assert.equal(filterPlaces(places, '', 'ALL', '', 'recommended').length, places.length);
});

test('gender narrows PG/hostel stays but keeps food and services visible', () => {
  assert.deepEqual(ids(filterPlaces(places, '', 'ALL', '', 'recommended', 'GIRLS')).sort(), ['cafe', 'girls-pg', 'library']);
  assert.deepEqual(ids(filterPlaces(places, '', 'PG', '', 'recommended', 'GIRLS')), ['girls-pg']);
  assert.deepEqual(ids(filterPlaces(places, '', 'HOSTEL', '', 'recommended', 'CO_ED')), ['coed-hostel']);
  assert.deepEqual(ids(filterPlaces(places, '', 'PG', '', 'recommended', 'CO_ED')), []);
  assert.equal(filterPlaces(places, '', 'ALL', '', 'recommended', '').length, places.length);
});

test('sorting: price puts unpriced last, distance and rating are ordered', () => {
  assert.deepEqual(ids(filterPlaces(places, '', 'ALL', '', 'price')), ['cafe', 'coed-hostel', 'boys-pg', 'girls-pg', 'library']);
  assert.deepEqual(ids(filterPlaces(places, '', 'ALL', '', 'distance'))[0], 'library');
  assert.deepEqual(ids(filterPlaces(places, '', 'ALL', '', 'recommended'))[0], 'cafe');
});

test('validateVisit accepts future dates and explains rejections', () => {
  const future = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const past = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  assert.equal(validateVisit('Asha', future), null);
  assert.match(validateVisit('A', future), /name/i);
  assert.match(validateVisit('Asha', '25-09-2026'), /YYYY-MM-DD/);
  assert.match(validateVisit('Asha', '2026-02-31'), /valid calendar date/);
  assert.match(validateVisit('Asha', past), /today or a future date/);
});
