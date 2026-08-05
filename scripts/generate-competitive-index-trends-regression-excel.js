/**
 * Generates docs/Competitive_Index_Trends_Regression.xlsx
 * Sheets: Summary / Regression TCs / Notes
 *
 * Run: node scripts/generate-competitive-index-trends-regression-excel.js
 */
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');

const SITE = 'GDC Test Site 2';
const DC = 'US';
const MODULE = 'Business Insights — Improve Traffic';
const AUTOMATION =
  'tests/regression_tests/US2/business-insights/improve-traffic/competitive-index-trends/competitive.index.trends.regression.spec.ts';
const EXECUTION_STATUS = process.env.CITR_EXECUTION_STATUS || 'Not Executed';
const EXECUTION_NOTE =
  process.env.CITR_EXECUTION_NOTE ||
  'Run npm run test:regression:us2:competitive-index-trends and record live-data annotations from Allure.';

const cases = [
  {
    id: 'REG-CITr-001',
    submodule: 'Navigation',
    title: 'Page loads with Competitive Index title, Trends breadcrumb and view=trends',
    steps: [
      '1. Login to Blue Triangle portal',
      `2. Ensure site is "${SITE}" (${DC})`,
      '3. Open Menu > Business Insights > Improve Traffic > Competitive Index Trends',
      '4. Observe document title, #page-title and URL',
    ].join('\n'),
    expected: [
      'Document title matches /Competitive Index/i',
      '#page-title matches Competitive Index / Trends',
      'URL contains competitive-index/index and view=trends',
    ].join('\n'),
  },
  {
    id: 'REG-CITr-002',
    submodule: 'Default Load',
    title: 'Default TRENDS VIEW active with filter chrome settled',
    steps: ['1. Confirm TRENDS VIEW active', '2. Wait for Trends filter / chart hosts'].join('\n'),
    expected: ['#trends-tab active', 'Filter chrome or charts present, or controlled empty'].join('\n'),
  },
  {
    id: 'REG-CITr-003',
    submodule: 'Context',
    title: 'Portal site GDC Test Site 2; quick badges present',
    steps: ['1. Confirm portal site', '2. Capture Time Period / Industry / Statistical Method badges'].join('\n'),
    expected: ['Site is GDC Test Site 2', 'Representative badges non-empty'].join('\n'),
  },
  {
    id: 'REG-CITr-004',
    submodule: 'Selectors',
    title: 'Trends Industry / Vertical / Group Select2 visible',
    steps: ['1. Locate Trends Select2 containers under TRENDS VIEW'].join('\n'),
    expected: ['Industry, Vertical, Group Select2 containers visible'].join('\n'),
  },
  {
    id: 'REG-CITr-005',
    submodule: 'Tabs',
    title: 'TRENDS VIEW and TABLE VIEW tabs switch; restore TRENDS',
    steps: ['1. Switch to TABLE VIEW', '2. Return to TRENDS VIEW'].join('\n'),
    expected: ['Active tab updates', 'view=trends URL restored'].join('\n'),
  },
  {
    id: 'REG-CITr-006',
    submodule: 'Tabs',
    title: 'Rapid TRENDS ↔ TABLE leaves TRENDS VIEW healthy',
    steps: ['1. Rapid tab switches ending on TRENDS VIEW'].join('\n'),
    expected: ['Trends selectors healthy', 'view=trends'].join('\n'),
  },
  {
    id: 'REG-CITr-007',
    submodule: 'Trends Filters',
    title: 'Search Companies + Clear Sites Toggles chrome present',
    steps: ['1. Locate Search Companies / Clear Sites / company toggler'].join('\n'),
    expected: ['Search or toggler present'].join('\n'),
  },
  {
    id: 'REG-CITr-008',
    submodule: 'Industry',
    title: 'Change Industry (runtime) and soft-compare chart signature; restore',
    steps: [
      '1. Capture chart signature',
      '2. Select alternate Industry (runtime-derived)',
      '3. Soft-compare signature',
      '4. Restore original Industry',
    ].join('\n'),
    expected: ['Industry changes without hard-coded names', 'Original Industry restored'].join('\n'),
  },
  {
    id: 'REG-CITr-009',
    submodule: 'Vertical',
    title: 'Change Vertical (runtime) when alternates exist; restore',
    steps: ['1. Change Vertical if options exist', '2. Restore original'].join('\n'),
    expected: ['Soft handling when only All Verticals', 'Vertical restored'].join('\n'),
  },
  {
    id: 'REG-CITr-010',
    submodule: 'Groups',
    title: 'Group selector soft-open (empty groups OK)',
    steps: ['1. Open Group Select2', '2. Observe options or No results found'].join('\n'),
    expected: ['Empty groups do not fail the case'].join('\n'),
  },
  {
    id: 'REG-CITr-011',
    submodule: 'Search',
    title: 'Search Companies with runtime token then clear',
    steps: ['1. Sample toggle label token', '2. Search', '3. Clear'].join('\n'),
    expected: ['Search works without hard-coded company names', 'List usable after clear'].join('\n'),
  },
  {
    id: 'REG-CITr-012',
    submodule: 'Site Toggles',
    title: 'Toggle sample sites then Clear Sites Toggles',
    steps: ['1. Toggle first few site checkboxes', '2. Soft-compare chart', '3. Clear Sites Toggles'].join(
      '\n'
    ),
    expected: ['No hard-coded *_toggle_container IDs', 'Baseline cleared'].join('\n'),
  },
  {
    id: 'REG-CITr-013',
    submodule: 'Groups UI',
    title: 'Create Group / Manage Groups / View Metric soft open-close (no Save)',
    steps: ['1. Soft open each present control', '2. Escape/Cancel close'].join('\n'),
    expected: ['No permanent Group Save'].join('\n'),
  },
  {
    id: 'REG-CITr-014',
    submodule: 'Filters Collapse',
    title: '#hideTrendFilters collapse/expand soft-check',
    steps: ['1. Click hide/show Trends filters control twice'].join('\n'),
    expected: ['Control operable or annotated missing'].join('\n'),
  },
  {
    id: 'REG-CITr-015',
    submodule: 'Charts',
    title: 'Primary chart host soft-assert (#groupsChart / containers)',
    steps: ['1. Count visible Highcharts', '2. Soft-assert primary hosts'].join('\n'),
    expected: ['Charts present OR controlled empty annotated', 'No dynamic highcharts-* IDs'].join('\n'),
  },
  {
    id: 'REG-CITr-016',
    submodule: 'Charts',
    title: 'Groups chart title soft-regex (industry / metric wording)',
    steps: ['1. Read #groupsChart title text'].join('\n'),
    expected: ['Soft regex against compare/average/industry/metric wording'].join('\n'),
  },
  {
    id: 'REG-CITr-017',
    submodule: 'Charts',
    title: '#industryTrendChart presence soft (0×0 OK)',
    steps: ['1. Locate #industryTrendChart', '2. Note bounding box if 0×0'].join('\n'),
    expected: ['Present or annotated collapsed — not hard fail on visibility'].join('\n'),
  },
  {
    id: 'REG-CITr-018',
    submodule: 'Table Soft',
    title: 'TABLE VIEW soft parity then restore TRENDS',
    steps: ['1. Switch TABLE VIEW', '2. Soft-check Company/Vertical headers', '3. Return TRENDS'].join('\n'),
    expected: ['view=trends restored', 'Not full Table suite depth'].join('\n'),
  },
  {
    id: 'REG-CITr-019',
    submodule: 'Table Soft',
    title: 'TABLE chrome soft: Export / Select Metrics / Add Comparison',
    steps: ['1. Soft-check chrome on TABLE VIEW', '2. Open/close Add Comparison if present', '3. Restore TRENDS'].join(
      '\n'
    ),
    expected: ['No permanent metric/comparison mutations', 'view=trends'].join('\n'),
  },
  {
    id: 'REG-CITr-020',
    submodule: 'Filters Drawer',
    title: 'Filters pane labels (Time Period, Timezone, Statistical Method)',
    steps: ['1. Open Filters drawer', '2. Sample labels'].join('\n'),
    expected: ['Representative filter labels present'].join('\n'),
  },
  {
    id: 'REG-CITr-021',
    submodule: 'Filters Drawer',
    title: 'Soft-apply ~7d / ~30d time periods; restore Trends health',
    steps: ['1. Soft-apply 7-day and 30-day presets if available', '2. Confirm Trends healthy'].join('\n'),
    expected: ['Charts healthy or controlled empty', 'No Save Filter'].join('\n'),
  },
  {
    id: 'REG-CITr-022',
    submodule: 'Filters Drawer',
    title: 'Statistical Method / Percentile Select2 soft-open',
    steps: ['1. Open Filters', '2. Soft-open Statistical Method / Percentile if present'].join('\n'),
    expected: ['Controls present or annotated'].join('\n'),
  },
  {
    id: 'REG-CITr-023',
    submodule: 'Filters Drawer',
    title: 'Cancel/Escape closes Filters without Save Filter',
    steps: ['1. Open Filters', '2. Cancel or Escape'].join('\n'),
    expected: ['No sticky Save Filter', 'Still on Competitive Index'].join('\n'),
  },
  {
    id: 'REG-CITr-024',
    submodule: 'Filters Drawer',
    title: 'My Filters / Shared Filters tabs read-only soft inspect',
    steps: ['1. Open Filters', '2. Click My/Shared tabs if present (do not Save)'].join('\n'),
    expected: ['Read-only inspect only'].join('\n'),
  },
  {
    id: 'REG-CITr-025',
    submodule: 'A11y soft',
    title: 'Info-icon / tooltip soft presence on chrome',
    steps: ['1. Count info/tooltip hosts'].join('\n'),
    expected: ['Present or soft-annotated missing'].join('\n'),
  },
  {
    id: 'REG-CITr-026',
    submodule: 'A11y soft',
    title: 'Keyboard focus soft (search, Clear Sites, Filters)',
    steps: ['1. Focus search, Clear Sites, Filters toggle'].join('\n'),
    expected: ['Focus attempted', 'CI-tabs may be non-focusable DIV (annotate)'].join('\n'),
  },
  {
    id: 'REG-CITr-027',
    submodule: 'Responsive',
    title: 'Narrow desktop keeps Trends chrome/chart reachable',
    steps: ['1. Set ~1100px width', '2. Verify Trends selectors/charts reachable', '3. Restore width'].join('\n'),
    expected: ['Primary Trends chrome still reachable'].join('\n'),
  },
  {
    id: 'REG-CITr-028',
    submodule: 'Recovery',
    title: 'Back/Forward/refresh recovery prefers view=trends',
    steps: ['1. Navigate history and reload', '2. Restore TRENDS VIEW'].join('\n'),
    expected: ['Healthy Trends state preferred'].join('\n'),
  },
  {
    id: 'REG-CITr-029',
    submodule: 'Non-functional',
    title: 'Chart hosts not unreasonably duplicated after refresh',
    steps: ['1. Reload', '2. Count #groupsChart and #industryTrendChartContainer'].join('\n'),
    expected: ['Key hosts exist singly (≤2) when present'].join('\n'),
  },
  {
    id: 'REG-CITr-030',
    submodule: 'Recovery',
    title: 'Final recovery: Trends view, cleared toggles, no sticky table',
    steps: ['1. Restore captured Industry/Vertical', '2. Clear Sites Toggles', '3. Confirm TRENDS + view=trends'].join(
      '\n'
    ),
    expected: ['Never permanently on view=table', 'No permanent groups/filters saved'].join('\n'),
  },
];

async function main() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'BlueTriangle_Automation';
  wb.created = new Date();

  const summary = wb.addWorksheet('Summary');
  summary.columns = [
    { header: 'Field', key: 'field', width: 28 },
    { header: 'Value', key: 'value', width: 100 },
  ];
  const summaryRows = [
    ['Module', MODULE],
    ['Screen', 'Competitive Index Trends'],
    ['Site', SITE],
    ['Data center', DC],
    ['Menu path', 'Business Insights > Improve Traffic > Competitive Index Trends'],
    ['Route', 'competitive-index/index&view=trends'],
    ['Smoke catalog', 'mkt.competitive-trends'],
    ['Sibling soft-scope', 'mkt.competitive-table (view=table) — in-page TABLE VIEW only'],
    ['Browser title', 'Competitive Index'],
    ['#page-title', 'Competitive Index / Trends'],
    ['Automation spec', AUTOMATION],
    ['POM', 'pages/CompetitiveIndexTrendsPage.ts'],
    ['Locators', 'locators/CompetitiveIndexTrendsLocators.ts'],
    ['npm command', 'npm run test:regression:us2:competitive-index-trends'],
    ['Case count', String(cases.length)],
    ['Execution status', EXECUTION_STATUS],
    ['Execution note', EXECUTION_NOTE],
    [
      'Out of scope',
      'API/DB, Save Filter, permanent Groups, Clear Cache, Revenue Attribution, hard-coded company/industry/metric totals',
    ],
  ];
  summaryRows.forEach(([field, value]) => summary.addRow({ field, value }));
  summary.getRow(1).font = { bold: true };

  const tcs = wb.addWorksheet('Regression TCs');
  tcs.columns = [
    { header: 'TC ID', key: 'id', width: 14 },
    { header: 'Module', key: 'module', width: 36 },
    { header: 'Submodule', key: 'submodule', width: 18 },
    { header: 'Title', key: 'title', width: 70 },
    { header: 'Priority', key: 'priority', width: 10 },
    { header: 'Type', key: 'type', width: 12 },
    { header: 'Steps', key: 'steps', width: 55 },
    { header: 'Expected Result', key: 'expected', width: 55 },
    { header: 'Automation', key: 'auto', width: 14 },
    { header: 'Status', key: 'status', width: 14 },
  ];
  cases.forEach((c) => {
    tcs.addRow({
      id: c.id,
      module: MODULE,
      submodule: c.submodule,
      title: c.title,
      priority: 'High',
      type: 'Regression',
      steps: c.steps,
      expected: c.expected,
      auto: 'Automated',
      status: EXECUTION_STATUS,
    });
  });
  tcs.getRow(1).font = { bold: true };
  tcs.eachRow((row, n) => {
    if (n === 1) return;
    row.getCell('steps').alignment = { wrapText: true, vertical: 'top' };
    row.getCell('expected').alignment = { wrapText: true, vertical: 'top' };
  });

  const notes = wb.addWorksheet('Notes');
  notes.columns = [
    { header: 'Topic', key: 'topic', width: 28 },
    { header: 'Detail', key: 'detail', width: 110 },
  ];
  const noteRows = [
    [
      'Purpose',
      'Competitive Index Trends enables Industry Benchmarks charts: multi-site trends and industry average for selected metrics (Lighthouse + synthetic).',
    ],
    [
      'Live SoT',
      'Prefer live BI menu, #page-title Trends, view=trends and Trends control IDs over Help Center PDF high-level wording.',
    ],
    [
      'Do not hard-code',
      'Industry, vertical, company/group names, metric values, series point counts, time period strings, toggle container IDs.',
    ],
    [
      'Empty Groups',
      'Group selector may show “No results found” — soft-annotate, do not fail solely on missing groups.',
    ],
    [
      'Charts',
      'Assert scoped hosts (#groupsChart, #industryTrendChartContainer) and title/signature — not SVG path geometry or dynamic highcharts-* IDs. 0×0 industry chart is soft-OK.',
    ],
    [
      'Table soft only',
      'TABLE VIEW soft parity only; restore TRENDS / view=trends. Full grid coverage lives in Competitive Index Table suite.',
    ],
    [
      'Mutations out of scope',
      'No Save Filter, permanent Manage Groups Save, Clear Cache, sticky uncleared site toggles if Clear Sites exists.',
    ],
    [
      'Twin suite',
      'Competitive Index Table uses same competitive-index/index route with view=table.',
    ],
    ['Execution', EXECUTION_NOTE],
  ];
  noteRows.forEach(([topic, detail]) => notes.addRow({ topic, detail }));
  notes.getRow(1).font = { bold: true };

  const outDir = path.join(__dirname, '..', 'docs');
  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, 'Competitive_Index_Trends_Regression.xlsx');
  await wb.xlsx.writeFile(out);
  console.log(`Wrote ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
