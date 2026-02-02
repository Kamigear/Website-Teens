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
        // Log the entire request for debugging
        Logger.log('doPost called');
        Logger.log('Request parameter: ' + JSON.stringify(e));

        // Check if e exists
        if (!e) {
            Logger.log('ERROR: e parameter is undefined');
            return createResponse(false, 'No request data received');
        }

        // Check if postData exists
        if (!e.postData) {
            Logger.log('ERROR: e.postData is undefined');
            Logger.log('Available properties: ' + Object.keys(e).join(', '));
            return createResponse(false, 'No POST data received. Make sure request method is POST.');
        }

        // Check if contents exists
        if (!e.postData.contents) {
            Logger.log('ERROR: e.postData.contents is undefined');
            return createResponse(false, 'No content in POST data');
        }

        Logger.log('POST data contents: ' + e.postData.contents);

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
        Logger.log('Error stack: ' + error.stack);
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
/**
 * Exports server collections to separate sheets (Full Backup)
 * Requires password confirmation
 */
function exportServerData(data) {
    try {
        // Verify password
        if (data.password !== ADMIN_PASSWORD) {
            return createResponse(false, 'Invalid password');
        }

        const backupData = data.backupData || {}; // Object containing arrays { events: [], settings: [], ... }
        const collections = Object.keys(backupData);
        let logMessage = 'Backup created for: ';

        // Process each collection
        collections.forEach(collectionName => {
            const sheetName = 'Backup_' + collectionName; // e.g., Backup_events
            const sheet = getOrCreateSheet(sheetName);
            const items = backupData[collectionName];

            // Clear sheet
            sheet.clear();

            if (items && items.length > 0) {
                // Determine headers dynamically from the first item keys
                // We use a Set to get unique keys from all items to be safe, or just first item
                let headers = Object.keys(items[0]);

                // Ensure 'id' is first if exists
                if (headers.includes('id')) {
                    headers = ['id', ...headers.filter(h => h !== 'id')];
                }

                // Write headers
                sheet.appendRow(headers);
                sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#34a853').setFontColor('#ffffff');

                // Prepare rows
                const rows = items.map(item => {
                    return headers.map(header => {
                        let val = item[header];
                        // Stringify objects/arrays
                        if (typeof val === 'object' && val !== null) {
                            return JSON.stringify(val);
                        }
                        return val;
                    });
                });

                // Write data in bulk (much faster)
                if (rows.length > 0) {
                    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
                }

                // Auto resize
                sheet.autoResizeColumns(1, Math.min(headers.length, 10)); // Limit resize to first 10 cols to save time
                logMessage += `${collectionName} (${items.length}), `;
            } else {
                sheet.appendRow(['No data found for this collection']);
                logMessage += `${collectionName} (0), `;
            }
        });

        const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
        return createResponse(true, `Success! ${logMessage} at ${timestamp}`);

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

/**
 * Test doPost with ServerData export
 * Run this to test if export works
 */
function testExportServerData() {
    Logger.log('Testing ServerData export...');

    const mockEvent = {
        postData: {
            contents: JSON.stringify({
                action: 'exportServerData',
                password: 'vdrteens',
                serverData: [
                    {
                        key: 'test.key1',
                        value: 'test value 1',
                        description: 'Test entry 1'
                    },
                    {
                        key: 'test.key2',
                        value: 123,
                        description: 'Test entry 2'
                    },
                    {
                        key: 'test.key3',
                        value: true,
                        description: 'Test entry 3'
                    }
                ]
            })
        }
    };

    const result = doPost(mockEvent);
    Logger.log('Result: ' + result.getContent());

    // Check if data appears in sheet
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.SERVER);
    if (sheet) {
        Logger.log('ServerData sheet has ' + sheet.getLastRow() + ' rows');
        Logger.log('SUCCESS: Check the ServerData sheet!');
    } else {
        Logger.log('ERROR: ServerData sheet not found');
    }
}

/**
 * Test doPost with UserData export
 * Run this to test if user export works
 */
function testExportUserData() {
    Logger.log('Testing UserData export...');

    const mockEvent = {
        postData: {
            contents: JSON.stringify({
                action: 'exportUserData',
                password: 'vdrteens',
                users: [
                    {
                        uid: 'test-uid-1',
                        username: 'testuser1',
                        email: 'test1@example.com',
                        points: 100,
                        totalAttendance: 5,
                        isAdmin: false,
                        createdAt: '2026-01-01T00:00:00Z'
                    },
                    {
                        uid: 'test-uid-2',
                        username: 'testuser2',
                        email: 'test2@example.com',
                        points: 200,
                        totalAttendance: 10,
                        isAdmin: true,
                        createdAt: '2026-01-02T00:00:00Z'
                    }
                ]
            })
        }
    };

    const result = doPost(mockEvent);
    Logger.log('Result: ' + result.getContent());

    // Check if data appears in sheet
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.USERS);
    if (sheet) {
        Logger.log('UserData sheet has ' + sheet.getLastRow() + ' rows');
        Logger.log('SUCCESS: Check the UserData sheet!');
    } else {
        Logger.log('ERROR: UserData sheet not found');
    }
}

/**
 * Test doPost with wrong password
 * Run this to test password validation
 */
function testWrongPassword() {
    Logger.log('Testing wrong password...');

    const mockEvent = {
        postData: {
            contents: JSON.stringify({
                action: 'exportServerData',
                password: 'wrongpassword',
                serverData: []
            })
        }
    };

    const result = doPost(mockEvent);
    const response = JSON.parse(result.getContent());

    Logger.log('Result: ' + result.getContent());

    if (response.success === false && response.message.includes('password')) {
        Logger.log('SUCCESS: Password validation works!');
    } else {
        Logger.log('ERROR: Password validation failed');
    }
}
