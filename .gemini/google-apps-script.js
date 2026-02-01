/**
 * VDR TEENS - GOOGLE SHEETS BACKUP SYSTEM
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open your Google Spreadsheet: https://docs.google.com/spreadsheets/d/141O3Ure-WZyzFdcUKsvQDQBOSASj7PgDrJ55TFZP5v0/edit
 * 2. Go to Extensions > Apps Script
 * 3. Delete any existing code and paste THIS ENTIRE FILE
 * 4. Click "Deploy" > "New deployment"
 * 5. Choose type: "Web app"
 * 6. Execute as: "Me"
 * 7. Who has access: "Anyone"
 * 8. Click "Deploy" and copy the Web App URL
 * 9. Paste the URL into dashboard.js (GOOGLE_SCRIPT_URL constant)
 * 
 * SHEET STRUCTURE:
 * - AbsenceData: Automated attendance records (written by submitCode in dashboard.js)
 * - UserData: User identity information (manual export from dashboard)
 * - ServerData: Server configuration (manual export from dashboard)
 */

// ==========================================
// CONFIGURATION
// ==========================================

const SHEET_NAMES = {
    ABSENCE: 'AbsenceData',
    USERS: 'UserData',
    SERVER: 'ServerData'
};

const ADMIN_PASSWORD = 'vdrteens';

// ==========================================
// MAIN HANDLER - Receives POST requests from website
// ==========================================

function doPost(e) {
    try {
        const data = JSON.parse(e.postData.contents);
        const action = data.action;

        Logger.log('Received action: ' + action);

        switch (action) {
            case 'recordAttendance':
                return recordAttendance(data);

            case 'exportUserData':
                return exportUserData(data);

            case 'exportServerData':
                return exportServerData(data);

            default:
                return createResponse(false, 'Unknown action: ' + action);
        }
    } catch (error) {
        Logger.log('Error in doPost: ' + error.toString());
        return createResponse(false, 'Server error: ' + error.toString());
    }
}

// ==========================================
// ATTENDANCE RECORDING (Automatic)
// ==========================================

/**
 * Records attendance to AbsenceData sheet
 * Called automatically when user submits weekly token
 */
function recordAttendance(data) {
    try {
        const sheet = getOrCreateSheet(SHEET_NAMES.ABSENCE);

        // Ensure headers exist
        if (sheet.getLastRow() === 0) {
            sheet.appendRow(['uid', 'username', 'email', 'date', 'time', 'points', 'week']);
            sheet.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#f3f3f3');
        }

        const attendance = data.attendance;
        const now = new Date();

        // Append new row
        sheet.appendRow([
            attendance.uid,
            attendance.username,
            attendance.email || '',
            Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
            Utilities.formatDate(now, Session.getScriptTimeZone(), 'HH:mm:ss'),
            attendance.points || 0,
            attendance.week || ''
        ]);

        // Add hyperlinks to uid and username (link to UserData)
        const lastRow = sheet.getLastRow();
        const userDataSheetId = getSheetId(SHEET_NAMES.USERS);

        if (userDataSheetId) {
            // Create link formula that searches for matching UID in UserData
            const linkFormula = `=HYPERLINK("#gid=${userDataSheetId}&range=A:A", "${attendance.uid}")`;
            sheet.getRange(lastRow, 1).setFormula(linkFormula);

            const usernameLinkFormula = `=HYPERLINK("#gid=${userDataSheetId}&range=A:A", "${attendance.username}")`;
            sheet.getRange(lastRow, 2).setFormula(usernameLinkFormula);
        }

        return createResponse(true, 'Attendance recorded successfully');

    } catch (error) {
        Logger.log('Error recording attendance: ' + error.toString());
        return createResponse(false, 'Failed to record attendance: ' + error.toString());
    }
}

// ==========================================
// USER DATA EXPORT (Manual with Password)
// ==========================================

/**
 * Exports all user data to UserData sheet
 * Requires password confirmation
 */
function exportUserData(data) {
    try {
        // Verify password
        if (data.password !== ADMIN_PASSWORD) {
            return createResponse(false, 'Invalid password');
        }

        const sheet = getOrCreateSheet(SHEET_NAMES.USERS);

        // Clear existing data
        sheet.clear();

        // Set headers
        sheet.appendRow(['uid', 'username', 'email', 'points', 'totalAttendance', 'isAdmin', 'createdAt']);
        sheet.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#4285f4').setFontColor('#ffffff');

        // Add user data
        const users = data.users || [];
        users.forEach(user => {
            sheet.appendRow([
                user.uid,
                user.username || '',
                user.email || '',
                user.points || 0,
                user.totalAttendance || 0,
                user.isAdmin ? 'Yes' : 'No',
                user.createdAt || ''
            ]);
        });

        // Auto-resize columns
        sheet.autoResizeColumns(1, 7);

        // Add timestamp
        const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

        return createResponse(true, `Successfully exported ${users.length} users at ${timestamp}`);

    } catch (error) {
        Logger.log('Error exporting user data: ' + error.toString());
        return createResponse(false, 'Failed to export user data: ' + error.toString());
    }
}

// ==========================================
// SERVER DATA EXPORT (Manual with Password)
// ==========================================

/**
 * Exports server configuration to ServerData sheet
 * Requires password confirmation
 */
function exportServerData(data) {
    try {
        // Verify password
        if (data.password !== ADMIN_PASSWORD) {
            return createResponse(false, 'Invalid password');
        }

        const sheet = getOrCreateSheet(SHEET_NAMES.SERVER);

        // Clear existing data
        sheet.clear();

        // Set headers
        sheet.appendRow(['key', 'value', 'description', 'updatedAt']);
        sheet.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#34a853').setFontColor('#ffffff');

        // Add server data
        const serverData = data.serverData || [];
        const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

        serverData.forEach(item => {
            sheet.appendRow([
                item.key,
                typeof item.value === 'object' ? JSON.stringify(item.value) : item.value,
                item.description || '',
                timestamp
            ]);
        });

        // Auto-resize columns
        sheet.autoResizeColumns(1, 4);

        return createResponse(true, `Successfully exported ${serverData.length} server settings at ${timestamp}`);

    } catch (error) {
        Logger.log('Error exporting server data: ' + error.toString());
        return createResponse(false, 'Failed to export server data: ' + error.toString());
    }
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Gets or creates a sheet by name
 */
function getOrCreateSheet(sheetName) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
        sheet = ss.insertSheet(sheetName);
    }

    return sheet;
}

/**
 * Gets the sheet ID (gid) for creating hyperlinks
 */
function getSheetId(sheetName) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);

    if (!sheet) return null;

    return sheet.getSheetId();
}

/**
 * Creates a standardized JSON response
 */
function createResponse(success, message, data = null) {
    const response = {
        success: success,
        message: message,
        timestamp: new Date().toISOString()
    };

    if (data) {
        response.data = data;
    }

    return ContentService
        .createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Test function - run this to verify the script works
 */
function testSetup() {
    Logger.log('Testing Google Apps Script setup...');

    // Create all sheets
    getOrCreateSheet(SHEET_NAMES.ABSENCE);
    getOrCreateSheet(SHEET_NAMES.USERS);
    getOrCreateSheet(SHEET_NAMES.SERVER);

    Logger.log('All sheets created successfully!');
    Logger.log('Sheet IDs:');
    Logger.log('- AbsenceData: ' + getSheetId(SHEET_NAMES.ABSENCE));
    Logger.log('- UserData: ' + getSheetId(SHEET_NAMES.USERS));
    Logger.log('- ServerData: ' + getSheetId(SHEET_NAMES.SERVER));
}
