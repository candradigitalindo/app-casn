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
  const { ValidationPipe, RequestMethod } = require('@nestjs/common');
  const { AppModule } = require('../src/app.module');
  const { PrismaService } = require('../src/database/prisma.service');
  const { AuthService } = require('../src/modules/auth/auth.service');
  const { HttpExceptionFilter } = require('../src/common/filters/http-exception.filter');
  const { DecimalTransformInterceptor } = require('../src/common/interceptors/decimal-transform.interceptor');
  const { io } = require('../../frontend/node_modules/socket.io-client');
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api', { exclude: [{ path: 'uploads/(.*)', method: RequestMethod.ALL }] });
  app.getHttpAdapter().getInstance().set('trust proxy', 2);
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
      const created = await request('/berita-acara', { method: 'POST', body: { locationId: locA.id, type: 'BA_UJI_FUNGSI', title: 'BA audit', date: '2026-10-19', fileUrl: 'data:application/pdf;base64,JVBERi0xLjQ=', fileName: 'test.pdf' } });
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

    await t.test('sesi berputar aman pada dua tab dan token lama yang diputar ulang dicabut', async () => {
      const { SessionsService } = require('../src/modules/sessions/sessions.service');
      const sessions = app.get(SessionsService);
      const session = await auth.login({ email: viewer.email, password: 'test-password' });
      const claims = new (require('@nestjs/jwt').JwtService)().decode(session.tokens.accessToken);
      const [a, b] = await Promise.all([1, 2].map(() => sessions.refresh(viewer.id, claims.sid, session.tokens.refreshToken)));
      assert.equal(a.refreshToken, b.refreshToken);
      assert.notEqual(a.refreshToken, session.tokens.refreshToken);
      const listing = await request('/auth/sessions', { token: a.accessToken });
      assert.ok(listing.body.data.some((row) => row.id === claims.sid && row.current));
      assert.equal((await request(`/auth/sessions/${claims.sid}`, { method: 'DELETE', token: tokenAdmin })).status, 403);
      await prisma.userSession.update({ where: { id: claims.sid }, data: { previousValidUntil: new Date(0) } });
      await assert.rejects(sessions.refresh(viewer.id, claims.sid, session.tokens.refreshToken), { status: 401 });
      assert.equal((await request('/auth/me', { token: a.accessToken })).status, 401);
      assert.ok((await prisma.userSession.findUnique({ where: { id: claims.sid } })).revokedAt);
    });

    await t.test('pencabutan sesi memutus websocket dan logout semua perangkat menolak access token lama', async () => {
      const fresh = await auth.login({ email: viewer.email, password: 'test-password' });
      const claims = new (require('@nestjs/jwt').JwtService)().decode(fresh.tokens.accessToken);
      const socket = io(`${base}/ws`, { auth: { token: fresh.tokens.accessToken }, reconnection: false, timeout: 3000 }); sockets.push(socket);
      await new Promise((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject); });
      const disconnected = new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('Socket belum diputus')), 3000); socket.once('disconnect', () => { clearTimeout(timer); resolve(); }); });
      assert.equal((await request(`/auth/sessions/${claims.sid}`, { method: 'DELETE', token: tokenViewer })).status, 200);
      await disconnected;
      assert.equal((await request('/auth/me', { token: fresh.tokens.accessToken })).status, 401);
      const user = await createUser('REGISTRAR');
      const tokens = await Promise.all([1, 2].map(() => auth.login({ email: user.email, password: 'test-password' })));
      assert.equal((await request('/auth/logout-all', { method: 'POST', token: tokens[0].tokens.accessToken })).status, 200);
      for (const result of tokens) assert.equal((await request('/auth/me', { token: result.tokens.accessToken })).status, 401);
    });

    await t.test('unggahan memerlukan izin, menolak file palsu dan tautan kedaluwarsa, serta menghormati cakupan lokasi', async () => {
      const upload = async (name, content, token = tokenScoped, locationId) => {
        const form = new FormData(); form.append('file', new Blob([content]), name);
        const response = await fetch(`${base}/api/v1/uploads${locationId ? `?locationId=${locationId}` : ''}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
        return { status: response.status, body: await response.json() };
      };
      assert.equal((await upload('image.png', '<html>palsu</html>')).status, 400);
      assert.equal((await upload('image.svg', '<svg/>')).status, 400);
      assert.equal((await upload('photo.pdf', '%PDF-1.4\n', tokenScoped, locB.id)).status, 403);
      const result = await upload('photo.pdf', '%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF');
      assert.equal(result.status, 201);
      const signed = result.body.data.url;
      assert.match(signed, /\?token=/);
      const canonical = signed.split('?')[0];
      assert.equal((await fetch(`${base}${canonical}`)).status, 401);
      const download = await fetch(`${base}${signed}`);
      assert.equal(download.status, 200);
      assert.equal(download.headers.get('content-type'), 'application/pdf');
      assert.match(download.headers.get('cache-control'), /no-store/);
      const document = await request('/documents', { method: 'POST', token: tokenScoped, body: { locationId: locA.id, name: 'PDF uji', category: 'LAINNYA', fileUrl: signed, fileName: 'photo.pdf' } });
      // Metadata unggahan sendiri juga memberi izin sebelum dokumen dihubungkan.
      assert.equal(document.status, 201);
      const outsider = await createUser('TECHNICAL_IT', locB.id);
      const outsiderSession = await auth.login({ email: outsider.email, password: 'test-password' });
      assert.equal((await request('/berita-acara', { method: 'POST', token: outsiderSession.tokens.accessToken, body: { locationId: locB.id, type: 'BA_UJI_FUNGSI', title: 'Akses ditolak', date: '2026-10-19', fileUrl: signed, fileName: 'photo.pdf' } })).status, 403);
      const jwt = new (require('@nestjs/jwt').JwtService)();
      const claim = jwt.decode(new URLSearchParams(signed.split('?')[1]).get('token'));
      const expired = jwt.sign({ ...claim, exp: 1 }, { secret: `${process.env.JWT_SECRET}:file-access` });
      assert.equal((await fetch(`${base}${canonical}?token=${expired}`)).status, 401);
      const tempSession = await auth.login({ email: scoped.email, password: 'test-password' });
      const { UploadsService } = require('../src/modules/uploads/uploads.service');
      const tempUser = await app.get(require('../src/modules/sessions/sessions.service').SessionsService).validate(jwt.decode(tempSession.tokens.accessToken));
      const temporaryUrl = app.get(UploadsService).sign(canonical, tempUser);
      await prisma.userSession.update({ where: { id: jwt.decode(tempSession.tokens.accessToken).sid }, data: { revokedAt: new Date() } });
      assert.equal((await fetch(`${base}${temporaryUrl}`)).status, 401);
      await require('node:fs/promises').unlink(require('node:path').join(process.cwd(), canonical));
    });

    await t.test('paginasi melewati 500 lokasi dan ringkasan server mencakup seluruh hasil', async () => {
      const prefix = `PAGE-${run}`;
      await prisma.location.createMany({ data: Array.from({ length: 505 }, (_, n) => ({ code: `${prefix}-${String(n).padStart(3,'0')}`, name: `${prefix} ${n}`, province: 'Pagination', city: 'Pagination', address: 'Test', latitude: 0, longitude: 0, status: n % 2 ? 'READY' : 'PREPARATION' })) });
      const result = await request(`/locations?search=${prefix}&page=26&limit=20`);
      assert.equal(result.status, 200);
      assert.equal(result.body.data.length, 5);
      assert.equal(result.body.meta.total, 505);
      assert.equal(result.body.summary.total, 505);
      assert.equal(result.body.summary.byStatus.READY, 252);
      const overview = await request(`/logistics/overview?search=${prefix}&status=NONE&page=26&limit=20`);
      assert.equal(overview.status, 200);
      assert.equal(overview.body.meta.total, 505);
      assert.equal(overview.body.data.length, 5);
      assert.equal((await request('/logistics/overview', { token: tokenScoped })).body.meta.total, 1);
      assert.equal((await request(`/locations?search=${prefix}&page=0`)).status, 400);
    });

    await t.test('ID master menjaga barang dan progres ketika namanya diubah', async () => {
      const { LocationsService } = require('../src/modules/locations/locations.service');
      const { LogisticsService } = require('../src/modules/logistics/logistics.service');
      await prisma.masterItem.updateMany({ data: { isActive: false } });
      const master = await prisma.masterItem.upsert({ where: { no: 7777 }, create: { no: 7777, name: 'Barang stabil', category: 'SARPRAS_IT', unit: 'unit', qty100: 3, qty200: 5, qty300: 7, qty400: 9, qty500: 11 }, update: { name: 'Barang stabil', category: 'SARPRAS_IT', isActive: true, qty100: 3, qty200: 5 } });
      const target = await createLocation('stable');
      const service = app.get(LocationsService); await service.updateCapacity(target.id, { capacity: 100 });
      const before = await prisma.locationItem.findFirst({ where: { locationId: target.id, masterItemId: master.id } });
      await prisma.locationItem.update({ where: { id: before.id }, data: { installationPct: 60 } });
      const inventoryBefore = (await app.get(LogisticsService).findInventoryItems()).find((row) => row.masterItemId === master.id);
      await prisma.masterItem.update({ where: { id: master.id }, data: { name: 'Barang diganti nama' } });
      await service.updateCapacity(target.id, { capacity: 200 });
      const after = await prisma.locationItem.findUnique({ where: { id: before.id } });
      assert.equal(after.name, 'Barang diganti nama'); assert.equal(after.qty, 5); assert.equal(after.installationPct, 60);
      const inventoryAfter = (await app.get(LogisticsService).findInventoryItems()).find((row) => row.masterItemId === master.id);
      assert.equal(inventoryAfter.id, inventoryBefore.id); assert.equal(inventoryAfter.name, after.name);
      assert.equal(await prisma.locationItem.count({ where: { locationId: target.id, masterItemId: master.id } }), 1);
    });

    await t.test('pengadaan memisah vendor, menjaga kapasitas, HPS, snapshot revisi dan aktivasi idempoten', async () => {
      const province = await prisma.province.create({ data: { code: `P${run}`, name: `Provinsi pengadaan ${run}` } });
      const master = await prisma.masterItem.findUnique({ where: { no: 7777 } });
      const vendor = async (code, qty, price, priceUnit) => {
        const v = await prisma.vendor.create({ data: { code: `${code}-${run}`, name: code, categories: ['SARPRAS_IT'], coverages: { create: { provinceId: province.id } } } });
        return prisma.vendorItem.create({ data: { vendorId: v.id, masterItemId: master.id, qty, unitPrice: price, priceUnit } });
      };
      const [cheap, expensive] = await Promise.all([vendor('CHEAP', 2, 10, 'PER_HARI'), vendor('EVENT', 3, 70, 'PER_EVENT')]);
      const created = await request('/projects', { method: 'POST', body: { name: 'Proyek pengadaan uji', agencyName: 'Instansi audit', fiscalYear: 2026, defaultMarginPct: 10, hpsAmount: 1000 } });
      assert.equal(created.status, 201); const id = created.body.data.id;
      assert.equal((await request(`/projects/${id}`, { method: 'PATCH', body: { name: null } })).status, 400);
      assert.equal((await request(`/projects/${id}`, { method: 'PATCH', body: { defaultMarginPct: null } })).status, 400);
      assert.equal((await request(`/projects/${id}`, { method: 'PATCH', body: { startDate: '2026-12-10', endDate: '2026-12-01' } })).status, 400);
      assert.equal((await request(`/projects/${id}`, { token: tokenViewer })).status, 403);
      const plan = await request(`/projects/${id}/locations`, { method: 'POST', body: { name: 'Lokasi proyek', provinceId: province.id, city: 'Kota uji', capacity: 100, days: 5, address: 'Alamat lokasi', latitude: -6.2, longitude: 106.8 } });
      assert.equal(plan.status, 201);
      const requirement = plan.body.data.locations[0].requirements[0];
      const offer = await request(`/projects/${id}/requirements/${requirement.id}/offers`);
      assert.equal(Number(offer.body.data[0].effectivePerEvent), 50);
      const allocated = await request(`/projects/${id}/auto-allocate`, { method: 'POST' });
      assert.equal(allocated.status, 201); assert.equal(allocated.body.data.missing.length, 0);
      const detail = (await request(`/projects/${id}`)).body.data;
      assert.equal(detail.locations[0].requirements[0].allocations.length, 2);
      assert.equal(Number(detail.summary.costTotal), 170); assert.equal(Number(detail.summary.sellTotal), 187);
      const overQty = await request(`/projects/${id}/requirements/${requirement.id}/allocations`, { method: 'POST', body: { allocations: [{ vendorItemId: cheap.id, qty: 3 }] } });
      assert.equal(overQty.status, 409);
      await request(`/projects/${id}`, { method: 'PATCH', body: { hpsAmount: 100 } });
      assert.equal((await request(`/projects/${id}/submit`, { method: 'POST' })).status, 400);
      await request(`/projects/${id}`, { method: 'PATCH', body: { hpsAmount: 1000 } });
      assert.equal((await request(`/projects/${id}/submit`, { method: 'POST' })).status, 201);
      assert.equal((await request(`/projects/${id}`, { method: 'PATCH', body: { name: 'Tidak boleh' } })).status, 409);
      const snapshot = (await request(`/projects/${id}/proposals/1`)).body.data;
      await prisma.vendorItem.update({ where: { id: expensive.id }, data: { unitPrice: 999 } });
      assert.equal((await request(`/projects/${id}/proposals/1`)).body.data.sellTotal, snapshot.sellTotal);
      assert.equal((await request(`/projects/${id}/revise`, { method: 'POST', body: { reason: 'Revisi markup' } })).status, 201);
      await request(`/projects/${id}/requirements/${requirement.id}`, { method: 'PATCH', body: { marginPct: 20 } });
      assert.equal((await request(`/projects/${id}/submit`, { method: 'POST' })).status, 201);
      assert.equal(Number((await request(`/projects/${id}/proposals/2`)).body.data.sellTotal), 204);
      assert.equal((await request(`/projects/${id}/proposals/1`)).body.data.sellTotal, snapshot.sellTotal);
      assert.equal((await request(`/projects/${id}/activate`, { method: 'POST' })).status, 409);
      assert.equal((await request(`/projects/${id}/status`, { method: 'POST', body: { status: 'MENANG' } })).status, 201);
      const [activeA, activeB] = await Promise.all([1, 2].map(() => request(`/projects/${id}/activate`, { method: 'POST' })));
      assert.equal(activeA.status, 201); assert.equal(activeB.status, 201);
      const locationId = activeA.body.data.locations[0].locationId;
      assert.equal(locationId, activeB.body.data.locations[0].locationId);
      assert.equal((await request(`/locations/${locationId}`, { method: 'DELETE' })).status, 409);
      const operationalItems = (await request(`/locations/${locationId}/items`)).body.data;
      assert.equal(operationalItems[0].supplyAllocations.length, 2);
      assert.ok(!('unitPrice' in operationalItems[0].supplyAllocations[0]));
      assert.equal(await prisma.locationStage.count({ where: { locationId } }), 6);
      assert.equal(await prisma.locationSupplyAllocation.count({ where: { locationItem: { locationId } } }), 2);
      assert.equal((await request(`/projects/${id}/status`, { method: 'POST', body: { status: 'SELESAI' } })).status, 409);
      await prisma.location.update({ where: { id: locationId }, data: { status: 'CLOSED' } });
      assert.equal((await request(`/projects/${id}/status`, { method: 'POST', body: { status: 'SELESAI' } })).status, 201);
    });

    await t.test('notifikasi tidak berulang, hanya pemilik dapat membaca, dan health membatasi diagnostik', async () => {
      const { NotificationsService } = require('../src/modules/notifications/notifications.service'); const service = app.get(NotificationsService);
      const ba = (await request('/berita-acara', { method: 'POST', body: { locationId: locA.id, type: 'BA_UJI_FUNGSI', title: 'Menunggu tinjauan', date: '2026-10-19', fileUrl: 'data:application/pdf;base64,JVBERg==' } })).body.data;
      await service.refresh(); const count = await prisma.notification.count({ where: { userId: admin.id } }); await service.refresh();
      assert.equal(await prisma.notification.count({ where: { userId: admin.id } }), count);
      const notification = await prisma.notification.findFirst({ where: { userId: admin.id, dedupeKey: `BA_PENDING:${ba.id}` } }); assert.ok(notification);
      await request(`/notifications/${notification.id}/read`, { method: 'PATCH', token: tokenScoped });
      assert.equal((await prisma.notification.findUnique({ where: { id: notification.id } })).readAt, null);
      await request(`/notifications/${notification.id}/read`, { method: 'PATCH' });
      assert.ok((await prisma.notification.findUnique({ where: { id: notification.id } })).readAt);
      assert.equal((await request('/health/ready', { token: '' })).status, 200);
      assert.equal((await request('/health', { token: tokenScoped })).status, 403);
      assert.equal((await request('/health')).status, 200);
    });

    await t.test('login salah dicatat dan pembatasan per akun tidak dapat dilewati IP header palsu', async () => {
      const email = `throttle-${run}@example.test`;
      for (let n = 0; n < 10; n++) {
        const response = await fetch(`${base}/api/v1/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': `192.0.2.${n}`, 'CF-Connecting-IP': `198.51.100.${n}` }, body: JSON.stringify({ email, password: 'incorrect' }) });
        assert.equal(response.status, 401);
      }
      assert.equal((await request('/auth/login', { method: 'POST', token: '', body: { email, password: 'incorrect' } })).status, 429);
      assert.equal(await prisma.loginAttempt.count({ where: { email, success: false } }), 10);
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
