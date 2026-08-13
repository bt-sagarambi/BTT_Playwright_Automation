/**
 * Generates docs/Revenue_Calculator_Regression.xlsx
 * Sheets: Summary / Regression TCs / Notes
 *
 * Run: node scripts/generate-revenue-calculator-excel.js
 */
const path = require('path');
const { writeRegressionManualWorkbook } = require('./lib/regressionManualExcel');

const SITE = 'GDC Test Site 2';
const DC = 'US';
const MODULE = 'Business Insights — Improve Conversion';
const AUTOMATION =
  'tests/regression_tests/US2/business-insights/improve-conversion/revenue-calculator/revenue.calculator.regression.spec.ts';
const EXECUTION_STATUS = process.env.RC_EXECUTION_STATUS || 'Not Executed';
const EXECUTION_NOTE =
  process.env.RC_EXECUTION_NOTE ||
  'Run npm run test:regression:us2:revenue-calculator and record live-data annotations from Allure.';

const cases = [
  { id: 'REG-RC-001', submodule: 'Navigation', title: 'Page loads via BI Improve Conversion with correct title/route', steps: 'Login; open Business Insights > Improve Conversion > Revenue Calculator.', expected: 'URL revenue-calculator + conversion-type=sales; breadcrumb Revenue Calculator.' },
  { id: 'REG-RC-002', submodule: 'Context', title: 'GDC Test Site 2; sales conversion-type; core inventory', steps: 'Verify site and core widgets settle.', expected: 'GDC selected; KPI/CRC/What-If/Over-time inventory soft ready.' },
  { id: 'REG-RC-003', submodule: 'Chrome', title: 'Badge strip soft (Time Period / Data Type / Browser / OS / Page Name)', steps: 'Inspect badge strip.', expected: 'Time Period non-empty; other badges soft when populated.' },
  { id: 'REG-RC-004', submodule: 'KPI', title: 'KPI strip labels + 1s/2s/3s What-If cards soft', steps: 'Inspect summary strip and speed cards.', expected: 'Sessions/Conversions/AOV/Conv/Bounce/Opportunity labels; 1–3s cards soft.' },
  { id: 'REG-RC-005', submodule: 'Pies', title: 'Toggle Pie Charts soft + restore', steps: 'Toggle pie row twice.', expected: 'Pie row responds; restored preference soft.' },
  { id: 'REG-RC-006', submodule: 'CRC', title: 'Conversion Rate Curve graph + legend soft', steps: 'Ensure graph mode; soft legend toggle.', expected: 'CRC host visible; legend series soft.' },
  { id: 'REG-RC-007', submodule: 'CRC', title: 'CRC graph ↔ table; headers soft', steps: 'Switch table then graph.', expected: 'Seconds/Sessions/Conversion Rate/Bounce headers soft when table.' },
  { id: 'REG-RC-008', submodule: 'What-If', title: 'What-If By X / To X graphs soft toggle', steps: 'Toggle WHAT IF WE SPED PAGE UP BY and WHAT IF PAGE SPEED WAS.', expected: 'By/To hosts soft; Revenue Opportunity legend soft.' },
  { id: 'REG-RC-009', submodule: 'Over Time', title: 'Conversion Rate / AOV Over Time shell + legend soft', steps: 'Inspect over-time graph.', expected: 'Host visible; legend soft toggle.' },
  { id: 'REG-RC-010', submodule: 'Over Time', title: 'Over-time graph ↔ table; headers soft', steps: 'Toggle table/graph.', expected: 'Date / Conversion Rate / AOV / Onload soft.' },
  { id: 'REG-RC-011', submodule: 'Filters', title: 'Filters drawer + My/Shared tabs soft', steps: 'Open Filters; tabs; Cancel. No Save Filter.', expected: 'Time Period/Timezone/Page Name soft; My/Shared clickable.' },
  { id: 'REG-RC-012', submodule: 'Filters', title: 'Filters Apply soft then restore home', steps: 'Apply when available; cancel.', expected: 'Sales Revenue Calculator retained.' },
  { id: 'REG-RC-013', submodule: 'Time Period', title: 'Soft apply 7d / 30d then restore', steps: 'Apply Last 7 days and 30 days soft; restore.', expected: 'Widgets settle; sales home retained.' },
  { id: 'REG-RC-014', submodule: 'Comparison', title: 'Add Comparison open/cancel only', steps: 'Open Add Comparison; Escape/Cancel.', expected: 'No sticky comparison save.' },
  { id: 'REG-RC-015', submodule: 'Calibration', title: 'Calibration open; Reset/Cancel only', steps: 'Open calibration; reset/cancel. Do not Save.', expected: 'No permanent calibration save.' },
  { id: 'REG-RC-016', submodule: 'Impact Rules', title: 'Revenue Impact rules chrome soft (no Submit)', steps: 'Open rules chrome; close.', expected: 'No Submit for Approval.' },
  { id: 'REG-RC-017', submodule: 'Attribution', title: 'Revenue Attribution soft round-trip', steps: 'Click Attribution; Back/restore Calculator.', expected: 'Sales Revenue Calculator restored.' },
  { id: 'REG-RC-018', submodule: 'Brand Dual', title: 'Brand Calculator dual then restore sales RC', steps: 'Open Brand Calculator; restore Revenue Calculator sales.', expected: 'conversion-type=sales + Revenue Calculator title.' },
  { id: 'REG-RC-019', submodule: 'Sibling', title: 'Revenue Opportunity sibling soft restore', steps: 'Open RO; restore RC.', expected: 'Exact Revenue Calculator home.' },
  { id: 'REG-RC-020', submodule: 'Export', title: 'Export menu soft open/close', steps: 'Open Export; observe CSV/TSV/JSON/Array soft; close.', expected: 'No hard file content assert.' },
  { id: 'REG-RC-021', submodule: 'A11y', title: 'Escape recovery; Help soft', steps: 'Open filters; Escape.', expected: 'Overlays close.' },
  { id: 'REG-RC-022', submodule: 'Responsive', title: '1100px viewport keeps widgets reachable', steps: 'Resize; scroll CRC.', expected: 'Title reachable.' },
  { id: 'REG-RC-023', submodule: 'Recovery', title: 'Reload soft recovery; still sales RC', steps: 'Reload; re-assert sales RC + GDC.', expected: 'Healthy suite home.' },
  { id: 'REG-RC-024', submodule: 'Negative', title: 'Not Brand / RO / Monitoring as home', steps: 'Assert route and title.', expected: 'sales Revenue Calculator only.' },
  { id: 'REG-RC-025', submodule: 'Recovery', title: 'Restore initial context; suite home healthy', steps: 'restoreContext; clear searches; assert.', expected: 'Healthy sales Revenue Calculator on GDC.' },
];

async function main() {
  const { path: written, count } = await writeRegressionManualWorkbook({
    outPath: path.join(process.cwd(), 'docs', 'Revenue_Calculator_Regression.xlsx'),
    screenTitle: 'Revenue Calculator',
    site: SITE,
    dc: DC,
    module: MODULE,
    typeLabel: 'Regression (read-only)',
    helpLine:
      'SoT = live probe + Brand Calculator Help mirror + Improve Conversion KPI docs. Suite home: Revenue Calculator (conversion-type=sales). Soft dual: Brand Calculator.',
    automation: AUTOMATION,
    executionStatus: EXECUTION_STATUS,
    executionNote: EXECUTION_NOTE,
    notes: [
      'Exact home: Business Insights / Improve Conversion / Revenue Calculator + conversion-type=sales.',
      'Never accept Brand Calculator, Revenue Opportunity, or Monitoring RUM as suite home.',
      'No Save Filter / Clear Cache / Save Calibration / Submit Impact Rules.',
      'Page Name (e.g. PDP) and KPI totals are live-data — never hard-code.',
      'Use stable hosts: #conversion-rate-curve-graph, #revenue-calculator-sped-up-by|to, #conversion-rate-over-time-graph.',
      'npm run test:regression:us2:revenue-calculator',
    ],
    cases: cases.map((c) => ({ ...c, module: MODULE, type: 'Regression' })),
  });
  console.log('Wrote', written, 'cases=', count);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
