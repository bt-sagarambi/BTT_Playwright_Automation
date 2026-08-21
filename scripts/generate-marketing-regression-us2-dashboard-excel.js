/**
 * Generates docs/Marketing_Regression_US2_Dashboard_Regression.xlsx
 * Sheets: Summary / Regression TCs / Notes
 *
 * Run: node scripts/generate-marketing-regression-us2-dashboard-excel.js
 */
const path = require('path');
const { writeRegressionManualWorkbook } = require('./lib/regressionManualExcel');

const SITE = 'GDC Test Site 2';
const DC = 'US';
const MODULE = 'Dashboards — Custom — Marketing Regression - US2';
const AUTOMATION =
  'tests/regression_tests/US2/dashboards/custom/marketing-regression-us2/marketing.regression.us2.dashboard.regression.spec.ts';
const EXECUTION_STATUS = process.env.MR_US2_EXECUTION_STATUS || 'Not Executed';
const EXECUTION_NOTE =
  process.env.MR_US2_EXECUTION_NOTE ||
  'Run npm run test:regression:us2:marketing-regression-us2 and record live-data annotations from Allure.';

const cases = [
  { id: 'REG-MR-US2-001', submodule: 'Navigation', title: 'Page loads via Dashboards with correct title/route', steps: 'Login; open Dashboards left menu.', expected: 'URL site/dashboard; title Dashboards.' },
  { id: 'REG-MR-US2-002', submodule: 'Identity', title: 'Exact Marketing Regression - US2 selected; core widgets', steps: 'Select Custom Marketing Regression - US2; assert Campaign / Funnel / RO.', expected: 'Exact home; three widgets present.' },
  { id: 'REG-MR-US2-003', submodule: 'Context', title: 'GDC Test Site 2; lookback/auto-refresh captured', steps: 'Verify site + chrome labels.', expected: 'GDC selected; lookback non-empty.' },
  { id: 'REG-MR-US2-004', submodule: 'Chrome', title: 'Switcher, lookback, refresh, auto-refresh visible', steps: 'Inspect top chrome hosts.', expected: 'Controls attached/visible.' },
  { id: 'REG-MR-US2-005', submodule: 'Identity', title: 'Custom list includes home; siblings soft', steps: 'List Custom + Preconfigured options.', expected: 'Home under Custom; BR/AR/SR not accepted as home.' },
  { id: 'REG-MR-US2-006', submodule: 'Lookback', title: 'Time Lookback menu multi presets', steps: 'Open #time-lookback menu.', expected: '≥4 presets soft.' },
  { id: 'REG-MR-US2-007', submodule: 'Lookback', title: 'Soft apply 24h then 7d; restore', steps: 'Apply Last 24 hours; Last 7 days; restore capture.', expected: 'Widgets ready; home retained.' },
  { id: 'REG-MR-US2-008', submodule: 'Chrome', title: 'Dashboard Refresh without blank crash', steps: 'Click #refresh-dashboard.', expected: 'Core titles remain.' },
  { id: 'REG-MR-US2-009', submodule: 'Chrome', title: 'Auto Refresh menu Off + intervals', steps: 'Open Auto Refresh menu.', expected: 'Options listed soft.' },
  { id: 'REG-MR-US2-010', submodule: 'Campaign', title: 'Campaign Information KPIs + campaign label', steps: 'Inspect Campaign Information - US2; (No Campaign Assigned) soft; Page Views/Sessions/Bounce/Exit/Onload/Orders/CR/Revenue.', expected: 'Title + KPI subset; values not hard-coded.' },
  { id: 'REG-MR-US2-011', submodule: 'Campaign', title: 'Campaign picker soft sample then restore', steps: 'Open campaign picker if present; sample other option; restore.', expected: 'No sticky Save; prior campaign restored soft.' },
  { id: 'REG-MR-US2-012', submodule: 'Funnel', title: 'Bottom of Sales Funnel title + conversion language', steps: 'Inspect dual-regex Bottom of (the) Sales Funnel; View By; Bottom/Total Funnel Conversion.', expected: 'Funnel title + conversion language; steps not hard-coded.' },
  { id: 'REG-MR-US2-013', submodule: 'Funnel', title: 'View By Page Views/Sessions restore + hover', steps: 'Toggle View By; restore; soft hover funnel chart.', expected: 'Mode restored; hover soft or empty annotate.' },
  { id: 'REG-MR-US2-014', submodule: 'Graphs', title: 'Highcharts shells present', steps: 'Count Highcharts hosts; assert titles not SVG-count-only.', expected: '≥1 chart; three widget titles remain.' },
  { id: 'REG-MR-US2-015', submodule: 'RO', title: 'Revenue Opportunity device tabs restore ALL', steps: 'Assert ALL/DESKTOP/IOS/ANDROID; click DESKTOP; restore ALL. Never hard-code page bars.', expected: 'ALL restored; by-Page / over N days annotated.' },
  { id: 'REG-MR-US2-016', submodule: 'Filters', title: 'Filters Cancel-only; My/Shared tabs', steps: 'Open Filters; My/Shared; Cancel. No Save Filter.', expected: 'Drawer closes; home retained.' },
  { id: 'REG-MR-US2-017', submodule: 'Chrome', title: 'Manager / + Widget cancel-only', steps: 'Open Manager and +Widget; Escape/Cancel.', expected: 'No sticky Save.' },
  { id: 'REG-MR-US2-018', submodule: 'Sibling', title: 'Soft Business Regression - US2 then restore', steps: 'Switch BR-US2; restore home + GDC.', expected: 'Exact Marketing Regression - US2.' },
  { id: 'REG-MR-US2-019', submodule: 'Sibling', title: 'Soft Traffic Source and Medium then restore', steps: 'Switch Preconfigured Traffic Source and Medium; restore.', expected: 'Exact home restored.' },
  { id: 'REG-MR-US2-020', submodule: 'Sibling', title: 'Soft Alerts Regression - US2 then restore', steps: 'Switch AR-US2; restore.', expected: 'Exact Marketing Regression - US2 home.' },
  { id: 'REG-MR-US2-021', submodule: 'Lookback', title: 'Custom Date Selection open/cancel only', steps: 'Open Custom Date; cancel.', expected: 'No sticky custom range.' },
  { id: 'REG-MR-US2-022', submodule: 'Responsive', title: '1100px viewport keeps widgets reachable', steps: 'Resize; evaluate-scroll Campaign/RO.', expected: 'Lookback visible.' },
  { id: 'REG-MR-US2-023', submodule: 'Chrome', title: 'Last Updated + Carousel soft', steps: 'Inspect last-updated and Carousel.', expected: 'Soft presence; carousel not left cycling.' },
  { id: 'REG-MR-US2-024', submodule: 'Lookback', title: 'Prescribed 6h/24h/7d/30d + funnel hover intervals', steps: 'Apply each lookback; hover Bottom of Sales Funnel; compare tooltip span. Campaign KPIs not datetime; RO may ignore lookback. Restore.', expected: 'Each applied; hover/signature differ or empty annotate.' },
  { id: 'REG-MR-US2-025', submodule: 'Chrome', title: 'Top chrome icons tooltips + round-trip', steps: 'Hover/click chrome icons; return dashboard.', expected: 'Tips/clicks soft; home retained.' },
  { id: 'REG-MR-US2-026', submodule: 'Recovery', title: 'Reload soft recovery to Marketing Regression - US2', steps: 'Reload; re-select home + GDC.', expected: 'Healthy suite home.' },
  { id: 'REG-MR-US2-027', submodule: 'Negative', title: 'Not BR/AR/SR-US2 / Traffic Source / Marketing Overview as home', steps: 'Assert switcher + route + body.', expected: 'Exact Marketing Regression - US2 only.' },
  { id: 'REG-MR-US2-028', submodule: 'Recovery', title: 'Restore initial context; suite home healthy', steps: 'restoreContext; RO ALL tab; assert.', expected: 'Healthy Marketing Regression - US2 on GDC.' },
];

async function main() {
  const { path: written, count } = await writeRegressionManualWorkbook({
    outPath: path.join(process.cwd(), 'docs', 'Marketing_Regression_US2_Dashboard_Regression.xlsx'),
    screenTitle: 'Marketing Regression - US2 (Custom Dashboard)',
    site: SITE,
    dc: DC,
    module: MODULE,
    typeLabel: 'Regression (read-only)',
    helpLine:
      'SoT = live probe + Campaign Information catalog / Bottom of Sales Funnel Widget / Revenue Opportunity Widget. Custom optgroup; exact Marketing Regression - US2. No Save Filter / widget X / Funnel Configuration Save.',
    automation: AUTOMATION,
    executionStatus: EXECUTION_STATUS,
    executionNote: EXECUTION_NOTE,
    notes: [
      'Exact home: Dashboards → Custom → Marketing Regression - US2 on site/dashboard.',
      'Never accept Business/Alerts/Synthetic Regression - US2, Traffic Source and Medium, Marketing Overview, Bottom of Sales Funnel Analysis, or left-nav Revenue Opportunity as suite home.',
      'No Save Filter / Clear Cache / widget Delete / RO sticky DESKTOP tab / Funnel Configuration Save.',
      'Prescribed lookbacks: Last 6 hours, Last 24 hours, Last 7 days, Last 30 days + funnel hover datetime interval (Campaign KPIs are tiles; RO may be report-window insensitive).',
      'Hosts: chartID_*, campaignDiv_*, campaign-button_*, campaign-name_*, bottom-sales-funnel-*, sales-funnel-page-views-sessions-selector_*, all-total-btn_*, desktop-btn_*, ios-btn_*, android-btn_*, all-total-graph_*, desktop-graph_*, ios-graph_*, android-graph_*.',
      'npm run test:regression:us2:marketing-regression-us2',
    ],
    cases: cases.map((c) => ({ ...c, module: MODULE, type: 'Regression' })),
  });
  console.log('Wrote', written, 'cases=', count);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
