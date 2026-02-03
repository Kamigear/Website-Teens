# 📥 IMPORT SYSTEM - VDR Teens Dashboard

## Overview
Sistem import memungkinkan Anda untuk **restore data** dari Google Sheets kembali ke Firestore. Ini berguna untuk:
- Recovery data setelah kehilangan data
- Migrasi data antar environment
- Bulk update data
- Testing dengan data sample

---

## 🎯 Fitur Import

### 1. **Import User Data**
- Restore semua data user dari sheet `UserData`
- Update user yang sudah ada atau create user baru
- Fields yang di-import:
  - `uid` (Document ID)
  - `username`
  - `email`
  - `points`
  - `totalAttendance`
  - `isAdmin`
  - `createdAt`

### 2. **Import Server Data**
- Restore data dari sheet `ServerData`
- Support multiple collections:
  - `attendanceHistory`
  - `events`
  - `pointHistory`
  - `settings`
  - `weeklyTokens`
- Preserve document IDs dan field structure

---

## 📋 Cara Menggunakan

### **Import User Data:**

1. **Pastikan Data Sudah Di-Export**
   - Buka dashboard sebagai admin
   - Klik "Export User Data" untuk backup data terbaru
   - Cek sheet `UserData` di Google Sheets

2. **Edit Data di Google Sheets (Opsional)**
   - Buka Google Sheets
   - Edit data di sheet `UserData`
   - Format harus tetap sama (jangan ubah header)

3. **Import ke Firestore**
   - Klik tombol **"Import Users"**
   - Modal konfirmasi akan muncul
   - **Klik tombol konfirmasi 10 kali**
   - Masukkan password admin: `vdrteens`
   - Klik **"Import Sekarang"**

4. **Verifikasi**
   - Cek Firebase Console → Firestore
   - Lihat collection `users`
   - Data harus sudah terupdate

---

### **Import Server Data:**

1. **Pastikan Data Sudah Di-Export**
   - Klik "Export Server Data"
   - Cek sheet `ServerData` di Google Sheets
   - Harus ada tabel horizontal untuk setiap collection

2. **Edit Data di Google Sheets (Opsional)**
   - Edit data di sheet `ServerData`
   - **PENTING**: Jangan ubah:
     - Section headers (=== collectionName ===)
     - Column headers (Document ID, field names)
     - Table structure (horizontal layout)

3. **Import ke Firestore**
   - Klik tombol **"Import Settings"**
   - Modal konfirmasi akan muncul
   - **Klik tombol konfirmasi 10 kali**
   - Masukkan password admin: `vdrteens`
   - Klik **"Import Sekarang"**

4. **Verifikasi**
   - Cek Firebase Console → Firestore
   - Lihat collections yang di-import
   - Data harus sudah terupdate

---

## ⚠️ Penting - Hal yang Perlu Diperhatikan

### **1. Merge Mode**
Import menggunakan `merge: true`, artinya:
- ✅ Data yang sudah ada akan **diupdate**
- ✅ Data baru akan **ditambahkan**
- ✅ Field yang tidak ada di import **tidak akan dihapus**

### **2. Document ID**
- User Data: Document ID = `uid` (kolom pertama)
- Server Data: Document ID = `Document ID` (kolom pertama setiap tabel)
- **Jangan ubah Document ID** jika ingin update data yang sama

### **3. Data Types**
- Numbers akan otomatis dikonversi
- Timestamps dalam format JSON akan di-parse
- Objects/Arrays dalam format JSON string akan di-parse

### **4. Validation**
- Password harus benar (`vdrteens`)
- Sheet harus ada di Google Sheets
- Format data harus sesuai

---

## 🔧 Troubleshooting

### **Error: "UserData sheet not found"**
**Solusi:**
- Export User Data terlebih dahulu
- Pastikan sheet bernama `UserData` (case-sensitive)

### **Error: "No data in UserData sheet"**
**Solusi:**
- Pastikan ada data di sheet (minimal 1 row selain header)
- Cek row 2 dan seterusnya tidak kosong

### **Error: "Invalid password"**
**Solusi:**
- Gunakan password: `vdrteens`
- Pastikan tidak ada spasi di awal/akhir

### **Error: "Failed to fetch data from Google Sheets"**
**Solusi:**
1. Cek Google Apps Script sudah deployed
2. Pastikan deployment access = "Anyone"
3. Update URL di `dashboard.js` jika perlu
4. Cek Apps Script Executions untuk error detail

### **Data Tidak Muncul di Firestore**
**Solusi:**
1. Cek browser console (F12) untuk error
2. Pastikan Firestore rules allow write untuk admin
3. Cek Firebase Console → Firestore → Rules
4. Tunggu beberapa detik, refresh Firebase Console

---

## 🎨 UI Components

### **Import Cards**
- **Icon**: Cloud download (bi-cloud-download-fill)
- **Color**: Outline primary (blue)
- **Location**: Admin section, setelah Export cards

### **Import Modal**
- **Header**: Info background (light blue)
- **Confirmation**: 10-click mechanism
- **Password**: Protected dengan toggle visibility
- **Button**: Info color dengan spinner saat loading

---

## 🔐 Security

### **Password Protection**
- Sama dengan export: `vdrteens`
- Verified di Google Apps Script
- Tidak disimpan di client

### **10-Click Confirmation**
- Mencegah import tidak sengaja
- Harus klik 10x sebelum bisa input password
- Reset otomatis saat modal ditutup

### **Firestore Rules**
Pastikan rules allow write untuk admin:
```javascript
match /users/{userId} {
  allow write: if request.auth != null && 
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
}
```

---

## 📊 Flow Diagram

```
User clicks "Import Users"
    ↓
Modal opens
    ↓
Click confirmation 10x
    ↓
Password input enabled
    ↓
Enter password
    ↓
Click "Import Sekarang"
    ↓
Fetch data from Google Sheets
    ↓
Parse data
    ↓
Write to Firestore (batch/loop)
    ↓
Show success toast
    ↓
Close modal
```

---

## 📝 Example Data Format

### **UserData Sheet:**
```
| uid                  | username | email           | points | totalAttendance | isAdmin | createdAt           |
|----------------------|----------|-----------------|--------|-----------------|---------|---------------------|
| abc123               | john     | john@email.com  | 100    | 5               | No      | 2026-01-01T00:00:00Z|
| def456               | admin    | admin@email.com | 200    | 10              | Yes     | 2026-01-01T00:00:00Z|
```

### **ServerData Sheet (Horizontal):**
```
Row 1: [=== events (2 docs) ===]                    [=== settings (1 doc) ===]
Row 2: [Document ID] [title] [date] [description]   [Document ID] [slot1Time] [slot1Points]
Row 3: [event1]      [Test]  [2026] [Lorem...]       [config]      [09:05]     [3]
Row 4: [event2]      [Test2] [2026] [Lorem...]
```

---

## 🚀 Next Steps

1. **Deploy Google Apps Script** dengan kode terbaru
2. **Test Import** dengan data sample
3. **Backup Data** sebelum import production data
4. **Monitor Firestore** saat import berjalan

---

## 📞 Support

Jika ada masalah:
1. Cek browser console (F12)
2. Cek Apps Script Executions
3. Lihat TROUBLESHOOTING.md
4. Contact developer

---

**Last Updated**: 2026-02-03
**Version**: 1.0.0
