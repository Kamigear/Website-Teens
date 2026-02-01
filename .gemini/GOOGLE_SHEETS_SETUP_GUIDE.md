# VDR TEENS - GOOGLE SHEETS BACKUP SYSTEM
## Complete Setup Guide

---

## 📋 OVERVIEW

This system provides automatic and manual backup of your VDR Teens data to Google Sheets:

- **AbsenceData**: Automatically records attendance when users submit weekly tokens
- **UserData**: Manual export of all user information (requires password + 10 confirmations)
- **ServerData**: Manual export of server configuration (requires password + 10 confirmations)

---

## 🚀 SETUP INSTRUCTIONS

### Step 1: Deploy Google Apps Script

1. **Open your Google Spreadsheet**
   - URL: https://docs.google.com/spreadsheets/d/141O3Ure-WZyzFdcUKsvQDQBOSASj7PgDrJ55TFZP5v0/edit

2. **Open Apps Script Editor**
   - Click `Extensions` → `Apps Script`

3. **Paste the Script**
   - Delete any existing code in the editor
   - Open the file: `d:\Website Teens\.gemini\google-apps-script.js`
   - Copy ALL the code
   - Paste it into the Apps Script editor

4. **Save the Project**
   - Click the save icon (💾) or press `Ctrl+S`
   - Name it: "VDR Teens Backup System"

5. **Test the Setup** (Optional but recommended)
   - In the Apps Script editor, select the function `testSetup` from the dropdown
   - Click the Run button (▶️)
   - You may need to authorize the script (click "Review Permissions")
   - Check the "Execution log" to verify all sheets were created

6. **Deploy as Web App**
   - Click `Deploy` → `New deployment`
   - Click the gear icon ⚙️ next to "Select type"
   - Choose `Web app`
   - Fill in the settings:
     - **Description**: "VDR Teens Backup API"
     - **Execute as**: "Me (your-email@gmail.com)"
     - **Who has access**: "Anyone"
   - Click `Deploy`
   - **IMPORTANT**: Copy the Web App URL (it will look like: `https://script.google.com/macros/s/XXXXX/exec`)

### Step 2: Configure Dashboard

1. **Open dashboard.js**
   - File: `d:\Website Teens\public\js\dashboard.js`

2. **Find the GOOGLE_SCRIPT_URL constant**
   - Search for: `const GOOGLE_SCRIPT_URL = 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';`
   - It should be around line 2500

3. **Replace with your Web App URL**
   ```javascript
   const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_ACTUAL_SCRIPT_ID/exec';
   ```

4. **Save the file**

### Step 3: Test the System

1. **Login as Admin**
   - Go to your website dashboard
   - Login with an admin account

2. **Test Manual Export**
   - Click "Export User Data" or "Export Server Data"
   - You'll see a confirmation modal
   - Click the confirmation button 10 times
   - Enter password: `vdrteens`
   - Click "Export Sekarang"
   - Check your Google Spreadsheet to verify data was exported

3. **Test Automatic Attendance**
   - Have a user submit a weekly token code
   - Check the `AbsenceData` sheet in Google Spreadsheet
   - You should see a new row with the attendance record

---

## 📊 SHEET STRUCTURE

### AbsenceData Sheet
**Purpose**: Automatic attendance recording

| Column | Type | Description |
|--------|------|-------------|
| uid | string | User ID (clickable link to UserData) |
| username | string | Username (clickable link to UserData) |
| email | string | User email |
| date | date | Attendance date (YYYY-MM-DD) |
| time | timestamp | Attendance time (HH:MM:SS) |
| points | number | Points earned |
| week | string | Week identifier |

**Features**:
- ✅ Automatically populated when users submit weekly tokens
- ✅ uid and username are clickable links to UserData sheet
- ✅ Records timestamp and points earned

### UserData Sheet
**Purpose**: User identity backup (manual export)

| Column | Type | Description |
|--------|------|-------------|
| uid | string | Unique user ID |
| username | string | Username |
| email | string | Email address |
| points | number | Current points |
| totalAttendance | number | Total attendance count |
| isAdmin | string | "Yes" or "No" |
| createdAt | string | Account creation date |

**Features**:
- ✅ Exports all registered users
- ✅ Requires 10 confirmations + password
- ✅ Overwrites previous data (full backup)

### ServerData Sheet
**Purpose**: Server configuration backup (manual export)

| Column | Type | Description |
|--------|------|-------------|
| key | string | Configuration key |
| value | string/number | Configuration value |
| description | string | What this setting does |
| updatedAt | timestamp | Last export time |

**Features**:
- ✅ Exports attendance configuration
- ✅ Exports system statistics
- ✅ Requires 10 confirmations + password

---

## 🔐 SECURITY FEATURES

### Password Protection
- **Password**: `vdrteens` (hardcoded in Google Apps Script)
- Can be changed in `google-apps-script.js` line 21: `const ADMIN_PASSWORD = 'vdrteens';`

### 10-Click Confirmation
- Prevents accidental exports
- User must click confirmation button 10 times
- Button changes color as progress indicator:
  - Blue (0-4 clicks)
  - Yellow (5-9 clicks)
  - Green (10 clicks - unlocks password field)

### Admin-Only Access
- Only users with `isAdmin: true` can export data
- Non-admin users will see "Akses Ditolak" error

---

## 🔄 DATA FLOW

### Automatic Attendance Recording
```
User submits weekly token
    ↓
Firebase records attendance
    ↓
Real-time listener detects new record
    ↓
Sends to Google Apps Script
    ↓
Appends to AbsenceData sheet
```

### Manual User Export
```
Admin clicks "Export User Data"
    ↓
Confirmation modal opens
    ↓
Admin clicks 10 times + enters password
    ↓
Fetches all users from Firebase
    ↓
Sends to Google Apps Script
    ↓
Overwrites UserData sheet
```

### Manual Server Export
```
Admin clicks "Export Server Data"
    ↓
Confirmation modal opens
    ↓
Admin clicks 10 times + enters password
    ↓
Fetches config from Firebase
    ↓
Sends to Google Apps Script
    ↓
Overwrites ServerData sheet
```

---

## 🛠️ TROUBLESHOOTING

### "Google Apps Script URL belum dikonfigurasi"
**Problem**: GOOGLE_SCRIPT_URL not set in dashboard.js
**Solution**: 
1. Deploy the Google Apps Script as Web App
2. Copy the Web App URL
3. Update `GOOGLE_SCRIPT_URL` in dashboard.js (line ~2500)

### "Password salah"
**Problem**: Wrong password entered
**Solution**: 
- Default password is `vdrteens`
- Check for typos
- If you changed it in the script, use the new password

### Attendance not appearing in AbsenceData
**Problem**: Automatic recording not working
**Solution**:
1. Check if GOOGLE_SCRIPT_URL is configured
2. Check browser console for errors
3. Verify the Apps Script is deployed with "Anyone" access
4. Check Apps Script execution logs for errors

### Export shows success but no data in sheet
**Problem**: Using `no-cors` mode prevents error detection
**Solution**:
1. Open Google Apps Script execution logs
2. Check for errors in the `doPost` function
3. Verify password matches between dashboard and script
4. Check if sheets are created (run `testSetup` function)

### Hyperlinks not working in AbsenceData
**Problem**: UserData sheet doesn't exist or has wrong ID
**Solution**:
1. Run `testSetup` function in Apps Script
2. Verify all three sheets exist
3. Check Apps Script logs for sheet IDs

---

## 📝 CUSTOMIZATION

### Change Password
Edit `google-apps-script.js` line 21:
```javascript
const ADMIN_PASSWORD = 'your-new-password';
```
Then redeploy the Web App.

### Change Confirmation Clicks
Edit `dashboard.html` around line 872:
```html
<p class="small text-muted mb-2">Klik tombol di bawah <strong id="clickCountDisplay">5</strong> kali untuk konfirmasi:</p>
```
And update the JavaScript logic in `dashboard.js` function `handleConfirmClick()`.

### Add More Server Data
Edit `dashboard.js` function `exportServerToSheets()` to add more configuration items to the `serverData` array.

---

## 🎯 USAGE TIPS

1. **Regular Backups**: Export UserData and ServerData monthly for backup
2. **Attendance Monitoring**: Check AbsenceData sheet weekly to monitor attendance
3. **Data Analysis**: Use Google Sheets formulas to analyze attendance patterns
4. **Sharing**: Share the spreadsheet (view-only) with other admins
5. **Version Control**: Make a copy of the spreadsheet before major changes

---

## ✅ VERIFICATION CHECKLIST

- [ ] Google Apps Script deployed as Web App
- [ ] Web App URL copied and pasted into dashboard.js
- [ ] dashboard.js saved and uploaded to server
- [ ] Tested manual export (UserData)
- [ ] Tested manual export (ServerData)
- [ ] Tested automatic attendance recording
- [ ] All three sheets exist in Google Spreadsheet
- [ ] Hyperlinks work in AbsenceData sheet
- [ ] Password protection working
- [ ] 10-click confirmation working

---

## 📞 SUPPORT

If you encounter issues:
1. Check the troubleshooting section above
2. Check Google Apps Script execution logs
3. Check browser console for JavaScript errors
4. Verify all setup steps were completed

---

**System Created**: 2026-02-01
**Password**: vdrteens
**Spreadsheet**: https://docs.google.com/spreadsheets/d/141O3Ure-WZyzFdcUKsvQDQBOSASj7PgDrJ55TFZP5v0/edit
