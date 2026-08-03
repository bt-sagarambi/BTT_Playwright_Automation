/**
 * Generates docs/Customer_Journey_Analysis_Regression.xlsx
 * Sheets: Summary / Regression TCs / Notes
 *
 * Run: node scripts/generate-customer-journey-analysis-regression-excel.js
 */
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');

const SITE = 'GDC Test Site 2';
const DC = 'US';
const MODULE = 'Business Insights — Improve Traffic';
const AUTOMATION =
  'tests/regression_tests/US2/business-insights/improve-traffic/customer-journey-analysis/customer.journey.analysis.regression.spec.ts';
const EXECUTION_STATUS = process.env.CJA_EXECUTION_STATUS || 'Not Executed';
const EXECUTION_NOTE =
  process.env.CJA_EXECUTION_NOTE ||
  'Run npm run test:regression:us2:customer-journey-analysis and record live-data annotations from Allure.';

const cases = [
  {
    id: 'REG-CJA-001',
    submodule: 'Navigation',
    title: 'Page loads via BI menu/route with correct breadcrumb and sales conversion-type',
    steps: [
      '1. Login to Blue Triangle portal',
      `2. Ensure site is "${SITE}" (${DC})`,
      '3. Open Menu > Business Insights > Improve Traffic > Customer Journey Analysis',
      '4. Observe breadcrumb and URL',
    ].join('\n'),
    expected: [
      'Breadcrumb: Business Insights / Improve Traffic / Customer Journey Analysis',
      'URL contains marketing-insights/customer-journey-analysis and conversion-type=sales',
      'URL does not use conversion-type=brand',
    ].join('\n'),
  },
  {
    id: 'REG-CJA-002',
    submodule: 'Default Load',
    title: 'Default Campaigns tab loads with table data',
    steps: [
      '1. Open Customer Journey Analysis',
      '2. Confirm Campaigns is the default active tab',
      '3. Wait for All Campaigns table to finish loading',
      '4. Confirm table body has live data rows',
    ].join('\n'),
    expected: [
      '#campaigns-toggle is active',
      '#campaigns-wrapper and #campaigns-table are visible',
      'Campaigns table contains one or more data rows (not perpetual loader / blank shell)',
    ].join('\n'),
  },
  {
    id: 'REG-CJA-003',
    submodule: 'Quick Filters',
    title: 'Selected site and quick-filter badges are present',
    steps: ['1. Confirm site GDC Test Site 2', '2. Observe Time Period / Device / Campaign / Landing / Focal badges'].join(
      '\n'
    ),
    expected: ['Site is GDC Test Site 2', 'Representative quick-filter badges are visible with non-empty labels'].join(
      '\n'
    ),
  },
  {
    id: 'REG-CJA-004',
    submodule: 'Tabs',
    title: 'Campaigns / Path Analytics / Path Flow switch wrappers',
    steps: ['1. Click each primary tab', '2. Observe active wrapper visibility'].join('\n'),
    expected: ['Only the selected tab wrapper is visible', 'Active tab class updates'].join('\n'),
  },
  {
    id: 'REG-CJA-005',
    submodule: 'Tabs',
    title: 'Rapid tab switching leaves final Campaigns tab healthy',
    steps: ['1. Rapidly switch Path Analytics → Path Flow → Campaigns', '2. End on Campaigns'].join('\n'),
    expected: ['Final Campaigns wrapper/table remain healthy'].join('\n'),
  },
  {
    id: 'REG-CJA-006',
    submodule: 'Campaigns',
    title: 'Campaigns table headers include journey metrics',
    steps: ['1. Open Campaigns tab', '2. Review table headers'].join('\n'),
    expected: [
      'Headers include Campaigns, Journey Sessions, Journey Page Views, Bounce Rate, Exit Rate, Onload/Avg Onload, Orders, Conversion Rate, Revenue',
    ].join('\n'),
  },
  {
    id: 'REG-CJA-007',
    submodule: 'Campaigns',
    title: 'Campaigns table has data rows and optional All Traffic / No Campaign rows',
    steps: ['1. Inspect Campaigns body rows', '2. Look for (All Traffic) and (No Campaign Assigned)'].join('\n'),
    expected: ['At least one data row', 'Special rows annotated if absent'].join('\n'),
  },
  {
    id: 'REG-CJA-008',
    submodule: 'Campaigns',
    title: 'Campaigns Revenue column sort changes row order when multiple rows exist',
    steps: ['1. Sort Revenue', '2. Reverse if needed', '3. Compare row signature'].join('\n'),
    expected: ['Row order changes when multiple rows exist, else annotated'].join('\n'),
  },
  {
    id: 'REG-CJA-009',
    submodule: 'Campaigns',
    title: 'Campaigns search / clear when search control exists',
    steps: ['1. Search using runtime-derived token', '2. Apply no-match', '3. Clear'].join('\n'),
    expected: ['Search limits/clears rows when control exists'].join('\n'),
  },
  {
    id: 'REG-CJA-010',
    submodule: 'Campaigns',
    title: 'Campaigns pager info and export options soft-check',
    steps: ['1. Observe pager info', '2. Open Export and note CSV/TSV'].join('\n'),
    expected: ['Pager and/or CSV/TSV documented when present'].join('\n'),
  },
  {
    id: 'REG-CJA-011',
    submodule: 'Campaigns',
    title: 'Expand Campaigns URL, open landing detail, handoff to Path Analytics with data',
    steps: [
      '1. On Campaigns tab, expand a Campaigns-column URL/name (dropdown arrow)',
      '2. Confirm landing-page detail rows appear under the expanded campaign',
      '3. Click a landing-page detail record',
      '4. Observe Path Analytics tab becomes active',
      '5. Confirm Hierarchy Ladder / overview and Journey Details contain data',
    ].join('\n'),
    expected: [
      'Landing-page child rows render under the expanded campaign',
      'Path Analytics tab is active after landing-page click',
      'Hierarchy Ladder / overview table has metric rows',
      'Journey Details Paths and Pages tables contain data',
    ].join('\n'),
  },
  {
    id: 'REG-CJA-012',
    submodule: 'Campaigns',
    title: 'Go to my Campaign dashboard / Save Campaign presence (no save)',
    steps: ['1. Locate dashboard actions', '2. Do not Save Campaign to shared dashboard'].join('\n'),
    expected: ['Presence documented; no save performed'].join('\n'),
  },
  {
    id: 'REG-CJA-013',
    submodule: 'Path Analytics',
    title: 'Path Analytics hierarchy / overview metrics render',
    steps: ['1. Open Path Analytics', '2. Review overview/hierarchy metrics'].join('\n'),
    expected: ['Overview headers present', 'Hierarchy markers present or annotated'].join('\n'),
  },
  {
    id: 'REG-CJA-014',
    submodule: 'Path Analytics',
    title: 'Paths vs Pages toggle shows table data under each tab',
    steps: [
      '1. Open Path Analytics',
      '2. Confirm Paths and Pages controls are above Journey Details',
      '3. Click Paths and verify table data',
      '4. Click Pages and verify table data',
    ].join('\n'),
    expected: [
      'Paths table shows Path Rank / Landing Page headers and data rows',
      'Pages table shows Pages in Journey headers and data rows',
    ].join('\n'),
  },
  {
    id: 'REG-CJA-015',
    submodule: 'Path Analytics',
    title: 'Click path row focuses Path Analytics context',
    steps: ['1. On Paths table click first row'].join('\n'),
    expected: ['Path Analytics remains healthy after focus'].join('\n'),
  },
  {
    id: 'REG-CJA-016',
    submodule: 'Path Flow',
    title: 'Path Flow is last tab with Landing Page card and consecutive Step cards',
    steps: [
      '1. Confirm Path Flow is the last primary tab after Campaigns and Path Analytics',
      '2. Open Path Flow / Landing Page View',
      '3. Locate the top-left Landing Page card (.page-card.landingCard)',
      '4. If Landing Page card has data, verify consecutive Step columns also show page cards',
    ].join('\n'),
    expected: [
      'Path Flow is the last CI-tab',
      'Landing Page card(s) render with content when live data exists',
      'Step 2+ columns show page cards when the landing card is data-bearing',
    ].join('\n'),
  },
  {
    id: 'REG-CJA-017',
    submodule: 'Path Flow',
    title: 'Focal Page View toggles and restores Landing view',
    steps: ['1. Click Focal Page View', '2. Restore Landing Page View'].join('\n'),
    expected: ['Focal container visible when active', 'Landing view restored'].join('\n'),
  },
  {
    id: 'REG-CJA-018',
    submodule: 'Path Flow',
    title: 'Path Flow card/node selection soft-check',
    steps: ['1. Click a representative card/node', '2. Confirm no blocking overlay'].join('\n'),
    expected: ['Selection accepted or annotated; no overlay block'].join('\n'),
  },
  {
    id: 'REG-CJA-019',
    submodule: 'Filters',
    title: 'Filters drawer opens with representative labels; Cancel/close',
    steps: ['1. Open #toggle-filters', '2. Review labels', '3. Cancel/close'].join('\n'),
    expected: ['Time Period/Campaign/Landing/Focal/Bot/Data Type labels present', 'Drawer closes cleanly'].join('\n'),
  },
  {
    id: 'REG-CJA-020',
    submodule: 'Time Period',
    title: 'Apply Time Period Last 6 hours refreshes page',
    steps: ['1. Apply Last 6 hours', '2. Confirm Campaigns table still usable'].join('\n'),
    expected: ['Page refreshes without blocking error'].join('\n'),
  },
  {
    id: 'REG-CJA-021',
    submodule: 'Time Period',
    title: 'Apply Time Period Last 24 hours refreshes page',
    steps: ['1. Apply Last 24 hours'].join('\n'),
    expected: ['Campaigns table remains visible'].join('\n'),
  },
  {
    id: 'REG-CJA-022',
    submodule: 'Time Period',
    title: 'Apply Time Period Last 7 days refreshes page',
    steps: ['1. Apply Last 7 days', '2. Open Path Analytics'].join('\n'),
    expected: ['Path Analytics wrapper remains visible'].join('\n'),
  },
  {
    id: 'REG-CJA-023',
    submodule: 'Time Period',
    title: 'Apply Time Period Last 30 days refreshes page',
    steps: ['1. Apply Last 30 days', '2. Open Path Flow'].join('\n'),
    expected: ['Path Flow wrapper remains visible'].join('\n'),
  },
  {
    id: 'REG-CJA-024',
    submodule: 'Filters',
    title: 'Sample Campaign/Landing filter apply and restore',
    steps: ['1. Apply one live Campaign/Landing option', '2. Restore original context'].join('\n'),
    expected: ['Filter apply does not break page', 'Context restored'].join('\n'),
  },
  {
    id: 'REG-CJA-025',
    submodule: 'Native Indicators',
    title: 'Native Webview / App Screen indicator soft-check on Path Flow',
    steps: ['1. Open Path Flow', '2. Look for Native indicators and hover'].join('\n'),
    expected: ['Indicators validated when present; absence annotated'].join('\n'),
  },
  {
    id: 'REG-CJA-026',
    submodule: 'Accessibility',
    title: 'Info icons present; keyboard focus sample on primary tabs',
    steps: ['1. Confirm info icons', '2. Focus Campaigns/Path Analytics/Path Flow tabs'].join('\n'),
    expected: ['Info icons exist', 'Tabs are focusable'].join('\n'),
  },
  {
    id: 'REG-CJA-027',
    submodule: 'Combinations',
    title: 'Tab switches + filters open/close without overlay block',
    steps: ['1. Open/close Filters', '2. Switch tabs and Landing/Focal views'].join('\n'),
    expected: ['No blocking overlay remains'].join('\n'),
  },
  {
    id: 'REG-CJA-028',
    submodule: 'Recovery',
    title: 'Recover to Campaigns tab and verify page healthy after suite churn',
    steps: ['1. Return to Campaigns', '2. Confirm sales conversion-type URL'].join('\n'),
    expected: ['Campaigns table visible', 'conversion-type=sales retained'].join('\n'),
  },
  {
    id: 'REG-CJA-029',
    submodule: 'Responsive',
    title: 'Responsive narrow desktop keeps tabs reachable',
    steps: ['1. Set viewport ~1100px', '2. Confirm tabs and Filters reachable'].join('\n'),
    expected: ['Primary tabs and Filters remain visible'].join('\n'),
  },
  {
    id: 'REG-CJA-030',
    submodule: 'Integrations',
    title: 'Revenue Attribution affordance soft presence check (no mutation)',
    steps: ['1. Locate Revenue Attribution if present', '2. Do not mutate configuration'].join('\n'),
    expected: ['Presence documented; no configuration changes'].join('\n'),
  },
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
    status: EXECUTION_STATUS,
  }));

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'BTT Playwright Automation';
  workbook.created = new Date();

  const summary = workbook.addWorksheet('Summary', { views: [{ state: 'frozen', ySplit: 3 }] });
  summary.getColumn(1).width = 36;
  summary.getColumn(2).width = 18;
  summary.addRow(['Customer Journey Analysis — Regression Summary']);
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
    { header: 'Module', key: 'module', width: 34 },
    { header: 'Submodule', key: 'submodule', width: 18 },
    { header: 'Title', key: 'title', width: 55 },
    { header: 'Steps', key: 'steps', width: 55 },
    { header: 'Expected Results', key: 'expected', width: 55 },
    { header: 'Status', key: 'status', width: 14 },
  ];
  styleHeader(sheet.getRow(1));
  for (const row of enriched) {
    const r = sheet.addRow(row);
    r.alignment = { vertical: 'top', wrapText: true };
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
  notes.addRow(['Blue Triangle Portal — Customer Journey Analysis Regression Test Cases']);
  notes.addRow([`Profile / Site: ${DC} — ${SITE}`]);
  notes.addRow([
    'Type: Regression (read-only). Do NOT Save Filter, Save Campaign to dashboard, clear Genius cache, or open Brand CJA (conversion-type=brand).',
  ]);
  notes.addRow(['Do not hard-code campaign names, landing/focal pages, path strings, or metric totals.']);
  notes.addRow(['Columns: Test Case ID | Type | Module | Submodule | Title | Steps | Expected Results | Status']);
  notes.addRow([`Total cases: ${enriched.length}`]);
  notes.addRow(['Help / DOC: The Customer Journey Analysis Page – Blue Triangle Help Center.pdf']);
  notes.addRow([`Automation: ${AUTOMATION}`]);
  notes.addRow([`Execution status: ${EXECUTION_STATUS}`]);
  notes.addRow([`Execution note: ${EXECUTION_NOTE}`]);
  notes.addRow([
    'Ambiguities: BI path is source of truth vs PDF Marketing Insights wording; Onload vs Avg Onload; hierarchy markers and Native indicators are data-dependent.',
  ]);
  notes.getRow(1).font = { bold: true };

  const outPath = path.join(__dirname, '..', 'docs', 'Customer_Journey_Analysis_Regression.xlsx');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  await workbook.xlsx.writeFile(outPath);
  console.log(`Wrote ${enriched.length} test cases → ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
