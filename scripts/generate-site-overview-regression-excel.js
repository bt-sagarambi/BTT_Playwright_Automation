/**
 * Generates docs/Site_Overview_Dashboard_Regression.xlsx
 * Sheets: Summary / Regression TCs / Notes
 *
 * Run: node scripts/generate-site-overview-regression-excel.js
 */
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');

const SITE = 'GDC Test Site 2';
const DC = 'US';
const MODULE = 'Dashboards — Preconfigured';
const AUTOMATION =
  'tests/regression_tests/US2/dashboards/preconfigured/site-overview/site.overview.dashboard.regression.spec.ts';
const EXECUTION_STATUS = process.env.SO_EXECUTION_STATUS || 'Not Executed';
const EXECUTION_NOTE =
  process.env.SO_EXECUTION_NOTE ||
  'Run npm run test:regression:us2:site-overview and record live-data annotations from Allure.';

const cases = [
  { id: 'REG-SO-001', submodule: 'Navigation', title: 'Page loads via Dashboards menu/route with correct title', steps: 'Open Dashboards from left nav; observe title and URL.', expected: 'URL site/dashboard; title/page-title Dashboards; not login.' },
  { id: 'REG-SO-002', submodule: 'Identity', title: 'Site Overview selected; four PDF widgets present', steps: 'Confirm switcher Site Overview; titles Performance, Device Metrics, Revenue Over Time, Geography.', expected: 'All four widget titles visible.' },
  { id: 'REG-SO-003', submodule: 'Context', title: 'Site GDC Test Site 2; lookback/auto-refresh captured', steps: 'Capture site and chrome labels.', expected: 'Profile site; non-empty Time Lookback.' },
  { id: 'REG-SO-004', submodule: 'Chrome', title: 'Switcher, lookback, refresh, auto-refresh visible', steps: 'Inspect dashboard chrome controls.', expected: 'Core chrome attached/visible.' },
  { id: 'REG-SO-005', submodule: 'Chrome', title: 'Preconfigured list includes Site Overview', steps: 'Read #switch-dashboard options.', expected: 'Site Overview in Preconfigured set.' },
  { id: 'REG-SO-006', submodule: 'Time Lookback', title: 'Time Lookback menu has multiple presets', steps: 'Open Time Lookback dropdown; list options.', expected: 'Multiple presets; no hard-coded permanent selection.' },
  { id: 'REG-SO-007', submodule: 'Time Lookback', title: 'Sample Last 24h and Last 7d; restore original', steps: 'Apply sampled lookbacks; restore initial.', expected: 'Widgets healthy or empty soft; Site Overview remains.' },
  { id: 'REG-SO-008', submodule: 'Chrome', title: 'Dashboard Refresh reloads without crash', steps: 'Click #refresh-dashboard.', expected: 'Widgets still present after refresh.' },
  { id: 'REG-SO-009', submodule: 'Chrome', title: 'Auto Refresh menu soft options', steps: 'Open Auto Refresh; sample Off/intervals; close.', expected: 'Options present; no sticky aggressive refresh left.' },
  { id: 'REG-SO-010', submodule: 'Performance', title: 'Performance widget chart shell', steps: 'Scope Highcharts host under Performance title.', expected: 'Sized chart shell or series soft.' },
  { id: 'REG-SO-011', submodule: 'Device Metrics', title: 'Headers include Device and metric columns', steps: 'Read Device Metrics table/headers.', expected: 'Device + Revenue/Orders/Page Views/Onload/etc subset.' },
  { id: 'REG-SO-012', submodule: 'Device Metrics', title: 'Device-type breakdown soft (Desktop/Mobile/Tablet)', steps: 'Inspect rows/icons; currency formats soft.', expected: 'At least multi-device signal or annotated empty; locale-tolerant currency.' },
  { id: 'REG-SO-013', submodule: 'Revenue Over Time', title: 'Revenue Over Time widget chart shell', steps: 'Scope chart under Revenue Over Time.', expected: 'Sized chart; soft series labels revenue|order|session|page view.' },
  { id: 'REG-SO-014', submodule: 'Geography', title: 'Geography widget / map shell', steps: 'Verify Geography title and map/chart shell.', expected: 'Shell present or controlled empty.' },
  { id: 'REG-SO-015', submodule: 'Geography', title: 'Country drill (China soft) + linked Performance/ROT + Back To World Map', steps: 'Click country/region on Geography; assert linked widgets; Back To World Map.', expected: 'Drill soft; Performance & Revenue Over Time remain healthy; world map restorable when UI exposes Back.' },
  { id: 'REG-SO-016', submodule: 'Charts', title: 'Soft hover tooltip on Performance', steps: 'Hover chart area; read tooltip.', expected: 'Tooltip soft length annotated.' },
  { id: 'REG-SO-017', submodule: 'Filters', title: 'Filters drawer opens; My/Shared tabs soft', steps: 'Open Filters; inspect labels; Cancel.', expected: 'Representative filter labels; no Save Filter.' },
  { id: 'REG-SO-018', submodule: 'Filters', title: 'Apply Filters soft when available', steps: 'Open Filters; Apply if visible; restore overview.', expected: 'Site Overview remains after apply path.' },
  { id: 'REG-SO-019', submodule: 'Manager', title: 'Dashboard Manager soft open/close', steps: 'Open wrench/manager; close without Save/Delete.', expected: 'No sticky manager mutations.' },
  { id: 'REG-SO-020', submodule: 'Chrome', title: 'Add Widget wizard soft open/cancel', steps: 'Open + Widget; Escape/Cancel.', expected: 'No permanent Add Widget save.' },
  { id: 'REG-SO-021', submodule: 'Recovery', title: 'Sibling preconfigured soft switch; restore Site Overview + site', steps: 'Select other Preconfigured; restore Site Overview and GDC Test Site 2.', expected: 'Home restored without sticky sibling.' },
  { id: 'REG-SO-022', submodule: 'Time Lookback', title: 'Custom Date soft open/cancel', steps: 'Open Custom Date if available; Escape.', expected: 'Cancel-only path.' },
  { id: 'REG-SO-023', submodule: 'Responsive', title: 'Narrow ~1100px keeps widgets reachable', steps: 'Set viewport 1100px; scroll if needed.', expected: 'Four widgets and lookback reachable.' },
  { id: 'REG-SO-024', submodule: 'A11y', title: 'Escape recovery; Help chrome soft', steps: 'Open Filters; Escape; soft Help.', expected: 'Overlays closed; Help annotated if present.' },
  { id: 'REG-SO-025', submodule: 'Chrome', title: 'last-updated soft', steps: 'Read #last-updated-dashboard if visible.', expected: 'Non-empty text or annotated absent.' },
  { id: 'REG-SO-026', submodule: 'Chrome', title: 'Carousel soft presence (no cycling)', steps: 'Observe Carousel control; leave off.', expected: 'No carousel left enabling aggressive cycle.' },
  { id: 'REG-SO-027', submodule: 'Non-functional', title: 'Refresh keeps widgets', steps: 'Refresh again; assert four titles.', expected: 'Widgets not permanently deleted.' },
  { id: 'REG-SO-028', submodule: 'Recovery', title: 'Reload recovery to site/dashboard', steps: 'page.reload; re-select Site Overview/site.', expected: 'Healthy Site Overview home.' },
  { id: 'REG-SO-029', submodule: 'Identity', title: 'Not DXO or Marketing Overview', steps: 'Assert URL and title patterns.', expected: 'site/dashboard + Site Overview only.' },
  { id: 'REG-SO-031', submodule: 'Chrome', title: 'Top nav icons tooltips + click round-trip', steps: 'Hover icons above Auto Refresh; soft click Filters/Share/Manager; Escape or Back.', expected: 'Titles/tooltips present; return to site/dashboard.' },
  { id: 'REG-SO-032', submodule: 'Time Lookback', title: 'Last 6h / 24h / 7d / 30d apply + data refresh', steps: 'Apply four presets; soft signature refresh; restore.', expected: 'Each lookback applies; widgets ready.' },
  { id: 'REG-SO-033', submodule: 'Site', title: 'Change site + lock icon; restore GDC', steps: 'Toggle lock if present; switch Demo/other site; unlock; restore GDC Test Site 2.', expected: 'Data refresh on site change; profile site restored; lock soft-annotate if absent.' },
  { id: 'REG-SO-034', submodule: 'Chrome', title: 'Auto Refresh options applied (then Off/interval restore)', steps: 'Select 5 Minutes then Off / interval restore.', expected: 'Options apply without leaving aggressive cycle.' },
  { id: 'REG-SO-035', submodule: 'Manager', title: '+Dashboard Manager eye switch; restore Site Overview', steps: 'Open + Dashboard or wrench; click View/eye; restore Site Overview.', expected: 'Eye path soft; Site Overview home restored.' },
  { id: 'REG-SO-030', submodule: 'Recovery', title: 'Restore initial context; final healthy home', steps: 'Restore lookback/dashboard/site; four widgets.', expected: 'Captured context restored; no permanent mutations.' },
];

async function main() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'BlueTriangle_Automation';
  wb.created = new Date();

  const summary = wb.addWorksheet('Summary');
  summary.columns = [
    { header: 'Field', key: 'field', width: 28 },
    { header: 'Value', key: 'value', width: 100 },
  ];
  [
    ['Module', MODULE],
    ['Screen', 'Site Overview (preconfigured dashboard)'],
    ['Site', SITE],
    ['Data center', DC],
    ['Menu path', 'Dashboards'],
    ['Route', 'site/dashboard'],
    ['Smoke catalog', 'biz.dashboards'],
    ['Dashboard option', 'Site Overview (Preconfigured)'],
    ['Browser title', 'Dashboards'],
    ['#page-title', 'Dashboards'],
    ['Automation spec', AUTOMATION],
    ['POM', 'pages/SiteOverviewDashboardPage.ts'],
    ['Locators', 'locators/SiteOverviewDashboardLocators.ts'],
    ['npm command', 'npm run test:regression:us2:site-overview'],
    ['PDF', 'The Site Overview Dashboard – Blue Triangle Help Center'],
    ['Case count', String(cases.length)],
    ['Execution status', EXECUTION_STATUS],
    ['Execution note', EXECUTION_NOTE],
  ].forEach(([field, value]) => summary.addRow({ field, value }));

  const tcs = wb.addWorksheet('Regression TCs');
  tcs.columns = [
    { header: 'ID', key: 'id', width: 14 },
    { header: 'Submodule', key: 'submodule', width: 18 },
    { header: 'Title', key: 'title', width: 55 },
    { header: 'Steps', key: 'steps', width: 70 },
    { header: 'Expected', key: 'expected', width: 55 },
    { header: 'Automation', key: 'auto', width: 14 },
    { header: 'Priority', key: 'priority', width: 10 },
  ];
  for (const c of cases) {
    tcs.addRow({
      id: c.id,
      submodule: c.submodule,
      title: c.title,
      steps: c.steps,
      expected: c.expected,
      auto: 'Yes',
      priority: 'High',
    });
  }

  const notes = wb.addWorksheet('Notes');
  notes.columns = [
    { header: 'Topic', key: 'topic', width: 28 },
    { header: 'Detail', key: 'detail', width: 100 },
  ];
  [
    ['Out of scope mutations', 'No Save Filter, Clear Cache, permanent widget/dashboard save, share/delete, aggressive carousel/auto-refresh changes.'],
    ['Not this suite', 'Digital Experience Overview (overview-dashboard/overview) and Marketing Overview (overview-dashboard/marketing).'],
    ['Widget IDs', 'chartID_* and grid instance suffixes are dynamic — bind via widget titles.'],
    ['Currency', 'Locale-tolerant (€/$/£); Brand Value / Brand Orders are live soft columns.'],
    ['Tablet row', 'PDF lists Tablet; live data may omit Tablet — soft annotate.'],
    ['Ambiguities', 'See AI Prompt §6; soft data/empty maps/drill controls annotated in Allure.'],
  ].forEach(([topic, detail]) => notes.addRow({ topic, detail }));

  const out = path.join(__dirname, '..', 'docs', 'Site_Overview_Dashboard_Regression.xlsx');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await wb.xlsx.writeFile(out);
  console.log('Wrote', out, 'cases=', cases.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
