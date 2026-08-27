/**
 * Generates docs/CWV_Top10_Period_over_Period_PoP_Regression.xlsx
 * Sheets: Summary / Regression TCs / Notes
 *
 * Run: node scripts/generate-cwv-top10-pop-excel.js
 */
const path = require('path');
const { writeRegressionManualWorkbook } = require('./lib/regressionManualExcel');

const SITE = 'GDC Test Site 2';
const DC = 'US';
const MODULE = 'Advanced Reporting — Custom Reporting — Business Intelligence';
const AUTOMATION =
  'tests/regression_tests/US2/advanced-reporting/custom-reporting/business-intelligence/cwv-top10-pop/cwv.top10.pop.regression.spec.ts';
const EXECUTION_STATUS = process.env.CWV_POP_EXECUTION_STATUS || 'Not Executed';
const EXECUTION_NOTE =
  process.env.CWV_POP_EXECUTION_NOTE ||
  'Run npm run test:regression:us2:cwv-top10-pop and record live-data annotations from Allure.';

const cases = [
  { id: 'REG-CWV-POP-001', submodule: 'Navigation', title: 'Portal BI tool loads; title/route; no login redirect', steps: 'Login; Advanced Reporting & Alerting > Custom Reporting > Business Intelligence.', expected: 'URL business-intelligence/tool; #page-title Business Intelligence; #bi-iframe attached.' },
  { id: 'REG-CWV-POP-002', submodule: 'Context', title: 'GDC Test Site 2; iframe ready; PoP identity', steps: 'Wait #bi-iframe; open Dashboards Search PoP; assert title.', expected: 'GDC selected soft; viewer title CWV Top 10 Period over Period (PoP).' },
  { id: 'REG-CWV-POP-003', submodule: 'Chrome', title: 'BI rail Favorites/Dashboards/AI Query/Charts/Schedules/Folders soft', steps: 'Inspect left rail in iframe.', expected: 'All rail labels soft-present.' },
  { id: 'REG-CWV-POP-004', submodule: 'Catalog', title: 'Dashboards Search finds CWV Top 10 PoP (~13 widgets soft)', steps: 'Dashboards; Search CWV Top 10 Period; open card title; clear sticky search.', expected: 'Matching card; open viewer; ~13 widgets annotate.' },
  { id: 'REG-CWV-POP-005', submodule: 'Catalog', title: 'List chrome folders/Local-UTC/Reset non-destructive', steps: 'Soft exercise list toolbar; restore; re-open PoP.', expected: 'No sticky list filter; PoP reopened.' },
  { id: 'REG-CWV-POP-006', submodule: 'Sibling', title: 'Sibling Native App PoP / CWV Trends* soft; restore PoP', steps: 'Note sibling presence; re-open CWV Top 10 PoP.', expected: 'PoP viewer identity restored.' },
  { id: 'REG-CWV-POP-007', submodule: 'Viewer', title: 'Viewer title exact PoP match', steps: 'Assert BI viewer title.', expected: '/CWV Top 10 Period over Period (PoP)/i.' },
  { id: 'REG-CWV-POP-008', submodule: 'Charts', title: 'Five comparative charts soft (Page load/LCP/INP/CLS/Page views)', steps: 'Scroll widgets; assert titles/axes soft.', expected: '≥3 of 5 metric titles; annotate misses.' },
  { id: 'REG-CWV-POP-009', submodule: 'Tables', title: 'Comparative tables + Google bands + delta legend soft', steps: 'Inspect tables and legends.', expected: 'Bands Poor/Needs improvement/Good soft; delta >5%/<5%/Degradation soft.' },
  { id: 'REG-CWV-POP-010', submodule: 'Lookback', title: 'Lookback Period increase months + Apply + soft refresh', steps: 'Open Lookback; +1 month; Apply.', expected: 'Widgets settle; signature update or annotate identical.' },
  { id: 'REG-CWV-POP-011', submodule: 'Lookback', title: 'Lookback decrease + Apply; restore baseline', steps: 'Decrease months; Apply; Reset to Default if available.', expected: 'Lookback restored toward baseline.' },
  { id: 'REG-CWV-POP-012', submodule: 'Filters', title: 'Comparison Method/Period soft combo + Apply + restore', steps: 'Change Comparison Method/Period; Apply; Reset.', expected: 'Refresh soft; restored.' },
  { id: 'REG-CWV-POP-013', submodule: 'Filters', title: 'Device / Bot Traffic / Browser sample combos + restore', steps: 'Sample Device Desktop|Mobile; Bot; Browser; Reset.', expected: 'Apply refresh soft; baseline restored.' },
  { id: 'REG-CWV-POP-014', submodule: 'Filters', title: 'Originated from / Percentile 75th / Page Name sample + restore', steps: 'Sample Originated from; Percentile; Page Name; Reset.', expected: 'Soft Apply; Percentile 75th soft; restored.' },
  { id: 'REG-CWV-POP-015', submodule: 'Lifecycle', title: 'Refresh Data soft settle; identity retained', steps: 'Click Refresh Data.', expected: 'Loading→ready; PoP + GDC retained.' },
  { id: 'REG-CWV-POP-016', submodule: 'Lifecycle', title: 'Reset to Default after Lookback change', steps: 'Change Lookback; Reset to Default.', expected: 'Defaults restored or annotate Global lock.' },
  { id: 'REG-CWV-POP-017', submodule: 'Lifecycle', title: 'Save As disposable clone; verify; cleanup', steps: 'Save As CWV-PoP-QA-<unique>; verify; delete if possible.', expected: 'Clone created; shared Global title not overwritten; cleanup.' },
  { id: 'REG-CWV-POP-018', submodule: 'A11y', title: 'Chart hover / Escape / focus Lookback|Apply|Refresh soft', steps: 'Hover chart; Escape; focus controls.', expected: 'No stuck overlays.' },
  { id: 'REG-CWV-POP-019', submodule: 'Discrimination', title: 'Not VitalPulse / VitalScope / Native App PoP / site dashboard', steps: 'Assert route + title.', expected: 'Only CWV Top 10 PoP in BI tool.' },
  { id: 'REG-CWV-POP-020', submodule: 'Combo', title: 'Lookback → filter → sort → Refresh → Reset soft', steps: 'Chain Lookback, Device filter, Page Name sort, Refresh; Reset.', expected: 'PoP identity retained; filters/sort restored soft.' },
  { id: 'REG-CWV-POP-021', submodule: 'Recovery', title: 'Portal reload; re-open PoP + GDC soft', steps: 'Reload portal; re-enter iframe; Search open PoP.', expected: 'Healthy PoP on GDC.' },
  { id: 'REG-CWV-POP-022', submodule: 'Responsive', title: '~1100px viewport keeps BI title reachable', steps: 'Resize 1100x800; assert title.', expected: 'Business Intelligence reachable; PoP soft.' },
  { id: 'REG-CWV-POP-024', submodule: 'Sort', title: 'Column sort all visible grid headers; rows rearrange soft', steps: 'Click each sortable header on Page Name tables; assert row order soft; Reset.', expected: 'Headers clickable; order changes or annotate equal values.' },
  { id: 'REG-CWV-POP-025', submodule: 'Export', title: 'Export chart hamburger PNG/PDF/PowerPoint soft vs UI', steps: 'Open Export chart; assert PNG/PDF/PPT (or CSV); soft export; cross-check UI labels.', expected: 'Menu options soft; downloads soft; PoP identity + LCP/Page Name retained.' },
  { id: 'REG-CWV-POP-023', submodule: 'Recovery', title: 'Restore baseline; clone cleanup; suite home healthy', steps: 'Reset/restore; delete clone; assert PoP.', expected: 'Shared PoP healthy; no leftover mutations.' },
];

async function main() {
  const { path: written, count } = await writeRegressionManualWorkbook({
    outPath: path.join(process.cwd(), 'docs', 'CWV_Top10_Period_over_Period_PoP_Regression.xlsx'),
    screenTitle: 'CWV Top 10 Period over Period (PoP)',
    site: SITE,
    dc: DC,
    module: MODULE,
    typeLabel: 'Regression (reversible Lookback/filter/sort + disposable Save As + soft export)',
    helpLine:
      'SoT = PDF BI Dashboard CWV Top 10 PoP + live #bi-iframe probe. Suite home: Business Intelligence → Dashboards → CWV Top 10 Period over Period (PoP).',
    automation: AUTOMATION,
    executionStatus: EXECUTION_STATUS,
    executionNote: EXECUTION_NOTE,
    notes: [
      'Exact home: Advanced Reporting & Alerting / Custom Reporting / Business Intelligence / Dashboards / CWV Top 10 Period over Period (PoP).',
      'Never accept VitalPulse, VitalScope (Core Web Vitals), Native App Top 10 PoP, or portal site/dashboard as suite home.',
      'All widgets/filters/sort/export live inside #bi-iframe (jbi.bluetriangletech.com). Do not assert portal body alone.',
      'Portal #toggle-filters is NOT BI Lookback Period.',
      'PDF: 5 comparative charts (Page load, LCP, INP, CLS, Page views) + per-page tables + Google bands + delta legend.',
      'Catalog ~13 widgets soft; prefer PDF five + tables as primary inventory.',
      'Lookback ± months + Apply; filter combos; column sort all headers; Export chart PNG/PDF/PPT soft; Save As clone; Refresh Data; Reset to Default — restore all mutations.',
      'Do not create permanent Schedules / AI Query assets / overwrite Global PoP.',
      'npm run test:regression:us2:cwv-top10-pop',
    ],
    cases: cases.map((c) => ({ ...c, module: MODULE, type: 'Regression' })),
  });
  console.log('Wrote', written, 'cases=', count);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
