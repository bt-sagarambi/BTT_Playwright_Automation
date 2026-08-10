/**
 * Generate docs/RUM_Performance_Detail_Dashboard_Regression.xlsx
 * Run: npx tsx scripts/generate-rum-performance-detail-dashboard-excel.ts
 *
 * Distinct from Monitoring RUM Performance Detail Excel (generate-rum-pd-regression-excel.js).
 */
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

const out = path.join(process.cwd(), 'docs', 'RUM_Performance_Detail_Dashboard_Regression.xlsx');

const cases: Array<{ id: string; area: string; title: string; steps: string; expected: string }> = [
  { id: 'REG-RUM-PD-DASH-001', area: 'Navigation', title: 'Page loads via Dashboards', steps: 'Menu → Dashboards', expected: 'site/dashboard; title Dashboards' },
  { id: 'REG-RUM-PD-DASH-002', area: 'Identity', title: 'Exact RUM Performance Detail + 4 widget groups', steps: 'Select exact Preconfigured option', expected: 'Bar Graph; Details; Performance Graph; Daily Averages' },
  { id: 'REG-RUM-PD-DASH-003', area: 'Site', title: 'GDC Test Site 2 + chrome capture', steps: 'Verify site and lookback', expected: 'Profile site; lookback non-empty' },
  { id: 'REG-RUM-PD-DASH-004', area: 'Chrome', title: 'Switcher / lookback / refresh / auto-refresh', steps: 'Inspect chrome', expected: 'Controls visible' },
  { id: 'REG-RUM-PD-DASH-005', area: 'Chrome', title: 'Preconfigured list includes RUM PD', steps: 'Open switcher', expected: 'Exact RUM Performance Detail; Synthetic also listed' },
  { id: 'REG-RUM-PD-DASH-006', area: 'Lookback', title: 'Multi lookback presets', steps: 'Open menu', expected: '>3 options' },
  { id: 'REG-RUM-PD-DASH-007', area: 'Lookback', title: 'Apply 24h / 7d restore', steps: 'Sample periods', expected: 'Widgets ready; RUM PD selected' },
  { id: 'REG-RUM-PD-DASH-008', area: 'Chrome', title: 'Dashboard Refresh', steps: 'Click refresh', expected: 'No blank crash' },
  { id: 'REG-RUM-PD-DASH-009', area: 'Chrome', title: 'Auto Refresh options (2m–60m)', steps: 'Open menu', expected: 'Off + intervals; PDF bounds soft' },
  { id: 'REG-RUM-PD-DASH-010', area: 'Bar Graph', title: 'Bar Graph shell + host', steps: 'Inspect left chart', expected: 'Bar Graph; multi-step host soft' },
  { id: 'REG-RUM-PD-DASH-011', area: 'Details', title: 'Metric cards ≥5 core labels', steps: 'Inspect Details cards', expected: 'PV/Onload/LCP/INP/CLS soft set' },
  { id: 'REG-RUM-PD-DASH-012', area: 'Linkage', title: 'Card → bar + Daily Averages soft', steps: 'Click PV, Onload, LCP', expected: 'Soft signature change; restore Onload' },
  { id: 'REG-RUM-PD-DASH-013', area: 'Perf Graph', title: 'Page Timings Over Time shell', steps: 'Inspect mid chart', expected: 'Title + multi-series labels soft' },
  { id: 'REG-RUM-PD-DASH-014', area: 'Perf Graph', title: 'Legend toggle + gear cancel', steps: 'Toggle series; open gear', expected: 'Healthy; no permanent save' },
  { id: 'REG-RUM-PD-DASH-015', area: 'Daily table', title: 'Headers + rows soft', steps: 'Inspect Daily Averages', expected: 'Page Name; date/30d soft' },
  { id: 'REG-RUM-PD-DASH-016', area: 'Daily table', title: 'Column sort soft', steps: 'Click headers', expected: 'Sort soft' },
  { id: 'REG-RUM-PD-DASH-017', area: 'Daily table', title: 'Pagination soft', steps: 'Page size / Next Prev', expected: 'Chrome works; restore size soft' },
  { id: 'REG-RUM-PD-DASH-018', area: 'Daily table', title: 'Export open/close soft', steps: 'Export menu', expected: 'Menu soft; no download assert' },
  { id: 'REG-RUM-PD-DASH-019', area: 'Filters', title: 'Drawer + My/Shared tabs', steps: 'Open Filters', expected: 'Labels + tabs; Cancel' },
  { id: 'REG-RUM-PD-DASH-020', area: 'Filters', title: 'Apply soft path', steps: 'Apply when available', expected: 'RUM PD still selected' },
  { id: 'REG-RUM-PD-DASH-021', area: 'Manager', title: 'Manager open/close', steps: 'Wrench soft', expected: 'No Save/Delete' },
  { id: 'REG-RUM-PD-DASH-022', area: 'Wizard', title: 'Add Widget cancel', steps: 'Open + Widget', expected: 'No permanent save' },
  { id: 'REG-RUM-PD-DASH-023', area: 'Negative', title: 'Sibling then restore RUM PD', steps: 'Soft TSM / Site Overview', expected: 'RUM PD + GDC restored' },
  { id: 'REG-RUM-PD-DASH-024', area: 'Negative', title: 'Synthetic Performance Detail discrimination', steps: 'Switch Synthetic then restore', expected: 'Exact RUM PD home' },
  { id: 'REG-RUM-PD-DASH-025', area: 'Lookback', title: 'Custom Date cancel', steps: 'Open custom', expected: 'Cancel only' },
  { id: 'REG-RUM-PD-DASH-026', area: 'Responsive', title: '1100px viewport', steps: 'Resize', expected: 'Widgets reachable' },
  { id: 'REG-RUM-PD-DASH-027', area: 'A11y', title: 'Escape / Help soft', steps: 'Open filters Escape', expected: 'Overlays close' },
  { id: 'REG-RUM-PD-DASH-028', area: 'Chrome', title: 'last-updated soft', steps: 'Check host', expected: 'Present when available' },
  { id: 'REG-RUM-PD-DASH-029', area: 'Chrome', title: 'Carousel soft', steps: 'Observe', expected: 'No cycling left on' },
  { id: 'REG-RUM-PD-DASH-030', area: 'Stability', title: 'Refresh keeps widgets', steps: 'Refresh', expected: 'Four groups + RUM PD' },
  { id: 'REG-RUM-PD-DASH-031', area: 'Recovery', title: 'Browser reload', steps: 'Reload', expected: 'Re-select RUM PD + GDC' },
  { id: 'REG-RUM-PD-DASH-032', area: 'Negative', title: 'Not Monitoring / Synthetic / TSM / Marketing', steps: 'Assert identity', expected: 'site/dashboard RUM PD only' },
  { id: 'REG-RUM-PD-DASH-033', area: 'Chrome', title: 'Icon tooltips + round-trip', steps: 'Hover/click soft', expected: 'Return dashboard' },
  { id: 'REG-RUM-PD-DASH-034', area: 'Lookback', title: '1h|6h / 24h / 7d / 30d prescribed', steps: 'Apply each', expected: 'Each applied' },
  { id: 'REG-RUM-PD-DASH-035', area: 'Site', title: 'Site switch + lock soft', steps: 'Demo then restore', expected: 'GDC restored' },
  { id: 'REG-RUM-PD-DASH-036', area: 'Chrome', title: 'Auto Refresh apply sample', steps: '5m Off restore', expected: 'Non-aggressive' },
  { id: 'REG-RUM-PD-DASH-037', area: 'Manager', title: '+Dashboard/eye restore RUM PD', steps: 'Eye soft', expected: 'Exact RUM Performance Detail' },
  { id: 'REG-RUM-PD-DASH-038', area: 'Recovery', title: 'Restore initial context', steps: 'restoreCtx', expected: 'Healthy suite home' },
];

async function main() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'BTT Playwright Automation';
  const summary = wb.addWorksheet('Summary');
  summary.addRow(['RUM Performance Detail Dashboard — Manual Regression Workbook']);
  summary.addRow(['Site', 'GDC Test Site 2']);
  summary.addRow(['Route', 'site/dashboard']);
  summary.addRow(['Dashboard option', 'RUM Performance Detail (Preconfigured)']);
  summary.addRow([
    'Help article',
    'https://help.bluetriangle.com/hc/en-us/articles/360033246414-The-RUM-Performance-Detail-Dashboard',
  ]);
  summary.addRow([
    'Automation spec',
    'tests/.../rum-performance-detail/rum.performance.detail.dashboard.regression.spec.ts',
  ]);
  summary.addRow(['npm', 'test:regression:us2:rum-performance-detail-dashboard']);
  summary.addRow(['NOT npm', 'test:regression:us2:rum-pd (Monitoring Performance Detail)']);
  summary.addRow(['Read-only', 'No Save Filter / Clear Cache / permanent Save-Share-Clone-Delete']);
  summary.addRow(['Total cases', cases.length]);

  const tcs = wb.addWorksheet('Regression TCs');
  tcs.addRow(['ID', 'Area', 'Title', 'Steps', 'Expected']);
  tcs.getRow(1).font = { bold: true };
  for (const c of cases) tcs.addRow([c.id, c.area, c.title, c.steps, c.expected]);
  tcs.columns = [{ width: 22 }, { width: 16 }, { width: 52 }, { width: 40 }, { width: 48 }];

  const notes = wb.addWorksheet('Notes');
  notes.addRow(['Exact Select2 match required — partial “Performance Detail” hits Synthetic/Native.']);
  notes.addRow(['Always re-assert GDC after dashboard switch (graph subtitle site lag).']);
  notes.addRow(['PDF TOC Synthetic typo is ignored; body is RUM Performance Detail.']);
  notes.addRow(['TEST OVERRIDE is soft extra on some GDC states.']);
  notes.addRow(['Do not assert Monitoring scatter / session lookup / waterfall as required.']);
  notes.addRow(['Card click updates bar graph + Daily Averages metric (PDF).']);
  notes.addRow(['Auto Refresh 2 Minutes … 60 Minutes per PDF + live probe.']);

  fs.mkdirSync(path.dirname(out), { recursive: true });
  await wb.xlsx.writeFile(out);
  console.log('Wrote', out, 'cases=', cases.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
