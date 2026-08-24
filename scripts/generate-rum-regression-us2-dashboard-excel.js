/**
 * Generates docs/RUM_Regression_US2_Dashboard_Regression.xlsx
 * Sheets: Summary / Regression TCs / Notes
 *
 * Run: node scripts/generate-rum-regression-us2-dashboard-excel.js
 */
const path = require('path');
const { writeRegressionManualWorkbook } = require('./lib/regressionManualExcel');

const SITE = 'GDC Test Site 2';
const DC = 'US';
const MODULE = 'Dashboards — Custom — RUM Regression - US2';
const AUTOMATION =
  'tests/regression_tests/US2/dashboards/custom/rum-regression-us2/rum.regression.us2.dashboard.regression.spec.ts';
const EXECUTION_STATUS = process.env.RR_US2_EXECUTION_STATUS || 'Not Executed';
const EXECUTION_NOTE =
  process.env.RR_US2_EXECUTION_NOTE ||
  'Run npm run test:regression:us2:rum-regression-us2 and record live-data annotations from Allure.';

const cases = [
  { id: 'REG-RR-US2-001', submodule: 'Navigation', title: 'Page loads via Dashboards with correct title/route', steps: 'Login; open Dashboards left menu.', expected: 'URL site/dashboard; title Dashboards.' },
  { id: 'REG-RR-US2-002', submodule: 'Identity', title: 'Exact RUM Regression - US2 selected; core widgets', steps: 'Select Custom RUM Regression - US2; assert Performance/Native/Comparison/Bounce.', expected: 'Exact home; core widgets present.' },
  { id: 'REG-RR-US2-003', submodule: 'Context', title: 'GDC Test Site 2; lookback/auto-refresh captured', steps: 'Verify site + chrome labels.', expected: 'GDC selected; lookback non-empty.' },
  { id: 'REG-RR-US2-004', submodule: 'Chrome', title: 'Switcher, lookback, refresh, auto-refresh visible', steps: 'Inspect top chrome hosts.', expected: 'Controls attached/visible.' },
  { id: 'REG-RR-US2-005', submodule: 'Identity', title: 'Custom list includes home; siblings soft', steps: 'List Custom + Preconfigured options.', expected: 'Home under Custom; RUM Performance Detail not home.' },
  { id: 'REG-RR-US2-006', submodule: 'Lookback', title: 'Time Lookback menu multi presets', steps: 'Open #time-lookback menu.', expected: '≥4 presets soft.' },
  { id: 'REG-RR-US2-007', submodule: 'Lookback', title: 'Soft apply 24h then 7d; restore', steps: 'Apply Last 24 hours; Last 7 days; restore capture.', expected: 'Widgets ready; home retained.' },
  { id: 'REG-RR-US2-008', submodule: 'Chrome', title: 'Dashboard Refresh without blank crash', steps: 'Click #refresh-dashboard.', expected: 'Core titles remain.' },
  { id: 'REG-RR-US2-009', submodule: 'Chrome', title: 'Auto Refresh menu Off + intervals', steps: 'Open Auto Refresh menu.', expected: 'Options listed soft.' },
  { id: 'REG-RR-US2-010', submodule: 'Performance', title: 'RUM Performance - US2 Details + hover soft', steps: 'Inspect Performance Details legends; soft hover.', expected: 'Title/legends; hover soft.' },
  { id: 'REG-RR-US2-011', submodule: 'Native App', title: 'RUM Native App Performance - US2 soft', steps: 'Inspect Groups/Pages + CPU/Memory language.', expected: 'Native App title; series soft.' },
  { id: 'REG-RR-US2-012', submodule: 'Comparison', title: 'RUM Performance Comparison - US2 soft', steps: 'Inspect Onload / All Matching Pages.', expected: 'Comparison title present.' },
  { id: 'REG-RR-US2-013', submodule: 'Bounce Rate', title: 'Bounce Rate Sessions/Bounce/PV by Onload', steps: 'Inspect Bounce Rate chart language.', expected: 'Bounce title; not primary datetime hover.' },
  { id: 'REG-RR-US2-014', submodule: 'KPI', title: 'KPI Date Comparison type soft restore', steps: 'Sample Year to Year then Day to Day; no sticky Apply.', expected: 'Comparison type restored.' },
  { id: 'REG-RR-US2-015', submodule: 'Breakdowns', title: 'Performance by Browser/Country/Region soft', steps: 'Assert three breakdown titles; no entity hard-code.', expected: 'All three titles present.' },
  { id: 'REG-RR-US2-016', submodule: 'Tables', title: 'Summary + Traffic/Timing/Device Metrics', steps: 'Assert Summary/Traffic/Timing/Device language.', expected: 'Labels present; values format-tolerant.' },
  { id: 'REG-RR-US2-017', submodule: 'Path', title: 'Performance Path High/Detail + device restore', steps: 'Toggle Detail then High; Desktop then All.', expected: 'Path chrome restored.' },
  { id: 'REG-RR-US2-018', submodule: 'Geography', title: 'Geography Displayed Metric soft', steps: 'Open metric menu; Escape; restore.', expected: 'Map/metric soft; no sticky change.' },
  { id: 'REG-RR-US2-019', submodule: 'Soft empty', title: 'SLA Violations / Year by Year soft', steps: 'Scroll; assert titles or annotate empty.', expected: 'Soft presence; empty OK.' },
  { id: 'REG-RR-US2-020', submodule: 'Graphs', title: 'Highcharts shells present', steps: 'Count Highcharts; assert core titles.', expected: '≥1 chart; core titles remain.' },
  { id: 'REG-RR-US2-021', submodule: 'Filters', title: 'Filters Cancel-only; My/Shared tabs', steps: 'Open Filters; My/Shared; Cancel.', expected: 'Drawer closes; home retained.' },
  { id: 'REG-RR-US2-022', submodule: 'Chrome', title: 'Manager / + Widget cancel-only', steps: 'Open Manager and +Widget; Escape/Cancel.', expected: 'No sticky Save.' },
  { id: 'REG-RR-US2-023', submodule: 'Sibling', title: 'Soft Tag Governance - US2 then restore', steps: 'Switch TG-US2; restore home + GDC.', expected: 'Exact RUM Regression - US2.' },
  { id: 'REG-RR-US2-024', submodule: 'Sibling', title: 'Soft RUM Performance Detail then restore', steps: 'Switch Preconfigured RUM Performance Detail; restore.', expected: 'Exact Custom home restored.' },
  { id: 'REG-RR-US2-025', submodule: 'Sibling', title: 'Soft Site Overview then restore', steps: 'Switch Site Overview; restore.', expected: 'Exact home restored.' },
  { id: 'REG-RR-US2-026', submodule: 'Lookback', title: 'Custom Date Selection open/cancel only', steps: 'Open Custom Date; cancel.', expected: 'No sticky custom range.' },
  { id: 'REG-RR-US2-027', submodule: 'Responsive', title: '1100px viewport keeps widgets reachable', steps: 'Resize; evaluate-scroll Performance/Device Metrics.', expected: 'Lookback visible.' },
  { id: 'REG-RR-US2-028', submodule: 'Chrome', title: 'Last Updated + Carousel soft', steps: 'Inspect last-updated and Carousel.', expected: 'Soft presence; carousel not left cycling.' },
  { id: 'REG-RR-US2-029', submodule: 'Lookback', title: 'Prescribed 6h/24h/7d/30d + Performance hover intervals', steps: 'Apply each lookback; hover Performance/Comparison; Bounce/Geography not primary. Restore.', expected: 'Each applied; hover/signature differ or empty annotate.' },
  { id: 'REG-RR-US2-030', submodule: 'Chrome', title: 'Top chrome icons tooltips + round-trip', steps: 'Hover/click chrome icons; return dashboard.', expected: 'Tips/clicks soft; home retained.' },
  { id: 'REG-RR-US2-031', submodule: 'Recovery', title: 'Reload soft recovery to RUM Regression - US2', steps: 'Reload; re-select home + GDC.', expected: 'Healthy suite home.' },
  { id: 'REG-RR-US2-032', submodule: 'Negative', title: 'Not other Custom US2 / RUM Performance Detail / Monitoring home', steps: 'Assert switcher + route + body.', expected: 'Exact RUM Regression - US2 only.' },
  { id: 'REG-RR-US2-033', submodule: 'Recovery', title: 'Restore initial context; suite home healthy', steps: 'restoreContext; widget defaults; assert.', expected: 'Healthy RUM Regression - US2 on GDC.' },
];

async function main() {
  const { path: written, count } = await writeRegressionManualWorkbook({
    outPath: path.join(process.cwd(), 'docs', 'RUM_Regression_US2_Dashboard_Regression.xlsx'),
    screenTitle: 'RUM Regression - US2 (Custom Dashboard)',
    site: SITE,
    dc: DC,
    module: MODULE,
    typeLabel: 'Regression (read-only)',
    helpLine:
      'SoT = live probe + Custom Dashboard Widgets article + RUM Performance Detail extract (sibling only). Custom optgroup; exact RUM Regression - US2. No Save Filter / widget X / Monitoring rum-pd as home.',
    automation: AUTOMATION,
    executionStatus: EXECUTION_STATUS,
    executionNote: EXECUTION_NOTE,
    notes: [
      'Exact home: Dashboards → Custom → RUM Regression - US2 on site/dashboard.',
      'Never accept Synthetic/Alerts/Business/Marketing/Tag Governance - US2, Preconfigured RUM Performance Detail, Site Overview, or Monitoring Real User Browser as suite home.',
      'No Save Filter / Clear Cache / widget Delete / sticky KPI Apply / Path device / Geography metric.',
      'Prescribed lookbacks: Last 6 hours, Last 24 hours, Last 7 days, Last 30 days + Performance/Comparison hover datetime interval (Bounce Rate/Geography not primary).',
      'Hosts: chartID_*, perfGraph-chartID_*, trafficDiv_*, timersDiv_*, deviceMetricsPanel_*, map-*, metric-*, type-of-comparison-*, pFlowWrpper_*.',
      'npm run test:regression:us2:rum-regression-us2 (not rum-pd)',
    ],
    cases: cases.map((c) => ({ ...c, module: MODULE, type: 'Regression' })),
  });
  console.log('Wrote', written, 'cases=', count);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
