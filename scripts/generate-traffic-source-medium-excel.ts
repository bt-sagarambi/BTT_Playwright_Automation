/**
 * Generate docs/Traffic_Source_and_Medium_Dashboard_Regression.xlsx
 * Run: npx tsx scripts/generate-traffic-source-medium-excel.ts
 */
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

const out = path.join(process.cwd(), 'docs', 'Traffic_Source_and_Medium_Dashboard_Regression.xlsx');

const cases: Array<{ id: string; area: string; title: string; steps: string; expected: string }> = [
  { id: 'REG-TSM-001', area: 'Navigation', title: 'Page loads via Dashboards', steps: 'Menu → Dashboards', expected: 'site/dashboard; title Dashboards' },
  { id: 'REG-TSM-002', area: 'Identity', title: 'Exact Traffic Source and Medium + 3 widgets', steps: 'Select exact option from Preconfigured', expected: 'Sitewide Totals; Source/Medium Breakdown' },
  { id: 'REG-TSM-003', area: 'Site', title: 'GDC Test Site 2 + chrome capture', steps: 'Verify site and lookback', expected: 'Profile site; lookback non-empty' },
  { id: 'REG-TSM-004', area: 'Chrome', title: 'Switcher / lookback / refresh / auto-refresh', steps: 'Inspect chrome', expected: 'Controls visible' },
  { id: 'REG-TSM-005', area: 'Chrome', title: 'Preconfigured list includes TSM', steps: 'Open switcher', expected: 'Exact Traffic Source and Medium' },
  { id: 'REG-TSM-006', area: 'Lookback', title: 'Multi lookback presets', steps: 'Open menu', expected: '>3 options' },
  { id: 'REG-TSM-007', area: 'Lookback', title: 'Apply 24h / 7d restore', steps: 'Sample periods', expected: 'Widgets ready; TSM selected' },
  { id: 'REG-TSM-008', area: 'Chrome', title: 'Dashboard Refresh', steps: 'Click refresh', expected: 'No blank crash' },
  { id: 'REG-TSM-009', area: 'Chrome', title: 'Auto Refresh options', steps: 'Open menu', expected: 'Off + intervals' },
  { id: 'REG-TSM-010', area: 'Sitewide', title: 'Six metrics + formats', steps: 'Inspect Sitewide Totals', expected: 'Revenue/Orders/AOV/Visitors/PV/CR soft' },
  { id: 'REG-TSM-011', area: 'Source table', title: 'Headers + rows soft', steps: 'Inspect Source Breakdown', expected: 'Source + metrics columns' },
  { id: 'REG-TSM-012', area: 'Medium table', title: 'Headers + rows soft', steps: 'Inspect Medium Breakdown', expected: 'Medium + metrics columns' },
  { id: 'REG-TSM-013', area: 'Tables', title: 'Column sort soft both', steps: 'Click headers', expected: 'Sortable soft; no hard-code order' },
  { id: 'REG-TSM-014', area: 'Tables', title: 'Pagination soft', steps: 'Page size / Next Prev', expected: 'Chrome works; restore size soft' },
  { id: 'REG-TSM-015', area: 'Tables', title: 'Export open/close soft', steps: 'Export both tables', expected: 'Menu soft; no download assert' },
  { id: 'REG-TSM-016', area: 'Filters', title: 'Drawer + My/Shared + traffic labels', steps: 'Open Filters', expected: 'Labels + tabs; Cancel' },
  { id: 'REG-TSM-017', area: 'Filters', title: 'Apply soft path', steps: 'Apply when available', expected: 'TSM still selected' },
  { id: 'REG-TSM-018', area: 'Manager', title: 'Manager open/close', steps: 'Wrench soft', expected: 'No Save/Delete' },
  { id: 'REG-TSM-019', area: 'Wizard', title: 'Add Widget cancel', steps: 'Open + Widget', expected: 'No permanent save' },
  { id: 'REG-TSM-020', area: 'Negative', title: 'Sibling then restore TSM', steps: 'Soft Site Overview etc.', expected: 'TSM + GDC restored' },
  { id: 'REG-TSM-021', area: 'Lookback', title: 'Custom Date cancel', steps: 'Open custom', expected: 'Cancel only' },
  { id: 'REG-TSM-022', area: 'Responsive', title: '1100px viewport', steps: 'Resize', expected: 'Widgets reachable' },
  { id: 'REG-TSM-023', area: 'A11y', title: 'Escape / Help soft', steps: 'Open filters Escape', expected: 'Overlays close' },
  { id: 'REG-TSM-024', area: 'Chrome', title: 'last-updated soft', steps: 'Check host', expected: 'Present when available' },
  { id: 'REG-TSM-025', area: 'Chrome', title: 'Carousel soft', steps: 'Observe', expected: 'No cycling left on' },
  { id: 'REG-TSM-026', area: 'Stability', title: 'Refresh keeps widgets', steps: 'Refresh', expected: 'Three widgets + TSM' },
  { id: 'REG-TSM-027', area: 'Recovery', title: 'Browser reload', steps: 'Reload', expected: 'Re-select TSM + GDC' },
  { id: 'REG-TSM-028', area: 'Negative', title: 'Not confused surfaces', steps: 'Assert identity', expected: 'Not RUM PO / Marketing / DXO home' },
  { id: 'REG-TSM-029', area: 'Chrome', title: 'Icon tooltips + round-trip', steps: 'Hover/click soft', expected: 'Return dashboard' },
  { id: 'REG-TSM-030', area: 'Lookback', title: '6h/24h/7d/30d prescribed', steps: 'Apply each', expected: 'Each applied' },
  { id: 'REG-TSM-031', area: 'Site', title: 'Site switch + lock soft', steps: 'Demo then restore', expected: 'GDC restored' },
  { id: 'REG-TSM-032', area: 'Chrome', title: 'Auto Refresh apply sample', steps: '5m Off restore', expected: 'Non-aggressive' },
  { id: 'REG-TSM-033', area: 'Manager', title: '+Dashboard/eye restore TSM', steps: 'Eye soft', expected: 'Exact TSM' },
  { id: 'REG-TSM-034', area: 'Recovery', title: 'Restore initial context', steps: 'restoreCtx', expected: 'Healthy suite home' },
];

async function main() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'BTT Playwright Automation';
  const summary = wb.addWorksheet('Summary');
  summary.addRow(['Traffic Source and Medium Dashboard — Manual Regression Workbook']);
  summary.addRow(['Site', 'GDC Test Site 2']);
  summary.addRow(['Route', 'site/dashboard']);
  summary.addRow(['Dashboard option', 'Traffic Source and Medium (Preconfigured)']);
  summary.addRow([
    'Help article',
    'https://help.bluetriangle.com/hc/en-us/articles/360021303034-Traffic-Source-and-Medium-Dashboard',
  ]);
  summary.addRow([
    'Automation spec',
    'tests/.../traffic-source-and-medium/traffic.source.medium.dashboard.regression.spec.ts',
  ]);
  summary.addRow(['npm', 'test:regression:us2:traffic-source-medium']);
  summary.addRow(['Read-only', 'No Save Filter / Clear Cache / permanent Save-Share-Clone-Delete']);
  summary.addRow(['Total cases', cases.length]);

  const tcs = wb.addWorksheet('Regression TCs');
  tcs.addRow(['ID', 'Area', 'Title', 'Steps', 'Expected']);
  tcs.getRow(1).font = { bold: true };
  for (const c of cases) tcs.addRow([c.id, c.area, c.title, c.steps, c.expected]);
  tcs.columns = [{ width: 14 }, { width: 16 }, { width: 48 }, { width: 40 }, { width: 48 }];

  const notes = wb.addWorksheet('Notes');
  notes.addRow(['Exact Select2 match required — partial Traffic* can hit RUM Performance Detail or Shared boards.']);
  notes.addRow(['Currency locale-tolerant (€ on GDC probe).']);
  notes.addRow(['Share percentages in cells are soft.']);
  notes.addRow(['Medium None / Source Direct are valid buckets.']);

  fs.mkdirSync(path.dirname(out), { recursive: true });
  await wb.xlsx.writeFile(out);
  console.log('Wrote', out, 'cases=', cases.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
