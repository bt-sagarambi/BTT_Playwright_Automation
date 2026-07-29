/**
 * Generates docs/RUM_Aggregate_Waterfall_Regression.xlsx
 * Matches RUM PC/PO template: Summary | Regression TCs | Notes
 * Run: node scripts/generate-rum-aw-regression-excel.js
 */
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');

const SITE = 'GDC Test Site 2';
const DC = 'US';
const MODULE = 'Real User Monitoring (RUM)';
const AUTOMATION =
  'tests/regression_tests/US2/monitoring/real-user-browser/aggregate-waterfall/rum.aggregate-waterfall.browser.regression.spec.ts';

const cases = [
  {
    id: 'REG-RUM-AW-001',
    submodule: 'Navigation',
    title: 'Page loads via menu/route with correct title',
    steps: [
      '1. Login to Blue Triangle portal',
      `2. Ensure site is "${SITE}" (${DC})`,
      '3. Open Full Menu: Monitoring > Real User Browser > Aggregate Waterfall',
      '4. Observe title and URL',
    ].join('\n'),
    expected: [
      'Title includes Aggregate Waterfall',
      'URL contains real-user-monitoring/object-level-trending',
    ].join('\n'),
  },
  {
    id: 'REG-RUM-AW-002',
    submodule: 'Default Load',
    title: 'Default Domain Level, metric cards, and Resource Timings render',
    steps: [
      '1. Open Aggregate Waterfall',
      '2. Wait for Domain Level Detail, metric cards, Resource Timings By File',
    ].join('\n'),
    expected: [
      'Domain Level tab visible',
      'Nine metric cards show values',
      'Resource Timings table has rows',
    ].join('\n'),
  },
  {
    id: 'REG-RUM-AW-003',
    submodule: 'UI',
    title: 'Performance Detail button is visible and opens Performance Detail',
    steps: ['1. Click Performance Detail button', '2. Observe navigation / new tab'].join('\n'),
    expected: ['Performance Detail page or route opens'].join('\n'),
  },
  {
    id: 'REG-RUM-AW-004',
    submodule: 'Top Filters',
    title: 'Top filter badges (Data Origin, Time Period, Device, Browser, OS, Bot Traffic) are present',
    steps: [
      '1. Locate top filter badges above main content',
      '2. Confirm Data Origin, Time Period, Device, Browser, OS, Bot Traffic badges',
    ].join('\n'),
    expected: ['Listed top filter badges are present'].join('\n'),
  },
  {
    id: 'REG-RUM-AW-005',
    submodule: 'Top Filters',
    title: 'Expand/collapse page-controls toggle near top filters',
    steps: [
      '1. Click the chevron expand/collapse control (page-controls-toggle)',
      '2. Observe filter strip state',
      '3. Toggle again',
    ].join('\n'),
    expected: ['Control responds (expanded/collapsed) without page error'].join('\n'),
  },
  {
    id: 'REG-RUM-AW-006',
    submodule: 'Top Filters',
    title: 'Top filter combo: Data Origin = RUM Browser',
    steps: [
      '1. Click Data Originated From badge',
      '2. Select RUM Browser',
      '3. Click Apply',
      '4. Confirm badge text and charts/tables refresh',
    ].join('\n'),
    expected: ['Badge shows RUM Browser', 'Domain/Object/Resource data refreshes'].join('\n'),
  },
  {
    id: 'REG-RUM-AW-007',
    submodule: 'Top Filters',
    title: 'Top filter combo: Data Origin = Native Webview',
    steps: ['1. Open Data Originated From quick filter', '2. Select Native Webview → Apply'].join('\n'),
    expected: ['Badge shows Native Webview', 'Data refreshes'].join('\n'),
  },
  {
    id: 'REG-RUM-AW-008',
    submodule: 'Top Filters',
    title: 'Top filter combo: Device = Mobile',
    steps: ['1. Click Device badge', '2. Check Mobile (uncheck others)', '3. Apply'].join('\n'),
    expected: ['Device badge updates', 'Data refreshes'].join('\n'),
  },
  {
    id: 'REG-RUM-AW-009',
    submodule: 'Top Filters',
    title: 'Top filter combo: Device = Desktop',
    steps: ['1. Click Device badge', '2. Check Desktop → Apply'].join('\n'),
    expected: ['Device badge updates', 'Data refreshes'].join('\n'),
  },
  {
    id: 'REG-RUM-AW-010',
    submodule: 'Top Filters',
    title: 'Top filter combo: Browser = Chrome',
    steps: ['1. Click Browser badge', '2. Check Chrome → Apply'].join('\n'),
    expected: ['Browser badge updates', 'Data refreshes'].join('\n'),
  },
  {
    id: 'REG-RUM-AW-011',
    submodule: 'Top Filters',
    title: 'Top filter combo: OS = Windows',
    steps: ['1. Click OS badge', '2. Check Windows → Apply'].join('\n'),
    expected: ['OS badge updates', 'Data refreshes'].join('\n'),
  },
  {
    id: 'REG-RUM-AW-012',
    submodule: 'Top Filters',
    title: 'Top filter combo: Bot Traffic = Include Bots',
    steps: ['1. Click Bot Traffic badge', '2. Select Include Bots → Apply'].join('\n'),
    expected: ['Bot Traffic badge updates', 'Data refreshes'].join('\n'),
  },
  {
    id: 'REG-RUM-AW-013',
    submodule: 'Top Filters',
    title: 'Top filter combo: Time Period = Last 6 Hours',
    steps: ['1. Click Time Period badge', '2. Select Last 6 Hours', '3. Confirm data refresh'].join('\n'),
    expected: ['Time Period badge updates', 'Charts/tables refresh'].join('\n'),
  },
  {
    id: 'REG-RUM-AW-014',
    submodule: 'Top Filters',
    title: 'Top filter combo: Data Origin RUM Browser + Device Mobile + Browser Chrome',
    steps: [
      '1. Apply Data Origin = RUM Browser',
      '2. Apply Device = Mobile',
      '3. Apply Browser = Chrome',
      '4. Confirm badges + data refresh',
    ].join('\n'),
    expected: ['Combined filters apply', 'Data refreshes'].join('\n'),
  },
  {
    id: 'REG-RUM-AW-015',
    submodule: 'Top Filters',
    title: 'Top filter combo: restore Data Origin both + Exclude Bots + Last 24 Hours',
    steps: [
      '1. Restore Data Origin = RUM Browser & Native Webview',
      '2. Bot Traffic = Exclude Bots',
      '3. Time Period = Last 24 Hours',
    ].join('\n'),
    expected: ['Badges reflect restore selections', 'Data refreshes'].join('\n'),
  },
  {
    id: 'REG-RUM-AW-016',
    submodule: 'Pie Charts',
    title: 'Toggle Pie Charts ON shows Page Views By Page and File Count By Traffic Segment',
    steps: ['1. Click Toggle Pie Charts', '2. Observe pie chart row'].join('\n'),
    expected: ['Page Views By Page visible', 'File Count By Traffic Segment visible'].join('\n'),
  },
  {
    id: 'REG-RUM-AW-017',
    submodule: 'Pie Charts',
    title: 'Toggle Pie Charts OFF hides pie row; Domain/Object content intact',
    steps: ['1. Click Toggle Pie Charts again', '2. Confirm Domain/Object still intact'].join('\n'),
    expected: ['Pie row hidden', 'Domain Level tab still usable'].join('\n'),
  },
  {
    id: 'REG-RUM-AW-018',
    submodule: 'Domain Level',
    title: 'Domain Level Waterfall View shows Domain Level Activity graph',
    steps: ['1. Select Domain Level Detail', '2. Click Waterfall View icon'].join('\n'),
    expected: ['Domain Level Activity waterfall/graph is visible'].join('\n'),
  },
  {
    id: 'REG-RUM-AW-019',
    submodule: 'Domain Level',
    title: 'Domain Level Table View headers and Impact Score column',
    steps: ['1. Switch to Table View', '2. Review column headers'].join('\n'),
    expected: [
      'Headers include Domain, File Count, Domain Activity, % of Impact, % of Onload Activity, Impact Score, Tag Quality',
    ].join('\n'),
  },
  {
    id: 'REG-RUM-AW-020',
    submodule: 'Domain Level',
    title: 'Domain party filter 1st / 3rd / All refreshes data',
    steps: ['1. Click 1st Party', '2. Click 3rd Party', '3. Click All'].join('\n'),
    expected: ['Each selection refreshes Domain Activity / table without error'].join('\n'),
  },
  {
    id: 'REG-RUM-AW-021',
    submodule: 'Domain Level',
    title: 'Slowest Domains Before metric change refreshes Domain view',
    steps: [
      '1. Open Slowest Domains Before',
      '2. Change metric (e.g. Onload → LCP/TTI/120 Seconds)',
    ].join('\n'),
    expected: ['Domain waterfall/table/metric cards refresh'].join('\n'),
  },
  {
    id: 'REG-RUM-AW-022',
    submodule: 'Domain Level',
    title: 'Domain row expand opens Domain Timings Over Time',
    steps: ['1. In Domain table, click expand icon on first row'].join('\n'),
    expected: ['Domain Timings Over Time graph appears'].join('\n'),
  },
  {
    id: 'REG-RUM-AW-023',
    submodule: 'Domain Level',
    title: 'Domain table search / sort / pager sample',
    steps: ['1. Sort a column', '2. Search table', '3. Change page size if available'].join('\n'),
    expected: ['Sort/search/pager respond without error'].join('\n'),
  },
  {
    id: 'REG-RUM-AW-024',
    submodule: 'Domain Level',
    title: 'Customize Table open + Save & Close (column prefs)',
    steps: [
      '1. Click Customize Table',
      '2. Verify Reset / Revert to Default / Save & Close',
      '3. Save & Close',
    ].join('\n'),
    expected: ['Modal opens with column controls', 'Table remains after save'].join('\n'),
  },
  {
    id: 'REG-RUM-AW-025',
    submodule: 'Domain Level',
    title: 'Export menu lists CSV / TSV / JSON',
    steps: ['1. Open Export near Domain/Resource table'].join('\n'),
    expected: ['CSV, TSV, JSON options available'].join('\n'),
  },
  {
    id: 'REG-RUM-AW-026',
    submodule: 'Object Level',
    title: 'Object Level Detail tab switches content',
    steps: ['1. Click Object Level Detail', '2. Select Waterfall View'].join('\n'),
    expected: ['Object tab active / content loads', 'Charts or tables remain healthy'].join('\n'),
  },
  {
    id: 'REG-RUM-AW-027',
    submodule: 'Object Level',
    title: 'Object Level Table View headers',
    steps: ['1. Switch Object to Table View', '2. Review headers'].join('\n'),
    expected: [
      'Headers include File Name, Domain, File Count, Relative Start Time, Duration, % of Impact, Impact Score, Tag Quality',
    ].join('\n'),
  },
  {
    id: 'REG-RUM-AW-028',
    submodule: 'Object Level',
    title: 'Object row expand opens Resource Timings Over Time',
    steps: ['1. Click expand icon on first Object table row'].join('\n'),
    expected: ['Resource Timings Over Time (or similar) graph appears'].join('\n'),
  },
  {
    id: 'REG-RUM-AW-029',
    submodule: 'Resource Timings',
    title: 'Resource Timings By File table headers and rows',
    steps: ['1. Scroll to Resource Timings By File', '2. Review columns and rows'].join('\n'),
    expected: [
      'Core columns include Domain, File, Element Count, Duration',
      'Table has data rows',
    ].join('\n'),
  },
  {
    id: 'REG-RUM-AW-030',
    submodule: 'Markers',
    title: 'Markers dropdown lists Hide/Show/Toggle/Create options',
    steps: ['1. Open markers dropdown near Performance Detail'].join('\n'),
    expected: [
      'Options include Hide All, Show All, Toggle Custom, Toggle Global, Create Custom, Create Global',
    ].join('\n'),
  },
  {
    id: 'REG-RUM-AW-031',
    submodule: 'Markers',
    title: 'Toggle Hide All / Show All Markers options apply',
    steps: ['1. Select Hide All Markers', '2. Select Show All Markers'].join('\n'),
    expected: ['Options apply without page error'].join('\n'),
  },
  {
    id: 'REG-RUM-AW-032',
    submodule: 'Markers',
    title: 'Create Custom Marker opens create form in new tab',
    steps: ['1. Choose Create Custom Marker'].join('\n'),
    expected: ['New tab opens site-level-events/create with event name field'].join('\n'),
  },
  {
    id: 'REG-RUM-AW-033',
    submodule: 'Markers',
    title: 'Create Global Marker opens create form in new tab',
    steps: ['1. Choose Create Global Marker'].join('\n'),
    expected: ['New tab opens global-level-events/create'].join('\n'),
  },
  {
    id: 'REG-RUM-AW-034',
    submodule: 'Markers',
    title: 'Create Custom Marker record and find it via search',
    steps: ['1. Create custom marker with unique name', '2. Search list for name'].join('\n'),
    expected: ['Marker is created and findable via search'].join('\n'),
  },
  {
    id: 'REG-RUM-AW-035',
    submodule: 'Markers',
    title: 'Create Global Marker record and find it via search',
    steps: ['1. Create global marker with unique name', '2. Search list for name'].join('\n'),
    expected: ['Marker is created and findable via search'].join('\n'),
  },
  {
    id: 'REG-RUM-AW-036',
    submodule: 'Comparison',
    title: 'Run Comparison loads compare graph and Duration/Count tabs',
    steps: [
      '1. Click Run Comparison',
      '2. Adjust comparison filters',
      '3. Click Apply Filters For Comparison',
      '4. Toggle Duration / Count',
    ].join('\n'),
    expected: [
      'Comparison graph loads',
      'Duration/Count tabs available',
      "What's Changed summary may appear",
    ].join('\n'),
  },
  {
    id: 'REG-RUM-AW-037',
    submodule: 'Comparison',
    title: 'Cancel comparison / filters returns toward baseline view',
    steps: ['1. Click Cancel on comparison filters if present'].join('\n'),
    expected: ['Domain Level remains usable', 'Charts/tables ready'].join('\n'),
  },
  {
    id: 'REG-RUM-AW-038',
    submodule: 'Filters',
    title: 'Right-nav Filters sample (data origin) refreshes charts/tables',
    steps: [
      '1. Open Filters (right nav)',
      '2. Change Data Origin',
      '3. Click Apply Filters',
      '4. Do NOT Save Filter',
    ].join('\n'),
    expected: ['Domain/Object/Resource data refresh'].join('\n'),
  },
  {
    id: 'REG-RUM-AW-039',
    submodule: 'Time Period',
    title: 'Time Period Last 6 hours refreshes data',
    steps: [
      '1. Open Filters → Time Period',
      '2. Select Last 6 hours',
      '3. Apply Filters',
    ].join('\n'),
    expected: ['Data reloads for 6 hour window'].join('\n'),
  },
  {
    id: 'REG-RUM-AW-040',
    submodule: 'Time Period',
    title: 'Time Period Last 24 hours refreshes data',
    steps: [
      '1. Open Filters → Time Period',
      '2. Select Last 24 hours',
      '3. Apply Filters',
    ].join('\n'),
    expected: ['Data reloads for 24 hour window'].join('\n'),
  },
  {
    id: 'REG-RUM-AW-041',
    submodule: 'Time Period',
    title: 'Time Period Last 7 days refreshes data',
    steps: [
      '1. Open Filters → Time Period',
      '2. Select Last 7 days',
      '3. Apply Filters',
    ].join('\n'),
    expected: ['Data reloads for 7 day window'].join('\n'),
  },
  {
    id: 'REG-RUM-AW-042',
    submodule: 'Time Period',
    title: 'Time Period Last 30 days refreshes data',
    steps: [
      '1. Open Filters → Time Period',
      '2. Select Last 30 days',
      '3. Apply Filters',
    ].join('\n'),
    expected: ['Data reloads for 30 day window'].join('\n'),
  },
  {
    id: 'REG-RUM-AW-043',
    submodule: 'UI',
    title: 'Info / tooltip sample on Domain/Object/Waterfall/Table controls',
    steps: ['1. Inspect data-original-title / i icons on tabs and view toggles'].join('\n'),
    expected: ['Tooltip/attribute information is available'].join('\n'),
  },
  {
    id: 'REG-RUM-AW-044',
    submodule: 'UI',
    title: 'Top-nav Filters / Share controls remain usable',
    steps: ['1. Confirm Filters and Share icons in top navigation'].join('\n'),
    expected: ['Controls are visible/usable'].join('\n'),
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
    status: 'Not Executed',
  }));

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'BTT Playwright Automation';
  workbook.created = new Date();

  const summary = workbook.addWorksheet('Summary', { views: [{ state: 'frozen', ySplit: 3 }] });
  summary.getColumn(1).width = 36;
  summary.getColumn(2).width = 18;
  summary.addRow(['RUM Aggregate Waterfall — Regression Summary']);
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
    { header: 'Submodule', key: 'submodule', width: 18 },
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
  notes.addRow(['Blue Triangle Portal — RUM Aggregate Waterfall (Browser) Regression']);
  notes.addRow([`Profile / Site: ${DC} — ${SITE}`]);
  notes.addRow([
    'Includes write coverage for Create Custom Marker and Create Global Marker. Customize Table Save & Close allowed.',
  ]);
  notes.addRow(['Filter Save is not exercised. Metric/filter/time-period coverage is sampled.']);
  notes.addRow([
    'Columns: Test Case ID | Type | Module | Submodule | Title | Steps | Expected Results | Status',
  ]);
  notes.addRow([
    `Total cases: ${enriched.length} (${enriched[0].testCaseId}..${enriched[enriched.length - 1].testCaseId})`,
  ]);
  notes.addRow([`Automation mapping: ${AUTOMATION}`]);
  notes.addRow([
    'Assumptions: reverse-engineered from live page + Help Center Aggregate Waterfall PDF; Impact Score face thresholds are informational.',
  ]);
  notes.getRow(1).font = { bold: true };

  const outDir = path.join(__dirname, '..', 'docs');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'RUM_Aggregate_Waterfall_Regression.xlsx');
  try {
    await workbook.xlsx.writeFile(outPath);
    console.log(`Wrote ${enriched.length} test cases → ${outPath}`);
  } catch (err) {
    const alt = path.join(outDir, 'RUM_Aggregate_Waterfall_Regression_updated.xlsx');
    await workbook.xlsx.writeFile(alt);
    console.warn(
      `Primary xlsx locked; wrote ${enriched.length} cases → ${alt} (${
        err instanceof Error ? err.message : String(err)
      })`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
