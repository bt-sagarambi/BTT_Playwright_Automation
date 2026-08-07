/**
 * Generate docs/Synthetic_Site_Health_Dashboard_Regression.xlsx
 * Run: npx tsx scripts/generate-synthetic-site-health-excel.ts
 */
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

const out = path.join(process.cwd(), 'docs', 'Synthetic_Site_Health_Dashboard_Regression.xlsx');

const cases: Array<{ id: string; area: string; title: string; steps: string; expected: string }> = [
  {
    id: 'REG-SSH-001',
    area: 'Navigation',
    title: 'Page loads via Dashboards with correct title',
    steps: 'Login → Menu Dashboards → site/dashboard',
    expected: 'URL site/dashboard; title Dashboards; no login redirect',
  },
  {
    id: 'REG-SSH-002',
    area: 'Identity',
    title: 'Synthetic Site Health selected; four core widgets',
    steps: 'Select exact Synthetic Site Health from Preconfigured',
    expected: 'High Level Metrics, Site Availability, Screenshot, Session And Page Scatterplot present',
  },
  {
    id: 'REG-SSH-003',
    area: 'Site',
    title: 'GDC Test Site 2; lookback/auto-refresh captured',
    steps: 'Verify quick site and chrome capture',
    expected: 'Profile site; non-empty lookback label',
  },
  {
    id: 'REG-SSH-004',
    area: 'Chrome',
    title: 'Switcher, lookback, refresh, auto-refresh visible',
    steps: 'Inspect dashboard-page-controls',
    expected: 'Controls attached/visible',
  },
  {
    id: 'REG-SSH-005',
    area: 'Chrome',
    title: 'Preconfigured list includes SSH and Perf Detail',
    steps: 'Open dashboard switcher',
    expected: 'Exact Synthetic Site Health; Synthetic Performance Detail listed separately',
  },
  {
    id: 'REG-SSH-006',
    area: 'Lookback',
    title: 'Time Lookback multi presets',
    steps: 'Open lookback menu',
    expected: '>3 presets',
  },
  {
    id: 'REG-SSH-007',
    area: 'Lookback',
    title: 'Apply 24h / 7d then restore',
    steps: 'Select Last 24 hours, Last 7 days, restore original',
    expected: 'Widgets remain ready; SSH still selected',
  },
  {
    id: 'REG-SSH-008',
    area: 'Chrome',
    title: 'Dashboard Refresh',
    steps: 'Click #refresh-dashboard',
    expected: 'No blank crash; core titles return',
  },
  {
    id: 'REG-SSH-009',
    area: 'Chrome',
    title: 'Auto Refresh menu options',
    steps: 'Open Auto Refresh',
    expected: 'Off + interval options soft',
  },
  {
    id: 'REG-SSH-010',
    area: 'High Level Metrics',
    title: 'Six metric headers + soft formats',
    steps: 'Inspect High Level Metrics table',
    expected: 'Availability, Avg Onload, Resources, First Paint, Image Size, JS Errors',
  },
  {
    id: 'REG-SSH-011',
    area: 'Site Availability',
    title: 'Chart + legend toggle',
    steps: 'Verify Site Availability Over Time; click legend',
    expected: 'Sized chart; Total Errors; soft legend restore',
  },
  {
    id: 'REG-SSH-012',
    area: 'Site Availability',
    title: 'Hover tooltip soft',
    steps: 'Hover chart',
    expected: 'Tooltip optional soft',
  },
  {
    id: 'REG-SSH-013',
    area: 'Screenshot',
    title: 'Previous/Next; image soft',
    steps: 'Click Next/Previous when enabled',
    expected: 'Chrome present; empty image annotated soft',
  },
  {
    id: 'REG-SSH-014',
    area: 'Scatterplot',
    title: 'Dual panes + Displayed Metric',
    steps: 'Inspect Session And Page Scatterplot',
    expected: 'Displayed Metric list sample; page/session scatter hosts',
  },
  {
    id: 'REG-SSH-015',
    area: 'Scatterplot',
    title: 'Drill, pause, detail tabs; Continue Auto Refresh',
    steps: 'Click scatter points; open detail tabs; Continue Auto Refresh',
    expected: 'Soft pause banner; tabs Waterfall/Film Strip/HAR/Event Log when open; pause cleared',
  },
  {
    id: 'REG-SSH-016',
    area: 'Scatterplot',
    title: 'Drill Into Performance Detail soft',
    steps: 'Click Drill Into Performance Detail; close tab; restore SSH',
    expected: 'Extra tab closed; suite on site/dashboard Synthetic Site Health',
  },
  {
    id: 'REG-SSH-017',
    area: 'Filters',
    title: 'Drawer + My/Shared tabs',
    steps: 'Open Filters; switch tabs; Cancel',
    expected: 'Representative filter labels; no Save Filter',
  },
  {
    id: 'REG-SSH-018',
    area: 'Filters',
    title: 'Apply soft path',
    steps: 'Apply when available; cancel/restore',
    expected: 'SSH still selected after Apply soft',
  },
  {
    id: 'REG-SSH-019',
    area: 'Manager',
    title: 'Dashboard Manager open/close',
    steps: 'Open wrench; Escape/Close',
    expected: 'No Save/Delete sticky',
  },
  {
    id: 'REG-SSH-020',
    area: 'Wizard',
    title: 'Add Widget cancel only',
    steps: 'Open + Widget; cancel',
    expected: 'No permanent widget save',
  },
  {
    id: 'REG-SSH-021',
    area: 'Negative',
    title: 'Sibling preconfigured then restore SSH',
    steps: 'Soft switch Synthetic Performance Detail (or other); re-nav SSH',
    expected: 'SSH + GDC restored',
  },
  {
    id: 'REG-SSH-022',
    area: 'Lookback',
    title: 'Custom Date cancel only',
    steps: 'Open Custom Date; Escape',
    expected: 'No sticky custom range required',
  },
  {
    id: 'REG-SSH-023',
    area: 'Responsive',
    title: 'Narrow viewport 1100px',
    steps: 'Resize viewport',
    expected: 'Chrome + widgets reachable',
  },
  {
    id: 'REG-SSH-024',
    area: 'A11y/chrome',
    title: 'Escape recovery; Help soft',
    steps: 'Open filters; Escape',
    expected: 'Overlays closed',
  },
  {
    id: 'REG-SSH-025',
    area: 'Chrome',
    title: 'last-updated soft',
    steps: 'Check #last-updated-dashboard',
    expected: 'Present when available',
  },
  {
    id: 'REG-SSH-026',
    area: 'Chrome',
    title: 'Carousel soft presence',
    steps: 'Observe Carousel control',
    expected: 'Do not leave cycling',
  },
  {
    id: 'REG-SSH-027',
    area: 'Stability',
    title: 'Refresh keeps widgets',
    steps: 'Refresh dashboard',
    expected: 'Core titles remain; SSH selected',
  },
  {
    id: 'REG-SSH-028',
    area: 'Recovery',
    title: 'Browser reload',
    steps: 'page.reload; re-select SSH',
    expected: 'Healthy site/dashboard SSH',
  },
  {
    id: 'REG-SSH-029',
    area: 'Negative',
    title: 'Not confused surfaces',
    steps: 'Assert not DXO/Marketing as home; not Perf Detail label',
    expected: 'Exact SSH; SSH widget signals',
  },
  {
    id: 'REG-SSH-030',
    area: 'Chrome',
    title: 'Icon tooltips + round-trip',
    steps: 'Hover/click Filters Manager Share soft',
    expected: 'Return to site/dashboard SSH',
  },
  {
    id: 'REG-SSH-031',
    area: 'Lookback',
    title: '6h / 24h / 7d / 30d prescribed',
    steps: 'Apply each lookback; restore',
    expected: 'Each applied; widgets ready',
  },
  {
    id: 'REG-SSH-032',
    area: 'Site',
    title: 'Quick site change + lock soft; restore GDC',
    steps: 'Switch Demo eCommerce; soft lock; restore',
    expected: 'GDC restored; widgets ready',
  },
  {
    id: 'REG-SSH-033',
    area: 'Chrome',
    title: 'Auto Refresh apply sample',
    steps: '5 Minutes then Off/restore interval',
    expected: 'Non-aggressive final state',
  },
  {
    id: 'REG-SSH-034',
    area: 'Manager',
    title: '+Dashboard / eye then restore SSH',
    steps: 'Open manager eye soft; restore exact SSH',
    expected: 'SSH selected',
  },
  {
    id: 'REG-SSH-035',
    area: 'Recovery',
    title: 'Restore initial context',
    steps: 'Continue Auto Refresh if paused; restoreCtx',
    expected: 'SSH + GDC + core widgets healthy',
  },
];

async function main() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'BTT Playwright Automation';
  const summary = wb.addWorksheet('Summary');
  summary.addRow(['Synthetic Site Health Dashboard — Manual Regression Workbook']);
  summary.addRow(['Site', 'GDC Test Site 2']);
  summary.addRow(['Route', 'site/dashboard']);
  summary.addRow(['Dashboard option', 'Synthetic Site Health (Preconfigured)']);
  summary.addRow(['Help article', 'https://help.bluetriangle.com/hc/en-us/articles/360021493373-The-Synthetic-Site-Health-Dashboard']);
  summary.addRow(['Automation spec', 'tests/.../synthetic-site-health/synthetic.site.health.dashboard.regression.spec.ts']);
  summary.addRow(['npm', 'test:regression:us2:synthetic-site-health']);
  summary.addRow(['Read-only constraints', 'No Save Filter / Clear Cache / permanent Save-Share-Clone-Delete / Add Widget persist']);
  summary.addRow(['Total cases', cases.length]);

  const tcs = wb.addWorksheet('Regression TCs');
  tcs.addRow(['ID', 'Area', 'Title', 'Steps', 'Expected']);
  tcs.getRow(1).font = { bold: true };
  for (const c of cases) {
    tcs.addRow([c.id, c.area, c.title, c.steps, c.expected]);
  }
  tcs.columns = [
    { width: 14 },
    { width: 18 },
    { width: 48 },
    { width: 55 },
    { width: 55 },
  ];

  const notes = wb.addWorksheet('Notes');
  notes.addRow(['Live vs PDF']);
  notes.addRow(['PDF + live probe are sources; prefer live labels for Displayed Metric list and detail tabs.']);
  notes.addRow(['Never select Synthetic Performance Detail as suite home.']);
  notes.addRow(['Always Continue Auto Refresh after scatter pause.']);
  notes.addRow(['Empty Screenshot / sparse scatter points = soft annotate, not suite wipe.']);
  notes.addRow(['Low Availability % is valid live data.']);

  fs.mkdirSync(path.dirname(out), { recursive: true });
  await wb.xlsx.writeFile(out);
  console.log('Wrote', out, 'cases=', cases.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
