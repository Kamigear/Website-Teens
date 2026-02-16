# VDR Teens - v1.0.2

VDR Teens adalah aplikasi web berbasis Firebase untuk komunitas remaja Buddhis. Fitur utamanya mencakup login anggota, absensi dengan token mingguan/QR, sistem poin, manajemen kegiatan, serta backup/import data admin ke Google Sheets.

## Fitur

- Autentikasi pengguna (Firebase Auth)
- Dashboard pengguna:
  - Submit kode absensi
  - Lihat poin dan riwayat kehadiran
- Dashboard admin:
  - Kelola akun pengguna
  - Kelola kegiatan
  - Tampilkan token absensi fullscreen + QR
  - Absensi manual (admin dapat mengabsenkan user tanpa HP user)
  - Absensi manual dengan pencarian user (search bar)
  - Atur poin absensi berdasarkan slot waktu dinamis (`+`/`-` slot)
  - Export/import data ke Google Sheets via Google Apps Script
- Dasar SEO:
  - `sitemap.xml`, `robots.txt`, tag Open Graph
  - favicon dan web manifest

## Tech Stack

- Frontend: HTML, CSS (lapisan kustom Tooplate), Bootstrap utilities/components
- JavaScript: Vanilla JS modules
- Backend service: Firebase Auth + Firestore
- Hosting: Firebase Hosting
- Integrasi eksternal: Google Apps Script (backup/sinkronisasi Sheets)

## Struktur Proyek

- `public/` - file statis website (HTML/CSS/JS/images)
- `public/js/firebase-config.js` - konfigurasi Firebase client
- `public/js/dashboard.js` - logika utama dashboard/admin
- `public/css/tooplate-gotto-job.css` - styling kustom UI
- `public/site.webmanifest`, `public/sitemap.xml`, `public/robots.txt` - komponen SEO/PWA
- `firebase.json` - konfigurasi Firebase Hosting
- `.external/google-apps-script.js` - source Apps Script untuk integrasi Google Sheets
- `.external/firestore.rules` - salinan rules Firestore eksternal

