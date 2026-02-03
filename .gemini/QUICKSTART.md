# 🚀 QUICK START GUIDE - Import/Export System

## ⚡ Deployment (5 Menit)

### 1️⃣ Update Google Apps Script
```
1. Buka: https://docs.google.com/spreadsheets/d/141O3Ure-WZyzFdcUKsvQDQBOSASj7PgDrJ55TFZP5v0/edit
2. Extensions → Apps Script
3. DELETE all code
4. Copy dari: d:\Website Teens\.gemini\google-apps-script.js
5. Paste & Save (Ctrl+S)
6. Deploy → Manage deployments → Edit → New version → Deploy
7. Done! ✅
```

### 2️⃣ Test Export
```
1. Login admin di dashboard
2. Klik "Export User Data"
3. Klik tombol 10x
4. Password: vdrteens
5. Klik "Export Sekarang"
6. Cek Google Sheets → tab UserData ✅
```

### 3️⃣ Test Import
```
1. Edit 1 user di Google Sheets (ubah points)
2. Klik "Import Users" di dashboard
3. Klik tombol 10x
4. Password: vdrteens
5. Klik "Import Sekarang"
6. Cek Firebase Console → users collection ✅
```

---

## 📋 Cheat Sheet

### **Export Commands:**
| Action | Button | Password | Result |
|--------|--------|----------|--------|
| Backup Users | Export User Data | vdrteens | Sheet: UserData |
| Backup Server | Export Server Data | vdrteens | Sheet: ServerData |

### **Import Commands:**
| Action | Button | Password | Result |
|--------|--------|----------|--------|
| Restore Users | Import Users | vdrteens | Firestore: users |
| Restore Server | Import Settings | vdrteens | Firestore: 5 collections |

### **Data Locations:**
```
Google Sheets:
  ├── UserData (vertical table)
  └── ServerData (horizontal tables)

Firestore:
  ├── users/
  ├── attendanceHistory/
  ├── events/
  ├── pointHistory/
  ├── settings/
  └── weeklyTokens/
```

---

## 🔧 Common Tasks

### **Backup Everything:**
```
1. Export User Data
2. Export Server Data
3. Done! Data aman di Google Sheets
```

### **Restore from Backup:**
```
1. Import Users
2. Import Settings
3. Done! Data kembali ke Firestore
```

### **Edit User Points:**
```
1. Export User Data
2. Edit points di Google Sheets
3. Import Users
4. Done! Points terupdate
```

### **Add New Event:**
```
1. Export Server Data
2. Add row baru di tabel events
3. Import Settings
4. Done! Event baru muncul
```

---

## ⚠️ Quick Warnings

### **❌ JANGAN:**
- Ubah Document ID (kolom pertama)
- Ubah nama sheet (UserData/ServerData)
- Ubah header columns
- Ubah structure tabel (ServerData)

### **✅ BOLEH:**
- Edit data di cells
- Tambah row baru
- Hapus row (kecuali header)
- Copy-paste data

---

## 🐛 Quick Troubleshooting

### **Export gagal?**
```
1. F12 → Console → lihat error
2. Apps Script → Executions → lihat log
3. Redeploy Apps Script
```

### **Import gagal?**
```
1. Cek password: vdrteens
2. Cek sheet ada: UserData/ServerData
3. Cek format data benar
```

### **Data tidak muncul?**
```
1. Tunggu 5 detik
2. Refresh page
3. Cek Firebase Console
```

---

## 📞 Emergency

### **Data hilang?**
```
1. JANGAN PANIC
2. Cek Google Sheets (backup otomatis)
3. Import Users + Import Settings
4. Data kembali ✅
```

### **Error terus?**
```
1. Screenshot error
2. Cek console log
3. Cek Apps Script log
4. Contact developer
```

---

## 🎯 Pro Tips

### **Tip 1: Regular Backup**
```
Export setiap minggu:
- Setiap Senin pagi
- Sebelum update besar
- Sebelum import data
```

### **Tip 2: Test Import**
```
Sebelum import production:
1. Export dulu (backup)
2. Import test data
3. Verify di Firestore
4. Baru import production
```

### **Tip 3: Bulk Edit**
```
Edit banyak user sekaligus:
1. Export User Data
2. Edit di Google Sheets (Excel-like)
3. Import Users
4. Semua terupdate sekaligus!
```

### **Tip 4: Version Control**
```
Sebelum import:
1. Duplicate sheet (File → Make a copy)
2. Rename: "UserData_backup_2026-02-03"
3. Import dari sheet asli
4. Jika error, restore dari backup
```

---

## 📊 Status Indicators

### **Export Success:**
```
✅ Toast: "Backup sedang diproses!"
✅ Google Sheets: Data muncul
✅ Apps Script: Log "Export completed"
```

### **Import Success:**
```
✅ Toast: "Berhasil mengimport X user/dokumen"
✅ Firestore: Data terupdate
✅ Dashboard: Data refresh otomatis
```

### **Error Indicators:**
```
❌ Toast: "Error: ..."
❌ Console: Red error messages
❌ Apps Script: Error in executions
```

---

## 🔑 Password

**Current Password:** `vdrteens`

**To Change:**
1. Edit `google-apps-script.js` line 31
2. Change `ADMIN_PASSWORD = 'vdrteens'`
3. Save & Redeploy
4. Update password di dashboard

---

## 📚 Full Documentation

Untuk detail lengkap, baca:
- `IMPORT_GUIDE.md` - Import tutorial lengkap
- `IMPLEMENTATION.md` - Technical details & checklist

---

## ✅ Quick Checklist

Sebelum deploy:
- [ ] Apps Script updated & deployed
- [ ] Test export user data
- [ ] Test export server data
- [ ] Test import user data
- [ ] Test import server data
- [ ] Backup created

---

**Ready to use!** 🎉

Jika ada pertanyaan, lihat dokumentasi lengkap atau contact developer.

---

**Last Updated**: 2026-02-03
**Version**: 1.0.0
