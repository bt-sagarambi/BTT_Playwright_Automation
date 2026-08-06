/**
 * Generates docs/Vital_Pulse_Dashboard_Regression.xlsx
 * Sheets: Summary / Regression TCs / Notes
 *
 * Run: node scripts/generate-vital-pulse-regression-excel.js
 */
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');

const SITE = 'GDC Test Site 2';
const DC = 'US';
const MODULE = 'Dashboards — Preconfigured';
const AUTOMATION =
  'tests/regression_tests/US2/dashboards/preconfigured/vital-pulse/vital.pulse.dashboard.regression.spec.ts';
const EXECUTION_STATUS = process.env.VP_EXECUTION_STATUS || 'Not Executed';
const EXECUTION_NOTE =
  process.env.VP_EXECUTION_NOTE ||
  'Run npm run test:regression:us2:vital-pulse and record live-data annotations from Allure.';

const cases = [
  { id: 'REG-VP-001', submodule: 'Navigation', title: 'Page loads via Dashboards menu/route with correct title', steps: 'Open Dashboards from left nav; observe title and URL.', expected: 'URL site/dashboard; title/page-title Dashboards; not login.' },
  { id: 'REG-VP-002', submodule: 'Identity', title: 'VitalPulse selected; Site Summary + Performance Overview', steps: 'Confirm switcher VitalPulse; assert both core widgets.', expected: 'Exact VitalPulse; Site Summary and Performance Overview present.' },
  { id: 'REG-VP-003', submodule: 'Context', title: 'Site GDC Test Site 2; lookback/auto-refresh captured', steps: 'Capture site and chrome labels.', expected: 'Profile site; non-empty Time Lookback.' },
  { id: 'REG-VP-004', submodule: 'Chrome', title: 'Switcher, lookback, refresh, auto-refresh visible', steps: 'Inspect dashboard chrome controls.', expected: 'Core chrome attached/visible.' },
  { id: 'REG-VP-005', submodule: 'Chrome', title: 'Preconfigured list includes exact VitalPulse', steps: 'Read #switch-dashboard Preconfigured options.', expected: 'VitalPulse present (exact one-word label).' },
  { id: 'REG-VP-006', submodule: 'Time Lookback', title: 'Time Lookback menu has multiple presets', steps: 'Open Time Lookback dropdown; list options.', expected: 'Multiple presets.' },
  { id: 'REG-VP-007', submodule: 'Time Lookback', title: 'Sample Last 24h and Last 7d; restore original', steps: 'Apply sampled lookbacks; restore initial.', expected: 'Widgets healthy or empty soft; VitalPulse remains.' },
  { id: 'REG-VP-008', submodule: 'Chrome', title: 'Dashboard Refresh reloads without crash', steps: 'Click #refresh-dashboard.', expected: 'Core widgets still present after refresh.' },
  { id: 'REG-VP-009', submodule: 'Chrome', title: 'Auto Refresh menu soft options', steps: 'Open Auto Refresh; sample Off/intervals; close.', expected: 'Options present; no sticky aggressive refresh left.' },
  { id: 'REG-VP-010', submodule: 'Site Summary', title: 'CWV cards INP/LCP/CLS + quality-band soft', steps: 'Read Site Summary for CWV labels and good/needs improvement/poor.', expected: 'LCP+CLS hard; INP or FID soft dual-match; band soft.' },
  { id: 'REG-VP-011', submodule: 'Site Summary', title: 'Revenue / Sessions / Orders cards', steps: 'Verify business card labels and locale-tolerant values.', expected: 'Three labels; currency/number soft.' },
  { id: 'REG-VP-012', submodule: 'Site Summary', title: 'Mini-graph / Highcharts shells', steps: 'Assert sized sparkline/chart shells under summary.', expected: 'Sized shell or soft annotate empty series.' },
  { id: 'REG-VP-013', submodule: 'Charts', title: 'Soft hover Site Summary tooltip', steps: 'Hover sparkline; read tooltip.', expected: 'Tooltip length annotated soft.' },
  { id: 'REG-VP-014', submodule: 'Site Summary', title: 'Soft metric show/hide restore', steps: 'Toggle cwv/revenue/etc if present; restore.', expected: 'Soft toggle; no permanent hide.' },
  { id: 'REG-VP-015', submodule: 'Performance Overview', title: 'Widget title scoped (not left-nav)', steps: 'Find Performance Overview in page contents.', expected: 'Visible on dashboard; route still site/dashboard.' },
  { id: 'REG-VP-016', submodule: 'Performance Overview', title: 'Columns Page Name + CWV/timings', steps: 'Read table headers.', expected: 'Page Name, Page Views, Onload, First Byte, LCP, INP, CLS present.' },
  { id: 'REG-VP-017', submodule: 'Performance Overview', title: 'Rows / N/A soft', steps: 'Inspect body rows or empty.', expected: 'Data rows or controlled empty; N/A allowed.' },
  { id: 'REG-VP-018', submodule: 'Filters', title: 'Filters drawer; My/Shared tabs soft', steps: 'Open Filters; soft tabs; Cancel.', expected: 'Representative labels; no Save Filter.' },
  { id: 'REG-VP-019', submodule: 'Filters', title: 'Apply Filters soft when available', steps: 'Open Filters; Apply if visible; restore VitalPulse.', expected: 'VitalPulse remains after apply path.' },
  { id: 'REG-VP-020', submodule: 'Manager', title: 'Dashboard Manager soft open/close', steps: 'Open wrench/manager; close without Save/Delete.', expected: 'No sticky manager mutations.' },
  { id: 'REG-VP-021', submodule: 'Chrome', title: 'Add Widget wizard soft open/cancel', steps: 'Open + Widget; Escape/Cancel.', expected: 'No permanent Add Widget save.' },
  { id: 'REG-VP-022', submodule: 'Recovery', title: 'Sibling preconfigured soft switch; restore VitalPulse + site', steps: 'Select other Preconfigured; restore VitalPulse and GDC Test Site 2.', expected: 'Home restored without sticky sibling.' },
  { id: 'REG-VP-023', submodule: 'Time Lookback', title: 'Custom Date soft open/cancel', steps: 'Open Custom Date if available; Escape.', expected: 'Cancel-only path.' },
  { id: 'REG-VP-024', submodule: 'Responsive', title: 'Narrow ~1100px keeps widgets reachable', steps: 'Set viewport 1100px; scroll if needed.', expected: 'Core widgets and lookback reachable.' },
  { id: 'REG-VP-025', submodule: 'A11y', title: 'Escape recovery; Help chrome soft', steps: 'Open Filters; Escape; soft Help.', expected: 'Overlays closed; Help annotated if present.' },
  { id: 'REG-VP-026', submodule: 'Chrome', title: 'last-updated soft', steps: 'Read #last-updated-dashboard if visible.', expected: 'Non-empty text or annotated absent.' },
  { id: 'REG-VP-027', submodule: 'Chrome', title: 'Carousel soft presence (no cycling)', steps: 'Observe Carousel control; leave off.', expected: 'No carousel left enabling aggressive cycle.' },
  { id: 'REG-VP-028', submodule: 'Non-functional', title: 'Refresh keeps VitalPulse widgets', steps: 'Refresh again; assert core titles.', expected: 'Widgets not permanently deleted.' },
  { id: 'REG-VP-029', submodule: 'Recovery', title: 'Reload recovery to site/dashboard', steps: 'page.reload; re-select VitalPulse/site.', expected: 'Healthy VitalPulse home.' },
  { id: 'REG-VP-030', submodule: 'Identity', title: 'Not Site Overview / DXO / Marketing / RUM PO', steps: 'Assert URL, switcher, page title patterns.', expected: 'site/dashboard + exact VitalPulse only.' },
  { id: 'REG-VP-032', submodule: 'Chrome', title: 'Top nav icons tooltips + click round-trip', steps: 'Hover titled chrome icons; soft click Filters/Share/Manager; Escape/Back.', expected: 'Tooltips/titles; return to site/dashboard + VitalPulse.' },
  { id: 'REG-VP-033', submodule: 'Time Lookback', title: 'Last 6h / 24h / 7d / 30d apply + data refresh', steps: 'Apply four presets; soft signature refresh; restore.', expected: 'Each lookback applies; widgets ready.' },
  { id: 'REG-VP-034', submodule: 'Site', title: 'Change site + lock icon; restore GDC', steps: 'Toggle lock if present; switch Demo/other site; unlock; restore GDC.', expected: 'Data refresh on site change; profile site restored.' },
  { id: 'REG-VP-035', submodule: 'Chrome', title: 'Auto Refresh options applied', steps: 'Select 5 Minutes then Off / interval restore.', expected: 'Options apply; no aggressive cycle left.' },
  { id: 'REG-VP-036', submodule: 'Manager', title: '+Dashboard Manager eye switch; restore VitalPulse', steps: 'Open + Dashboard/wrench; View/eye; restore VitalPulse.', expected: 'Eye path soft; VitalPulse home restored.' },
  { id: 'REG-VP-037', submodule: 'Performance Overview', title: 'Column header sort', steps: 'Click PO column headers; soft first-row order change.', expected: 'Headers clickable; sort soft or UI no-op soft when static.' },
  { id: 'REG-VP-038', submodule: 'Performance Overview', title: 'Vital Scope arrow opens modal (hard; site-retry)', steps: 'Click arrow/chevron in PO table; if modal missing switch site once and retry.', expected: 'Vital Scope modal/detail opens; FAIL if still missing after site retry.' },
  { id: 'REG-VP-031', submodule: 'Recovery', title: 'Restore initial context; final healthy home', steps: 'Restore lookback/dashboard/site; core widgets.', expected: 'Captured context restored; no permanent mutations.' },
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
    ['Screen', 'VitalPulse (preconfigured dashboard)'],
    ['Site', SITE],
    ['Data center', DC],
    ['Menu path', 'Dashboards'],
    ['Route', 'site/dashboard'],
    ['Smoke catalog', 'biz.dashboards'],
    ['Dashboard option', 'VitalPulse (Preconfigured; exact one word)'],
    ['Browser title', 'Dashboards'],
    ['#page-title', 'Dashboards'],
    ['Core widgets', 'Site Summary (CWV + business cards); Performance Overview (table)'],
    ['Automation spec', AUTOMATION],
    ['POM', 'pages/VitalPulseDashboardPage.ts'],
    ['Locators', 'locators/VitalPulseDashboardLocators.ts'],
    ['npm command', 'npm run test:regression:us2:vital-pulse'],
    ['Attached PDF caveat', 'Packaged PDF is VitalScope/RUM Performance Overview — not VitalPulse help; live UI is source of truth'],
    ['Case count', String(cases.length)],
    ['Execution status', EXECUTION_STATUS],
    ['Execution note', EXECUTION_NOTE],
  ].forEach(([field, value]) => summary.addRow({ field, value }));

  const tcs = wb.addWorksheet('Regression TCs');
  tcs.columns = [
    { header: 'ID', key: 'id', width: 14 },
    { header: 'Submodule', key: 'submodule', width: 22 },
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
    ['Not this suite', 'Site Overview four widgets; DXO; Marketing Overview; RUM Performance Overview / full VitalScope attribution.'],
    ['PDF mismatch', 'Request package PDF is Performance Overview with VitalScope — use only for soft CWV band terminology.'],
    ['Widget IDs', 'chartID_*, cardThings-*, table-for-chartID_* suffixes are dynamic — bind via labels/roles.'],
    ['INP vs FID', 'UI may show INP while DOM ids still reference first-input-delay / fid — soft dual-match.'],
    ['Currency', 'Locale-tolerant ($/€/£, K/M suffixes).'],
    ['N/A cells', 'Performance Overview may show N/A for LCP/CLS on some pages — soft accept.'],
    ['Ambiguities', 'See AI Prompt §6; soft empty/metric toggles annotated in Allure.'],
  ].forEach(([topic, detail]) => notes.addRow({ topic, detail }));

  const out = path.join(process.cwd(), 'docs', 'Vital_Pulse_Dashboard_Regression.xlsx');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await wb.xlsx.writeFile(out);
  console.log(`Wrote ${out} (${cases.length} cases)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
