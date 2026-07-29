/**
 * Generates docs/RUM_Bounce_Exit_Analysis_Regression.xlsx
 * Matches RUM PC/PO/AW template: Summary | Regression TCs | Notes
 * Run: node scripts/generate-rum-be-regression-excel.js
 */
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');

const SITE = 'GDC Test Site 2';
const DC = 'US';
const MODULE = 'Real User Monitoring (RUM)';
const AUTOMATION =
  'tests/regression_tests/US2/monitoring/real-user-browser/bounce-and-exit-analysis/rum.bounce-exit.browser.regression.spec.ts';

const cases = [
  { id: 'REG-RUM-BE-001', submodule: 'Navigation', title: 'Page loads via menu/route with correct title', steps: ['1. Login', `2. Ensure site is "${SITE}" (${DC})`, '3. Open Full Menu: Monitoring > Real User Browser > Bounce & Exit Analysis'].join('\n'), expected: ['Title includes Bounce & Exit Analysis', 'URL contains bounce-and-exit-analysis'].join('\n') },
  { id: 'REG-RUM-BE-002', submodule: 'Default Load', title: 'Default metric cards and over-time / by-onload sections render', steps: ['1. Open Bounce & Exit Analysis', '2. Wait for metric cards and chart sections'].join('\n'), expected: ['Metric summary cards visible', 'Over-time and by-onload sections available'].join('\n') },
  { id: 'REG-RUM-BE-003', submodule: 'Top Filters', title: 'Top filter badges present including Bucket Size and Performance Metric', steps: ['1. Locate top badges', '2. Confirm Data Origin, Time Period, Device, Browser, OS, Bucket Size, Performance Metric'].join('\n'), expected: ['Listed badges are present'].join('\n') },
  { id: 'REG-RUM-BE-004', submodule: 'Top Filters', title: 'Expand/collapse page-controls toggle', steps: ['1. Click page-controls-toggle', '2. Toggle again'].join('\n'), expected: ['Control responds without page error'].join('\n') },
  { id: 'REG-RUM-BE-005', submodule: 'Top Filters', title: 'Top filter combo: Data Origin = RUM Browser', steps: ['1. Click Data Originated From', '2. Select RUM Browser → Apply'].join('\n'), expected: ['Badge updates', 'Cards/charts refresh'].join('\n') },
  { id: 'REG-RUM-BE-006', submodule: 'Top Filters', title: 'Top filter combo: Device = Mobile', steps: ['1. Click Device', '2. Check Mobile → Apply'].join('\n'), expected: ['Device badge updates', 'Data refreshes'].join('\n') },
  { id: 'REG-RUM-BE-007', submodule: 'Top Filters', title: 'Top filter combo: Browser = Chrome', steps: ['1. Click Browser', '2. Check Chrome → Apply'].join('\n'), expected: ['Browser badge updates', 'Data refreshes'].join('\n') },
  { id: 'REG-RUM-BE-008', submodule: 'Top Filters', title: 'Top filter combo: OS = Windows', steps: ['1. Click OS', '2. Check Windows → Apply'].join('\n'), expected: ['OS badge updates', 'Data refreshes'].join('\n') },
  { id: 'REG-RUM-BE-009', submodule: 'Top Filters', title: 'Top filter combo: Bucket Size = Auto', steps: ['1. Click Bucket Size', '2. Select Auto → Apply'].join('\n'), expected: ['Bucket Size badge updates', 'Data refreshes'].join('\n') },
  { id: 'REG-RUM-BE-010', submodule: 'Top Filters', title: 'Top filter combo: Time Period = Last 6 Hours', steps: ['1. Click Time Period', '2. Select Last 6 Hours'].join('\n'), expected: ['Time Period badge updates', 'Data refreshes'].join('\n') },
  { id: 'REG-RUM-BE-011', submodule: 'Top Filters', title: 'Top filter combo: Data Origin RUM Browser + Device Desktop + Last 24 Hours', steps: ['1. Apply combined filters'].join('\n'), expected: ['Combined filters apply', 'Data refreshes'].join('\n') },
  { id: 'REG-RUM-BE-012', submodule: 'Top Filters', title: 'Restore Data Origin both + Auto bucket', steps: ['1. Restore Data Origin both', '2. Set Bucket Size Auto'].join('\n'), expected: ['Badges reflect restore', 'Data refreshes'].join('\n') },
  { id: 'REG-RUM-BE-013', submodule: 'Metrics', title: 'Session Exit vs Page View Exit Rate tooltips/labels distinguishable', steps: ['1. Locate Session Exit Rate and Page View Exit Rate cards', '2. Inspect tooltips/labels'].join('\n'), expected: ['Both exit rate concepts are labeled distinctly'].join('\n') },
  { id: 'REG-RUM-BE-014', submodule: 'Over Time', title: 'Bounce / Exit Rate Average Over Time graph', steps: ['1. Select Bounce / Exit Rate Average Over Time', '2. Ensure Graph view'].join('\n'), expected: ['Average over-time graph is visible'].join('\n') },
  { id: 'REG-RUM-BE-015', submodule: 'Over Time', title: 'Average table headers (Date/Onload/Bounce/Exit/Revenue)', steps: ['1. Switch Average Over Time to Table view', '2. Review headers'].join('\n'), expected: ['Headers include Date, Onload, Bounce Rate, Session Exit Rate, Page Exit Rate'].join('\n') },
  { id: 'REG-RUM-BE-016', submodule: 'Over Time', title: 'Bounce Rate By Page Over Time tab + graph/table toggle', steps: ['1. Select Bounce Rate By Page Over Time', '2. Toggle graph and table'].join('\n'), expected: ['Tab loads', 'Graph/table toggle works'].join('\n') },
  { id: 'REG-RUM-BE-017', submodule: 'Over Time', title: 'Session Exit Rate By Page Over Time tab', steps: ['1. Select Session Exit Rate By Page Over Time'].join('\n'), expected: ['Session exit over-time graph visible'].join('\n') },
  { id: 'REG-RUM-BE-018', submodule: 'Over Time', title: 'Page Exit Rate By Page Over Time tab', steps: ['1. Select Page Exit Rate By Page Over Time'].join('\n'), expected: ['Page exit over-time graph visible'].join('\n') },
  { id: 'REG-RUM-BE-019', submodule: 'By Onload', title: 'Average by-onload histogram graph', steps: ['1. Select Bounce / Exit Rate Average By Onload', '2. Graph view'].join('\n'), expected: ['Histogram/graph visible', 'Onload seconds axis labeling present'].join('\n') },
  { id: 'REG-RUM-BE-020', submodule: 'By Onload', title: 'Average by-onload table headers', steps: ['1. Switch by-onload average to Table'].join('\n'), expected: ['Headers include Seconds, Sessions, Bounce Rate'].join('\n') },
  { id: 'REG-RUM-BE-021', submodule: 'By Onload', title: 'Bounce / Session Exit / Page Exit by-page onload tabs', steps: ['1. Switch between by-onload by-page tabs'].join('\n'), expected: ['Each tab refreshes without error'].join('\n') },
  { id: 'REG-RUM-BE-022', submodule: 'Overview Table', title: 'Bounce Rate and Onload Previous 7 Days / 30 Day Average table', steps: ['1. Locate Bounce Rate and Onload - Previous 7 Days', '2. Toggle 7 Day Table if needed', '3. Observe 30 Day Average and color cues'].join('\n'), expected: ['Table visible with Page Name / daily / 30 Day Average', 'Red/green cues soft-checked when present'].join('\n') },
  { id: 'REG-RUM-BE-023', submodule: 'Export', title: 'Export menu sample near over-time table', steps: ['1. Open Export near Average Over Time table'].join('\n'), expected: ['CSV (and related) options available'].join('\n') },
  { id: 'REG-RUM-BE-024', submodule: 'Markers', title: 'Markers dropdown lists Hide/Show/Toggle/Create options', steps: ['1. Open markers dropdown'].join('\n'), expected: ['Hide All, Show All, Toggle Custom/Global, Create Custom/Global present'].join('\n') },
  { id: 'REG-RUM-BE-025', submodule: 'Markers', title: 'Toggle Hide All / Show All Markers', steps: ['1. Hide All', '2. Show All'].join('\n'), expected: ['Options apply without page error'].join('\n') },
  { id: 'REG-RUM-BE-026', submodule: 'Markers', title: 'Create Custom Marker opens create form in new tab', steps: ['1. Choose Create Custom Marker'].join('\n'), expected: ['site-level-events/create opens'].join('\n') },
  { id: 'REG-RUM-BE-027', submodule: 'Markers', title: 'Create Global Marker opens create form in new tab', steps: ['1. Choose Create Global Marker'].join('\n'), expected: ['global-level-events/create opens'].join('\n') },
  { id: 'REG-RUM-BE-028', submodule: 'Markers', title: 'Create Custom Marker record and find via search', steps: ['1. Create custom marker', '2. Search list'].join('\n'), expected: ['Marker findable via search'].join('\n') },
  { id: 'REG-RUM-BE-029', submodule: 'Markers', title: 'Create Global Marker record and find via search', steps: ['1. Create global marker', '2. Search list'].join('\n'), expected: ['Marker findable via search'].join('\n') },
  { id: 'REG-RUM-BE-030', submodule: 'Filters', title: 'Right-nav Filters sample (data origin) refreshes cards/charts', steps: ['1. Open Filters', '2. Change Data Origin', '3. Apply Filters (do not Save)'].join('\n'), expected: ['Cards/charts refresh'].join('\n') },
  { id: 'REG-RUM-BE-031', submodule: 'Time Period', title: 'Time Period Last 6 hours refreshes data', steps: ['1. Filters → Last 6 hours → Apply'].join('\n'), expected: ['Data reloads for 6 hour window'].join('\n') },
  { id: 'REG-RUM-BE-032', submodule: 'Time Period', title: 'Time Period Last 24 hours refreshes data', steps: ['1. Filters → Last 24 hours → Apply'].join('\n'), expected: ['Data reloads for 24 hour window'].join('\n') },
  { id: 'REG-RUM-BE-033', submodule: 'Time Period', title: 'Time Period Last 7 days refreshes data', steps: ['1. Filters → Last 7 days → Apply'].join('\n'), expected: ['Data reloads for 7 day window'].join('\n') },
  { id: 'REG-RUM-BE-034', submodule: 'Time Period', title: 'Time Period Last 30 days refreshes data', steps: ['1. Filters → Last 30 days → Apply'].join('\n'), expected: ['Data reloads for 30 day window'].join('\n') },
  { id: 'REG-RUM-BE-035', submodule: 'UI', title: 'Info / tooltip sample on cards or tabs', steps: ['1. Inspect i-icons / data-original-title on cards/tabs'].join('\n'), expected: ['Tooltip/attribute information available or Filters/Share visible'].join('\n') },
  { id: 'REG-RUM-BE-036', submodule: 'UI', title: 'Top-nav Filters / Share controls remain usable', steps: ['1. Confirm Filters and Share icons'].join('\n'), expected: ['Controls are visible'].join('\n') },
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
  summary.addRow(['RUM Bounce & Exit Analysis — Regression Summary']);
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
    { header: 'Expected Results', key: 'expected', width: 68 },
    { header: 'Status', key: 'status', width: 14 },
  ];
  styleHeader(sheet.getRow(1));
  for (const row of enriched) {
    const r = sheet.addRow(row);
    r.alignment = { vertical: 'top', wrapText: true };
    r.height = 90;
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
  notes.addRow(['Blue Triangle Portal — RUM Bounce & Exit Analysis (Browser) Regression']);
  notes.addRow([`Profile / Site: ${DC} — ${SITE}`]);
  notes.addRow(['Includes write coverage for Create Custom/Global Marker. Filter Save is not exercised.']);
  notes.addRow(['±15% red/green coloring on 7-day overview is soft-checked when samples exist.']);
  notes.addRow([`Automation: ${AUTOMATION}`]);
  notes.getRow(1).font = { bold: true };

  const outDir = path.join(__dirname, '..', 'docs');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'RUM_Bounce_Exit_Analysis_Regression.xlsx');
  await workbook.xlsx.writeFile(outPath);
  console.log(`Wrote ${enriched.length} test cases → ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
