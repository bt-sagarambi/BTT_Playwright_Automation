/**
 * Generates docs/Competitive_Index_Table_Regression.xlsx
 * Sheets: Summary / Regression TCs / Notes
 *
 * Run: node scripts/generate-competitive-index-table-regression-excel.js
 */
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');

const SITE = 'GDC Test Site 2';
const DC = 'US';
const MODULE = 'Business Insights — Improve Traffic';
const AUTOMATION =
  'tests/regression_tests/US2/business-insights/improve-traffic/competitive-index-table/competitive.index.table.regression.spec.ts';
const EXECUTION_STATUS = process.env.CIT_EXECUTION_STATUS || 'Not Executed';
const EXECUTION_NOTE =
  process.env.CIT_EXECUTION_NOTE ||
  'Run npm run test:regression:us2:competitive-index-table and record live-data annotations from Allure.';

const cases = [
  {
    id: 'REG-CIT-001',
    submodule: 'Navigation',
    title: 'Page loads with Competitive Index title, Table breadcrumb and view=table',
    steps: [
      '1. Login to Blue Triangle portal',
      `2. Ensure site is "${SITE}" (${DC})`,
      '3. Open Menu > Business Insights > Improve Traffic > Competitive Index Table',
      '4. Observe document title, #page-title and URL',
    ].join('\n'),
    expected: [
      'Document title matches /Competitive Index/i',
      '#page-title matches Competitive Index / Table',
      'URL contains competitive-index/index and view=table',
    ].join('\n'),
  },
  {
    id: 'REG-CIT-002',
    submodule: 'Default Load',
    title: 'Default TABLE VIEW loads with performance index table settled',
    steps: ['1. Confirm TABLE VIEW active', '2. Wait for #performance_index_table data or empty'].join('\n'),
    expected: ['#table-tab active', 'Table visible with rows or controlled empty'].join('\n'),
  },
  {
    id: 'REG-CIT-003',
    submodule: 'Context',
    title: 'Portal site GDC Test Site 2; quick badges present',
    steps: ['1. Confirm portal site', '2. Capture Time Period / Industry / Statistical Method badges'].join('\n'),
    expected: ['Site is GDC Test Site 2', 'Representative badges non-empty'].join('\n'),
  },
  {
    id: 'REG-CIT-004',
    submodule: 'Selectors',
    title: 'Industry / Vertical / Site selectors visible',
    steps: ['1. Locate Select2 industry, vertical, company/site containers'].join('\n'),
    expected: ['All three selectors visible'].join('\n'),
  },
  {
    id: 'REG-CIT-005',
    submodule: 'Tabs',
    title: 'TABLE VIEW and TRENDS VIEW tabs switch active state',
    steps: ['1. Click TRENDS VIEW', '2. Click TABLE VIEW'].join('\n'),
    expected: ['Active tab class updates', 'Matching content surface'].join('\n'),
  },
  {
    id: 'REG-CIT-006',
    submodule: 'Tabs',
    title: 'Rapid TABLE ↔ TRENDS leaves TABLE VIEW healthy',
    steps: ['1. Rapid tab switches ending on TABLE VIEW'].join('\n'),
    expected: ['Table host remains healthy'].join('\n'),
  },
  {
    id: 'REG-CIT-007',
    submodule: 'Table',
    title: 'Identity columns and representative metrics present',
    steps: ['1. Review #performance_index_table headers'].join('\n'),
    expected: ['Company, Vertical present', 'Timing/CWV metric columns present'].join('\n'),
  },
  {
    id: 'REG-CIT-008',
    submodule: 'Table',
    title: 'Sampled rows show company/vertical content',
    steps: ['1. Inspect first data row text'].join('\n'),
    expected: ['Non-empty company-bearing row sample'].join('\n'),
  },
  {
    id: 'REG-CIT-009',
    submodule: 'Table',
    title: 'Sort representative columns when multiple rows exist',
    steps: ['1. Sort Company or metric column', '2. Observe first-row signature'].join('\n'),
    expected: ['Order change when multi-row or annotated'].join('\n'),
  },
  {
    id: 'REG-CIT-010',
    submodule: 'Table',
    title: 'Table search token / no-match / clear',
    steps: ['1. Search runtime company token', '2. No-match', '3. Clear'].join('\n'),
    expected: ['Search limits rows; clear restores'].join('\n'),
  },
  {
    id: 'REG-CIT-011',
    submodule: 'Table',
    title: 'Pager info soft-check',
    steps: ['1. Observe pager info when present'].join('\n'),
    expected: ['Pager text documented when present'].join('\n'),
  },
  {
    id: 'REG-CIT-012',
    submodule: 'Export',
    title: 'Export menu soft-check CSV/TSV/JSON',
    steps: ['1. Open Export menu'].join('\n'),
    expected: ['CSV/TSV/JSON presence soft-checked'].join('\n'),
  },
  {
    id: 'REG-CIT-013',
    submodule: 'Metrics',
    title: 'Select Metrics open/close without permanent shrink',
    steps: ['1. Open Select Metrics', '2. Close/Cancel'].join('\n'),
    expected: ['Picker opens/closes; table remains usable'].join('\n'),
  },
  {
    id: 'REG-CIT-014',
    submodule: 'Metrics',
    title: 'Restore Defaults control presence (no destructive click)',
    steps: ['1. Locate Restore Defaults'].join('\n'),
    expected: ['Presence documented; click avoided if mutates shared prefs'].join('\n'),
  },
  {
    id: 'REG-CIT-015',
    submodule: 'Comparison',
    title: 'Add Comparison soft open/close',
    steps: ['1. Open Add Comparison', '2. Dismiss without save'].join('\n'),
    expected: ['Chooser dismissed; no sticky pollution'].join('\n'),
  },
  {
    id: 'REG-CIT-016',
    submodule: 'Filters',
    title: 'Change Industry then restore',
    steps: ['1. Pick alternate Industry', '2. Observe table signature', '3. Restore original'].join('\n'),
    expected: ['Table responds or empty controlled; original Industry restored'].join('\n'),
  },
  {
    id: 'REG-CIT-017',
    submodule: 'Filters',
    title: 'Change Vertical then restore',
    steps: ['1. Pick alternate Vertical', '2. Restore original'].join('\n'),
    expected: ['Vertical change soft-verified; restored'].join('\n'),
  },
  {
    id: 'REG-CIT-018',
    submodule: 'Filters',
    title: 'Soft-select benchmark company/site when available',
    steps: ['1. Open company Select2', '2. Pick runtime option if list resolves'].join('\n'),
    expected: ['Selection soft-checked or annotated if empty'].join('\n'),
  },
  {
    id: 'REG-CIT-019',
    submodule: 'Filters drawer',
    title: 'Filters drawer labels; Cancel/close; no Save Filter',
    steps: ['1. Open Filters', '2. Note labels', '3. Close without save'].join('\n'),
    expected: ['Time Period / Industry / Statistical Method type labels present'].join('\n'),
  },
  {
    id: 'REG-CIT-020',
    submodule: 'Time Period',
    title: 'Apply ~7 days time period when available',
    steps: ['1. Apply Last 7 days (or live equivalent)', '2. Confirm table healthy'].join('\n'),
    expected: ['Table remains usable; applied or annotated'].join('\n'),
  },
  {
    id: 'REG-CIT-021',
    submodule: 'Time Period',
    title: 'Apply ~30 days time period when available',
    steps: ['1. Apply Last 30 days (or live equivalent)'].join('\n'),
    expected: ['Table remains usable; applied or annotated'].join('\n'),
  },
  {
    id: 'REG-CIT-022',
    submodule: 'Trends soft',
    title: 'TRENDS VIEW soft chrome/charts then restore TABLE',
    steps: ['1. Switch TRENDS', '2. Soft Clear Sites Toggles', '3. Restore TABLE'].join('\n'),
    expected: ['Trends chrome/charts soft-checked', 'TABLE VIEW restored'].join('\n'),
  },
  {
    id: 'REG-CIT-023',
    submodule: 'Charts',
    title: 'Highcharts soft presence table/trends',
    steps: ['1. Count Highcharts on TABLE and TRENDS'].join('\n'),
    expected: ['Presence documented; zero annotated'].join('\n'),
  },
  {
    id: 'REG-CIT-024',
    submodule: 'A11y',
    title: 'Info icons and focus sample on tabs/filters',
    steps: ['1. Count info icons', '2. Focus CI-tabs / Filters'].join('\n'),
    expected: ['Icons soft-checked', 'Non-focusable CI-tabs annotated'].join('\n'),
  },
  {
    id: 'REG-CIT-025',
    submodule: 'Combinations',
    title: 'Filters open/close + tab switches without overlay block',
    steps: ['1. Open/close Filters', '2. TRENDS then TABLE'].join('\n'),
    expected: ['No blocking overlay; table visible'].join('\n'),
  },
  {
    id: 'REG-CIT-026',
    submodule: 'Combinations',
    title: 'Sort + search + clear combination',
    steps: ['1. Sort', '2. Search token', '3. Clear'].join('\n'),
    expected: ['Table remains healthy'].join('\n'),
  },
  {
    id: 'REG-CIT-027',
    submodule: 'Recovery',
    title: 'Recover captured Industry/Vertical/TABLE VIEW; single table host',
    steps: ['1. Restore captured context', '2. Count #performance_index_table'].join('\n'),
    expected: ['view=table TABLE VIEW active', 'Exactly one table host'].join('\n'),
  },
  {
    id: 'REG-CIT-028',
    submodule: 'Stability',
    title: 'Page healthy after suite churn; annotate page errors',
    steps: ['1. Confirm TABLE healthy', '2. Review pageerror log'].join('\n'),
    expected: ['Table visible under view=table'].join('\n'),
  },
  {
    id: 'REG-CIT-029',
    submodule: 'Responsive',
    title: 'Narrow desktop keeps tabs and table reachable',
    steps: ['1. Set ~1100px width', '2. Check tabs/table'].join('\n'),
    expected: ['Tabs and table remain reachable'].join('\n'),
  },
  {
    id: 'REG-CIT-030',
    submodule: 'Scope',
    title: 'Suite remains on Competitive Index Table (view=table)',
    steps: ['1. Confirm TABLE VIEW and view=table URL'].join('\n'),
    expected: ['Not permanently parked on Trends-only landing'].join('\n'),
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
  summary.getColumn(2).width = 22;
  summary.addRow(['Competitive Index Table — Regression Summary']);
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
    { header: 'Test Case ID', key: 'testCaseId', width: 14 },
    { header: 'Type', key: 'type', width: 12 },
    { header: 'Module', key: 'module', width: 34 },
    { header: 'Submodule', key: 'submodule', width: 16 },
    { header: 'Title', key: 'title', width: 58 },
    { header: 'Steps', key: 'steps', width: 55 },
    { header: 'Expected Results', key: 'expected', width: 55 },
    { header: 'Status', key: 'status', width: 14 },
  ];
  styleHeader(sheet.getRow(1));
  for (const row of enriched) {
    const r = sheet.addRow(row);
    r.alignment = { vertical: 'top', wrapText: true };
  }

  const notes = workbook.addWorksheet('Notes');
  notes.getColumn(1).width = 110;
  notes.addRow(['Blue Triangle Portal — Competitive Index Table Regression Test Cases']);
  notes.addRow([`Profile / Site: ${DC} — ${SITE}`]);
  notes.addRow([
    'Type: Regression (read-only). Do NOT Save Filter, Create/Manage Groups permanently, Clear Cache, or leave Add Comparison sticky.',
  ]);
  notes.addRow(['Primary scope: view=table TABLE VIEW. Trends checks are soft + restore.']);
  notes.addRow(['Do not hard-code industry, vertical, company names, metric totals or time period strings.']);
  notes.addRow([`Automation: ${AUTOMATION}`]);
  notes.addRow(['npm: test:regression:us2:competitive-index-table']);
  notes.addRow([`Execution status: ${EXECUTION_STATUS}`]);
  notes.addRow([`Execution note: ${EXECUTION_NOTE}`]);
  notes.addRow([
    'Help PDF is high-level; live BI path + control IDs from probe are source of truth. Ambiguities: metric column set via Select Metrics; Highcharts optional on TABLE; company selector highlight vs filter behavior.',
  ]);
  notes.getRow(1).font = { bold: true };

  const outPath = path.join(__dirname, '..', 'docs', 'Competitive_Index_Table_Regression.xlsx');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  await workbook.xlsx.writeFile(outPath);
  console.log(`Wrote ${enriched.length} test cases → ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
