/**
 * Generates docs/Native_App_Performance_Detail_Dashboard_Regression.xlsx
 * Sheets: Summary / Regression TCs / Notes
 *
 * Run: node scripts/generate-native-app-performance-detail-dashboard-excel.js
 */
const path = require('path');
const { writeRegressionManualWorkbook } = require('./lib/regressionManualExcel');

const SITE = 'GDC Test Site 2';
const DC = 'US';
const MODULE = 'Dashboards — Preconfigured';
const AUTOMATION =
  'tests/regression_tests/US2/dashboards/preconfigured/native-app-performance-detail/native.app.performance.detail.dashboard.regression.spec.ts';
const EXECUTION_STATUS = process.env.NAPD_EXECUTION_STATUS || 'Not Executed';
const EXECUTION_NOTE =
  process.env.NAPD_EXECUTION_NOTE ||
  'Run npm run test:regression:us2:native-app-performance-detail-dashboard and record live-data annotations from Allure.';

const cases = [
  { id: 'REG-NAPD-DASH-001', submodule: 'Navigation', title: 'Page loads via Dashboards menu/route with correct title', steps: 'Login; open Dashboards; observe route and title.', expected: 'URL site/dashboard; title Dashboards; not login.' },
  { id: 'REG-NAPD-DASH-002', submodule: 'Identity', title: 'Exact Native App Performance Detail; four core widget groups', steps: 'Select exact Native App Performance Detail; wait for widgets.', expected: 'Exact option; Bar Graph + Details + Performance Graph + Daily Averages.' },
  { id: 'REG-NAPD-DASH-003', submodule: 'Context', title: 'GDC Test Site 2; lookback/auto-refresh captured', steps: 'Verify quick site; capture lookback and auto-refresh.', expected: 'Profile site; lookback non-empty.' },
  { id: 'REG-NAPD-DASH-004', submodule: 'Chrome', title: 'Switcher, lookback, refresh, auto-refresh visible', steps: 'Inspect dashboard chrome.', expected: 'Core chrome attached/visible.' },
  { id: 'REG-NAPD-DASH-005', submodule: 'Chrome', title: 'Preconfigured list includes exact Native App Performance Detail', steps: 'Read #switch-dashboard Preconfigured options.', expected: 'NAPD present; RUM/Synthetic PD siblings listed soft.' },
  { id: 'REG-NAPD-DASH-006', submodule: 'Time Lookback', title: 'Time Lookback multi presets', steps: 'Open Time Lookback menu.', expected: 'More than three presets.' },
  { id: 'REG-NAPD-DASH-007', submodule: 'Time Lookback', title: 'Apply 24h / 7d and restore lookback', steps: 'Apply Last 24h and 7d; restore original.', expected: 'Widgets ready soft; NAPD home retained.' },
  { id: 'REG-NAPD-DASH-008', submodule: 'Chrome', title: 'Dashboard Refresh reloads without blank crash', steps: 'Click #refresh-dashboard.', expected: 'Four widget groups healthy.' },
  { id: 'REG-NAPD-DASH-009', submodule: 'Chrome', title: 'Auto Refresh menu soft (Off, 2m…60m)', steps: 'Open Auto Refresh menu.', expected: 'Off + intervals; bounds soft.' },
  { id: 'REG-NAPD-DASH-010', submodule: 'Bar Graph', title: 'Bar Graph shell and soft hosts', steps: 'Inspect Bar Graph + #multi-step-bar-graph soft.', expected: 'Bar Graph title/body; host soft.' },
  { id: 'REG-NAPD-DASH-011', submodule: 'Details', title: 'Details core cards Page Views / Performance Timing / Errors and Crashes', steps: 'Inspect Details cards core three.', expected: '≥2 core labels; formats soft; extra cards soft only.' },
  { id: 'REG-NAPD-DASH-012', submodule: 'Details', title: 'Metric card → Bar Graph / Daily Averages linkage soft', steps: 'Click Page Views, Performance Timing, Errors and Crashes; restore Performance Timing.', expected: 'Cards clicked; bar/daily signature may change; NAPD retained.' },
  { id: 'REG-NAPD-DASH-013', submodule: 'Performance Graph', title: 'Page Timings Over Time shell', steps: 'Inspect Performance Graph title body.', expected: 'Performance Graph + Page Timings Over Time; native series soft.' },
  { id: 'REG-NAPD-DASH-014', submodule: 'Performance Graph', title: 'Legend toggle + gear cancel soft', steps: 'Toggle legend; open/close gear without Save.', expected: 'Healthy graph; no permanent metric deselect.' },
  { id: 'REG-NAPD-DASH-015', submodule: 'Daily Averages', title: 'Page Name headers + soft rows', steps: 'Inspect Daily Averages table.', expected: 'Page Name; date/30 Day Average soft; empty OK annotate.' },
  { id: 'REG-NAPD-DASH-016', submodule: 'Daily Averages', title: 'Soft column sort', steps: 'Click sortable headers.', expected: 'Sort soft or annotate.' },
  { id: 'REG-NAPD-DASH-017', submodule: 'Daily Averages', title: 'Soft pagination', steps: 'Page size / Next-Previous soft; prefer not leave All.', expected: 'Pagination soft.' },
  { id: 'REG-NAPD-DASH-018', submodule: 'Daily Averages', title: 'Export open/close soft', steps: 'Export menu; Escape; no file content assert.', expected: 'CSV/TSV/JSON/Array soft when menu opens.' },
  { id: 'REG-NAPD-DASH-019', submodule: 'Filters', title: 'Filters drawer + My/Shared tabs soft', steps: 'Open Filters; tabs; Cancel.', expected: 'Time Period/Timezone/Site soft; no Save Filter.' },
  { id: 'REG-NAPD-DASH-020', submodule: 'Filters', title: 'Filters Apply soft path', steps: 'Apply when available; restore NAPD.', expected: 'NAPD retained.' },
  { id: 'REG-NAPD-DASH-021', submodule: 'Manager', title: 'Dashboard Manager soft open/close', steps: 'Open Manager; close without Save/Delete.', expected: 'No permanent mutation.' },
  { id: 'REG-NAPD-DASH-022', submodule: 'Wizard', title: 'Add Widget wizard soft cancel', steps: 'Open + Widget; cancel.', expected: 'No permanent add.' },
  { id: 'REG-NAPD-DASH-023', submodule: 'Negative', title: 'Sibling preconfigured soft restore', steps: 'Soft switch TSM/Site Overview; restore NAPD + GDC.', expected: 'Exact Native App Performance Detail + GDC.' },
  { id: 'REG-NAPD-DASH-024', submodule: 'Negative', title: 'RUM/Synthetic PD discrimination', steps: 'Soft switch RUM or Synthetic PD; restore NAPD.', expected: 'Never accept RUM/Synthetic as suite home.' },
  { id: 'REG-NAPD-DASH-024b', submodule: 'Negative', title: 'Detailed Metrics discrimination', steps: 'Soft switch Detailed Metrics Android/iOS; restore NAPD.', expected: 'Never accept Detailed Metrics as suite home.' },
  { id: 'REG-NAPD-DASH-025', submodule: 'Time Lookback', title: 'Custom Date open/cancel only', steps: 'Open Custom Date; Escape/Cancel.', expected: 'Cancel only.' },
  { id: 'REG-NAPD-DASH-026', submodule: 'Responsive', title: '1100px viewport keeps widgets reachable', steps: 'Resize; scroll widgets.', expected: 'Core chrome reachable.' },
  { id: 'REG-NAPD-DASH-027', submodule: 'A11y', title: 'Escape recovery; Help soft', steps: 'Open filters; Escape.', expected: 'Overlays close.' },
  { id: 'REG-NAPD-DASH-028', submodule: 'Chrome', title: 'last-updated soft', steps: 'Observe last-updated.', expected: 'Soft presence.' },
  { id: 'REG-NAPD-DASH-029', submodule: 'Chrome', title: 'Carousel soft presence', steps: 'Observe Carousel; do not leave cycling.', expected: 'Soft presence only.' },
  { id: 'REG-NAPD-DASH-030', submodule: 'Stability', title: 'Refresh keeps four widgets; still NAPD', steps: 'Refresh.', expected: 'NAPD four-group healthy.' },
  { id: 'REG-NAPD-DASH-031', submodule: 'Recovery', title: 'Browser reload soft recovery', steps: 'Reload; re-select NAPD + GDC.', expected: 'site/dashboard home healthy.' },
  { id: 'REG-NAPD-DASH-032', submodule: 'Negative', title: 'Not Monitoring / RUM-SPD / Detailed Metrics / Marketing', steps: 'Assert route and exact NAPD option.', expected: 'site/dashboard + Native App Performance Detail only.' },
  { id: 'REG-NAPD-DASH-033', submodule: 'Chrome', title: 'Top chrome icons soft round-trip', steps: 'Soft hover/click icons.', expected: 'Return to dashboard path + NAPD.' },
  { id: 'REG-NAPD-DASH-034', submodule: 'Time Lookback', title: 'Prescribed lookbacks 1h|6h / 24h / 7d / 30d', steps: 'Apply each; restore original.', expected: 'Each applied soft; widgets settle.' },
  { id: 'REG-NAPD-DASH-035', submodule: 'Site', title: 'Site switch + lock soft; restore GDC', steps: 'Soft Demo eCommerce; soft lock; restore GDC + NAPD.', expected: 'GDC restored.' },
  { id: 'REG-NAPD-DASH-036', submodule: 'Chrome', title: 'Auto Refresh apply sample non-aggressive', steps: 'Apply 5 Minutes; restore Off.', expected: 'Non-aggressive left for suite.' },
  { id: 'REG-NAPD-DASH-037', submodule: 'Manager', title: '+Dashboard Manager eye restore NAPD', steps: 'Soft Manager/eye; restore exact NAPD.', expected: 'Exact Native App Performance Detail.' },
  { id: 'REG-NAPD-DASH-038', submodule: 'Recovery', title: 'Restore initial context; suite home healthy', steps: 'restoreContext; assert NAPD + GDC + four widgets.', expected: 'Healthy suite home on Native App Performance Detail.' },
];

async function main() {
  const { path: written, count } = await writeRegressionManualWorkbook({
    outPath: path.join(process.cwd(), 'docs', 'Native_App_Performance_Detail_Dashboard_Regression.xlsx'),
    screenTitle: 'Native App Performance Detail Dashboard',
    site: SITE,
    dc: DC,
    module: MODULE,
    typeLabel: 'Regression (read-only)',
    helpLine:
      'Package PDF is Monitoring Native App Performance Detail Page (article 10534859160339) — soft-relate only. Suite SoT = live probe + AI Prompt. Exact option: Native App Performance Detail.',
    automation: AUTOMATION,
    executionStatus: EXECUTION_STATUS,
    executionNote: EXECUTION_NOTE,
    notes: [
      'Exact Select2: Native App Performance Detail (not Detailed Metrics -*, not RUM/Synthetic Performance Detail).',
      'Four-widget PD layout: Bar Graph + Details + Performance Graph + Daily Averages.',
      'Core Details cards: PAGE VIEWS, PERFORMANCE TIMING, ERRORS AND CRASHES (extras soft).',
      'Monitoring PDF scatterplots / Choose Metrics / session search are out of primary scope.',
      'Always re-assert GDC Test Site 2 after dashboard or site switch.',
      'No Save Filter / Clear Cache / permanent dashboard Save-Share-Clone-Delete.',
      'chartID_* and Highcharts ids are dynamic — use #multi-step-bar-graph, #perfGraph-*, Daily Averages titles.',
      'npm run test:regression:us2:native-app-performance-detail-dashboard',
    ],
    cases: cases.map((c) => ({ ...c, module: MODULE, type: 'Regression' })),
  });
  console.log('Wrote', written, 'cases=', count);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
