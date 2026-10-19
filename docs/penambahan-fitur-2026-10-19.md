# Penambahan keamanan pengadaan dan operasional SIPP

Rilis 19 Oktober 2026 menambahkan delapan peningkatan setelah audit aplikasi. Akses berkas dan sesi diperiksa di server, pengadaan dapat berjalan sampai pembentukan lokasi operasional, dan backup memiliki jadwal serta pemeriksaan pemulihan.

## Fitur yang tersedia

| Area | Perilaku |
| --- | --- |
| Berkas privat | `/uploads` memerlukan tautan bertanda tangan yang berlaku 15 menit. Sesi penerbit dan cakupan lokasi diperiksa kembali saat berkas dibuka. Unggahan baru mencatat pemilik, lokasi, ukuran, serta jenis berkas. Ekstensi dan signature diperiksa; HTML/SVG ditolak. Respons media memakai `private, no-store` dan `nosniff`. |
| Sesi perangkat | Menu **Akun & Sesi** menampilkan perangkat, IP, waktu login, aktivitas refresh, dan riwayat login. Pengguna dapat mencabut satu sesi atau keluar dari semua perangkat. Refresh token dirotasi, disimpan sebagai hash, dan memiliki toleransi 10 detik untuk permintaan dua tab. Pemakaian token lama di luar toleransi mencabut sesi. |
| Pembatasan login | Maksimal 10 percobaan per akun dalam 5 menit dan 100 per IP dalam 1 menit. Percobaan berhasil/gagal dicatat. Header IP Cloudflare hanya dipercaya jika alamat di luar dua proxy lokal termasuk rentang resmi Cloudflare. Penghitung berada di proses aplikasi yang saat ini berjalan dalam satu container. |
| Daftar besar | Pengguna, lokasi, insiden, dan logistik memakai halaman server berisi 20 data. Pencarian/filter berjalan di server; ringkasan mencakup seluruh hasil terkait. Pemilih lokasi dan data pendukung mengambil halaman berikutnya setelah 500 data. |
| Identitas barang | Inventaris dan barang lokasi mempunyai `masterItemId` yang stabil. Penggantian nama tidak menggandakan barang atau menghapus progres. Migrasi menghubungkan kode inventaris lama dan nama master yang tidak ambigu; data kustom tetap tersimpan. |
| Pengadaan | Menu **Pengadaan → Proyek & Penawaran** tersedia bagi Super Admin/Logistik dengan cakupan seluruh lokasi. Mendukung lokasi rencana, kebutuhan berdasarkan tier kapasitas, split vendor, alokasi otomatis, harga khusus, markup, HPS, versi penawaran, serta cetak PDF melalui browser. |
| Notifikasi | Peringatan internal untuk BA menunggu persetujuan, SLA dalam 15 menit atau terlewati, insiden kritis, keterlambatan instalasi, backup bermasalah, dan pemeriksaan layanan/pemulihan yang gagal. Notifikasi mengikuti peran/lokasi, dapat ditandai dibaca, dan tidak dibuat ulang untuk kejadian yang sama. |
| Operasional | Menu **Operasional Sistem** bagi Super Admin menampilkan koneksi database/Redis, ruang disk, backup, uji pemulihan, dan pemeriksaan berkala. GitHub Actions menjalankan pengujian, migrasi database uji, lint, dan build saat push/PR. |

Perubahan password, role, atau penugasan lokasi mencabut sesi dan memutus WebSocket. Koneksi juga diperiksa kembali setiap 30 detik dan diputus ketika access token berakhir. Frontend memperbarui token dan mengambil ulang tautan media selama sesi masih berlaku.

## Alur proyek

1. Catat proyek, instansi, tahun, markup, HPS opsional, dan tanggal pelaksanaan/pengajuan.
2. Tambahkan lokasi rencana dengan provinsi, kota, kapasitas 1–500 peserta, minimal 5 hari, alamat, serta koordinat. Kebutuhan mengikuti tier standar di atas kapasitas tersebut.
3. Pilih vendor yang aktif, sesuai kategori, dan melayani provinsi lokasi. Satu barang dapat dibagi ke beberapa vendor. Kapasitas katalog diperiksa terhadap seluruh alokasi barang tersebut dalam proyek yang sama.
4. Harga harian dikalikan kuantitas dan jumlah hari; harga per event dikalikan kuantitas. Perhitungan memakai desimal dan membulatkan dua angka desimal. Markup adalah persentase penambahan terhadap biaya.
5. Pengajuan memerlukan lokasi dan alokasi lengkap serta total tidak melebihi HPS jika diisi. Snapshot penawaran tersimpan per versi. Perubahan katalog berikutnya tidak mengubah harga yang sudah dipilih atau snapshot lama.
6. Revisi memerlukan alasan dan membuka kembali penyusunan. Pengajuan berikutnya membuat versi baru. Penawaran dapat ditandai menang/kalah atau dibatalkan sesuai status.
7. Proyek menang dapat diaktifkan. Transaksi membuat lokasi operasional, barang, rincian pemasok, dan enam tahapan. Permintaan aktivasi berulang tidak menggandakan lokasi. Nama pemasok serta jumlahnya tampil pada barang lokasi; harga pengadaan tetap tersedia melalui modul pengadaan.
8. Proyek operasional diselesaikan setelah seluruh lokasi berstatus `CLOSED`. Lokasi proyek aktif tidak dapat dihapus.

Kapasitas vendor dihitung per proyek; modul ini belum menjadi sistem reservasi stok lintas proyek dengan jadwal yang saling bertabrakan. Nilai penawaran belum menghitung pajak otomatis. Deadline disimpan sebagai informasi jadwal. Penanda instalasi terlambat memakai aturan awal: lebih dari satu hari setelah tanggal mulai, status belum READY/CLOSED, dan rata-rata progres barang di bawah 20%.

## Backup dan pemantauan

Program operasional berada di `ops/operations.py`. Default penyimpanan: `/home/daniswara/nusantara/backups/sipp-auto`, dengan izin direktori 700 dan berkas 600. Backend membaca berkas status melalui mount khusus yang hanya dapat dibaca.

```bash
python3 ops/operations.py backup
python3 ops/operations.py restore-check
python3 ops/operations.py health
```

Backup menghasilkan dump PostgreSQL, arsip unggahan, checksum SHA-256, manifest, dan ID image aplikasi. Penulisan status dilakukan dengan pergantian berkas atomik. Lock mencegah dua pekerjaan sejenis berjalan bersamaan.

Uji pemulihan memeriksa checksum, membaca seluruh arsip unggahan, dan menjalankan `pg_restore --exit-on-error` ke PostgreSQL sementara tanpa jaringan/port publik. Container uji dihapus setelah pekerjaan selesai. Database produksi tidak menjadi tujuan pemulihan uji.

Jadwal dalam `ops/sipp-operations.cron`:

- Backup setiap hari pukul 19.00 UTC atau 02.00 WIB.
- Uji pemulihan setiap Sabtu pukul 20.00 UTC atau Minggu 03.00 WIB.
- Pemeriksaan origin setiap 5 menit.

Log berada di `/var/log/sipp-operations.log`, dengan rotasi mingguan. Arsip backup tidak dihapus otomatis; pantau kapasitas disk dan salin arsip penting ke penyimpanan terpisah. Mount serta folder backup lokal bukan perlindungan terhadap kehilangan seluruh server.

Endpoint publik `/api/v1/health/live` memeriksa proses dan `/api/v1/health/ready` memeriksa PostgreSQL serta Redis. Diagnostik `/api/v1/health` memerlukan Super Admin. Monitor origin memakai Host `sipp.nbp.co.id` dan tidak mengirim pesan ke layanan eksternal.

## Migrasi dan validasi

Migrasi `20261019230000_security_projects_operations` menambahkan tabel/kolom tanpa menghapus data bisnis. Token lama tidak mempunyai ID sesi, sehingga pengguna perlu login kembali satu kali setelah rilis.

- 24 skenario unit/regresi backend, 18 skenario integrasi HTTP/WebSocket/PostgreSQL/Redis, serta 7 skenario frontend lulus: 49 skenario. Runner backend menghitung satu induk suite tambahan.
- Integrasi menguji rotasi dua tab, token replay, pemutusan socket, akses media, file palsu, cakupan lokasi, expiry, pembatasan login, halaman setelah baris 500, penggantian nama master, split vendor, kapasitas, HPS, versi/revisi, aktivasi paralel, notifikasi, dan diagnostik.
- Semua 16 migrasi berhasil diterapkan pada database uji kosong. Migrasi baru juga berhasil pada salinan produksi: 11 pengguna, 1 lokasi, 38 barang dan 38 inventaris dipertahankan; seluruh 38 barang/inventaris terhubung ke master.
- Backup produksi berhasil dipulihkan di container sementara; 15 berkas unggahan lolos pemeriksaan arsip.
- Browser Chromium menjalankan login, pembuatan proyek/lokasi, alokasi otomatis dan manual, perubahan harga/markup, pengajuan, kemenangan, aktivasi, cetak PDF, sesi, operasional, paginasi, serta notifikasi ponsel tanpa error JavaScript.
- Build backend dan ekspor 30 halaman frontend berhasil. Lint frontend tidak memiliki error; warning yang tersisa berasal dari kode lama dan dependensi hook.

Workflow CI menggunakan versi action yang diverifikasi dari sumber resmi [checkout](https://github.com/actions/checkout), [setup-node](https://github.com/actions/setup-node), dan [pnpm action-setup](https://github.com/pnpm/action-setup), dipatok ke SHA commit. CI memakai database `sipp_audit_test` dan Redis terpisah.
