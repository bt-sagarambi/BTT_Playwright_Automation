/**
 * Generates docs/Core_Web_Vitals_Regression.xlsx
 * Same format as BTT_Smoke_Manual_Test_Cases.xlsx:
 *   Test Case ID | Type | Module | Submodule | Title | Steps | Expected Results | Status
 *
 * Run: node scripts/generate-core-web-vitals-regression-excel.js
 */
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');

const SITE = 'GDC Test Site 2';
const DC = 'US';
const MODULE = 'Business Insights — Improve Traffic';
const AUTOMATION =
  'tests/regression_tests/US2/business-insights/improve-traffic/core-web-vitals/core.web.vitals.regression.spec.ts';

const cases = [
  {
    id: 'REG-CWV-001',
    submodule: 'Navigation',
    title: 'page loads via BI Core Web Vitals menu/route with correct title',
    steps: [
      '1. Login to Blue Triangle portal (if not already logged in)',
      `2. Ensure site dropdown is set to "${SITE}" (${DC} instance)`,
      '3. Open Full Menu path: Business Insights > Improve Traffic > Core Web Vitals (VitalScope) (or navigate via route)',
      '4. Wait for the page to finish loading',
      '5. Observe page title/breadcrumb and browser URL',
    ].join('\n'),
    expected: [
      'Page title / breadcrumb includes Business Insights / Improve Traffic / Core Web Vitals (VitalScope)',
      'URL contains real-user-monitoring/performance-overview',
      'User remains authenticated',
    ].join('\n'),
  },
  {
    id: 'REG-CWV-002',
    submodule: 'Default Load',
    title: 'Default Performance by Page table and sections render',
    steps: [
      '1. Open Core Web Vitals (VitalScope) via Business Insights > Improve Traffic for GDC Test Site 2',
      '2. Wait for Performance by Page table to render',
      '3. Confirm table has one or more data rows',
      '4. Confirm related overview headings/sections are present',
    ].join('\n'),
    expected: [
      'Performance by Page table is visible with data rows',
      'Overview / related section chrome is present (e.g. Performance Overview or Performance By Country)',
    ].join('\n'),
  },
  {
    id: 'REG-CWV-003',
    submodule: 'Performance by Page',
    title: 'Table headers include Page Name and CWV metrics',
    steps: [
      '1. On Core Web Vitals (VitalScope), locate the Performance by Page table',
      '2. Review column headers',
    ].join('\n'),
    expected: [
      'Headers include Page Name',
      'Headers include at least one of Page Views / Onload / LCP / INP / CLS (or equivalent CWV labels)',
    ].join('\n'),
  },
  {
    id: 'REG-CWV-004',
    submodule: 'Top Filters',
    title: 'Top filter badges visible after View Filters',
    steps: [
      '1. Click View Filters if the top badge strip is hidden',
      '2. Confirm Data Originated From, Time Period, Device, Browser badges',
    ].join('\n'),
    expected: ['Top filter badges above the Performance by Page area are visible'].join('\n'),
  },
  {
    id: 'REG-CWV-005',
    submodule: 'Top Filters',
    title: 'Top filter combo: Data Origin = RUM Browser (grid refreshes)',
    steps: [
      '1. Open Data Originated From badge',
      '2. Select RUM Browser → Apply',
      '3. Confirm badge text and Performance by Page grid refresh',
    ].join('\n'),
    expected: ['Badge shows RUM Browser', 'Grid/table still shows data rows'].join('\n'),
  },
  {
    id: 'REG-CWV-006',
    submodule: 'Top Filters',
    title: 'Top filter combo: Data Origin = Native Webview',
    steps: ['1. Data Origin = Native Webview → Apply', '2. Confirm grid refresh'].join('\n'),
    expected: ['Badge updates', 'Performance by Page grid refreshes'].join('\n'),
  },
  {
    id: 'REG-CWV-007',
    submodule: 'Top Filters',
    title: 'Top filter combo: Device = Mobile',
    steps: ['1. Device badge → Mobile → Apply', '2. Confirm grid refresh'].join('\n'),
    expected: ['Device badge updates', 'Grid refreshes'].join('\n'),
  },
  {
    id: 'REG-CWV-008',
    submodule: 'Top Filters',
    title: 'Top filter combo: Device = Desktop',
    steps: ['1. Device badge → Desktop → Apply'].join('\n'),
    expected: ['Device badge updates', 'Grid refreshes'].join('\n'),
  },
  {
    id: 'REG-CWV-009',
    submodule: 'Top Filters',
    title: 'Top filter combo: Browser = Chrome',
    steps: ['1. Browser badge → Chrome → Apply'].join('\n'),
    expected: ['Browser badge updates', 'Grid refreshes'].join('\n'),
  },
  {
    id: 'REG-CWV-010',
    submodule: 'Top Filters',
    title: 'Top filter combo: Browser = Safari',
    steps: ['1. Browser badge → Safari → Apply'].join('\n'),
    expected: ['Browser badge updates', 'Grid refreshes'].join('\n'),
  },
  {
    id: 'REG-CWV-011',
    submodule: 'Top Filters',
    title: 'Top filter combo: Time Period = Last 6 Hours',
    steps: ['1. Time Period badge → Last 6 Hours', '2. Confirm grid refresh'].join('\n'),
    expected: ['Time Period badge updates', 'Grid refreshes'].join('\n'),
  },
  {
    id: 'REG-CWV-012',
    submodule: 'Top Filters',
    title: 'Top filter combo: Data Origin RUM Browser + Device Mobile',
    steps: ['1. Apply Data Origin = RUM Browser', '2. Apply Device = Mobile'].join('\n'),
    expected: ['Both badges reflect selections', 'Grid refreshes'].join('\n'),
  },
  {
    id: 'REG-CWV-013',
    submodule: 'Top Filters',
    title: 'Top filter combo: Data Origin RUM Browser + Browser Chrome',
    steps: ['1. Apply Data Origin = RUM Browser', '2. Apply Browser = Chrome'].join('\n'),
    expected: ['Both badges reflect selections', 'Grid refreshes'].join('\n'),
  },
  {
    id: 'REG-CWV-014',
    submodule: 'Top Filters',
    title: 'Top filter combo: Device Desktop + Browser Firefox',
    steps: ['1. Apply Device = Desktop', '2. Apply Browser = Firefox'].join('\n'),
    expected: ['Both badges reflect selections', 'Grid refreshes'].join('\n'),
  },
  {
    id: 'REG-CWV-015',
    submodule: 'Top Filters',
    title: 'Top filter combo: Device Mobile + Browser Safari + Last 24 Hours',
    steps: [
      '1. Apply Time Period = Last 24 Hours',
      '2. Apply Device = Mobile',
      '3. Apply Browser = Safari',
    ].join('\n'),
    expected: ['All filters reflected', 'Performance by Page grid refreshes'].join('\n'),
  },
  {
    id: 'REG-CWV-016',
    submodule: 'Top Filters',
    title: 'Top filter combo: Native Webview + Desktop + Edge',
    steps: [
      '1. Data Origin = Native Webview',
      '2. Device = Desktop',
      '3. Browser = Edge',
    ].join('\n'),
    expected: ['Badges reflect combination', 'Grid refreshes'].join('\n'),
  },
  {
    id: 'REG-CWV-017',
    submodule: 'Top Filters',
    title: 'Top filter combo: restore Data Origin both + Last 7 Days',
    steps: [
      '1. Data Origin = RUM Browser & Native Webview',
      '2. Time Period = Last 7 Days',
    ].join('\n'),
    expected: ['Defaults restored for sampled fields', 'Grid refreshes'].join('\n'),
  },
  {
    id: 'REG-CWV-018',
    submodule: 'Top 50 URLs',
    title: 'Expand Top 50 URLs for a page',
    steps: [
      '1. In Performance by Page, locate the chevron / "Show top 50 URLs" control on a page row',
      '2. Expand the row',
      '3. Observe expanded URL list and action icons',
    ].join('\n'),
    expected: [
      'Top URLs for the page are listed',
      'First two clickable icons (Copy URL and Run Synthetic Instant Measurement) are visible',
    ].join('\n'),
  },
  {
    id: 'REG-CWV-019',
    submodule: 'Top 50 URLs',
    title: 'Copy URL icon copies expanded URL to clipboard',
    steps: [
      '1. Expand Top 50 URLs for a page',
      '2. Click the Copy URL icon (first icon)',
      '3. Paste / inspect clipboard contents',
    ].join('\n'),
    expected: ['Clipboard contains an http(s) URL for the expanded row'].join('\n'),
  },
  {
    id: 'REG-CWV-020',
    submodule: 'Top 50 URLs',
    title: 'Instant Measurement icon opens Synthetic Instant in new tab',
    steps: [
      '1. Expand Top 50 URLs for a page',
      '2. Click Run Synthetic Instant Measurement (bolt icon)',
      '3. Observe the new browser tab',
      '4. Close the new tab when finished',
    ].join('\n'),
    expected: [
      'A new tab opens to Synthetic Instant Measurement',
      'URL includes synthetic-monitors/instant (or equivalent Instant Measurement route)',
    ].join('\n'),
  },
  {
    id: 'REG-CWV-021',
    submodule: 'Top 50 URLs',
    title: 'Expanded URL click opens Performance Detail in new tab',
    steps: [
      '1. Expand Top 50 URLs for a page',
      '2. Click a URL text / "See details" row',
      '3. Observe the new browser tab',
      '4. Close the new tab when finished',
    ].join('\n'),
    expected: [
      'A new tab opens to Real User Performance Detail',
      'URL contains real-user-monitoring/performance-detail',
    ].join('\n'),
  },
  {
    id: 'REG-CWV-022',
    submodule: 'VitalScope',
    title: 'VitalScope metric icon opens drilldown modal with table',
    steps: [
      '1. In Performance by Page, locate a CWV cell with VitalScope Data Available (chart-line icon)',
      '2. Click the VitalScope icon',
      '3. Wait for the drilldown modal to load',
      '4. Close the modal',
    ].join('\n'),
    expected: [
      'vsDrilldown modal opens',
      'Modal body contains a data table (metric drilldown rows)',
    ].join('\n'),
  },
  {
    id: 'REG-CWV-023',
    submodule: 'Customize Table',
    title: 'Customize Table opens with include/exclude/reset/default/save',
    steps: [
      '1. Click Customize Table',
      '2. Review modal controls: Include All, Exclude All, Reset, Default, Save & Close',
    ].join('\n'),
    expected: [
      'Customize Table modal opens',
      'Include All, Exclude All, Reset, Default, and Save & Close controls are present',
    ].join('\n'),
  },
  {
    id: 'REG-CWV-024',
    submodule: 'Customize Table',
    title: 'Customize Table Save & Close persists and returns to table',
    steps: [
      '1. Open Customize Table',
      '2. Optionally adjust included/excluded columns (sampled)',
      '3. Click Save & Close',
    ].join('\n'),
    expected: [
      'Modal closes',
      'Performance by Page table remains visible after save',
    ].join('\n'),
  },
  {
    id: 'REG-CWV-025',
    submodule: 'Export',
    title: 'Hamburger export exposes CSV download',
    steps: [
      '1. Open the Performance by Page hamburger / context menu',
      '2. Choose Download CSV (or equivalent)',
    ].join('\n'),
    expected: ['CSV download option is available and download starts (or menu item is present)'].join('\n'),
  },
  {
    id: 'REG-CWV-026',
    submodule: 'Breakdown Tables',
    title: 'Performance By Country section is present',
    steps: [
      '1. Scroll to Performance By Country',
      '2. Confirm section/table chrome is visible',
    ].join('\n'),
    expected: ['Performance By Country heading/section is visible'].join('\n'),
  },
  {
    id: 'REG-CWV-027',
    submodule: 'Geography',
    title: 'Performance By Geography world map renders',
    steps: [
      '1. Scroll to the world map / geography chart',
      '2. Confirm Highcharts map container is visible',
    ].join('\n'),
    expected: ['#world-map (or equivalent geography chart) is visible'].join('\n'),
  },
  {
    id: 'REG-CWV-028',
    submodule: 'Geography',
    title: 'Geography Zoom in / Zoom out controls respond',
    steps: [
      '1. On the world map, click Zoom in',
      '2. Click Zoom out',
    ].join('\n'),
    expected: ['Zoom in and/or Zoom out controls are present and respond to click'].join('\n'),
  },
  {
    id: 'REG-CWV-029',
    submodule: 'Filters',
    title: 'View Filters toggle shows or hides filter banner',
    steps: [
      '1. Click View Filters / Hide Filters control',
      '2. Observe filter banner visibility',
      '3. Toggle again to restore preferred state',
    ].join('\n'),
    expected: ['Filter banner visibility changes (or control remains available without error)'].join('\n'),
  },
  {
    id: 'REG-CWV-030',
    submodule: 'Filters',
    title: 'Right-nav Filters open and Apply Filters works (sample)',
    steps: [
      '1. Open Filters (right nav)',
      '2. Leave a sampled default combination',
      '3. Click Apply Filters',
    ].join('\n'),
    expected: [
      'Apply Filters is available',
      'Performance by Page table remains/refreshes successfully',
    ].join('\n'),
  },
  {
    id: 'REG-CWV-031',
    submodule: 'Time Period',
    title: 'Time Period Last 6 hours refreshes overview table',
    steps: [
      '1. From Core Web Vitals page, open Filters → Time Period',
      '2. Select Last 6 hours',
      '3. Apply Filters',
      '4. Confirm table refreshes',
    ].join('\n'),
    expected: ['Table remains visible with data after Last 6 hours is applied'].join('\n'),
  },
  {
    id: 'REG-CWV-032',
    submodule: 'Time Period',
    title: 'Time Period Last 24 hours refreshes overview table',
    steps: [
      '1. From Core Web Vitals page, open Filters → Time Period',
      '2. Select Last 24 hours',
      '3. Apply Filters',
    ].join('\n'),
    expected: ['Table remains visible with data after Last 24 hours is applied'].join('\n'),
  },
  {
    id: 'REG-CWV-033',
    submodule: 'Time Period',
    title: 'Time Period Last 7 days refreshes overview table',
    steps: [
      '1. From Core Web Vitals page, open Filters → Time Period',
      '2. Select Last 7 days',
      '3. Apply Filters',
    ].join('\n'),
    expected: ['Table remains visible with data after Last 7 days is applied'].join('\n'),
  },
  {
    id: 'REG-CWV-034',
    submodule: 'Time Period',
    title: 'Time Period Last 30 days refreshes overview table',
    steps: [
      '1. From Core Web Vitals page, open Filters → Time Period',
      '2. Select Last 30 days',
      '3. Apply Filters',
    ].join('\n'),
    expected: ['Table remains visible with data after Last 30 days is applied'].join('\n'),
  },
  {
    id: 'REG-CWV-035',
    submodule: 'Navigation',
    title: 'Favorites section optional soft-check via left nav',
    steps: [
      '1. Open left navigation',
      '2. Look for a Favorites section / star affordance (optional)',
    ].join('\n'),
    expected: [
      'If Favorites UI exists for the user/site, it is discoverable',
      'Absence of Favorites is non-fatal (optional coverage)',
    ].join('\n'),
  },
];

function styleHeader(row) {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1F4E79' },
  };
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
  summary.addRow(['Core Web Vitals (VitalScope) — Regression Summary']);
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
    { header: 'Submodule', key: 'submodule', width: 20 },
    { header: 'Title', key: 'title', width: 62 },
    { header: 'Steps', key: 'steps', width: 68 },
    { header: 'Expected Results', key: 'expected', width: 68 },
    { header: 'Status', key: 'status', width: 14 },
  ];
  styleHeader(sheet.getRow(1));
  sheet.getRow(1).height = 22;

  for (const row of enriched) {
    const r = sheet.addRow(row);
    r.alignment = { vertical: 'top', wrapText: true };
    r.height = 110;
  }

  for (let i = 2; i <= enriched.length + 1; i++) {
    sheet.getCell(`H${i}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"Not Executed,Pass,Fail,Blocked,Skipped"'],
    };
  }

  const notes = workbook.addWorksheet('Notes');
  notes.getColumn(1).width = 110;
  notes.addRow(['Blue Triangle Portal — Core Web Vitals (VitalScope) Regression Test Cases']);
  notes.addRow([`Profile / Site: ${DC} — ${SITE}`]);
  notes.addRow([
    'Type: Regression. Navigate via Business Insights > Improve Traffic > Core Web Vitals (VitalScope). Customize Table Save & Close allowed. Do NOT Save Filter.',
  ]);
  notes.addRow([
    'Columns: Test Case ID | Type | Module | Submodule | Title | Steps | Expected Results | Status',
  ]);
  notes.addRow([`Total cases: ${enriched.length} (${enriched[0].testCaseId}..${enriched[enriched.length - 1].testCaseId})`]);
  notes.addRow([`Automation mapping: ${AUTOMATION}`]);
  notes.addRow([
    'Assumptions: copied from Monitoring Performance Overview with navigation updated to BI Core Web Vitals path; coverage is sampled; Favorites optional.',
  ]);
  notes.addRow([
    'Top 50 URL icons: (1) Copy URL, (2) Run Synthetic Instant Measurement; URL text opens Performance Detail in new tab.',
  ]);
  notes.getRow(1).font = { bold: true };

  const outDir = path.join(__dirname, '..', 'docs');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'Core_Web_Vitals_Regression.xlsx');
  await workbook.xlsx.writeFile(outPath);
  console.log(`Wrote ${enriched.length} test cases → ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
