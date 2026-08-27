/**
 * Generates docs/Site_Operations_Dashboard_for_Page_Names_Regression.xlsx
 * Sheets: Summary / Regression TCs / Notes
 *
 * Run: node scripts/generate-site-ops-page-names-excel.js
 */
const path = require('path');
const { writeRegressionManualWorkbook } = require('./lib/regressionManualExcel');

const SITE = 'GDC Test Site 2';
const DC = 'US';
const MODULE = 'Advanced Reporting — Custom Reporting — Business Intelligence';
const AUTOMATION =
  'tests/regression_tests/US2/advanced-reporting/custom-reporting/business-intelligence/site-ops-page-names/site.ops.page.names.regression.spec.ts';
const EXECUTION_STATUS = process.env.SOPN_EXECUTION_STATUS || 'Not Executed';
const EXECUTION_NOTE =
  process.env.SOPN_EXECUTION_NOTE ||
  'Run npm run test:regression:us2:site-ops-page-names and record live-data annotations from Allure.';

const cases = [
  { id: 'REG-SOPN-001', submodule: 'Navigation', title: 'Portal BI tool loads; title/route; no login redirect', steps: 'Login; Advanced Reporting > Custom Reporting > Business Intelligence.', expected: 'URL business-intelligence/tool; #page-title Business Intelligence; #bi-iframe attached.' },
  { id: 'REG-SOPN-002', submodule: 'Context', title: 'GDC Test Site 2; iframe ready; Page Names identity', steps: 'Wait #bi-iframe; Dashboards Search open Page Names.', expected: 'GDC soft; viewer title Site Operations Dashboard for Page Names.' },
  { id: 'REG-SOPN-003', submodule: 'Chrome', title: 'BI rail Favorites/Dashboards/AI Query/Charts/Schedules/Folders soft', steps: 'Inspect left rail in iframe.', expected: 'All rail labels soft-present.' },
  { id: 'REG-SOPN-004', submodule: 'Catalog', title: 'Dashboards Search finds Page Names (~8 widgets soft)', steps: 'Search Dashboard for Page Names; open card; clear sticky search.', expected: 'Matching card; open viewer; ~8 widgets annotate.' },
  { id: 'REG-SOPN-005', submodule: 'Catalog', title: 'List chrome folders/Local-UTC/Reset non-destructive', steps: 'Soft list toolbar; restore; re-open Page Names.', expected: 'No sticky list filter; Page Names reopened.' },
  { id: 'REG-SOPN-006', submodule: 'Sibling', title: 'Sibling Page Groups / Site Ops+CWV soft; restore Page Names', steps: 'Note sibling; re-open Page Names.', expected: 'Page Names viewer restored.' },
  { id: 'REG-SOPN-007', submodule: 'Viewer', title: 'Viewer title exact Page Names match', steps: 'Assert BI viewer title.', expected: '/Site Operations Dashboard for Page Names/i.' },
  { id: 'REG-SOPN-008', submodule: 'Charts', title: 'Monthly CWV soft LCP/CLS/INP + PAGE NAME tables', steps: 'Scroll widgets; assert titles/headers.', expected: '≥2 of LCP/CLS/INP; PAGE NAME + month headers soft.' },
  { id: 'REG-SOPN-009', submodule: 'Bands', title: 'Google CWV bands soft + Top Viewed Pages language', steps: 'Inspect charts/tables/subtitle.', expected: 'Bands soft or annotate color-only; subtitle soft.' },
  { id: 'REG-SOPN-010', submodule: 'Lookback', title: 'Lookback Period increase months + soft refresh', steps: 'Open Lookback; increase months; Apply/auto-apply.', expected: 'Widgets/month headers refresh soft or annotate identical.' },
  { id: 'REG-SOPN-011', submodule: 'Lookback', title: 'Lookback decrease; Reset to Defaults restore', steps: 'Decrease months; Reset to Defaults.', expected: 'Lookback restored toward baseline.' },
  { id: 'REG-SOPN-012', submodule: 'Filters', title: 'Device / Bot Traffic / Originated From sample + restore', steps: 'Sample Device/Bot/Originated From; Reset.', expected: 'Refresh soft; restored.' },
  { id: 'REG-SOPN-013', submodule: 'Filters', title: 'Page Name / Percentile 75th / Page Group sample + restore', steps: 'Sample Page Name; Percentile; Page Group; Reset.', expected: 'Soft Apply; Percentile 75th soft; restored.' },
  { id: 'REG-SOPN-014', submodule: 'Sort', title: 'Column sort PAGE NAME + month headers rearrange soft', steps: 'Click PAGE NAME and month headers; assert row order soft; Reset.', expected: 'Sort markers/order change or annotate equal values.' },
  { id: 'REG-SOPN-015', submodule: 'Lifecycle', title: 'Refresh Data soft settle; identity retained', steps: 'Click Refresh Data.', expected: 'Loading→ready; Page Names + GDC retained.' },
  { id: 'REG-SOPN-016', submodule: 'Lifecycle', title: 'Reset to Defaults after Lookback change', steps: 'Change Lookback; Reset to Defaults.', expected: 'Defaults restored or annotate Global lock.' },
  { id: 'REG-SOPN-017', submodule: 'Lifecycle', title: 'Save As disposable clone; verify; cleanup', steps: 'Save As SOPN-QA-<unique>; verify; delete if possible.', expected: 'Clone created; Global title not overwritten; cleanup.' },
  { id: 'REG-SOPN-018', submodule: 'Export', title: 'Export chart hamburger PNG/PDF/PPT|CSV soft vs UI', steps: 'Open Export chart; assert options; soft export each; compare labels to UI.', expected: 'PNG/PDF present; PPT soft or CSV annotate; downloads soft; identity retained.' },
  { id: 'REG-SOPN-019', submodule: 'A11y', title: 'Chart hover / Escape / focus Lookback|Refresh|sort soft', steps: 'Hover chart; Escape; focus controls.', expected: 'No stuck overlays.' },
  { id: 'REG-SOPN-020', submodule: 'Discrimination', title: 'Not Page Groups / VitalPulse / VitalScope / PoP / site dashboard', steps: 'Assert route + title.', expected: 'Only Site Operations Dashboard for Page Names in BI tool.' },
  { id: 'REG-SOPN-021', submodule: 'Combo', title: 'Lookback → filter → sort → Refresh → Reset soft', steps: 'Chain mutations; Reset.', expected: 'Page Names identity retained; filters restored soft.' },
  { id: 'REG-SOPN-022', submodule: 'Recovery', title: 'Portal reload; re-open Page Names + GDC soft', steps: 'Reload; re-enter iframe; Search open Page Names.', expected: 'Healthy Page Names on GDC.' },
  { id: 'REG-SOPN-023', submodule: 'Responsive', title: '~1100px viewport keeps BI title reachable', steps: 'Resize 1100x800; assert title.', expected: 'Business Intelligence reachable; Page Names soft.' },
  { id: 'REG-SOPN-024', submodule: 'Recovery', title: 'Restore baseline; clone cleanup; suite home healthy', steps: 'Reset/restore; delete clone; assert Page Names.', expected: 'Shared Page Names healthy; no leftover mutations.' },
];

async function main() {
  const { path: written, count } = await writeRegressionManualWorkbook({
    outPath: path.join(process.cwd(), 'docs', 'Site_Operations_Dashboard_for_Page_Names_Regression.xlsx'),
    screenTitle: 'Site Operations Dashboard for Page Names',
    site: SITE,
    dc: DC,
    module: MODULE,
    typeLabel: 'Regression (reversible Lookback/filter/sort + disposable Save As + soft export)',
    helpLine:
      'SoT = PDF Site Operations Report CWV top viewed pages + live #bi-iframe probe. Suite home: Business Intelligence → Dashboards → Site Operations Dashboard for Page Names.',
    automation: AUTOMATION,
    executionStatus: EXECUTION_STATUS,
    executionNote: EXECUTION_NOTE,
    notes: [
      'Exact home: Advanced Reporting & Alerting / Custom Reporting / Business Intelligence / Dashboards / Site Operations Dashboard for Page Names.',
      'Never accept Page Groups, Site Operations + CWV Trends, CWV Top 10 PoP, VitalPulse, or VitalScope as suite home.',
      'All widgets/filters/sort/export live inside #bi-iframe (jbi.bluetriangletech.com).',
      'Portal #toggle-filters is NOT BI Lookback Period.',
      'PDF: monthly CWV per page (LCP/CLS/INP charts+tables) + Google bands + Filter Options.',
      'Live: Lookback Last 3 Complete Months; Export chart → PNG/PDF/CSV (PPT soft-miss annotate).',
      'Required: Lookback ±; filter combos; Save As/Refresh/Reset; column sort; export soft cross-check.',
      'npm run test:regression:us2:site-ops-page-names',
    ],
    cases: cases.map((c) => ({ ...c, module: MODULE, type: 'Regression' })),
  });
  console.log('Wrote', written, 'cases=', count);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
