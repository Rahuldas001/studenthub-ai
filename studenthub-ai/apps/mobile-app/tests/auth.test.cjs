const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ts = require('typescript');

const apiSource = fs.readFileSync(path.join(__dirname, '../src/services/api.ts'), 'utf8');
const authSource = fs.readFileSync(path.join(__dirname, '../src/services/auth.ts'), 'utf8');

function compile(source) {
  return ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
}

function instantiate(compiled, requireImpl) {
  const module = { exports: {} };
  new Function('require', 'exports', 'module', compiled)(requireImpl, module.exports, module);
  return module.exports;
}

/**
 * Loads fresh service closures with a controlled API base, fetch behaviour,
 * and filesystem. Fresh evaluation is required because API_BASE intentionally
 * captures the startup environment, just as Expo does.
 */
function loadServices(t, { base, fetchImpl } = {}) {
  const previousBase = process.env.EXPO_PUBLIC_API_BASE_URL;
  const previousFetch = global.fetch;
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'studenthub-auth-test-'));
  const file = path.join(directory, 'studenthub-auth.json');
  t.after(() => {
    if (previousBase === undefined) {
      delete process.env.EXPO_PUBLIC_API_BASE_URL;
    } else {
      process.env.EXPO_PUBLIC_API_BASE_URL = previousBase;
    }
    global.fetch = previousFetch;
    fs.rmSync(directory, { recursive: true, force: true });
  });

  if (base === undefined) {
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
  } else {
    process.env.EXPO_PUBLIC_API_BASE_URL = base;
  }
  if (fetchImpl) {
    global.fetch = fetchImpl;
  }

  const adapter = {
    documentDirectory: `${directory}/`,
    EncodingType: { UTF8: 'utf8' },
    getInfoAsync: async (name) => ({ exists: fs.existsSync(name), isDirectory: false }),
    readAsStringAsync: async (name) => fs.readFileSync(name, 'utf8'),
    writeAsStringAsync: async (name, contents) => fs.writeFileSync(name, contents),
    deleteAsync: async (name) => fs.rmSync(name, { force: true }),
  };
  const types = {};
  const api = instantiate(compile(apiSource), (id) => {
    assert.equal(id, '@studenthub/types');
    return types;
  });
  const auth = instantiate(compile(authSource), (id) => {
    if (id === './api') return api;
    if (id === 'expo-file-system/legacy') return adapter;
    assert.equal(id, '@studenthub/types');
    return types;
  });
  return { api, auth, adapter, file };
}

const session = () => ({
  token: 'token-123',
  user: { id: 'user-1', displayName: 'Asha', email: 'asha@example.com', phone: null, role: 'STUDENT' },
});

test('API base is normalised and reported correctly', async (t) => {
  const configured = loadServices(t, { base: 'https://example.com/api/' });
  assert.equal(configured.api.API_BASE, 'https://example.com/api');
  assert.equal(configured.api.apiConfigured(), true);

  const unconfigured = loadServices(t, { base: undefined });
  assert.equal(unconfigured.api.API_BASE, '');
  assert.equal(unconfigured.api.apiConfigured(), false);
});

test('API requests use JSON and bearer headers', async (t) => {
  const calls = [];
  const { api } = loadServices(t, {
    base: 'https://example.com/api/',
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return { json: async () => ({ success: true, data: { ok: true } }) };
    },
  });

  const data = await api.apiRequest('/favorites', {
    method: 'POST',
    token: 'token-123',
    body: { placeId: 'place-1' },
  });

  assert.deepEqual(data, { ok: true });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://example.com/api/favorites');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.headers['Content-Type'], 'application/json');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer token-123');
  assert.deepEqual(JSON.parse(calls[0].options.body), { placeId: 'place-1' });
});

test('API errors surface the backend message', async (t) => {
  const { api } = loadServices(t, {
    base: 'https://example.com/api',
    fetchImpl: async () => ({ json: async () => ({ success: false, message: 'Invalid credentials' }) }),
  });

  await assert.rejects(api.apiRequest('/auth/login', { method: 'POST', body: {} }), /Invalid credentials/);
});

test('sessions round-trip and can be cleared', async (t) => {
  const { auth, file } = loadServices(t, { base: 'https://example.com/api' });
  await auth.saveSession(session());
  assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), session());
  assert.deepEqual(await auth.loadSession(), session());
  await auth.clearSession();
  await auth.clearSession();
  assert.equal(fs.existsSync(file), false);
  assert.equal(await auth.loadSession(), null);
});

test('invalid stored sessions are ignored rather than used', async (t) => {
  const { auth, file } = loadServices(t, { base: 'https://example.com/api' });
  const invalid = ['{broken', 'null', '{}', JSON.stringify({ token: '', user: session().user })];
  for (const contents of invalid) {
    fs.writeFileSync(file, contents);
    assert.equal(await auth.loadSession(), null);
  }
});

test('registration and login call the expected auth endpoints', async (t) => {
  const calls = [];
  const { auth } = loadServices(t, {
    base: 'https://example.com/api',
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return { json: async () => ({ success: true, data: session() }) };
    },
  });

  const registration = { displayName: 'Asha', email: 'asha@example.com', password: 'password123' };
  assert.deepEqual(await auth.registerAccount(registration), session());
  assert.equal(calls[0].url, 'https://example.com/api/auth/register');
  assert.deepEqual(JSON.parse(calls[0].options.body), registration);

  const loginInput = { identifier: 'asha@example.com', password: 'password123' };
  assert.deepEqual(await auth.loginAccount(loginInput), session());
  assert.equal(calls[1].url, 'https://example.com/api/auth/login');
  assert.deepEqual(JSON.parse(calls[1].options.body), loginInput);
});

test('account actions explain that offline demo mode is guest-only', async (t) => {
  const { auth } = loadServices(t, { base: undefined });
  const account = { displayName: 'Asha', email: 'asha@example.com', password: 'password123' };
  await assert.rejects(auth.registerAccount(account), /need the API/i);
  await assert.rejects(
    auth.loginAccount({ identifier: 'asha@example.com', password: 'password123' }),
    /need the API/i,
  );
});

