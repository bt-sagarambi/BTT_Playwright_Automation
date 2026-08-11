/**
 * Generate docs/RUM_Performance_Detail_Dashboard_Regression.xlsx
 * Run: npx tsx scripts/generate-rum-performance-detail-dashboard-excel.ts
 */
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { writeRegressionManualWorkbook } = require('./lib/regressionManualExcel');

const out = path.join(process.cwd(), 'docs', 'RUM_Performance_Detail_Dashboard_Regression.xlsx');

const cases: Array<{ id: string; submodule: string; title: string; steps: string; expected: string }> = [
  { id: 'REG-RUM-PD-DASH-001', submodule: 'Navigation', title: 'Page loads via Dashboards', steps: '1. Login\n2. Open left Menu → Dashboards\n3. Confirm route and page title', expected: 'URL site/dashboard; document/page title Dashboards; authenticated' },
  { id: 'REG-RUM-PD-DASH-002', submodule: 'Identity', title: 'Exact RUM Performance Detail + 4 widget groups', steps: '1. Open Preconfigured switcher\n2. Select exact option RUM Performance Detail\n3. Inspect widget titles', expected: 'Bar Graph; Details; Performance Graph; Daily Averages present' },
  { id: 'REG-RUM-PD-DASH-003', submodule: 'Site', title: 'GDC Test Site 2 + chrome capture', steps: '1. Verify quick/global site\n2. Capture lookback label', expected: 'Profile site GDC Test Site 2; lookback non-empty' },
  { id: 'REG-RUM-PD-DASH-004', submodule: 'Chrome', title: 'Switcher / lookback / refresh / auto-refresh', steps: '1. Inspect dashboard chrome controls', expected: 'Switcher, lookback, refresh, auto-refresh visible/attached' },
  { id: 'REG-RUM-PD-DASH-005', submodule: 'Chrome', title: 'Preconfigured list includes RUM PD', steps: '1. Open switcher\n2. List Preconfigured options', expected: 'Exact RUM Performance Detail listed; Synthetic option may also exist' },
  { id: 'REG-RUM-PD-DASH-006', submodule: 'Lookback', title: 'Multi lookback presets', steps: '1. Open lookback menu', expected: 'Multiple presets available' },
  { id: 'REG-RUM-PD-DASH-007', submodule: 'Lookback', title: 'Apply 24h / 7d restore', steps: '1. Apply sample periods\n2. Restore original', expected: 'Widgets ready; RUM Performance Detail still selected' },
  { id: 'REG-RUM-PD-DASH-008', submodule: 'Chrome', title: 'Dashboard Refresh', steps: '1. Click refresh', expected: 'No blank crash; widgets recover' },
  { id: 'REG-RUM-PD-DASH-009', submodule: 'Chrome', title: 'Auto Refresh options (2m–60m)', steps: '1. Open Auto Refresh menu', expected: 'Off + intervals; PDF bounds soft' },
  { id: 'REG-RUM-PD-DASH-010', submodule: 'Bar Graph', title: 'Bar Graph shell + host', steps: '1. Inspect left chart', expected: 'Bar Graph shell; multi-step host soft' },
  { id: 'REG-RUM-PD-DASH-011', submodule: 'Details', title: 'Metric cards ≥5 core labels', steps: '1. Inspect Details metric cards', expected: 'PV/Onload/LCP/INP/CLS soft set present' },
  { id: 'REG-RUM-PD-DASH-012', submodule: 'Linkage', title: 'Card → bar + Daily Averages soft', steps: '1. Click PV, Onload, LCP cards\n2. Soft-observe bar/daily metric change\n3. Restore Onload', expected: 'Soft linkage; restore Onload' },
  { id: 'REG-RUM-PD-DASH-013', submodule: 'Perf Graph', title: 'Page Timings Over Time shell', steps: '1. Inspect mid Performance Graph', expected: 'Title + multi-series labels soft' },
  { id: 'REG-RUM-PD-DASH-014', submodule: 'Perf Graph', title: 'Legend toggle + gear cancel', steps: '1. Toggle legend series\n2. Open gear if present; cancel', expected: 'Healthy; no permanent save' },
  { id: 'REG-RUM-PD-DASH-015', submodule: 'Daily table', title: 'Headers + rows soft', steps: '1. Inspect Daily Averages table', expected: 'Page Name; date/30d headers soft; rows soft' },
  { id: 'REG-RUM-PD-DASH-016', submodule: 'Daily table', title: 'Column sort soft', steps: '1. Click sortable headers', expected: 'Sort soft or annotated' },
  { id: 'REG-RUM-PD-DASH-017', submodule: 'Daily table', title: 'Pagination soft', steps: '1. Change page size\n2. Next/Prev when present\n3. Restore size soft', expected: 'Pagination chrome works' },
  { id: 'REG-RUM-PD-DASH-018', submodule: 'Daily table', title: 'Export open/close soft', steps: '1. Open Export menu if present\n2. Close without download assert', expected: 'Menu soft; no hard download requirement' },
  { id: 'REG-RUM-PD-DASH-019', submodule: 'Filters', title: 'Drawer + My/Shared tabs', steps: '1. Open Filters\n2. Soft-check My/Shared\n3. Cancel', expected: 'Labels + tabs; no Save Filter' },
  { id: 'REG-RUM-PD-DASH-020', submodule: 'Filters', title: 'Apply soft path', steps: '1. Apply Filters when available', expected: 'RUM Performance Detail still selected' },
  { id: 'REG-RUM-PD-DASH-021', submodule: 'Manager', title: 'Manager open/close', steps: '1. Open Dashboard Manager soft\n2. Close without Save/Delete', expected: 'No permanent mutation' },
  { id: 'REG-RUM-PD-DASH-022', submodule: 'Wizard', title: 'Add Widget cancel', steps: '1. Open + Widget\n2. Escape/Cancel', expected: 'No permanent widget save' },
  { id: 'REG-RUM-PD-DASH-023', submodule: 'Negative', title: 'Sibling then restore RUM PD', steps: '1. Soft switch TSM/Site Overview\n2. Restore RUM PD + GDC', expected: 'RUM PD + GDC restored' },
  { id: 'REG-RUM-PD-DASH-024', submodule: 'Negative', title: 'Synthetic Performance Detail discrimination', steps: '1. Switch to Synthetic Performance Detail\n2. Restore exact RUM PD', expected: 'Exact RUM Performance Detail home' },
  { id: 'REG-RUM-PD-DASH-025', submodule: 'Lookback', title: 'Custom Date cancel', steps: '1. Open Custom Date if available\n2. Escape/Cancel', expected: 'Cancel only' },
  { id: 'REG-RUM-PD-DASH-026', submodule: 'Responsive', title: '1100px viewport', steps: '1. Set ~1100px width\n2. Scroll widgets', expected: 'Widgets reachable' },
  { id: 'REG-RUM-PD-DASH-027', submodule: 'A11y', title: 'Escape / Help soft', steps: '1. Open Filters\n2. Escape\n3. Soft Help', expected: 'Overlays close' },
  { id: 'REG-RUM-PD-DASH-028', submodule: 'Chrome', title: 'last-updated soft', steps: '1. Check last-updated host if present', expected: 'Present when available' },
  { id: 'REG-RUM-PD-DASH-029', submodule: 'Chrome', title: 'Carousel soft', steps: '1. Observe Carousel control', expected: 'No carousel left aggressive' },
  { id: 'REG-RUM-PD-DASH-030', submodule: 'Stability', title: 'Refresh keeps widgets', steps: '1. Refresh dashboard', expected: 'Four groups + RUM PD' },
  { id: 'REG-RUM-PD-DASH-031', submodule: 'Recovery', title: 'Browser reload', steps: '1. Reload page\n2. Re-select RUM PD + GDC', expected: 'Healthy home' },
  { id: 'REG-RUM-PD-DASH-032', submodule: 'Negative', title: 'Not Monitoring / Synthetic / TSM / Marketing', steps: '1. Assert identity URL + switcher', expected: 'site/dashboard RUM PD only' },
  { id: 'REG-RUM-PD-DASH-033', submodule: 'Chrome', title: 'Icon tooltips + round-trip', steps: '1. Hover/click soft chrome icons\n2. Return to dashboard', expected: 'Return to suite home' },
  { id: 'REG-RUM-PD-DASH-034', submodule: 'Lookback', title: '1h|6h / 24h / 7d / 30d prescribed', steps: '1. Apply each prescribed lookback', expected: 'Each applied; widgets ready soft' },
  { id: 'REG-RUM-PD-DASH-035', submodule: 'Site', title: 'Site switch + lock soft', steps: '1. Soft switch demo/other\n2. Soft lock if present\n3. Restore GDC', expected: 'GDC restored' },
  { id: 'REG-RUM-PD-DASH-036', submodule: 'Chrome', title: 'Auto Refresh apply sample', steps: '1. Apply 5 Minutes\n2. Off/restore interval', expected: 'Non-aggressive restore' },
  { id: 'REG-RUM-PD-DASH-037', submodule: 'Manager', title: '+Dashboard/eye restore RUM PD', steps: '1. Soft eye/View path\n2. Restore RUM PD', expected: 'Exact RUM Performance Detail' },
  { id: 'REG-RUM-PD-DASH-038', submodule: 'Recovery', title: 'Restore initial context', steps: '1. Restore captured lookback/dashboard/site', expected: 'Healthy suite home' },
];

async function main() {
  const { path: written, count } = await writeRegressionManualWorkbook({
    outPath: out,
    screenTitle: 'RUM Performance Detail Dashboard (Preconfigured)',
    site: 'GDC Test Site 2',
    dc: 'US',
    module: 'Dashboards — Preconfigured',
    typeLabel: 'Regression (read-only)',
    automation:
      'tests/regression_tests/US2/dashboards/preconfigured/rum-performance-detail/rum.performance.detail.dashboard.regression.spec.ts',
    helpLine:
      'Help: https://help.bluetriangle.com/hc/en-us/articles/360033246414-The-RUM-Performance-Detail-Dashboard',
    executionStatus: 'Pass',
    notes: [
      'Exact Select2 “RUM Performance Detail” only (not Monitoring RUM PD npm rum-pd).',
      'Always re-assert GDC after sibling dashboard switch.',
      'No Save Filter / Clear Cache / permanent Save-Share-Clone-Delete.',
    ],
    cases,
  });
  console.log('Wrote', written, 'cases=', count);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
