# VDR Teens v1.1.1

## Perubahan

- Mobile hamburger menu (phones):
  - Menambahkan skeleton loading untuk tombol auth di menu hamburger saat Firebase/Auth belum selesai load.
  - Skeleton akan hilang otomatis setelah status auth Firebase sudah resolved.
  - Menambahkan fallback agar tombol tetap muncul (pakai email) jika fetch data user ke Firestore gagal.

## Catatan

- Tidak ada breaking change.
