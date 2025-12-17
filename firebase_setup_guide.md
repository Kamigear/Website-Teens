
# Panduan Setup Firebase untuk VDR Teens Dashboard

Berikut adalah langkah-langkah untuk mengatur project Firebase agar sesuai dengan kode dashboard Anda.

## 1. Buat Project di Firebase Console
1. Buka [console.firebase.google.com](https://console.firebase.google.com/).
2. Klik **"Add project"** atau **"Create a project"**.
3. Beri nama project (misalnya: `vdr-teens-app`).
4. (Opsional) Matikan Google Analytics jika sekadar untuk testing, atau biarkan menyala.
5. Klik **Create Project**.

## 2. Dapatkan Config Anda
Jika Anda ingin menggunakan database sendiri (bukan config yang ada sekarang), lakukan ini:
1. Di dashboard project, klik icon **Web** (`</>`).
2. Beri nama aplikasi (misal: `VdrTeensWeb`).
3. Copy bagian `const firebaseConfig = { ... };`.
4. Buka file `public/js/firebase-config.js` di project Anda folder ini.
5. Replace bagian config lama dengan yang baru Anda copy.

## 3. Aktifkan Authentication
Agar sistem login dan akun berjalan:
1. Di menu kiri, pilih **Build** -> **Authentication**.
2. Klik **Get Started**.
3. Di tab **Sign-in method**, pilih **Email/Password**.
4. Aktifkan switch **Enable** (biarkan `Email link` mati).
5. Klik **Save**.

## 4. Aktifkan Firestore Database
Agar data point dan kehadiran tersimpan:
1. Di menu kiri, pilih **Build** -> **Firestore Database**.
2. Klik **Create Database**.
3. Pilih lokasi server (pilih yang terdekat, misal `asia-southeast2` untuk Jakarta, atau default `us-central1` juga oke).
4. Pilih **Start in test mode** (untuk sementara agar mudah ditest) atau **Production mode**.
5. Klik **Create**.

## 5. Setup Firestore Rules (PENTING)
Agar aplikasi aman tetapi tetap jalan, Anda perlu aturan siapa yang boleh baca/tulis.
1. Di tab **Rules** pada Firestore.
2. Ganti kodenya dengan ini:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function untuk cek admin
    function isAdmin() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }

    // User: User bisa baca/tulis datanya sendiri
    // Admin: Bisa baca/tulis semua user
    match /users/{userId} {
      allow read: if request.auth != null && (request.auth.uid == userId || isAdmin());
      allow write: if request.auth != null && (request.auth.uid == userId || isAdmin()); 
    }

    // Codes: User bisa baca (untuk submit), Admin bisa tulis
    match /codes/{codeId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && isAdmin();
    }

    // Weekly Tokens: User baca, Admin tulis
    match /weeklyTokens/{tokenId} {
       allow read: if request.auth != null;
       allow write: if request.auth != null && isAdmin();
    }
    
    // Attendance History & Point History
    // User bisa baca punya sendiri & create (untuk absen)
    match /attendanceHistory/{docId} {
      allow read: if request.auth != null && (resource.data.userId == request.auth.uid || isAdmin());
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }
    
    match /pointHistory/{docId} {
      allow read: if request.auth != null && (resource.data.userId == request.auth.uid || isAdmin());
      allow create: if request.auth != null; // System/User trigger
    }
  }
}
```

## 6. Buat Akun Admin Pertama
Karena sistem menggunakan flag `isAdmin` di database:
1. Sign up / Register biasa di website Anda (`login.html` -> Buat Akun / Register).
2. Kembali ke Firebase Console -> **Firestore Database**.
3. Buka collection `users`.
4. Cari dokumen dengan ID user Anda (cocokkan emailnya).
5. Edit field `isAdmin`. Ubah value `false` menjadi `true` (boolean).
6. Refresh website dashboard Anda. Tampilan Admin akan muncul.
