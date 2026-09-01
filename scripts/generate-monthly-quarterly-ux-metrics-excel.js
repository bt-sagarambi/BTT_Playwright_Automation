/**
 * Generates docs/Monthly_Quarterly_UX_Metrics_Regression.xlsx
 * Sheets: Summary / Regression TCs / Notes
 *
 * Run: node scripts/generate-monthly-quarterly-ux-metrics-excel.js
 */
const path = require('path');
const { writeRegressionManualWorkbook } = require('./lib/regressionManualExcel');

const SITE = 'GDC Test Site 2';
const DC = 'US';
const MODULE = 'Advanced Reporting — Custom Reporting — Business Intelligence';
const AUTOMATION =
  'tests/regression_tests/US2/advanced-reporting/custom-reporting/business-intelligence/monthly-quarterly-ux-metrics/monthly.quarterly.ux.metrics.regression.spec.ts';
const EXECUTION_STATUS = process.env.MQ_UXM_EXECUTION_STATUS || 'Not Executed';
const EXECUTION_NOTE =
  process.env.MQ_UXM_EXECUTION_NOTE ||
  'Run npm run test:regression:us2:monthly-quarterly-ux-metrics and record live-data annotations from Allure.';

const cases = [
  { id: 'REG-MQ-UXM-001', submodule: 'Navigation', title: 'Portal BI tool loads; title/route; no login redirect', steps: 'Login; Advanced Reporting > Custom Reporting > Business Intelligence.', expected: 'URL business-intelligence/tool; #page-title Business Intelligence; #bi-iframe attached.' },
  { id: 'REG-MQ-UXM-002', submodule: 'Context', title: 'GDC Test Site 2; iframe ready; UX Metrics identity', steps: 'Wait #bi-iframe; Dashboards Search open Monthly/Quarterly - UX Metrics.', expected: 'GDC soft; viewer title Monthly/Quarterly - UX Metrics.' },
  { id: 'REG-MQ-UXM-003', submodule: 'Chrome', title: 'BI rail Favorites/Dashboards/AI Query/Charts/Schedules/Folders soft', steps: 'Inspect left rail in iframe.', expected: 'All rail labels soft-present.' },
  { id: 'REG-MQ-UXM-004', submodule: 'Catalog', title: 'Dashboards Search finds UX Metrics (~25 widgets soft)', steps: 'Search UX Metrics; open card (not Revenue); clear sticky search.', expected: 'Matching card; open viewer; ~25 widgets annotate.' },
  { id: 'REG-MQ-UXM-005', submodule: 'Catalog', title: 'List chrome folders/Local-UTC/Reset non-destructive', steps: 'Soft list toolbar; restore; re-open UX Metrics.', expected: 'No sticky list filter; UX Metrics reopened.' },
  { id: 'REG-MQ-UXM-006', submodule: 'Sibling', title: 'Sibling Revenue / CWV PoP soft; restore UX Metrics', steps: 'Note sibling; re-open UX Metrics.', expected: 'UX Metrics viewer restored.' },
  { id: 'REG-MQ-UXM-007', submodule: 'Viewer', title: 'Viewer title exact UX Metrics; Global / Responsive Grid soft', steps: 'Assert BI viewer title + badges.', expected: '/Monthly\\/Quarterly\\s*-\\s*UX Metrics/i; Global/Responsive Grid soft.' },
  { id: 'REG-MQ-UXM-008', submodule: 'Charts', title: 'Monthly+Quarterly Onload/LCP/CLS/INP + Current/Previous + KPI cards', steps: 'Scroll widgets; assert titles/legends/KPI cards.', expected: '≥3 of Onload/LCP/CLS/INP; monthly or quarterly; Current/Previous soft; KPI soft.' },
  { id: 'REG-MQ-UXM-009', submodule: 'Filters', title: 'Comparison Period Previous + Same Time Last Year + restore', steps: 'Open Filters; set Directly Previous Period; Same Time Last Year; Reset.', expected: 'Widgets refresh soft; restored toward baseline.' },
  { id: 'REG-MQ-UXM-010', submodule: 'Filters', title: 'End Date Yesterday / Start of Previous Month + restore', steps: 'Sample End Date presets; Reset.', expected: 'Period subtitle/KPI soft change or annotate; restored.' },
  { id: 'REG-MQ-UXM-011', submodule: 'Filters', title: 'Browser / OS / Return-New Visitor / Percentile sample + restore', steps: 'Sample Browser, OS, Return/New Visitor, Percentile p75; Reset.', expected: 'Refresh soft; Percentile 75th soft; restored.' },
  { id: 'REG-MQ-UXM-012', submodule: 'Filters', title: 'Bot Traffic / Device / Originated From sample + restore', steps: 'Sample Bot/Device/Originated From; Reset.', expected: 'Refresh soft; restored.' },
  { id: 'REG-MQ-UXM-013', submodule: 'Lifecycle', title: 'Refresh Data soft settle; identity retained', steps: 'Click Refresh Data.', expected: 'Loading→ready; UX Metrics + GDC retained.' },
  { id: 'REG-MQ-UXM-014', submodule: 'Lifecycle', title: 'Reset to Defaults after Comparison/End Date change', steps: 'Change Comparison+End Date; Reset to Defaults.', expected: 'Defaults restored or annotate Global lock.' },
  { id: 'REG-MQ-UXM-015', submodule: 'Lifecycle', title: 'Save As disposable clone; verify; cleanup', steps: 'Save As MQ-UXM-QA-<unique>; verify; delete if possible.', expected: 'Clone created; Global title not overwritten; cleanup.' },
  { id: 'REG-MQ-UXM-016', submodule: 'Export', title: 'Dashboard hamburger PNG/PDF/PowerPoint soft vs UI', steps: 'Open top-right/export menu; soft export PNG/PDF/PPT; compare labels to UI.', expected: 'PNG/PDF present; PPT soft or annotate; downloads soft; identity retained.' },
  { id: 'REG-MQ-UXM-017', submodule: 'Widget', title: 'Per-widget Switch metric (gear) soft impact + restore', steps: 'Click Switch metric gear; select alternate; Reset.', expected: 'Menu opens; signature change soft or annotate read-only; restored.' },
  { id: 'REG-MQ-UXM-018', submodule: 'Export', title: 'Per-widget Export chart PNG/PDF/CSV soft vs UI', steps: 'Open Export chart; soft export each; compare labels.', expected: 'PNG/PDF/CSV soft; downloads soft; identity retained.' },
  { id: 'REG-MQ-UXM-019', submodule: 'A11y', title: 'Escape closes overlays; soft focus Filters chrome', steps: 'Open Filters; Escape; focus Filters.', expected: 'No stuck overlays.' },
  { id: 'REG-MQ-UXM-020', submodule: 'Responsive', title: '~1100px viewport keeps BI/UX Metrics reachable', steps: 'Resize 1100x900; assert widgets score.', expected: 'Score ≥3; UX Metrics soft.' },
  { id: 'REG-MQ-UXM-021', submodule: 'Recovery', title: 'Portal reload; re-open UX Metrics + GDC soft', steps: 'Reload; re-enter iframe; Search open UX Metrics.', expected: 'Healthy UX Metrics on GDC.' },
  { id: 'REG-MQ-UXM-022', submodule: 'Discrimination', title: 'Not Revenue / VitalPulse / VitalScope / CWV PoP / site dashboard', steps: 'Assert route + title.', expected: 'Only Monthly/Quarterly - UX Metrics in BI tool.' },
];

async function main() {
  const { path: written, count } = await writeRegressionManualWorkbook({
    outPath: path.join(process.cwd(), 'docs', 'Monthly_Quarterly_UX_Metrics_Regression.xlsx'),
    screenTitle: 'Monthly/Quarterly - UX Metrics',
    site: SITE,
    dc: DC,
    module: MODULE,
    typeLabel: 'Regression (reversible Comparison/End Date/filters + disposable Save As + soft export + Switch metric)',
    helpLine:
      'SoT = Help Period-over-Period Key Metrics Dashboards + live #bi-iframe probe. Suite home: Business Intelligence → Dashboards → Monthly/Quarterly - UX Metrics.',
    automation: AUTOMATION,
    executionStatus: EXECUTION_STATUS,
    executionNote: EXECUTION_NOTE,
    notes: [
      'Exact home: Advanced Reporting & Alerting / Custom Reporting / Business Intelligence / Dashboards / Monthly/Quarterly - UX Metrics.',
      'Never accept Monthly/Quarterly Revenue, CWV Top 10 PoP, VitalPulse, or VitalScope as suite home.',
      'All widgets/filters/export/Switch metric live inside #bi-iframe (jbi.bluetriangletech.com).',
      'Portal #toggle-filters is NOT BI Filters panel.',
      'Help/PDF UX Metrics: Onload, LCP, CLS, INP with comparative KPI + trendline (monthly + quarterly views).',
      'Live filters: Comparison Period, End Date, Browser, OS, Return/New Visitor, Percentile (p75), Bot/Device/Originated From.',
      'Live chrome: Refresh Data / Save As / Reset to Defaults; Switch metric gear; Export chart hamburger.',
      'Required: filter combos; Save As/Refresh/Reset; dashboard PNG/PDF/PPT soft; widget Switch metric + PNG/PDF/CSV soft.',
      'npm run test:regression:us2:monthly-quarterly-ux-metrics',
    ],
    cases: cases.map((c) => ({ ...c, module: MODULE, type: 'Regression' })),
  });
  console.log('Wrote', written, 'cases=', count);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
