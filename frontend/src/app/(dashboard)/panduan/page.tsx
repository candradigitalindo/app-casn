"use client";

import { useState, useEffect } from "react";
import {
  BookOpen,
  LogIn,
  LayoutDashboard,
  MapPin,
  Truck,
  Wrench,
  AlertTriangle,
  HardHat,
  FolderOpen,
  FileText,
  UserCog,
  ChevronRight,
  ChevronLeft,
  Info,
  Lightbulb,
  X,
  ZoomIn,
  ArrowRight,
  Download,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

function imgSrc(folder: string, file: string): string {
  return `/buku%20panduan/${encodeURIComponent(folder)}/${encodeURIComponent(file)}`;
}

interface Step {
  label: string;
  detail?: string;
}

interface Screenshot {
  src: string;
  step: string;
  caption: string;
}

interface Section {
  id: string;
  number: number;
  title: string;
  icon: React.ElementType;
  accent: string; // tailwind color name, e.g. "blue"
  roles: string[];
  description: string;
  steps: Step[];
  tips?: string[];
  screenshots: Screenshot[];
}

// Peta warna aksen agar konsisten (Tailwind tidak bisa kelas dinamis penuh)
const ACCENT: Record<
  string,
  { soft: string; solid: string; ring: string; text: string; chipBg: string; gradient: string }
> = {
  blue: {
    soft: "bg-blue-100 text-blue-700",
    solid: "bg-blue-600",
    ring: "ring-blue-200",
    text: "text-blue-700",
    chipBg: "bg-blue-50 text-blue-700 border-blue-200",
    gradient: "from-blue-500 to-blue-600",
  },
  indigo: {
    soft: "bg-indigo-100 text-indigo-700",
    solid: "bg-indigo-600",
    ring: "ring-indigo-200",
    text: "text-indigo-700",
    chipBg: "bg-indigo-50 text-indigo-700 border-indigo-200",
    gradient: "from-indigo-500 to-indigo-600",
  },
  emerald: {
    soft: "bg-emerald-100 text-emerald-700",
    solid: "bg-emerald-600",
    ring: "ring-emerald-200",
    text: "text-emerald-700",
    chipBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
    gradient: "from-emerald-500 to-emerald-600",
  },
  orange: {
    soft: "bg-orange-100 text-orange-700",
    solid: "bg-orange-600",
    ring: "ring-orange-200",
    text: "text-orange-700",
    chipBg: "bg-orange-50 text-orange-700 border-orange-200",
    gradient: "from-orange-500 to-orange-600",
  },
  violet: {
    soft: "bg-violet-100 text-violet-700",
    solid: "bg-violet-600",
    ring: "ring-violet-200",
    text: "text-violet-700",
    chipBg: "bg-violet-50 text-violet-700 border-violet-200",
    gradient: "from-violet-500 to-violet-600",
  },
  red: {
    soft: "bg-red-100 text-red-700",
    solid: "bg-red-600",
    ring: "ring-red-200",
    text: "text-red-700",
    chipBg: "bg-red-50 text-red-700 border-red-200",
    gradient: "from-red-500 to-red-600",
  },
  amber: {
    soft: "bg-amber-100 text-amber-700",
    solid: "bg-amber-500",
    ring: "ring-amber-200",
    text: "text-amber-700",
    chipBg: "bg-amber-50 text-amber-700 border-amber-200",
    gradient: "from-amber-500 to-amber-600",
  },
  teal: {
    soft: "bg-teal-100 text-teal-700",
    solid: "bg-teal-600",
    ring: "ring-teal-200",
    text: "text-teal-700",
    chipBg: "bg-teal-50 text-teal-700 border-teal-200",
    gradient: "from-teal-500 to-teal-600",
  },
  cyan: {
    soft: "bg-cyan-100 text-cyan-700",
    solid: "bg-cyan-600",
    ring: "ring-cyan-200",
    text: "text-cyan-700",
    chipBg: "bg-cyan-50 text-cyan-700 border-cyan-200",
    gradient: "from-cyan-500 to-cyan-600",
  },
  slate: {
    soft: "bg-slate-200 text-slate-700",
    solid: "bg-slate-700",
    ring: "ring-slate-300",
    text: "text-slate-700",
    chipBg: "bg-slate-100 text-slate-700 border-slate-200",
    gradient: "from-slate-600 to-slate-700",
  },
};

const SECTIONS: Section[] = [
  {
    id: "login",
    number: 1,
    title: "Masuk ke Sistem",
    icon: LogIn,
    accent: "blue",
    roles: ["Semua pengguna"],
    description:
      "Setiap pengguna wajib masuk menggunakan akun yang telah disiapkan administrator sebelum dapat mengakses sistem.",
    steps: [
      { label: "Buka browser dan akses alamat sistem SIPP Seleksi" },
      { label: "Masukkan alamat email terdaftar pada kolom Email" },
      { label: "Masukkan password akun Anda" },
      { label: "Klik tombol Masuk" },
      { label: "Sistem otomatis mengarahkan Anda ke halaman Dashboard" },
    ],
    tips: [
      "Lupa password? Hubungi administrator sistem untuk reset.",
      "Jangan berbagi akun dengan orang lain demi keamanan data.",
    ],
    screenshots: [
      {
        src: imgSrc("login", "Tangkapan Layar 2026-06-15 pukul 05.15.03.png"),
        step: "Halaman Login",
        caption: "Masukkan email & password, lalu klik Masuk",
      },
    ],
  },
  {
    id: "dashboard",
    number: 2,
    title: "Dashboard",
    icon: LayoutDashboard,
    accent: "indigo",
    roles: ["Semua pengguna"],
    description:
      "Dashboard menyajikan ringkasan kondisi seluruh titik lokasi secara real-time — data diperbarui otomatis setiap ada perubahan di lapangan.",
    steps: [
      { label: "Klik menu Dashboard di sidebar" },
      {
        label: "Baca kartu statistik di bagian atas",
        detail:
          "Total lokasi, total tenaga teknis, tiket insiden terbuka, dan pengiriman dalam perjalanan",
      },
      {
        label: "Perhatikan grafik Status Lokasi (pie) untuk distribusi lokasi: Siap, Instalasi, Persiapan, Ditutup",
      },
      { label: "Grafik Progres Titik Lokasi menampilkan akumulasi instalasi per lokasi" },
      {
        label: "Scroll ke bawah untuk grafik kehadiran tenaga teknis dan daftar tiket insiden terbaru",
      },
    ],
    screenshots: [
      {
        src: imgSrc("dashboard", "Tangkapan Layar 2026-06-15 pukul 05.15.30.png"),
        step: "Tampilan Dashboard",
        caption: "Statistik, grafik status, dan progres real-time seluruh lokasi",
      },
    ],
  },
  {
    id: "titik-lokasi",
    number: 3,
    title: "Titik Lokasi",
    icon: MapPin,
    accent: "emerald",
    roles: ["Super Admin", "Koordinator", "Pengawas BKN (lihat)"],
    description:
      "Mengelola seluruh tempat pelaksanaan seleksi. Setiap lokasi melewati 6 tahap berurutan: Persiapan → Instalasi → Uji Fungsi → Pelaksanaan → Deinstalasi → Serah Terima.",
    steps: [
      { label: "Klik menu Titik Lokasi di sidebar" },
      { label: "Daftar lokasi tampil lengkap dengan status, provinsi, kota, dan kapasitas" },
      { label: "Gunakan filter Status atau kotak pencarian untuk menyaring daftar" },
      { label: "Klik tombol Tambah Lokasi untuk menambah titik baru (Super Admin)" },
      {
        label: "Klik ikon titik tiga pada kartu lokasi untuk membuka menu aksi",
        detail: "Tahapan Pekerjaan, Info Singkat, Edit, atau Hapus",
      },
      {
        label: "Pilih Tahapan Pekerjaan untuk memantau & memperbarui progres 6 fase beserta berita acara dan foto",
        detail: "Berita Acara perlu disetujui Pengawas Lapangan sebelum dianggap final",
      },
    ],
    tips: [
      "Pengguna yang ditugaskan ke satu lokasi hanya melihat data lokasinya sendiri.",
      "Tahapan diselesaikan berurutan dari Persiapan hingga Serah Terima.",
    ],
    screenshots: [
      {
        src: imgSrc("titik lokasi", "titik-lokasi.png"),
        step: "Langkah 1 — Daftar Lokasi",
        caption: "Daftar titik lokasi dengan status dan filter",
      },
      {
        src: imgSrc("titik lokasi", "create.png"),
        step: "Langkah 2 — Tambah Lokasi",
        caption: "Form pembuatan titik lokasi baru",
      },
      {
        src: imgSrc("titik lokasi", "action-tilok.png"),
        step: "Langkah 3 — Menu Aksi",
        caption: "Menu aksi cepat pada kartu lokasi",
      },
      {
        src: imgSrc("titik lokasi", "tilok - tahapan pekerjaan.png"),
        step: "Langkah 4 — Tahapan Pekerjaan",
        caption: "Alur 6 tahapan, berita acara, dokumentasi & daftar barang",
      },
    ],
  },
  {
    id: "logistik",
    number: 4,
    title: "Logistik",
    icon: Truck,
    accent: "orange",
    roles: ["Super Admin", "Tim Logistik", "Koordinator", "Pengawas BKN (lihat)"],
    description:
      "Mengelola pengiriman perlengkapan dan perangkat dari gudang pusat ke titik lokasi, dari pengemasan hingga konfirmasi penerimaan.",
    steps: [
      { label: "Klik menu Logistik di sidebar" },
      { label: "Daftar pengiriman tampil dengan status: Belum Dikirim, Dikemas, Perjalanan, Tiba, Diterima" },
      { label: "Klik Buat Pengiriman, lalu pilih titik lokasi tujuan" },
      {
        label: "Tambahkan item barang ke manifest dengan mengisi jumlah pada kolom Dikirim",
        detail: "Jumlah standar tiap barang otomatis menyesuaikan kapasitas peserta lokasi",
      },
      {
        label: "Setelah disimpan, perbarui status sesuai kondisi nyata di lapangan",
        detail: "Dikemas → Kirim Sekarang → Tiba di Lokasi → Diterima",
      },
    ],
    tips: ["Perbarui status tepat waktu agar tim lokasi siap menerima barang."],
    screenshots: [
      {
        src: imgSrc("logistik", "view-logistik.png"),
        step: "Langkah 1 — Daftar Pengiriman",
        caption: "Ringkasan status pengiriman per lokasi",
      },
      {
        src: imgSrc("logistik", "create-pengiriman.png"),
        step: "Langkah 2 — Pilih Lokasi",
        caption: "Buat pengiriman & pilih titik lokasi tujuan",
      },
      {
        src: imgSrc("logistik", "add item-pengiriman.png"),
        step: "Langkah 3 — Tambah Barang",
        caption: "Pilih barang dan tentukan jumlah yang dikirim",
      },
      {
        src: imgSrc("logistik", "view-pengiriman.png"),
        step: "Langkah 4 — Pantau Status",
        caption: "Detail & timeline status pengiriman",
      },
    ],
  },
  {
    id: "instalasi",
    number: 5,
    title: "Instalasi",
    icon: Wrench,
    accent: "violet",
    roles: ["Super Admin", "Koordinator", "Tenaga Teknis", "Pengawas BKN (lihat)"],
    description:
      "Mencatat dan memantau progres pemasangan perangkat per titik lokasi melalui persentase penyelesaian tiap item barang.",
    steps: [
      { label: "Klik menu Instalasi di sidebar" },
      { label: "Lihat ringkasan: Belum Mulai, Sedang Berjalan, Selesai, dan rata-rata progres" },
      { label: "Klik lokasi untuk membuka daftar seluruh item barang yang harus dipasang" },
      {
        label: "Klik ikon pensil pada item untuk memperbarui persentase pemasangannya",
        detail: "Status lokasi otomatis terupdate seiring progres seluruh item",
      },
      { label: "Tambahkan foto dokumentasi & catatan bila ada kondisi khusus" },
    ],
    tips: ["Dokumentasi foto sangat disarankan sebagai bukti pekerjaan tiap item."],
    screenshots: [
      {
        src: imgSrc("instalasi", "view-instalasi.png"),
        step: "Langkah 1 — Ringkasan",
        caption: "Progres instalasi per lokasi",
      },
      {
        src: imgSrc("instalasi", "item instalasi.png"),
        step: "Langkah 2 — Detail Item",
        caption: "Daftar item barang dengan persentase pemasangan",
      },
    ],
  },
  {
    id: "insiden",
    number: 6,
    title: "Insiden",
    icon: AlertTriangle,
    accent: "red",
    roles: ["Semua pengguna"],
    description:
      "Menangani pelaporan dan penyelesaian kendala di lapangan. Setiap insiden memiliki SLA (batas waktu penyelesaian) sesuai tingkat keparahannya.",
    steps: [
      { label: "Klik menu Insiden di sidebar" },
      { label: "Klik tombol Buat Tiket untuk melaporkan insiden baru" },
      {
        label: "Tentukan tingkat keparahan sesuai dampak nyata",
        detail: "Kritis (sistem lumpuh) · Tinggi (perlu segera) · Sedang (masih berjalan) · Rendah (terjadwal)",
      },
      {
        label: "Pilih kategori gangguan, lokasi, lalu isi judul & deskripsi kejadian dengan jelas",
        detail: "IT Software, IT Hardware, Kelistrikan, Jaringan, Sarana Prasarana, atau Lainnya",
      },
      { label: "Klik Kirim Laporan — tiket muncul di daftar dan tim terkait ditugaskan otomatis" },
      { label: "Pantau dan perbarui status penanganan tiket melalui tombol Update" },
    ],
    tips: [
      "Insiden Kritis memiliki SLA paling ketat — laporkan segera.",
      "Sertakan foto kondisi bermasalah agar penanganan lebih cepat.",
    ],
    screenshots: [
      {
        src: imgSrc("insiden", "view-insiden.png"),
        step: "Langkah 1 — Daftar Tiket",
        caption: "Pantau seluruh tiket insiden & status SLA",
      },
      {
        src: imgSrc("insiden", "add-insiden.png"),
        step: "Langkah 2 — Laporkan Insiden",
        caption: "Isi keparahan, kategori, dan detail kejadian",
      },
      {
        src: imgSrc("insiden", "item insiden.png"),
        step: "Langkah 3 — Tiket Terbuat",
        caption: "Tiket muncul di daftar, siap ditindaklanjuti",
      },
    ],
  },
  {
    id: "tenaga-teknis",
    number: 7,
    title: "Tenaga Teknis",
    icon: HardHat,
    accent: "amber",
    roles: ["Super Admin", "Koordinator", "Petugas Registrasi", "Pengawas BKN (lihat)"],
    description:
      "Mengelola data SDM yang bertugas di tiap lokasi dan pencatatan kehadiran harian selama masa persiapan hingga pelaksanaan seleksi.",
    steps: [
      { label: "Klik menu Tenaga Teknis di sidebar" },
      { label: "Klik kartu lokasi untuk membuka daftar personel yang ditugaskan" },
      {
        label: "Di tab Presensi Harian, pilih tanggal lalu tandai kehadiran tiap personel",
        detail: "Peran: Koordinator, Tenaga IT, Elektrikal, Tenaga Sarpras, dan Pengawas BKN",
      },
      { label: "Upload bukti kehadiran berupa foto lembar absensi" },
      { label: "Buka tab Rekap & Unduh untuk rekapitulasi per periode dan unduh CSV" },
    ],
    tips: ["Kehadiran wajib dicatat setiap hari selama masa persiapan dan pelaksanaan."],
    screenshots: [
      {
        src: imgSrc("tenaga teknis", "view-tenaga-teknis.png"),
        step: "Langkah 1 — Ringkasan Lokasi",
        caption: "Ketersediaan personel per titik lokasi",
      },
      {
        src: imgSrc("tenaga teknis", "list-tenaga-teknis.png"),
        step: "Langkah 2 — Presensi Harian",
        caption: "Tandai kehadiran & upload bukti per personel",
      },
      {
        src: imgSrc("tenaga teknis", "rekap-daftar-hadir.png"),
        step: "Langkah 3 — Rekap & Unduh",
        caption: "Rekapitulasi kehadiran per periode + unduh CSV",
      },
    ],
  },
  {
    id: "dokumen",
    number: 8,
    title: "Dokumen",
    icon: FolderOpen,
    accent: "teal",
    roles: ["Super Admin", "Tim Logistik", "Koordinator", "Pengawas BKN (lihat)"],
    description:
      "Repositori digital untuk seluruh berkas administrasi per lokasi — mulai dari kontrak hingga foto dokumentasi lapangan.",
    steps: [
      { label: "Klik menu Dokumen di sidebar" },
      { label: "Pilih atau cari lokasi, lalu klik untuk membuka daftar dokumennya" },
      { label: "Klik Upload Dokumen untuk menambah berkas baru" },
      {
        label: "Pilih kategori dokumen yang sesuai",
        detail: "Kontrak/SPK, Surat Tugas, Berita Acara, Laporan, Foto Dokumentasi, atau Lainnya",
      },
      { label: "Isi nama dokumen, pilih file (PDF/JPG/PNG), lalu simpan" },
    ],
    screenshots: [
      {
        src: imgSrc("dokumen", "view-dokumen.png"),
        step: "Tampilan Dokumen",
        caption: "Daftar dokumen per lokasi & tombol unggah",
      },
    ],
  },
  {
    id: "laporan",
    number: 9,
    title: "Laporan",
    icon: FileText,
    accent: "cyan",
    roles: ["Super Admin", "Pengawas BKN", "Pimpinan", "PPK", "Inspektorat"],
    description:
      "Rekap menyeluruh progres pekerjaan seluruh titik lokasi, dirancang untuk pemantauan dan evaluasi pimpinan serta pengawas.",
    steps: [
      { label: "Klik menu Laporan di sidebar" },
      { label: "Lihat Rekap Berita Acara per lokasi beserta status persetujuan pengawas" },
      {
        label: "Pilih jenis laporan untuk detail lebih dalam",
        detail: "Status Lokasi, Status Logistik, Progres Instalasi, Insiden & SLA, Kehadiran, atau Dashboard Eksekutif",
      },
      { label: "Gunakan filter provinsi atau rentang tanggal untuk memfokuskan data" },
    ],
    tips: ["Hanya dapat diakses Super Admin dan role pengawasan BKN."],
    screenshots: [
      {
        src: imgSrc("laporan", "view-laporan.png"),
        step: "Tampilan Laporan",
        caption: "Rekap berita acara & akses cepat berbagai laporan",
      },
    ],
  },
  {
    id: "pengguna",
    number: 10,
    title: "Pengguna",
    icon: UserCog,
    accent: "slate",
    roles: ["Super Admin saja"],
    description:
      "Mengelola seluruh akun pengakses sistem. Pembuatan, pengeditan, dan penonaktifan akun hanya dapat dilakukan Super Admin.",
    steps: [
      { label: "Klik menu Pengguna di sidebar" },
      { label: "Daftar pengguna tampil dengan nama, email, role, dan instansi" },
      { label: "Gunakan filter role di atas atau kotak pencarian untuk menemukan akun" },
      { label: "Klik Tambah Pengguna lalu isi nama, email, dan nomor HP" },
      {
        label: "Pilih role yang sesuai — role menentukan menu yang dapat diakses",
        detail: "Pilih dengan teliti karena memengaruhi hak akses pengguna",
      },
      { label: "Tentukan lokasi penugasan (untuk Koordinator/Tenaga Teknis), lalu simpan" },
    ],
    tips: [
      "Pastikan email benar — digunakan sebagai username untuk login.",
      "Pengguna dengan lokasi penugasan hanya melihat data lokasi tersebut.",
    ],
    screenshots: [
      {
        src: imgSrc("pengguna", "view-pengguna.png"),
        step: "Langkah 1 — Daftar Pengguna",
        caption: "Seluruh akun dengan role & filter",
      },
      {
        src: imgSrc("pengguna", "add-pengguna.png"),
        step: "Langkah 2 — Tambah Pengguna",
        caption: "Form akun baru: role & lokasi penugasan",
      },
    ],
  },
];

// ── Teknologi yang dipakai (untuk dokumen PDF) ────────────────────────────────
interface TechGroup {
  category: string;
  items: { name: string; desc: string }[];
}

const TECH_STACK: TechGroup[] = [
  {
    category: "Antarmuka (Frontend)",
    items: [
      { name: "Next.js 15", desc: "Framework React dengan App Router untuk membangun antarmuka web" },
      { name: "React 19", desc: "Pustaka utama pembentuk komponen tampilan" },
      { name: "TypeScript", desc: "Bahasa pemrograman dengan pengetikan ketat untuk keandalan kode" },
      { name: "Tailwind CSS v4", desc: "Sistem styling utilitas untuk tampilan responsif" },
      { name: "shadcn/ui (Base UI)", desc: "Kumpulan komponen antarmuka siap pakai" },
    ],
  },
  {
    category: "Data & Status Aplikasi",
    items: [
      { name: "TanStack Query v5", desc: "Pengelolaan data server, caching, dan sinkronisasi otomatis" },
      { name: "Zustand", desc: "Pengelolaan status aplikasi (autentikasi pengguna)" },
      { name: "Axios", desc: "Klien HTTP dengan penyegaran token otomatis" },
      { name: "Socket.IO", desc: "Komunikasi real-time untuk pembaruan data langsung" },
    ],
  },
  {
    category: "Formulir, Grafik & Peta",
    items: [
      { name: "React Hook Form + Zod", desc: "Pengelolaan dan validasi formulir input" },
      { name: "Recharts", desc: "Visualisasi data berupa grafik dan diagram" },
      { name: "React Leaflet", desc: "Peta interaktif untuk titik lokasi" },
    ],
  },
  {
    category: "Infrastruktur (Backend & Deployment)",
    items: [
      { name: "NestJS", desc: "Framework backend penyedia REST API" },
      { name: "PostgreSQL", desc: "Basis data utama penyimpanan data sistem" },
      { name: "Redis", desc: "Penyimpanan cache dan antrean untuk performa" },
      { name: "Docker + Nginx", desc: "Kontainerisasi dan reverse proxy untuk deployment" },
    ],
  },
];

// ── Detail satu modul (panel kanan / tampilan detail mobile) ──────────────────
function ModuleDetail({
  section,
  onZoom,
}: {
  section: Section;
  onZoom: (s: Screenshot) => void;
}) {
  const a = ACCENT[section.accent];
  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
      {/* Header band */}
      <div className={cn("p-5 sm:p-6 text-white bg-gradient-to-br", a.gradient)}>
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
            <section.icon className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold bg-white/20 rounded-md px-1.5 py-0.5">
                Modul {String(section.number).padStart(2, "0")}
              </span>
            </div>
            <h2 className="text-xl font-bold mt-1.5 leading-tight">{section.title}</h2>
            <p className="text-sm text-white/85 mt-1.5 leading-relaxed">{section.description}</p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {/* Roles */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide shrink-0 mr-0.5">
            Hak akses
          </span>
          {section.roles.map((role) => (
            <span
              key={role}
              className={cn("text-[11px] rounded-full px-2.5 py-0.5 font-medium border", a.chipBg)}
            >
              {role}
            </span>
          ))}
        </div>

        {/* Steps timeline */}
        <div>
          <p className="text-[11px] font-semibold text-foreground uppercase tracking-wide mb-3">
            Langkah-langkah
          </p>
          <ol className="relative space-y-3.5 pl-1">
            {section.steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <div className="flex flex-col items-center shrink-0">
                  <span
                    className={cn(
                      "h-6 w-6 rounded-full text-white text-[11px] font-bold flex items-center justify-center bg-gradient-to-br shadow-sm",
                      a.gradient
                    )}
                  >
                    {i + 1}
                  </span>
                  {i < section.steps.length - 1 && <span className="w-px flex-1 bg-gray-200 mt-1" />}
                </div>
                <div className="flex-1 min-w-0 pb-0.5">
                  <span className="text-sm text-foreground leading-snug">{step.label}</span>
                  {step.detail && (
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                      {step.detail}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Tips */}
        {section.tips && section.tips.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5">
            <div className="flex items-center gap-1.5 mb-2">
              <Lightbulb className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide">
                Tips &amp; Catatan
              </span>
            </div>
            <ul className="space-y-1.5">
              {section.tips.map((tip, i) => (
                <li key={i} className="flex gap-2 text-xs text-amber-800">
                  <span className="shrink-0 mt-0.5 font-bold">•</span>
                  <span className="leading-relaxed">{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Screenshots */}
        {section.screenshots.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[11px] font-semibold text-foreground uppercase tracking-wide">
                Tampilan Sistem
              </p>
              {section.screenshots.length > 1 && (
                <span className="text-[10px] text-muted-foreground">
                  ({section.screenshots.length} langkah — sesuai urutan)
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {section.screenshots.map((shot, i) => (
                <figure key={i} className="group">
                  <button
                    onClick={() => onZoom(shot)}
                    className="relative block w-full rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={shot.src} alt={shot.caption} className="w-full h-auto object-contain" loading="lazy" />
                    <span className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 text-gray-700 rounded-full p-2 shadow-md">
                        <ZoomIn className="h-4 w-4" />
                      </span>
                    </span>
                    <span
                      className={cn(
                        "absolute top-2 left-2 text-[10px] font-semibold text-white rounded-md px-2 py-0.5 bg-gradient-to-br shadow",
                        a.gradient
                      )}
                    >
                      {shot.step}
                    </span>
                  </button>
                  <figcaption className="flex items-start gap-1.5 text-[11px] text-muted-foreground mt-2 px-1 leading-snug">
                    <ArrowRight className="h-3 w-3 mt-0.5 shrink-0 text-gray-300" />
                    {shot.caption}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PanduanPage() {
  const [activeId, setActiveId] = useState<string>(SECTIONS[0].id);
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  const [lightbox, setLightbox] = useState<Screenshot | null>(null);

  const active = SECTIONS.find((s) => s.id === activeId) ?? SECTIONS[0];

  // Kunci scroll body saat lightbox terbuka + tutup dengan Esc
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setLightbox(null);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightbox]);

  function selectModule(id: string) {
    setActiveId(id);
    setMobileView("detail");
    // Scroll ke atas saat berpindah modul (panel kanan di desktop, halaman di mobile)
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleDownloadPdf() {
    if (typeof window !== "undefined") window.print();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100/40">
      {/* Aturan cetak: sembunyikan shell aplikasi, tampilkan hanya dokumen PDF */}
      <style>{PRINT_CSS}</style>

      <div className="max-w-6xl mx-auto px-4 py-6 pb-20 no-print">
        {/* ── Hero (ringkas) ── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-blue-700 p-5 sm:p-6 text-white shadow-lg mb-5">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
          <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
              <BookOpen className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold leading-tight">Panduan Pengguna SIPP Seleksi</h1>
              <p className="text-sm text-white/85 mt-1 leading-relaxed">
                Pilih modul di samping untuk melihat panduan langkah demi langkah beserta tangkapan layar.
              </p>
            </div>
            <button
              onClick={handleDownloadPdf}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-primary shadow-sm hover:bg-white/90 active:bg-white/80 transition-colors shrink-0"
            >
              <Download className="h-4 w-4" />
              Unduh PDF
            </button>
          </div>
        </div>

        {/* ── Layout master-detail (seperti menu email) ── */}
        <div className="lg:grid lg:grid-cols-[300px_1fr] lg:gap-5 lg:items-start">
          {/* LEFT — daftar modul */}
          <aside
            className={cn(
              "lg:sticky lg:top-6",
              mobileView === "detail" && "hidden lg:block"
            )}
          >
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b bg-gray-50/60">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Daftar Modul
                </p>
              </div>
              <nav className="p-2 space-y-0.5 lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto">
                {SECTIONS.map((s) => {
                  const a = ACCENT[s.accent];
                  const isActive = s.id === activeId;
                  return (
                    <button
                      key={s.id}
                      onClick={() => selectModule(s.id)}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors group",
                        isActive ? "bg-gray-100" : "hover:bg-gray-50 active:bg-gray-100"
                      )}
                    >
                      <span
                        className={cn(
                          "h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-all",
                          isActive
                            ? cn("text-white bg-gradient-to-br shadow-sm", a.gradient)
                            : a.soft
                        )}
                      >
                        <s.icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block text-sm font-semibold leading-tight truncate",
                            isActive ? "text-foreground" : "text-foreground/90"
                          )}
                        >
                          {s.title}
                        </span>
                        <span className="block text-[11px] text-muted-foreground truncate mt-0.5">
                          {s.roles[0]}
                          {s.roles.length > 1 ? ` +${s.roles.length - 1}` : ""}
                        </span>
                      </span>
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          isActive ? a.text : "text-gray-300 group-hover:text-gray-400"
                        )}
                      />
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* RIGHT — detail modul */}
          <section
            className={cn(
              "mt-4 lg:mt-0 min-w-0",
              mobileView === "list" && "hidden lg:block"
            )}
          >
            {/* Tombol kembali (mobile saja) */}
            <button
              onClick={() => setMobileView("list")}
              className="lg:hidden inline-flex items-center gap-1.5 text-sm font-medium text-primary mb-3 hover:underline"
            >
              <ChevronLeft className="h-4 w-4" />
              Kembali ke daftar modul
            </button>

            <ModuleDetail section={active} onZoom={setLightbox} />

            {/* Navigasi prev / next */}
            <ModuleNav activeId={activeId} onSelect={selectModule} />
          </section>
        </div>

        {/* Footer */}
        <div className="mt-8 rounded-2xl border border-dashed bg-white/60 p-5 text-center">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 mb-2">
            <Info className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm font-medium text-foreground">Butuh bantuan lebih lanjut?</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Hubungi administrator sistem untuk pertanyaan atau kendala akun.
          </p>
          <p className="text-[11px] text-muted-foreground/60 mt-3">SIPP Seleksi — Panduan Pengguna v1.0</p>
        </div>
      </div>

      {/* ── Lightbox ── */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="max-w-5xl w-full max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="overflow-auto rounded-xl bg-white shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={lightbox.src} alt={lightbox.caption} className="w-full h-auto" />
            </div>
            <div className="text-center mt-3">
              <p className="text-sm font-medium text-white">{lightbox.step}</p>
              <p className="text-xs text-white/70 mt-0.5">{lightbox.caption}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Dokumen cetak / PDF (tersembunyi di layar, tampil saat dicetak) ── */}
      <PanduanPrintDocument />
    </div>
  );
}

// ── Navigasi modul sebelumnya / berikutnya ───────────────────────────────────
function ModuleNav({
  activeId,
  onSelect,
}: {
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const idx = SECTIONS.findIndex((s) => s.id === activeId);
  const prev = idx > 0 ? SECTIONS[idx - 1] : null;
  const next = idx < SECTIONS.length - 1 ? SECTIONS[idx + 1] : null;

  return (
    <div className="grid grid-cols-2 gap-3 mt-4">
      {prev ? (
        <button
          onClick={() => onSelect(prev.id)}
          className="flex items-center gap-2 rounded-xl border bg-white p-3 text-left shadow-sm hover:shadow-md hover:border-gray-300 transition-all"
        >
          <ChevronLeft className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="min-w-0">
            <span className="block text-[10px] text-muted-foreground uppercase tracking-wide">Sebelumnya</span>
            <span className="block text-sm font-semibold text-foreground truncate">{prev.title}</span>
          </span>
        </button>
      ) : (
        <div />
      )}
      {next ? (
        <button
          onClick={() => onSelect(next.id)}
          className="flex items-center justify-end gap-2 rounded-xl border bg-white p-3 text-right shadow-sm hover:shadow-md hover:border-gray-300 transition-all"
        >
          <span className="min-w-0">
            <span className="block text-[10px] text-muted-foreground uppercase tracking-wide">Berikutnya</span>
            <span className="block text-sm font-semibold text-foreground truncate">{next.title}</span>
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>
      ) : (
        <div />
      )}
    </div>
  );
}

// ── CSS khusus cetak (PDF) ────────────────────────────────────────────────────
const PRINT_CSS = `
#panduan-print { display: none; }
@media print {
  @page { size: A4; margin: 15mm 14mm; }
  html, body { background: #ffffff !important; }
  /* Sembunyikan seluruh shell aplikasi */
  body * { visibility: hidden !important; }
  #panduan-print, #panduan-print * { visibility: visible !important; }
  #panduan-print {
    display: block !important;
    position: absolute;
    left: 0; top: 0; width: 100%;
    color: #0f172a;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .no-print { display: none !important; }
  .pdf-page-break { break-before: page; }
  .pdf-avoid { break-inside: avoid; }
  #panduan-print img { max-width: 100%; height: auto; }
}
`;

// ── Dokumen PDF: sampul → daftar isi → teknologi → modul ──────────────────────
function PanduanPrintDocument() {
  const today = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div id="panduan-print">
      {/* ══ SAMPUL ══ */}
      <section
        className="pdf-avoid"
        style={{
          minHeight: "248mm",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          background: "#1e3a8a",
          color: "#fff",
          padding: "40px",
          borderRadius: "8px",
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 18,
            background: "rgba(255,255,255,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 28,
          }}
        >
          <BookOpen style={{ width: 40, height: 40 }} />
        </div>
        <p style={{ letterSpacing: 2, fontSize: 13, opacity: 0.8, marginBottom: 12 }}>
          PANDUAN PENGGUNA
        </p>
        <h1 style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.15, margin: 0 }}>
          SIPP SELEKSI
        </h1>
        <p style={{ fontSize: 16, opacity: 0.9, marginTop: 16, maxWidth: 460 }}>
          Sistem Aplikasi Pengelolaan dan Pengendalian Pelaksanaan Seleksi CASN
        </p>
        <div
          style={{
            marginTop: 40,
            paddingTop: 24,
            borderTop: "1px solid rgba(255,255,255,0.25)",
            fontSize: 13,
            opacity: 0.85,
          }}
        >
          <p style={{ margin: 0 }}>Dokumen Panduan Resmi · Versi 1.0</p>
          <p style={{ margin: "4px 0 0" }}>Diterbitkan {today}</p>
        </div>
      </section>

      {/* ══ DAFTAR ISI ══ */}
      <section className="pdf-page-break pdf-avoid" style={{ paddingTop: 8 }}>
        <PdfHeading>Daftar Isi</PdfHeading>
        <ol style={{ listStyle: "none", padding: 0, margin: "20px 0 0" }}>
          <PdfTocRow label="Teknologi yang Dipakai" page="" />
          {SECTIONS.map((s) => (
            <PdfTocRow
              key={s.id}
              label={`Modul ${String(s.number).padStart(2, "0")} — ${s.title}`}
              page=""
            />
          ))}
        </ol>
      </section>

      {/* ══ TEKNOLOGI ══ */}
      <section className="pdf-page-break" style={{ paddingTop: 8 }}>
        <PdfHeading>Teknologi yang Dipakai</PdfHeading>
        <p style={{ fontSize: 13, color: "#475569", margin: "8px 0 20px", lineHeight: 1.6 }}>
          SIPP Seleksi dibangun menggunakan teknologi modern untuk menjamin keandalan,
          keamanan, dan kemudahan penggunaan. Berikut komponen utama yang digunakan.
        </p>
        {TECH_STACK.map((group) => (
          <div key={group.category} className="pdf-avoid" style={{ marginBottom: 18 }}>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "#1e3a8a",
                margin: "0 0 8px",
                paddingBottom: 6,
                borderBottom: "2px solid #e2e8f0",
              }}
            >
              {group.category}
            </h3>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <tbody>
                {group.items.map((it) => (
                  <tr key={it.name}>
                    <td
                      style={{
                        width: "32%",
                        padding: "6px 10px 6px 0",
                        fontWeight: 600,
                        color: "#0f172a",
                        verticalAlign: "top",
                      }}
                    >
                      {it.name}
                    </td>
                    <td style={{ padding: "6px 0", color: "#475569", verticalAlign: "top" }}>
                      {it.desc}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </section>

      {/* ══ MODUL PENGGUNAAN ══ */}
      {SECTIONS.map((section) => (
        <section key={section.id} className="pdf-page-break" style={{ paddingTop: 8 }}>
          {/* Judul modul */}
          <div
            className="pdf-avoid"
            style={{
              background: "#1e3a8a",
              color: "#fff",
              borderRadius: 8,
              padding: "16px 18px",
              marginBottom: 16,
            }}
          >
            <p style={{ fontSize: 11, letterSpacing: 1, opacity: 0.8, margin: 0 }}>
              MODUL {String(section.number).padStart(2, "0")}
            </p>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: "4px 0 6px" }}>{section.title}</h2>
            <p style={{ fontSize: 13, opacity: 0.92, margin: 0, lineHeight: 1.5 }}>
              {section.description}
            </p>
          </div>

          {/* Hak akses */}
          <div className="pdf-avoid" style={{ marginBottom: 14 }}>
            <PdfLabel>Hak Akses</PdfLabel>
            <p style={{ fontSize: 12.5, color: "#334155", margin: "4px 0 0" }}>
              {section.roles.join(" · ")}
            </p>
          </div>

          {/* Langkah-langkah */}
          <div className="pdf-avoid" style={{ marginBottom: 14 }}>
            <PdfLabel>Langkah-langkah</PdfLabel>
            <ol style={{ margin: "8px 0 0", padding: 0, listStyle: "none" }}>
              {section.steps.map((step, i) => (
                <li
                  key={i}
                  className="pdf-avoid"
                  style={{ display: "flex", gap: 10, marginBottom: 8, fontSize: 12.5 }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: "#1e3a8a",
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {i + 1}
                  </span>
                  <span style={{ color: "#0f172a", lineHeight: 1.5 }}>
                    {step.label}
                    {step.detail && (
                      <span
                        style={{
                          display: "block",
                          marginTop: 4,
                          fontSize: 11.5,
                          color: "#475569",
                          background: "#f1f5f9",
                          borderRadius: 6,
                          padding: "6px 10px",
                        }}
                      >
                        {step.detail}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {/* Tips */}
          {section.tips && section.tips.length > 0 && (
            <div
              className="pdf-avoid"
              style={{
                background: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: 8,
                padding: "10px 14px",
                marginBottom: 14,
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#b45309",
                  letterSpacing: 0.5,
                  margin: "0 0 6px",
                }}
              >
                TIPS &amp; CATATAN
              </p>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {section.tips.map((tip, i) => (
                  <li key={i} style={{ fontSize: 12, color: "#92400e", marginBottom: 3, lineHeight: 1.5 }}>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tangkapan layar */}
          {section.screenshots.length > 0 && (
            <div>
              <PdfLabel>Tampilan Sistem</PdfLabel>
              <div style={{ marginTop: 8 }}>
                {section.screenshots.map((shot, i) => (
                  <figure
                    key={i}
                    className="pdf-avoid"
                    style={{ margin: "0 0 14px", textAlign: "center" }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#1e3a8a",
                        textAlign: "left",
                        marginBottom: 5,
                      }}
                    >
                      {shot.step}
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={shot.src}
                      alt={shot.caption}
                      style={{
                        width: "100%",
                        border: "1px solid #e2e8f0",
                        borderRadius: 6,
                      }}
                    />
                    <figcaption
                      style={{ fontSize: 11, color: "#64748b", marginTop: 5, textAlign: "left" }}
                    >
                      {shot.caption}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          )}
        </section>
      ))}

      {/* ══ PENUTUP ══ */}
      <section className="pdf-page-break pdf-avoid" style={{ paddingTop: 8, textAlign: "center" }}>
        <div
          style={{
            border: "1px dashed #cbd5e1",
            borderRadius: 8,
            padding: "32px 24px",
            marginTop: 16,
          }}
        >
          <Layers style={{ width: 32, height: 32, color: "#1e3a8a", margin: "0 auto 12px" }} />
          <p style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: 0 }}>
            Terima kasih telah membaca panduan ini
          </p>
          <p style={{ fontSize: 12.5, color: "#475569", margin: "8px 0 0", lineHeight: 1.6 }}>
            Untuk pertanyaan atau kendala akun, hubungi administrator sistem.
          </p>
          <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 20 }}>
            SIPP Seleksi — Panduan Pengguna v1.0
          </p>
        </div>
      </section>
    </div>
  );
}

function PdfHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: 24,
        fontWeight: 800,
        color: "#1e3a8a",
        margin: 0,
        paddingBottom: 10,
        borderBottom: "3px solid #1e3a8a",
      }}
    >
      {children}
    </h2>
  );
}

function PdfLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: "#64748b",
        letterSpacing: 0.5,
        textTransform: "uppercase",
      }}
    >
      {children}
    </span>
  );
}

function PdfTocRow({ label }: { label: string; page: string }) {
  return (
    <li
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "9px 0",
        borderBottom: "1px solid #e2e8f0",
        fontSize: 13.5,
        color: "#0f172a",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "#1e3a8a",
          flexShrink: 0,
        }}
      />
      {label}
    </li>
  );
}
