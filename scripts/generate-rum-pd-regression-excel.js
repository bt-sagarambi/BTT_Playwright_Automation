/**
 * Generates docs/RUM_Performance_Details_Regression.xlsx
 * Same format as BTT_Smoke_Manual_Test_Cases.xlsx:
 *   Test Case ID | Type | Module | Submodule | Title | Steps | Expected Results | Status
 *
 * Run: node scripts/generate-rum-pd-regression-excel.js
 */
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');

const SITE = 'GDC Test Site 2';
const DC = 'US';
const MODULE = 'Real User Monitoring (RUM)';
const CONFLUENCE =
  'https://bluetriangletech.atlassian.net/wiki/spaces/HCT/pages/3186720883/RUM+Performance+Detail+Page';
const AUTOMATION =
  'tests/regression_tests/US2/rum.performance-detail.browser.regression.spec.ts';

/**
 * Manual regression cases aligned 1:1 with REG-RUM-PD automation.
 * Read-only: do not Save Filter, Create Alert/Report, or Create Custom Marker.
 */
const cases = [
  {
    id: 'REG-RUM-PD-001',
    submodule: 'Navigation',
    title: 'Page loads via menu/route with correct title',
    steps: [
      '1. Login to Blue Triangle portal (if not already logged in)',
      `2. Ensure site dropdown is set to "${SITE}" (${DC} instance)`,
      '3. Open left navigation: Monitoring > Real User Browser > Performance Detail',
      '4. Wait for the page to finish loading',
      '5. Observe page title/breadcrumb and browser URL',
    ].join('\n'),
    expected: [
      'Page title/breadcrumb includes "Performance Detail"',
      'Breadcrumb path includes Monitoring / Real User Browser / Performance Detail',
      'URL contains real-user-monitoring/performance-detail',
      'User remains authenticated (not redirected to login)',
    ].join('\n'),
  },
  {
    id: 'REG-RUM-PD-002',
    submodule: 'Default Load',
    title: 'Default session context renders charts and session sections',
    steps: [
      '1. Open RUM Performance Detail for GDC Test Site 2',
      '2. Wait for charts and sections to finish rendering',
      '3. Locate Page Views and All Page Views For Selected Session sections',
      '4. Confirm Highcharts containers are present with data',
    ].join('\n'),
    expected: [
      '"All Page Views For Selected Session" section is visible',
      'Page Views section/chart is visible',
      'Multiple chart containers render (more than 3)',
      'Charts show data (not an empty/error-only shell)',
    ].join('\n'),
  },
  {
    id: 'REG-RUM-PD-003',
    submodule: 'Choose Metrics',
    title: 'Choose Metrics control opens and lists options',
    steps: [
      '1. On Performance Detail, locate Choose Metrics / Configure Metrics control',
      '2. Open Choose Metrics',
      '3. Review the list of selectable metric options',
      '4. Close the panel without saving account-level settings (Cancel/Escape/Close is fine)',
    ].join('\n'),
    expected: [
      'Choose Metrics panel/modal opens',
      'One or more selectable metric options are listed',
      'Panel can be dismissed without write/save of portal settings',
    ].join('\n'),
  },
  {
    id: 'REG-RUM-PD-004',
    submodule: 'Choose Metrics',
    title: 'Choose Metrics combination refreshes metric cards',
    steps: [
      '1. Open Choose Metrics',
      '2. Toggle a sample metric combination (e.g. INP / Largest Contentful Paint / Onload / Page Views)',
      '3. Apply or close so the page refreshes metric cards',
      '4. Observe metric cards and charts',
    ].join('\n'),
    expected: [
      'Metric cards related to selected metrics (e.g. INP, Page Views) remain/are visible',
      'Charts refresh and still show data',
      'No write actions (no Save Filter / Create Report)',
    ].join('\n'),
  },
  {
    id: 'REG-RUM-PD-005',
    submodule: 'Page Timings',
    title: 'Page Timings Over Time has data and graph/table toggle works',
    steps: [
      '1. Scroll to Page Timings Over Time',
      '2. Confirm graph view shows timing trend data',
      '3. Click table toggle for Page Timings',
      '4. Click graph toggle to return to chart view',
    ].join('\n'),
    expected: [
      'Page Timings Over Time section is visible',
      'Table view displays tabular timing data',
      'Graph view restores successfully',
      'Chart/table content remains populated',
    ].join('\n'),
  },
  {
    id: 'REG-RUM-PD-006',
    submodule: 'Page Timings',
    title: 'Page Timings hamburger/context menu is available',
    steps: [
      '1. Locate Page Timings Over Time chart',
      '2. Click the chart hamburger / context menu control',
      '3. Observe menu chrome (export/print options if shown)',
      '4. Press Escape to dismiss',
    ].join('\n'),
    expected: [
      'Context/hamburger control is present near Page Timings',
      'Menu chrome appears or control is interactable',
      'Page remains stable after dismissing the menu',
    ].join('\n'),
  },
  {
    id: 'REG-RUM-PD-007',
    submodule: 'Page Views',
    title: 'Page Views metric filter combinations refresh chart',
    steps: [
      '1. Locate Page Views scatter plot metric dropdown',
      '2. Select Onload and wait for refresh',
      '3. Select Largest Contentful Paint and wait for refresh',
      '4. Select INP and wait for refresh',
    ].join('\n'),
    expected: [
      'Each metric selection refreshes the Page Views chart',
      'Chart remains populated after each change',
      'No error page / blank chart shell',
    ].join('\n'),
  },
  {
    id: 'REG-RUM-PD-008',
    submodule: 'Page Views',
    title: 'Page Views detail mode combinations',
    steps: [
      '1. Locate Page Views detail mode control',
      '2. Select "Object Level Detail Only"',
      '3. Wait for chart refresh',
      '4. Select "Page and Object Level Detail"',
      '5. Wait for chart refresh',
    ].join('\n'),
    expected: [
      'Object Level Detail Only mode applies and chart refreshes',
      'Page and Object Level Detail mode applies and chart refreshes',
      'Scatter plot remains visible with data',
    ].join('\n'),
  },
  {
    id: 'REG-RUM-PD-009',
    submodule: 'Page Views',
    title: 'Page Views graph/table toggle',
    steps: [
      '1. Locate Page Views graph/table toggle controls',
      '2. Switch to table view',
      '3. Switch back to graph view',
      '4. If dedicated toggles are unavailable, confirm Page Views section + charts still load',
    ].join('\n'),
    expected: [
      'Table and graph views toggle successfully when controls exist',
      'OR Page Views section remains visible with chart data (fallback)',
      'Page stays healthy with no login redirect',
    ].join('\n'),
  },
  {
    id: 'REG-RUM-PD-010',
    submodule: 'Session Details',
    title: 'All Page Views For Selected Session metric combinations',
    steps: [
      '1. Locate All Page Views For Selected Session',
      '2. Change session metric to Onload',
      '3. Change to First Contentful Paint',
      '4. Change to Largest Contentful Paint',
    ].join('\n'),
    expected: [
      'All Page Views For Selected Session section is visible',
      'Each metric change refreshes dependent chart(s)',
      'Charts continue to show data',
    ].join('\n'),
  },
  {
    id: 'REG-RUM-PD-011',
    submodule: 'Session Details',
    title: 'Session section graph/table toggle',
    steps: [
      '1. In All Page Views For Selected Session, switch to table view',
      '2. Confirm table/container is visible',
      '3. Switch back to graph view',
    ].join('\n'),
    expected: [
      'Session table view displays when toggled',
      'Graph view restores successfully',
      'OR session section remains visible with chart data if toggles differ by build',
    ].join('\n'),
  },
  {
    id: 'REG-RUM-PD-012',
    submodule: 'Session Details',
    title: 'Page Views + Session filter dependency combination',
    steps: [
      '1. Set Page Views metric to Onload',
      '2. Set detail mode to Page and Object Level Detail',
      '3. Set session metric to Onload',
      '4. Observe dependent session/measurement panels',
    ].join('\n'),
    expected: [
      'Page Views and session controls remain in sync',
      'All Page Views For Selected Session remains visible',
      'Dependent sections refresh without error',
    ].join('\n'),
  },
  {
    id: 'REG-RUM-PD-013',
    submodule: 'Page Views',
    title: 'Click Page Views point refreshes session + measurement details',
    steps: [
      '1. Ensure Page Views scatter has plot points',
      '2. Click the first available Page Views point',
      '3. Observe All Page Views For Selected Session and measurement/breakdown areas',
    ].join('\n'),
    expected: [
      'Session-dependent sections refresh for the selected point',
      'Charts remain populated',
      'Performance Measurement Details / Performance Breakdown may appear depending on point data',
    ].join('\n'),
  },
  {
    id: 'REG-RUM-PD-014',
    submodule: 'Page Views',
    title: 'Additional Page Views point combinations refresh dependent panels',
    steps: [
      '1. Click a second Page Views scatter point',
      '2. Confirm All Page Views For Selected Session updates',
      '3. Click a third point (or re-click first if fewer points exist)',
    ].join('\n'),
    expected: [
      'Dependent session panel remains visible after each click',
      'Charts continue to show data',
      'No page crash / blank content',
    ].join('\n'),
  },
  {
    id: 'REG-RUM-PD-015',
    submodule: 'Domain / Object Detail',
    title: 'Triangle/detail selection reveals Domain/Object sections when available',
    steps: [
      '1. Set Page Views to Page and Object Level Detail',
      '2. Click a Page Views point that has object-level detail (triangle when available)',
      '3. Look for Domain Level Activity / Object Level Detail / Object Activity By Domain',
    ].join('\n'),
    expected: [
      'At least one Domain/Object detail section or container appears when data supports it',
      'Object Level Detail table and/or Object Activity graph may be present',
      'Absence of triangles on some datasets is acceptable if object containers still appear',
    ].join('\n'),
  },
  {
    id: 'REG-RUM-PD-016',
    submodule: 'Domain / Object Detail',
    title: 'Domain/Object graph and table toggles',
    steps: [
      '1. If Domain/Object graph-table toggles are visible after detail selection, switch to table',
      '2. Switch back to graph',
      '3. If toggles are not visible for current selection, note and continue',
    ].join('\n'),
    expected: [
      'When toggles are visible, table and graph views switch successfully',
      'When toggles are not visible, case is noted as N/A for current selection (not a hard fail for missing data)',
    ].join('\n'),
  },
  {
    id: 'REG-RUM-PD-017',
    submodule: 'Global Markers',
    title: 'Toggle Global Markers option combinations',
    steps: [
      '1. Open Toggle Global Markers menu',
      '2. Select Hide All Markers (if available)',
      '3. Select Show All Markers (if available)',
      '4. Toggle Custom/Global Markers option if listed',
      '5. Do NOT create a custom marker',
    ].join('\n'),
    expected: [
      'Global Markers menu opens and options are selectable',
      'Charts remain healthy after marker visibility changes',
      'No Create Custom Marker / write action is performed',
    ].join('\n'),
  },
  {
    id: 'REG-RUM-PD-018',
    submodule: 'Filters',
    title: 'Right-nav Filters: visitor type combination refreshes charts',
    steps: [
      '1. Click the Filters icon (upper right)',
      '2. Set Visitor Type to New Visitors and Apply Filters',
      '3. Observe charts refresh',
      '4. Set Visitor Type to Returning Visitors and Apply Filters',
      '5. Do NOT Save Filter',
    ].join('\n'),
    expected: [
      'Filters drawer opens with Apply Filters available',
      'Charts refresh for each visitor-type combination',
      'No Save Filter / persistent filter write is performed',
    ].join('\n'),
  },
  {
    id: 'REG-RUM-PD-019',
    submodule: 'Filters',
    title: 'Right-nav Filters: data origin + page group sample',
    steps: [
      '1. Open Filters drawer',
      '2. Set Data Originated From to RUM Browser (sample)',
      '3. Optionally sample a Page Group if available',
      '4. Click Apply Filters',
      '5. Do NOT Save Filter',
    ].join('\n'),
    expected: [
      'Filter sample applies without error',
      'Charts refresh or page remains healthy',
      'Page title remains visible; no login redirect',
    ].join('\n'),
  },
  {
    id: 'REG-RUM-PD-020',
    submodule: 'Charts',
    title: 'Legend check/uncheck refreshes series visibility',
    steps: [
      '1. Locate a Highcharts legend on Performance Detail',
      '2. Click the first legend item to hide/show the series',
      '3. Click the same legend item again to restore',
    ].join('\n'),
    expected: [
      'Legend items are present',
      'Series visibility toggles on legend click',
      'Charts remain populated after restore',
    ].join('\n'),
  },
  {
    id: 'REG-RUM-PD-021',
    submodule: 'Charts',
    title: 'Graph tooltip shows information on hover',
    steps: [
      '1. Hover a series point on Page Timings or another chart',
      '2. Observe Highcharts tooltip content',
    ].join('\n'),
    expected: [
      'Tooltip appears with metric/time information',
      'OR charts remain healthy if tooltip is intermittent for the dataset',
    ].join('\n'),
  },
  {
    id: 'REG-RUM-PD-022',
    submodule: 'UI',
    title: 'Metric mini-graphs remain interactive',
    steps: [
      '1. Locate metric mini-graphs (e.g. Onload, Page Views / volume, Largest Contentful Paint)',
      '2. Scroll each into view and confirm visibility',
    ].join('\n'),
    expected: [
      'Available metric mini-graphs are visible',
      'Main chart area still has data',
    ].join('\n'),
  },
  {
    id: 'REG-RUM-PD-023',
    submodule: 'UI',
    title: 'Page title breadcrumb remains Monitoring / Real User Browser',
    steps: [
      '1. After prior interactions, check #page-title / breadcrumb',
      '2. Confirm path still identifies Performance Detail under Real User Browser',
    ].join('\n'),
    expected: [
      'Title matches Monitoring / Real User Browser / Performance Detail',
      'Breadcrumb did not navigate away unexpectedly',
    ].join('\n'),
  },
  {
    id: 'REG-RUM-PD-024',
    submodule: 'Filters (Confluence)',
    title: 'View Filters / Hide Filters toggles inline filter banner',
    steps: [
      '1. At top left of Performance Detail, locate View Filters button (#performance-view-filter)',
      '2. Click View Filters',
      '3. Observe inline applied-filter banner',
      '4. Click Hide Filters',
      '5. Confirm banner is hidden again',
    ].join('\n'),
    expected: [
      'Button label changes from View Filters to Hide Filters when banner is shown',
      'Inline filter banner (#toggle-filter-section) becomes visible',
      'Banner hides again and button returns to View Filters',
      'Per Confluence: filters can be viewed without opening the right-nav Filters menu',
    ].join('\n'),
  },
  {
    id: 'REG-RUM-PD-025',
    submodule: 'Performance Details (Confluence)',
    title: 'Metric card click (default Onload → another metric)',
    steps: [
      '1. Note default metric card selection (Page Onload)',
      '2. Click Page Onload / Onload metric card',
      '3. Click another metric card (Largest Contentful Paint / INP / First Byte / Page Views)',
      '4. Observe Performance Details by Page / related charts if populated',
    ].join('\n'),
    expected: [
      'Metric card click is accepted and charts refresh',
      'Per Confluence: selected metric card drives the horizontal axis of Performance Details by Page when that chart is populated',
      'Charts remain healthy',
    ].join('\n'),
  },
  {
    id: 'REG-RUM-PD-026',
    submodule: 'Performance Details (Confluence)',
    title: '2+ Page Names populates Performance Details by Page',
    steps: [
      '1. Open right-nav Filters',
      '2. In Page Name multi-select, choose at least two page names (e.g. Homepage and PDP on GDC Test Site 2)',
      '3. Click Apply Filters (do NOT Save Filter)',
      '4. Wait for Performance Details by Page bar chart to populate',
      'Note: Max 50 page names; Select All only if site has ≤50 pages',
    ].join('\n'),
    expected: [
      'Per Confluence: Performance Details by Page populates only when 2+ Page Names are selected',
      'Bar chart becomes visible under Performance Detail metrics',
      'Charts refresh with comparison data for selected pages',
      'No Save Filter write is performed',
    ].join('\n'),
  },
  {
    id: 'REG-RUM-PD-027',
    submodule: 'Page Views (Confluence)',
    title: 'Page Views circles/triangles marker semantics',
    steps: [
      '1. Inspect Page Views scatter plot markers',
      '2. Identify circle vs triangle plot points when present',
    ].join('\n'),
    expected: [
      'Scatter points are present (circles and/or triangles)',
      'Per Confluence: triangles = page views with object-level detail; circles = without object-level detail',
      'Marker mix depends on live session data',
    ].join('\n'),
  },
  {
    id: 'REG-RUM-PD-028',
    submodule: 'Page Views (Confluence)',
    title: 'Point click opens Performance Breakdown / session details',
    steps: [
      '1. Click a Page Views scatter point',
      '2. Observe All Page Views For Selected Session',
      '3. Look for Performance Breakdown waterfall and/or Performance Measurement Details',
    ].join('\n'),
    expected: [
      'All Page Views / session details update for the selected point',
      'Per Confluence: click reveals Performance Breakdown, All Page Views, and Performance Measurement Details when data supports it',
      'Waterfall/measurement UI or containers appear',
    ].join('\n'),
  },
  {
    id: 'REG-RUM-PD-029',
    submodule: 'Page Timings (Confluence)',
    title: 'Page Timings remains linked after Performance Details interaction',
    steps: [
      '1. After Performance Details / Page Views interactions, locate Page Timings Over Time',
      '2. Toggle table then graph',
      '3. Optionally hover a trend point for tooltip metrics',
    ].join('\n'),
    expected: [
      'Page Timings Over Time remains visible and linked on the page',
      'Graph/table toggle still works',
      'Chart data remains available',
      'Per Confluence: Page Timings sits beneath Performance Details and stays interactive',
    ].join('\n'),
  },
  {
    id: 'REG-RUM-PD-030',
    submodule: 'Default Load (Confluence)',
    title: 'Aggregate default still valid when filters cleared path',
    steps: [
      '1. Re-open Performance Detail via navigation (fresh default path)',
      '2. Do not select Page Names in filters (aggregate default)',
      '3. Confirm default session context and title',
    ].join('\n'),
    expected: [
      'Per Confluence: default view is aggregate data for all pages when no page names are selected',
      'Default session context (charts + All Page Views For Selected Session) renders',
      'Page title includes Performance Detail',
    ].join('\n'),
  },
  {
    id: 'REG-RUM-PD-031',
    submodule: 'Filters',
    title: 'Bucket Size filter sample refreshes Page Timings window',
    steps: [
      '1. Open right-nav Filters',
      '2. Change Bucket Size (e.g. Hour, then Day/Minute)',
      '3. Apply Filters (do not Save)',
    ].join('\n'),
    expected: [
      'Page Timings / charts refresh for sampled bucket sizes',
      'Page remains healthy if a bucket option is unavailable for the site',
    ].join('\n'),
  },
  {
    id: 'REG-RUM-PD-032',
    submodule: 'Top Navigation',
    title: 'Top-nav right controls expose Filters/Help tooltips',
    steps: [
      '1. Hover Filters and Help Center in the top-right chrome',
      '2. Confirm tooltips',
    ].join('\n'),
    expected: ['Right-nav tooltips are present', 'Filters control remains available'].join('\n'),
  },
  {
    id: 'REG-RUM-PD-033',
    submodule: 'Performance',
    title: 'Page load performance: title + charts within SLA',
    steps: [
      '1. Navigate to Performance Detail',
      '2. Measure time until title and charts are ready',
    ].join('\n'),
    expected: ['Page becomes ready with charts within 120 seconds'].join('\n'),
  },
  {
    id: 'REG-RUM-PD-034',
    submodule: 'Page Views',
    title: 'Performance Measurement Details / waterfall after point click',
    steps: [
      '1. Click a Page Views scatter point',
      '2. Look for Performance Measurement Details / Breakdown / Object Level Detail',
    ].join('\n'),
    expected: [
      'Measurement/breakdown UI or object-level containers appear for the selection',
      'Charts remain populated',
    ].join('\n'),
  },
  {
    id: 'REG-RUM-PD-035',
    submodule: 'UI',
    title: 'Information icon tooltips sample when present',
    steps: ['1. Locate info icons on the page', '2. Hover a sample of icons'].join('\n'),
    expected: [
      'Info icons are hoverable when present',
      'Absence of icons on a given view is noted; page title remains visible',
    ].join('\n'),
  },
  {
    id: 'REG-RUM-PD-036',
    submodule: 'Performance Details (Confluence)',
    title: 'Performance Details by Page bar click links Page Timings when available',
    steps: [
      '1. Select 2+ Page Names and Apply',
      '2. Click a bar in Performance Details by Page',
      '3. Confirm Page Timings Over Time remains linked/visible',
    ].join('\n'),
    expected: [
      'Page Timings Over Time remains visible after bar interaction',
      'Charts refresh; missing bars for sparse data are noted',
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
    title: `${c.id} — ${c.title}`,
    steps: c.steps,
    expected: c.expected,
    status: 'Not Executed',
  }));

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'BTT Playwright Automation';
  workbook.created = new Date();

  // --- Summary ---
  const summary = workbook.addWorksheet('Summary', {
    views: [{ state: 'frozen', ySplit: 3 }],
  });
  summary.getColumn(1).width = 36;
  summary.getColumn(2).width = 32;
  summary.getColumn(3).width = 12;
  summary.getColumn(4).width = 70;

  summary.mergeCells(1, 1, 1, 4);
  summary.getCell(1, 1).value =
    `Profile: ${DC} / ${SITE} | Type: Regression (read-only) | Total TCs: ${enriched.length} | RUM Performance Detail`;
  summary.getCell(1, 1).font = { bold: true, size: 12 };

  summary.mergeCells(2, 1, 2, 4);
  summary.getCell(2, 1).value = `Confluence: ${CONFLUENCE}`;
  summary.getCell(2, 1).font = { size: 10, color: { argb: 'FF666666' } };

  summary.getRow(3).values = [undefined, 'Module', 'Submodule', 'TC Count', 'Test Case IDs'];
  styleHeader(summary.getRow(3));

  let rIdx = 4;
  const sectionMod = summary.getRow(rIdx++);
  sectionMod.values = [undefined, 'Module totals', '', '', ''];
  sectionMod.font = { bold: true };
  sectionMod.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD6E3F0' },
  };

  const byModule = new Map();
  for (const row of enriched) {
    if (!byModule.has(row.module)) byModule.set(row.module, []);
    byModule.get(row.module).push(row);
  }
  for (const [module, rows] of [...byModule.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const row = summary.getRow(rIdx++);
    row.values = [
      undefined,
      module,
      '(all)',
      rows.length,
      rows.map((r) => r.testCaseId).join(', '),
    ];
    row.alignment = { vertical: 'top', wrapText: true };
  }

  const totalRow = summary.getRow(rIdx++);
  totalRow.values = [
    undefined,
    'TOTAL',
    '',
    enriched.length,
    `${enriched[0].testCaseId} .. ${enriched[enriched.length - 1].testCaseId}`,
  ];
  totalRow.font = { bold: true };
  totalRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFF2CC' },
  };

  rIdx++;
  const sectionSub = summary.getRow(rIdx++);
  sectionSub.values = [undefined, 'Breakdown by Module + Submodule', '', '', ''];
  sectionSub.font = { bold: true };
  sectionSub.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD6E3F0' },
  };

  const byModuleSub = new Map();
  for (const row of enriched) {
    const k = `${row.module}||${row.submodule}`;
    if (!byModuleSub.has(k)) byModuleSub.set(k, []);
    byModuleSub.get(k).push(row);
  }
  const subRows = [...byModuleSub.entries()]
    .map(([k, rows]) => {
      const [module, submodule] = k.split('||');
      return {
        module,
        submodule,
        count: rows.length,
        ids: rows.map((r) => r.testCaseId).join(', '),
      };
    })
    .sort(
      (a, b) =>
        a.module.localeCompare(b.module) ||
        b.count - a.count ||
        a.submodule.localeCompare(b.submodule)
    );

  for (const { module, submodule, count, ids } of subRows) {
    const row = summary.getRow(rIdx++);
    row.values = [undefined, module, submodule, count, ids];
    row.alignment = { vertical: 'top', wrapText: true };
  }

  // --- Regression TCs ---
  const sheet = workbook.addWorksheet('Regression TCs', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  sheet.columns = [
    { header: 'Test Case ID', key: 'testCaseId', width: 16 },
    { header: 'Type', key: 'type', width: 12 },
    { header: 'Module', key: 'module', width: 32 },
    { header: 'Submodule', key: 'submodule', width: 28 },
    { header: 'Title', key: 'title', width: 62 },
    { header: 'Steps', key: 'steps', width: 68 },
    { header: 'Expected Results', key: 'expected', width: 68 },
    { header: 'Status', key: 'status', width: 14 },
  ];

  styleHeader(sheet.getRow(1));
  sheet.getRow(1).height = 22;

  for (const row of enriched) {
    const r = sheet.addRow({
      testCaseId: row.testCaseId,
      type: row.type,
      module: row.module,
      submodule: row.submodule,
      title: row.title,
      steps: row.steps,
      expected: row.expected,
      status: row.status,
    });
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

  // --- Notes ---
  const notes = workbook.addWorksheet('Notes');
  notes.getColumn(1).width = 110;
  notes.addRow(['Blue Triangle Portal — RUM Performance Detail (Browser) Regression Test Cases']);
  notes.addRow([`Profile / Site: ${DC} — ${SITE}`]);
  notes.addRow(['Type: Regression (read-only). Do NOT write to any account, site, or page.']);
  notes.addRow([
    'Columns: Test Case ID | Type | Module | Submodule | Title | Steps | Expected Results | Status',
  ]);
  notes.addRow(['See Summary tab for TC counts by Module and Submodule.']);
  notes.addRow([
    'Excluded writes: Save Filter, Create Alert/Report, Create Custom Marker, Edit Profile, settings saves.',
  ]);
  notes.addRow([`Total cases: ${enriched.length} (${enriched[0].testCaseId}..${enriched[enriched.length - 1].testCaseId})`]);
  notes.addRow([`Confluence reference: ${CONFLUENCE}`]);
  notes.addRow([`Automation mapping: ${AUTOMATION}`]);
  notes.addRow([
    'Assumptions: metric/filter combos are sampled (not exhaustive); circle/triangle mix depends on live session data.',
  ]);
  notes.getRow(1).font = { bold: true };

  const outDir = path.join(__dirname, '..', 'docs');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'RUM_Performance_Details_Regression.xlsx');
  await workbook.xlsx.writeFile(outPath);
  console.log(`Wrote ${enriched.length} test cases → ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
