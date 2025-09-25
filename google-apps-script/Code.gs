const SPREADSHEET_ID = 'PASTE_SPREADSHEET_ID_HERE';
const DEFAULT_RANGE = 'Лист1!A:M';
const HEADERS = [
  'product_url',
  'assignee_name',
  'move_status',
  'move_status_set_by',
  'move_status_set_at',
  'final_breadcrumbs',
  'breadcrumbs_set_by',
  'breadcrumbs_set_at',
  'priority_raw',
  'completed_by',
  'completed_at',
  'moved_flag_raw',
  'comment'
];

function doGet(e) {
  try {
    const action = (e.parameter.action || '').toLowerCase();
    if (action !== 'pull') {
      return jsonResponse({ error: 'Unsupported action' }, 400);
    }

    const range = e.parameter.range || DEFAULT_RANGE;
    const { sheet, grid } = resolveSheet(range);
    const values = sheet.getRange(grid).getValues();
    if (!values || values.length === 0) {
      return jsonResponse({ rows: [] });
    }

    const rows = values.slice(1).map((row) => normalizeRow(row));
    return jsonResponse({ rows });
  } catch (error) {
    return jsonResponse({ error: error.message || String(error) }, 500);
  }
}

function doPost(e) {
  try {
    const payload = e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
    const action = (payload.action || '').toLowerCase();

    if (action !== 'push') {
      return jsonResponse({ error: 'Unsupported action' }, 400);
    }

    const rows = Array.isArray(payload.rows) ? payload.rows : [];
    if (rows.length === 0) {
      return jsonResponse({ updated: 0, appended: 0 });
    }

    const range = payload.range || DEFAULT_RANGE;
    const { sheet, grid } = resolveSheet(range);

    ensureHeaders(sheet);
    const indexMap = buildIndexMap(sheet, grid);

    let updated = 0;
    let appended = 0;
    const appendBuffer = [];

    rows.forEach((rawRow) => {
      const row = normalizeRow(rawRow);
      const productUrl = row[0];
      if (!productUrl) return;
      const rowIndex = indexMap[productUrl];
      if (rowIndex) {
        sheet.getRange(rowIndex, 1, 1, HEADERS.length).setValues([row]);
        updated += 1;
      } else {
        appendBuffer.push(row);
      }
    });

    if (appendBuffer.length > 0) {
      const startRow = sheet.getLastRow() + 1;
      sheet.getRange(startRow, 1, appendBuffer.length, HEADERS.length).setValues(appendBuffer);
      appended = appendBuffer.length;
    }

    return jsonResponse({ updated, appended });
  } catch (error) {
    return jsonResponse({ error: error.message || String(error) }, 500);
  }
}

function resolveSheet(range) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const separatorIndex = range.indexOf('!');
  const sheetName = separatorIndex !== -1 ? range.substring(0, separatorIndex) : null;
  const grid = separatorIndex !== -1 ? range.substring(separatorIndex + 1) : range;
  const fallbackSheetName = DEFAULT_RANGE.split('!')[0];
  const sheet = sheetName ? ss.getSheetByName(sheetName) : ss.getSheetByName(fallbackSheetName);
  if (!sheet) {
    throw new Error('Sheet not found for range ' + range);
  }
  const normalizedGrid = grid && grid.trim().length > 0 ? grid : DEFAULT_RANGE.split('!')[1];
  return { sheet, grid: normalizedGrid };
}

function ensureHeaders(sheet) {
  const columnCount = HEADERS.length;
  const headerRange = sheet.getRange(1, 1, 1, columnCount);
  const headerValues = headerRange.getValues()[0] || [];
  const needsHeaders = HEADERS.some((header, idx) => headerValues[idx] !== header);
  if (needsHeaders) {
    headerRange.setValues([HEADERS]);
  }
}

function buildIndexMap(sheet, grid) {
  const values = sheet.getRange(grid).getValues();
  const indexMap = {};
  for (let i = 1; i < values.length; i++) {
    const productUrl = values[i][0];
    if (productUrl) {
      indexMap[productUrl] = i + 1;
    }
  }
  return indexMap;
}

function normalizeRow(row) {
  const normalized = [];
  for (let i = 0; i < HEADERS.length; i++) {
    normalized.push(row[i] !== undefined && row[i] !== null ? String(row[i]) : '');
  }
  return normalized;
}

function jsonResponse(payload, statusCode) {
  const output = ContentService.createTextOutput(JSON.stringify(payload));
  output.setMimeType(ContentService.MimeType.JSON);
  if (statusCode) {
    output.setStatusCode(statusCode);
  }
  return output;
}
