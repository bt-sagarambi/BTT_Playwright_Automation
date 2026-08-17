/**
 * Generates docs/Synthetic_Regression_US2_Dashboard_Regression.xlsx
 * Sheets: Summary / Regression TCs / Notes
 *
 * Run: node scripts/generate-synthetic-regression-us2-dashboard-excel.js
 */
const path = require('path');
const { writeRegressionManualWorkbook } = require('./lib/regressionManualExcel');

const SITE = 'GDC Test Site 2';
const DC = 'US';
const MODULE = 'Dashboards — Custom — Synthetic Regression - US2';
const AUTOMATION =
  'tests/regression_tests/US2/dashboards/custom/synthetic-regression-us2/synthetic.regression.us2.dashboard.regression.spec.ts';
const EXECUTION_STATUS = process.env.SR_US2_EXECUTION_STATUS || 'Not Executed';
const EXECUTION_NOTE =
  process.env.SR_US2_EXECUTION_NOTE ||
  'Run npm run test:regression:us2:synthetic-regression-us2 and record live-data annotations from Allure.';

const cases = [
  { id: 'REG-SR-US2-001', submodule: 'Navigation', title: 'Page loads via Dashboards with correct title/route', steps: 'Login; open Dashboards left menu.', expected: 'URL site/dashboard; title Dashboards.' },
  { id: 'REG-SR-US2-002', submodule: 'Identity', title: 'Exact Synthetic Regression - US2 selected; core widgets', steps: 'Select Custom Synthetic Regression - US2; assert core titles.', expected: 'Exact home; Summary/Performance/Network/API/Availability present.' },
  { id: 'REG-SR-US2-003', submodule: 'Context', title: 'GDC Test Site 2; lookback/auto-refresh captured', steps: 'Verify site + chrome labels.', expected: 'GDC selected; lookback non-empty.' },
  { id: 'REG-SR-US2-004', submodule: 'Chrome', title: 'Switcher, lookback, refresh, auto-refresh visible', steps: 'Inspect top chrome hosts.', expected: 'Controls attached/visible.' },
  { id: 'REG-SR-US2-005', submodule: 'Identity', title: 'Custom list includes home; Preconfigured siblings soft', steps: 'List Custom + Preconfigured options.', expected: 'Home under Custom; Soft SSH/SPD in Preconfigured.' },
  { id: 'REG-SR-US2-006', submodule: 'Lookback', title: 'Time Lookback menu multi presets', steps: 'Open #time-lookback menu.', expected: '≥4 presets soft.' },
  { id: 'REG-SR-US2-007', submodule: 'Lookback', title: 'Soft apply 24h then 7d; restore', steps: 'Apply Last 24 hours; Last 7 days; restore capture.', expected: 'Widgets ready; home retained.' },
  { id: 'REG-SR-US2-008', submodule: 'Chrome', title: 'Dashboard Refresh without blank crash', steps: 'Click #refresh-dashboard.', expected: 'Core titles remain.' },
  { id: 'REG-SR-US2-009', submodule: 'Chrome', title: 'Auto Refresh menu Off + intervals', steps: 'Open Auto Refresh menu.', expected: 'Options listed soft.' },
  { id: 'REG-SR-US2-010', submodule: 'Summary', title: 'Performance Summary - US2 metric labels soft', steps: 'Inspect KPI card labels.', expected: '≥5 labels (hits/onload/FCP/LCP/…); format-tolerant values.' },
  { id: 'REG-SR-US2-011', submodule: 'Performance', title: 'Performance - US2 Details chart + legend soft', steps: 'Assert chart shell; toggle legend restore.', expected: 'Sized Highcharts; legend soft.' },
  { id: 'REG-SR-US2-012', submodule: 'Performance', title: 'Soft hover Performance tooltip', steps: 'Hover Performance graph.', expected: 'Tooltip text soft or empty annotate.' },
  { id: 'REG-SR-US2-013', submodule: 'Network/API', title: 'Network Health Check + API Checks titles', steps: 'Scroll/assert widget titles.', expected: 'Both *-US2 titles present.' },
  { id: 'REG-SR-US2-014', submodule: 'Availability', title: 'Site Availability + Perf. Comparison soft', steps: 'Assert titles + Over Time soft.', expected: 'Titles present.' },
  { id: 'REG-SR-US2-015', submodule: 'Errors', title: 'Error Tracking and Performance soft', steps: 'Inspect Error Tracking widget.', expected: 'Empty error-state OR monitor rows soft.' },
  { id: 'REG-SR-US2-016', submodule: 'Scatter', title: 'Session Scatter soft drill Waterfall/Film/Har/Log', steps: 'Click scatter point if present; soft tabs; close.', expected: 'Tabs soft; restore Auto Refresh if paused.' },
  { id: 'REG-SR-US2-017', submodule: 'Fxn Timing', title: '1st vs 3rd Party Fxn Timing table soft', steps: 'Scroll Fxn Timing; inspect Slowest Functions headers.', expected: 'Title + Function|File|Domain|Service soft.' },
  { id: 'REG-SR-US2-018', submodule: 'Geography', title: 'Perf. by Geography - US2 soft', steps: 'Scroll Geography widget.', expected: 'Title present.' },
  { id: 'REG-SR-US2-019', submodule: 'Filters', title: 'Filters Cancel-only; My/Shared tabs', steps: 'Open Filters; My/Shared; Cancel. No Save Filter.', expected: 'Drawer closes; home retained.' },
  { id: 'REG-SR-US2-020', submodule: 'Chrome', title: 'Manager / + Widget cancel-only', steps: 'Open Manager and +Widget; Escape/Cancel.', expected: 'No sticky Save.' },
  { id: 'REG-SR-US2-021', submodule: 'Sibling', title: 'Soft SSH then restore Synthetic Regression - US2', steps: 'Switch Synthetic Site Health; restore home + GDC.', expected: 'Exact home restored.' },
  { id: 'REG-SR-US2-022', submodule: 'Sibling', title: 'Soft SPD then restore', steps: 'Switch Synthetic Performance Detail; restore.', expected: 'Exact home restored.' },
  { id: 'REG-SR-US2-023', submodule: 'Sibling', title: 'Soft RUM Regression - US2 then restore', steps: 'Switch Custom RUM Regression - US2; restore.', expected: 'Exact Synthetic Regression - US2 home.' },
  { id: 'REG-SR-US2-024', submodule: 'Lookback', title: 'Custom Date Selection open/cancel only', steps: 'Open Custom Date; cancel.', expected: 'No sticky custom range.' },
  { id: 'REG-SR-US2-025', submodule: 'Responsive', title: '1100px viewport keeps widgets reachable', steps: 'Resize; scroll Summary/Geography.', expected: 'Lookback visible.' },
  { id: 'REG-SR-US2-026', submodule: 'Chrome', title: 'Last Updated + Carousel soft', steps: 'Inspect last-updated and Carousel.', expected: 'Soft presence; carousel not left cycling.' },
  { id: 'REG-SR-US2-027', submodule: 'Lookback', title: 'Prescribed 6h/24h/7d/30d + graph hover intervals', steps: 'Apply each lookback; assert ready; hover Perf/Availability; compare tip intervals; restore.', expected: 'Each applied; soft differing tooltip/span across lookbacks.' },
  { id: 'REG-SR-US2-028', submodule: 'Chrome', title: 'Top chrome icons tooltips + round-trip', steps: 'Hover/click chrome icons; return dashboard.', expected: 'Tips/clicks soft; home retained.' },
  { id: 'REG-SR-US2-029', submodule: 'Recovery', title: 'Reload soft recovery to Synthetic Regression - US2', steps: 'Reload; re-select home + GDC.', expected: 'Healthy suite home.' },
  { id: 'REG-SR-US2-030', submodule: 'Negative', title: 'Not SSH / SPD / other Custom US2 as home', steps: 'Assert switcher + route + body.', expected: 'Exact Synthetic Regression - US2 only.' },
  { id: 'REG-SR-US2-031', submodule: 'Recovery', title: 'Restore initial context; suite home healthy', steps: 'restoreContext; assert.', expected: 'Healthy Synthetic Regression - US2 on GDC.' },
];

async function main() {
  const { path: written, count } = await writeRegressionManualWorkbook({
    outPath: path.join(process.cwd(), 'docs', 'Synthetic_Regression_US2_Dashboard_Regression.xlsx'),
    screenTitle: 'Synthetic Regression - US2 (Custom Dashboard)',
    site: SITE,
    dc: DC,
    module: MODULE,
    typeLabel: 'Regression (read-only)',
    helpLine:
      'SoT = live probe (Aug 2026). Custom optgroup; exact Synthetic Regression - US2. Soft siblings: SSH / SPD / other *-US2. No Save Filter / Clear Cache / permanent widget Save.',
    automation: AUTOMATION,
    executionStatus: EXECUTION_STATUS,
    executionNote: EXECUTION_NOTE,
    notes: [
      'Exact home: Dashboards → Custom → Synthetic Regression - US2 on site/dashboard.',
      'Never accept Synthetic Site Health, Synthetic Performance Detail, or other Custom *-US2 boards as suite home.',
      'No Save Filter / Clear Cache / permanent Add Widget / Clone / Delete / Unshare.',
      'Prescribed lookbacks: Last 6 hours, Last 24 hours, Last 7 days, Last 30 days + soft graph-hover time-interval differentiation.',
      'Prefer titles + id prefixes (chartID_*, perfGraph-chartID_*, page-scatter_*, *-card-chartID_*); never hard-code highcharts-* suffixes.',
      'npm run test:regression:us2:synthetic-regression-us2',
    ],
    cases: cases.map((c) => ({ ...c, module: MODULE, type: 'Regression' })),
  });
  console.log('Wrote', written, 'cases=', count);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
