import 'dotenv/config';
import { PrismaClient, UserRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const hash = (p: string) => bcrypt.hash(p, 12);
  const PASSWORD = 'andalan123';

  const users = [
    { email: 'admin@nbp.co.id',     name: 'Super Admin',            role: UserRole.SUPER_ADMIN,         instansi: 'Instansi Pusat' },
    { email: 'logistik@nbp.co.id',  name: 'Tim Logistik',           role: UserRole.LOGISTICS,           instansi: 'Andalan Teknologi' },
    { email: 'korlok@nbp.co.id',    name: 'Koordinator Lokasi',     role: UserRole.COORDINATOR,         instansi: 'Andalan Teknologi' },
    { email: 'it@nbp.co.id',        name: 'Tenaga Teknis IT',       role: UserRole.TECHNICAL_IT,        instansi: 'Andalan Teknologi' },
    { email: 'listrik@nbp.co.id',   name: 'Teknisi Elektrikal',     role: UserRole.TECHNICAL_ELECTRICAL,instansi: 'Andalan Teknologi' },
    { email: 'sarpras@nbp.co.id',   name: 'Teknisi Sarpras',        role: UserRole.TECHNICAL_SARPRAS,   instansi: 'Andalan Teknologi' },
    { email: 'registrasi@nbp.co.id',name: 'Petugas Registrasi',     role: UserRole.REGISTRAR,           instansi: 'Instansi Daerah' },
    { email: 'pengawas@nbp.co.id',  name: 'Pengawas',               role: UserRole.SUPERVISOR,          instansi: 'Instansi Daerah' },
    { email: 'pimpinan@nbp.co.id',  name: 'Pimpinan Instansi',           role: UserRole.PIMPINAN,            instansi: 'Instansi Pusat' },
    { email: 'ppk@nbp.co.id',       name: 'PPK',                    role: UserRole.PPK,                 instansi: 'Instansi Pusat' },
    { email: 'inspektorat@nbp.co.id', name: 'Inspektorat',          role: UserRole.INSPEKTORAT,         instansi: 'Instansi Pusat' },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        ...u,
        password: await hash(PASSWORD),
        isActive: true,
      },
    });
  }

  console.log(`✅ ${users.length} user dibuat (password: ${PASSWORD})`);

  // ── Lokasi demo (sinkron dengan frontend mock-data.ts) ─────────────────────
  const koordinator = await prisma.user.findUnique({ where: { email: 'korlok@nbp.co.id' } });

  // Kapasitas wajib mengikuti tier standar instansi penyelenggara: 100 / 200 / 300 / 400 / 500
  // (peserta per sesi) agar pemetaan item & tenaga teknis tepat.
  const locations = [
    { code: 'JKT-001', name: 'Universitas Indonesia - Depok', province: 'DKI Jakarta', city: 'Jakarta Selatan', address: 'Jl. Margonda Raya, Depok', latitude: -6.3608, longitude: 106.8272, status: 'READY', capacity: 500 },
    { code: 'JBR-001', name: 'Universitas Padjadjaran - Bandung', province: 'Jawa Barat', city: 'Bandung', address: 'Jl. Raya Bandung-Sumedang KM 21', latitude: -6.9175, longitude: 107.7628, status: 'READY', capacity: 400 },
    { code: 'JTN-001', name: 'Universitas Diponegoro - Semarang', province: 'Jawa Tengah', city: 'Semarang', address: 'Jl. Prof. Soedarto, Tembalang', latitude: -7.0455, longitude: 110.4259, status: 'INSTALLATION_IN_PROGRESS', capacity: 300 },
    { code: 'JTM-001', name: 'Universitas Airlangga - Surabaya', province: 'Jawa Timur', city: 'Surabaya', address: 'Jl. Mulyorejo, Surabaya', latitude: -7.2702, longitude: 112.7753, status: 'READY', capacity: 400 },
    { code: 'SMU-001', name: 'Universitas Sumatera Utara - Medan', province: 'Sumatera Utara', city: 'Medan', address: 'Jl. Dr. T. Mansur No. 9', latitude: 3.5612, longitude: 98.6532, status: 'READY', capacity: 300 },
    { code: 'PPA-001', name: 'Universitas Cenderawasih - Jayapura', province: 'Papua', city: 'Jayapura', address: 'Jl. Abepura, Jayapura', latitude: -2.5916, longitude: 140.669, status: 'PREPARATION', capacity: 100 },
    { code: 'BLL-001', name: 'Universitas Udayana - Denpasar', province: 'Bali', city: 'Denpasar', address: 'Jl. PB Sudirman, Denpasar', latitude: -8.65, longitude: 115.2167, status: 'READY', capacity: 200 },
    { code: 'KTM-001', name: 'Universitas Mulawarman - Samarinda', province: 'Kalimantan Timur', city: 'Samarinda', address: 'Jl. Kuaro, Samarinda', latitude: -0.4948, longitude: 117.1536, status: 'INSTALLATION_IN_PROGRESS', capacity: 200 },
  ] as const;

  for (const loc of locations) {
    await prisma.location.upsert({
      where: { code: loc.code },
      // Sinkronkan kapasitas & status saat re-seed agar data lama ikut diperbaiki
      update: { capacity: loc.capacity, status: loc.status },
      create: {
        ...loc,
        coordinatorId: koordinator?.id,
        startDate: new Date('2026-09-01T00:00:00Z'),
        endDate: new Date('2026-09-30T00:00:00Z'),
      },
    });
  }
  console.log(`✅ ${locations.length} lokasi demo dibuat`);

  // ── Master data: 38 item standar sesuai Lampiran E Kepsesma BKN
  //    Nomor 240 Tahun 2026 (mencabut Kepsesma 62/2024 & 85/2023).
  //    Kuantitas per tier kapasitas 100–500 peserta/sesi, satuan mengikuti
  //    dokumen (m2 untuk tenda, paket untuk ATK). Dapat disesuaikan admin
  //    via menu Master Data → Barang Sarpras bila terbit ketetapan baru.
  type MI = [no: number, name: string, unit: string, q100: number, q200: number, q300: number, q400: number, q500: number, notes?: string];
  const masterItems: MI[] = [
    [1,  'Laptop client untuk peserta ujian termasuk jaringan LAN dan elektrikal', 'unit', 100, 200, 300, 400, 500, 'Wajib menyediakan laptop cadangan 5% (fitur touchscreen) di tiap titik lokasi — di luar kuantitas tayang'],
    [2,  'UPS untuk router/switch hub', 'unit', 5, 10, 15, 20, 25, 'Minimal 900 VA'],
    [3,  'UPS untuk modem internet dan switch', 'unit', 2, 2, 2, 2, 2, 'Minimal 2.000 VA'],
    [4,  'Laptop client untuk registrasi peserta termasuk jaringan LAN dan elektrikal', 'unit', 3, 5, 8, 10, 13],
    [5,  'Metal Detector', 'unit', 2, 2, 2, 2, 2, 'Portable (hand-held), Garret atau sejenisnya'],
    [6,  'Webcam eksternal include tripod untuk registrasi peserta', 'unit', 3, 5, 8, 10, 13, 'Minimal HD 720p/30fps, tripod min 1.500 mm'],
    [7,  'LED ring light include tripod untuk registrasi', 'unit', 3, 5, 8, 10, 13, 'Diameter min 26 cm, tripod min 2 m'],
    [8,  'Barcode scanner untuk registrasi peserta', 'unit', 3, 5, 8, 10, 13, 'Minimal 2D, interface USB'],
    [9,  'Laptop client untuk monitoring ruang ujian termasuk jaringan LAN dan elektrikal', 'unit', 2, 2, 2, 2, 2],
    [10, 'Webcam eksternal include tripod untuk monitoring ruang ujian', 'unit', 2, 2, 2, 2, 2, 'Minimal HD 720p/30fps, tripod min 1.500 mm'],
    [11, 'Laptop untuk admin termasuk jaringan LAN dan elektrikal', 'unit', 1, 1, 1, 1, 1],
    [12, 'Meja cover untuk penerimaan dan pengambilan tempat penitipan barang', 'unit', 6, 6, 6, 6, 6],
    [13, 'Kursi susun tanpa cover untuk penerimaan dan pengambilan tempat penitipan barang', 'unit', 6, 6, 6, 6, 6],
    [14, 'Container box', 'unit', 14, 28, 40, 54, 68, 'Bahan plastik, min 150 liter, pengait pada tutup'],
    [15, 'Printer termasuk toner/tinta panitia ruang ujian', 'unit', 1, 1, 1, 1, 1, 'Kapasitas min 50 sheet, kertas up to F4, 600x600 dpi'],
    [16, 'Laptop untuk LCD Projector termasuk elektrikal', 'unit', 1, 2, 3, 4, 5],
    [17, 'LCD Projector termasuk screen untuk ruang ujian min 3000 lumens', 'unit', 1, 2, 3, 4, 5, 'Screen min 175x175 mm, standing tripod min 1 m'],
    [18, 'CCTV termasuk display dan media penyimpanan', 'unit', 2, 4, 6, 8, 10, 'Satu arah (bukan 360), indoor min 2MP, DVR/NVR (bukan IP camera), backup harian diserahkan ke panitia'],
    [19, 'Hardisk 2 TB', 'unit', 1, 2, 3, 4, 5, 'Diserahkan ke panitia instansi penyelenggara pada akhir seleksi'],
    [20, 'TV LCD termasuk standing bracket, elektrikal, dan flashdisk min 2GB', 'unit', 1, 2, 3, 4, 5, 'Minimal 50 inch, antar-TV terhubung HDMI/UTP'],
    [21, 'Meja cover untuk ruang ujian', 'unit', 105, 210, 315, 420, 525, 'Sudah termasuk cadangan 5%; ukuran min 45x60 cm per peserta'],
    [22, 'Kursi susun cover untuk ruang ujian', 'unit', 105, 210, 315, 420, 525, 'Sudah termasuk cadangan 5%'],
    [23, 'Meja cover untuk panitia ruang transit', 'unit', 5, 5, 5, 5, 5],
    [24, 'Kursi susun tanpa cover untuk panitia ruang transit', 'unit', 14, 14, 14, 14, 14],
    [25, 'Printer termasuk toner/tinta registrasi', 'unit', 1, 1, 1, 1, 1, 'Printer warna, kertas up to F4, 600x600 dpi'],
    [26, 'Kursi susun tanpa cover untuk peserta ruang transit, registrasi, steril', 'unit', 200, 400, 600, 800, 1000],
    [27, 'Meja cover untuk panitia ruang registrasi', 'unit', 3, 5, 8, 10, 13],
    [28, 'Kursi susun tanpa cover untuk panitia ruang registrasi', 'unit', 3, 5, 8, 10, 13],
    [29, 'Tenda semi dekor ruang transit, steril, registrasi, penitipan barang + lampu min 40 watt (tiap 25 m2) termasuk elektrikal', 'm2', 300, 600, 900, 1200, 1500],
    [30, 'Tenda sarnafil untuk ruang medis termasuk elektrikal dan lampu (tiap 25 m2)', 'm2', 25, 25, 25, 25, 25, 'Warna putih, ukuran min 5x5 m'],
    [31, 'Pembatas antrian (1 kaki, 1 tiang, 1 tali)', 'unit', 20, 40, 60, 80, 100],
    [32, 'Sound portable untuk ruang transit, registrasi, steril, ruang ujian dan elektrikal', 'unit', 2, 3, 4, 6, 7, 'Include mic wireless min 1/unit, speaker min 10 inch, jangkauan min 30 m'],
    [33, 'AC standing untuk ruang ujian dan medis termasuk elektrikal', 'unit', 5, 10, 15, 20, 25, 'Minimal 5PK termasuk instalasi'],
    [34, 'Misty fan termasuk pengisian airnya dan elektrikal untuk ruang transit, registrasi, steril', 'unit', 5, 10, 15, 20, 25, 'Minimal diameter 26 inch'],
    [35, 'Genset termasuk solar + teknisi standby min 12 jam', 'unit', 1, 1, 1, 1, 1, 'Kapasitas mengikuti tier: 100/200/300/400/500 KVA'],
    [36, 'ATK peserta dan panitia', 'paket', 1, 1, 1, 1, 1, 'Kertas buram, pensil, HVS A4, nomor penitipan, stiker label meja, spanduk 1,5x4 m, denah 2,5x2 m, dll.'],
    [37, 'Sewa gedung (ruang untuk ujian)', 'unit', 1, 1, 1, 1, 1, 'Hotel/gedung pertemuan (bukan GOR); APAR 9 kg 2 bh, P3K tipe C + oksigen, kursi roda min 2'],
    [38, 'Sistem Aplikasi Pengelolaan dan Pengendalian Pelaksanaan Seleksi di Seluruh Titik Lokasi Tes secara Online', 'aplikasi', 1, 1, 1, 1, 1, 'Web based, dashboard Pimpinan/PPK/Pengawas/Inspektorat, approval BA koordinator ke pengawas'],
  ];

  // Kategori sarpras — dasar pemetaan vendor: perangkat elektronik/TIK = IT,
  // sisanya (furnitur, tenda, kelistrikan, gedung, ATK) = Non IT.
  const IT_ITEM_NOS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 15, 16, 17, 18, 19, 20, 25, 38]);

  for (const [no, name, unit, q100, q200, q300, q400, q500, notes] of masterItems) {
    const category = IT_ITEM_NOS.has(no) ? ('SARPRAS_IT' as const) : ('SARPRAS_NON_IT' as const);
    await prisma.masterItem.upsert({
      where: { no },
      update: { name, unit, category, qty100: q100, qty200: q200, qty300: q300, qty400: q400, qty500: q500, notes: notes ?? null },
      create: { no, name, unit, ownership: 'SEWA', category, qty100: q100, qty200: q200, qty300: q300, qty400: q400, qty500: q500, notes: notes ?? null },
    });
  }
  console.log(`✅ ${masterItems.length} master item standar dibuat (Lampiran E Kepsesma 240/2026)`);

  // ── Assign item ke tiap lokasi sesuai tier kapasitasnya ────────────────────
  //    Mirror logika LocationsService.syncItemsFromMaster: pilih kuantitas
  //    qtyN sesuai tier (100/200/300/400/500), upsert berdasarkan nama item
  //    sehingga idempoten saat seed diulang.
  const tierForCapacity = (capacity: number): 100 | 200 | 300 | 400 | 500 => {
    const tier = Math.ceil(Math.max(capacity, 1) / 100) * 100;
    return Math.min(Math.max(tier, 100), 500) as 100 | 200 | 300 | 400 | 500;
  };

  const dbMasterItems = await prisma.masterItem.findMany({
    where: { isActive: true },
    orderBy: { no: 'asc' },
  });

  let assignedCount = 0;
  for (const loc of locations) {
    const dbLoc = await prisma.location.findUnique({
      where: { code: loc.code },
      select: { id: true, capacity: true },
    });
    if (!dbLoc) continue;

    const tier = tierForCapacity(dbLoc.capacity);
    const qtyField = `qty${tier}` as 'qty100' | 'qty200' | 'qty300' | 'qty400' | 'qty500';

    const existing = await prisma.locationItem.findMany({
      where: { locationId: dbLoc.id },
      select: { id: true, name: true },
    });
    const byName = new Map(existing.map((i) => [i.name, i.id]));

    for (const m of dbMasterItems) {
      const qty = m[qtyField];
      const existingId = byName.get(m.name);
      if (existingId) {
        await prisma.locationItem.update({
          where: { id: existingId },
          data: { qty, unit: m.unit, ownership: m.ownership },
        });
      } else {
        await prisma.locationItem.create({
          data: {
            locationId: dbLoc.id,
            name: m.name,
            qty,
            unit: m.unit,
            ownership: m.ownership,
            condition: 'BAIK',
            installationPct: 0,
          },
        });
      }
      assignedCount++;
    }
  }
  console.log(`✅ ${assignedCount} item lokasi di-assign sesuai kapasitas (${locations.length} lokasi)`);

  // ── Master data: kebutuhan tenaga teknis per kapasitas
  //    (BAB 4 atribut 2.3 dokumen spesifikasi instansi penyelenggara — angka persis dari dokumen)
  const personnelReqs = [
    { capacity: 100, koordinator: 1, tenagaIt: 1, elektrikal: 1, sarpras: 1 },
    { capacity: 200, koordinator: 1, tenagaIt: 2, elektrikal: 2, sarpras: 1 },
    { capacity: 300, koordinator: 1, tenagaIt: 3, elektrikal: 3, sarpras: 2 },
    { capacity: 400, koordinator: 1, tenagaIt: 4, elektrikal: 4, sarpras: 3 },
    { capacity: 500, koordinator: 1, tenagaIt: 5, elektrikal: 5, sarpras: 3 },
  ];

  for (const req of personnelReqs) {
    await prisma.masterPersonnelRequirement.upsert({
      where: { capacity: req.capacity },
      update: req,
      create: req,
    });
  }
  console.log(`✅ ${personnelReqs.length} tier kebutuhan tenaga teknis dibuat`);

  console.log('✅ Seed selesai');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
