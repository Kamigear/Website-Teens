# 📊 SYSTEM OVERVIEW - Import/Export Architecture

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        VDR TEENS DASHBOARD                          │
│                         (Admin Interface)                           │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
        ┌───────────────────┐       ┌───────────────────┐
        │   EXPORT SYSTEM   │       │   IMPORT SYSTEM   │
        │                   │       │                   │
        │ • User Data       │       │ • User Data       │
        │ • Server Data     │       │ • Server Data     │
        │ • Attendance      │       │                   │
        └───────────────────┘       └───────────────────┘
                    │                           │
                    ▼                           ▼
        ┌───────────────────────────────────────────────┐
        │        GOOGLE APPS SCRIPT (Backend)           │
        │                                               │
        │  • doGet()  - Health check                    │
        │  • doPost() - Request handler                 │
        │                                               │
        │  Export Functions:                            │
        │  • exportUserData()                           │
        │  • exportServerData()                         │
        │  • recordAttendance()                         │
        │                                               │
        │  Import Functions:                            │
        │  • importUserData()                           │
        │  • importServerData()                         │
        └───────────────────────────────────────────────┘
                    │                           │
        ┌───────────┴───────────┐   ┌───────────┴───────────┐
        │                       │   │                       │
        ▼                       ▼   ▼                       ▼
┌──────────────┐       ┌──────────────────┐       ┌──────────────┐
│ GOOGLE       │       │ FIRESTORE        │       │ GOOGLE       │
│ SHEETS       │◄──────┤ DATABASE         │──────►│ SHEETS       │
│              │ Write │                  │ Read  │              │
│ • UserData   │       │ • users/         │       │ • UserData   │
│ • ServerData │       │ • events/        │       │ • ServerData │
│ • AbsenceData│       │ • settings/      │       │              │
└──────────────┘       │ • pointHistory/  │       └──────────────┘
                       │ • weeklyTokens/  │
                       │ • attendance...  │
                       └──────────────────┘
```

---

## 🔄 Data Flow

### **Export Flow:**
```
User Action (Dashboard)
    ↓
Password Confirmation (10 clicks + password)
    ↓
Fetch Data from Firestore
    ↓
Format Data (JSON → Table)
    ↓
POST to Google Apps Script
    ↓
Apps Script Processes
    ↓
Write to Google Sheets (Bulk)
    ↓
Success Response
    ↓
Toast Notification
```

### **Import Flow:**
```
User Action (Dashboard)
    ↓
Password Confirmation (10 clicks + password)
    ↓
POST to Google Apps Script
    ↓
Apps Script Reads Sheets
    ↓
Parse Data (Table → JSON)
    ↓
Return Data to Dashboard
    ↓
Write to Firestore (Batch)
    ↓
Success Response
    ↓
Toast Notification
```

---

## 📁 File Structure

```
d:\Website Teens\
│
├── public\
│   ├── dashboard.html              ← UI: Import/Export cards & modals
│   └── js\
│       └── dashboard.js            ← Logic: Import/Export functions
│
└── .gemini\
    ├── google-apps-script.js       ← Backend: Google Apps Script
    ├── QUICKSTART.md               ← Quick guide
    ├── IMPORT_GUIDE.md             ← Import tutorial
    ├── IMPLEMENTATION.md           ← Technical details
    └── OVERVIEW.md                 ← This file
```

---

## 🎨 UI Components

### **Dashboard Cards (Admin Section):**
```
┌─────────────────────────────────────────────────────────┐
│  EXPORT SECTION                                         │
├─────────────────────────────────────────────────────────┤
│  [👥 Export User Data]    [🖥️ Export Server Data]      │
│   • Backup users           • Backup settings            │
│   • To Google Sheets       • 5 collections              │
│   • Password protected     • Horizontal layout          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  IMPORT SECTION                                         │
├─────────────────────────────────────────────────────────┤
│  [☁️ Import Users]        [💾 Import Settings]          │
│   • Restore from Sheets    • Restore collections        │
│   • Merge mode             • Preserve IDs               │
│   • Password protected     • JSON parsing               │
└─────────────────────────────────────────────────────────┘
```

### **Modal Flow:**
```
┌─────────────────────────────────────┐
│  Konfirmasi Export/Import           │
├─────────────────────────────────────┤
│  ⚠️  Perhatian!                     │
│  Anda akan export/import data       │
│                                     │
│  [Klik Saya (0/10)]  ← 10x click   │
│                                     │
│  Password: [_________] 👁️  ← After │
│                            10 clicks│
│                                     │
│  [Batal]  [Export/Import Sekarang] │
└─────────────────────────────────────┘
```

---

## 🗄️ Data Schema

### **UserData Sheet:**
```
┌──────────┬──────────┬──────────┬────────┬─────────────────┬─────────┬────────────┐
│   uid    │ username │  email   │ points │ totalAttendance │ isAdmin │ createdAt  │
├──────────┼──────────┼──────────┼────────┼─────────────────┼─────────┼────────────┤
│ abc123   │ john     │ j@e.com  │  100   │       5         │   No    │ 2026-01-01 │
│ def456   │ admin    │ a@e.com  │  200   │      10         │   Yes   │ 2026-01-01 │
└──────────┴──────────┴──────────┴────────┴─────────────────┴─────────┴────────────┘
```

### **ServerData Sheet (Horizontal):**
```
Row 1: [=== events (2 docs) ===]              [=== settings (1 doc) ===]
       ↓ Table 1                               ↓ Table 2
Row 2: [Document ID] [title] [date]...         [Document ID] [slot1Time]...
Row 3: [event1]      [Test]  [2026]...         [config]      [09:05]...
Row 4: [event2]      [Test2] [2026]...
       
       Columns A-E                             Columns G-K
```

---

## 🔐 Security Layers

```
┌─────────────────────────────────────────────┐
│  Layer 1: UI Visibility                     │
│  • Only admin sees import/export cards      │
│  • Checked: isAdmin variable                │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Layer 2: 10-Click Confirmation             │
│  • Prevents accidental clicks               │
│  • Must click 10x to enable password        │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Layer 3: Password Protection               │
│  • Password: vdrteens                       │
│  • Verified in Google Apps Script           │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Layer 4: Firestore Rules                   │
│  • Admin-only write access                  │
│  • Enforced at database level               │
└─────────────────────────────────────────────┘
```

---

## ⚡ Performance Optimization

### **Export Optimization:**
- ✅ Bulk write using `setValues()` (not `setValue()`)
- ✅ Single batch per collection
- ✅ Auto-resize limited to 50 columns
- ✅ No formatting (plain text only)

### **Import Optimization:**
- ✅ Batch write for users (500 docs max)
- ✅ Single read from sheets
- ✅ JSON parsing only when needed
- ✅ Merge mode (no full overwrite)

### **Network Optimization:**
- ✅ Export: no-cors mode (fire and forget)
- ✅ Import: CORS mode (read response)
- ✅ Compressed JSON payload
- ✅ Single request per action

---

## 📊 Supported Collections

### **Export:**
```
✅ users              → UserData sheet
✅ attendanceHistory  → ServerData sheet (table 1)
✅ events             → ServerData sheet (table 2)
✅ pointHistory       → ServerData sheet (table 3)
✅ settings           → ServerData sheet (table 4)
✅ weeklyTokens       → ServerData sheet (table 5)
```

### **Import:**
```
✅ UserData sheet     → users collection
✅ ServerData sheet   → 5 collections (auto-detect)
```

---

## 🎯 Use Cases

### **1. Regular Backup:**
```
Schedule: Every Monday
Action: Export User Data + Export Server Data
Result: Weekly backup in Google Sheets
```

### **2. Data Recovery:**
```
Scenario: Accidental deletion
Action: Import Users + Import Settings
Result: Data restored from last backup
```

### **3. Bulk Edit:**
```
Scenario: Update 100 user points
Action: Export → Edit in Sheets → Import
Result: All users updated in one go
```

### **4. Migration:**
```
Scenario: Move to new Firebase project
Action: Export from old → Import to new
Result: All data migrated
```

### **5. Testing:**
```
Scenario: Test with sample data
Action: Export → Duplicate → Edit → Import
Result: Test data in Firestore
```

---

## 🔄 Sync Strategy

### **One-Way Sync:**
```
Export: Firestore → Google Sheets (manual)
Import: Google Sheets → Firestore (manual)

NOT real-time sync!
Manual trigger required
```

### **Merge Behavior:**
```
Import uses merge: true

Existing doc:     {name: "John", points: 100}
Import data:      {points: 200, level: 5}
Result:           {name: "John", points: 200, level: 5}
                  ↑ preserved    ↑ updated   ↑ added
```

---

## 📈 Scalability

### **Current Limits:**
```
Users:              ~1000 docs (batch limit: 500)
Server Data:        ~5000 docs total
Sheet Size:         ~10MB per sheet
Request Timeout:    30 seconds (Apps Script)
```

### **If Exceeding Limits:**
```
Solution 1: Split by collection
  • Export/Import one collection at a time
  
Solution 2: Pagination
  • Export in chunks (e.g., 500 users per batch)
  
Solution 3: Compression
  • Zip data before transfer (future feature)
```

---

## 🛠️ Maintenance

### **Regular Tasks:**
```
Weekly:
  • Test export functionality
  • Verify backup in Google Sheets
  
Monthly:
  • Test import functionality
  • Clean old backup sheets
  
Quarterly:
  • Review Firestore rules
  • Update documentation
```

### **Monitoring:**
```
Check:
  • Apps Script Executions (errors?)
  • Browser Console (client errors?)
  • Firestore Usage (quota?)
  • Sheet Size (too large?)
```

---

## 🎓 Learning Resources

### **For Developers:**
```
1. Read: IMPLEMENTATION.md
2. Study: google-apps-script.js
3. Understand: Data flow diagrams
4. Practice: Test import/export
```

### **For Admins:**
```
1. Read: QUICKSTART.md
2. Practice: Export/Import test data
3. Understand: Merge behavior
4. Memorize: Password & procedures
```

---

## 🚀 Future Enhancements

### **Planned Features:**
```
□ Scheduled auto-backup (weekly)
□ Email notification on export/import
□ Data validation before import
□ Rollback functionality
□ Export to CSV/Excel
□ Import from CSV/Excel
□ Differential backup (only changes)
□ Compression for large datasets
```

---

## 📞 Support

### **Documentation:**
- `QUICKSTART.md` - Quick guide
- `IMPORT_GUIDE.md` - Import tutorial
- `IMPLEMENTATION.md` - Technical details
- `OVERVIEW.md` - This file

### **Debugging:**
- Browser Console (F12)
- Apps Script Executions
- Firebase Console

### **Contact:**
- Developer: [Your contact]
- Email: [Your email]

---

**System Status**: ✅ Production Ready
**Last Updated**: 2026-02-03
**Version**: 1.0.0
**Total Files**: 7 (3 code + 4 docs)
