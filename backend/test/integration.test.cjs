const { test } = require('node:test');
const assert = require('node:assert/strict');

test('integrasi API pada database PostgreSQL dan Redis khusus pengujian', {
  skip: !process.env.TEST_DATABASE_URL || !process.env.TEST_REDIS_PORT,
}, async (t) => {
  const url = new URL(process.env.TEST_DATABASE_URL);
  assert.equal(url.hostname, '127.0.0.1', 'Pengujian wajib memakai database lokal khusus');
  assert.equal(url.pathname, '/sipp_audit_test', 'Pengujian dilarang memakai database aplikasi');
  Object.assign(process.env, {
    DATABASE_URL: url.href,
    REDIS_HOST: '127.0.0.1',
    REDIS_PORT: process.env.TEST_REDIS_PORT,
    NODE_ENV: 'test',
    JWT_SECRET: 'isolated-audit-test-access-secret',
    JWT_REFRESH_SECRET: 'isolated-audit-test-refresh-secret',
    JWT_EXPIRES_IN: '1h',
  });
  require('reflect-metadata');
  const { NestFactory } = require('@nestjs/core');
  const { ValidationPipe } = require('@nestjs/common');
  const { AppModule } = require('../src/app.module');
  const { PrismaService } = require('../src/database/prisma.service');
  const { AuthService } = require('../src/modules/auth/auth.service');
  const { HttpExceptionFilter } = require('../src/common/filters/http-exception.filter');
  const { DecimalTransformInterceptor } = require('../src/common/interceptors/decimal-transform.interceptor');
  const { io } = require('../../frontend/node_modules/socket.io-client');
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api');
  app.use(require('cookie-parser')());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new DecimalTransformInterceptor());
  const sockets = [];
  try {
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    const prisma = app.get(PrismaService);
    const run = Date.now();
    const createLocation = (suffix) => prisma.location.create({ data: { code: `TEST-${run}-${suffix}`, name: `Lokasi ${suffix}`, province: 'Audit', city: 'Audit', address: 'Audit', latitude: 0, longitude: 0 } });
    const [locA, locB] = await Promise.all([createLocation('A'), createLocation('B')]);
    await prisma.masterItem.upsert({
      where: { no: 9999 },
      create: { no: 9999, name: 'Master uji audit', unit: 'unit', qty100: 1, qty200: 2, qty300: 3, qty400: 4, qty500: 5 },
      update: {},
    });
    const password = await AuthService.hashPassword('test-password');
    const createUser = (role, locationId) => prisma.user.create({ data: { email: `${role}-${run}@example.test`, name: role, role, password, locationId } });
    const [admin, scoped, viewer] = await Promise.all([createUser('SUPER_ADMIN'), createUser('COORDINATOR', locA.id), createUser('PIMPINAN')]);
    const auth = app.get(AuthService);
    const [adminSession, scopedSession, viewerSession] = await Promise.all([admin, scoped, viewer].map((user) => auth.login({ email: user.email, password: 'test-password' })));
    const tokenAdmin = adminSession.tokens.accessToken;
    const tokenScoped = scopedSession.tokens.accessToken;
    const tokenViewer = viewerSession.tokens.accessToken;
    const request = async (path, { token = tokenAdmin, method = 'GET', body } = {}) => {
      const res = await fetch(`${base}/api/v1${path}`, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
      return { status: res.status, body: await res.json(), headers: res.headers };
    };

    await t.test('login HTTP dan logout tanpa access token', async () => {
      const login = await request('/auth/login', { method: 'POST', token: '', body: { email: scoped.email, password: 'test-password' } });
      assert.equal(login.status, 200);
      assert.match(login.headers.get('set-cookie'), /refresh_token=/);
      assert.equal(login.body.data.tokens.expiresIn, 3600);
      const logout = await request('/auth/logout', { method: 'POST', token: '' });
      assert.equal(logout.status, 200);
      assert.match(logout.headers.get('set-cookie'), /refresh_token=;/);
    });

    await t.test('filter daftar, detail dan statistik dipaksa ke lokasi penugasan', async () => {
      const list = await request('/locations', { token: tokenScoped });
      assert.equal(list.status, 200);
      assert.deepEqual(list.body.data.map((l) => l.id), [locA.id]);
      assert.equal((await request(`/locations/${locB.id}`, { token: tokenScoped })).status, 403);
      assert.equal((await request(`/locations?locationId=${locB.id}`, { token: tokenScoped })).status, 403);
      assert.equal((await request('/locations/stats/summary', { token: tokenScoped })).body.data.totalLocations, 1);
      const reports = await request('/reports/locations', { token: tokenScoped });
      assert.deepEqual(reports.body.data.map((l) => l.id), [locA.id]);
    });

    let item;
    await t.test('barang baru tetap menghasilkan enam fase dan progres laporan yang sama', async () => {
      const created = await request(`/locations/${locA.id}/items`, { method: 'POST', body: { name: 'Item uji', qty: 1, unit: 'unit' } });
      assert.equal(created.status, 201);
      item = created.body.data;
      assert.equal((await request(`/stages/location/${locA.id}`)).body.data.length, 6);
      assert.equal((await request(`/locations/${locA.id}/items/${item.id}`, { method: 'PATCH', body: { installationPct: 50 } })).status, 200);
      const stage = (await request(`/stages/location/${locA.id}`)).body.data.find((s) => s.phase === 'INSTALASI');
      assert.equal(stage.progress, 50);
      assert.equal(stage.status, 'IN_PROGRESS');
      const report = await request('/reports/installations', { token: tokenScoped });
      assert.equal(report.body.data[0].averagePercentage, 50);
      const summary = await request('/installations/summary', { token: tokenScoped });
      assert.equal(summary.body.data[0].averagePercentage, 50);
    });

    await t.test('pengawas ditolak saat menulis; ID resource lokasi lain juga ditolak', async () => {
      const stage = (await request(`/stages/location/${locA.id}`)).body.data[0];
      assert.equal((await request(`/stages/${stage.id}`, { token: tokenViewer, method: 'PATCH', body: { notes: 'Tidak diizinkan' } })).status, 403);
      const other = await request(`/locations/${locB.id}/items`, { method: 'POST', body: { name: 'Lain', qty: 1, unit: 'unit' } });
      assert.equal((await request(`/locations/${locB.id}/items/${other.body.data.id}`, { token: tokenScoped, method: 'PATCH', body: { installationPct: 100 } })).status, 403);
      assert.equal((await request('/incidents/tickets', { token: tokenViewer, method: 'POST', body: { locationId: locA.id, severity: 'LOW', category: 'IT_HARDWARE', title: 'Tiket audit', description: 'Deskripsi tiket audit' } })).status, 201);
    });

    await t.test('persetujuan BA tidak bisa dilewati melalui PATCH dan hanya sekali ditinjau', async () => {
      const created = await request('/berita-acara', { method: 'POST', body: { locationId: locA.id, type: 'BA_UJI_FUNGSI', title: 'BA audit', date: '2026-10-19', fileUrl: '/uploads/test.pdf', fileName: 'test.pdf' } });
      assert.equal(created.status, 201);
      const id = created.body.data.id;
      assert.equal((await request(`/berita-acara/${id}`, { method: 'PATCH', body: { status: 'FINAL' } })).status, 400);
      assert.equal((await request(`/berita-acara/${id}/approve`, { method: 'PATCH', body: {} })).status, 200);
      assert.equal((await request(`/berita-acara/${id}/approve`, { method: 'PATCH', body: {} })).status, 409);
    });

    await t.test('kegagalan sinkronisasi master membatalkan perubahan kapasitas', async () => {
      const failing = await prisma.location.create({ data: { code: `ROLLBACK-${run}`, name: 'Rollback', province: 'Audit', city: 'Audit', address: 'Audit', latitude: 0, longitude: 0, capacity: 1 } });
      // Trigger khusus database uji: paksa kegagalan setelah kapasitas diubah.
      await prisma.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION audit_fail_item() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."locationId" = '${failing.id}' THEN RAISE EXCEPTION 'audit forced failure'; END IF; RETURN NEW; END $$`);
      await prisma.$executeRawUnsafe('CREATE TRIGGER audit_fail_item_trigger BEFORE INSERT ON "LocationItem" FOR EACH ROW EXECUTE FUNCTION audit_fail_item()');
      try {
        const result = await request(`/locations/${failing.id}/capacity`, { method: 'PATCH', body: { capacity: 200 } });
        assert.equal(result.status, 500);
        assert.equal((await prisma.location.findUnique({ where: { id: failing.id } })).capacity, 1);
        assert.equal(await prisma.locationItem.count({ where: { locationId: failing.id } }), 0);
      } finally {
        await prisma.$executeRawUnsafe('DROP TRIGGER audit_fail_item_trigger ON "LocationItem"');
        await prisma.$executeRawUnsafe('DROP FUNCTION audit_fail_item()');
      }
    });

    await t.test('websocket aktual menolak anonim dan menerima token aktif', async () => {
      const connect = (token) => new Promise((resolve) => {
        const socket = io(`${base}/ws`, { auth: token ? { token } : {}, reconnection: false, timeout: 3000 });
        sockets.push(socket);
        socket.once('connect', () => resolve({ socket, connected: true }));
        socket.once('connect_error', (error) => resolve({ socket, connected: false, error }));
      });
      const anonymous = await connect();
      assert.equal(anonymous.connected, false);
      assert.match(anonymous.error.message, /Unauthorized/);
      const active = await connect(tokenScoped);
      assert.equal(active.connected, true);
      const received = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Siaran lokasi tidak diterima')), 3000);
        active.socket.once('installation:updated', (message) => { clearTimeout(timeout); resolve(message); });
      });
      await request(`/locations/${locA.id}/items/${item.id}`, { method: 'PATCH', body: { installationPct: 75 } });
      assert.equal((await received).locationId, locA.id);
    });

    await t.test('dua pembaruan barang bersamaan menghasilkan agregat akhir yang benar', async () => {
      const second = await request(`/locations/${locA.id}/items`, { method: 'POST', body: { name: 'Item paralel', qty: 1, unit: 'unit' } });
      const results = await Promise.all([item.id, second.body.data.id].map((id) => request(`/locations/${locA.id}/items/${id}`, { method: 'PATCH', body: { installationPct: 100 } })));
      assert.ok(results.every((r) => r.status === 200));
      const stage = (await request(`/stages/location/${locA.id}`)).body.data.find((s) => s.phase === 'INSTALASI');
      assert.equal(stage.progress, 100);
      assert.equal(stage.status, 'COMPLETED');
    });

    await t.test('kode vendor paralel tetap unik setelah VDR-9999', async () => {
      await prisma.vendor.upsert({ where: { code: 'VDR-9999' }, create: { code: 'VDR-9999', name: 'Batas kode', categories: ['SARPRAS_IT'] }, update: {} });
      const results = await Promise.all([1, 2, 3].map((n) => request('/vendors', { method: 'POST', body: { name: `Vendor audit ${n}`, categories: ['SARPRAS_IT'] } })));
      assert.deepEqual(results.map((r) => r.status), [201, 201, 201]);
      const codes = results.map((r) => r.body.data.code);
      assert.equal(new Set(codes).size, 3);
      assert.ok(codes.every((code) => Number(code.slice(4)) >= 10000));
      assert.equal((await request('/vendors/items/comparison?days=abc')).status, 400);
    });

    await t.test('menghapus lokasi menonaktifkan akun terikat, bukan memberinya akses global', async () => {
      assert.equal((await request(`/locations/${locA.id}`, { method: 'DELETE' })).status, 200);
      const user = await prisma.user.findUnique({ where: { id: scoped.id } });
      assert.equal(user.locationId, null);
      assert.equal(user.isActive, false);
      assert.equal((await request('/locations', { token: tokenScoped })).status, 401);
    });
  } finally {
    for (const socket of sockets) socket.disconnect();
    await app.close();
  }
});
