# 🔧 TROUBLESHOOTING - Data Tidak Muncul di Spreadsheet

## ❌ **Problem:**
Export mengatakan "Berhasil" tapi data tidak muncul di Google Spreadsheet

---

## 🔍 **Diagnosis Steps:**

### 1. **Cek Google Apps Script Execution Log**

1. Buka Google Spreadsheet
2. Go to `Extensions` → `Apps Script`
3. Klik icon **Executions** (⏱️) di sidebar kiri
4. Lihat log terakhir:
   - ✅ **Status: Completed** = Script berjalan sukses
   - ❌ **Status: Failed** = Ada error

### 2. **Cek Error di Execution Log**

Jika status **Failed**, klik pada execution untuk lihat error detail:

#### **Error: "Exception: You do not have permission to call..."**
**Penyebab**: Script belum di-authorize
**Solusi**:
```
1. Di Apps Script editor, pilih function: testSetup
2. Klik Run (▶️)
3. Klik "Review Permissions"
4. Pilih akun Google Anda
5. Klik "Advanced" → "Go to VDR Teens Backup System (unsafe)"
6. Klik "Allow"
7. Deploy ulang Web App
```

#### **Error: "ReferenceError: doPost is not defined"**
**Penyebab**: Script tidak tersimpan dengan benar
**Solusi**:
```
1. Copy ulang semua code dari: d:\Website Teens\.gemini\google-apps-script.js
2. Paste ke Apps Script editor
3. Save (Ctrl+S)
4. Deploy ulang
```

#### **Error: "Cannot read property 'postData' of undefined"**
**Penyebab**: Request tidak sampai ke script / CORS issue
**Solusi**: Ini normal karena mode `no-cors`, data tetap terkirim

### 3. **Cek Deployment Settings**

1. Di Apps Script, klik `Deploy` → `Manage deployments`
2. Pastikan:
   - **Execute as**: Me (your-email@gmail.com)
   - **Who has access**: **Anyone** ← PENTING!
3. Jika salah, edit deployment dan update

### 4. **Test Manual di Apps Script**

Jalankan test function untuk verify script works:

```javascript
// Di Apps Script editor
function manualTest() {
  const testData = {
    action: 'exportServerData',
    password: 'vdrteens',
    serverData: [
      {key: 'test', value: 'hello', description: 'Test entry'}
    ]
  };
  
  const result = exportServerData(testData);
  Logger.log(result);
}
```

1. Pilih function `manualTest` dari dropdown
2. Klik Run (▶️)
3. Cek Execution log
4. Cek ServerData sheet - harus ada data test

---

## 🛠️ **Common Fixes:**

### **Fix 1: Re-deploy Web App**

```
1. Di Apps Script, klik Deploy → Manage deployments
2. Klik ⚙️ (Edit) pada deployment aktif
3. Ubah "Version" → New version
4. Description: "Fix data export"
5. Klik Deploy
6. COPY WEB APP URL YANG BARU
7. Update di dashboard.js (line ~2500)
```

### **Fix 2: Check CORS Mode**

Mode `no-cors` tidak bisa baca response, tapi data tetap terkirim.
Untuk debug, temporary ganti ke mode normal:

```javascript
// Di dashboard.js, function exportUsersToSheets
const response = await fetch(GOOGLE_SCRIPT_URL, {
    method: 'POST',
    // mode: 'no-cors',  // ← Comment ini
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({...})
});

// Baca response
const result = await response.text();
console.log('Response:', result);
```

**INGAT**: Setelah debug, kembalikan `mode: 'no-cors'`

### **Fix 3: Verify Sheet Names**

Pastikan nama sheet di Google Spreadsheet PERSIS sama dengan di script:
- `AbsenceData` (bukan "absencedata" atau "Absence Data")
- `UserData` (bukan "userdata")
- `ServerData` (bukan "serverdata")

### **Fix 4: Check Browser Console**

1. Buka dashboard
2. Tekan F12 (Developer Tools)
3. Tab "Console"
4. Klik export
5. Lihat error messages:
   - **CORS error**: Normal, abaikan
   - **Network error**: Cek internet connection
   - **Other errors**: Report ke developer

---

## ✅ **Verification Checklist:**

Setelah fix, verify dengan checklist ini:

```
□ Apps Script execution log shows "Completed"
□ No errors in execution log
□ Deployment "Who has access" = Anyone
□ Web App URL di dashboard.js sudah benar
□ Sheet names exact match (case-sensitive)
□ Test function berhasil create data
□ Browser console tidak ada error (selain CORS)
□ Password "vdrteens" benar
□ 10-click confirmation completed
```

---

## 📊 **Expected Behavior:**

### **UserData Export:**
- Sheet di-clear
- Header row: uid, username, email, points, totalAttendance, isAdmin, createdAt
- Data rows: semua users dari Firestore

### **ServerData Export:**
- Sheet di-clear
- Header row: key, value, description, updatedAt
- Data rows:
  - `attendanceConfig.*` (7 rows)
  - `collections.*` (7 rows: attendanceHistory, codes, events, pointHistory, settings, users, weeklyTokens)
  - `system.*` (2 rows: exportDate, exportedBy)
- **Total: ~16 rows**

### **AbsenceData (Automatic):**
- Append new row setiap kali user submit weekly token
- Columns: uid, username, email, date, time, points, week
- uid dan username adalah clickable links ke UserData

---

## 🚨 **Still Not Working?**

### **Last Resort - Full Reset:**

1. **Delete existing deployment:**
   ```
   Deploy → Manage deployments → Archive deployment
   ```

2. **Clear all sheets:**
   ```
   Delete AbsenceData, UserData, ServerData sheets
   ```

3. **Re-paste script:**
   ```
   Copy fresh dari google-apps-script.js
   Paste ke Apps Script
   Save
   ```

4. **Run testSetup:**
   ```
   Select testSetup function
   Click Run
   Authorize if needed
   ```

5. **New deployment:**
   ```
   Deploy → New deployment → Web app
   Execute as: Me
   Who has access: Anyone
   Deploy
   COPY NEW URL
   ```

6. **Update dashboard.js:**
   ```
   Line ~2500: GOOGLE_SCRIPT_URL = 'NEW_URL_HERE'
   Save
   ```

7. **Test again**

---

## 📞 **Debug Info to Collect:**

Jika masih error, collect info ini:

```
1. Screenshot of Apps Script execution log
2. Screenshot of deployment settings
3. Browser console errors (F12 → Console tab)
4. Network tab showing the POST request (F12 → Network tab)
5. Current GOOGLE_SCRIPT_URL value
6. Sheet names in spreadsheet
```

---

**Created**: 2026-02-01
**For**: VDR Teens Google Sheets Backup System
