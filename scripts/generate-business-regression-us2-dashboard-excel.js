/**
 * Generates docs/Business_Regression_US2_Dashboard_Regression.xlsx
 * Sheets: Summary / Regression TCs / Notes
 *
 * Run: node scripts/generate-business-regression-us2-dashboard-excel.js
 */
const path = require('path');
const { writeRegressionManualWorkbook } = require('./lib/regressionManualExcel');

const SITE = 'GDC Test Site 2';
const DC = 'US';
const MODULE = 'Dashboards — Custom — Business Regression - US2';
const AUTOMATION =
  'tests/regression_tests/US2/dashboards/custom/business-regression-us2/business.regression.us2.dashboard.regression.spec.ts';
const EXECUTION_STATUS = process.env.BR_US2_EXECUTION_STATUS || 'Not Executed';
const EXECUTION_NOTE =
  process.env.BR_US2_EXECUTION_NOTE ||
  'Run npm run test:regression:us2:business-regression-us2 and record live-data annotations from Allure.';

const cases = [
  { id: 'REG-BR-US2-001', submodule: 'Navigation', title: 'Page loads via Dashboards with correct title/route', steps: 'Login; open Dashboards left menu.', expected: 'URL site/dashboard; title Dashboards.' },
  { id: 'REG-BR-US2-002', submodule: 'Identity', title: 'Exact Business Regression - US2 selected; core widgets', steps: 'Select Custom Business Regression - US2; assert CRC / COT / ROT / RO.', expected: 'Exact home; four widgets present.' },
  { id: 'REG-BR-US2-003', submodule: 'Context', title: 'GDC Test Site 2; lookback/auto-refresh captured', steps: 'Verify site + chrome labels.', expected: 'GDC selected; lookback non-empty.' },
  { id: 'REG-BR-US2-004', submodule: 'Chrome', title: 'Switcher, lookback, refresh, auto-refresh visible', steps: 'Inspect top chrome hosts.', expected: 'Controls attached/visible.' },
  { id: 'REG-BR-US2-005', submodule: 'Identity', title: 'Custom list includes home; siblings soft', steps: 'List Custom + Preconfigured options.', expected: 'Home under Custom; Alerts/Synthetic not accepted as home.' },
  { id: 'REG-BR-US2-006', submodule: 'Lookback', title: 'Time Lookback menu multi presets', steps: 'Open #time-lookback menu.', expected: '≥4 presets soft.' },
  { id: 'REG-BR-US2-007', submodule: 'Lookback', title: 'Soft apply 24h then 7d; restore', steps: 'Apply Last 24 hours; Last 7 days; restore capture.', expected: 'Widgets ready; home retained.' },
  { id: 'REG-BR-US2-008', submodule: 'Chrome', title: 'Dashboard Refresh without blank crash', steps: 'Click #refresh-dashboard.', expected: 'Core titles remain.' },
  { id: 'REG-BR-US2-009', submodule: 'Chrome', title: 'Auto Refresh menu Off + intervals', steps: 'Open Auto Refresh menu.', expected: 'Options listed soft.' },
  { id: 'REG-BR-US2-010', submodule: 'CRC', title: 'Conversions by Response Time axes + legend', steps: 'Inspect Onload (Seconds), Conversion Rate, Sessions, Avg Order Value / Average Revenue.', expected: 'CRC title and axes/legend subset present.' },
  { id: 'REG-BR-US2-011', submodule: 'CRC', title: 'CRC legend toggle restore; seconds-axis hover', steps: 'Toggle first legend item restore; hover CRC (not datetime lookback widget).', expected: 'Legend restored; hover annotated as seconds-axis.' },
  { id: 'REG-BR-US2-012', submodule: 'COT', title: 'Conversions over Time legend Conversion Rate / AOV / Onload', steps: 'Inspect dual-regex Over/over Time title; All Matching Pages soft.', expected: 'COT title + legend subset.' },
  { id: 'REG-BR-US2-013', submodule: 'COT', title: 'COT legend toggle + time-axis hover', steps: 'Toggle legend restore; hover plotted point.', expected: 'Tooltip soft or empty annotate.' },
  { id: 'REG-BR-US2-014', submodule: 'ROT', title: 'Revenue Over Time PDF + live Brand series', steps: 'Inspect Revenue/Orders/Page Views/Sessions; Brand Value/Orders soft.', expected: 'ROT title; Traffic Segments language soft.' },
  { id: 'REG-BR-US2-015', submodule: 'ROT', title: 'ROT legend toggle + hover', steps: 'Toggle legend restore; hover tooltip.', expected: 'Series restored; hover soft.' },
  { id: 'REG-BR-US2-016', submodule: 'Graphs', title: 'Highcharts shells present', steps: 'Count Highcharts hosts; assert titles not SVG-count-only.', expected: '≥1 chart; four widget titles remain.' },
  { id: 'REG-BR-US2-017', submodule: 'RO', title: 'Revenue Opportunity device tabs restore ALL', steps: 'Assert ALL/DESKTOP/IOS/ANDROID; click DESKTOP; restore ALL. Never hard-code page bars.', expected: 'ALL restored; by-Page / over N days annotated.' },
  { id: 'REG-BR-US2-018', submodule: 'Filters', title: 'Filters Cancel-only; My/Shared tabs', steps: 'Open Filters; My/Shared; Cancel. No Save Filter. Leave Page Name untouched.', expected: 'Drawer closes; home retained.' },
  { id: 'REG-BR-US2-019', submodule: 'Chrome', title: 'Manager / + Widget cancel-only', steps: 'Open Manager and +Widget; Escape/Cancel.', expected: 'No sticky Save.' },
  { id: 'REG-BR-US2-020', submodule: 'Sibling', title: 'Soft Alerts Regression - US2 then restore', steps: 'Switch AR-US2; restore home + GDC.', expected: 'Exact Business Regression - US2.' },
  { id: 'REG-BR-US2-021', submodule: 'Sibling', title: 'Soft Site Overview then restore', steps: 'Switch Site Overview (also has ROT); restore.', expected: 'Exact home restored; not Site Overview.' },
  { id: 'REG-BR-US2-022', submodule: 'Sibling', title: 'Soft Synthetic Regression - US2 then restore', steps: 'Switch SR-US2; restore.', expected: 'Exact Business Regression - US2 home.' },
  { id: 'REG-BR-US2-023', submodule: 'Lookback', title: 'Custom Date Selection open/cancel only', steps: 'Open Custom Date; cancel.', expected: 'No sticky custom range.' },
  { id: 'REG-BR-US2-024', submodule: 'Responsive', title: '1100px viewport keeps widgets reachable', steps: 'Resize; evaluate-scroll CRC/RO.', expected: 'Lookback visible.' },
  { id: 'REG-BR-US2-025', submodule: 'Chrome', title: 'Last Updated + Carousel soft', steps: 'Inspect last-updated and Carousel.', expected: 'Soft presence; carousel not left cycling.' },
  { id: 'REG-BR-US2-026', submodule: 'Lookback', title: 'Prescribed 6h/24h/7d/30d + COT/ROT hover intervals', steps: 'Apply each lookback; hover COT then ROT; compare tooltip span. CRC is seconds-axis; RO may ignore lookback. Restore.', expected: 'Each applied; hover/signature differ or empty annotate.' },
  { id: 'REG-BR-US2-027', submodule: 'Chrome', title: 'Top chrome icons tooltips + round-trip', steps: 'Hover/click chrome icons; return dashboard.', expected: 'Tips/clicks soft; home retained.' },
  { id: 'REG-BR-US2-028', submodule: 'Recovery', title: 'Reload soft recovery to Business Regression - US2', steps: 'Reload; re-select home + GDC.', expected: 'Healthy suite home.' },
  { id: 'REG-BR-US2-029', submodule: 'Negative', title: 'Not AR/SR-US2 / Site Overview / Improve Conversion as home', steps: 'Assert switcher + route + body.', expected: 'Exact Business Regression - US2 only.' },
  { id: 'REG-BR-US2-030', submodule: 'Recovery', title: 'Restore initial context; suite home healthy', steps: 'restoreContext; RO ALL tab; assert.', expected: 'Healthy Business Regression - US2 on GDC.' },
];

async function main() {
  const { path: written, count } = await writeRegressionManualWorkbook({
    outPath: path.join(process.cwd(), 'docs', 'Business_Regression_US2_Dashboard_Regression.xlsx'),
    screenTitle: 'Business Regression - US2 (Custom Dashboard)',
    site: SITE,
    dc: DC,
    module: MODULE,
    typeLabel: 'Regression (read-only)',
    helpLine:
      'SoT = live probe + CRC / Conversions Over Time / Revenue Over Time / Revenue Opportunity PDFs. Custom optgroup; exact Business Regression - US2. No Save Filter / widget X.',
    automation: AUTOMATION,
    executionStatus: EXECUTION_STATUS,
    executionNote: EXECUTION_NOTE,
    notes: [
      'Exact home: Dashboards → Custom → Business Regression - US2 on site/dashboard.',
      'Never accept Alerts/Synthetic Regression - US2, Site Overview, Shared Business Metrics, or left-nav Revenue Opportunity as suite home.',
      'No Save Filter / Clear Cache / widget Delete / RO sticky DESKTOP tab.',
      'Prescribed lookbacks: Last 6 hours, Last 24 hours, Last 7 days, Last 30 days + COT/ROT hover datetime interval (CRC is Onload seconds; RO may be report-window insensitive).',
      'Hosts: chartID_*, all-total-btn-*, desktop-btn-*, ios-btn-*, android-btn-*, all-total-graph-*, desktop-graph-*, ios-graph-*, android-graph-*.',
      'npm run test:regression:us2:business-regression-us2',
    ],
    cases: cases.map((c) => ({ ...c, module: MODULE, type: 'Regression' })),
  });
  console.log('Wrote', written, 'cases=', count);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
