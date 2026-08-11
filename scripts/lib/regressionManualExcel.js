/**
 * Shared manual regression Excel template (matches RUM PD / RO / Smoke format).
 *
 * Sheets: Summary | Regression TCs | Notes
 * Columns: Test Case ID | Type | Module | Submodule | Title | Steps | Expected Results | Status
 * Header: bold white on #1F4E79
 */
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');

const HEADER_FILL = 'FF1F4E79';
const SECTION_FILL = 'FFD6E3F0';
const TOTAL_FILL = 'FFFFF2CC';

function styleHeaderRow(row) {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
  row.alignment = { vertical: 'middle', wrapText: true, horizontal: 'center' };
  row.height = 22;
}

/** Ensure manual-friendly numbered multi-line steps. */
function ensureNumberedSteps(raw) {
  let s = String(raw || '')
    .replace(/\r\n/g, '\n')
    .trim();
  if (!s) return '1. Execute the test against the live portal screen as described by the title.';
  if (/^\s*\d+[\).\]]\s+/m.test(s) || /\n\s*\d+[\).\]]\s+/.test(s)) {
    return s
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .join('\n');
  }
  // Split prose fragments into steps
  let parts = s
    .split(/\s*(?:\n|;|\u2192|->|\u2014|—)\s*/)
    .map((p) => p.replace(/^\d+[\).\]]\s*/, '').trim())
    .filter((p) => p.length > 1);
  if (parts.length === 1 && parts[0].length > 90) {
    const sentences = parts[0]
      .split(/(?<=[.!?])\s+(?=[A-Z])/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (sentences.length > 1) parts = sentences;
  }
  if (parts.length === 0) parts = [s];
  return parts.map((p, i) => `${i + 1}. ${p}`).join('\n');
}

function ensureNumberedExpected(raw) {
  let s = String(raw || '')
    .replace(/\r\n/g, '\n')
    .trim();
  if (!s) {
    return (
      '1. Screen remains healthy without blocking error banner.\n' +
      '2. Behavior matches automation soft/hard assertions for this case.'
    );
  }
  const lines = s
    .split(/\n|(?:\s*;\s*)/)
    .map((line) => line.replace(/^[-•*]\s*/, '').replace(/^\d+[\).\]]\s*/, '').trim())
    .filter(Boolean);
  return lines.map((line, i) => `${i + 1}. ${line}`).join('\n');
}

/**
 * @param {object} opts
 * @param {string} opts.outPath
 * @param {string} opts.screenTitle
 * @param {string} [opts.site]
 * @param {string} [opts.dc]
 * @param {string} opts.module
 * @param {string} [opts.typeLabel]
 * @param {string} [opts.helpLine]
 * @param {string} [opts.automation]
 * @param {string} [opts.executionStatus]
 * @param {string} [opts.executionNote]
 * @param {string[]} [opts.notes]
 * @param {Array<{id:string, submodule:string, title:string, steps:string, expected:string, status?:string, type?:string, module?:string}>} opts.cases
 */
async function writeRegressionManualWorkbook(opts) {
  const site = opts.site || 'GDC Test Site 2';
  const dc = opts.dc || 'US';
  const moduleName = opts.module || 'Blue Triangle Portal';
  const typeLabel = opts.typeLabel || 'Regression (read-only)';
  const statusDefault = opts.executionStatus || 'Not Executed';

  const enriched = opts.cases.map((c) => {
    const id = c.id || c.testCaseId || '';
    let title = (c.title || '').trim();
    if (id && title && !title.startsWith(id)) {
      // Keep readable titles; do not force ID prefix (RO does; SL does not — omit for readability)
    }
    return {
      testCaseId: id,
      type: c.type || 'Regression',
      module: c.module || moduleName,
      submodule: c.submodule || c.area || 'General',
      title: title || id,
      steps: ensureNumberedSteps(c.steps),
      expected: ensureNumberedExpected(c.expected || c.expectedResults),
      status: c.status || statusDefault,
    };
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'BTT Playwright Automation';
  workbook.created = new Date();

  // ---- Summary ----
  const summary = workbook.addWorksheet('Summary', { views: [{ state: 'frozen', ySplit: 3 }] });
  summary.getColumn(1).width = 36;
  summary.getColumn(2).width = 28;
  summary.getColumn(3).width = 12;
  summary.getColumn(4).width = 72;
  summary.mergeCells(1, 1, 1, 4);
  summary.getCell(1, 1).value = `Profile: ${dc} / ${site} | Type: ${typeLabel} | Total TCs: ${enriched.length} | ${opts.screenTitle}`;
  summary.getCell(1, 1).font = { bold: true, size: 12 };
  summary.mergeCells(2, 1, 2, 4);
  summary.getCell(2, 1).value =
    opts.helpLine ||
    opts.automation ||
    `Automation-aligned manual cases for ${opts.screenTitle}`;
  summary.getCell(2, 1).alignment = { wrapText: true };

  summary.getRow(3).values = [undefined, 'Module', 'Submodule', 'TC Count', 'Test Case IDs'];
  styleHeaderRow(summary.getRow(3));

  let rIdx = 4;
  const section = summary.getRow(rIdx++);
  section.values = [undefined, 'Breakdown by Module + Submodule', '', '', ''];
  section.font = { bold: true };
  section.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SECTION_FILL } };

  const bySub = new Map();
  for (const row of enriched) {
    const k = row.submodule;
    if (!bySub.has(k)) bySub.set(k, []);
    bySub.get(k).push(row);
  }
  for (const [submodule, rows] of [...bySub.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const row = summary.getRow(rIdx++);
    row.values = [
      undefined,
      rows[0].module,
      submodule,
      rows.length,
      rows.map((r) => r.testCaseId).join(', '),
    ];
    row.alignment = { vertical: 'top', wrapText: true };
  }

  const total = summary.getRow(rIdx++);
  const firstId = enriched[0]?.testCaseId || '';
  const lastId = enriched[enriched.length - 1]?.testCaseId || '';
  total.values = [undefined, 'TOTAL', '', enriched.length, firstId && lastId ? `${firstId} .. ${lastId}` : ''];
  total.font = { bold: true };
  total.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_FILL } };

  if (opts.executionNote) {
    const noteRow = summary.getRow(rIdx++);
    summary.mergeCells(noteRow.number, 1, noteRow.number, 4);
    noteRow.getCell(1).value = `Execution: ${statusDefault} — ${opts.executionNote}`;
    noteRow.getCell(1).alignment = { wrapText: true };
  }

  // ---- Regression TCs ----
  const sheet = workbook.addWorksheet('Regression TCs', { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = [
    { header: 'Test Case ID', key: 'testCaseId', width: 18 },
    { header: 'Type', key: 'type', width: 12 },
    { header: 'Module', key: 'module', width: 28 },
    { header: 'Submodule', key: 'submodule', width: 22 },
    { header: 'Title', key: 'title', width: 58 },
    { header: 'Steps', key: 'steps', width: 68 },
    { header: 'Expected Results', key: 'expected', width: 62 },
    { header: 'Status', key: 'status', width: 14 },
  ];
  styleHeaderRow(sheet.getRow(1));
  for (const row of enriched) {
    const r = sheet.addRow(row);
    r.alignment = { vertical: 'top', wrapText: true };
    const stepLines = String(row.steps).split('\n').length;
    r.height = Math.min(160, Math.max(48, 16 * stepLines + 12));
  }
  for (let i = 2; i <= enriched.length + 1; i++) {
    sheet.getCell(`H${i}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"Not Executed,Pass,Fail,Blocked,Skipped"'],
    };
  }

  // ---- Notes ----
  const notes = workbook.addWorksheet('Notes');
  notes.getColumn(1).width = 110;
  const noteLines = [
    `Blue Triangle Portal — ${opts.screenTitle} Regression Test Cases`,
    `Profile / Site: ${dc} — ${site}`,
    `Type: ${typeLabel}. Prefer live UI; do not assert exact backend numeric values unless specified.`,
    'Columns: Test Case ID | Type | Module | Submodule | Title | Steps | Expected Results | Status',
    `Header style: bold white text on #1F4E79`,
    `Total cases: ${enriched.length}${firstId ? ` (${firstId} .. ${lastId})` : ''}`,
  ];
  if (opts.automation) noteLines.push(`Automation: ${opts.automation}`);
  if (opts.helpLine && opts.helpLine !== opts.automation) noteLines.push(opts.helpLine);
  if (opts.executionStatus) noteLines.push(`Execution status: ${opts.executionStatus}`);
  if (opts.executionNote) noteLines.push(`Execution note: ${opts.executionNote}`);
  for (const extra of opts.notes || []) noteLines.push(extra);
  noteLines.forEach((line, i) => {
    notes.addRow([line]);
    if (i === 0) notes.getRow(1).font = { bold: true, size: 12 };
  });

  fs.mkdirSync(path.dirname(opts.outPath), { recursive: true });
  let written = opts.outPath;
  try {
    await workbook.xlsx.writeFile(opts.outPath);
  } catch (err) {
    if (!err || err.code !== 'EBUSY') throw err;
    written = opts.outPath.replace(/\.xlsx$/i, '_run.xlsx');
    await workbook.xlsx.writeFile(written);
    console.warn(`Primary locked; wrote fallback → ${written}`);
  }
  return { path: written, count: enriched.length };
}

/**
 * Map heterogeneous header names from existing manuals → standard fields.
 */
function mapRowFromHeaders(headers, values) {
  const h = headers.map((x) => String(x || '').toLowerCase().trim());
  const get = (...names) => {
    for (const name of names) {
      const i = h.findIndex((x) => x === name || x.includes(name));
      if (i >= 0 && values[i] != null && String(values[i]).trim() !== '') return String(values[i]);
    }
    return '';
  };
  return {
    id: get('test case id', 'tc id', 'id'),
    type: get('type') || 'Regression',
    module: get('module'),
    submodule: get('submodule', 'area', 'sub module'),
    title: get('title'),
    steps: get('steps'),
    expected: get('expected results', 'expected result', 'expected'),
    status: get('status'),
  };
}

async function readCasesFromWorkbook(filePath) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const preferred = wb.worksheets.find((w) => /regression\s*tcs|manual\s*tcs|smoke\s*manual/i.test(w.name));
  const sheet =
    preferred ||
    wb.worksheets.find((w) => /tc|case/i.test(w.name)) ||
    wb.worksheets[1] ||
    wb.worksheets[0];
  if (!sheet) return { cases: [], meta: {} };

  const headerRow = sheet.getRow(1);
  const headers = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col - 1] = cell.value;
  });
  // trim trailing empties
  while (headers.length && (headers[headers.length - 1] == null || headers[headers.length - 1] === '')) {
    headers.pop();
  }

  const cases = [];
  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const values = [];
    for (let c = 1; c <= headers.length; c++) {
      const v = row.getCell(c).value;
      values.push(v && typeof v === 'object' && v.text != null ? v.text : v);
    }
    if (values.every((v) => v == null || String(v).trim() === '')) continue;
    const mapped = mapRowFromHeaders(headers, values);
    if (!mapped.id && !mapped.title) continue;
    cases.push(mapped);
  }

  // meta from summary
  const summary = wb.getWorksheet('Summary') || wb.worksheets[0];
  const meta = { summaryLines: [] };
  if (summary) {
    for (let r = 1; r <= Math.min(15, summary.rowCount); r++) {
      const cells = [];
      summary.getRow(r).eachCell({ includeEmpty: false }, (cell) => {
        const v = cell.value;
        cells.push(v && typeof v === 'object' && v.text != null ? String(v.text) : String(v ?? ''));
      });
      if (cells.length) meta.summaryLines.push(cells.join(' | '));
    }
  }
  return { cases, meta, sheetName: sheet.name };
}

module.exports = {
  HEADER_FILL,
  styleHeaderRow,
  ensureNumberedSteps,
  ensureNumberedExpected,
  writeRegressionManualWorkbook,
  readCasesFromWorkbook,
  mapRowFromHeaders,
};
