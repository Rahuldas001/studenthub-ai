const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const apiSource = fs.readFileSync(path.join(__dirname, '../src/services/api.ts'), 'utf8');
const adminSource = fs.readFileSync(path.join(__dirname, '../src/services/admin.ts'), 'utf8');

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
 * Loads fresh admin-service closures with a controlled API base and fetch, so
 * URL/method/body contracts can be asserted without a running backend.
 */
function loadAdmin(t, { base, fetchImpl } = {}) {
  const previousBase = process.env.EXPO_PUBLIC_API_BASE_URL;
  const previousFetch = global.fetch;
  t.after(() => {
    if (previousBase === undefined) {
      delete process.env.EXPO_PUBLIC_API_BASE_URL;
    } else {
      process.env.EXPO_PUBLIC_API_BASE_URL = previousBase;
    }
    global.fetch = previousFetch;
  });

  if (base === undefined) {
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
  } else {
    process.env.EXPO_PUBLIC_API_BASE_URL = base;
  }
  if (fetchImpl) {
    global.fetch = fetchImpl;
  }

  const types = {};
  const api = instantiate(compile(apiSource), (id) => {
    assert.equal(id, '@studenthub/types');
    return types;
  });
  const admin = instantiate(compile(adminSource), (id) => {
    if (id === './api') return api;
    assert.equal(id, '@studenthub/types');
    return types;
  });
  return { api, admin };
}

/** Records every request and answers with a canned success envelope. */
function recorder(payload) {
  const calls = [];
  return {
    calls,
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return { json: async () => ({ success: true, data: payload }) };
    },
  };
}


test('moderation actions expose only legal target statuses', async (t) => {
  const { admin } = loadAdmin(t, { base: 'https://example.com/api' });
  // PENDING is what owners resubmit; it is never an admin moderation target.
  assert.deepEqual(admin.ADMIN_MODERATION_STATUSES, ['ACTIVE', 'REJECTED', 'INACTIVE']);
  assert.equal(admin.ADMIN_PLACE_FILTERS[0].status, 'PENDING');
  assert.equal(admin.ADMIN_PLACE_FILTERS.at(-1).status, undefined);
});

test('overview, queue, owners, and colleges hit the documented endpoints', async (t) => {
  const { calls, fetchImpl } = recorder({ ok: true });
  const { admin } = loadAdmin(t, { base: 'https://example.com/api', fetchImpl });

  await admin.fetchAdminOverview('admin-token');
  assert.equal(calls[0].url, 'https://example.com/api/admin/overview');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer admin-token');

  await admin.fetchAdminPlaces('admin-token');
  assert.equal(calls[1].url, 'https://example.com/api/admin/places');

  await admin.fetchAdminPlaces('admin-token', 'PENDING');
  assert.equal(calls[2].url, 'https://example.com/api/admin/places?status=PENDING');

  await admin.fetchAdminOwners('admin-token');
  assert.equal(calls[3].url, 'https://example.com/api/admin/owners');

  await admin.fetchAdminOwners('admin-token', false);
  assert.equal(calls[4].url, 'https://example.com/api/admin/owners?verified=false');

  await admin.fetchAdminOwners('admin-token', true);
  assert.equal(calls[5].url, 'https://example.com/api/admin/owners?verified=true');

  await admin.fetchAdminColleges('admin-token');
  assert.equal(calls[6].url, 'https://example.com/api/admin/colleges');
});

test('moderation, verification, and deletion send the right verbs and bodies', async (t) => {
  const { calls, fetchImpl } = recorder({ id: 'place-1', status: 'ACTIVE' });
  const { admin } = loadAdmin(t, { base: 'https://example.com/api', fetchImpl });

  await admin.moderateAdminPlace('admin-token', 'place-1', 'REJECTED');
  assert.equal(calls[0].url, 'https://example.com/api/admin/places/place-1');
  assert.equal(calls[0].options.method, 'PATCH');
  assert.deepEqual(JSON.parse(calls[0].options.body), { status: 'REJECTED' });

  await admin.setAdminOwnerVerified('admin-token', 'owner-1', true);
  assert.equal(calls[1].url, 'https://example.com/api/admin/owners/owner-1');
  assert.equal(calls[1].options.method, 'PATCH');
  assert.deepEqual(JSON.parse(calls[1].options.body), { verified: true });

  await admin.deleteAdminPlace('admin-token', 'place-1');
  assert.equal(calls[2].url, 'https://example.com/api/admin/places/place-1');
  assert.equal(calls[2].options.method, 'DELETE');
  assert.equal(calls[2].options.body, undefined);
});

test('college creation posts the payload and unwraps the list envelope', async (t) => {
  const college = { id: 'college-1', name: 'E2E College', city: 'Guwahati', state: 'Assam' };
  const { calls, fetchImpl } = recorder({ colleges: [college] });
  const { admin } = loadAdmin(t, { base: 'https://example.com/api', fetchImpl });

  assert.deepEqual(await admin.fetchAdminColleges('admin-token'), [college]);
  assert.equal(calls[0].url, 'https://example.com/api/admin/colleges');

  const input = { name: 'E2E College', city: 'Guwahati', state: 'Assam', latitude: 26.14, longitude: 91.73 };
  await admin.createAdminCollege('admin-token', input);
  assert.equal(calls[1].url, 'https://example.com/api/admin/colleges');
  assert.equal(calls[1].options.method, 'POST');
  assert.deepEqual(JSON.parse(calls[1].options.body), input);
});

test('admin failures surface the backend message and status', async (t) => {
  const { admin } = loadAdmin(t, {
    base: 'https://example.com/api',
    fetchImpl: async () => ({
      status: 403,
      json: async () => ({ success: false, message: 'Admin access only.' }),
    }),
  });

  await assert.rejects(
    admin.fetchAdminOverview('student-token'),
    (error) => error.message === 'Admin access only.' && error.status === 403,
  );
});
