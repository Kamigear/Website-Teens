# Sistem Kelola Kegiatan Teens

## 📋 Fitur Lengkap

Sistem ini memungkinkan admin untuk mengelola kegiatan Teens secara dinamis melalui dashboard admin, dan kegiatan akan otomatis ditampilkan di halaman publik.

## 🎯 Cara Menggunakan

### Untuk Admin:

1. **Login sebagai Admin**
   - Login ke dashboard dengan akun admin
   - Dashboard admin akan otomatis muncul

2. **Menambah Kegiatan Baru**
   - Klik card "Kelola Kegiatan" di admin dashboard
   - Klik tombol "Buat Event"
   - Isi form dengan informasi kegiatan:
     - **Judul Kegiatan**: Nama kegiatan (wajib)
     - **Deskripsi**: Penjelasan singkat kegiatan (wajib)
     - **Tipe Kegiatan**: 
       - "Event Utama" - Akan ditampilkan sebagai featured event
       - "Event Reguler" - Akan ditampilkan di grid events
     - **Tanggal**: Tanggal pelaksanaan (wajib)
     - **Waktu**: Jam pelaksanaan, contoh: "08:00 - 20:00 WIB" (wajib)
     - **Lokasi**: Tempat pelaksanaan (wajib)
     - **URL Gambar**: Link gambar event (opsional, akan menggunakan gambar default jika kosong)
     - **Kategori/Badge**: Label untuk event, contoh: "RETREAT", "MEDITASI" (opsional)
     - **Status**: 
       - "Akan Datang" - Event yang belum dimulai
       - "Sedang Berlangsung" - Event yang sedang berjalan
       - "Selesai" - Event yang sudah selesai
   - Klik "Simpan"

3. **Mengedit Kegiatan**
   - Buka "Kelola Kegiatan" → "Lihat Semua"
   - Klik tombol edit (ikon pensil) pada kegiatan yang ingin diedit
   - Ubah informasi yang diperlukan
   - Klik "Simpan"

4. **Menghapus Kegiatan**
   - Buka "Kelola Kegiatan" → "Lihat Semua"
   - Klik tombol hapus (ikon tempat sampah) pada kegiatan yang ingin dihapus
   - Konfirmasi penghapusan

### Untuk Pengunjung:

Kegiatan akan otomatis muncul di:

1. **Halaman Index (Beranda)**
   - Menampilkan 3 kegiatan terdekat yang statusnya "Akan Datang" atau "Sedang Berlangsung"
   - Tampilan ringkas dengan gambar, judul, deskripsi singkat, dan tanggal

2. **Halaman Events (Kegiatan Teens)**
   - **Featured Event**: Menampilkan 1 event utama teratas
   - **Regular Events**: Menampilkan semua event reguler dalam grid

## 🗂️ Struktur Data Firebase

Data kegiatan disimpan di Firestore collection `events` dengan struktur:

```javascript
{
  title: string,           // Judul kegiatan
  description: string,     // Deskripsi kegiatan
  type: string,           // "featured" atau "regular"
  date: string,           // Format: "YYYY-MM-DD"
  time: string,           // Format bebas, contoh: "08:00 - 20:00 WIB"
  location: string,       // Lokasi pelaksanaan
  image: string,          // URL gambar
  category: string,       // Kategori/badge (opsional)
  status: string,         // "upcoming", "ongoing", atau "completed"
  createdAt: timestamp,   // Waktu pembuatan
  updatedAt: timestamp    // Waktu update terakhir
}
```

## 📁 File-file Terkait

### JavaScript Modules:
- `js/events-manager.js` - Mengelola CRUD operations untuk admin
- `js/events-display.js` - Menampilkan events di halaman publik
- `js/dashboard.js` - Mengintegrasikan events manager ke admin dashboard

### HTML Pages:
- `dashboard.html` - Admin panel dengan modal kelola kegiatan
- `events.html` - Halaman kegiatan lengkap
- `index.html` - Halaman beranda dengan preview kegiatan

## 🎨 Styling

Events menggunakan class CSS yang sudah ada:
- `.brief-event-card` - Card untuk preview di index.html
- `.full-event-card` - Card untuk events.html
- `.featured-event-card` - Card untuk featured event

## 🔒 Keamanan

- Hanya admin yang dapat menambah, edit, dan hapus kegiatan
- Data disimpan di Firebase Firestore dengan aturan keamanan
- Validasi form di client-side untuk memastikan data lengkap

## 💡 Tips

1. **Gambar Event**: 
   - Gunakan URL gambar yang sudah di-upload ke hosting
   - Ukuran rekomendasi: 800x600px
   - Format: JPG atau PNG

2. **Deskripsi**:
   - Buat deskripsi yang menarik dan informatif
   - Untuk index.html, deskripsi akan dipotong otomatis (max 80 karakter)
   - Untuk events.html, deskripsi akan dipotong (max 100 karakter)

3. **Status Event**:
   - Update status event secara berkala
   - Event "Selesai" tidak akan muncul di index.html
   - Gunakan status "Sedang Berlangsung" untuk event yang sedang berjalan

4. **Featured Event**:
   - Hanya 1 featured event yang akan ditampilkan
   - Pilih event paling penting sebagai featured
   - Featured event akan muncul paling atas di events.html

## 🚀 Deployment

Pastikan Firebase sudah dikonfigurasi dengan benar:
1. Firestore database sudah aktif
2. Collection `events` sudah dibuat
3. Rules Firestore sudah diatur untuk mengizinkan read public dan write admin only

## 📞 Support

Jika ada masalah atau pertanyaan, hubungi developer atau cek console browser untuk error messages.
