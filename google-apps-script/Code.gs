const SPREADSHEET_ID = '';
const DEFAULT_RANGE = 'Лист1!A:M';
const DEFAULT_GRID = DEFAULT_RANGE.indexOf('!') !== -1 ? DEFAULT_RANGE.split('!')[1] : 'A:M';
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
const DATE_COLUMNS = [4, 7, 10];
const TIMEZONE = 'Europe/Moscow';

function doGet(e) {
  return respond(() => handlePull(e));
}

function doPost(e) {
  return respond(() => handlePush(e));
}

function respond(handler) {
  try {
    const payload = handler() || {};
    return jsonResponse(payload, 200);
  } catch (error) {
    logError(error);
    return jsonResponse({ error: stringifyError(error) }, 500);
  }
}

function handlePull(e) {
  const params = normalizeGetParams(e);
  if (params.action !== 'pull') {
    throw new Error('Unsupported action');
  }

  const context = resolveSheet(params.range, params.spreadsheetId);
  const values = safeGetValues(context.sheet, context.grid);
  if (!values || values.length <= 1) {
    return { rows: [] };
  }

  const rows = values.slice(1).map((row) => normalizeIncomingRow(row));
  return { rows };
}

function handlePush(e) {
  const payload = parsePostPayload(e);
  if (payload.action !== 'push') {
    throw new Error('Unsupported action');
  }

  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  if (rows.length === 0) {
    return { updated: 0, appended: 0 };
  }

  const context = resolveSheet(payload.range, payload.spreadsheetId);
  ensureColumns(context.sheet);
  const indexMap = buildIndexMap(context.sheet, context.grid);

  let updated = 0;
  const appendBuffer = [];

  rows.forEach((rawRow) => {
    const row = normalizeOutgoingRow(rawRow);
    const productUrl = row[0];
    if (!productUrl) return;
    const rowIndex = indexMap[productUrl];
    if (rowIndex) {
      context.sheet.getRange(rowIndex, 1, 1, HEADERS.length).setValues([row]);
      updated += 1;
    } else {
      appendBuffer.push(row);
    }
  });

  if (appendBuffer.length > 0) {
    const startRow = Math.max(context.sheet.getLastRow(), 1) + 1;
    context.sheet
      .getRange(startRow, 1, appendBuffer.length, HEADERS.length)
      .setValues(appendBuffer);
  }

  return { updated, appended: appendBuffer.length };
}

function normalizeGetParams(e) {
  const parameter = (e && e.parameter) || {};
  return {
    action: (parameter.action || '').toLowerCase(),
    range: parameter.range || DEFAULT_RANGE,
    spreadsheetId: extractSpreadsheetId(parameter)
  };
}

function parsePostPayload(e) {
  let payload = {};
  if (e && e.postData && e.postData.contents) {
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (error) {
      throw new Error('Invalid JSON payload: ' + stringifyError(error));
    }
  }

  const parameter = (e && e.parameter) || {};
  if (!payload.range && parameter.range) {
    payload.range = parameter.range;
  }
  if (!payload.spreadsheetId && parameter.spreadsheetId) {
    payload.spreadsheetId = parameter.spreadsheetId;
  }

  return {
    action: (payload.action || '').toLowerCase(),
    range: payload.range || DEFAULT_RANGE,
    spreadsheetId: extractSpreadsheetId(payload),
    rows: payload.rows
  };
}

function extractSpreadsheetId(source) {
  if (!source) return '';
  const candidate = source.spreadsheetId || source.spreadsheet_id || '';
  return typeof candidate === 'string' ? candidate.trim() : '';
}

function resolveSheet(range, spreadsheetId) {
  const parsed = splitRange(range || DEFAULT_RANGE);
  const ss = getSpreadsheet(spreadsheetId);
  const sheet = findSheet(ss, parsed.sheetName);
  const grid = parsed.grid || DEFAULT_GRID;
  return { sheet, grid };
}

function splitRange(range) {
  if (!range) {
    return { sheetName: '', grid: DEFAULT_GRID };
  }
  const separatorIndex = range.indexOf('!');
  if (separatorIndex === -1) {
    return { sheetName: '', grid: range };
  }
  const sheetName = sanitizeSheetName(range.substring(0, separatorIndex));
  const grid = range.substring(separatorIndex + 1) || DEFAULT_GRID;
  return { sheetName, grid };
}

function sanitizeSheetName(name) {
  if (!name) return '';
  let trimmed = name.trim();
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    trimmed = trimmed.substring(1, trimmed.length - 1);
  }
  return trimmed;
}

function getSpreadsheet(explicitId) {
  const candidate = explicitId && explicitId !== 'undefined' ? explicitId : '';
  if (candidate) {
    return SpreadsheetApp.openById(candidate);
  }
  if (typeof SPREADSHEET_ID !== 'undefined' && SPREADSHEET_ID) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) {
    return active;
  }
  throw new Error(
    'Unable to resolve spreadsheet: set SPREADSHEET_ID in the script or provide spreadsheetId in the request.'
  );
}

function findSheet(spreadsheet, sheetName) {
  if (sheetName) {
    let sheet = spreadsheet.getSheetByName(sheetName);
    if (sheet) return sheet;

    const unquoted = sheetName.replace(/['"]/g, '').trim();
    if (unquoted && unquoted !== sheetName) {
      sheet = spreadsheet.getSheetByName(unquoted);
      if (sheet) return sheet;
    }

    const lower = sheetName.toLowerCase();
    const match = spreadsheet
      .getSheets()
      .find((candidate) => candidate.getName().toLowerCase() === lower);
    if (match) {
      return match;
    }
  }

  const fallbackName = sanitizeSheetName(DEFAULT_RANGE.split('!')[0]);
  if (fallbackName) {
    const fallbackSheet = spreadsheet.getSheetByName(fallbackName);
    if (fallbackSheet) {
      return fallbackSheet;
    }
  }

  const sheets = spreadsheet.getSheets();
  if (sheets && sheets.length > 0) {
    return sheets[0];
  }
  throw new Error('Sheet not found. Please verify the provided range.');
}

function safeGetValues(sheet, grid) {
  try {
    return sheet.getRange(grid).getValues();
  } catch (error) {
    throw new Error('Failed to read range "' + grid + '": ' + stringifyError(error));
  }
}

function ensureColumns(sheet) {
  const headerWidth = Math.max(sheet.getLastColumn(), HEADERS.length);
  const headerRange = sheet.getRange(1, 1, 1, headerWidth);
  const headerValues = headerRange.getValues()[0] || [];
  let mutated = false;

  for (let i = 0; i < HEADERS.length; i++) {
    if (headerValues[i] === undefined || headerValues[i] === null || String(headerValues[i]).trim() === '') {
      headerValues[i] = HEADERS[i];
      mutated = true;
    }
  }

  if (headerValues.length < HEADERS.length) {
    for (let j = headerValues.length; j < HEADERS.length; j++) {
      headerValues[j] = HEADERS[j];
      mutated = true;
    }
  }

  if (mutated) {
    sheet.getRange(1, 1, 1, headerValues.length).setValues([headerValues]);
  }
}

function buildIndexMap(sheet, grid) {
  const values = safeGetValues(sheet, grid);
  const map = {};
  for (let i = 1; i < values.length; i++) {
    const productUrl = formatCell(values[i][0]);
    if (productUrl) {
      map[productUrl] = i + 1;
    }
  }
  return map;
}

function normalizeIncomingRow(row) {
  const normalized = [];
  for (let i = 0; i < HEADERS.length; i++) {
    normalized.push(formatCell(row[i]));
  }
  return normalized;
}

function normalizeOutgoingRow(row) {
  const normalized = [];
  for (let i = 0; i < HEADERS.length; i++) {
    const value = Array.isArray(row) ? row[i] : '';
    normalized.push(formatOutgoingCell(value, i));
  }
  return normalized;
}

function formatCell(value) {
  if (value === null || value === undefined) {
    return '';
  }
  if (value instanceof Date) {
    return Utilities.formatDate(value, TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
  }
  return String(value);
}

function formatOutgoingCell(value, columnIndex) {
  if (value === null || value === undefined) {
    return '';
  }
  if (value instanceof Date) {
    return Utilities.formatDate(value, TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
  }
  const stringValue = String(value);
  if (DATE_COLUMNS.indexOf(columnIndex) !== -1) {
    const parsed = tryParseDate(stringValue);
    if (parsed) {
      return Utilities.formatDate(parsed, TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
    }
  }
  return stringValue;
}

function tryParseDate(value) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const direct = new Date(trimmed);
  if (!isNaN(direct.getTime())) {
    return direct;
  }
  const match = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{4})(?:[\s,]+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]) - 1;
  const year = Number(match[3]);
  const hours = Number(match[4] || '0');
  const minutes = Number(match[5] || '0');
  const seconds = Number(match[6] || '0');
  return new Date(year, month, day, hours, minutes, seconds);
}

function jsonResponse(payload, statusCode) {
  const isError = Boolean(statusCode && statusCode >= 400);
  const body = Object.assign(
    {
      ok: !isError,
      statusCode: statusCode || 200
    },
    payload || {}
  );
  const output = ContentService.createTextOutput(JSON.stringify(body));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

function stringifyError(error) {
  if (!error) {
    return 'Unknown error';
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error.message) {
    return error.message;
  }
  try {
    return JSON.stringify(error);
  } catch (e) {
    return String(error);
  }
}

function logError(error) {
  const message = stringifyError(error);
  if (typeof console !== 'undefined' && console.error) {
    console.error(message);
  } else {
    Logger.log(message);
  }
}
