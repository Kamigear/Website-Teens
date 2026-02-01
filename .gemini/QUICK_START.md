# 🚀 QUICK START - Google Sheets Backup

## What You Need to Do:

### 1️⃣ Deploy Google Apps Script (5 minutes)

```
1. Open: https://docs.google.com/spreadsheets/d/141O3Ure-WZyzFdcUKsvQDQBOSASj7PgDrJ55TFZP5v0/edit
2. Extensions → Apps Script
3. Copy code from: d:\Website Teens\.gemini\google-apps-script.js
4. Paste into Apps Script editor
5. Save (Ctrl+S)
6. Deploy → New deployment → Web app
   - Execute as: Me
   - Who has access: Anyone
7. Click Deploy
8. COPY THE WEB APP URL!
```

### 2️⃣ Update Dashboard (1 minute)

```
1. Open: d:\Website Teens\public\js\dashboard.js
2. Find line ~2500: const GOOGLE_SCRIPT_URL = 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';
3. Replace with your URL from step 1
4. Save
```

### 3️⃣ Test It! (2 minutes)

```
1. Login as admin
2. Click "Export User Data" button
3. Click confirmation button 10 times
4. Enter password: vdrteens
5. Click "Export Sekarang"
6. Check your Google Spreadsheet!
```

---

## 📊 What Gets Exported:

| Sheet | When | What |
|-------|------|------|
| **AbsenceData** | Automatic | Every time a user submits weekly token |
| **UserData** | Manual | All user accounts (uid, username, email, points) |
| **ServerData** | Manual | Server configuration (attendance rules, stats) |

---

## 🔐 Security:

- **Password**: `vdrteens`
- **10-Click Confirmation**: Prevents accidents
- **Admin Only**: Only admins can export

---

## ❓ Common Issues:

**"URL belum dikonfigurasi"**
→ You forgot step 2 (update GOOGLE_SCRIPT_URL)

**"Password salah"**
→ Password is `vdrteens` (all lowercase)

**No data in sheet**
→ Check Google Apps Script execution logs

---

## 📁 Files Created:

✅ `d:\Website Teens\.gemini\google-apps-script.js` - Script to paste in Google Sheets
✅ `d:\Website Teens\.gemini\GOOGLE_SHEETS_SETUP_GUIDE.md` - Full documentation
✅ `d:\Website Teens\public\dashboard.html` - Updated with export cards
✅ `d:\Website Teens\public\js\dashboard.js` - Updated with export functions

---

## 🎯 Next Steps:

1. Deploy the Google Apps Script (see step 1 above)
2. Get the Web App URL
3. Tell me the URL so I can update dashboard.js for you!

Or you can update it manually following step 2 above.

---

**Need help?** Read the full guide: `d:\Website Teens\.gemini\GOOGLE_SHEETS_SETUP_GUIDE.md`
