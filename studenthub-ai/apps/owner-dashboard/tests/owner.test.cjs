const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

/**
 * Compiles a real `src/` module with the TypeScript transpiler so the tests run
 * the shipped code, not a copy. `ownerExtras.ts` only has type-only imports, so
 * it needs no stubs; `owner.ts` also pulls in the fetch client and the extras
 * module, so those two ids are resolved by hand.
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

const extras = loadModule('../src/ownerExtras.ts');
const owner = loadModule('../src/owner.ts', (id) => {
  if (id === './ownerExtras') return extras;
  if (id === './api') return { apiRequest: () => { throw new Error('the tests never call the API'); } };
  throw new Error(`unexpected import: ${id}`);
});

const place = (overrides) => ({
  id: 'p1', category: 'PG', name: 'Green Valley PG', address: 'Jalukbari, Guwahati',
  status: 'ACTIVE', rating: 4.5, reviewCount: 10, price: 5500, priceUnit: '/month',
  pendingRequests: 0, createdAt: '2026-05-01T00:00:00.000Z', updatedAt: '2026-05-01T00:00:00.000Z',
  imageUrl: 'https://img.example.com/pg.jpg',
  ...overrides,
});

const draft = (overrides) => ({
  placeId: '', title: 'Student combo', description: 'Thali plus a cold drink at 20% off.',
  discount: '20', validTill: '', ...overrides,
});

const offer = (overrides) => ({
  id: 'offer-1', placeId: null, placeName: null, title: 'Student combo', description: 'Thali plus drink.',
  discount: 20, validTill: null, active: true,
  createdAt: '2026-06-01T00:00:00.000Z', updatedAt: '2026-06-01T00:00:00.000Z',
  ...overrides,
});

test('offer drafts are validated before they are sent to the API', () => {
  assert.equal(extras.validateOfferDraft(draft()), null);
  assert.match(extras.validateOfferDraft(draft({ title: 'ab' })), /title/);
  assert.match(extras.validateOfferDraft(draft({ description: 'hi' })), /Describe/);
  assert.match(extras.validateOfferDraft(draft({ discount: '0' })), /between 1 and 90/);
  assert.match(extras.validateOfferDraft(draft({ discount: '95' })), /between 1 and 90/);
  assert.match(extras.validateOfferDraft(draft({ validTill: '2030-02-31' })), /real date/);
  assert.match(extras.validateOfferDraft(draft({ validTill: '2020-01-01' })), /today or a future date/);
});

test('toOfferInput trims the copy and keeps the discount', () => {
  const input = extras.toOfferInput(draft({ title: '  Student combo  ', description: '  Thali plus drink.  ' }));
  assert.equal(input.title, 'Student combo');
  assert.equal(input.description, 'Thali plus drink.');
  assert.equal(input.discount, 20);
  assert.equal(input.placeId, null);
  assert.equal(input.validTill, null);
  assert.equal(extras.toOfferInput(draft({ placeId: 'p1', validTill: '2030-06-30' })).placeId, 'p1');
});

test('badges and targets read the way the dashboard shows them', () => {
  const places = [place({})];
  assert.equal(extras.offerBadge(offer({ discount: 25 })), '25% OFF');
  assert.equal(extras.offerTarget(offer(), places), 'All listings');
  assert.equal(extras.offerTarget(offer({ placeId: 'p1' }), places), 'Green Valley PG');
  assert.equal(extras.offerTarget(offer({ placeId: 'gone' }), places), 'Deleted listing');
});

test('offers stop counting as live when paused or expired', () => {
  const today = new Date('2026-06-10T00:00:00.000Z');
  assert.equal(extras.isOfferLive(offer(), today), true);
  assert.equal(extras.isOfferLive(offer({ active: false }), today), false);
  assert.equal(extras.isOfferLive(offer({ validTill: '2026-06-09' }), today), false);
  assert.equal(extras.isOfferLive(offer({ validTill: '2026-06-10' }), today), true);
  assert.equal(extras.liveOffers([offer(), offer({ id: 'offer-2', active: false })], today).length, 1);
});

test('listing extras map onto the API listing row', () => {
  assert.deepEqual(extras.emptyPlaceExtras(), {
    whatsapp: '',
    openingHours: extras.OPENING_HOURS_OPTIONS[1],
    priceBand: '',
  });
  const mapped = extras.placeExtrasFrom(place({ whatsapp: '9876543210', openingHours: 'Open 24 hours', priceBand: 'MID' }));
  assert.deepEqual(mapped, { whatsapp: '9876543210', openingHours: 'Open 24 hours', priceBand: 'MID' });
  assert.deepEqual(extras.placeExtrasFrom(place({})), { whatsapp: '', openingHours: '', priceBand: '' });
});

test('empty drafts and defaults are ready for the forms', () => {
  assert.deepEqual(extras.emptyOfferDraft('p1'), { placeId: 'p1', title: '', description: '', discount: '', validTill: '' });
  assert.equal(extras.priceBandLabel('BUDGET'), '₹');
  assert.equal(extras.priceBandLabel('PREMIUM'), '₹₹₹');
  assert.equal(extras.priceBandLabel(''), '');
  assert.ok(extras.FACILITY_SUGGESTIONS.includes('Wi-Fi'));
  assert.deepEqual(extras.PRICE_BAND_IDS, ['BUDGET', 'MID', 'PREMIUM']);
});

test('the listing form round-trips a saved listing, extras included', () => {
  const saved = place({ status: 'INACTIVE', description: '  Quiet rooms.  ', whatsapp: '98765 43210', openingHours: '7:00 AM – 9:00 PM', priceBand: 'MID' });
  const form = owner.placeFormFrom(saved);
  assert.equal(form.name, 'Green Valley PG');
  assert.equal(form.whatsapp, '98765 43210');
  assert.equal(form.openingHours, '7:00 AM – 9:00 PM');
  assert.equal(form.priceBand, 'MID');
  assert.equal(form.price, '5500');
  assert.equal(owner.validateOwnerPlaceForm(form), null);
  const input = owner.toOwnerPlaceInput(form);
  assert.equal(input.whatsapp, '98765 43210');
  assert.equal(input.priceBand, 'MID');
  assert.equal(input.price, 5500);
});

test('the listing form rejects extras the API would reject', () => {
  const base = { ...owner.emptyPlaceForm(), name: 'Green Leaf PG', address: 'Jalukbari, Guwahati', imageUrl: 'https://img.example.com/a.jpg' };
  assert.match(owner.validateOwnerPlaceForm({ ...base, whatsapp: '123' }), /WhatsApp/);
  assert.match(owner.validateOwnerPlaceForm({ ...base, openingHours: 'x'.repeat(61) }), /opening hours/);
  assert.match(owner.validateOwnerPlaceForm({ ...base, priceBand: 'CHEAP' }), /price bands/);
  assert.equal(owner.validateOwnerPlaceForm({ ...base, priceBand: 'PREMIUM' }), null);
});
