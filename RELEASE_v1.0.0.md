# VDR Teens v1.0.0

Rilis resmi pertama **VDR Teens**.

Versi ini membawa sistem absensi yang lebih fleksibel dan siap dipakai operasional komunitas, termasuk token mingguan berbasis QR, absensi manual oleh admin, pengaturan poin berbasis slot waktu, serta integrasi backup/import data ke Google Sheets.

## Yang Baru di v1.0.0

- Sistem login dan dashboard pengguna
- Absensi dengan token mingguan + QR fullscreen
- Absensi manual oleh admin (tanpa user harus pegang HP)
- Konfigurasi poin absensi berbasis slot waktu (dinamis, bisa tambah/kurang slot)
- Pencarian user via search bar untuk absensi manual
- Manajemen akun dan kegiatan oleh admin
- Riwayat poin dan kehadiran terintegrasi Firestore
- Export/import data ke Google Sheets via Apps Script
- Peningkatan SEO dasar (sitemap, robots, favicon/manifest, metadata)

## Catatan

- Pastikan konfigurasi Apps Script (`ADMIN_PASSWORD` dan Web App URL) sudah benar untuk fitur export/import.
- Untuk hasil favicon/site name di Google Search, perubahan dapat butuh waktu re-index beberapa hari.

