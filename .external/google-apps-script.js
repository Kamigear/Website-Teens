// ==========================================
// CONFIGURATION
// ==========================================

const SHEET_NAMES = {
    ABSENCE: 'AbsenceData',
    USERS: 'UserData',
    SERVER: 'ServerData'
};

const ADMIN_PASSWORD = String(PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD') || '');
const THEME = {
    pureWhite: '#ffffff',
    white: '#E6E6E6',
    secondWhite: '#9f9f9f',
    primary: '#000000',
    secondary: '#D9D9D9',
    customBtn: '#808080',
    socialIcon: '#1A1A1A',
    dark: '#000000',
    p: '#1a1a1a',
    border: '#2B2B2B',
    alertSuccessBg: '#d4edda',
    alertErrorBg: '#ffe5e5'
};


function hasValidAdminPassword_(password) {
    return ADMIN_PASSWORD && String(password || '') === ADMIN_PASSWORD;
}

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
            case 'recordAttendance':
            case 'recordAbsence':
            case 'recordAttendanceData':
                return recordAttendance(data);
            case 'exportUserData': return exportUserData(data);
            case 'exportServerData': return exportServerData(data);
            case 'importUserData': return importUserData(data);
            case 'importServerData': return importServerData(data);
            case 'fixAttendanceHyperlinks': return fixAttendanceHyperlinks(data);
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
        if (!hasValidAdminPassword_(data.password)) return createResponse(false, 'Invalid password');

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
                sheet.getRange(1, currentCol).setValue("'--- " + collectionName + " (Empty) ---");
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
            sheet.getRange(1, currentCol).setValue("'=== " + collectionName + " (" + docIds.length + " docs) ===");

            // Bulk Write Table (Row 2 onwards) - Plain Text
            sheet.getRange(2, currentCol, tableValues.length, headers.length).setValues(tableValues);

            currentCol += headers.length + 1;
        });

        applyServerSheetStyle_(sheet);

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
        if (!hasValidAdminPassword_(data.password)) return createResponse(false, 'Invalid password');
        const sheet = getOrCreateSheet(SHEET_NAMES.USERS);
        sheet.clear();

        const users = data.users || [];
        if (users.length === 0) return createResponse(true, 'No users');

        const headers = ['uid', 'username', 'email', 'points', 'totalAttendance', 'isAdmin', 'createdAt', 'birthdate'];
        const values = [headers];

        users.forEach(function (u) {
            values.push([
                u.uid || '', u.username || '', u.email || '',
                u.points || 0, u.totalAttendance || 0,
                u.isAdmin ? 'Yes' : 'No', u.createdAt || '', u.birthdate || ''
            ]);
        });

        sheet.getRange(1, 1, values.length, headers.length).setValues(values);
        applyUserSheetStyle_(sheet, values.length, headers.length);
        // Start from column J and leave column I as spacing
        sheet.setColumnWidth(9, 28);
        renderBirthMonthSidebar_(sheet, users, 10);

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
        if (!hasValidAdminPassword_(data.password)) return createResponse(false, 'Invalid password');

        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.USERS);
        if (!sheet) return createResponse(false, 'UserData sheet not found');

        const lastRow = sheet.getLastRow();
        if (lastRow < 2) return createResponse(false, 'No data in UserData sheet');

        // Get all data (skip header row)
        const values = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
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
                    createdAt: String(row[6] || ''),
                    birthdate: String(row[7] || '')
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
        if (!hasValidAdminPassword_(data.password)) return createResponse(false, 'Invalid password');

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
        const att = data.attendance || data || {};
        const now = new Date();

        if (!att.uid && !att.username && !att.email) {
            return createResponse(false, 'Attendance payload is empty');
        }

        if (sheet.getLastRow() === 0) {
            sheet.appendRow(['uid', 'username', 'email', 'date', 'time', 'points', 'week']);
        }

        sheet.appendRow([
            att.uid, att.username, att.email || '',
            Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
            Utilities.formatDate(now, Session.getScriptTimeZone(), 'HH:mm:ss'),
            att.points || 0, att.week || ''
        ]);

        // Make UID and username clickable to the matching row in UserData
        const insertedRow = sheet.getLastRow();
        applyUserDataHyperlinks_(sheet, insertedRow, att.uid, att.username);
        applyAbsenceSheetStyle_(sheet);

        return createResponse(true, 'Record added');
    } catch (e) {
        return createResponse(false, e.toString());
    }
}

function applyUserDataHyperlinks_(absenceSheet, absenceRow, uid, username) {
    const usersSheet = getOrCreateSheet(SHEET_NAMES.USERS);
    const userRow = findUserRow_(usersSheet, uid, username);
    if (!userRow) return;

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const baseUrl = ss.getUrl();
    const targetUrl = baseUrl + '#gid=' + usersSheet.getSheetId() + '&range=A' + userRow;

    // Col A: uid
    const uidText = String(uid || '');
    if (uidText) {
        const uidRich = SpreadsheetApp.newRichTextValue()
            .setText(uidText)
            .setLinkUrl(targetUrl)
            .build();
        absenceSheet.getRange(absenceRow, 1).setRichTextValue(uidRich);
    }

    // Col B: username
    const usernameText = String(username || '');
    if (usernameText) {
        const usernameRich = SpreadsheetApp.newRichTextValue()
            .setText(usernameText)
            .setLinkUrl(targetUrl)
            .build();
        absenceSheet.getRange(absenceRow, 2).setRichTextValue(usernameRich);
    }
}

function findUserRow_(usersSheet, uid, username) {
    const lastRow = usersSheet.getLastRow();
    if (lastRow < 2) return null;

    const uidText = String(uid || '').trim();
    const usernameText = String(username || '').trim();
    const values = usersSheet.getRange(2, 1, lastRow - 1, 2).getValues(); // uid, username

    if (uidText) {
        for (let i = 0; i < values.length; i++) {
            if (String(values[i][0] || '').trim() === uidText) return i + 2;
        }
    }

    if (usernameText) {
        for (let i = 0; i < values.length; i++) {
            if (String(values[i][1] || '').trim() === usernameText) return i + 2;
        }
    }

    return null;
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

function fixAttendanceHyperlinks(data) {
    try {
        if (!hasValidAdminPassword_(data.password)) return createResponse(false, 'Invalid password');

        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const absenceSheet = ss.getSheetByName(SHEET_NAMES.ABSENCE);
        const usersSheet = ss.getSheetByName(SHEET_NAMES.USERS);

        if (!absenceSheet) return createResponse(false, 'AbsenceData sheet not found');
        if (!usersSheet) return createResponse(false, 'UserData sheet not found');

        const absenceLastRow = absenceSheet.getLastRow();
        if (absenceLastRow < 2) return createResponse(true, 'Tidak ada data absensi untuk diperbaiki');

        const usersLastRow = usersSheet.getLastRow();
        if (usersLastRow < 2) return createResponse(false, 'UserData belum memiliki data');

        const userRows = usersSheet.getRange(2, 1, usersLastRow - 1, 2).getValues(); // uid, username
        const uidToRow = {};
        const usernameToRow = {};

        userRows.forEach(function (row, idx) {
            const rowNumber = idx + 2;
            const uid = String(row[0] || '').trim();
            const username = String(row[1] || '').trim();

            if (uid && !uidToRow[uid]) uidToRow[uid] = rowNumber;
            if (username && !usernameToRow[username]) usernameToRow[username] = rowNumber;
        });

        const absenceRows = absenceSheet.getRange(2, 1, absenceLastRow - 1, 2).getValues(); // uid, username
        const baseUrl = ss.getUrl();
        const usersGid = usersSheet.getSheetId();

        let fixedCount = 0;

        absenceRows.forEach(function (row, idx) {
            const absenceRow = idx + 2;
            const uid = String(row[0] || '').trim();
            const username = String(row[1] || '').trim();
            const userRow = (uid && uidToRow[uid]) || (username && usernameToRow[username]);

            if (!userRow) return;

            const targetUrl = baseUrl + '#gid=' + usersGid + '&range=A' + userRow;
            let touched = false;

            if (uid) {
                const uidRich = SpreadsheetApp.newRichTextValue()
                    .setText(uid)
                    .setLinkUrl(targetUrl)
                    .build();
                absenceSheet.getRange(absenceRow, 1).setRichTextValue(uidRich);
                touched = true;
            }

            if (username) {
                const usernameRich = SpreadsheetApp.newRichTextValue()
                    .setText(username)
                    .setLinkUrl(targetUrl)
                    .build();
                absenceSheet.getRange(absenceRow, 2).setRichTextValue(usernameRich);
                touched = true;
            }

            if (touched) fixedCount++;
        });

        return createResponse(true, 'Hyperlink diperbaiki: ' + fixedCount + ' baris');
    } catch (e) {
        return createResponse(false, 'Fix error: ' + e.toString());
    }
}

function applyHeaderStyle_(range) {
    range
        .setBackground(THEME.primary)
        .setFontColor(THEME.pureWhite)
        .setFontWeight('bold')
        .setHorizontalAlignment('center')
        .setVerticalAlignment('middle')
        .setFontFamily('Calibri')
        .setFontSize(10);
}

function applyUserSheetStyle_(sheet, totalRows, totalCols) {
    if (totalRows < 1 || totalCols < 1) return;
    paintSheetBase_(sheet, totalRows, totalCols);
    applyHeaderStyle_(sheet.getRange(1, 1, 1, totalCols));
    sheet.setFrozenRows(1);
    ensureFilter_(sheet, sheet.getRange(1, 1, totalRows, totalCols));

    if (totalRows > 1) {
        sheet.getRange(2, 4, totalRows - 1, 2).setNumberFormat('#,##0');
        sheet.getRange(2, 7, totalRows - 1, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
    }

    sheet.autoResizeColumns(1, totalCols);
    sheet.setColumnWidths(1, 1, 210);
    sheet.setColumnWidths(2, 1, 180);
    sheet.setColumnWidths(3, 1, 280);
    sheet.setColumnWidths(4, 2, 130);
    sheet.setColumnWidths(6, 1, 100);
    sheet.setColumnWidths(7, 1, 180);
    if (totalCols >= 8) {
        sheet.setColumnWidths(8, 1, 140);
        sheet.getRange(2, 8, Math.max(totalRows - 1, 1), 1).setNumberFormat('yyyy-mm-dd');
    }
    sheet.getRange(2, 6, Math.max(totalRows - 1, 1), 1).setHorizontalAlignment('center');
    sheet.getRange(1, 1, totalRows, totalCols).setVerticalAlignment('middle');

    sheet.getBandings().forEach(function (b) { b.remove(); });
    if (totalRows > 1) {
        sheet.getRange(2, 1, totalRows - 1, totalCols).applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY);
    }
    // Border only on header to keep empty cells clean
    sheet.getRange(1, 1, 1, totalCols).setBorder(true, true, true, true, true, true, THEME.border, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
}

function applyAbsenceSheetStyle_(sheet) {
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    if (lastRow < 1 || lastCol < 1) return;

    paintSheetBase_(sheet, lastRow, lastCol);
    applyHeaderStyle_(sheet.getRange(1, 1, 1, lastCol));
    sheet.setFrozenRows(1);
    // Requested: no sort/filter feature for AbsenceData
    const existingFilter = sheet.getFilter();
    if (existingFilter) existingFilter.remove();

    sheet.getBandings().forEach(function (b) { b.remove(); });
    if (lastRow > 1) {
        sheet.getRange(2, 4, lastRow - 1, 1).setNumberFormat('yyyy-mm-dd');
        sheet.getRange(2, 5, lastRow - 1, 1).setNumberFormat('hh:mm:ss');
        sheet.getRange(2, 6, lastRow - 1, 1).setNumberFormat('#,##0');
        sheet.getRange(2, 1, lastRow - 1, lastCol).applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY);
    }

    const rules = sheet.getConditionalFormatRules().filter(function (r) {
        const a1 = r.getRanges()[0].getA1Notation();
        return a1 !== 'F2:F';
    });
    rules.push(
        SpreadsheetApp.newConditionalFormatRule()
            .whenNumberGreaterThan(0)
            .setBackground(THEME.alertSuccessBg)
            .setRanges([sheet.getRange('F2:F')])
            .build()
    );
    rules.push(
        SpreadsheetApp.newConditionalFormatRule()
            .whenNumberLessThan(0)
            .setBackground(THEME.alertErrorBg)
            .setRanges([sheet.getRange('F2:F')])
            .build()
    );
    sheet.setConditionalFormatRules(rules);

    sheet.autoResizeColumns(1, lastCol);
    sheet.setColumnWidths(1, 1, 210);
    sheet.setColumnWidths(2, 1, 170);
    sheet.setColumnWidths(3, 1, 260);
    sheet.setColumnWidths(4, 1, 110);
    sheet.setColumnWidths(5, 1, 90);
    sheet.setColumnWidths(6, 1, 90);
    sheet.setColumnWidths(7, 1, 120);
    sheet.getRange(2, 6, Math.max(lastRow - 1, 1), 1).setHorizontalAlignment('center');
    // Border only on header to keep empty cells clean
    sheet.getRange(1, 1, 1, lastCol).setBorder(true, true, true, true, true, true, THEME.border, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
}

function applyServerSheetStyle_(sheet) {
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    if (lastRow < 1 || lastCol < 1) return;

    const titleRange = sheet.getRange(1, 1, 1, lastCol);
    titleRange.setFontWeight('bold').setBackground(THEME.primary).setFontColor(THEME.pureWhite).setFontFamily('Calibri');
    sheet.getRange(1, 1, lastRow, lastCol).setFontFamily('Calibri').setVerticalAlignment('middle');
    // Border only on title/header row to avoid borders on empty cells
    sheet.getRange(1, 1, 1, lastCol).setBorder(true, true, true, true, true, true, THEME.border, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
    sheet.autoResizeColumns(1, lastCol);
}

function ensureFilter_(sheet, range) {
    const existing = sheet.getFilter();
    if (existing) existing.remove();
    range.createFilter();
}

function paintSheetBase_(sheet, rows, cols) {
    sheet.setTabColor(THEME.secondary);
    sheet.setHiddenGridlines(false);
    sheet.getRange(1, 1, rows, cols).setFontFamily('Calibri').setFontColor(THEME.p);
}

function renderBirthMonthSidebar_(sheet, users, startCol) {
    const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const monthUsers = {};
    for (let m = 1; m <= 12; m++) monthUsers[m] = [];

    (users || []).forEach(function (u) {
        const month = extractMonthFromBirthdate_(u.birthdate);
        if (!month) return;

        const name = String(u.username || u.uid || '').trim();
        if (!name) return;
        monthUsers[month].push(name);
    });

    const panelTitleRange = sheet.getRange(1, startCol, 1, 2);
    panelTitleRange
        .merge()
        .setValue('Daftar Lahir per Bulan')
        .setBackground(THEME.primary)
        .setFontColor(THEME.pureWhite)
        .setFontWeight('bold')
        .setHorizontalAlignment('center')
        .setVerticalAlignment('middle')
        .setFontFamily('Calibri');

    sheet.getRange(2, startCol, 1, 2).setValues([['Bulan', 'Nama Pengguna']]);
    applyHeaderStyle_(sheet.getRange(2, startCol, 1, 2));

    const rows = monthNames.map(function (name, i) {
        const idx = i + 1;
        const names = monthUsers[idx];
        return [name, names.length ? names.join(', ') : '-'];
    });

    sheet.getRange(3, startCol, rows.length, 2).setValues(rows);
    sheet.getRange(3, startCol + 1, rows.length, 1).setWrap(true);
    sheet.getRange(3, startCol, rows.length, 2).setVerticalAlignment('top');
    sheet.getRange(3, startCol, rows.length, 2).applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY);
    sheet.getRange(1, startCol, rows.length + 2, 2)
        .setBorder(true, true, true, true, true, true, THEME.border, SpreadsheetApp.BorderStyle.SOLID);

    sheet.setColumnWidths(startCol, 1, 140);
    sheet.setColumnWidths(startCol + 1, 1, 360);
}

function extractMonthFromBirthdate_(birthdateValue) {
    if (!birthdateValue) return null;
    const raw = String(birthdateValue).trim();
    if (!raw) return null;

    // yyyy-mm-dd or yyyy/mm/dd
    let m = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (m) {
        const month = Number(m[2]);
        return month >= 1 && month <= 12 ? month : null;
    }

    // dd-mm-yyyy or dd/mm/yyyy
    m = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (m) {
        const month = Number(m[2]);
        return month >= 1 && month <= 12 ? month : null;
    }

    // Last fallback: Date parse
    const parsed = new Date(raw);
    if (!isNaN(parsed.getTime())) return parsed.getMonth() + 1;

    return null;
}

