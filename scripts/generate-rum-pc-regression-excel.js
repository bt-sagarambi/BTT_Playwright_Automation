/**
 * Generates docs/RUM_Performance_Comparison_Regression.xlsx
 * Run: node scripts/generate-rum-pc-regression-excel.js
 */
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');

const SITE = 'GDC Test Site 2';
const DC = 'US';
const MODULE = 'Real User Monitoring (RUM)';
const AUTOMATION =
  'tests/regression_tests/US2/monitoring/real-user-browser/performance-comparison/rum.performance-comparison.browser.regression.spec.ts';

const cases = [
  {
    id: 'REG-RUM-PC-001',
    submodule: 'Navigation',
    title: 'Page loads via menu/route with correct title',
    steps: [
      '1. Login to Blue Triangle portal',
      `2. Ensure site is "${SITE}" (${DC})`,
      '3. Open Full Menu: Monitoring > Real User Browser > Performance Comparison',
      '4. Observe title and URL',
    ].join('\n'),
    expected: [
      'Title includes Performance Comparison',
      'URL contains real-user-monitoring/performance-comparison',
    ].join('\n'),
  },
  {
    id: 'REG-RUM-PC-002',
    submodule: 'Default Load',
    title: 'Default Onload graph and comparison table render',
    steps: [
      '1. Open Performance Comparison',
      '2. Wait for Onload chart and comparison table',
    ].join('\n'),
    expected: ['Onload Highcharts graph is visible', 'Comparison table has data rows'].join('\n'),
  },
  {
    id: 'REG-RUM-PC-003',
    submodule: 'Top Filters',
    title: 'Top filter badges (Data Origin, Time Period, Device, Browser, OS) are present',
    steps: ['1. Locate top filter badges above/near the graph', '2. Confirm Data Origin, Time Period, Device, Browser, OS badges'].join('\n'),
    expected: ['Listed top filter badges are present'].join('\n'),
  },
  {
    id: 'REG-RUM-PC-004',
    submodule: 'Top Filters',
    title: 'Expand/collapse page-controls toggle near graph filters',
    steps: ['1. Click the chevron expand/collapse control (page-controls-toggle)', '2. Observe filter strip state', '3. Toggle again'].join('\n'),
    expected: ['Control responds (expanded/collapsed) without page error'].join('\n'),
  },
  {
    id: 'REG-RUM-PC-005',
    submodule: 'Top Filters',
    title: 'Top filter combo: Data Origin = RUM Browser',
    steps: [
      '1. Click Data Originated From badge above Onload graph',
      '2. Select RUM Browser',
      '3. Click Apply',
      '4. Confirm badge text and graph refresh',
    ].join('\n'),
    expected: ['Badge shows RUM Browser', 'Onload graph refreshes'].join('\n'),
  },
  {
    id: 'REG-RUM-PC-006',
    submodule: 'Top Filters',
    title: 'Top filter combo: Data Origin = Native Webview',
    steps: ['1. Open Data Originated From quick filter', '2. Select Native Webview → Apply'].join('\n'),
    expected: ['Badge shows Native Webview', 'Graph refreshes'].join('\n'),
  },
  {
    id: 'REG-RUM-PC-007',
    submodule: 'Top Filters',
    title: 'Top filter combo: Device = Mobile',
    steps: ['1. Click Device badge', '2. Check Mobile (uncheck others)', '3. Apply'].join('\n'),
    expected: ['Device badge updates', 'Graph refreshes'].join('\n'),
  },
  {
    id: 'REG-RUM-PC-008',
    submodule: 'Top Filters',
    title: 'Top filter combo: Device = Desktop',
    steps: ['1. Click Device badge', '2. Check Desktop → Apply'].join('\n'),
    expected: ['Device badge updates', 'Graph refreshes'].join('\n'),
  },
  {
    id: 'REG-RUM-PC-009',
    submodule: 'Top Filters',
    title: 'Top filter combo: Browser = Chrome',
    steps: ['1. Click Browser badge', '2. Check Chrome → Apply'].join('\n'),
    expected: ['Browser badge updates', 'Graph refreshes'].join('\n'),
  },
  {
    id: 'REG-RUM-PC-010',
    submodule: 'Top Filters',
    title: 'Top filter combo: Browser = Safari',
    steps: ['1. Click Browser badge', '2. Check Safari → Apply'].join('\n'),
    expected: ['Browser badge updates', 'Graph refreshes'].join('\n'),
  },
  {
    id: 'REG-RUM-PC-011',
    submodule: 'Top Filters',
    title: 'Top filter combo: Time Period = Last 6 Hours',
    steps: ['1. Click Time Period badge', '2. Select Last 6 Hours', '3. Confirm graph refresh'].join('\n'),
    expected: ['Time Period badge updates', 'Onload graph refreshes'].join('\n'),
  },
  {
    id: 'REG-RUM-PC-012',
    submodule: 'Top Filters',
    title: 'Top filter combo: Data Origin RUM Browser + Device Mobile',
    steps: ['1. Apply Data Origin = RUM Browser', '2. Apply Device = Mobile', '3. Confirm badges + graph'].join('\n'),
    expected: ['Both badges reflect selections', 'Graph refreshes'].join('\n'),
  },
  {
    id: 'REG-RUM-PC-013',
    submodule: 'Top Filters',
    title: 'Top filter combo: Data Origin RUM Browser + Browser Chrome',
    steps: ['1. Apply Data Origin = RUM Browser', '2. Apply Browser = Chrome'].join('\n'),
    expected: ['Both badges reflect selections', 'Graph refreshes'].join('\n'),
  },
  {
    id: 'REG-RUM-PC-014',
    submodule: 'Top Filters',
    title: 'Top filter combo: Device Desktop + Browser Firefox',
    steps: ['1. Apply Device = Desktop', '2. Apply Browser = Firefox'].join('\n'),
    expected: ['Both badges reflect selections', 'Graph refreshes'].join('\n'),
  },
  {
    id: 'REG-RUM-PC-015',
    submodule: 'Top Filters',
    title: 'Top filter combo: Device Mobile + Browser Safari + Last 24 Hours',
    steps: [
      '1. Apply Time Period = Last 24 Hours from top badge',
      '2. Apply Device = Mobile',
      '3. Apply Browser = Safari',
    ].join('\n'),
    expected: ['All three filters reflected', 'Graph refreshes'].join('\n'),
  },
  {
    id: 'REG-RUM-PC-016',
    submodule: 'Top Filters',
    title: 'Top filter combo: Bucket Size = Minutes',
    steps: ['1. Click Bucket Size badge', '2. Select Minutes → Apply'].join('\n'),
    expected: ['Bucket Size badge shows Minutes', 'Graph refreshes'].join('\n'),
  },
  {
    id: 'REG-RUM-PC-017',
    submodule: 'Top Filters',
    title: 'Top filter combo: Native Webview + Desktop + Edge + Auto bucket',
    steps: [
      '1. Data Origin = Native Webview',
      '2. Device = Desktop',
      '3. Browser = Edge',
      '4. Bucket Size = Auto',
    ].join('\n'),
    expected: ['Badges reflect combination', 'Graph refreshes'].join('\n'),
  },
  {
    id: 'REG-RUM-PC-018',
    submodule: 'Top Filters',
    title: 'Top filter combo: restore Data Origin both + Last 7 Days + Auto',
    steps: [
      '1. Data Origin = RUM Browser & Native Webview',
      '2. Time Period = Last 7 Days',
      '3. Bucket Size = Auto',
    ].join('\n'),
    expected: ['Defaults restored for sampled fields', 'Graph refreshes'].join('\n'),
  },
  {
    id: 'REG-RUM-PC-019',
    submodule: 'Filters',
    title: 'Sample Data Origin filter refreshes Onload graph',
    steps: [
      '1. Open Filters',
      '2. Select Data Origin = RUM Browser (sample)',
      '3. Apply Filters',
      '4. Re-select RUM Browser & Native Webview and Apply',
    ].join('\n'),
    expected: ['Onload graph refreshes successfully for sampled Data Origin values'].join('\n'),
  },
  {
    id: 'REG-RUM-PC-020',
    submodule: 'Filters',
    title: 'Sample multi Page Name selection refreshes graph',
    steps: ['1. Open Filters → Page Name', '2. Select at least two pages (e.g. HomePage, pdp)', '3. Apply Filters'].join('\n'),
    expected: ['Graph and table refresh for the selected pages'].join('\n'),
  },
  {
    id: 'REG-RUM-PC-021',
    submodule: 'Markers',
    title: 'Markers dropdown lists Hide/Show/Toggle/Create options',
    steps: ['1. Open Markers dropdown (top-left of graph)', '2. Review options'].join('\n'),
    expected: [
      'Hide All Markers, Show All Markers, Toggle Custom Markers, Toggle Global Markers, Create Custom Marker, Create Global Marker are listed',
    ].join('\n'),
  },
  {
    id: 'REG-RUM-PC-022',
    submodule: 'Markers',
    title: 'Toggle Hide All / Show All Markers options apply',
    steps: ['1. Select Hide All Markers', '2. Select Show All Markers'].join('\n'),
    expected: ['Selections apply without breaking the Onload graph'].join('\n'),
  },
  {
    id: 'REG-RUM-PC-023',
    submodule: 'Markers',
    title: 'Create Custom Marker opens create form in new tab',
    steps: ['1. Markers → Create Custom Marker', '2. Observe new tab'].join('\n'),
    expected: ['New tab opens site-level-events/create (Creating Event Marker) with Create control'].join('\n'),
  },
  {
    id: 'REG-RUM-PC-024',
    submodule: 'Markers',
    title: 'Create Global Marker opens create form in new tab',
    steps: ['1. Markers → Create Global Marker', '2. Observe new tab'].join('\n'),
    expected: ['New tab opens global-level-events/create (Creating Global Event Marker)'].join('\n'),
  },
  {
    id: 'REG-RUM-PC-025',
    submodule: 'Markers',
    title: 'Create Custom Marker record and find it via search',
    steps: [
      '1. Create Custom Marker with unique name/annotation',
      '2. Click Create',
      '3. Search for the marker in the list/index',
    ].join('\n'),
    expected: ['Marker is created and discoverable via search'].join('\n'),
  },
  {
    id: 'REG-RUM-PC-026',
    submodule: 'Markers',
    title: 'Create Global Marker record and find it via search',
    steps: [
      '1. Create Global Marker with unique name/annotation',
      '2. Click Create',
      '3. Search for the marker in the list/index',
    ].join('\n'),
    expected: ['Global marker is created and discoverable via search'].join('\n'),
  },
  {
    id: 'REG-RUM-PC-027',
    submodule: 'Table',
    title: 'Comparison table headers are sortable',
    steps: ['1. Click Page Name column header', '2. Click Onload column header', '3. Click Date column header'].join('\n'),
    expected: ['Table reorders without error; rows remain visible'].join('\n'),
  },
  {
    id: 'REG-RUM-PC-028',
    submodule: 'Table',
    title: 'Table search filters rows',
    steps: ['1. Enter a search term in table Search', '2. Clear search'].join('\n'),
    expected: ['Search input filters the comparison table'].join('\n'),
  },
  {
    id: 'REG-RUM-PC-029',
    submodule: 'Table',
    title: 'Table pagination page-size control works (sample)',
    steps: ['1. Change page size to 25 / page', '2. Change back to 10 / page'].join('\n'),
    expected: ['Pager control updates table paging'].join('\n'),
  },
  {
    id: 'REG-RUM-PC-030',
    submodule: 'Filters',
    title: 'Right-nav Filters Apply refreshes graph (sample)',
    steps: ['1. Open right-nav Filters', '2. Click Apply Filters'].join('\n'),
    expected: ['Graph remains/refreshes successfully'].join('\n'),
  },
  {
    id: 'REG-RUM-PC-031',
    submodule: 'Time Period',
    title: 'Last 6 hours + Auto bucket (~1 min) + hover',
    steps: [
      '1. Filters → Time Period = Last 6 hours; Bucket Size = Auto',
      '2. Apply Filters',
      '3. Hover Onload graph left → right',
      '4. Validate bucket spacing ~1 minute',
    ].join('\n'),
    expected: ['Graph refreshes; Auto bucket ≈ 1 minute for Last 6 hours (sampled Highcharts x deltas)'].join('\n'),
  },
  {
    id: 'REG-RUM-PC-032',
    submodule: 'Time Period',
    title: 'Last 24 hours + Auto bucket (~5 min) + hover',
    steps: [
      '1. Time Period = Last 24 hours; Bucket Size = Auto; Apply',
      '2. Hover graph; validate ~5 minute buckets',
    ].join('\n'),
    expected: ['Auto bucket ≈ 5 minutes for Last 24 hours'].join('\n'),
  },
  {
    id: 'REG-RUM-PC-033',
    submodule: 'Time Period',
    title: 'Last 7 days + Auto bucket (~1 hour) + hover',
    steps: [
      '1. Time Period = Last 7 days; Bucket Size = Auto; Apply',
      '2. Hover graph; validate ~1 hour buckets',
    ].join('\n'),
    expected: ['Auto bucket ≈ 1 hour for Last 7 days'].join('\n'),
  },
  {
    id: 'REG-RUM-PC-034',
    submodule: 'Time Period',
    title: 'Last 30 days + Auto bucket (~1 day) + hover',
    steps: [
      '1. Time Period = Last 30 days; Bucket Size = Auto; Apply',
      '2. Hover graph; validate ~1 day buckets',
    ].join('\n'),
    expected: ['Auto bucket ≈ 1 day for Last 30 days'].join('\n'),
  },
  {
    id: 'REG-RUM-PC-035',
    submodule: 'UI',
    title: 'Info icon tooltip sample is available',
    steps: ['1. Hover an info (i) icon on the page', '2. Observe tooltip / title text'].join('\n'),
    expected: ['Tooltip/title text is available for sampled info icon'].join('\n'),
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
  summary.addRow(['RUM Performance Comparison — Regression Summary']);
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
  notes.addRow(['Blue Triangle Portal — RUM Performance Comparison (Browser) Regression']);
  notes.addRow([`Profile / Site: ${DC} — ${SITE}`]);
  notes.addRow(['Includes write coverage for Create Custom Marker and Create Global Marker.']);
  notes.addRow(['Filter Save is not exercised. Metric/filter combos are sampled.']);
  notes.addRow([`Automation: ${AUTOMATION}`]);
  notes.addRow([
    'Auto bucket expectations: Last 6h→1min, Last 24h→5min, Last 7d→1hour, Last 30d→1day (Highcharts x deltas).',
  ]);
  notes.getRow(1).font = { bold: true };

  const outDir = path.join(__dirname, '..', 'docs');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'RUM_Performance_Comparison_Regression.xlsx');
  try {
    await workbook.xlsx.writeFile(outPath);
    console.log(`Wrote ${enriched.length} test cases → ${outPath}`);
  } catch (err) {
    const alt = path.join(outDir, 'RUM_Performance_Comparison_Regression_updated.xlsx');
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
