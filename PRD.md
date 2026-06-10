# PRODUCT REQUIREMENTS DOCUMENT (PRD)
**Sistem Aplikasi Pengelolaan dan Pengendalian Pelaksanaan Seleksi di Seluruh Titik Lokasi Tes secara Online**

## 1. Tujuan Produk (Product Objective)
Menyediakan platform terpusat (*web & mobile*) untuk merencanakan, memantau, dan mengendalikan seluruh siklus operasional pelaksanaan seleksi secara *real-time* di 38 provinsi. Platform ini berfungsi mulai dari pelacakan pengiriman barang (mobilisasi), pemantauan persentase instalasi di lokasi, hingga manajemen insiden teknis dan kehadiran pada hari H pelaksanaan.

## 2. Peran Pengguna (User Roles)
* **Super Admin (Pusat BKN/Manajemen Penyedia):** Memiliki akses penuh ke *dashboard* ringkasan nasional, memantau *progress* instalasi seluruh titik, dan analitik laporan insiden.
* **Tim Logistik / Gudang Utama:** Mengelola manifes pengiriman, status distribusi barang, dan pemulangan barang (demobilisasi).
* **Koordinator Lokasi (Korlok):** Mengelola penerimaan barang di lokasi, memastikan seluruh tahapan instalasi selesai tepat waktu, dan mengawasi jalannya ujian.
* **Tenaga Teknis (IT, Elektrikal, Sarpras):** Mengeksekusi instalasi fisik, menindaklanjuti kendala (tiket insiden), dan melakukan pelaporan *checklist* kesiapan harian.
* **Petugas Registrasi / Pengawas:** Melakukan *scan* kehadiran peserta dan melaporkan jika ada masalah di ruangan. Memiliki akses **View-Only** (hanya lihat) untuk seluruh modul utama (Lokasi, Logistik, Instalasi, Kehadiran, Dokumen) guna pemantauan, namun diizinkan untuk **Membuat Tiket Insiden** jika ditemukan kendala di lapangan. Pengawas tidak dapat mengubah data master, status pengiriman, atau progres instalasi.

---

## 3. Fungsionalitas Utama (Key Features)

### Fase Pra-Pelaksanaan (H-7 hingga H-1)

#### A. Modul Manajemen Logistik & Mobilisasi
* **Tracking Distribusi Logistik:** Memantau status armada pengiriman dari gudang menuju seluruh titik lokasi di 38 provinsi (Sedang Dikemas -> Dalam Perjalanan -> Tiba di Lokasi).
* **Digital Inventory Checklist (Penerimaan Barang):** Fitur untuk Korlok melakukan *scan* atau *checklist* kedatangan barang secara digital. Sistem akan memvalidasi kesesuaian jumlah aktual dengan standar e-Katalog, mencakup kelengkapan seperti *laptop client*, UPS, jaringan LAN, *metal detector*, CCTV, tenda ruang transit, hingga AC dan genset.
* **Manajemen Buffer Stock:** Sistem menampilkan *dashboard* ketersediaan perangkat cadangan (misal: *laptop* cadangan, cadangan *switch hub*) secara *real-time* per lokasi ujian.

#### B. Modul Tracking Progress Instalasi (%)
* **Milestone Pekerjaan Lapangan:** Menerjemahkan *timeline* kerja teknisi menjadi persentase penyelesaian yang dipantau dari Pusat:
    * **20% (Tata Letak):** Ruangan dan tenda transit/steril terbentuk, meja/kursi tersusun.
    * **50% (Infrastruktur Dasar):** Tarikan kabel listrik, *switch* jaringan, dan koneksi Genset/AC selesai terpasang.
    * **80% (Deployment Perangkat):** Pemasangan *laptop client*, *server*, alat registrasi (*webcam*, *barcode scanner*), dan CCTV siap.
    * **100% (Uji Coba & Segel):** Telah dilakukan *stress test* jaringan dan sistem siap pakai.
* **Bukti Validasi (Geotagging & Foto):** Setiap pembaruan persentase wajib disertai unggahan foto kondisi lapangan *real-time* yang terkunci dengan lokasi GPS (*geotagging*).
* **Delay Alerts:** Notifikasi eskalasi otomatis berwarna merah di *dashboard* Pusat apabila progress suatu titik lokasi berada di bawah batas aman (misal <80% pada H-1).

### Fase Hari H Pelaksanaan

#### C. Dashboard Pemantauan Terpusat (*Real-Time Command Center*)
* **Peta Interaktif Nasional:** Tampilan peta sebaran lokasi di 38 provinsi dengan indikator status warna (Hijau: Operasional normal, Kuning: Kendala ringan/parsial, Merah: Insiden mayor seperti mati listrik).
* **Live Metrics:** Menampilkan statistik jumlah peserta yang *check-in*, sesi ujian berjalan, dan jumlah infrastruktur yang aktif.

#### D. Sistem Tiket Insiden (*Issue Tracking & Resolution*)
* **Pelaporan Instan:** Jika PC *error*, listrik padam, atau jaringan *down*, pengawas di ruangan dapat memicu peringatan (membuat tiket) melalui aplikasi.
* **Alokasi Tugas Teknis:** Sistem secara otomatis mendistribusikan tiket ke *smartphone* tenaga teknis sesuai tupoksinya (IT, Elektrikal, atau Sarpras).
* **SLA Tracker:** Memiliki *timer* penyelesaian insiden. Jika tidak ditangani dalam batas waktu tertentu, statusnya tereskalasi ke Koordinator Lokasi.

#### E. Manajemen Kehadiran & Kesesuaian Personil
* **Absensi Peserta:** Modul terintegrasi dengan pemindai *barcode/QR* (*barcode scanner*) di meja registrasi untuk mencatat kehadiran peserta secara instan.
* **Validasi Kehadiran Tenaga Teknis:** Memastikan jumlah tenaga teknis yang bertugas *standby* di lokasi sesuai dengan syarat jumlah peserta per sesi (contoh: untuk 100 orang butuh 1 koordinator, 1 IT, 1 elektrikal, 1 sarpras). 

---

## 4. Pelaporan & Evaluasi (Post-Event)

#### F. Reporting & Audit Trail
* **Berita Acara Digital:** Sistem otomatis melakukan kompilasi data *log* insiden, rekap logistik, dan jumlah peserta hadir per sesi menjadi format *Berita Acara Pelaksanaan* (BAP) yang dapat diekspor.
* **Audit Keamanan Sistem:** Setiap aksi *user* (pergantian status barang, penyelesaian tiket) tercatat dalam basis data log (*audit trail*) lengkap dengan cap waktu untuk akuntabilitas.

---

## 5. Kebutuhan Non-Fungsional (Non-Functional Requirements)
* **Offline Support:** Mengingat potensi koneksi yang tidak merata di daerah, aplikasi (khusus Korlok/Teknisi) harus bisa bekerja *offline*. Data kedatangan barang atau kehadiran akan tersimpan lokal dan segera disinkronisasi ke *server* saat koneksi pulih.
* **Aksesibilitas:** Responsif terhadap berbagai perangkat. *Dashboard* kompleks melalui *Web-Based* (PC/Laptop), sementara modul lapangan (Checklist logistik, progress instalasi, tiket kendala) dioptimalkan untuk akses *Mobile* (Android/iOS).
* **Keamanan Ekstra:** Melindungi integritas data *layout* server dan identitas peserta.