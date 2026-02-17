# VDR Teens v1.0.3

Patch release.

## Perubahan

- Validasi tanggal lahir (`birthdate`) sekarang wajib saat membuat akun baru.
- Perbaikan validasi input tanggal lahir agar format tidak valid langsung ditolak.
- Proteksi akun admin:
  - Akun dengan `isAdmin: true` tidak bisa dihapus dari dashboard.
  - Firestore Rules juga memblokir delete untuk dokumen user admin.
- Import user dari Google Sheets sekarang mode **replace**:
  - Data lama koleksi `users` di Firestore dihapus terlebih dahulu.
  - Data hasil import dimasukkan sebagai data baru.
  - Tidak lagi mode merge/append.

## Catatan

- Ini memengaruhi koleksi `users` di Firestore, bukan otomatis sinkron hapus akun di Firebase Authentication (khususnya pada mode tanpa Cloud Functions).
- Tidak ada perubahan pada format payload import dari Apps Script.
