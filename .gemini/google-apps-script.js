/**
 * VDR TEENS - GOOGLE SHEETS BACKUP SYSTEM (PLAIN TEXT ONLY)
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open your Google Spreadsheet
 * 2. Go to Extensions > Apps Script
 * 3. Delete ANY existing code and paste THIS ENTIRE FILE
 * 4. Click "Save"
 * 5. Click "Deploy" > "New deployment"
 * 6. Choose type: "Web app", Execute as: "Me", Access: "Anyone"
 * 7. Copy the NEW Web App URL and paste it into dashboard.js
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
// MAIN HANDLER
// ==========================================

function doGet(e) {
    return HtmlService.createHtmlOutput('<h1>VDR Teens Backup System</h1><p>Status: Active</p>');
}

function doPost(e) {
    try {
        if (!e || !e.postData || !e.postData.contents) return createResponse(false, 'No payload');
        const data = JSON.parse(e.postData.contents);
        const action = data.action;

        switch (action) {
            case 'recordAttendance': return recordAttendance(data);
            case 'exportUserData': return exportUserData(data);
            case 'exportServerData': return exportServerData(data);
            case 'importUserData': return importUserData(data);
            case 'importServerData': return importServerData(data);
            default: return createResponse(false, 'Unknown action');
        }
    } catch (error) {
        return createResponse(false, 'Server error: ' + error.toString());
    }
}

// ==========================================
// SERVER DATA EXPORT (PLAIN TEXT - NO COLOR)
// ==========================================

function exportServerData(data) {
    try {
        if (data.password !== ADMIN_PASSWORD) return createResponse(false, 'Invalid password');

        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = getOrCreateSheet(SHEET_NAMES.SERVER);
        const rawData = data.rawData || {};
        const collections = Object.keys(rawData);

        sheet.clear();

        let currentCol = 1;
        let totalDocs = 0;

        collections.forEach(function (collectionName) {
            const collectionData = rawData[collectionName];
            const docIds = Object.keys(collectionData);

            if (docIds.length === 0) {
                // Just text title for empty collection
                sheet.getRange(1, currentCol).setValue('--- ' + collectionName + ' (Empty) ---');
                currentCol += 2;
                return;
            }

            // Get unique field Names
            const fieldKeysSet = new Set();
            docIds.forEach(function (id) {
                const fields = collectionData[id].fields || {};
                Object.keys(fields).forEach(function (key) { fieldKeysSet.add(key); });
            });
            const fieldNames = Array.from(fieldKeysSet);
            const headers = ['Document ID'].concat(fieldNames);

            const tableValues = [];
            tableValues.push(headers); // Column Headers as Row 2

            docIds.forEach(function (id) {
                const docFields = collectionData[id].fields || {};
                const row = [id];
                fieldNames.forEach(function (fName) {
                    let val = docFields[fName];
                    if (val === null || val === undefined) {
                        val = '';
                    } else if (typeof val === 'object') {
                        val = JSON.stringify(val);
                    } else {
                        val = String(val);
                    }
                    row.push(val);
                });
                tableValues.push(row);
                totalDocs++;
            });

            // Write Section Name Header (Row 1) - Plain Text
            sheet.getRange(1, currentCol).setValue('=== ' + collectionName + ' (' + docIds.length + ' docs) ===');

            // Bulk Write Table (Row 2 onwards) - Plain Text
            sheet.getRange(2, currentCol, tableValues.length, headers.length).setValues(tableValues);

            currentCol += headers.length + 1;
        });

        // Optional: Auto resize only for readability, NO styling/colors
        if (currentCol > 1) {
            sheet.autoResizeColumns(1, Math.min(sheet.getLastColumn(), 50));
        }

        return createResponse(true, 'Success! Backed up ' + totalDocs + ' documents.');
    } catch (error) {
        return createResponse(false, 'Failed: ' + error.toString());
    }
}

// ==========================================
// USER EXPORT (PLAIN TEXT - NO COLOR)
// ==========================================

function exportUserData(data) {
    try {
        if (data.password !== ADMIN_PASSWORD) return createResponse(false, 'Invalid password');
        const sheet = getOrCreateSheet(SHEET_NAMES.USERS);
        sheet.clear();

        const users = data.users || [];
        if (users.length === 0) return createResponse(true, 'No users');

        const headers = ['uid', 'username', 'email', 'points', 'totalAttendance', 'isAdmin', 'createdAt'];
        const values = [headers];

        users.forEach(function (u) {
            values.push([
                u.uid || '', u.username || '', u.email || '',
                u.points || 0, u.totalAttendance || 0,
                u.isAdmin ? 'Yes' : 'No', u.createdAt || ''
            ]);
        });

        sheet.getRange(1, 1, values.length, headers.length).setValues(values);
        sheet.autoResizeColumns(1, headers.length);

        return createResponse(true, 'Exported ' + users.length + ' users');
    } catch (e) {
        return createResponse(false, e.toString());
    }
}

// ==========================================
// IMPORT DATA FROM SHEETS
// ==========================================

/**
 * Import User Data from UserData sheet
 * Reads the sheet and returns data to website for Firestore import
 */
function importUserData(data) {
    try {
        if (data.password !== ADMIN_PASSWORD) return createResponse(false, 'Invalid password');

        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.USERS);
        if (!sheet) return createResponse(false, 'UserData sheet not found');

        const lastRow = sheet.getLastRow();
        if (lastRow < 2) return createResponse(false, 'No data in UserData sheet');

        // Get all data (skip header row)
        const values = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
        const users = [];

        values.forEach(function (row) {
            if (row[0]) { // Check if uid exists
                users.push({
                    uid: String(row[0]),
                    username: String(row[1] || ''),
                    email: String(row[2] || ''),
                    points: Number(row[3]) || 0,
                    totalAttendance: Number(row[4]) || 0,
                    isAdmin: String(row[5]).toLowerCase() === 'yes',
                    createdAt: String(row[6] || '')
                });
            }
        });

        return createResponse(true, 'Found ' + users.length + ' users', { users: users });
    } catch (e) {
        return createResponse(false, 'Import error: ' + e.toString());
    }
}

/**
 * Import Server Data from ServerData sheet
 * Reads horizontal tables and returns data in Firestore format
 */
function importServerData(data) {
    try {
        if (data.password !== ADMIN_PASSWORD) return createResponse(false, 'Invalid password');

        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.SERVER);
        if (!sheet) return createResponse(false, 'ServerData sheet not found');

        const lastRow = sheet.getLastRow();
        const lastCol = sheet.getLastColumn();
        if (lastRow < 2 || lastCol < 1) return createResponse(false, 'No data in ServerData sheet');

        // Read all data at once
        const allValues = sheet.getRange(1, 1, lastRow, lastCol).getValues();
        const rawData = {};

        console.log('Starting importScan: Rows=' + lastRow + ', Cols=' + lastCol);

        // Parse horizontal tables
        let currentCol = 0;
        while (currentCol < lastCol) {
            const sectionHeader = String(allValues[0][currentCol] || '');

            if (!sectionHeader || !sectionHeader.startsWith('===')) {
                currentCol++;
                continue;
            }

            console.log('Found potential header at col ' + currentCol + ': ' + sectionHeader);

            // Extract collection name from header like "=== events (4 docs) ==="
            // Looser regex to assume anything between "=== " and " (" is the name
            const match = sectionHeader.match(/===\s*(.+?)\s*\(/);
            if (!match) {
                console.log('Regex failed for header: ' + sectionHeader);
                currentCol++;
                continue;
            }

            const collectionName = match[1].trim();
            console.log('Processing collection: ' + collectionName);

            const columnHeaders = [];
            let colCount = 0;

            // Read column headers (row 2)
            for (let c = currentCol; c < lastCol; c++) {
                const header = allValues[1][c];
                if (!header) break;
                columnHeaders.push(String(header));
                colCount++;
            }

            if (columnHeaders.length === 0) {
                currentCol++;
                continue;
            }

            // Read data rows (row 3 onwards)
            rawData[collectionName] = {};
            for (let r = 2; r < lastRow; r++) {
                // Determine docId. If the header says "Document ID", use that column.
                // Otherwise use the first column of the section.
                const docId = allValues[r][currentCol];
                if (!docId) continue;

                const fields = {};
                for (let c = 1; c < columnHeaders.length; c++) {
                    const fieldName = columnHeaders[c];
                    let value = allValues[r][currentCol + c];

                    // Try to parse JSON strings back to objects
                    if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
                        try {
                            value = JSON.parse(value);
                        } catch (e) {
                            // Keep as string if not valid JSON
                        }
                    }

                    fields[fieldName] = value;
                }

                rawData[collectionName][String(docId)] = {
                    fields: fields,
                    subcollections: {}
                };
            }

            currentCol += colCount + 1; // Move to next table
        }

        const totalDocs = Object.values(rawData).reduce(function (sum, coll) {
            return sum + Object.keys(coll).length;
        }, 0);

        console.log('Total identified docs: ' + totalDocs);

        return createResponse(true, 'Found ' + totalDocs + ' documents', { rawData: rawData });
    } catch (e) {
        return createResponse(false, 'Import error: ' + e.toString());
    }
}

// ==========================================
// HELPERS
// ==========================================

function recordAttendance(data) {
    try {
        const sheet = getOrCreateSheet(SHEET_NAMES.ABSENCE);
        const att = data.attendance;
        const now = new Date();

        if (sheet.getLastRow() === 0) {
            sheet.appendRow(['uid', 'username', 'email', 'date', 'time', 'points', 'week']);
        }

        sheet.appendRow([
            att.uid, att.username, att.email || '',
            Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
            Utilities.formatDate(now, Session.getScriptTimeZone(), 'HH:mm:ss'),
            att.points || 0, att.week || ''
        ]);

        return createResponse(true, 'Record added');
    } catch (e) {
        return createResponse(false, e.toString());
    }
}

function getOrCreateSheet(name) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    return sheet;
}

function createResponse(success, message, data) {
    const res = { success: success, message: message };
    if (data) res.data = data;
    return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
}
