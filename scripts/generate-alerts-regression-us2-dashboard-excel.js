/**
 * Generates docs/Alerts_Regression_US2_Dashboard_Regression.xlsx
 * Sheets: Summary / Regression TCs / Notes
 *
 * Run: node scripts/generate-alerts-regression-us2-dashboard-excel.js
 */
const path = require('path');
const { writeRegressionManualWorkbook } = require('./lib/regressionManualExcel');

const SITE = 'GDC Test Site 2';
const DC = 'US';
const MODULE = 'Dashboards — Custom — Alerts Regression - US2';
const AUTOMATION =
  'tests/regression_tests/US2/dashboards/custom/alerts-regression-us2/alerts.regression.us2.dashboard.regression.spec.ts';
const EXECUTION_STATUS = process.env.AR_US2_EXECUTION_STATUS || 'Not Executed';
const EXECUTION_NOTE =
  process.env.AR_US2_EXECUTION_NOTE ||
  'Run npm run test:regression:us2:alerts-regression-us2 and record live-data annotations from Allure.';

const cases = [
  { id: 'REG-AR-US2-001', submodule: 'Navigation', title: 'Page loads via Dashboards with correct title/route', steps: 'Login; open Dashboards left menu.', expected: 'URL site/dashboard; title Dashboards.' },
  { id: 'REG-AR-US2-002', submodule: 'Identity', title: 'Exact Alerts Regression - US2 selected; core widgets', steps: 'Select Custom Alerts Regression - US2; assert DEO / Announcements / Active Alerts.', expected: 'Exact home; three widgets present.' },
  { id: 'REG-AR-US2-003', submodule: 'Context', title: 'GDC Test Site 2; lookback/auto-refresh captured', steps: 'Verify site + chrome labels.', expected: 'GDC selected; lookback non-empty.' },
  { id: 'REG-AR-US2-004', submodule: 'Chrome', title: 'Switcher, lookback, refresh, auto-refresh visible', steps: 'Inspect top chrome hosts.', expected: 'Controls attached/visible.' },
  { id: 'REG-AR-US2-005', submodule: 'Identity', title: 'Custom list includes home; siblings soft', steps: 'List Custom + Preconfigured options.', expected: 'Home under Custom; Synthetic Regression not accepted as home.' },
  { id: 'REG-AR-US2-006', submodule: 'Lookback', title: 'Time Lookback menu multi presets', steps: 'Open #time-lookback menu.', expected: '≥4 presets soft.' },
  { id: 'REG-AR-US2-007', submodule: 'Lookback', title: 'Soft apply 24h then 7d; restore', steps: 'Apply Last 24 hours; Last 7 days; restore capture.', expected: 'Widgets ready; home retained.' },
  { id: 'REG-AR-US2-008', submodule: 'Chrome', title: 'Dashboard Refresh without blank crash', steps: 'Click #refresh-dashboard.', expected: 'Core titles remain.' },
  { id: 'REG-AR-US2-009', submodule: 'Chrome', title: 'Auto Refresh menu Off + intervals', steps: 'Open Auto Refresh menu.', expected: 'Options listed soft.' },
  { id: 'REG-AR-US2-010', submodule: 'DEO', title: 'DEO Anomalies headers, counters, pager', steps: 'Inspect Severity/Status/Date Detected/Issue/Module; View All Issues; Critical/Significant.', expected: 'Headers present; counts not hard-coded; rows or empty annotate.' },
  { id: 'REG-AR-US2-011', submodule: 'DEO', title: 'DEO search type/clear; Export open/close', steps: 'Type Anomaly; clear. Open Export CSV/TSV/JSON/Array; close.', expected: 'Search cleared; no file assert.' },
  { id: 'REG-AR-US2-012', submodule: 'DEO', title: 'View All Issues soft drill restore', steps: 'Click View All Issues; restore Alerts Regression - US2 if navigated.', expected: 'Home restored; no sticky filter.' },
  { id: 'REG-AR-US2-013', submodule: 'Announcements', title: 'Blue Triangle Announcements feed soft', steps: 'Assert title; dated release-notes language soft.', expected: 'Feed present; bodies not hard-coded.' },
  { id: 'REG-AR-US2-014', submodule: 'Active Alerts', title: 'Active Alerts columns (live + PDF)', steps: 'Inspect Name/Type/Measured Level/thresholds/Eval Window/Alerting Since/Transaction/Page/Status.', expected: 'Columns match; empty valid per Clear rule.' },
  { id: 'REG-AR-US2-015', submodule: 'Graphs', title: 'No Highcharts required', steps: 'Count Highcharts hosts.', expected: 'Zero charts OK; tables still ready.' },
  { id: 'REG-AR-US2-016', submodule: 'Filters', title: 'Filters Cancel-only; My/Shared tabs', steps: 'Open Filters; My/Shared; Cancel. No Save Filter.', expected: 'Drawer closes; home retained.' },
  { id: 'REG-AR-US2-017', submodule: 'Chrome', title: 'Manager / + Widget cancel-only', steps: 'Open Manager and +Widget; Escape/Cancel.', expected: 'No sticky Save.' },
  { id: 'REG-AR-US2-018', submodule: 'Sibling', title: 'Soft Synthetic Regression - US2 then restore', steps: 'Switch SR-US2; restore home + GDC.', expected: 'Exact Alerts Regression - US2.' },
  { id: 'REG-AR-US2-019', submodule: 'Sibling', title: 'Soft Site Overview then restore', steps: 'Switch Site Overview; restore.', expected: 'Exact home restored.' },
  { id: 'REG-AR-US2-020', submodule: 'Sibling', title: 'Soft RUM Regression - US2 then restore', steps: 'Switch Custom RUM Regression - US2; restore.', expected: 'Exact Alerts Regression - US2 home.' },
  { id: 'REG-AR-US2-021', submodule: 'Lookback', title: 'Custom Date Selection open/cancel only', steps: 'Open Custom Date; cancel.', expected: 'No sticky custom range.' },
  { id: 'REG-AR-US2-022', submodule: 'Responsive', title: '1100px viewport keeps widgets reachable', steps: 'Resize; scroll DEO/Active Alerts.', expected: 'Lookback visible.' },
  { id: 'REG-AR-US2-023', submodule: 'Chrome', title: 'Last Updated + Carousel soft', steps: 'Inspect last-updated and Carousel.', expected: 'Soft presence; carousel not left cycling.' },
  { id: 'REG-AR-US2-024', submodule: 'Lookback', title: 'Prescribed 6h/24h/7d/30d + table signatures', steps: 'Apply each lookback; compare DEO pager / Date Detected / Alerting Since; restore. No graph hover.', expected: 'Each applied; table signatures differ or empty annotate.' },
  { id: 'REG-AR-US2-025', submodule: 'Chrome', title: 'Top chrome icons tooltips + round-trip', steps: 'Hover/click chrome icons; return dashboard.', expected: 'Tips/clicks soft; home retained.' },
  { id: 'REG-AR-US2-026', submodule: 'Recovery', title: 'Reload soft recovery to Alerts Regression - US2', steps: 'Reload; re-select home + GDC.', expected: 'Healthy suite home.' },
  { id: 'REG-AR-US2-027', submodule: 'Negative', title: 'Not SR-US2 / other Custom US2 / Preconfigured as home', steps: 'Assert switcher + route + body.', expected: 'Exact Alerts Regression - US2 only.' },
  { id: 'REG-AR-US2-028', submodule: 'Recovery', title: 'Restore initial context; suite home healthy', steps: 'restoreContext; clear DEO search; assert.', expected: 'Healthy Alerts Regression - US2 on GDC.' },
];

async function main() {
  const { path: written, count } = await writeRegressionManualWorkbook({
    outPath: path.join(process.cwd(), 'docs', 'Alerts_Regression_US2_Dashboard_Regression.xlsx'),
    screenTitle: 'Alerts Regression - US2 (Custom Dashboard)',
    site: SITE,
    dc: DC,
    module: MODULE,
    typeLabel: 'Regression (read-only)',
    helpLine:
      'SoT = live probe + Active Alerts / Announcements / DEO Anomalies PDFs. Custom optgroup; exact Alerts Regression - US2. No Save Filter / Archive-Dismiss / widget X.',
    automation: AUTOMATION,
    executionStatus: EXECUTION_STATUS,
    executionNote: EXECUTION_NOTE,
    notes: [
      'Exact home: Dashboards → Custom → Alerts Regression - US2 on site/dashboard.',
      'Never accept Synthetic Regression - US2, other Custom *-US2, or Preconfigured as suite home.',
      'No Save Filter / Clear Cache / Archive / Dismiss / widget Delete / alert clear.',
      'Prescribed lookbacks: Last 6 hours, Last 24 hours, Last 7 days, Last 30 days + table-signature differentiation (no Highcharts).',
      'Hosts: homepage-issue-tracker-*, activeAlertsTable_*, activeAlertsDiv_*, chartID_*, table-search.',
      'npm run test:regression:us2:alerts-regression-us2',
    ],
    cases: cases.map((c) => ({ ...c, module: MODULE, type: 'Regression' })),
  });
  console.log('Wrote', written, 'cases=', count);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
