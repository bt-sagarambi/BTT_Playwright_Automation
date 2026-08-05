/**
 * Generates docs/Bottom_Of_The_Sales_Funnel_Analysis_Regression.xlsx
 * Sheets: Summary / Regression TCs / Notes
 *
 * Run: node scripts/generate-bottom-sales-funnel-regression-excel.js
 */
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');

const SITE = 'GDC Test Site 2';
const DC = 'US';
const MODULE = 'Business Insights — Improve Traffic';
const AUTOMATION =
  'tests/regression_tests/US2/business-insights/improve-traffic/bottom-of-the-sales-funnel-analysis/bottom.of.the.sales.funnel.analysis.regression.spec.ts';
const EXECUTION_STATUS = process.env.BSF_EXECUTION_STATUS || 'Not Executed';
const EXECUTION_NOTE =
  process.env.BSF_EXECUTION_NOTE ||
  'Run npm run test:regression:us2:bottom-sales-funnel and record live-data annotations from Allure.';

const cases = [
  { id: 'REG-BSF-001', submodule: 'Navigation', title: 'Page loads with Bottom of the Funnel title and BI breadcrumb', steps: 'Open BI > Improve Traffic > Bottom of the Sales Funnel Analysis; observe title, breadcrumb, URL.', expected: 'Title matches Funnel pattern; #page-title BI path; URL has bottom-sales-funnel.' },
  { id: 'REG-BSF-002', submodule: 'Default Load', title: 'Analysis chrome and funnel surface settle', steps: 'Wait for funnel charts/cards or controlled empty.', expected: 'Conversion Analysis chrome present; charts or annotated empty.' },
  { id: 'REG-BSF-003', submodule: 'Context', title: 'Portal site GDC Test Site 2; badges present', steps: 'Confirm site; capture Time Period / Device badges.', expected: 'Site GDC Test Site 2; non-empty Time Period badge.' },
  { id: 'REG-BSF-004', submodule: 'Path', title: 'Path Select2 accessible (Filters if needed)', steps: 'Open Filters when path Select2 hidden; capture path text.', expected: 'Path Select2 attached with non-empty selection.' },
  { id: 'REG-BSF-005', submodule: 'Chrome', title: 'Create Path / Add Comparison / View By soft presence', steps: 'Locate primary chrome controls.', expected: 'Representative chrome present or soft-annotated.' },
  { id: 'REG-BSF-006', submodule: 'Path', title: 'Change path runtime and soft-compare signature; restore', steps: 'Select alternate path; compare chart/KPI signature; restore.', expected: 'No hard-coded path names; original restored.' },
  { id: 'REG-BSF-007', submodule: 'Config soft', title: 'Create Path soft open labels (no Save)', steps: 'Open Create Path; sample Path/Step/Page Group labels; Escape.', expected: 'Builder labels soft-present; no paths-create-submit.' },
  { id: 'REG-BSF-008', submodule: 'View By', title: 'Page Views ↔ Sessions soft host flip', steps: 'Toggle View By modes; note active chart hosts.', expected: 'Active #funnel-1-page-views / #funnel-1-sessions soft behavior; restore.' },
  { id: 'REG-BSF-009', submodule: 'Charts', title: 'Primary funnel chart host soft-assert', steps: 'Count visible funnel chart hosts.', expected: 'Visible chart or controlled empty.' },
  { id: 'REG-BSF-010', submodule: 'Charts', title: 'Chart title soft-regex (funnel/path wording)', steps: 'Read chart signature text.', expected: 'Soft funnel/path wording or annotated weak title.' },
  { id: 'REG-BSF-011', submodule: 'Conversions', title: 'Step conversion % format soft (not bounds)', steps: 'Sample conversion % text for steps.', expected: 'Format soft (/%/conversion/); no business-bound asserts.' },
  { id: 'REG-BSF-012', submodule: 'KPIs', title: 'Bottom / Total Funnel Conversion KPI soft', steps: 'Scan body/cards for KPI labels.', expected: 'Bottom and/or Total Funnel Conversion present when data-bearing.' },
  { id: 'REG-BSF-013', submodule: 'Charts', title: 'Sessions funnel 0×0 OK when Page Views active', steps: 'Select Page Views; soft-check #funnel-1-sessions.', expected: 'Presence soft; 0-size OK.' },
  { id: 'REG-BSF-014', submodule: 'Comparison', title: 'Add Comparison soft open/close', steps: 'Open Add Comparison series config; Escape/Cancel.', expected: 'No permanent sticky series when clearable.' },
  { id: 'REG-BSF-015', submodule: 'Filters', title: 'Filters pane labels (Path / Time Period / Timezone)', steps: 'Open Filters; sample labels.', expected: 'Representative filter labels.' },
  { id: 'REG-BSF-016', submodule: 'Filters', title: 'Soft-apply time period presets; funnel healthy', steps: 'Apply ~7d/~30d presets if available.', expected: 'Charts healthy or controlled empty; no Save Filter.' },
  { id: 'REG-BSF-017', submodule: 'Filters', title: 'Visitor Type new vs returning soft', steps: 'Soft inspect Visitor Type control.', expected: 'Soft handling / annotate if absent.' },
  { id: 'REG-BSF-018', submodule: 'Filters', title: 'Cancel/Escape closes Filters without Save', steps: 'Open Filters; Cancel/Escape.', expected: 'Remain on Analysis; no Save Filter.' },
  { id: 'REG-BSF-019', submodule: 'Filters', title: 'My/Shared Filters tabs read-only', steps: 'Inspect My/Shared tabs without Save.', expected: 'Read-only soft inspect.' },
  { id: 'REG-BSF-020', submodule: 'Config soft', title: 'Funnel Configuration soft visit then restore Analysis', steps: 'Soft-open Configuration (path-type=funnel) then return.', expected: 'Analysis route restored.' },
  { id: 'REG-BSF-021', submodule: 'Best practice', title: 'Order Confirmation recommendation soft', steps: 'Observe step/body for confirmation wording.', expected: 'Annotate if absent — do not hard-fail.' },
  { id: 'REG-BSF-022', submodule: 'Best practice', title: 'Max 8 steps constraint soft', steps: 'Document video max-8 without permanent path edit.', expected: 'Soft annotation only in suite.' },
  { id: 'REG-BSF-023', submodule: 'A11y/Help', title: 'Marketing Insights training video soft link', steps: 'Soft-check Help/Training links.', expected: 'Present or annotated.' },
  { id: 'REG-BSF-024', submodule: 'A11y', title: 'Info-icon soft presence', steps: 'Count info icons.', expected: 'Present or soft-annotated.' },
  { id: 'REG-BSF-025', submodule: 'A11y', title: 'Keyboard focus soft', steps: 'Focus Filters / Create Path.', expected: 'Focus attempted without crash.' },
  { id: 'REG-BSF-026', submodule: 'Responsive', title: 'Narrow desktop keeps funnel reachable', steps: 'Set ~1100px width; verify primary hosts.', expected: 'Funnel chrome reachable.' },
  { id: 'REG-BSF-027', submodule: 'Recovery', title: 'Back/Forward/refresh recovery', steps: 'History + reload; restore Analysis.', expected: 'Healthy bottom-sales-funnel state.' },
  { id: 'REG-BSF-028', submodule: 'Non-functional', title: 'Chart hosts not unreasonably duplicated after refresh', steps: 'Reload; count primary hosts.', expected: 'Key hosts exist singly (≤2–3).' },
  { id: 'REG-BSF-029', submodule: 'Combination', title: 'Filters + View By + Comparison combination', steps: 'Exercise open/close + View By + comparison soft.', expected: 'No overlay block; Analysis healthy.' },
  { id: 'REG-BSF-030', submodule: 'Recovery', title: 'Final recovery path/ViewBy; Analysis home', steps: 'Restore captured context; assert URL and breadcrumb.', expected: 'No sticky config page; Analysis only.' },
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
    ['Screen', 'Bottom of the Sales Funnel Conversion Analysis'],
    ['Site', SITE],
    ['Data center', DC],
    ['Menu path', 'Business Insights > Improve Traffic > Bottom of the Sales Funnel Analysis'],
    ['Route', 'marketing-insights/bottom-sales-funnel'],
    ['Smoke catalog', 'mkt.bottom-funnel'],
    ['Browser title', 'Bottom of the Funnel'],
    ['#page-title', 'Business Insights / Improve Traffic / Bottom Of The Sales Funnel Analysis'],
    ['Automation spec', AUTOMATION],
    ['POM', 'pages/BottomOfTheSalesFunnelAnalysisPage.ts'],
    ['Locators', 'locators/BottomOfTheSalesFunnelAnalysisLocators.ts'],
    ['npm command', 'npm run test:regression:us2:bottom-sales-funnel'],
    ['Case count', String(cases.length)],
    ['Execution status', EXECUTION_STATUS],
    ['Execution note', EXECUTION_NOTE],
    [
      'Out of scope',
      'API/DB, Save Filter, permanent Create Path, Clear Cache, hard-coded path/step/conversion values, Dashboard widget creation',
    ],
    ['Video scenarios', '9 Marketing Insights training points (21:20–24:35) mapped into REG-BSF cases'],
    ['PDF', 'Bottom of the Sales Funnel Widget (same graph as Analysis)'],
  ].forEach(([field, value]) => summary.addRow({ field, value }));
  summary.getRow(1).font = { bold: true };

  const tcs = wb.addWorksheet('Regression TCs');
  tcs.columns = [
    { header: 'TC ID', key: 'id', width: 14 },
    { header: 'Module', key: 'module', width: 36 },
    { header: 'Submodule', key: 'submodule', width: 16 },
    { header: 'Title', key: 'title', width: 70 },
    { header: 'Priority', key: 'priority', width: 10 },
    { header: 'Type', key: 'type', width: 12 },
    { header: 'Steps', key: 'steps', width: 55 },
    { header: 'Expected Result', key: 'expected', width: 55 },
    { header: 'Automation', key: 'auto', width: 14 },
    { header: 'Status', key: 'status', width: 14 },
  ];
  cases.forEach((c) => {
    tcs.addRow({
      id: c.id,
      module: MODULE,
      submodule: c.submodule,
      title: c.title,
      priority: 'High',
      type: 'Regression',
      steps: c.steps,
      expected: c.expected,
      auto: 'Automated',
      status: EXECUTION_STATUS,
    });
  });
  tcs.getRow(1).font = { bold: true };
  tcs.eachRow((row, n) => {
    if (n === 1) return;
    row.getCell('steps').alignment = { wrapText: true, vertical: 'top' };
    row.getCell('expected').alignment = { wrapText: true, vertical: 'top' };
  });

  const notes = wb.addWorksheet('Notes');
  notes.columns = [
    { header: 'Topic', key: 'topic', width: 28 },
    { header: 'Detail', key: 'detail', width: 110 },
  ];
  [
    ['Purpose', 'Step-by-step conversion through late-funnel/checkout path to find friction; path-based analysis.'],
    ['Docs', 'Widget Help PDF + Marketing Insights video; live BI Analysis page is source of truth.'],
    ['Do not hard-code', 'Path/step/page-group names, conversion %, counts, time period, timezone, Highcharts internal IDs.'],
    ['Path Select2', 'May require Filters open to fully expose #select2-existingPathSelect-container.'],
    ['View By', 'Page Views vs Sessions dual chart hosts; inactive side may be 0×0 — soft.'],
    ['Mutations out of scope', 'No Save Filter, permanent Create/Update path, Clear Cache, permanent comparison series.'],
    ['Order Confirmation', 'Recommended by PDF/video for accurate Bottom Funnel Conversion — soft annotate if missing.'],
    ['Execution', EXECUTION_NOTE],
  ].forEach(([topic, detail]) => notes.addRow({ topic, detail }));
  notes.getRow(1).font = { bold: true };

  const outDir = path.join(__dirname, '..', 'docs');
  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, 'Bottom_Of_The_Sales_Funnel_Analysis_Regression.xlsx');
  await wb.xlsx.writeFile(out);
  console.log(`Wrote ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
