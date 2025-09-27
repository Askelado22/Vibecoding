/**
 * Google Apps Script backend for GGSEL item synchronization.
 * Implements pull/push endpoints consumed by the Django service.
 */
const SCRIPT_PROPS = PropertiesService.getScriptProperties();

const SETTINGS = (function () {
  const spreadsheetId = SCRIPT_PROPS.getProperty('SHEET_SPREADSHEET_ID') || 'REPLACE_WITH_SPREADSHEET_ID';
  const rangeNotation = SCRIPT_PROPS.getProperty('SHEET_RANGE') || 'Лист1!A:M';
  const tz = SCRIPT_PROPS.getProperty('TZ') || 'Europe/Moscow';
  const [rawSheetName, rawColumns] = rangeNotation.split('!');
  const sheetName = (rawSheetName || 'Лист1').replace(/^'|'$/g, '');
  const columnsNotation = rawColumns || 'A:M';
  const columnMeta = parseColumnsNotation(columnsNotation);
  return {
    spreadsheetId,
    sheetName,
    columnsNotation,
    startColumn: columnMeta.startColumn,
    columnCount: columnMeta.columnCount,
    headerRows: Number(SCRIPT_PROPS.getProperty('HEADER_ROWS') || 1),
    timezone: tz,
  };
})();

/**
 * Handles GET requests.
 * Supported actions:
 *   - action=pull : returns sheet rows (without header).
 */
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'pull';
    if (action === 'pull') {
      const rows = pullSheetRows();
      return jsonResponse({ ok: true, rows }, 200);
    }
    return jsonResponse({ ok: false, error: 'Unsupported action' }, 400);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Handles POST requests.
 * Supported actions:
 *   - action=push : accepts { rows: [...] } and overwrites sheet data (except column L).
 */
function doPost(e) {
  try {
    const payload = parsePayload(e);
    const action = payload.action || (e && e.parameter && e.parameter.action);
    if (action === 'push') {
      if (!Array.isArray(payload.rows)) {
        return jsonResponse({ ok: false, error: 'Payload must include "rows" array' }, 400);
      }
      const updated = pushSheetRows(payload.rows);
      return jsonResponse({ ok: true, updated }, 200);
    }
    return jsonResponse({ ok: false, error: 'Unsupported action' }, 400);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Reads sheet rows (without headers) and trims trailing empty rows.
 */
function pullSheetRows() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  const dataStartRow = SETTINGS.headerRows + 1;
  if (lastRow < dataStartRow) {
    return [];
  }
  const rowCount = lastRow - SETTINGS.headerRows;
  const range = sheet.getRange(dataStartRow, SETTINGS.startColumn, rowCount, SETTINGS.columnCount);
  const values = range.getValues().map(function (row) {
    return row.map(function (cell) {
      return sanitiseCell(cell);
    });
  });
  return trimTrailingEmptyRows(values);
}

/**
 * Writes sheet rows, preserving column L (index 11).
 * Rows can include column L or omit it entirely.
 */
function pushSheetRows(incomingRows) {
  const sheet = getSheet();
  const dataStartRow = SETTINGS.headerRows + 1;
  const existingCount = Math.max(sheet.getLastRow() - SETTINGS.headerRows, 0);
  let existingValues = [];
  if (existingCount > 0) {
    existingValues = sheet
      .getRange(dataStartRow, SETTINGS.startColumn, existingCount, SETTINGS.columnCount)
      .getValues();
  }

  const normalised = incomingRows.map(function (row, index) {
    const fallback = (existingValues[index] && existingValues[index][11]) || '';
    return normaliseRow(row, fallback);
  });

  if (existingCount > 0) {
    sheet.getRange(dataStartRow, SETTINGS.startColumn, existingCount, SETTINGS.columnCount).clearContent();
  }

  if (normalised.length === 0) {
    return 0;
  }

  ensureRowCapacity(sheet, normalised.length + SETTINGS.headerRows);

  sheet
    .getRange(dataStartRow, SETTINGS.startColumn, normalised.length, SETTINGS.columnCount)
    .setValues(normalised);
  return normalised.length;
}

/**
 * Ensures a row is an array of 13 entries (A..M) and preserves column L when omitted.
 */
function normaliseRow(row, fallbackL) {
  const result = new Array(SETTINGS.columnCount).fill('');
  if (!Array.isArray(row)) {
    return result;
  }

  const sanitised = row.map(function (value) {
    return sanitiseCell(value);
  });

  if (sanitised.length === SETTINGS.columnCount) {
    for (var i = 0; i < SETTINGS.columnCount; i++) {
      result[i] = sanitised[i];
    }
    return result;
  }

  if (sanitised.length === SETTINGS.columnCount - 1) {
    // Column L (index 11) omitted — restore fallback and shift the rest.
    for (var j = 0; j < sanitised.length; j++) {
      if (j < 11) {
        result[j] = sanitised[j];
      } else {
        result[j + 1] = sanitised[j];
      }
    }
    result[11] = fallbackL || '';
    return result;
  }

  // Fallback: copy up to available columns and keep fallback for L when missing.
  for (var k = 0; k < sanitised.length && k < SETTINGS.columnCount; k++) {
    result[k] = sanitised[k];
  }
  if (!result[11]) {
    result[11] = fallbackL || '';
  }
  return result;
}

function parsePayload(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return {};
  }
  try {
    return JSON.parse(e.postData.contents);
  } catch (err) {
    throw new Error('Unable to parse JSON payload: ' + err.message);
  }
}

function getSheet() {
  if (!SETTINGS.spreadsheetId) {
    throw new Error('Missing SHEET_SPREADSHEET_ID script property');
  }
  const spreadsheet = SpreadsheetApp.openById(SETTINGS.spreadsheetId);
  const sheet = spreadsheet.getSheetByName(SETTINGS.sheetName);
  if (!sheet) {
    throw new Error('Sheet "' + SETTINGS.sheetName + '" not found');
  }
  return sheet;
}

function sanitiseCell(value) {
  if (value === null || value === undefined) {
    return '';
  }
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return Utilities.formatDate(value, SETTINGS.timezone, "yyyy-MM-dd'T'HH:mm:ssXXX");
  }
  return value;
}

function trimTrailingEmptyRows(rows) {
  var lastIndex = rows.length - 1;
  while (lastIndex >= 0) {
    if (!isRowEmpty(rows[lastIndex])) {
      break;
    }
    lastIndex--;
  }
  if (lastIndex < 0) {
    return [];
  }
  return rows.slice(0, lastIndex + 1);
}

function isRowEmpty(row) {
  if (!row) {
    return true;
  }
  for (var i = 0; i < row.length; i++) {
    var value = row[i];
    if (value !== '' && value !== null && value !== undefined) {
      return false;
    }
  }
  return true;
}

function jsonResponse(payload, statusCode) {
  const body = Object.assign({}, payload, { statusCode: statusCode || 200 });
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}

function handleError(error) {
  Logger.log('[sync] Error: ' + error);
  const message = error && error.message ? error.message : 'Unexpected error';
  return jsonResponse({ ok: false, error: message }, 500);
}

function ensureRowCapacity(sheet, requiredTotalRows) {
  const currentMax = sheet.getMaxRows();
  if (currentMax >= requiredTotalRows) {
    return;
  }
  sheet.insertRowsAfter(currentMax, requiredTotalRows - currentMax);
}

function parseColumnsNotation(notation) {
  const parts = (notation || 'A:M').split(':');
  const start = parts[0];
  const end = parts[1] || parts[0];
  const startColumn = columnLetterToNumber(start);
  const endColumn = columnLetterToNumber(end);
  return {
    startColumn: startColumn,
    columnCount: endColumn - startColumn + 1,
  };
}

function columnLetterToNumber(value) {
  const letters = (value || 'A').replace(/[^A-Z]/gi, '').toUpperCase();
  var number = 0;
  for (var i = 0; i < letters.length; i++) {
    number = number * 26 + (letters.charCodeAt(i) - 64);
  }
  return number || 1;
}
