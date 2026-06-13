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
    { email: 'admin@nbp.co.id',     name: 'Super Admin',            role: UserRole.SUPER_ADMIN,         instansi: 'BKN Pusat' },
    { email: 'logistik@nbp.co.id',  name: 'Tim Logistik',           role: UserRole.LOGISTICS,           instansi: 'Andalan Teknologi' },
    { email: 'korlok@nbp.co.id',    name: 'Koordinator Lokasi',     role: UserRole.COORDINATOR,         instansi: 'Andalan Teknologi' },
    { email: 'it@nbp.co.id',        name: 'Tenaga Teknis IT',       role: UserRole.TECHNICAL_IT,        instansi: 'Andalan Teknologi' },
    { email: 'listrik@nbp.co.id',   name: 'Teknisi Elektrikal',     role: UserRole.TECHNICAL_ELECTRICAL,instansi: 'Andalan Teknologi' },
    { email: 'sarpras@nbp.co.id',   name: 'Teknisi Sarpras',        role: UserRole.TECHNICAL_SARPRAS,   instansi: 'Andalan Teknologi' },
    { email: 'registrasi@nbp.co.id',name: 'Petugas Registrasi',     role: UserRole.REGISTRAR,           instansi: 'BKN Daerah' },
    { email: 'pengawas@nbp.co.id',  name: 'Pengawas',               role: UserRole.SUPERVISOR,          instansi: 'BKN Daerah' },
    { email: 'pimpinan@nbp.co.id',  name: 'Pimpinan BKN',           role: UserRole.PIMPINAN,            instansi: 'BKN Pusat' },
    { email: 'ppk@nbp.co.id',       name: 'PPK',                    role: UserRole.PPK,                 instansi: 'BKN Pusat' },
    { email: 'inspektorat@nbp.co.id', name: 'Inspektorat',          role: UserRole.INSPEKTORAT,         instansi: 'BKN Pusat' },
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

  const locations = [
    { code: 'JKT-001', name: 'Universitas Indonesia - Depok', province: 'DKI Jakarta', city: 'Jakarta Selatan', address: 'Jl. Margonda Raya, Depok', latitude: -6.3608, longitude: 106.8272, status: 'READY', capacity: 500 },
    { code: 'JBR-001', name: 'Universitas Padjadjaran - Bandung', province: 'Jawa Barat', city: 'Bandung', address: 'Jl. Raya Bandung-Sumedang KM 21', latitude: -6.9175, longitude: 107.7628, status: 'READY', capacity: 400 },
    { code: 'JTN-001', name: 'Universitas Diponegoro - Semarang', province: 'Jawa Tengah', city: 'Semarang', address: 'Jl. Prof. Soedarto, Tembalang', latitude: -7.0455, longitude: 110.4259, status: 'INSTALLATION_IN_PROGRESS', capacity: 350 },
    { code: 'JTM-001', name: 'Universitas Airlangga - Surabaya', province: 'Jawa Timur', city: 'Surabaya', address: 'Jl. Mulyorejo, Surabaya', latitude: -7.2702, longitude: 112.7753, status: 'READY', capacity: 450 },
    { code: 'SMU-001', name: 'Universitas Sumatera Utara - Medan', province: 'Sumatera Utara', city: 'Medan', address: 'Jl. Dr. T. Mansur No. 9', latitude: 3.5612, longitude: 98.6532, status: 'READY', capacity: 300 },
    { code: 'PPA-001', name: 'Universitas Cenderawasih - Jayapura', province: 'Papua', city: 'Jayapura', address: 'Jl. Abepura, Jayapura', latitude: -2.5916, longitude: 140.669, status: 'PREPARATION', capacity: 150 },
    { code: 'BLL-001', name: 'Universitas Udayana - Denpasar', province: 'Bali', city: 'Denpasar', address: 'Jl. PB Sudirman, Denpasar', latitude: -8.65, longitude: 115.2167, status: 'READY', capacity: 280 },
    { code: 'KTM-001', name: 'Universitas Mulawarman - Samarinda', province: 'Kalimantan Timur', city: 'Samarinda', address: 'Jl. Kuaro, Samarinda', latitude: -0.4948, longitude: 117.1536, status: 'INSTALLATION_IN_PROGRESS', capacity: 200 },
  ] as const;

  for (const loc of locations) {
    await prisma.location.upsert({
      where: { code: loc.code },
      update: {},
      create: {
        ...loc,
        coordinatorId: koordinator?.id,
        startDate: new Date('2026-09-01T00:00:00Z'),
        endDate: new Date('2026-09-30T00:00:00Z'),
      },
    });
  }
  console.log(`✅ ${locations.length} lokasi demo dibuat`);

  // ── Master data: 38 item standar (Lampiran 2 Dok. Pengumuman BKN
  //    No 113/D23/DPPP/04/2026). Kuantitas per tier kapasitas 100–500
  //    peserta/sesi; nilai default — dapat disesuaikan admin via DB.
  //    S = SEWA, M = MILIK_SENDIRI (default dokumen: mayoritas sewa).
  type MI = [no: number, name: string, unit: string, q100: number, q200: number, q300: number, q400: number, q500: number];
  const masterItems: MI[] = [
    [1,  'Laptop client untuk peserta ujian termasuk jaringan LAN dan elektrikal', 'unit', 110, 220, 330, 440, 550],
    [2,  'UPS untuk router/switch hub', 'unit', 2, 3, 4, 5, 6],
    [3,  'UPS untuk modem internet dan switch', 'unit', 2, 2, 3, 3, 4],
    [4,  'Laptop client untuk registrasi peserta termasuk jaringan LAN dan elektrikal', 'unit', 2, 4, 6, 8, 10],
    [5,  'Metal Detector', 'unit', 2, 2, 3, 4, 4],
    [6,  'Webcam eksternal include tripod untuk registrasi peserta', 'unit', 2, 4, 6, 8, 10],
    [7,  'LED ring light include tripod untuk registrasi', 'unit', 2, 4, 6, 8, 10],
    [8,  'Barcode scanner untuk registrasi peserta', 'unit', 2, 4, 6, 8, 10],
    [9,  'Laptop client untuk monitoring ruang ujian termasuk jaringan LAN dan elektrikal', 'unit', 1, 2, 3, 4, 5],
    [10, 'Webcam eksternal include tripod untuk monitoring ruang ujian', 'unit', 1, 2, 3, 4, 5],
    [11, 'Laptop untuk admin termasuk jaringan LAN dan elektrikal', 'unit', 2, 2, 3, 3, 4],
    [12, 'Meja cover untuk penerimaan dan pengambilan tempat penitipan barang', 'unit', 2, 4, 6, 8, 10],
    [13, 'Kursi susun tanpa cover untuk penerimaan dan pengambilan tempat penitipan barang', 'unit', 4, 8, 12, 16, 20],
    [14, 'Container box', 'unit', 10, 20, 30, 40, 50],
    [15, 'Printer termasuk toner/tinta panitia ruang ujian', 'unit', 1, 2, 3, 4, 5],
    [16, 'Laptop untuk LCD Projector termasuk elektrikal', 'unit', 1, 2, 3, 4, 5],
    [17, 'LCD Projector termasuk screen untuk ruang ujian min 3000 lumens', 'unit', 1, 2, 3, 4, 5],
    [18, 'CCTV termasuk display dan media penyimpanan', 'set', 1, 2, 2, 3, 3],
    [19, 'Hardisk 2 TB', 'unit', 1, 2, 2, 3, 3],
    [20, 'TV LCD termasuk standing bracket, elektrikal, dan flashdisk min 2GB', 'unit', 1, 2, 2, 3, 3],
    [21, 'Meja cover untuk ruang ujian', 'unit', 110, 220, 330, 440, 550],
    [22, 'Kursi susun cover untuk ruang ujian', 'unit', 110, 220, 330, 440, 550],
    [23, 'Meja cover untuk panitia ruang transit', 'unit', 2, 2, 3, 3, 4],
    [24, 'Kursi susun tanpa cover untuk panitia ruang transit', 'unit', 4, 4, 6, 6, 8],
    [25, 'Printer termasuk toner/tinta registrasi', 'unit', 1, 2, 3, 4, 5],
    [26, 'Kursi susun tanpa cover untuk peserta ruang transit, registrasi, steril', 'unit', 100, 200, 300, 400, 500],
    [27, 'Meja cover untuk panitia ruang registrasi', 'unit', 2, 4, 6, 8, 10],
    [28, 'Kursi susun tanpa cover untuk panitia ruang registrasi', 'unit', 2, 4, 6, 8, 10],
    [29, 'Tenda semi dekor ruang transit, steril, registrasi, penitipan barang + lampu min 40 watt (tiap 25 m2) termasuk elektrikal', 'modul', 8, 16, 24, 32, 40],
    [30, 'Tenda sarnafil untuk ruang medis termasuk elektrikal dan lampu (tiap 25 m2)', 'modul', 1, 1, 2, 2, 2],
    [31, 'Pembatas antrian (1 kaki, 1 tiang, 1 tali)', 'set', 10, 20, 30, 40, 50],
    [32, 'Sound portable untuk ruang transit, registrasi, steril, ruang ujian dan elektrikal', 'set', 2, 2, 3, 4, 4],
    [33, 'AC standing untuk ruang ujian dan medis termasuk elektrikal', 'unit', 2, 4, 6, 8, 10],
    [34, 'Misty fan termasuk pengisian airnya dan elektrikal untuk ruang transit, registrasi, steril', 'unit', 2, 4, 6, 8, 10],
    [35, 'Genset termasuk solar + teknisi standby min 12 jam', 'unit', 1, 1, 2, 2, 2],
    [36, 'ATK peserta dan panitia', 'set', 100, 200, 300, 400, 500],
    [37, 'Sewa gedung (ruang untuk ujian)', 'paket', 1, 1, 1, 1, 1],
    [38, 'Sistem Aplikasi Pengelolaan dan Pengendalian Pelaksanaan Seleksi di Seluruh Titik Lokasi Tes secara Online', 'sistem', 1, 1, 1, 1, 1],
  ];

  for (const [no, name, unit, q100, q200, q300, q400, q500] of masterItems) {
    await prisma.masterItem.upsert({
      where: { no },
      update: { name, unit, qty100: q100, qty200: q200, qty300: q300, qty400: q400, qty500: q500 },
      create: { no, name, unit, ownership: 'SEWA', qty100: q100, qty200: q200, qty300: q300, qty400: q400, qty500: q500 },
    });
  }
  console.log(`✅ ${masterItems.length} master item standar dibuat (Lampiran 2 BKN)`);

  // ── Master data: kebutuhan tenaga teknis per kapasitas
  //    (BAB 4 atribut 2.3 Dok. Pengumuman BKN — angka persis dari dokumen)
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
