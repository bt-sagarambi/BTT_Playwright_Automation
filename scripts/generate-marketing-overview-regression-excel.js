/**
 * Generates docs/Marketing_Overview_Regression.xlsx
 * Sheets: Summary / Regression TCs / Notes
 *
 * Run: node scripts/generate-marketing-overview-regression-excel.js
 * Optional: MO_EXECUTION_STATUS=Pass MO_EXECUTION_NOTE="..."
 */
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');

const SITE = 'GDC Test Site 2';
const DC = 'US';
const MODULE = 'Business Insights — Improve Traffic';
const HELP =
  'The Marketing Overview Page – Blue Triangle Help Center (attached PDF / Help Center)';
const AUTOMATION =
  'tests/regression_tests/US2/business-insights/improve-traffic/marketing-overview/marketing.overview.regression.spec.ts';
const EXECUTION_STATUS = process.env.MO_EXECUTION_STATUS || 'Not Executed';
const EXECUTION_NOTE =
  process.env.MO_EXECUTION_NOTE ||
  'Run npm run test:regression:us2:marketing-overview and record live-data annotations from Allure.';

const cases = [
  {
    id: 'REG-MO-001',
    submodule: 'Navigation',
    title: 'Page loads via menu/route with correct breadcrumb and URL',
    steps: [
      '1. Login to Blue Triangle portal',
      `2. Ensure site is "${SITE}" (${DC})`,
      '3. Open Menu > Business Insights > Improve Traffic > Marketing Overview',
      '4. Observe breadcrumb and URL',
    ].join('\n'),
    expected: [
      'Breadcrumb: Business Insights / Improve Traffic / Marketing Overview',
      'URL contains overview-dashboard/marketing',
      'No login redirect',
    ].join('\n'),
  },
  {
    id: 'REG-MO-002',
    submodule: 'Default Context',
    title: 'Selected site is GDC Test Site 2; dashboard and lookback are non-empty',
    steps: [
      '1. Open Marketing Overview',
      '2. Capture selected site, dashboard (#switch-dashboard), and time lookback (#time-lookback)',
      '3. Do not assume a fixed default period (e.g. Last 6 Hours or 30 days)',
    ].join('\n'),
    expected: [
      'Site is GDC Test Site 2',
      'Dashboard and lookback labels are non-empty live values',
      'Sitewide Totals and widgets render',
    ].join('\n'),
  },
  {
    id: 'REG-MO-003',
    submodule: 'Default Load',
    title: 'Sitewide Totals and at least one marketing widget render',
    steps: ['1. After page ready, observe Sitewide Totals and Campaigns/charts'].join('\n'),
    expected: ['Sitewide Totals visible', 'At least one campaign card or Highcharts container present'].join('\n'),
  },
  {
    id: 'REG-MO-004',
    submodule: 'Performance',
    title: 'Primary widgets finish loading within bounded UI deadline',
    steps: ['1. Measure warm-session navigation until widgets ready'].join('\n'),
    expected: ['Ready within 120 seconds UI observation (not a formal backend SLA)'].join('\n'),
  },
  {
    id: 'REG-MO-005',
    submodule: 'Navigation',
    title: 'Browser title indicates Marketing Insights Overview',
    steps: ['1. Observe document title'].join('\n'),
    expected: ['Title contains Marketing'].join('\n'),
  },
  {
    id: 'REG-MO-006',
    submodule: 'Dashboard Chrome',
    title: 'Dashboard header controls are attached/visible',
    steps: [
      '1. Verify #switch-dashboard, #time-lookback, #refresh-dashboard, #auto-refresh',
      '2. Verify markers / reset / view-or-edit when configured',
    ].join('\n'),
    expected: ['Configured controls visible or attached with accessible names/tooltips'].join('\n'),
  },
  {
    id: 'REG-MO-007',
    submodule: 'Dashboard Chrome',
    title: 'Dashboard selector exposes non-blank unique options',
    steps: ['1. Enumerate #switch-dashboard options'].join('\n'),
    expected: ['No blank or duplicate option labels', 'Selected dashboard non-empty'].join('\n'),
  },
  {
    id: 'REG-MO-008',
    submodule: 'Refresh',
    title: 'Manual refresh reloads widgets without duplication',
    steps: ['1. Note campaign card and chart counts', '2. Click #refresh-dashboard', '3. Wait for reload'].join('\n'),
    expected: ['Widgets reload', 'No duplicate graph host IDs', 'Controls usable again'].join('\n'),
  },
  {
    id: 'REG-MO-009',
    submodule: 'Time Lookback',
    title: 'Time lookback presets are unique and non-blank',
    steps: ['1. Open #time-lookback', '2. Enumerate all presets'].join('\n'),
    expected: ['Presets unique and non-blank', 'Record live list'].join('\n'),
  },
  {
    id: 'REG-MO-010',
    submodule: 'Time Lookback',
    title: 'Sample lookback Last 6 Hours refreshes Sitewide Totals when available',
    steps: ['1. Capture Sitewide Totals signature', '2. Select Last 6 Hours if present', '3. Compare totals'].join('\n'),
    expected: ['Selected label changes', 'Totals/widget state refreshes', 'Annotate if preset missing'].join('\n'),
  },
  {
    id: 'REG-MO-011',
    submodule: 'Time Lookback',
    title: 'Sample lookback Last 2 Days refreshes widgets when available',
    steps: ['1. Select Last 2 Days', '2. Compare campaign card signature'].join('\n'),
    expected: ['Widgets reload for selected period'].join('\n'),
  },
  {
    id: 'REG-MO-012',
    submodule: 'Time Lookback',
    title: 'Sample lookback Last 7 Days refreshes campaign graphs when available',
    steps: ['1. Capture top-campaigns bar signature', '2. Select Last 7 Days', '3. Compare graph signature'].join('\n'),
    expected: ['Bar/line graphs refresh; do not only count containers'].join('\n'),
  },
  {
    id: 'REG-MO-013',
    submodule: 'Time Lookback',
    title: 'Sample lookback Last 30 Days and restore original lookback',
    steps: ['1. Select Last 30 Days', '2. Restore originally captured lookback'].join('\n'),
    expected: ['Period applies when available', 'Original lookback restored'].join('\n'),
  },
  {
    id: 'REG-MO-014',
    submodule: 'Time Lookback',
    title: 'Custom date selection Cancel does not apply pending range',
    steps: ['1. Open Custom Date Selection', '2. Cancel without applying'].join('\n'),
    expected: ['Lookback remains a valid prior/selected value', 'No stuck overlay'].join('\n'),
  },
  {
    id: 'REG-MO-015',
    submodule: 'Auto Refresh',
    title: 'Auto Refresh options enumerate; sample two safe values and restore',
    steps: ['1. Open Auto Refresh', '2. Select two short options', '3. Restore original', '4. Do not wait full interval'].join('\n'),
    expected: ['Options unique', 'Label updates', 'Original restored'].join('\n'),
  },
  {
    id: 'REG-MO-016',
    submodule: 'Auto Refresh',
    title: 'Changing Auto Refresh does not alter lookback',
    steps: ['1. Note lookback', '2. Change Auto Refresh', '3. Confirm lookback unchanged'].join('\n'),
    expected: ['Lookback unchanged'].join('\n'),
  },
  {
    id: 'REG-MO-017',
    submodule: 'Event Markers',
    title: 'Event Markers options sample and restore (no create/edit/delete)',
    steps: [
      '1. Open marker selector',
      '2. Sample No Markers / All Markers / Global when present',
      '3. Do not Create A New Marker',
    ].join('\n'),
    expected: ['Options valid', 'Charts update marker visibility when applicable', 'Original restored'].join('\n'),
  },
  {
    id: 'REG-MO-018',
    submodule: 'View / Edit',
    title: 'Viewing mode keeps widget edit/drag controls inactive',
    steps: ['1. Ensure Viewing mode', '2. Inspect drag/edit handles'].join('\n'),
    expected: ['Drag/edit handles not active in Viewing'].join('\n'),
  },
  {
    id: 'REG-MO-019',
    submodule: 'View / Edit',
    title: 'Editing mode inspected read-only then returned to Viewing',
    steps: ['1. Enter Editing only to inspect', '2. Return to Viewing without moving widgets'].join('\n'),
    expected: ['No layout mutation on shared dashboard'].join('\n'),
  },
  {
    id: 'REG-MO-020',
    submodule: 'Widget Management',
    title: 'Reset Widgets control present but not clicked',
    steps: ['1. Locate #reset-all-inactive-widgets', '2. Do not click on shared dashboard'].join('\n'),
    expected: ['Control presence documented; no reset executed'].join('\n'),
  },
  {
    id: 'REG-MO-021',
    submodule: 'Sitewide Totals',
    title: 'Sitewide Totals title and ten metric cards render',
    steps: ['1. Verify title and cards #bounce-rate-card … #conversion-rate-card'].join('\n'),
    expected: ['All ten cards attached with non-empty value or controlled no-data'].join('\n'),
  },
  {
    id: 'REG-MO-022',
    submodule: 'Sitewide Totals',
    title: 'Sitewide Totals metric formats by type (sampled)',
    steps: ['1. Sample Bounce Rate, Revenue, Sessions, Onload formats'].join('\n'),
    expected: ['Formats match type (%, currency/count, duration) without exact values'].join('\n'),
  },
  {
    id: 'REG-MO-023',
    submodule: 'Sitewide Totals',
    title: 'Sitewide Totals info icons expose meaningful tooltip text',
    steps: ['1. Hover info icons on metric cards'].join('\n'),
    expected: ['Meaningful tooltip/title text when icons present'].join('\n'),
  },
  {
    id: 'REG-MO-024',
    submodule: 'Campaigns',
    title: 'Campaigns widget shows at least one data-bearing card',
    steps: ['1. Locate #campaignDiv_* cards', '2. Validate non-empty labels/metrics'].join('\n'),
    expected: ['At least one card OR annotate controlled no-data'].join('\n'),
  },
  {
    id: 'REG-MO-025',
    submodule: 'Campaign Actions',
    title: 'Campaign action menu labels and safe Back navigation',
    steps: [
      '1. Open campaign action menu',
      '2. Verify labels/links',
      '3. Sample safe internal navigation and browser Back',
      '4. Close extra tabs',
    ].join('\n'),
    expected: ['Menu labels present', 'Marketing Overview restores after Back'].join('\n'),
  },
  {
    id: 'REG-MO-026',
    submodule: 'Campaigns Over Time',
    title: 'Campaigns Over Time metric buttons visible',
    steps: ['1. Verify #revenue-campaigns … #sessions-campaigns'].join('\n'),
    expected: ['All configured metric buttons visible'].join('\n'),
  },
  {
    id: 'REG-MO-027',
    submodule: 'Campaigns Over Time',
    title: 'Select each campaign metric and assert graph signature updates',
    steps: ['1. Select each metric', '2. Compare scoped graph signatures', '3. Restore original metric'].join('\n'),
    expected: ['Active metric state updates', 'Graph signature captured before/after'].join('\n'),
  },
  {
    id: 'REG-MO-028',
    submodule: 'Campaigns Over Time',
    title: 'Rapid campaign metric switching leaves only final metric active',
    steps: ['1. Rapidly click Orders → Sessions → Revenue'].join('\n'),
    expected: ['Final active metric is Revenue'].join('\n'),
  },
  {
    id: 'REG-MO-029',
    submodule: 'Campaign Graphs',
    title: 'Top campaigns bar and line graphs render',
    steps: ['1. Verify #top-campaigns-by-campaign-bar and -line'].join('\n'),
    expected: ['Both graphs render for data-bearing metric'].join('\n'),
  },
  {
    id: 'REG-MO-030',
    submodule: 'Campaign Graphs',
    title: 'Hover campaign graph points and validate tooltip content',
    steps: ['1. Hover bar and line points', '2. Read tooltip fields'].join('\n'),
    expected: ['Tooltip content asserted when available'].join('\n'),
  },
  {
    id: 'REG-MO-031',
    submodule: 'Campaign Graphs',
    title: 'Toggle campaign graph legend series and restore',
    steps: ['1. Toggle first legend item twice'].join('\n'),
    expected: ['Series visibility changes and restores'].join('\n'),
  },
  {
    id: 'REG-MO-032',
    submodule: 'Campaign Graphs',
    title: 'Campaign graph context/export menu opens and dismisses',
    steps: ['1. Open context menu on bar graph', '2. Dismiss with Escape'].join('\n'),
    expected: ['Menu dismisses; no blocking overlay'].join('\n'),
  },
  {
    id: 'REG-MO-033',
    submodule: 'Source Table',
    title: 'Traffic Source table headers / rows or controlled empty',
    steps: ['1. Locate Source table by header (not dynamic table-for-* ID)', '2. Verify columns'].join('\n'),
    expected: [
      'Headers: Source, Revenue ($), Orders, Avg Order Value ($), Visitors, Page Views, Conversion Rate (%)',
      'Rows OR controlled empty annotated',
    ].join('\n'),
  },
  {
    id: 'REG-MO-034',
    submodule: 'Source Table',
    title: 'Source table sort / search / clear when rows exist',
    steps: ['1. Sort Revenue', '2. Search runtime-derived source', '3. No-match then clear'].join('\n'),
    expected: ['Row order/search behavior validated when data present'].join('\n'),
  },
  {
    id: 'REG-MO-035',
    submodule: 'Source Table',
    title: 'Source table page-size and export options when present',
    steps: ['1. Change page size', '2. Open Export menu'].join('\n'),
    expected: ['Page-size applies when present', 'Export includes CSV/TSV/JSON/Array when present'].join('\n'),
  },
  {
    id: 'REG-MO-036',
    submodule: 'Medium Table',
    title: 'Traffic Medium table headers and formatting',
    steps: ['1. Locate Medium table by header', '2. Verify columns and sample rows'].join('\n'),
    expected: ['Stable headers present', 'Formats validated without exact values'].join('\n'),
  },
  {
    id: 'REG-MO-037',
    submodule: 'Medium Table',
    title: 'Medium table sort / search / page-size / export',
    steps: ['1. Sort Orders', '2. Change page size', '3. Open Export'].join('\n'),
    expected: ['Interactions succeed; export options when present'].join('\n'),
  },
  {
    id: 'REG-MO-038',
    submodule: 'Device Widgets',
    title: 'Revenue by Device bar and line graphs',
    steps: ['1. Verify #revenue-by-device-bar/line', '2. Hover sample point'].join('\n'),
    expected: ['Graphs render', 'Desktop/Mobile/Tablet series data-dependent'].join('\n'),
  },
  {
    id: 'REG-MO-039',
    submodule: 'Device Widgets',
    title: 'Conversion Rate by Device graphs with percentage presentation',
    steps: ['1. Verify conversionRate-by-device bar/line', '2. Hover tooltip'].join('\n'),
    expected: ['Percentage presentation without exact backend values'].join('\n'),
  },
  {
    id: 'REG-MO-040',
    submodule: 'Device Widgets',
    title: 'Sessions by Device graphs',
    steps: ['1. Verify sessions-by-device bar/line', '2. Toggle legend'].join('\n'),
    expected: ['Count-based graphs render', 'Legend toggle restores'].join('\n'),
  },
  {
    id: 'REG-MO-041',
    submodule: 'Graph Standards',
    title: 'Device graph context menus dismiss without overlay block',
    steps: ['1. Open context menus', '2. Escape/dismiss'].join('\n'),
    expected: ['No blocking overlay; refresh control usable'].join('\n'),
  },
  {
    id: 'REG-MO-042',
    submodule: 'Filters',
    title: 'Filters drawer opens with representative controls; Cancel without apply',
    steps: ['1. Open #toggle-filters', '2. Observe Source/Medium/Campaign/Timezone/Visitor Type', '3. Cancel'].join(
      '\n'
    ),
    expected: ['Controls attached', 'Cancel closes without applying'].join('\n'),
  },
  {
    id: 'REG-MO-043',
    submodule: 'Filters',
    title: 'Apply one Traffic Medium filter and verify refresh; restore',
    steps: ['1. Apply live Medium option', '2. Observe campaigns/graphs', '3. Clear/restore'].join('\n'),
    expected: ['Measurable refresh', 'Original context restored', 'Do not Save Filter'].join('\n'),
  },
  {
    id: 'REG-MO-044',
    submodule: 'Filters',
    title: 'Apply Traffic Source filter; assert Source table alignment when possible',
    steps: ['1. Apply Source filter', '2. Observe Source table', '3. Restore'].join('\n'),
    expected: ['Filter applies', 'Table reflects or empty state controlled'].join('\n'),
  },
  {
    id: 'REG-MO-045',
    submodule: 'Filters',
    title: 'Two-filter combination and restore',
    steps: ['1. Apply Source + Medium', '2. Confirm both active', '3. Clear'].join('\n'),
    expected: ['Combination applies when options exist', 'Context restored'].join('\n'),
  },
  {
    id: 'REG-MO-046',
    submodule: 'Filters',
    title: 'Bot Traffic controls visible when configured (no save)',
    steps: ['1. Open Filters', '2. Observe Include/Exclude/Bots Only'].join('\n'),
    expected: ['Controls documented; no Save Filter'].join('\n'),
  },
  {
    id: 'REG-MO-047',
    submodule: 'Accessibility',
    title: 'Keyboard focus sample on primary controls',
    steps: ['1. Focus lookback, refresh, auto refresh, metric tab'].join('\n'),
    expected: ['Controls accept focus'].join('\n'),
  },
  {
    id: 'REG-MO-048',
    submodule: 'Responsive',
    title: 'Responsive narrow desktop keeps essential controls reachable',
    steps: ['1. Sample 1280 and 1024 widths', '2. Restore 1440'].join('\n'),
    expected: ['Lookback and Sitewide Totals remain reachable'].join('\n'),
  },
  {
    id: 'REG-MO-049',
    submodule: 'Combinations',
    title: 'Combination lookback + campaign metric + refresh without duplicates',
    steps: ['1. Change lookback', '2. Change metric', '3. Refresh', '4. Check duplicate hosts/cards'].join('\n'),
    expected: ['No duplicate graph hosts or campaignDiv IDs'].join('\n'),
  },
  {
    id: 'REG-MO-050',
    submodule: 'Recovery',
    title: 'Recover to original dashboard/lookback/metric context; page healthy',
    steps: ['1. Restore captured context', '2. Confirm URL/title/widgets'].join('\n'),
    expected: ['Healthy Marketing Overview state', 'Blocking errors annotated if any'].join('\n'),
  },
];

function styleHeader(row) {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F5496' } };
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
  workbook.creator = 'BlueTriangle Automation';
  workbook.created = new Date();

  const summary = workbook.addWorksheet('Summary');
  summary.getColumn(1).width = 4;
  summary.getColumn(2).width = 42;
  summary.getColumn(3).width = 28;
  summary.getColumn(4).width = 12;
  summary.getColumn(5).width = 70;
  summary.mergeCells(1, 1, 1, 5);
  summary.getCell(1, 1).value = `Marketing Overview Regression — ${SITE} (${DC})`;
  summary.getCell(1, 1).font = { bold: true, size: 14 };
  summary.mergeCells(2, 1, 2, 5);
  summary.getCell(2, 1).value = `Help / DOC: ${HELP}`;
  summary.getRow(3).values = [undefined, 'Module', 'Submodule', 'TC Count', 'Test Case IDs'];
  styleHeader(summary.getRow(3));

  let rIdx = 4;
  const section = summary.getRow(rIdx++);
  section.values = [undefined, 'Breakdown by Module + Submodule', '', '', ''];
  section.font = { bold: true };
  section.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E3F0' } };

  const bySub = new Map();
  for (const row of enriched) {
    if (!bySub.has(row.submodule)) bySub.set(row.submodule, []);
    bySub.get(row.submodule).push(row);
  }
  for (const [submodule, rows] of [...bySub.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const row = summary.getRow(rIdx++);
    row.values = [undefined, MODULE, submodule, rows.length, rows.map((r) => r.testCaseId).join(', ')];
    row.alignment = { vertical: 'top', wrapText: true };
  }
  const total = summary.getRow(rIdx++);
  total.values = [
    undefined,
    'TOTAL',
    '',
    enriched.length,
    `${enriched[0].testCaseId} .. ${enriched[enriched.length - 1].testCaseId}`,
  ];
  total.font = { bold: true };
  total.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };

  const sheet = workbook.addWorksheet('Regression TCs', { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = [
    { header: 'Test Case ID', key: 'testCaseId', width: 14 },
    { header: 'Type', key: 'type', width: 12 },
    { header: 'Module', key: 'module', width: 36 },
    { header: 'Submodule', key: 'submodule', width: 22 },
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
  notes.addRow(['Blue Triangle Portal — Marketing Overview Regression Test Cases']);
  notes.addRow([`Profile / Site: ${DC} — ${SITE}`]);
  notes.addRow([
    'Type: Regression (read-only). Do NOT Save Filter, create markers, Reset Widgets, edit/delete dashboards, or switch users.',
  ]);
  notes.addRow(['Do not hard-code dashboard name, lookback, campaign names, or metric totals.']);
  notes.addRow(['Columns: Test Case ID | Type | Module | Submodule | Title | Steps | Expected Results | Status']);
  notes.addRow([`Total cases: ${enriched.length}`]);
  notes.addRow([`Help / DOC: ${HELP}`]);
  notes.addRow([`Automation: ${AUTOMATION}`]);
  notes.addRow([`Execution status: ${EXECUTION_STATUS}`]);
  notes.addRow([`Execution note: ${EXECUTION_NOTE}`]);
  notes.addRow([
    'Ambiguities: dashboard "_BTT Marketing Overview" may be site-specific; Source table may be empty; Tablet series may be empty; Viewing/Editing read-only only.',
  ]);
  notes.getRow(1).font = { bold: true };

  const outPath = path.join(__dirname, '..', 'docs', 'Marketing_Overview_Regression.xlsx');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  let writtenPath = outPath;
  try {
    await workbook.xlsx.writeFile(outPath);
  } catch (error) {
    if (!error || error.code !== 'EBUSY') throw error;
    writtenPath = path.join(__dirname, '..', 'docs', 'Marketing_Overview_Regression_run.xlsx');
    await workbook.xlsx.writeFile(writtenPath);
    console.warn(`Primary workbook is open/locked; wrote fallback → ${writtenPath}`);
  }
  console.log(`Wrote ${enriched.length} test cases → ${writtenPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
