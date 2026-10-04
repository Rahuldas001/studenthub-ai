const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ts = require('typescript');

// Compile the actual source with the installed compiler; replace only the native adapter.
const source = fs.readFileSync(path.join(__dirname, '../src/services/storage.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const place = {
  id: 'p1', category: 'PG', name: 'Test PG', address: 'Guwahati',
  latitude: 26.1, longitude: 91.6, price: 5000, priceUnit: '/month',
  rating: 4, reviewCount: 1, distanceKm: 1, imageUrl: '', gender: null,
  verified: false, facilities: [],
};
const state = (name = 'Asha') => ({ name, hasLaunched: false, history: [], campus: '', saved: [place], visits: [
  { id: 'v1', place, name, date: '2026-10-01', note: 'Visit' },
] });
function setup(t, overrides = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'studenthub-test-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'studenthub-state.json');
  const adapter = {
    documentDirectory: `${directory}/`, EncodingType: { UTF8: 'utf8' },
    getInfoAsync: async (name) => ({ exists: fs.existsSync(name), isDirectory: false }),
    readAsStringAsync: async (name) => fs.readFileSync(name, 'utf8'),
    writeAsStringAsync: async (name, contents) => fs.writeFileSync(name, contents),
    deleteAsync: async (name) => fs.rmSync(name, { force: true }),
    ...overrides,
  };
  function restart() {
    const exports = {};
    new Function('require', 'exports', compiled)((id) => {
      assert.equal(id, 'expo-file-system/legacy');
      return adapter;
    }, exports);
    return exports;
  }
  return { ...restart(), adapter, file, restart };
}

test('missing file returns null', async (t) => {
  assert.equal(await setup(t).loadStoredState(), null);
});
test('name, saves and visits round-trip to disk', async (t) => {
  const s = setup(t);
  await s.saveStoredState(state());
  assert.deepEqual(JSON.parse(fs.readFileSync(s.file, 'utf8')), state());
  assert.deepEqual(await s.loadStoredState(), state());
});
test('corrupt JSON and non-record data do not throw', async (t) => {
  const s = setup(t);
  for (const contents of ['{broken', 'null', '42']) {
    fs.writeFileSync(s.file, contents);
    assert.equal(await s.loadStoredState(), null);
  }
});
test('invalid entries are filtered and names capped', async (t) => {
  const s = setup(t);
  fs.writeFileSync(s.file, JSON.stringify({ saved: [null, {}, place], visits: [null, {}], name: 'x'.repeat(80) }));
  assert.deepEqual(await s.loadStoredState(), { saved: [place], visits: [], name: 'x'.repeat(50), hasLaunched: false, history: [], campus: '' });
});
test('history entries are validated and capped at 20', async (t) => {
  const s = setup(t);
  const entry = { place, viewedAt: '2026-09-21T10:00:00.000Z' };
  const entries = Array.from({ length: 25 }, (_, index) => ({ ...entry, viewedAt: `2026-01-${String((index % 28) + 1).padStart(2, '0')}T00:00:00.000Z` }));
  fs.writeFileSync(s.file, JSON.stringify({
    saved: [], visits: [], name: '', hasLaunched: true,
    history: [null, { place: { ...place, id: 42 }, viewedAt: 'nope' }, { place, viewedAt: 99 }, ...entries],
  }));
  const loaded = await s.loadStoredState();
  assert.equal(loaded.history.length, 20);
  assert.deepEqual(loaded.history[0], entries[0]);
  fs.writeFileSync(s.file, JSON.stringify({ saved: [], visits: [], name: '', hasLaunched: true, history: [entry] }));
  assert.deepEqual((await s.loadStoredState()).history, [entry]);
});
test('clear deletes the file and is idempotent', async (t) => {
  const s = setup(t);
  await s.saveStoredState(state());
  await s.clearStoredState();
  await s.clearStoredState();
  assert.equal(fs.existsSync(s.file), false);
  assert.equal(await s.loadStoredState(), null);
});
test('slow older save cannot overwrite a newer save', async (t) => {
  const s = setup(t, { writeAsStringAsync: async (file, contents) => {
    if (JSON.parse(contents).name === 'Old') await new Promise((resolve) => setTimeout(resolve, 30));
    fs.writeFileSync(file, contents);
  } });
  await Promise.all([s.saveStoredState(state('Old')), s.saveStoredState(state('New'))]);
  assert.equal((await s.loadStoredState()).name, 'New');
});
test('save followed immediately by clear stays deleted', async (t) => {
  const s = setup(t);
  await Promise.all([s.saveStoredState(state()), s.clearStoredState()]);
  assert.equal(fs.existsSync(s.file), false);
});
test('save after clear remains saved and load waits for writes', async (t) => {
  const s = setup(t);
  const clear = s.clearStoredState();
  const save = s.saveStoredState(state());
  assert.deepEqual(await s.loadStoredState(), state());
  await Promise.all([clear, save]);
});
test('a failed write does not poison the queue', async (t) => {
  const s = setup(t);
  const write = s.adapter.writeAsStringAsync;
  s.adapter.writeAsStringAsync = async () => { throw new Error('Disk full'); };
  await assert.doesNotReject(s.saveStoredState(state()));
  s.adapter.writeAsStringAsync = write;
  await s.saveStoredState(state('Recovered'));
  assert.equal((await s.loadStoredState()).name, 'Recovered');
});
test('read and delete failures do not reject', async (t) => {
  const fail = async () => { throw new Error('Unavailable'); };
  const s = setup(t, { getInfoAsync: fail, deleteAsync: fail });
  assert.equal(await s.loadStoredState(), null);
  await assert.doesNotReject(s.clearStoredState());
});
test('missing document directory never accesses a relative file', async (t) => {
  let calls = 0;
  const unexpected = async () => { calls += 1; throw new Error('Unexpected filesystem access'); };
  const s = setup(t, { documentDirectory: null, getInfoAsync: unexpected, writeAsStringAsync: unexpected, deleteAsync: unexpected });
  await s.saveStoredState(state());
  await s.clearStoredState();
  assert.equal(await s.loadStoredState(), null);
  assert.equal(calls, 0);
});
test('queued save snapshots input before later mutation', async (t) => {
  const s = setup(t);
  const input = state();
  const save = s.saveStoredState(input);
  input.name = 'Changed';
  await save;
  assert.equal((await s.loadStoredState()).name, 'Asha');
});

test('welcome completion survives a fresh storage module without profile data', async (t) => {
  const s = setup(t);
  assert.equal(await s.loadStoredState(), null);
  const completed = { saved: [], visits: [], name: '', hasLaunched: true, history: [], campus: '' };
  await s.saveStoredState(completed);
  assert.deepEqual(await s.restart().loadStoredState(), completed);
});
test('legacy data defaults to an incomplete welcome without losing activity', async (t) => {
  const s = setup(t);
  const { hasLaunched, ...legacy } = state();
  fs.writeFileSync(s.file, JSON.stringify(legacy));
  assert.deepEqual(await s.loadStoredState(), state());
});
test('only boolean true marks welcome complete', async (t) => {
  const s = setup(t);
  for (const value of ['true', 1, null, false]) {
    fs.writeFileSync(s.file, JSON.stringify({ ...state(), hasLaunched: value }));
    assert.equal((await s.loadStoredState()).hasLaunched, false);
  }
});
test('clearing stored data resets welcome completion', async (t) => {
  const s = setup(t);
  await s.saveStoredState({ ...state(), hasLaunched: true });
  await s.clearStoredState();
  assert.equal(await s.restart().loadStoredState(), null);
});
test('a state saved with the welcome flag cleared leads back to the welcome screen', async (t) => {
  const s = setup(t);
  await s.saveStoredState({ ...state(), hasLaunched: false });
  const loaded = await s.restart().loadStoredState();
  assert.equal(loaded.hasLaunched, false);
  assert.deepEqual(loaded.saved, state().saved);
});
test('an empty state without the welcome flag loads as a fresh install', async (t) => {
  const s = setup(t);
  await s.saveStoredState({ saved: [], visits: [], name: '', hasLaunched: false });
  assert.equal(await s.loadStoredState(), null);
});
test('selected campus round-trips and survives restarts', async (t) => {
  const s = setup(t);
  await s.saveStoredState({ ...state(), campus: 'Gauhati University' });
  const loaded = await s.restart().loadStoredState();
  assert.equal(loaded.campus, 'Gauhati University');
  // Non-string campus values from a hand-edited file fall back to empty.
  fs.writeFileSync(s.file, JSON.stringify({ ...state(), campus: 42 }));
  assert.equal((await s.loadStoredState()).campus, '');
});

test('discovery location round-trips and rejects malformed values', async (t) => {
  const s = setup(t);
  const location = { city: 'Dhubri', latitude: 26.0207, longitude: 89.9753 };
  await s.saveStoredState({ ...state(), location });
  const loaded = await s.restart().loadStoredState();
  assert.deepEqual(loaded.location, location);
  // A partial location from a hand-edited file is discarded entirely.
  fs.writeFileSync(s.file, JSON.stringify({ ...state(), location: { city: 'Dhubri' } }));
  assert.equal((await s.loadStoredState()).location, undefined);
  // Coordinates must be finite numbers, not strings.
  fs.writeFileSync(s.file, JSON.stringify({ ...state(), location: { city: 'Dhubri', latitude: '26.02', longitude: 89.97 } }));
  assert.equal((await s.loadStoredState()).location, undefined);
});


