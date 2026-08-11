/**
 * Generates docs/Native_App_Detailed_Metrics_Dashboard_Regression.xlsx
 * Sheets: Summary / Regression TCs / Notes
 *
 * Run: node scripts/generate-native-app-detailed-metrics-dashboard-excel.js
 */
const path = require('path');
const { writeRegressionManualWorkbook } = require('./lib/regressionManualExcel');

const SITE = 'GDC Test Site 2';
const DC = 'US';
const MODULE = 'Dashboards — Preconfigured';
const AUTOMATION =
  'tests/regression_tests/US2/dashboards/preconfigured/native-app-detailed-metrics-android/native.app.detailed.metrics.android.dashboard.regression.spec.ts';
const EXECUTION_STATUS = process.env.NADM_EXECUTION_STATUS || 'Not Executed';
const EXECUTION_NOTE =
  process.env.NADM_EXECUTION_NOTE ||
  'Run npm run test:regression:us2:native-app-detailed-metrics-android-dashboard and record live-data annotations from Allure.';

const cases = [
  { id: 'REG-NADM-DASH-001', submodule: 'Navigation', title: 'Page loads via Dashboards menu/route with correct title', steps: 'Login; open Dashboards; observe route and title.', expected: 'URL site/dashboard; title Dashboards; not login.' },
  { id: 'REG-NADM-DASH-002', submodule: 'Identity', title: 'Exact Android Detailed Metrics; multi-widget inventory', steps: 'Select Native App Detailed Metrics - Android; wait for widgets.', expected: 'Exact Android option; Performance / Party / Failures / Friction / Crash / HTTP x2 / ANR / CPU shells present.' },
  { id: 'REG-NADM-DASH-003', submodule: 'Context', title: 'GDC Test Site 2; lookback/auto-refresh captured', steps: 'Verify quick site; capture lookback and auto-refresh.', expected: 'Profile site; lookback non-empty.' },
  { id: 'REG-NADM-DASH-004', submodule: 'Chrome', title: 'Switcher, lookback, refresh, auto-refresh visible', steps: 'Inspect dashboard chrome.', expected: 'Core chrome attached/visible.' },
  { id: 'REG-NADM-DASH-005', submodule: 'Chrome', title: 'Preconfigured list has Android + iOS Detailed Metrics', steps: 'Read #switch-dashboard Preconfigured options.', expected: 'Both OS Detailed Metrics and Native App Performance Detail sibling listed.' },
  { id: 'REG-NADM-DASH-006', submodule: 'Time Lookback', title: 'Time Lookback multi presets', steps: 'Open Time Lookback menu.', expected: 'More than three presets.' },
  { id: 'REG-NADM-DASH-007', submodule: 'Time Lookback', title: 'Apply 24h / 7d and restore lookback', steps: 'Apply Last 24h and 7d; restore original.', expected: 'Widgets ready soft; Android home retained.' },
  { id: 'REG-NADM-DASH-008', submodule: 'Chrome', title: 'Dashboard Refresh reloads without blank crash', steps: 'Click #refresh-dashboard.', expected: 'Multi-widget inventory healthy.' },
  { id: 'REG-NADM-DASH-009', submodule: 'Chrome', title: 'Auto Refresh menu soft (Off, 2m…60m)', steps: 'Open Auto Refresh menu.', expected: 'Off + intervals; bounds soft.' },
  { id: 'REG-NADM-DASH-010', submodule: 'Native App Performance', title: 'Native App Performance shell + series soft', steps: 'Inspect performance widget.', expected: 'Title present; CPU/Memory/Errors/Timing series soft.' },
  { id: 'REG-NADM-DASH-011', submodule: 'Native App Performance', title: 'Performance legend toggle soft', steps: 'Toggle a legend series twice.', expected: 'Graph remains healthy.' },
  { id: 'REG-NADM-DASH-012', submodule: 'Party Activity', title: '1st vs 3rd Party Activity - Native shell', steps: 'Inspect party widget.', expected: 'Domains/Network Requests chrome soft; load-time soft.' },
  { id: 'REG-NADM-DASH-013', submodule: 'Party Activity', title: 'Party Domains ↔ Network Requests toggle soft', steps: 'Toggle Domains and Network Requests.', expected: 'Interactive soft without permanent sticky issues.' },
  { id: 'REG-NADM-DASH-014', submodule: 'Network Failures', title: 'Network Request Failures Over Time shell + legend soft', steps: 'Inspect failures chart; soft legend.', expected: 'Title; HTTP 400/500 or Client Side Failures soft.' },
  { id: 'REG-NADM-DASH-015', submodule: 'Friction Map', title: 'Android Friction Map title; empty soft', steps: 'Inspect friction widget on Android home.', expected: 'Android friction title; No data to display OK.' },
  { id: 'REG-NADM-DASH-016', submodule: 'Crash Summary', title: 'Crash Summary shell; empty soft', steps: 'Inspect Crash Summary.', expected: 'Shell present; empty OK.' },
  { id: 'REG-NADM-DASH-017', submodule: 'HTTP Responses', title: 'Native App HTTP Responses tiles soft', steps: 'Inspect HTTP Responses widget.', expected: 'Requests / 200s–500s soft when data.' },
  { id: 'REG-NADM-DASH-018', submodule: 'HTTP Responses', title: 'HTTP Responses By Error Count soft', steps: 'Inspect companion error-count widget.', expected: 'Distinct shell from non-error HTTP widget.' },
  { id: 'REG-NADM-DASH-019', submodule: 'ANR', title: 'ANR & OOM warnings shell; empty soft', steps: 'Inspect ANR widget.', expected: 'ANR/OOM title; empty OK.' },
  { id: 'REG-NADM-DASH-020', submodule: 'CPU Memory', title: 'CPU and Memory Usage shell + table headers soft', steps: 'Inspect CPU/Memory widget.', expected: 'Graph and/or table; Page Name / Avg CPU / Memory / Page Hits soft.' },
  { id: 'REG-NADM-DASH-021', submodule: 'CPU Memory', title: 'CPU graph/table toggle soft', steps: 'Use graph/table buttons if present.', expected: 'Toggle soft.' },
  { id: 'REG-NADM-DASH-022', submodule: 'Filters', title: 'Filters drawer + My/Shared tabs soft', steps: 'Open Filters; tabs; Cancel.', expected: 'Labels; no Save Filter; soft native dimensions when shown.' },
  { id: 'REG-NADM-DASH-023', submodule: 'Filters', title: 'Filters Apply soft path', steps: 'Apply when available; restore Android home.', expected: 'Android Detailed Metrics retained.' },
  { id: 'REG-NADM-DASH-024', submodule: 'Manager', title: 'Dashboard Manager soft open/close', steps: 'Open Manager; close without Save/Delete.', expected: 'No permanent mutation.' },
  { id: 'REG-NADM-DASH-025', submodule: 'Wizard', title: 'Add Widget wizard soft cancel', steps: 'Open + Widget; cancel.', expected: 'No permanent add.' },
  { id: 'REG-NADM-DASH-026', submodule: 'iOS Dual', title: 'iOS dual coverage then restore Android', steps: 'Select iOS option; soft friction title; restore Android.', expected: 'Widgets on iOS; Android home + GDC restored.' },
  { id: 'REG-NADM-DASH-027', submodule: 'Negative', title: 'Sibling non-native soft restore', steps: 'Soft switch TSM/Site Overview; restore Android NADM.', expected: 'Exact Android Detailed Metrics + GDC.' },
  { id: 'REG-NADM-DASH-028', submodule: 'Negative', title: 'Native App Performance Detail discrimination', steps: 'Soft switch Performance Detail sibling; restore Detailed Metrics Android.', expected: 'Never accept Performance Detail as suite home.' },
  { id: 'REG-NADM-DASH-029', submodule: 'Time Lookback', title: 'Custom Date open/cancel only', steps: 'Open Custom Date; Escape/Cancel.', expected: 'Cancel only.' },
  { id: 'REG-NADM-DASH-030', submodule: 'Responsive', title: '1100px viewport keeps widgets reachable', steps: 'Resize; scroll widgets.', expected: 'Core chrome reachable.' },
  { id: 'REG-NADM-DASH-031', submodule: 'A11y', title: 'Escape recovery; Help soft', steps: 'Open filters; Escape.', expected: 'Overlays close.' },
  { id: 'REG-NADM-DASH-032', submodule: 'Chrome', title: 'last-updated and Carousel soft', steps: 'Observe chrome.', expected: 'Soft presence; no Carousel cycling left on.' },
  { id: 'REG-NADM-DASH-033', submodule: 'Stability', title: 'Refresh keeps multi-widget inventory', steps: 'Refresh.', expected: 'Android NADM multi-widget still healthy.' },
  { id: 'REG-NADM-DASH-034', submodule: 'Recovery', title: 'Browser reload soft recovery', steps: 'Reload; re-select Android + GDC.', expected: 'site/dashboard home healthy.' },
  { id: 'REG-NADM-DASH-035', submodule: 'Negative', title: 'Not Monitoring / NAPD home / RUM-SPD / Marketing', steps: 'Assert route and exact Android option.', expected: 'site/dashboard + Android Detailed Metrics only.' },
  { id: 'REG-NADM-DASH-036', submodule: 'Chrome', title: 'Top chrome icons soft round-trip', steps: 'Soft hover/click icons.', expected: 'Return to dashboard path.' },
  { id: 'REG-NADM-DASH-037', submodule: 'Time Lookback', title: 'Prescribed lookbacks 1h|6h / 24h / 7d / 30d', steps: 'Apply each; restore original.', expected: 'Each applied soft; widgets settle.' },
  { id: 'REG-NADM-DASH-038', submodule: 'Site', title: 'Site switch + lock soft; restore GDC', steps: 'Soft Demo eCommerce; soft lock; restore GDC + Android NADM.', expected: 'GDC restored.' },
  { id: 'REG-NADM-DASH-039', submodule: 'Chrome', title: 'Auto Refresh apply sample non-aggressive', steps: 'Apply 5 Minutes; restore Off.', expected: 'Non-aggressive left for suite.' },
  { id: 'REG-NADM-DASH-040', submodule: 'Manager', title: '+Dashboard Manager eye restore Android NADM', steps: 'Soft Manager/eye; restore exact Android option.', expected: 'Exact Native App Detailed Metrics - Android.' },
  { id: 'REG-NADM-DASH-041', submodule: 'Recovery', title: 'Restore initial context; suite home healthy', steps: 'restoreContext; assert Android + GDC + widgets.', expected: 'Healthy suite home on Android Detailed Metrics.' },
];

async function main() {
  const { path: written, count } = await writeRegressionManualWorkbook({
    outPath: path.join(process.cwd(), 'docs', 'Native_App_Detailed_Metrics_Dashboard_Regression.xlsx'),
    screenTitle: 'Native App Detailed Metrics Dashboard',
    site: SITE,
    dc: DC,
    module: MODULE,
    typeLabel: 'Regression (read-only)',
    helpLine:
      'No board-specific Help PDF; SoT = live probe + AI Prompt. Exact options: Native App Detailed Metrics - Android (home) / - iOS (soft dual).',
    automation: AUTOMATION,
    executionStatus: EXECUTION_STATUS,
    executionNote: EXECUTION_NOTE,
    notes: [
      'Exact Select2: Native App Detailed Metrics - Android (home) and - iOS (soft dual).',
      'Never accept Native App Performance Detail, RUM/Synthetic Performance Detail as suite home.',
      'Empty Friction Map / Crash Summary / ANR-OOM with “No data to display” is expected soft success on GDC.',
      'Always re-assert GDC Test Site 2 after dashboard or site switch.',
      'No Save Filter / Clear Cache / permanent dashboard Save-Share-Clone-Delete.',
      'chartID_* and widget id numeric suffixes are dynamic — use prefixes and titles.',
      'npm run test:regression:us2:native-app-detailed-metrics-android-dashboard',
    ],
    cases: cases.map((c) => ({ ...c, module: MODULE, type: 'Regression' })),
  });
  console.log('Wrote', written, 'cases=', count);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
