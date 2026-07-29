/**
 * Generates docs/Revenue_Opportunity_Regression.xlsx
 * Same format as RUM_Performance_Details_Regression.xlsx / BTT_Smoke_Manual_Test_Cases.xlsx
 *
 * Run: node scripts/generate-revenue-opportunity-regression-excel.js
 */
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');

const SITE = 'GDC Test Site 2';
const DC = 'US';
const MODULE = 'Business Analytics';
const CONFLUENCE =
  'https://bluetriangletech.atlassian.net/wiki/spaces/HCT/pages/3186360451/The+Revenue+Opportunity+Page';
const AUTOMATION =
  'tests/regression_tests/US2/business-insights/improve-conversion/revenue-opportunity/revenue.opportunity.regression.spec.ts';

const cases = [
  {
    id: 'REG-RO-001',
    submodule: 'Navigation',
    title: 'Page loads via menu/route with correct breadcrumb',
    steps: [
      '1. Login to Blue Triangle portal',
      `2. Ensure site is "${SITE}" (${DC})`,
      '3. Open left nav: Business Insights > Improve Conversion > Revenue Opportunity (or Favorites shortcut if present)',
      '4. Observe breadcrumb and URL',
    ].join('\n'),
    expected: [
      'Breadcrumb shows Business Insights / Improve Conversion / Revenue Opportunity',
      'URL contains business-analytics/revenue-opportunity',
      'User remains authenticated',
    ].join('\n'),
  },
  {
    id: 'REG-RO-002',
    submodule: 'Default Load',
    title: 'Default report/session context renders opportunity widgets',
    steps: [
      '1. Open Revenue Opportunity',
      '2. Note the default selected Report in the Report dropdown',
      '3. Observe 30 Day Opportunity cards and charts',
    ].join('\n'),
    expected: [
      'A default report is selected',
      'Top opportunity / device cards are visible',
      'Highcharts containers render with data',
    ].join('\n'),
  },
  {
    id: 'REG-RO-003',
    submodule: 'Performance',
    title: 'Page load performance: title + charts within SLA window',
    steps: [
      '1. Navigate to Revenue Opportunity from a warm session',
      '2. Measure time until title and charts are ready',
    ].join('\n'),
    expected: [
      'Page becomes interactive with charts within 120 seconds',
      'No blank shell / login redirect',
    ].join('\n'),
  },
  {
    id: 'REG-RO-004',
    submodule: 'Revenue Data Type',
    title: 'Revenue Data Type: Web Browser Data refreshes widgets',
    steps: [
      '1. Set Revenue Data Type to Web Browser Data',
      '2. Wait for widgets/charts to refresh',
    ].join('\n'),
    expected: [
      'Charts refresh successfully',
      'Page title remains Revenue Opportunity',
    ].join('\n'),
  },
  {
    id: 'REG-RO-005',
    submodule: 'Revenue Data Type',
    title: 'Revenue Data Type: Native App Data sample',
    steps: [
      '1. Set Revenue Data Type to Native App Data (if configured for site)',
      '2. Observe refresh; if unavailable, fall back to Web Browser Data',
    ].join('\n'),
    expected: [
      'Native App Data applies when configured OR fallback keeps page healthy',
      'Charts remain populated',
    ].join('\n'),
  },
  {
    id: 'REG-RO-006',
    submodule: 'Revenue Data Type',
    title: 'Revenue Data Type: Web Browser & Native App combination',
    steps: [
      '1. Select combined Web Browser & Native App data type',
      '2. Confirm widgets refresh',
    ].join('\n'),
    expected: ['Combined data type applies or safe fallback occurs', 'Charts show data'].join('\n'),
  },
  {
    id: 'REG-RO-007',
    submodule: 'Report Controls',
    title: 'Report Type sample combination refreshes page',
    steps: [
      '1. Change Report Type (e.g. Page Name)',
      '2. Change to another type if available (CWV Selector)',
    ].join('\n'),
    expected: ['Report Type changes refresh page content', 'Charts remain healthy'].join('\n'),
  },
  {
    id: 'REG-RO-008',
    submodule: 'Report Controls',
    title: 'Report dropdown: switch to second available report',
    steps: [
      '1. Open Report dropdown',
      '2. Select the second listed report (if more than one exists)',
    ].join('\n'),
    expected: ['Selected report loads', 'Opportunity widgets refresh'].join('\n'),
  },
  {
    id: 'REG-RO-009',
    submodule: 'Report Controls',
    title: 'Restore primary/default report (index 0)',
    steps: ['1. Select the first report in the Report list', '2. Confirm default-ish context returns'].join('\n'),
    expected: ['First report is active', 'Default opportunity context is visible'].join('\n'),
  },
  {
    id: 'REG-RO-010',
    submodule: '30 Day Opportunity',
    title: 'All / Desktop / Mobile card clicks refresh sections',
    steps: [
      '1. Click All / Browser opportunity card',
      '2. Click Desktop card',
      '3. Click Mobile card',
      '4. Observe graphs/tables refresh after each click',
    ].join('\n'),
    expected: [
      'Each card click updates corresponding sections',
      'Charts remain populated after each selection',
    ].join('\n'),
  },
  {
    id: 'REG-RO-011',
    submodule: 'By Page Graph',
    title: 'Revenue Opportunity By Page: graph visible + tooltip on hover',
    steps: [
      '1. Locate Revenue Opportunity By Page horizontal bar graph',
      '2. Hover a bar/point',
      '3. Observe tooltip values',
    ].join('\n'),
    expected: ['By Page graph is visible', 'Tooltip shows revenue values on hover (when data allows)'].join(
      '\n'
    ),
  },
  {
    id: 'REG-RO-012',
    submodule: 'By Page Graph',
    title: 'Revenue Opportunity By Page: legend toggle + context menu',
    steps: [
      '1. Toggle a legend item under/near the By Page graph',
      '2. Toggle it back',
      '3. Open chart hamburger/context menu',
      '4. Dismiss with Escape',
    ].join('\n'),
    expected: ['Legend toggles series visibility', 'Context menu chrome is available'].join('\n'),
  },
  {
    id: 'REG-RO-013',
    submodule: 'By Platform Graph',
    title: 'Revenue Opportunity By Platform: hover tooltip + legend',
    steps: [
      '1. Locate By Platform bar graph',
      '2. Hover for tooltip',
      '3. Toggle legend item check/uncheck',
    ].join('\n'),
    expected: ['By Platform graph visible', 'Tooltip/legend interactions refresh presentation'].join('\n'),
  },
  {
    id: 'REG-RO-014',
    submodule: 'By Platform Graph',
    title: 'Revenue Opportunity By Platform: context menu',
    steps: ['1. Open hamburger/context menu on By Platform graph', '2. Dismiss menu'].join('\n'),
    expected: ['Context menu control is present/usable'].join('\n'),
  },
  {
    id: 'REG-RO-015',
    submodule: 'Total Actual Revenue',
    title: 'Total Actual Revenue: hover tooltip + context menu',
    steps: [
      '1. Locate Total Actual Revenue bar graph',
      '2. Hover for exact values',
      '3. Open context menu and dismiss',
    ].join('\n'),
    expected: ['Graph visible', 'Tooltip/menu interactions succeed or page stays healthy'].join('\n'),
  },
  {
    id: 'REG-RO-016',
    submodule: 'All Browser Devices',
    title: 'All Browser Devices 30 days: line graph hover + legend',
    steps: [
      '1. Locate All Browser Devices / Actual Sales Over Time line graph',
      '2. Hover a point for day revenue',
      '3. Toggle legend; open context menu',
    ].join('\n'),
    expected: ['Line graph visible', 'Hover/legend/menu behaviors work as available'].join('\n'),
  },
  {
    id: 'REG-RO-017',
    submodule: 'What If',
    title: 'What If table visible with optimized/faster columns',
    steps: ['1. Scroll to What If table', '2. Confirm columns for optimized / Ns faster opportunity'].join('\n'),
    expected: [
      'What If / business overview table is visible',
      'Fully Optimized / What If faster columns are present',
    ].join('\n'),
  },
  {
    id: 'REG-RO-018',
    submodule: 'What If',
    title: 'What If: edit variables then Cancel (no Save)',
    steps: [
      '1. Hover What If variables and click pencil/edit',
      '2. Change a sample second increment if editable',
      '3. Click Cancel (do NOT Save)',
    ].join('\n'),
    expected: [
      'Edit UI opens',
      'Cancel discards changes',
      'No persistent What If Save is performed (read-only automation rule)',
    ].join('\n'),
  },
  {
    id: 'REG-RO-019',
    submodule: 'Revenue Opportunity Table',
    title: 'Column sort',
    steps: ['1. Click a sortable column header (Page Name / Fully Optimized / Total Opportunity)', '2. Observe row order change'].join(
      '\n'
    ),
    expected: ['Column sort is applied', 'Table remains visible'].join('\n'),
  },
  {
    id: 'REG-RO-020',
    submodule: 'Revenue Opportunity Table',
    title: 'Search/filter',
    steps: ['1. Use table search or column filter input', '2. Enter a sample term'].join('\n'),
    expected: ['Search/filter narrows rows when control exists', 'Table remains healthy'].join('\n'),
  },
  {
    id: 'REG-RO-021',
    submodule: 'Revenue Opportunity Table',
    title: 'Pager navigation when present',
    steps: ['1. If pager controls exist, click next', '2. Confirm table still visible'].join('\n'),
    expected: ['Pager advances when available', 'Table remains visible'].join('\n'),
  },
  {
    id: 'REG-RO-022',
    submodule: 'UI',
    title: 'Information icon tooltips sample',
    steps: ['1. Locate info icons near labels/fields', '2. Hover several icons and read tooltips'].join('\n'),
    expected: ['At least one info icon is hoverable', 'Tooltip/title text is exposed'].join('\n'),
  },
  {
    id: 'REG-RO-023',
    submodule: 'Filters',
    title: 'View Filters / Hide Filters toggles applied-filter banner',
    steps: [
      '1. Click View Filters',
      '2. Observe applied filter banner',
      '3. Click Hide Filters',
    ].join('\n'),
    expected: ['Banner shows/hides', 'Button label toggles View/Hide Filters'].join('\n'),
  },
  {
    id: 'REG-RO-024',
    submodule: 'Filters',
    title: 'Right-nav Filters: performance metric + visitor type sample',
    steps: [
      '1. Open Filters (funnel) top-right',
      '2. Set Performance Metric = Onload; Visitor Type = New Visitors; Apply',
      '3. Set Returning Visitors; Apply',
      '4. Do NOT Save Filter',
    ].join('\n'),
    expected: ['Charts refresh for sampled filter combos', 'No Save Filter write'].join('\n'),
  },
  {
    id: 'REG-RO-025',
    submodule: 'Report Manager',
    title: 'Report Manager opens (read-only; no delete)',
    steps: ['1. Click Report Manager', '2. Observe panel', '3. Close without deleting reports'].join('\n'),
    expected: ['Report Manager opens', 'No delete/write actions performed'].join('\n'),
  },
  {
    id: 'REG-RO-026',
    submodule: 'Top Navigation',
    title: 'Top-nav right controls visible with tooltips',
    steps: [
      '1. Hover Filters / Help Center / User menu (and other right-nav icons)',
      '2. Confirm tooltips',
    ].join('\n'),
    expected: ['Right-nav controls visible with tooltips', 'Filters control remains available'].join('\n'),
  },
  {
    id: 'REG-RO-027',
    submodule: 'Charts',
    title: 'Common legend check/uncheck refreshes series',
    steps: ['1. Click a Highcharts legend item', '2. Click again to restore'].join('\n'),
    expected: ['Series visibility toggles', 'Charts remain populated'].join('\n'),
  },
  {
    id: 'REG-RO-028',
    submodule: 'UI',
    title: 'Additional UI: opportunity calculator / conversion graphs present',
    steps: [
      '1. Locate conversion / opportunity calculator graphs if rendered',
      '2. Confirm visibility',
    ].join('\n'),
    expected: ['Available calculator/conversion graphs are visible', 'Main charts still have data'].join('\n'),
  },
  {
    id: 'REG-RO-029',
    submodule: 'Combinations',
    title: 'Data refresh after device card + data type combo',
    steps: [
      '1. Set Revenue Data Type to Web Browser Data',
      '2. Click Desktop then All opportunity cards',
    ].join('\n'),
    expected: ['Combined interactions refresh charts without error'].join('\n'),
  },
  {
    id: 'REG-RO-030',
    submodule: 'Performance',
    title: 'Performance re-check after interactions: charts still load',
    steps: [
      '1. After prior interactions, poll for chart containers',
      '2. Confirm title still Revenue Opportunity',
    ].join('\n'),
    expected: ['Charts remain available within 60s poll', 'Page title unchanged'].join('\n'),
  },
  {
    id: 'REG-RO-031',
    submodule: '30 Day Opportunity',
    title: 'iOS / Android card sample when present',
    steps: [
      '1. Click iOS opportunity card (if present)',
      '2. Click Android opportunity card (if present)',
      '3. Return to All card',
    ].join('\n'),
    expected: ['Device cards refresh charts when available', 'All card restores overview'].join('\n'),
  },
  {
    id: 'REG-RO-032',
    submodule: 'Revenue Opportunity Table',
    title: 'Device overview table follows Desktop card selection',
    steps: [
      '1. Click Desktop 30 Day Opportunity card',
      '2. Confirm desktop business overview table is present',
    ].join('\n'),
    expected: ['Desktop overview table is attached/visible after Desktop card click'].join('\n'),
  },
  {
    id: 'REG-RO-033',
    submodule: 'What If',
    title: 'What If Save control present but unused (read-only guard)',
    steps: [
      '1. Locate Save What If control if rendered',
      '2. Do NOT click Save',
    ].join('\n'),
    expected: [
      'Save control may be present',
      'Automation does not persist What If changes',
    ].join('\n'),
  },
  {
    id: 'REG-RO-034',
    submodule: 'Filters',
    title: 'View Filters banner shows applied filter chip sample',
    steps: [
      '1. Click View Filters',
      '2. Read applied filter chips (Real User / Time Period / Device / etc.)',
      '3. Hide Filters',
    ].join('\n'),
    expected: ['Banner exposes applied filter labels when shown'].join('\n'),
  },
  {
    id: 'REG-RO-035',
    submodule: 'Top Navigation',
    title: 'Revenue Calibration top-nav control is present (tooltip)',
    steps: [
      '1. Locate Revenue Calibration control in top-right chrome',
      '2. Hover and confirm tooltip',
    ].join('\n'),
    expected: ['Calibration control is visible with a tooltip'].join('\n'),
  },
  {
    id: 'REG-RO-036',
    submodule: 'Time Period',
    title: 'Time Period 1 Days: labels + Actual Revenue timeline',
    steps: [
      '1. Open Revenue Opportunity (no Bucket Size control on this page)',
      '2. Apply Time Period = 1 Day via matching Report (e.g. "… 1 Day …") or Filters Time Period if available',
      '3. Confirm Opportunity / Actual Revenue Over Time / What If labels mention 1 Day',
      '4. Hover Actual Revenue Over Time left→right',
      '5. Validate Highcharts x-axis day buckets (~1 day steps)',
    ].join('\n'),
    expected: [
      'Period applied via Report list and/or Filters Time Period only (no Bucket Size)',
      'Labels show 1 Day Opportunity / Actual Revenue Over Time period text',
      'What If / opportunity widgets mention 1 day when present',
      'Actual Revenue timeline uses ~1-day buckets ending near now',
      'If no 1-day report exists on the site, soft-skip with note',
    ].join('\n'),
  },
  {
    id: 'REG-RO-037',
    submodule: 'Time Period',
    title: 'Time Period 7 Days: labels + Actual Revenue timeline',
    steps: [
      '1. Apply Time Period = 7 Days via Report matching "7 Days" (or Filters)',
      '2. Confirm Opportunity / Actual Revenue / What If period labels',
      '3. Hover Actual Revenue; validate ~1-day timeline buckets',
    ].join('\n'),
    expected: [
      'No Bucket Size selection (control not present on Revenue Opportunity)',
      'Labels and widgets reflect 7 Days',
      'Actual Revenue timeline remains healthy with day-scale buckets',
    ].join('\n'),
  },
  {
    id: 'REG-RO-038',
    submodule: 'Time Period',
    title: 'Time Period 14 Days: labels + Actual Revenue timeline',
    steps: [
      '1. Apply Time Period = 14 Days via Report / Filters',
      '2. Confirm period labels on Opportunity, Actual Revenue Over Time, What If',
      '3. Validate Actual Revenue timeline buckets',
    ].join('\n'),
    expected: [
      'Period applied without Bucket Size',
      'UI labels mention 14 Days',
      'Timeline buckets remain ~1 day for multi-day reports',
    ].join('\n'),
  },
  {
    id: 'REG-RO-039',
    submodule: 'Time Period',
    title: 'Time Period 30 days: labels + Actual Revenue timeline',
    steps: [
      '1. Apply Time Period = 30 Days via Report matching "30 Days" (common default report)',
      '2. Confirm "30 Day Opportunity" and Actual Revenue Over Time period text',
      '3. Confirm What If widgets mention 30 days when labeled',
      '4. Hover Actual Revenue; validate day buckets near now',
    ].join('\n'),
    expected: [
      '30-day report/period applies; no Bucket Size control used',
      'Opportunity / Actual Revenue / What If labels align with 30 days',
      'Actual Revenue Over Time uses ~1-day Highcharts buckets ending near local now',
    ].join('\n'),
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
    title: `${c.id} — ${c.title}`,
    steps: c.steps,
    expected: c.expected,
    status: 'Not Executed',
  }));

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'BTT Playwright Automation';
  workbook.created = new Date();

  const summary = workbook.addWorksheet('Summary', { views: [{ state: 'frozen', ySplit: 3 }] });
  summary.getColumn(1).width = 36;
  summary.getColumn(2).width = 28;
  summary.getColumn(3).width = 12;
  summary.getColumn(4).width = 70;
  summary.mergeCells(1, 1, 1, 4);
  summary.getCell(1, 1).value = `Profile: ${DC} / ${SITE} | Type: Regression (read-only) | Total TCs: ${enriched.length} | Revenue Opportunity`;
  summary.getCell(1, 1).font = { bold: true, size: 12 };
  summary.mergeCells(2, 1, 2, 4);
  summary.getCell(2, 1).value = `Confluence: ${CONFLUENCE}`;
  summary.getRow(3).values = [undefined, 'Module', 'Submodule', 'TC Count', 'Test Case IDs'];
  styleHeader(summary.getRow(3));

  let rIdx = 4;
  const section = summary.getRow(rIdx++);
  section.values = [undefined, 'Breakdown by Module + Submodule', '', '', ''];
  section.font = { bold: true };
  section.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E3F0' } };

  const bySub = new Map();
  for (const row of enriched) {
    const k = row.submodule;
    if (!bySub.has(k)) bySub.set(k, []);
    bySub.get(k).push(row);
  }
  for (const [submodule, rows] of [...bySub.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const row = summary.getRow(rIdx++);
    row.values = [undefined, MODULE, submodule, rows.length, rows.map((r) => r.testCaseId).join(', ')];
    row.alignment = { vertical: 'top', wrapText: true };
  }
  const total = summary.getRow(rIdx++);
  total.values = [undefined, 'TOTAL', '', enriched.length, `${enriched[0].testCaseId} .. ${enriched[enriched.length - 1].testCaseId}`];
  total.font = { bold: true };
  total.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };

  const sheet = workbook.addWorksheet('Regression TCs', { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = [
    { header: 'Test Case ID', key: 'testCaseId', width: 14 },
    { header: 'Type', key: 'type', width: 12 },
    { header: 'Module', key: 'module', width: 24 },
    { header: 'Submodule', key: 'submodule', width: 28 },
    { header: 'Title', key: 'title', width: 62 },
    { header: 'Steps', key: 'steps', width: 68 },
    { header: 'Expected Results', key: 'expected', width: 68 },
    { header: 'Status', key: 'status', width: 14 },
  ];
  styleHeader(sheet.getRow(1));
  for (const row of enriched) {
    const r = sheet.addRow(row);
    r.alignment = { vertical: 'top', wrapText: true };
    r.height = 100;
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
  notes.addRow(['Blue Triangle Portal — Revenue Opportunity Regression Test Cases']);
  notes.addRow([`Profile / Site: ${DC} — ${SITE}`]);
  notes.addRow(['Type: Regression (read-only). Do NOT Save What If, Save Filter, or delete reports.']);
  notes.addRow(['Columns: Test Case ID | Type | Module | Submodule | Title | Steps | Expected Results | Status']);
  notes.addRow([`Total cases: ${enriched.length}`]);
  notes.addRow([`Confluence: ${CONFLUENCE}`]);
  notes.addRow([`Automation: ${AUTOMATION}`]);
  notes.getRow(1).font = { bold: true };

  const outPath = path.join(__dirname, '..', 'docs', 'Revenue_Opportunity_Regression.xlsx');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  await workbook.xlsx.writeFile(outPath);
  console.log(`Wrote ${enriched.length} test cases → ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
