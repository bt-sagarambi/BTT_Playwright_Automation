/**
 * Generate docs/Synthetic_Performance_Detail_Dashboard_Regression.xlsx
 * Run: npx tsx scripts/generate-synthetic-performance-detail-dashboard-excel.ts
 */
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

const out = path.join(process.cwd(), 'docs', 'Synthetic_Performance_Detail_Dashboard_Regression.xlsx');

const cases: Array<{ id: string; area: string; title: string; steps: string; expected: string }> = [
  { id: 'REG-SPD-DASH-001', area: 'Navigation', title: 'Page loads via Dashboards', steps: 'Menu → Dashboards', expected: 'site/dashboard; title Dashboards' },
  { id: 'REG-SPD-DASH-002', area: 'Identity', title: 'Exact Synthetic Performance Detail + 4 widgets', steps: 'Select exact Preconfigured option', expected: 'Bar Graph; Details; Perf Graph; Daily Averages' },
  { id: 'REG-SPD-DASH-003', area: 'Site', title: 'GDC Test Site 2 + chrome capture', steps: 'Verify site and lookback', expected: 'Profile site; lookback non-empty' },
  { id: 'REG-SPD-DASH-004', area: 'Chrome', title: 'Switcher / lookback / refresh / auto-refresh', steps: 'Inspect chrome', expected: 'Controls visible' },
  { id: 'REG-SPD-DASH-005', area: 'Chrome', title: 'Preconfigured list includes SPD + RUM', steps: 'Open switcher', expected: 'Exact Synthetic Performance Detail present' },
  { id: 'REG-SPD-DASH-006', area: 'Lookback', title: 'Multi lookback presets', steps: 'Open menu', expected: '>3 options' },
  { id: 'REG-SPD-DASH-007', area: 'Lookback', title: 'Apply 24h / 7d restore', steps: 'Sample periods', expected: 'Widgets ready; SPD selected' },
  { id: 'REG-SPD-DASH-008', area: 'Chrome', title: 'Dashboard Refresh', steps: 'Click refresh', expected: 'No blank crash' },
  { id: 'REG-SPD-DASH-009', area: 'Chrome', title: 'Auto Refresh 2m–60m soft', steps: 'Open menu', expected: 'Off + intervals; PDF bounds soft' },
  { id: 'REG-SPD-DASH-010', area: 'Bar Graph', title: 'Bar Graph shell + host', steps: 'Inspect left chart', expected: 'Bar Graph; multi-step host soft' },
  { id: 'REG-SPD-DASH-011', area: 'Details', title: 'Synthetic metric cards ≥5', steps: 'Inspect Details', expected: 'PV/Page Onload/LCP/FCP/size soft set' },
  { id: 'REG-SPD-DASH-012', area: 'Linkage', title: 'Card → bar + Daily Averages soft', steps: 'Click PV, Onload, LCP/Speed/Size', expected: 'Soft signature change; restore Onload' },
  { id: 'REG-SPD-DASH-013', area: 'Perf Graph', title: 'Page Timings Over Time shell', steps: 'Inspect mid chart', expected: 'Title + multi-series labels soft' },
  { id: 'REG-SPD-DASH-014', area: 'Perf Graph', title: 'Legend toggle + gear cancel', steps: 'Toggle series; open gear', expected: 'Healthy; no permanent save' },
  { id: 'REG-SPD-DASH-015', area: 'Daily table', title: 'Headers + step/page rows soft', steps: 'Inspect Daily Averages', expected: 'Page Name; date/30d soft' },
  { id: 'REG-SPD-DASH-016', area: 'Daily table', title: 'Column sort soft', steps: 'Click headers', expected: 'Sort soft' },
  { id: 'REG-SPD-DASH-017', area: 'Daily table', title: 'Pagination soft', steps: 'Page size / Next Prev', expected: 'Chrome works; restore size soft' },
  { id: 'REG-SPD-DASH-018', area: 'Daily table', title: 'Export open/close soft', steps: 'Export menu', expected: 'Menu soft; no download assert' },
  { id: 'REG-SPD-DASH-019', area: 'Filters', title: 'Drawer + My/Shared tabs', steps: 'Open Filters', expected: 'Labels + tabs; Cancel' },
  { id: 'REG-SPD-DASH-020', area: 'Filters', title: 'Apply soft path', steps: 'Apply when available', expected: 'SPD still selected' },
  { id: 'REG-SPD-DASH-021', area: 'Manager', title: 'Manager open/close', steps: 'Wrench soft', expected: 'No Save/Delete' },
  { id: 'REG-SPD-DASH-022', area: 'Wizard', title: 'Add Widget cancel', steps: 'Open + Widget', expected: 'No permanent save' },
  { id: 'REG-SPD-DASH-023', area: 'Negative', title: 'Sibling then restore SPD', steps: 'Soft TSM / Site Overview', expected: 'SPD + GDC restored' },
  { id: 'REG-SPD-DASH-024', area: 'Negative', title: 'RUM PD discrimination', steps: 'Switch RUM then restore', expected: 'Exact Synthetic PD home' },
  { id: 'REG-SPD-DASH-024b', area: 'Negative', title: 'Synthetic Site Health discrimination', steps: 'Switch SSH then restore', expected: 'Exact Synthetic PD home' },
  { id: 'REG-SPD-DASH-025', area: 'Lookback', title: 'Custom Date cancel', steps: 'Open custom', expected: 'Cancel only' },
  { id: 'REG-SPD-DASH-026', area: 'Responsive', title: '1100px viewport', steps: 'Resize', expected: 'Widgets reachable' },
  { id: 'REG-SPD-DASH-027', area: 'A11y', title: 'Escape / Help soft', steps: 'Open filters Escape', expected: 'Overlays close' },
  { id: 'REG-SPD-DASH-028', area: 'Chrome', title: 'last-updated soft', steps: 'Check host', expected: 'Present when available' },
  { id: 'REG-SPD-DASH-029', area: 'Chrome', title: 'Carousel soft', steps: 'Observe', expected: 'No cycling left on' },
  { id: 'REG-SPD-DASH-030', area: 'Stability', title: 'Refresh keeps widgets', steps: 'Refresh', expected: 'Four groups + SPD' },
  { id: 'REG-SPD-DASH-031', area: 'Recovery', title: 'Browser reload', steps: 'Reload', expected: 'Re-select SPD + GDC' },
  { id: 'REG-SPD-DASH-032', area: 'Negative', title: 'Not Monitoring / RUM / SSH / Marketing', steps: 'Assert identity', expected: 'site/dashboard SPD only' },
  { id: 'REG-SPD-DASH-033', area: 'Chrome', title: 'Icon tooltips + round-trip', steps: 'Hover/click soft', expected: 'Return dashboard' },
  { id: 'REG-SPD-DASH-034', area: 'Lookback', title: '1h|6h / 24h / 7d / 30d prescribed', steps: 'Apply each', expected: 'Each applied' },
  { id: 'REG-SPD-DASH-035', area: 'Site', title: 'Site switch + lock soft', steps: 'Demo then restore', expected: 'GDC restored' },
  { id: 'REG-SPD-DASH-036', area: 'Chrome', title: 'Auto Refresh apply sample', steps: '5m Off restore', expected: 'Non-aggressive' },
  { id: 'REG-SPD-DASH-037', area: 'Manager', title: '+Dashboard/eye restore SPD', steps: 'Eye soft', expected: 'Exact Synthetic Performance Detail' },
  { id: 'REG-SPD-DASH-038', area: 'Recovery', title: 'Restore initial context', steps: 'restoreCtx', expected: 'Healthy suite home' },
];

async function main() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'BTT Playwright Automation';
  const summary = wb.addWorksheet('Summary');
  summary.addRow(['Synthetic Performance Detail Dashboard — Manual Regression Workbook']);
  summary.addRow(['Site', 'GDC Test Site 2']);
  summary.addRow(['Route', 'site/dashboard']);
  summary.addRow(['Dashboard option', 'Synthetic Performance Detail (Preconfigured)']);
  summary.addRow([
    'Help article (dashboard)',
    'https://help.bluetriangle.com/hc/en-us/articles/360033776353-The-Synthetic-Performance-Detail-Dashboard',
  ]);
  summary.addRow([
    'Monitoring page (out of primary scope)',
    'https://help.bluetriangle.com/hc/en-us/articles/360033775693-The-Synthetic-Real-Browser-Performance-Detail-Page',
  ]);
  summary.addRow([
    'Automation spec',
    'tests/.../synthetic-performance-detail/synthetic.performance.detail.dashboard.regression.spec.ts',
  ]);
  summary.addRow(['npm', 'test:regression:us2:synthetic-performance-detail-dashboard']);
  summary.addRow(['Read-only', 'No Save Filter / Clear Cache / permanent Save-Share-Clone-Delete']);
  summary.addRow(['Total cases', cases.length]);

  const tcs = wb.addWorksheet('Regression TCs');
  tcs.addRow(['ID', 'Area', 'Title', 'Steps', 'Expected']);
  tcs.getRow(1).font = { bold: true };
  for (const c of cases) tcs.addRow([c.id, c.area, c.title, c.steps, c.expected]);
  tcs.columns = [{ width: 18 }, { width: 16 }, { width: 52 }, { width: 40 }, { width: 48 }];

  const notes = wb.addWorksheet('Notes');
  notes.addRow(['Exact Select2 match — partial “Synthetic” hits Site Health; partial “Performance Detail” hits RUM.']);
  notes.addRow(['Package PDF is Monitoring page — do not require scatter/HTTP pie/HAR on this board.']);
  notes.addRow(['Synthetic metrics: PAGE ONLOAD, SPEED INDEX, page sizes, elements/domains soft.']);
  notes.addRow(['step_* page names from synthetic scripts are valid.']);
  notes.addRow(['Always re-assert GDC after dashboard switch.']);

  fs.mkdirSync(path.dirname(out), { recursive: true });
  await wb.xlsx.writeFile(out);
  console.log('Wrote', out, 'cases=', cases.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
