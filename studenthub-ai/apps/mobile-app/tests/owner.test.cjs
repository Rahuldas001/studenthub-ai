const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Compile the real owner helper module; every import in it is type-only, so
// nothing needs to be stubbed at runtime. Offers, extras and review replies
// themselves live behind /api/owner/* and are covered by the backend tests.
function loadModule(relativePath) {
  const source = fs.readFileSync(path.join(__dirname, relativePath), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const moduleExports = {};
  new Function('require', 'exports', 'module', compiled)(
    (id) => { throw new Error(`unexpected import: ${id}`); },
    moduleExports,
    { exports: moduleExports },
  );
  return moduleExports;
}

const extras = loadModule('../src/utils/ownerExtras.ts');

const place = (overrides) => ({
  id: 'p1', category: 'PG', name: 'Green Valley PG', address: 'Jalukbari, Guwahati',
  status: 'ACTIVE', rating: 4.5, reviewCount: 10, price: 5500, priceUnit: '/month',
  pendingRequests: 0, createdAt: '2026-05-01T00:00:00.000Z', updatedAt: '2026-05-01T00:00:00.000Z',
  ...overrides,
});

const draft = (overrides) => ({
  placeId: '', title: 'Student combo', description: 'Thali plus a cold drink at 20% off.',
  discount: '20', validTill: '', ...overrides,
});

const offer = (overrides) => ({
  id: 'offer-1', placeId: null, placeName: null, title: 'Student combo', description: 'Thali plus drink.',
  discount: 20, validTill: null, active: true,
  createdAt: '2026-05-01T10:00:00.000Z', updatedAt: '2026-05-01T10:00:00.000Z', ...overrides,
});

test('offer drafts are validated before they are sent to the API', () => {
  assert.equal(extras.validateOfferDraft(draft()), null);
  assert.match(extras.validateOfferDraft(draft({ title: 'ab' })), /title/);
  assert.match(extras.validateOfferDraft(draft({ description: 'hi' })), /Describe/);
  assert.match(extras.validateOfferDraft(draft({ discount: '0' })), /between 1 and 90/);
  assert.match(extras.validateOfferDraft(draft({ discount: '10.5' })), /between 1 and 90/);
  assert.match(extras.validateOfferDraft(draft({ discount: '95' })), /between 1 and 90/);
  assert.match(extras.validateOfferDraft(draft({ validTill: '2030-02-31' })), /real date/);
  assert.match(extras.validateOfferDraft(draft({ validTill: '2020-01-01' })), /today or a future date/);
  const tomorrow = new Date(Date.now() + 86_400_000);
  assert.equal(extras.validateOfferDraft(draft({ validTill: extras.todayIso(tomorrow) })), null);
});

test('toOfferInput trims the copy and keeps the discount', () => {
  const input = extras.toOfferInput(draft({ title: '  Student combo  ', description: '  Thali plus drink.  ', discount: '15' }));
  assert.equal(input.title, 'Student combo');
  assert.equal(input.description, 'Thali plus drink.');
  assert.equal(input.discount, 15);
  assert.equal(input.placeId, null);
  assert.equal(input.validTill, null);
  assert.equal(extras.toOfferInput(draft({ placeId: 'p1', validTill: '2030-06-30' })).placeId, 'p1');
});

test('badges and targets read the way the owner app shows them', () => {
  const places = [{ id: 'p1', name: 'Green Valley PG' }];
  assert.equal(extras.offerBadge(offer({ discount: 25 })), '25% OFF');
  assert.equal(extras.offerTarget(offer(), places), 'All listings');
  assert.equal(extras.offerTarget(offer({ placeId: 'p1' }), places), 'Green Valley PG');
  assert.equal(extras.offerTarget(offer({ placeId: 'gone' }), places), 'Deleted listing');
  assert.equal(extras.offerTarget(offer({ placeId: 'p1', placeName: 'Server name' }), places), 'Server name');
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
    whatsapp: '', openingHours: extras.OPENING_HOURS_OPTIONS[1], priceBand: '',
  });
  const mapped = extras.placeExtrasFrom(place({
    whatsapp: '9876543210', openingHours: 'Open 24 hours', priceBand: 'MID',
  }));
  assert.deepEqual(mapped, { whatsapp: '9876543210', openingHours: 'Open 24 hours', priceBand: 'MID' });
  // Unset columns come back as empty strings the form can render.
  assert.deepEqual(extras.placeExtrasFrom(place({})), {
    whatsapp: '', openingHours: '', priceBand: '',
  });
});

test('empty drafts and defaults are ready for the forms', () => {
  assert.deepEqual(extras.emptyOfferDraft('p1'), { placeId: 'p1', title: '', description: '', discount: '', validTill: '' });
  assert.equal(extras.priceBandLabel('BUDGET'), '₹');
  assert.equal(extras.priceBandLabel('PREMIUM'), '₹₹₹');
  assert.equal(extras.priceBandLabel(''), '');
  assert.ok(extras.FACILITY_SUGGESTIONS.includes('Wi-Fi'));
});

