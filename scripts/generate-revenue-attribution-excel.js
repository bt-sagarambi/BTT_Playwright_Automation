/**
 * Generates docs/Revenue_Attribution_Regression.xlsx
 * Sheets: Summary / Regression TCs / Notes
 *
 * Run: node scripts/generate-revenue-attribution-excel.js
 */
const path = require('path');
const { writeRegressionManualWorkbook } = require('./lib/regressionManualExcel');

const SITE = 'GDC Test Site 2';
const DC = 'US';
const MODULE = 'Business Insights — Improve Conversion';
const AUTOMATION =
  'tests/regression_tests/US2/business-insights/improve-conversion/revenue-attribution/revenue.attribution.regression.spec.ts';
const EXECUTION_STATUS = process.env.RA_EXECUTION_STATUS || 'Not Executed';
const EXECUTION_NOTE =
  process.env.RA_EXECUTION_NOTE ||
  'Run npm run test:regression:us2:revenue-attribution and record live-data annotations from Allure.';

const cases = [
  { id: 'REG-RA-001', submodule: 'Navigation', title: 'Page loads via BI Improve Conversion with correct title/route', steps: 'Login; open Business Insights > Improve Conversion > Revenue Attribution.', expected: 'URL revenue-attribution; breadcrumb Revenue Attribution.' },
  { id: 'REG-RA-002', submodule: 'Context', title: 'GDC Test Site 2; core inventory settles', steps: 'Verify site and Section 1–3 shells settle.', expected: 'GDC selected; cards/graphs/tables soft ready.' },
  { id: 'REG-RA-003', submodule: 'Reports', title: 'Report list + week-range chrome soft', steps: 'Inspect #report-list and #report-time-period; sample options.', expected: 'Week of range soft; ≥1 existing report sample.' },
  { id: 'REG-RA-004', submodule: 'Reports', title: 'Soft switch existing report then restore', steps: 'Select alternate existing report; reopen home.', expected: 'Widgets settle; Revenue Attribution retained. No Save & Run.' },
  { id: 'REG-RA-005', submodule: 'Devices', title: 'Device visibility toggles soft + tablet caveat annotate', steps: 'Toggle All Devices/Desktop/iOS/Android (Mobile soft); restore.', expected: 'Grayed/primary reflow soft; All Devices ≠ Desktop+Mobile annotated.' },
  { id: 'REG-RA-006', submodule: 'Section 1', title: 'Summary cards Experience / Marketing / KPI labels soft', steps: 'Inspect card column labels.', expected: 'Performance/Stability/Traffic/AOV/Intent/KPI Change labels soft.' },
  { id: 'REG-RA-007', submodule: 'KPI', title: 'KPI Change hosts + bps / page-name PDF rule soft', steps: 'Inspect KPI hosts; note page-name exclusion rule.', expected: 'Sessions/AOV/Conversion/RPS soft; bps annotate; no Save & Run for page-name experiment.' },
  { id: 'REG-RA-008', submodule: 'Section 2', title: 'Platform graphs soft + hover/legend', steps: 'Assert platform graph hosts; soft hover/legend.', expected: 'rev-attr-values-bar-graph-* visible soft.' },
  { id: 'REG-RA-009', submodule: 'Section 3', title: 'Page table headers soft; no page-level scaling note', steps: 'Inspect page table headers.', expected: 'Page Name/Onload/Performance/Traffic soft or controlled empty.' },
  { id: 'REG-RA-010', submodule: 'Tabs', title: 'Desktop/iOS/Android(/Mobile) table-section tabs soft', steps: 'Switch tabs; restore start tab.', expected: 'Matching table/graph soft or empty.' },
  { id: 'REG-RA-011', submodule: 'Filters', title: 'Filters Cancel-only; Save & Run / Ad-Hoc presence', steps: 'Open Filters; My/Shared; Cancel. Do not Save & Run.', expected: 'Date of Performance Change soft; Save & Run visible but not clicked.' },
  { id: 'REG-RA-012', submodule: 'Comparison', title: 'Add Comparison open/cancel only', steps: 'Open Add Comparison; Escape/Cancel.', expected: 'No sticky comparison save.' },
  { id: 'REG-RA-013', submodule: 'Impact Rules', title: 'Revenue Impact rules chrome soft (no Submit)', steps: 'Open rules chrome; close.', expected: 'No permanent rule submit.' },
  { id: 'REG-RA-014', submodule: 'Export', title: 'Export menu soft open/close', steps: 'Open Export; observe CSV/TSV/JSON/Array soft; close.', expected: 'No hard file content assert.' },
  { id: 'REG-RA-015', submodule: 'Brand Dual', title: 'Brand Attribution dual then restore', steps: 'Open Brand Attribution; restore Revenue Attribution.', expected: 'Exact Revenue Attribution + GDC.' },
  { id: 'REG-RA-016', submodule: 'Calculator', title: 'Revenue Calculator soft round-trip restore', steps: 'Open Calculator; Back/restore Attribution.', expected: 'Revenue Attribution restored.' },
  { id: 'REG-RA-017', submodule: 'Sibling', title: 'Revenue Opportunity sibling soft restore', steps: 'Open RO; restore Attribution.', expected: 'Exact Revenue Attribution home.' },
  { id: 'REG-RA-018', submodule: 'A11y', title: 'Escape recovery; Report Manager; Help soft', steps: 'Open filters; Escape; soft Report Manager.', expected: 'Overlays close.' },
  { id: 'REG-RA-019', submodule: 'Responsive', title: '1100px viewport keeps title reachable', steps: 'Resize; scroll title.', expected: 'Title reachable.' },
  { id: 'REG-RA-020', submodule: 'Recovery', title: 'Reload soft recovery; still Revenue Attribution', steps: 'Reload; re-assert Attribution + GDC.', expected: 'Healthy suite home.' },
  { id: 'REG-RA-021', submodule: 'Negative', title: 'Not Brand / Calculator / RO / Monitoring as home', steps: 'Assert route and title.', expected: 'Revenue Attribution only.' },
  { id: 'REG-RA-022', submodule: 'Recovery', title: 'Restore initial context; suite home healthy', steps: 'restoreContext; clear searches; assert.', expected: 'Healthy Revenue Attribution on GDC.' },
];

async function main() {
  const { path: written, count } = await writeRegressionManualWorkbook({
    outPath: path.join(process.cwd(), 'docs', 'Revenue_Attribution_Regression.xlsx'),
    screenTitle: 'Revenue Attribution',
    site: SITE,
    dc: DC,
    module: MODULE,
    typeLabel: 'Regression (read-only)',
    helpLine:
      'SoT = The Revenue Attribution Page PDF (13p) + live probe. Suite home: Revenue Attribution. Soft dual: Brand Attribution / Calculator / Opportunity. Never Save & Run on shared accounts.',
    automation: AUTOMATION,
    executionStatus: EXECUTION_STATUS,
    executionNote: EXECUTION_NOTE,
    notes: [
      'Exact home: Business Insights / Improve Conversion / Revenue Attribution.',
      'Never accept Brand Attribution, Revenue Calculator, or Revenue Opportunity as suite home.',
      'No Save Filter / Clear Cache / Save & Run Report / permanent Ad-Hoc / Impact Rules submit.',
      'Prefer switching existing #report-list reports (first new run can take 5–20 min).',
      'Live devices include iOS/Android beyond PDF Desktop/Mobile/All Devices; tablet caveat still applies.',
      'Use stable hosts: #rev-attr-values-*, #rev-attr-values-bar-graph-*, #report-list, #report-time-period.',
      'npm run test:regression:us2:revenue-attribution',
    ],
    cases: cases.map((c) => ({ ...c, module: MODULE, type: 'Regression' })),
  });
  console.log('Wrote', written, 'cases=', count);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
