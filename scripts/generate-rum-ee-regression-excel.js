/**
 * Generates docs/RUM_Errors_Explorer_Regression.xlsx
 * Matches RUM PC/PO/AW/BE template: Summary | Regression TCs | Notes
 * Run: node scripts/generate-rum-ee-regression-excel.js
 */
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');

const SITE = 'GDC Test Site 2';
const DC = 'US';
const MODULE = 'Real User Monitoring (RUM)';
const AUTOMATION =
  'tests/regression_tests/US2/monitoring/real-user-browser/errors-explorer/rum.errors-explorer.browser.regression.spec.ts';

const cases = [
  { id: 'REG-RUM-EE-001', submodule: 'Navigation', title: 'Page loads via menu/route with correct title', steps: ['1. Login', `2. Ensure site is "${SITE}" (${DC})`, '3. Open Full Menu: Monitoring > Real User Browser > Errors Explorer'].join('\n'), expected: ['Title includes Errors Explorer', 'URL contains javascript-errors/real-user'].join('\n') },
  { id: 'REG-RUM-EE-002', submodule: 'Default Load', title: 'Default Errors By Type / Over Time / Errors table render', steps: ['1. Open Errors Explorer', '2. Wait for widgets'].join('\n'), expected: ['Errors By Type, Errors Over Time, and Errors table visible'].join('\n') },
  { id: 'REG-RUM-EE-003', submodule: 'Top Filters', title: 'Top filter badges present (incl. Bot Traffic / Error Types)', steps: ['1. Locate top badges', '2. Confirm Data Origin, Time Period, Device, Browser, OS, Bot Traffic, Bucket Size, Error Types'].join('\n'), expected: ['Listed badges are present (Bucket Size / Error Types soft if layout differs)'].join('\n') },
  { id: 'REG-RUM-EE-004', submodule: 'Top Filters', title: 'Expand/collapse page-controls toggle', steps: ['1. Click page-controls-toggle', '2. Toggle again'].join('\n'), expected: ['Control responds without page error'].join('\n') },
  { id: 'REG-RUM-EE-005', submodule: 'Top Filters', title: 'Top filter combo: Data Origin = RUM Browser', steps: ['1. Click Data Originated From', '2. Select RUM Browser → Apply'].join('\n'), expected: ['Badge updates', 'Widgets refresh'].join('\n') },
  { id: 'REG-RUM-EE-006', submodule: 'Top Filters', title: 'Top filter combo: Device = Mobile', steps: ['1. Click Device', '2. Check Mobile → Apply'].join('\n'), expected: ['Device badge updates', 'Data refreshes'].join('\n') },
  { id: 'REG-RUM-EE-007', submodule: 'Top Filters', title: 'Top filter combo: Browser = Chrome', steps: ['1. Click Browser', '2. Check Chrome → Apply'].join('\n'), expected: ['Browser badge updates', 'Data refreshes'].join('\n') },
  { id: 'REG-RUM-EE-008', submodule: 'Top Filters', title: 'Top filter combo: OS = Windows', steps: ['1. Click OS', '2. Check Windows → Apply'].join('\n'), expected: ['OS badge updates', 'Data refreshes'].join('\n') },
  { id: 'REG-RUM-EE-009', submodule: 'Top Filters', title: 'Top filter combo: Bot Traffic = Exclude Bots', steps: ['1. Click Bot Traffic', '2. Select Exclude Bots → Apply'].join('\n'), expected: ['Bot Traffic badge updates', 'Data refreshes'].join('\n') },
  { id: 'REG-RUM-EE-010', submodule: 'Top Filters', title: 'Top filter combo: Time Period = Last 6 Hours', steps: ['1. Click Time Period', '2. Select Last 6 Hours'].join('\n'), expected: ['Time Period badge updates', 'Data refreshes'].join('\n') },
  { id: 'REG-RUM-EE-011', submodule: 'Top Filters', title: 'Top filter combo: Data Origin RUM Browser + Device Desktop + Last 24 Hours', steps: ['1. Apply combined filters'].join('\n'), expected: ['Combined filters apply', 'Data refreshes'].join('\n') },
  { id: 'REG-RUM-EE-012', submodule: 'Top Filters', title: 'Restore Data Origin both + Exclude Bots', steps: ['1. Restore Data Origin both', '2. Set Bot Traffic Exclude Bots'].join('\n'), expected: ['Badges reflect restore', 'Data refreshes'].join('\n') },
  { id: 'REG-RUM-EE-013', submodule: 'Errors By Type', title: 'Errors By Type donuts + type breakdown labels', steps: ['1. Locate All Errors and Unique Errors', '2. Confirm totals render', '3. Sample type labels (Range/Syntax/Type/CSP/XHR/Fetch/Other)', '4. Soft-toggle legend'].join('\n'), expected: ['Donuts visible with totals', 'At least one type label present'].join('\n') },
  { id: 'REG-RUM-EE-014', submodule: 'Top Charts', title: 'Top Charts section widgets visible', steps: ['1. Confirm Top Locations/Domains/Pages/Devices/OS/Browsers'].join('\n'), expected: ['Each Top chart widget is visible'].join('\n') },
  { id: 'REG-RUM-EE-015', submodule: 'Top Charts', title: 'Click Top Locations row applies filter (preview / refresh)', steps: ['1. Click a Top Locations table row', '2. Observe Errors Over Time and Errors table'].join('\n'), expected: ['Widgets refresh with applied location filter (sampled)'].join('\n') },
  { id: 'REG-RUM-EE-016', submodule: 'Top Charts', title: 'Top Domains click soft-note (may NOT filter Over Time)', steps: ['1. Click a Top Domains row', '2. Note Help Center exception'].join('\n'), expected: ['Click does not error', 'Soft-note that Domains may not filter Over Time'].join('\n') },
  { id: 'REG-RUM-EE-017', submodule: 'Top Charts', title: 'Click Top Pages row refreshes Over Time / table', steps: ['1. Click a Top Pages row'].join('\n'), expected: ['Over Time and Errors table refresh'].join('\n') },
  { id: 'REG-RUM-EE-018', submodule: 'Top Charts', title: 'Click Top Devices row refreshes widgets', steps: ['1. Click a Top Devices row'].join('\n'), expected: ['Widgets refresh'].join('\n') },
  { id: 'REG-RUM-EE-019', submodule: 'Over Time', title: 'Errors Over Time histogram + legend toggle', steps: ['1. Locate Errors Over Time', '2. Toggle 1–2 legend items'].join('\n'), expected: ['Histogram visible', 'Legend toggle responds'].join('\n') },
  { id: 'REG-RUM-EE-020', submodule: 'Errors Table', title: 'Errors table headers (type/file/message/counts)', steps: ['1. Inspect Errors table headers'].join('\n'), expected: ['Headers include error type, file, message (and related count columns)'].join('\n') },
  { id: 'REG-RUM-EE-021', submodule: 'Errors Table', title: 'Errors table search sample', steps: ['1. Enter search term in Errors table search if present'].join('\n'), expected: ['Search control works or soft-skipped if absent'].join('\n') },
  { id: 'REG-RUM-EE-022', submodule: 'Export', title: 'Export menu sample near Errors table', steps: ['1. Open Export near Errors table'].join('\n'), expected: ['CSV (and related) options available when Export present'].join('\n') },
  { id: 'REG-RUM-EE-023', submodule: 'Drill-down', title: 'Open Error Drill-down from Errors table row', steps: ['1. Click an Errors table row', '2. Verify drill-down widgets (Error Details / Over Time / Pages with Errors / Top Error)', '3. Soft-interact scatter/table', '4. Return to Errors Explorer'].join('\n'), expected: ['Drill-down opens (same tab or popup)', 'Key widgets visible', 'Return succeeds', 'Soft if no rows'].join('\n') },
  { id: 'REG-RUM-EE-024', submodule: 'Markers', title: 'Markers dropdown lists Hide/Show/Toggle/Create options', steps: ['1. Open markers dropdown'].join('\n'), expected: ['Hide All, Show All, Toggle Custom/Global, Create Custom/Global present'].join('\n') },
  { id: 'REG-RUM-EE-025', submodule: 'Markers', title: 'Toggle Hide All / Show All Markers', steps: ['1. Hide All', '2. Show All'].join('\n'), expected: ['Options apply without page error'].join('\n') },
  { id: 'REG-RUM-EE-026', submodule: 'Markers', title: 'Create Custom Marker opens create form in new tab', steps: ['1. Choose Create Custom Marker'].join('\n'), expected: ['site-level-events/create opens'].join('\n') },
  { id: 'REG-RUM-EE-027', submodule: 'Markers', title: 'Create Global Marker opens create form in new tab', steps: ['1. Choose Create Global Marker'].join('\n'), expected: ['global-level-events/create opens'].join('\n') },
  { id: 'REG-RUM-EE-028', submodule: 'Markers', title: 'Create Custom Marker record and find via search', steps: ['1. Create custom marker', '2. Search list'].join('\n'), expected: ['Marker findable via search'].join('\n') },
  { id: 'REG-RUM-EE-029', submodule: 'Markers', title: 'Create Global Marker record and find via search', steps: ['1. Create global marker', '2. Search list'].join('\n'), expected: ['Marker findable via search'].join('\n') },
  { id: 'REG-RUM-EE-030', submodule: 'Filters', title: 'Right-nav Filters sample (data origin) refreshes widgets', steps: ['1. Open Filters', '2. Change Data Origin', '3. Apply Filters (do not Save)'].join('\n'), expected: ['Widgets refresh'].join('\n') },
  { id: 'REG-RUM-EE-031', submodule: 'Time Period', title: 'Time Period Last 6 hours refreshes data', steps: ['1. Filters → Last 6 hours → Apply'].join('\n'), expected: ['Data reloads for 6 hour window'].join('\n') },
  { id: 'REG-RUM-EE-032', submodule: 'Time Period', title: 'Time Period Last 24 hours refreshes data', steps: ['1. Filters → Last 24 hours → Apply'].join('\n'), expected: ['Data reloads for 24 hour window'].join('\n') },
  { id: 'REG-RUM-EE-033', submodule: 'Time Period', title: 'Time Period Last 7 days refreshes data', steps: ['1. Filters → Last 7 days → Apply'].join('\n'), expected: ['Data reloads for 7 day window'].join('\n') },
  { id: 'REG-RUM-EE-034', submodule: 'Time Period', title: 'Time Period Last 30 days refreshes data', steps: ['1. Filters → Last 30 days → Apply'].join('\n'), expected: ['Data reloads for 30 day window'].join('\n') },
  { id: 'REG-RUM-EE-035', submodule: 'Filters', title: 'Clear JS error filters control when present', steps: ['1. Click #js-error-clear-filters if visible'].join('\n'), expected: ['Filters clear and widgets refresh'].join('\n') },
  { id: 'REG-RUM-EE-036', submodule: 'UI', title: 'Info / tooltip sample on widgets', steps: ['1. Inspect i-icons / tooltips'].join('\n'), expected: ['Tooltip/attribute information available or Filters visible'].join('\n') },
  { id: 'REG-RUM-EE-037', submodule: 'UI', title: 'Top-nav Filters / Share controls remain usable', steps: ['1. Confirm Filters and Share icons'].join('\n'), expected: ['Filters visible; Share soft if layout differs'].join('\n') },
];

function styleHeader(row) {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
  row.alignment = { vertical: 'middle', wrapText: true };
}

async function main() {
  const enriched = cases.map((c) => ({
    testCaseId: c.id,
    type: 'Regression',
    module: MODULE,
    submodule: c.submodule,
    title: c.title,
    steps: c.steps,
    expected: c.expected,
    status: 'Not Executed',
  }));

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'BTT Playwright Automation';
  workbook.created = new Date();

  const summary = workbook.addWorksheet('Summary', { views: [{ state: 'frozen', ySplit: 3 }] });
  summary.getColumn(1).width = 36;
  summary.getColumn(2).width = 18;
  summary.addRow(['RUM Errors Explorer — Regression Summary']);
  summary.getRow(1).font = { bold: true, size: 14 };
  summary.addRow([`Site: ${DC} — ${SITE}`]);
  summary.addRow([`Total cases: ${enriched.length}`]);
  summary.addRow([]);
  summary.addRow(['Submodule', 'Count']);
  styleHeader(summary.getRow(5));
  const bySub = {};
  for (const c of enriched) bySub[c.submodule] = (bySub[c.submodule] || 0) + 1;
  for (const [k, v] of Object.entries(bySub).sort(([a], [b]) => a.localeCompare(b))) {
    summary.addRow([k, v]);
  }

  const sheet = workbook.addWorksheet('Regression TCs', { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = [
    { header: 'Test Case ID', key: 'testCaseId', width: 18 },
    { header: 'Type', key: 'type', width: 12 },
    { header: 'Module', key: 'module', width: 28 },
    { header: 'Submodule', key: 'submodule', width: 16 },
    { header: 'Title', key: 'title', width: 62 },
    { header: 'Steps', key: 'steps', width: 68 },
    { header: 'Expected Results', key: 'expected', width: 56 },
    { header: 'Status', key: 'status', width: 14 },
  ];
  styleHeader(sheet.getRow(1));
  for (const row of enriched) {
    const r = sheet.addRow(row);
    r.alignment = { vertical: 'top', wrapText: true };
  }

  const notes = workbook.addWorksheet('Notes');
  notes.getColumn(1).width = 100;
  notes.addRow(['Notes']);
  notes.getRow(1).font = { bold: true, size: 12 };
  notes.addRow([`Automation: ${AUTOMATION}`]);
  notes.addRow(['Do not assert exact backend numeric values — labels, visibility, refresh, drill-down, sampled presence only.']);
  notes.addRow(['Do not Save Filter. Marker Create Custom/Global is intentional write coverage.']);
  notes.addRow(['Help Center: clicking Top Domains may NOT apply filter to Errors Over Time.']);
  notes.addRow(['Drill-down soft-continues when no clickable Errors table rows are available.']);
  notes.addRow(['No API / Database assertions.']);

  const out = path.join(__dirname, '..', 'docs', 'RUM_Errors_Explorer_Regression.xlsx');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await workbook.xlsx.writeFile(out);
  console.log(`Wrote ${out} (${enriched.length} cases)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
