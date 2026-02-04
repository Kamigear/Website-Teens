
// ==========================================
// DEBUGGING TOOL (Run this manually in Editor)
// ==========================================

function debugServerData() {
    console.log('=== DEBUGGING SERVER DATA SHEET ===');

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
        console.log('ERROR: No active spreadsheet found.');
        return;
    }

    const sheetName = 'ServerData'; // Hardcoded check
    const sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
        console.log('ERROR: Sheet "' + sheetName + '" NOT found!');
        console.log('Available sheets:');
        const sheets = ss.getSheets();
        sheets.forEach(s => console.log(' - "' + s.getName() + '"'));
        return;
    }

    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    console.log(`Sheet "${sheetName}" found.`);
    console.log(`Dimensions: LastRow=${lastRow}, LastCol=${lastCol}`);

    if (lastRow < 1 || lastCol < 1) {
        console.log('WARNING: Sheet is empty.');
        return;
    }

    // Read first few rows to check headers
    const rowsToRead = Math.min(lastRow, 3);
    const values = sheet.getRange(1, 1, rowsToRead, lastCol).getValues();

    console.log('--- ROW 1 (Section Headers) ---');
    values[0].forEach((cell, idx) => {
        if (cell) console.log(`Col ${idx + 1}: [${cell}] (Type: ${typeof cell})`);
    });

    if (rowsToRead > 1) {
        console.log('--- ROW 2 (Column Headers) ---');
        values[1].forEach((cell, idx) => {
            if (cell) console.log(`Col ${idx + 1}: [${cell}]`);
        });
    }

    // Test regex on Row 1 headers
    console.log('--- REGEX TEST ON ROW 1 ---');
    let foundTables = 0;
    values[0].forEach((cell, idx) => {
        if (typeof cell === 'string' && cell.startsWith('===')) {
            const match = cell.match(/===\s*(.+?)\s*\(/);
            if (match) {
                console.log(`Match at Col ${idx + 1}: Collection="${match[1]}" (Original: "${cell}")`);
                foundTables++;
            } else {
                console.log(`NO MATCH at Col ${idx + 1}: "${cell}"`);
            }
        }
    });

    if (foundTables === 0) {
        console.log('CRITICAL: No valid table headers found via Regex!');
    } else {
        console.log(`Success: Found ${foundTables} potential tables.`);
    }

    console.log('=== END DEBUG ===');
}
