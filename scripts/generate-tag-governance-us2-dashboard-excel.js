/**
 * Generates docs/Tag_Governance_US2_Dashboard_Regression.xlsx
 * Sheets: Summary / Regression TCs / Notes
 *
 * Run: node scripts/generate-tag-governance-us2-dashboard-excel.js
 */
const path = require('path');
const { writeRegressionManualWorkbook } = require('./lib/regressionManualExcel');

const SITE = 'GDC Test Site 2';
const DC = 'US';
const MODULE = 'Dashboards — Custom — Tag Governance - US2';
const AUTOMATION =
  'tests/regression_tests/US2/dashboards/custom/tag-governance-us2/tag.governance.us2.dashboard.regression.spec.ts';
const EXECUTION_STATUS = process.env.TG_US2_EXECUTION_STATUS || 'Not Executed';
const EXECUTION_NOTE =
  process.env.TG_US2_EXECUTION_NOTE ||
  'Run npm run test:regression:us2:tag-governance-us2 and record live-data annotations from Allure.';

const cases = [
  { id: 'REG-TG-US2-001', submodule: 'Navigation', title: 'Page loads via Dashboards with correct title/route', steps: 'Login; open Dashboards left menu.', expected: 'URL site/dashboard; title Dashboards.' },
  { id: 'REG-TG-US2-002', submodule: 'Identity', title: 'Exact Tag Governance - US2 selected; five core widgets', steps: 'Select Custom Tag Governance - US2; assert Composition/Activity/Environment titles.', expected: 'Exact home; five widgets present.' },
  { id: 'REG-TG-US2-003', submodule: 'Context', title: 'GDC Test Site 2; lookback/auto-refresh captured', steps: 'Verify site + chrome labels.', expected: 'GDC selected; lookback non-empty.' },
  { id: 'REG-TG-US2-004', submodule: 'Chrome', title: 'Switcher, lookback, refresh, auto-refresh visible', steps: 'Inspect top chrome hosts.', expected: 'Controls attached/visible.' },
  { id: 'REG-TG-US2-005', submodule: 'Identity', title: 'Custom list includes home; siblings soft', steps: 'List Custom + Preconfigured options.', expected: 'Home under Custom; MR/BR/AR not accepted as home.' },
  { id: 'REG-TG-US2-006', submodule: 'Lookback', title: 'Time Lookback menu multi presets', steps: 'Open #time-lookback menu.', expected: '≥4 presets soft.' },
  { id: 'REG-TG-US2-007', submodule: 'Lookback', title: 'Soft apply 24h then 7d; restore', steps: 'Apply Last 24 hours; Last 7 days; restore capture.', expected: 'Widgets ready; home retained.' },
  { id: 'REG-TG-US2-008', submodule: 'Chrome', title: 'Dashboard Refresh without blank crash', steps: 'Click #refresh-dashboard.', expected: 'Core titles remain.' },
  { id: 'REG-TG-US2-009', submodule: 'Chrome', title: 'Auto Refresh menu Off + intervals', steps: 'Open Auto Refresh menu.', expected: 'Options listed soft.' },
  { id: 'REG-TG-US2-010', submodule: 'Composition', title: 'Composition - US2 Domain Activity / File Size / Element Count', steps: 'Inspect unlabeled Composition - US2; 1st vs 3rd Party language.', expected: 'Title exact (not RUM); metric subset; values not hard-coded.' },
  { id: 'REG-TG-US2-011', submodule: 'Composition', title: 'Composition - RUM - US2 metrics soft', steps: 'Inspect Composition - RUM - US2; File Size soft-absent OK.', expected: 'RUM title; Domain Activity / Element Count soft.' },
  { id: 'REG-TG-US2-012', submodule: 'Activity', title: 'Activity Synthetic SERVICES/DOMAINS/FILES + party restore', steps: 'Toggle DOMAINS then SERVICES; 3rd Party then All/prior.', expected: 'Tabs/party restored; no sticky Save.' },
  { id: 'REG-TG-US2-013', submodule: 'Activity', title: 'Activity Synthetic Slowest-metric + Graph/Table + Export cancel', steps: 'Open Slowest-metric menu (restore); Table then Graph; Export cancel; hover bars.', expected: 'No sticky metric/Table/Export; hover soft.' },
  { id: 'REG-TG-US2-014', submodule: 'Activity', title: 'Activity RUM chrome soft distinct from Synthetic', steps: 'Operate on Activity - RUM - US2 hosts only.', expected: 'RUM title; tabs/hover soft.' },
  { id: 'REG-TG-US2-015', submodule: 'Environment', title: 'Environment - US2 RUM/SYNTH sparkline tiles', steps: 'Inspect DOMAINS/PAGES/FILES RUM+SYNTH; Vendors/SLA soft.', expected: 'Environment title; tiles present; deltas not hard-coded.' },
  { id: 'REG-TG-US2-016', submodule: 'Graphs', title: 'Highcharts shells present', steps: 'Count Highcharts hosts; assert titles not SVG-count-only.', expected: '≥1 chart; five widget titles remain.' },
  { id: 'REG-TG-US2-017', submodule: 'Filters', title: 'Filters Cancel-only; My/Shared tabs', steps: 'Open Filters; My/Shared; Cancel. No Save Filter.', expected: 'Drawer closes; home retained.' },
  { id: 'REG-TG-US2-018', submodule: 'Chrome', title: 'Manager / + Widget cancel-only', steps: 'Open Manager and +Widget; Escape/Cancel.', expected: 'No sticky Save.' },
  { id: 'REG-TG-US2-019', submodule: 'Sibling', title: 'Soft Marketing Regression - US2 then restore', steps: 'Switch MR-US2; restore home + GDC.', expected: 'Exact Tag Governance - US2.' },
  { id: 'REG-TG-US2-020', submodule: 'Sibling', title: 'Soft Site Overview then restore', steps: 'Switch Preconfigured Site Overview; restore.', expected: 'Exact home restored.' },
  { id: 'REG-TG-US2-021', submodule: 'Sibling', title: 'Soft Business Regression - US2 then restore', steps: 'Switch BR-US2; restore.', expected: 'Exact Tag Governance - US2 home.' },
  { id: 'REG-TG-US2-022', submodule: 'Lookback', title: 'Custom Date Selection open/cancel only', steps: 'Open Custom Date; cancel.', expected: 'No sticky custom range.' },
  { id: 'REG-TG-US2-023', submodule: 'Responsive', title: '1100px viewport keeps widgets reachable', steps: 'Resize; evaluate-scroll Composition/Environment.', expected: 'Lookback visible.' },
  { id: 'REG-TG-US2-024', submodule: 'Chrome', title: 'Last Updated + Carousel soft', steps: 'Inspect last-updated and Carousel.', expected: 'Soft presence; carousel not left cycling.' },
  { id: 'REG-TG-US2-025', submodule: 'Lookback', title: 'Prescribed 6h/24h/7d/30d + Activity hover intervals', steps: 'Apply each lookback; hover Activity Synthetic/RUM bars; compare tooltip span. Composition/Environment not primary. Restore.', expected: 'Each applied; hover/signature differ or empty annotate.' },
  { id: 'REG-TG-US2-026', submodule: 'Chrome', title: 'Top chrome icons tooltips + round-trip', steps: 'Hover/click chrome icons; return dashboard.', expected: 'Tips/clicks soft; home retained.' },
  { id: 'REG-TG-US2-027', submodule: 'Recovery', title: 'Reload soft recovery to Tag Governance - US2', steps: 'Reload; re-select home + GDC.', expected: 'Healthy suite home.' },
  { id: 'REG-TG-US2-028', submodule: 'Negative', title: 'Not MR/BR/AR/SR-US2 / Site Overview / CSP-nav as home', steps: 'Assert switcher + route + body.', expected: 'Exact Tag Governance - US2 only.' },
  { id: 'REG-TG-US2-029', submodule: 'Recovery', title: 'Restore initial context; suite home healthy', steps: 'restoreContext; Activity defaults; assert.', expected: 'Healthy Tag Governance - US2 on GDC.' },
];

async function main() {
  const { path: written, count } = await writeRegressionManualWorkbook({
    outPath: path.join(process.cwd(), 'docs', 'Tag_Governance_US2_Dashboard_Regression.xlsx'),
    screenTitle: 'Tag Governance - US2 (Custom Dashboard)',
    site: SITE,
    dc: DC,
    module: MODULE,
    typeLabel: 'Regression (read-only)',
    helpLine:
      'SoT = live probe + Environment / 1st vs 3rd Party Composition / 1st vs 3rd Party Activity PDFs. Custom optgroup; exact Tag Governance - US2. No Save Filter / widget X / CSP manage Save.',
    automation: AUTOMATION,
    executionStatus: EXECUTION_STATUS,
    executionNote: EXECUTION_NOTE,
    notes: [
      'Exact home: Dashboards → Custom → Tag Governance - US2 on site/dashboard.',
      'Never accept Marketing/Business/Alerts/Synthetic/RUM Regression - US2, Site Overview, or left-nav CSP & Tag Governance as suite home.',
      'No Save Filter / Clear Cache / widget Delete / sticky Activity DOMAINS/3rd Party/Table/Slowest-metric.',
      'Prescribed lookbacks: Last 6 hours, Last 24 hours, Last 7 days, Last 30 days + Activity bar hover datetime interval (Composition/Environment not primary).',
      'Hosts: chartID_*, first-vs-third-*, domains-btn_*, first-party-btn_*, third-party-btn_*, slowest-metric_*, slowest-*-graph_*, sparkline_*_rum/synth_*.',
      'npm run test:regression:us2:tag-governance-us2',
    ],
    cases: cases.map((c) => ({ ...c, module: MODULE, type: 'Regression' })),
  });
  console.log('Wrote', written, 'cases=', count);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
