const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

// Jalankan modul TS aplikasi langsung tanpa build Next atau layanan eksternal.
const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  return resolveFilename.call(this, request.startsWith('@/') ? path.join(__dirname, '../src', request.slice(2)) : request, parent, ...rest);
};
require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021, esModuleInterop: true } });
  module._compile(outputText, filename);
};
const storage = new Map();
global.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) };
global.window = { localStorage: global.localStorage, location: { href: '' } };
const { apiClient } = require('../src/lib/api-client');
const { useAuthStore } = require('../src/lib/stores/auth');
const { logoutSession } = require('../src/lib/auth-actions');
const { AxiosError } = require('axios');
const originalLog = console.error;
console.error = () => {};
after(() => { console.error = originalLog; });
beforeEach(() => useAuthStore.getState().logout());
const response = (config, data, status = 200) => ({ config, status, statusText: 'test', headers: {}, data });
const unauthorized = (config) => Promise.reject(new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, response(config, { statusCode: 401, message: 'Tidak valid' }, 401)));

test('login gagal tidak mencoba refresh atau mengganti sesi', async () => {
  const urls = [];
  apiClient.client.defaults.adapter = (config) => { urls.push(config.url); return unauthorized(config); };
  await assert.rejects(apiClient.post('/api/v1/auth/login', { email: 'wrong@example.test', password: 'bad' }), (error) => error.statusCode === 401);
  assert.deepEqual(urls, ['/api/v1/auth/login']);
});

test('request paralel memakai satu refresh lalu mengulang dengan token baru', async () => {
  useAuthStore.getState().login({ id: 'u' }, 'old-token');
  let refreshes = 0;
  apiClient.client.defaults.adapter = async (config) => {
    if (config.url.endsWith('/auth/refresh')) {
      refreshes++;
      await new Promise((resolve) => setImmediate(resolve));
      return response(config, { data: { tokens: { accessToken: 'new-token' } } });
    }
    if (config.headers.Authorization !== 'Bearer new-token') return unauthorized(config);
    return response(config, { data: 'ok' });
  };
  const results = await Promise.all([apiClient.get('/protected/a'), apiClient.get('/protected/b')]);
  assert.equal(refreshes, 1);
  assert.equal(useAuthStore.getState().token, 'new-token');
  assert.deepEqual(results.map((result) => result.data), ['ok', 'ok']);
});

test('refresh gagal tidak membuat loop dan membersihkan sesi lokal', async () => {
  useAuthStore.getState().login({ id: 'u' }, 'old-token');
  let requests = 0;
  apiClient.client.defaults.adapter = (config) => { requests++; return unauthorized(config); };
  await assert.rejects(apiClient.get('/protected'));
  assert.equal(requests, 2);
  assert.equal(useAuthStore.getState().isAuthenticated, false);
});

test('respons refresh yang terlambat tidak menghidupkan sesi setelah logout', async () => {
  useAuthStore.getState().login({ id: 'u' }, 'old-token');
  let finishRefresh;
  let refreshStarted;
  const started = new Promise((resolve) => { refreshStarted = resolve; });
  apiClient.client.defaults.adapter = async (config) => {
    if (config.url.endsWith('/auth/refresh')) {
      refreshStarted();
      await new Promise((resolve) => { finishRefresh = resolve; });
      return response(config, { data: { tokens: { accessToken: 'late-token' } } });
    }
    return unauthorized(config);
  };
  const pending = apiClient.get('/protected');
  const rejected = assert.rejects(pending);
  await started;
  useAuthStore.getState().logout();
  finishRefresh();
  await rejected;
  assert.equal(useAuthStore.getState().token, null);
});

test('logout memanggil endpoint penghapusan cookie dan membersihkan sesi', async () => {
  useAuthStore.getState().login({ id: 'u' }, 'token');
  const urls = [];
  apiClient.client.defaults.adapter = async (config) => { urls.push(config.url); return response(config, { data: null }); };
  await logoutSession();
  assert.deepEqual(urls, ['/api/v1/auth/logout']);
  assert.equal(useAuthStore.getState().token, null);
});

test('logout tetap membersihkan sesi saat server tidak tersedia', async () => {
  useAuthStore.getState().login({ id: 'u' }, 'token');
  apiClient.client.defaults.adapter = async () => { throw new Error('Offline'); };
  await assert.rejects(logoutSession());
  assert.equal(useAuthStore.getState().isAuthenticated, false);
});


test('pemilih data mengambil halaman lanjutan setelah 500 baris', async () => {
  const pages = [];
  apiClient.client.defaults.adapter = async (config) => {
    pages.push(config.params.page);
    return response(config, { data: config.params.page === 1 ? Array.from({ length: 500 }, (_, id) => ({ id })) : [{ id: 500 }], meta: { total: 501, totalPages: 2 } });
  };
  const result = await apiClient.getAll('/api/v1/locations');
  assert.equal(result.data.length, 501);
  assert.equal(result.data[500].id, 500);
  assert.deepEqual(pages, [1, 2]);
});
