# Audit bug dan optimasi aplikasi SIPP

Audit 19 Oktober 2026 pada frontend Next.js dan backend NestJS di `app-casn`. Perbaikan pada sumber mencakup pembatasan lokasi, izin operasi, konsistensi progres instalasi, persetujuan berita acara, presensi, sesi, dan konkurensi data. Pada akhir audit, layanan produksi belum diperbarui. Temuan lanjutan yang masih terbuka tercantum tersendiri di bawah.

## Bug yang sudah diperbaiki

| Prioritas | Temuan dan pemicu | Perilaku setelah perbaikan | Sumber utama |
| --- | --- | --- | --- |
| P1 | Pembatasan `user.locationId` dilakukan di browser; URL dan API langsung dapat membaca atau mengubah lokasi lain. | Guard server memeriksa lokasi pada URL, query, body, dan pemilik resource. Filter juga diterapkan pada daftar, statistik, dan laporan. | `backend/src/common/guards/location-scope.guard.ts` dan controller serta service terkait |
| P1 | Socket menerima koneksi anonim dan menyiarkan data ke semua klien. | Handshake memverifikasi access token dan akun aktif. Siaran menuju pemantau global dan room lokasi pemilik data; klien lokal tidak dapat bergabung ke lokasi lain. | `backend/src/modules/events/events.gateway.ts` |
| P1 | Endpoint tahapan, milestone instalasi, edit BA, dan beberapa perubahan tiket tidak membatasi peran sesuai UI. | Peran operasional memakai daftar izin bersama. Peran pengawasan tetap dapat membuat tiket; persetujuan BA tetap khusus admin dan pengawas lapangan. | `backend/src/common/constants/roles.ts` dan controller terkait |
| P1 | Menghapus lokasi membuat `User.locationId` menjadi `null`, sementara `null` berarti cakupan seluruh lokasi. | Akun yang terikat lokasi dinonaktifkan dalam transaksi sebelum lokasi dihapus. Token lama ditolak pada request HTTP berikutnya. | `backend/src/modules/locations/locations.service.ts` |
| P1 | `PATCH berita-acara/:id` menerima `status: FINAL` tanpa proses persetujuan. | Status hasil tinjauan hanya dapat diberikan lewat endpoint approve atau reject. Revisi isi menghapus metadata persetujuan dan mengajukan ulang dokumen yang memiliki file. | `backend/src/modules/berita-acara/berita-acara.service.ts` |
| P1 | Draft tanpa file dapat disetujui; dua peninjau dapat menimpa hasil tinjauan. | Review mensyaratkan file dan status pending, serta memakai predicate status dan waktu perubahan untuk mendeteksi konflik. Alasan penolakan kosong ditolak. | Service berita acara |
| P2 | Upsert fase instalasi dapat mendahului pembentukan tahapan; pembentukan hanya berjalan jika jumlah fase nol. Akibatnya hanya satu dari enam fase tersedia. | Akses tahapan melengkapi fase yang hilang dengan `skipDuplicates`, sambil mempertahankan fase yang sudah ada. | `backend/src/modules/stages/stages.service.ts` |
| P2 | Milestone lama, barang lokasi, dan edit manual sama-sama mengendalikan progres instalasi; laporan dan alert memakai sumber berbeda. | Progres tahap instalasi, ringkasan, laporan, dan alert mengikuti barang lokasi. Edit progres manual pada fase instalasi ditolak; UI menjelaskan sumbernya. Endpoint milestone lama tetap menyimpan datanya untuk kompatibilitas. | `backend/src/common/utils/installation-progress.util.ts`, service installations, reports, stages |
| P2 | Fase selesai dapat tetap memiliki progres di bawah 100%; membuka kembali fase meninggalkan tanggal dan petugas penyelesaian. | Penyelesaian mengisi 100% dan metadata secara konsisten. Membuka ulang menghapus metadata penyelesaian. Pengembalian progres barang ke nol juga membersihkan tanggal tahap instalasi. | Service stages dan utility progres instalasi |
| P2 | Pembulatan rata-rata 99,5% menjadi 100% dapat membuat UI menyebut lokasi selesai sebelum seluruh barang selesai. | Label selesai mensyaratkan setiap barang mencapai 100%. | `frontend/src/app/(dashboard)/installations/page.tsx` |
| P2 | Perubahan kapasitas lewat PATCH umum tidak menyinkronkan kuantitas standar; kegagalan di tengah sinkronisasi dapat meninggalkan data sebagian. | Jalur kapasitas menyinkronkan master dan barang dalam transaksi. Pembuatan lokasi, seed, serta perubahan barang dan agregatnya juga menggunakan transaksi. | Service locations |
| P2 | Dua petugas memperbarui barang di lokasi yang sama dapat menyimpan agregat dari snapshot berbeda. | Perubahan barang mengunci baris lokasi selama transaksi. Uji dua pembaruan bersamaan menghasilkan agregat akhir yang benar. | `backend/src/common/utils/lock-location.util.ts` dan service locations |
| P2 | Penutupan tiket menimpa waktu resolusi pertama; membuka atau menugaskan ulang tiket meninggalkan waktu resolusi lama. | Penutupan mempertahankan waktu resolusi pertama. Status terbuka, assignment, dan eskalasi membersihkan timestamp resolusi. Eskalasi mempertahankan catatan sebelumnya. | Service incidents |
| P2 | Pengiriman berstatus sama menimpa timestamp; nomor berbasis milidetik dapat bertabrakan; upsert checklist mengabaikan perubahan ekspektasi. | Timestamp perjalanan dipertahankan, nomor pengiriman dan BA mendapat akhiran acak, dan checklist memperbarui `expectedQty`. | Service logistics dan berita acara |
| P2 | Presensi menerima tanggal tidak valid dan personel dari lokasi lain; upsert hari yang sama dapat tampak berhasil dengan lokasi lama. | Tanggal divalidasi sebagai kalender `YYYY-MM-DD`, penugasan diperiksa, dan konflik presensi lintas lokasi ditolak. | Service dan DTO personnel |
| P2 | Refresh menerbitkan ulang email dan role dari token lama; `expiresIn` selalu 15 menit meskipun konfigurasi satu jam. | Refresh memakai data akun terkini; durasi respons mengikuti waktu token sebenarnya. Respons login memakai data akun setelah pembaruan waktu login. | Service auth |
| P2 | Login yang salah ikut mencoba refresh; logout UI tidak menghapus cookie; respons refresh terlambat dapat mengisi token setelah logout. | Request login, refresh, dan logout melewati mekanisme retry autentikasi. Logout membersihkan sesi lokal dan memanggil endpoint penghapusan cookie. Refresh terlambat tidak menghidupkan sesi yang sudah berubah. | `frontend/src/lib/api-client.ts`, `auth-actions.ts`, controller auth |
| P2 | Cache bertahan tanpa batas dan dapat dipakai lagi setelah pergantian akun; foto tahapan tidak segera menyegarkan halaman Dokumen. | Cache dibersihkan saat akun berubah, retensi dibatasi sepuluh menit, dan perubahan dokumentasi menyegarkan cache terkait. | QueryProvider dan hook stages |
| P2 | Retry Socket.IO berjalan bersama timer retry tambahan dan koneksi dibuka sebelum login. | Koneksi mengikuti token sesi dan memakai mekanisme reconnect Socket.IO. Perubahan instalasi juga menyegarkan statistik dan ringkasan terkait. | Hook WebSocket |
| P2 | Penomoran vendor membaca kode terbesar sebelum transaksi; request paralel bertabrakan dan urutan teks keliru setelah VDR-9999. | Alokasi kode memakai advisory lock transaksi dan maksimum numerik. Parameter hari yang tidak valid ditolak. | Service dan controller vendors |
| P2 | Nest core 10 dipasang bersama paket WebSocket 11; `express` dan `multer` diimpor tanpa dependensi langsung; lock npm tertinggal dari manifest. | Paket WebSocket diselaraskan ke Nest 10. Dependensi runtime dideklarasikan dan kedua lockfile disinkronkan. | `backend/package.json`, `pnpm-lock.yaml`, `package-lock.json` |
| P2 | Error unik dan relasi Prisma serta paginasi audit invalid dapat berubah menjadi error 500. | Konflik unik dan relasi dipetakan ke 409, record tidak ditemukan ke 404, dan parameter paginasi audit diperiksa. | HttpExceptionFilter dan service reports |
| P2 | Statistik insiden provinsi selalu nol; tiket CLOSED tidak ikut jumlah resolusi pada dashboard nasional. | Statistik provinsi menghitung tiket terbuka dan jumlah resolusi mencakup RESOLVED serta CLOSED. | Service locations |

## Optimasi dan fungsi yang tumpang tindih

- Aturan role operasional dipusatkan dan tombol UI lokasi serta instalasi disesuaikan dengan izin endpoint.
- Perhitungan ringkasan dan sinkronisasi tahap instalasi memakai utility bersama. Kolom milestone lama tetap ada; penghapusan schema memerlukan rencana migrasi data.
- Pemetaan barang pada halaman Instalasi memakai indeks lokasi, sehingga pengelompokan berubah dari pemindaian seluruh barang untuk setiap lokasi menjadi satu kali pengelompokan.
- Query statistik nasional yang independen dijalankan bersamaan. Log payload real-time yang berulang di browser dihapus.
- Warning lint berkurang dari 52 menjadi 35; error lint tetap nol. Warning tersisa terutama dependensi `useMemo`, parameter yang tidak digunakan, dan beberapa tipe `any`.

## Temuan yang masih terbuka

| Prioritas | Temuan | Tindakan berikutnya |
| --- | --- | --- |
| P1 | File di `/uploads` dilayani sebagai konten statis tanpa pemeriksaan pengguna per file. Upload generik juga belum membatasi jenis konten. Guard lokasi API tidak melindungi URL file tersebut. | Rancang akses media dengan pemeriksaan pemilik atau URL bertanda tangan, batasi format file, dan cegah konten aktif disajikan pada origin aplikasi. |
| P1 | ThrottlerModule sudah dikonfigurasi tetapi ThrottlerGuard belum diaktifkan. Percobaan login belum memperoleh pembatasan dari konfigurasi itu. | Terapkan pembatasan login dengan identitas klien yang benar pada rantai reverse proxy. |
| P1 | Refresh token masih stateless. Menghapus cookie tidak mencabut salinan token yang sudah diambil pihak lain. Koneksi socket yang sudah terhubung juga belum diperiksa ulang saat akun diubah. | Tambahkan penyimpanan sesi, rotasi serta pencabutan token, dan pemutusan socket saat akun atau cakupannya berubah. |
| P2 | Daftar UI mengambil halaman awal dengan default 500 record dan belum memiliki kontrol paginasi. Data berikutnya dapat tidak tampil pada daftar besar. | Terapkan paginasi atau infinite query serta statistik server untuk setiap daftar. |
| P2 | MasterItem, InventoryItem, dan LocationItem masih menjadi model barang berbeda. Seed inventaris hanya berjalan saat tabel kosong; sinkronisasi barang lokasi mencocokkan nama. Mengganti nama master dapat menambah barang baru alih-alih memperbarui hubungan lama. | Tentukan master identitas barang dan migrasikan relasi dengan ID yang stabil; pertahankan snapshot kebutuhan lokasi bila memang diperlukan. |
| P2 | Persentase nasional dihitung per barang, sedangkan ringkasan UI lokasi merata-ratakan nilai per lokasi. Kuantitas barang nol dan urutan penyelesaian enam tahap belum memiliki aturan bisnis tegas. | Tetapkan bobot progres, perlakuan barang yang tidak diperlukan, dan prasyarat fase READY/CLOSED sebelum menyeragamkan seluruh indikator. |
| P2 | Bentuk laporan instalasi sekarang menyertakan `items` dan menghitung metriknya dari barang lokasi. Konsumen eksternal yang bergantung pada field milestone lama perlu diperiksa sebelum rilis. | Periksa kontrak integrasi dan tambahkan masa kompatibilitas bila ada konsumen eksternal. |
| P3 | Halaman panduan, detail lokasi, logistik, dan presensi masih besar dengan form serta formatter yang berulang. | Pecah berdasarkan fungsi dan rapikan sisa warning lint secara bertahap. |

Akun yang sebelumnya sudah kehilangan ikatan lokasi akibat penghapusan lama perlu ditinjau melalui riwayat atau backup. Perbaikan penghapusan lokasi berlaku pada operasi setelah kode baru dirilis.

## Verifikasi

- 20 skenario regresi backend, 10 skenario integrasi HTTP/WebSocket, dan 6 skenario sesi frontend lulus: total 36 skenario. Runner backend juga menghitung satu induk suite integrasi.
- Seluruh 15 migrasi berhasil diterapkan pada PostgreSQL uji kosong. Redis dan PostgreSQL pengujian terpisah dari layanan aplikasi.
- Integrasi mencakup login/logout, filter lokasi, izin tulis, enam fase, kesamaan laporan instalasi, approval BA, rollback saat terjadi kegagalan, WebSocket anonim, perubahan barang paralel, penomoran vendor setelah 9999, serta deaktivasi akun saat lokasi dihapus.
- Build backend dan ekspor statis frontend berhasil. Ekspor menghasilkan 24 halaman statis. Lint frontend: 0 error dan 35 warning. `git diff --check` lulus.
- Interaksi browser menyeluruh dan perilaku jaringan produksi belum diuji. Pengujian audit dilakukan sebelum deployment dan tidak menjalankan migrasi atau mengubah data bisnis produksi.

## Menjalankan pengujian

Frontend: jalankan `npm test` dari direktori `frontend`. Backend: jalankan `npm test` dari direktori `backend`; suite integrasi dilewati bila variabel pengujian belum diisi.

Untuk integrasi, siapkan PostgreSQL lokal khusus bernama `sipp_audit_test` beserta Redis terpisah. Terapkan migrasi pada database itu, lalu isi `TEST_DATABASE_URL` dan `TEST_REDIS_PORT` saat menjalankan `npm test`. Suite menolak nama database lain dan host selain `127.0.0.1`. Pengujian menambah fixture; gunakan database sementara yang dapat dibuang. Modul native bcrypt harus tersedia.

Snapshot sumber sebelum perubahan dan log pemeriksaan tersimpan di `/tmp/sipp-audit-20261019`. Panduan autentikasi yang digunakan untuk memeriksa konvensi frontend: [dokumentasi Next.js 15](https://nextjs.org/docs/15/app/guides/authentication).
