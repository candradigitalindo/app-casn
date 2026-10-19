const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { StagesService } = require('../src/modules/stages/stages.service');
const { BeritaAcaraService } = require('../src/modules/berita-acara/berita-acara.service');
const { IncidentsService } = require('../src/modules/incidents/incidents.service');
const { LogisticsService } = require('../src/modules/logistics/logistics.service');
const { PersonnelService } = require('../src/modules/personnel/personnel.service');
const { AuthService } = require('../src/modules/auth/auth.service');
const { LocationScopeGuard } = require('../src/common/guards/location-scope.guard');
const { syncInstallationStageFromItems } = require('../src/common/utils/installation-progress.util');
const { ReportsService } = require('../src/modules/reports/reports.service');
const { EventsGateway } = require('../src/modules/events/events.gateway');
const { UserRole } = require('@prisma/client');
const { Reflector } = require('@nestjs/core');
const { RolesGuard } = require('../src/common/guards/roles.guard');
const { StagesController } = require('../src/modules/stages/stages.controller');
const { BeritaAcaraController } = require('../src/modules/berita-acara/berita-acara.controller');
const { InstallationsController } = require('../src/modules/installations/installations.controller');
const { IncidentsController } = require('../src/modules/incidents/incidents.controller');

const events = { emitTicketUpdated() {}, emitShipmentUpdated() {} };
const context = (req) => ({ switchToHttp: () => ({ getRequest: () => req }) });

test('melengkapi lima fase yang hilang tanpa menggandakan fase instalasi', async () => {
  const rows = [{ id: 'install', phase: 'INSTALASI', status: 'IN_PROGRESS' }];
  const prisma = {
    location: { findUnique: async () => ({ id: 'loc' }) },
    locationStage: {
      createMany: async ({ data, skipDuplicates }) => {
        assert.equal(skipDuplicates, true);
        for (const row of data) if (!rows.some((r) => r.phase === row.phase)) rows.push(row);
      },
      findMany: async () => rows,
    },
  };
  const service = new StagesService(prisma);
  await service.getByLocation('loc');
  assert.equal((await service.getByLocation('loc')).data.length, 6);
  assert.equal(rows.find((r) => r.phase === 'INSTALASI').status, 'IN_PROGRESS');
});

test('fase selesai wajib 100% dan dibuka kembali tanpa metadata penyelesaian', async () => {
  let stage = { id: 's', locationId: 'loc', phase: 'UJI_FUNGSI', status: 'IN_PROGRESS', progress: 45 };
  const prisma = {
    locationStage: {
      findUnique: async () => stage,
      update: async ({ data }) => (stage = { ...stage, ...data }),
      findMany: async () => [stage],
    },
    location: { update: async () => ({}) },
  };
  const service = new StagesService(prisma);
  await service.update('s', { status: 'COMPLETED' }, 'user');
  assert.equal(stage.progress, 100);
  assert.equal(stage.completedById, 'user');
  assert.ok(stage.completedAt);
  await service.update('s', { status: 'IN_PROGRESS' }, 'user');
  assert.equal(stage.progress, 0);
  assert.equal(stage.completedAt, null);
  assert.equal(stage.completedById, null);
});

test('fase instalasi menolak progres manual tetapi menerima catatan', async () => {
  const stage = { id: 's', locationId: 'loc', phase: 'INSTALASI', status: 'IN_PROGRESS' };
  const prisma = {
    locationStage: { findUnique: async () => stage, update: async ({ data }) => ({ ...stage, ...data }), findMany: async () => [stage] },
    location: { update: async () => ({}) },
  };
  const service = new StagesService(prisma);
  await assert.rejects(service.update('s', { progress: 100 }), { status: 400 });
  assert.equal((await service.update('s', { notes: 'Catatan' })).data.notes, 'Catatan');
});

test('regresi item 100% ke 0% menghapus tanggal selesai dan status lokasi', async () => {
  let update;
  let locationStatus;
  const prisma = {
    locationItem: { findMany: async () => [{ installationPct: 0 }] },
    locationStage: {
      findUnique: async () => ({ completedAt: new Date(), completedById: 'u', startedAt: new Date() }),
      upsert: async (args) => { update = args.update; },
      findMany: async () => [{ phase: 'INSTALASI', ...update }],
    },
    location: { update: async ({ data }) => { locationStatus = data.status; } },
  };
  await syncInstallationStageFromItems(prisma, 'loc');
  assert.equal(update.completedAt, null);
  assert.equal(update.startedAt, null);
  assert.equal(update.status, 'NOT_STARTED');
  assert.equal(locationStatus, 'PREPARATION');
});

test('pembulatan 99.5% tidak menyelesaikan fase sebelum semua item selesai', async () => {
  let update;
  const prisma = {
    locationItem: { findMany: async () => [{ installationPct: 100 }, { installationPct: 99 }] },
    locationStage: {
      findUnique: async () => null,
      upsert: async (args) => { update = args.update; },
      findMany: async () => [],
    },
    location: {},
  };
  await syncInstallationStageFromItems(prisma, 'loc');
  assert.equal(update.status, 'IN_PROGRESS');
  assert.equal(update.completedAt, null);
});

test('laporan memakai progres barang, bukan milestone lama', async () => {
  const service = new ReportsService({ location: { findMany: async () => [{ id: 'loc', locationItems: [{ installationPct: 20 }, { installationPct: 80 }] }] } });
  const result = (await service.getInstallationsReport()).data[0];
  assert.equal(result.averagePercentage, 50);
  assert.equal(result.totalMilestones, 2);
  assert.equal(result.completedMilestones, 0);
});

test('PATCH berita acara tidak bisa memalsukan persetujuan', async () => {
  const service = new BeritaAcaraService({ beritaAcara: { findUnique: async () => ({ status: 'PENDING_APPROVAL' }) } });
  await assert.rejects(service.update('ba', { status: 'FINAL' }), { status: 400 });
});

test('mengedit BA final mengajukan ulang dan menghapus metadata persetujuan', async () => {
  let saved;
  const service = new BeritaAcaraService({ beritaAcara: {
    findUnique: async () => ({ status: 'FINAL', title: 'Lama', fileUrl: '/uploads/a.pdf' }),
    update: async ({ data }) => (saved = data),
  } });
  await service.update('ba', { title: 'Revisi' });
  assert.equal(saved.status, 'PENDING_APPROVAL');
  assert.equal(saved.approvedById, null);
  assert.equal(saved.approvedAt, null);
});

test('review draft/BA tanpa file ditolak dan konflik review tidak ditimpa', async () => {
  const service = new BeritaAcaraService({ beritaAcara: { findUnique: async () => ({ status: 'DRAFT' }) } });
  await assert.rejects(service.approve('ba', 'u'), { status: 409 });
  const concurrent = new BeritaAcaraService({ beritaAcara: {
    findUnique: async () => ({ status: 'PENDING_APPROVAL', fileUrl: '/a.pdf' }),
    updateMany: async () => ({ count: 0 }),
  } });
  await assert.rejects(concurrent.approve('ba', 'u'), { status: 409 });
  await assert.rejects(concurrent.reject('ba', 'u', '  '), { status: 400 });
});

test('menutup tiket mempertahankan waktu resolusi pertama; membuka ulang menghapusnya', async () => {
  const resolvedAt = new Date('2026-01-01T01:00:00Z');
  let data;
  const service = new IncidentsService({ incidentTicket: {
    findUnique: async () => ({ resolvedAt }),
    update: async (args) => (data = args.data),
  } }, events);
  await service.updateStatus('t', { status: 'CLOSED' });
  assert.equal(data.resolvedAt, resolvedAt);
  await service.updateStatus('t', { status: 'OPEN', resolutionNote: '' });
  assert.equal(data.resolvedAt, null);
  assert.equal(data.resolutionNote, '');
});

test('upsert checklist memperbarui jumlah ekspektasi', async () => {
  let data;
  const service = new LogisticsService({ inventoryChecklist: { upsert: async (args) => (data = args.update) } }, events);
  await service.submitChecklist({ locationId: 'loc', itemId: 'item', expectedQty: 200, receivedQty: 100 }, 'u');
  assert.equal(data.expectedQty, 200);
});

test('update status pengiriman yang sama tidak menggeser timestamp', async () => {
  let data;
  const shippedAt = new Date('2026-01-01');
  const service = new LogisticsService({ logisticsShipment: {
    findUnique: async () => ({ id: 's', shippedAt }),
    update: async (args) => (data = args.data),
  } }, events);
  await service.updateShipment('s', { status: 'IN_TRANSIT' });
  assert.equal(data.shippedAt, undefined);
});

test('presensi menolak tanggal invalid dan personel dari lokasi lain', async () => {
  const service = new PersonnelService({
    personnel: { findUnique: async () => ({ locationId: 'lain' }) },
    personnelAttendance: { findUnique: async () => null },
  });
  await assert.rejects(service.upsertAttendance({ date: '2026-02-30' }), { status: 400 });
  await assert.rejects(service.upsertAttendance({ date: '2026-10-19', personnelId: 'p', locationId: 'loc' }), { status: 400 });
  await assert.rejects(service.getAttendance(undefined), { status: 400 });
});

test('presensi hari yang sama tidak boleh berpindah lokasi diam-diam', async () => {
  const service = new PersonnelService({
    personnel: { findUnique: async () => ({ locationId: 'baru' }) },
    personnelAttendance: { findUnique: async () => ({ locationId: 'lama' }) },
  });
  await assert.rejects(service.upsertAttendance({ date: '2026-10-19', personnelId: 'p', locationId: 'baru' }), { status: 409 });
});

test('refresh memakai role dan email terkini dari database', async () => {
  const calls = [];
  const jwt = { signAsync: async (payload) => { calls.push(payload); return 'token'; }, decode: () => ({ exp: 4000, iat: 400 }) };
  const service = new AuthService({ user: { findUnique: async () => ({ isActive: true, email: 'new@example.test', role: 'COORDINATOR' }) } }, jwt, { get: () => 'test' });
  const result = await service.refresh('u', 'old@example.test', 'SUPER_ADMIN');
  assert.equal(calls[0].role, 'COORDINATOR');
  assert.equal(calls[0].email, 'new@example.test');
  assert.equal(result.tokens.expiresIn, 3600);
});

test('scope lokasi menolak URL, query dan body lintas lokasi', async () => {
  const guard = new LocationScopeGuard({});
  for (const extra of [{ params: { id: 'lain' } }, { query: { locationId: 'lain' } }, { body: { locationId: 'lain' } }]) {
    await assert.rejects(guard.canActivate(context({ user: { locationId: 'loc' }, path: '/api/v1/locations/lain', params: {}, query: {}, body: {}, ...extra })), { status: 403 });
  }
});

test('scope lokasi memeriksa pemilik resource dan memaksa filter daftar', async () => {
  const guard = new LocationScopeGuard({ incidentTicket: { findUnique: async () => ({ locationId: 'lain' }) } });
  await assert.rejects(guard.canActivate(context({ user: { locationId: 'loc' }, path: '/api/v1/incidents/tickets/t', params: { id: 't' }, query: {}, body: {} })), { status: 403 });
  const req = { user: { locationId: 'loc' }, path: '/api/v1/logistics/shipments', params: {}, query: {}, body: {} };
  await guard.canActivate(context(req));
  assert.equal(req.query.destinationLocationId, 'loc');
});

test('peran pengawasan tidak dapat mengubah data operasional tetapi boleh membuat tiket', () => {
  const guard = new RolesGuard(new Reflector());
  for (const [Controller, method] of [[StagesController, 'update'], [InstallationsController, 'upsert'], [BeritaAcaraController, 'update'], [IncidentsController, 'updateStatus']]) {
    assert.equal(guard.canActivate({ ...context({ user: { role: UserRole.PIMPINAN } }), getHandler: () => Controller.prototype[method], getClass: () => Controller }), false);
  }
  assert.equal(guard.canActivate({ ...context({ user: { role: UserRole.PIMPINAN } }), getHandler: () => IncidentsController.prototype.create, getClass: () => IncidentsController }), true);
});

test('websocket menolak token kosong dan akun nonaktif sebelum terhubung', async () => {
  let middleware;
  const gateway = new EventsGateway({ verifyAsync: async () => ({ sub: 'u' }) }, { get: () => 'secret' }, { user: { findUnique: async () => ({ isActive: false }) } });
  gateway.afterInit({ use: (fn) => { middleware = fn; } });
  for (const auth of [{}, { token: 'token' }]) {
    let error;
    await middleware({ handshake: { auth } }, (err) => { error = err; });
    assert.equal(error.message, 'Unauthorized');
  }
});

test('siaran real-time hanya menuju pemantau global dan lokasi pemilik data', () => {
  const rooms = [];
  const server = { to(room) { rooms.push(room); return this; }, emit() {} };
  const gateway = new EventsGateway({}, {}, {});
  gateway.server = server;
  gateway.emitTicketCreated({ id: 't', locationId: 'loc' });
  assert.deepEqual(rooms, ['global', 'location:loc']);
  let joined = false;
  gateway.handleJoinLocation('lain', { data: { locationId: 'loc' }, join() { joined = true; } });
  assert.equal(joined, false);
});
