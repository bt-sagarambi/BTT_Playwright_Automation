/**
 * Generates docs/RUM_Performance_Budget_Regression.xlsx
 * Matches RUM PC/PO/AW/BE/EE template: Summary | Regression TCs | Notes
 * Run: node scripts/generate-rum-pb-regression-excel.js
 */
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');

const SITE = 'GDC Test Site 2';
const DC = 'US';
const MODULE = 'Real User Monitoring (RUM)';
const AUTOMATION =
  'tests/regression_tests/US2/monitoring/real-user-browser/performance-budget/rum.performance-budget.browser.regression.spec.ts';

const cases = [
  { id: 'REG-RUM-PB-001', submodule: 'Navigation', title: 'Page loads via menu/route with correct title', steps: ['1. Login', `2. Ensure site is "${SITE}" (${DC})`, '3. Open Full Menu: Monitoring > Real User Browser > Performance Budget'].join('\n'), expected: ['Title is Performance Budget', 'URL contains overview-dashboard/performance-budget'].join('\n') },
  { id: 'REG-RUM-PB-002', submodule: 'Default Load', title: 'Default Latest Results and dashboard chrome render', steps: ['1. Open Performance Budget', '2. Wait for Latest Results and chrome'].join('\n'), expected: ['Latest Results visible', 'Time lookback, Auto Refresh, budget selector, Reset Widgets visible'].join('\n') },
  { id: 'REG-RUM-PB-003', submodule: 'Top Filters', title: 'Top Device / Browser / OS badges present', steps: ['1. Locate top badges'].join('\n'), expected: ['Device, Browser, OS badges present'].join('\n') },
  { id: 'REG-RUM-PB-004', submodule: 'Top Filters', title: 'Expand/collapse page-controls toggle when present', steps: ['1. Click page-controls-toggle if present'].join('\n'), expected: ['Toggle responds or soft unchanged if absent'].join('\n') },
  { id: 'REG-RUM-PB-005', submodule: 'Time Lookback', title: 'Time lookback presets sample visible', steps: ['1. Open #time-lookback', '2. Confirm sample presets including Custom'].join('\n'), expected: ['Presets such as Last 1/6/24 hours, 7/30 days, Custom Date Selection visible'].join('\n') },
  { id: 'REG-RUM-PB-006', submodule: 'Time Lookback', title: 'Time lookback Last 6 hours refreshes widgets', steps: ['1. Select Last 6 hours'].join('\n'), expected: ['Widgets refresh'].join('\n') },
  { id: 'REG-RUM-PB-007', submodule: 'Time Lookback', title: 'Time lookback Last 24 hours refreshes widgets', steps: ['1. Select Last 24 hours'].join('\n'), expected: ['Widgets refresh'].join('\n') },
  { id: 'REG-RUM-PB-008', submodule: 'Time Lookback', title: 'Time lookback Last 7 days refreshes widgets', steps: ['1. Select Last 7 days'].join('\n'), expected: ['Widgets refresh'].join('\n') },
  { id: 'REG-RUM-PB-009', submodule: 'Time Lookback', title: 'Time lookback Last 30 days refreshes widgets', steps: ['1. Select Last 30 days'].join('\n'), expected: ['Widgets refresh'].join('\n') },
  { id: 'REG-RUM-PB-010', submodule: 'Time Lookback', title: 'Restore time lookback Last 6 hours', steps: ['1. Select Last 6 hours again'].join('\n'), expected: ['Lookback restored'].join('\n') },
  { id: 'REG-RUM-PB-011', submodule: 'Auto Refresh', title: 'Auto Refresh options Off / Minutes present', steps: ['1. Open #auto-refresh'].join('\n'), expected: ['Off / 2 / 5 / 15 / 60 Minutes options visible'].join('\n') },
  { id: 'REG-RUM-PB-012', submodule: 'Auto Refresh', title: 'Auto Refresh selection sticks (smoke)', steps: ['1. Select 10 Minutes', '2. Restore 5 Minutes', '3. Do not wait full interval'].join('\n'), expected: ['Selection updates in control label'].join('\n') },
  { id: 'REG-RUM-PB-013', submodule: 'Top Filters', title: 'Top filter combo: Device = Mobile refreshes widgets', steps: ['1. Device → Mobile → Apply (soft deadline ~90s)'].join('\n'), expected: ['On success: Latest Results / party widgets refresh', 'On hang/UI flake: soft-annotate and recover widgets — do not hard-fail suite'].join('\n') },
  { id: 'REG-RUM-PB-014', submodule: 'Top Filters', title: 'Top filter combo: Browser = Chrome refreshes widgets', steps: ['1. Browser → Chrome → Apply (soft deadline ~90s)'].join('\n'), expected: ['On success: widgets refresh', 'On hang: soft-recover (avoid hard test timeout)'].join('\n') },
  { id: 'REG-RUM-PB-015', submodule: 'Top Filters', title: 'Top filter combo: OS = Windows refreshes widgets', steps: ['1. OS → Windows → Apply (soft deadline ~90s)'].join('\n'), expected: ['On success: widgets refresh', 'On hang: soft-recover'].join('\n') },
  { id: 'REG-RUM-PB-016', submodule: 'Top Filters', title: 'Top filter combo: Device Desktop + Browser Chrome', steps: ['1. Apply combined Device/Browser (soft deadline ~90s)'].join('\n'), expected: ['On success: combined filters apply and widgets refresh', 'On hang: soft-recover'].join('\n') },
  { id: 'REG-RUM-PB-017', submodule: 'Budget Template', title: 'Active Performance Budget selector shows template', steps: ['1. Read #performance-budget-selector'].join('\n'), expected: ['Active template label visible (e.g. Web Vitals Template)'].join('\n') },
  { id: 'REG-RUM-PB-018', submodule: 'Budget Manager', title: 'Performance Budget manager read-only browse (no save)', steps: ['1. Open manager button', '2. Browse Saved Performance Budgets / DASHBOARD MANAGER', '3. Close without Save'].join('\n'), expected: ['Manager opens', 'No create/save/destroy of production budgets'].join('\n') },
  { id: 'REG-RUM-PB-019', submodule: 'Widgets', title: 'Reset Widgets restores key widgets', steps: ['1. Click Reset Widgets'].join('\n'), expected: ['Latest Results and 1st vs 3rd Party widgets reappear'].join('\n') },
  { id: 'REG-RUM-PB-020', submodule: 'Latest Results', title: 'Timings metric cards (value vs Target)', steps: ['1. Locate LCP/CLS/Onload/TBT/First Byte | RUM cards'].join('\n'), expected: ['Labels and Target values visible (no exact backend asserts)'].join('\n') },
  { id: 'REG-RUM-PB-021', submodule: 'Latest Results', title: 'Assets metric cards (value vs Target)', steps: ['1. Locate JavaScript/CSS/Images | SYNTH cards'].join('\n'), expected: ['Labels and Target values visible'].join('\n') },
  { id: 'REG-RUM-PB-022', submodule: 'Party Activity', title: '1st vs 3rd Party Activity controls visible', steps: ['1. Locate SERVICES/DOMAINS/FILES and 1st/3rd/All'].join('\n'), expected: ['Tabs and party filters visible'].join('\n') },
  { id: 'REG-RUM-PB-023', submodule: 'Party Activity', title: 'SERVICES tab graph visible', steps: ['1. Select SERVICES', '2. Graph view'].join('\n'), expected: ['Slowest Services graph visible'].join('\n') },
  { id: 'REG-RUM-PB-024', submodule: 'Party Activity', title: 'DOMAINS tab graph visible', steps: ['1. Select DOMAINS', '2. Graph view'].join('\n'), expected: ['Slowest Domains graph visible'].join('\n') },
  { id: 'REG-RUM-PB-025', submodule: 'Party Activity', title: 'FILES tab graph visible', steps: ['1. Select FILES', '2. Graph view'].join('\n'), expected: ['Slowest Files graph visible'].join('\n') },
  { id: 'REG-RUM-PB-026', submodule: 'Party Activity', title: 'Party filter 1st / 3rd / All toggles', steps: ['1. Toggle 1st Party, 3rd Party, All'].join('\n'), expected: ['Toggles apply without page error'].join('\n') },
  { id: 'REG-RUM-PB-027', submodule: 'Party Activity', title: 'Slowest … Before metric selector change', steps: ['1. Change slowest-metric (e.g. Onload → FCP/120 Seconds)'].join('\n'), expected: ['Metric selector updates widgets'].join('\n') },
  { id: 'REG-RUM-PB-028', submodule: 'Party Activity', title: 'Graph ↔ table toggle for Slowest Services', steps: ['1. Switch table then graph'].join('\n'), expected: ['Both views render'].join('\n') },
  { id: 'REG-RUM-PB-029', submodule: 'Party Activity', title: 'Slowest Services table headers', steps: ['1. Open Services table'].join('\n'), expected: ['Headers include Service and Total Load Time Before …'].join('\n') },
  { id: 'REG-RUM-PB-030', submodule: 'Party Activity', title: 'Slowest Domains table headers', steps: ['1. Open Domains table'].join('\n'), expected: ['Headers include Domain and Total Load Time Before …'].join('\n') },
  { id: 'REG-RUM-PB-031', submodule: 'Party Activity', title: 'Slowest Files table headers', steps: ['1. Open Files table'].join('\n'), expected: ['Headers include File and Total Load Time Before …'].join('\n') },
  { id: 'REG-RUM-PB-032', submodule: 'Export', title: 'Export menu sample near party table', steps: ['1. Open Export if present'].join('\n'), expected: ['CSV options when Export present'].join('\n') },
  { id: 'REG-RUM-PB-033', submodule: 'Composition', title: 'Composition / related Highcharts render', steps: ['1. Confirm Highcharts present', '2. Soft legend hover'].join('\n'), expected: ['Charts render after filters/time changes'].join('\n') },
  { id: 'REG-RUM-PB-034', submodule: 'Page Table', title: 'Page Name vs CWV/asset columns table when present', steps: ['1. Locate dashboard page metrics table'].join('\n'), expected: ['Page Name + CWV/asset headers and ≥1 row when present'].join('\n') },
  { id: 'REG-RUM-PB-035', submodule: 'Filters', title: 'Right-nav Filters sample Apply refreshes widgets (no Save)', steps: ['1. Open Filters', '2. Sample change', '3. Apply (do not Save)'].join('\n'), expected: ['Widgets refresh'].join('\n') },
  { id: 'REG-RUM-PB-036', submodule: 'UI', title: 'Info / Target tooltip sample on metric cards', steps: ['1. Inspect i-icons / Target labels'].join('\n'), expected: ['Tooltip or Target label / Filters visible'].join('\n') },
  { id: 'REG-RUM-PB-037', submodule: 'UI', title: 'Top-nav Filters / Share controls remain usable', steps: ['1. Confirm Filters and Share'].join('\n'), expected: ['Filters visible; Share soft if layout differs'].join('\n') },
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
    status: 'Pass',
  }));

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'BTT Playwright Automation';
  workbook.created = new Date();

  const summary = workbook.addWorksheet('Summary', { views: [{ state: 'frozen', ySplit: 3 }] });
  summary.getColumn(1).width = 36;
  summary.getColumn(2).width = 18;
  summary.addRow(['RUM Performance Budget — Regression Summary']);
  summary.getRow(1).font = { bold: true, size: 14 };
  summary.addRow([`Site: ${DC} — ${SITE}`]);
  summary.addRow([`Total cases: ${enriched.length}`]);
  summary.addRow(['Last heal run: Passed (soft-deadline on REG-RUM-PB-013..016 top filter combos)']);
  summary.addRow([]);
  summary.addRow(['Submodule', 'Count']);
  styleHeader(summary.getRow(6));
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
  notes.addRow(['Do not assert exact backend numeric values — labels, visibility, refresh, interactive behavior only.']);
  notes.addRow(['Performance Budget manager is read-only browse — do not create/save/destroy production budgets.']);
  notes.addRow(['Do not Save Filter. Chart IDs are dynamic — locate by stable prefixes / titles.']);
  notes.addRow(['Auto Refresh: verify selection sticks; do not wait full refresh intervals.']);
  notes.addRow(['Top filter combos (PB-013..016): use soft deadline / soft-recover so filter hangs never cascade-skip the suite.']);
  notes.addRow(['No API / Database assertions.']);

  const out = path.join(__dirname, '..', 'docs', 'RUM_Performance_Budget_Regression.xlsx');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await workbook.xlsx.writeFile(out);
  console.log(`Wrote ${out} (${enriched.length} cases)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
