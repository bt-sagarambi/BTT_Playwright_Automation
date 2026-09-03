/**
 * Generates docs/CWV_Top10_Summary_Onload_Chart_Regression.xlsx
 * Sheets: Summary / Regression TCs / Notes
 *
 * Run: node scripts/generate-cwv-top10-summary-onload-excel.js
 */
const path = require('path');
const { writeRegressionManualWorkbook } = require('./lib/regressionManualExcel');

const SITE = 'GDC Test Site 2';
const DC = 'US';
const MODULE = 'Advanced Reporting — Custom Reporting — Business Intelligence';
const AUTOMATION =
  'tests/regression_tests/US2/advanced-reporting/custom-reporting/business-intelligence/cwv-top10-summary-onload/cwv.top10.summary.onload.regression.spec.ts';
const EXECUTION_STATUS = process.env.CWV_SO_EXECUTION_STATUS || 'Not Executed';
const EXECUTION_NOTE =
  process.env.CWV_SO_EXECUTION_NOTE ||
  'Run npm run test:regression:us2:cwv-top10-summary-onload and record live-data annotations from Allure.';

const cases = [
  { id: 'REG-CWV-SO-001', submodule: 'Chart Builder', title: 'Chart Builder prerequisite then restore Onload', steps: 'Charts → Chart Builder; soft sample tables/axes/types/Options/Order By/Top N/Run Query; Back → Charts Search → CWV Top 10 Summary Onload.', expected: 'Builder chrome soft; Run Query may stay disabled until axes set; Onload viewer restored; no permanent Save.' },
  { id: 'REG-CWV-SO-002', submodule: 'Navigation', title: 'Portal BI tool loads; title/route; no login redirect', steps: 'Login; Advanced Reporting & Alerting > Custom Reporting > Business Intelligence.', expected: 'URL business-intelligence/tool; #page-title Business Intelligence; #bi-iframe attached.' },
  { id: 'REG-CWV-SO-003', submodule: 'Context', title: 'GDC Test Site 2; iframe ready; Onload identity', steps: 'Wait #bi-iframe; Charts Search open Onload; assert title.', expected: 'GDC selected soft; viewer title CWV Top 10 Summary Onload.' },
  { id: 'REG-CWV-SO-004', submodule: 'Chrome', title: 'BI rail Favorites/Dashboards/AI Query/Charts/Schedules/Folders soft', steps: 'Inspect left rail in iframe.', expected: 'All rail labels soft-present.' },
  { id: 'REG-CWV-SO-005', submodule: 'Catalog', title: 'Charts Search finds Onload; viewer chrome required', steps: 'Charts; Search Summary Onload; open card title; assert Export/Refresh/Lookback.', expected: 'Matching card; in viewer (not catalog-only); exact Onload title.' },
  { id: 'REG-CWV-SO-006', submodule: 'Catalog', title: 'List chrome folders/Local-UTC/Reset non-destructive', steps: 'Soft exercise Charts list toolbar; restore; re-open Onload.', expected: 'No sticky list filter; Onload reopened.' },
  { id: 'REG-CWV-SO-007', submodule: 'Sibling', title: 'Sibling plain Summary / CWV Trends by Page soft; restore Onload', steps: 'Note sibling presence; re-open CWV Top 10 Summary Onload.', expected: 'Onload viewer identity restored.' },
  { id: 'REG-CWV-SO-008', submodule: 'Viewer', title: 'Viewer title + Global + Prompt/Mode soft', steps: 'Assert BI viewer title and chrome.', expected: '/CWV Top 10 Summary Onload/i; not confused surfaces.' },
  { id: 'REG-CWV-SO-009', submodule: 'Tables', title: 'Comparative table headers + Data Table soft', steps: 'Assert Page Name|Onload|Page Hits|Current|Previous|Change; Data Table soft.', expected: '≥4 of 6 headers; annotate empty/sparse.' },
  { id: 'REG-CWV-SO-010', submodule: 'Filters', title: 'Filters inventory soft (Percentile/Device/Browser/…)', steps: 'Open Filters; assert inventory hosts.', expected: '≥ half of expected filter labels soft-present.' },
  { id: 'REG-CWV-SO-011', submodule: 'Lookback', title: 'Lookback Period change + soft refresh + restore', steps: 'Change Day/Week or preset; Apply; Reset to default.', expected: 'Table refresh soft; baseline restored.' },
  { id: 'REG-CWV-SO-012', submodule: 'Comparison', title: 'Comparison Directly Previous ↔ Same Time Last Year + restore', steps: 'Toggle Comparison chips; Reset.', expected: 'Current/Previous/Change coherent or empty controlled; restored.' },
  { id: 'REG-CWV-SO-013', submodule: 'Filters', title: 'Percentile / Device / Browser sample combos + restore', steps: 'Sample p75 + alternate; Device; Browser; Reset.', expected: 'Apply refresh soft; baseline restored.' },
  { id: 'REG-CWV-SO-014', submodule: 'Filters', title: 'Bot / OS / Origin / Page Name|Group sample + restore', steps: 'Sample Bot Traffic; OS; Originated From; Page Name; Page Group; Reset.', expected: 'Soft Apply; restored.' },
  { id: 'REG-CWV-SO-015', submodule: 'Filters', title: 'Return/New / Traffic Segment / Time Zone soft + restore', steps: 'Sample Return/New Visitor; Traffic Segment; Time Zone; Reset.', expected: 'Soft Apply; restored.' },
  { id: 'REG-CWV-SO-016', submodule: 'Export', title: 'Export ▾ PNG / PDF / CSV soft vs UI', steps: 'Open Export; assert PNG/PDF/CSV; soft trigger; cancel downloads.', expected: 'Menu options soft; Onload identity retained.' },
  { id: 'REG-CWV-SO-017', submodule: 'Lifecycle', title: 'Refresh Data soft settle; identity retained', steps: 'Click Refresh Data.', expected: 'Loading→ready; Onload + GDC retained; Data refreshed soft.' },
  { id: 'REG-CWV-SO-018', submodule: 'Lifecycle', title: 'Reset to default after Lookback change', steps: 'Change Lookback; Reset to default.', expected: 'Defaults restored or annotate Global lock.' },
  { id: 'REG-CWV-SO-019', submodule: 'Sort', title: 'Column sort soft + Escape overlays', steps: 'Click Page Name/Onload/Change/Page Hits headers; Escape.', expected: 'Order change or annotate equal; no stuck overlays.' },
  { id: 'REG-CWV-SO-020', submodule: 'Discrimination', title: 'Not VitalPulse / VitalScope / PoP / plain Summary as home', steps: 'Assert route + exact Onload title in viewer.', expected: 'Only CWV Top 10 Summary Onload in BI Charts viewer.' },
  { id: 'REG-CWV-SO-021', submodule: 'Combo', title: 'Lookback → filter → Refresh → Export → Reset soft', steps: 'Chain Lookback, Device filter, Refresh, Export menu; Reset.', expected: 'Onload identity retained; filters restored soft.' },
  { id: 'REG-CWV-SO-022', submodule: 'Recovery', title: 'Portal reload; re-open Onload + GDC soft', steps: 'Reload portal; re-enter iframe; Charts Search open Onload.', expected: 'Healthy Onload on GDC.' },
  { id: 'REG-CWV-SO-023', submodule: 'Responsive', title: '~1100px viewport keeps BI title reachable', steps: 'Resize 1100x800; assert title.', expected: 'Business Intelligence reachable; Onload soft.' },
  { id: 'REG-CWV-SO-024', submodule: 'Recovery', title: 'Restore baseline; suite home healthy', steps: 'Reset/restore; assert Onload.', expected: 'Shared Onload healthy; no leftover Lookback/filter mutations.' },
];

async function main() {
  const { path: written, count } = await writeRegressionManualWorkbook({
    outPath: path.join(process.cwd(), 'docs', 'CWV_Top10_Summary_Onload_Chart_Regression.xlsx'),
    screenTitle: 'CWV Top 10 Summary Onload',
    site: SITE,
    dc: DC,
    module: MODULE,
    typeLabel: 'Regression (Chart Builder soft + Lookback/Comparison/filters + Export/Refresh + restore)',
    helpLine:
      'SoT = live #bi-iframe Charts probe (Sep 2026). Suite home: Business Intelligence → Charts → CWV Top 10 Summary Onload. Soft sibling Help: Blue Triangle - Business Intelligence; Creating Dashboards and Looks.',
    automation: AUTOMATION,
    executionStatus: EXECUTION_STATUS,
    executionNote: EXECUTION_NOTE,
    notes: [
      'Exact home: Advanced Reporting & Alerting / Custom Reporting / Business Intelligence / Charts / CWV Top 10 Summary Onload.',
      'Never accept VitalPulse, VitalScope (Core Web Vitals), CWV Top 10 PoP dashboard, plain CWV Top 10 Summary, or portal site/dashboard as suite home.',
      'All chart Filters/Export/Refresh/Chart Builder live inside #bi-iframe (jbi.bluetriangletech.com). Do not assert portal body alone.',
      'Portal #toggle-filters is NOT BI chart Filters.',
      'Catalog click can match title without entering viewer — require Export / Refresh Data / Lookback chrome.',
      'Table: Page Name | Onload | Page Hits | Current | Previous | Change (+ Data Table soft).',
      'Chart Builder prerequisite before deep Onload scripts; do not Save shared Global chart; Run Query disabled until axes configured is expected.',
      'Lookback/Comparison/filter mutations + Export soft + Refresh Data — restore all mutations.',
      'Do not create permanent Schedules / AI Query assets / overwrite Global Onload chart.',
      'npm run test:regression:us2:cwv-top10-summary-onload',
    ],
    cases: cases.map((c) => ({ ...c, module: MODULE, type: 'Regression' })),
  });
  console.log('Wrote', written, 'cases=', count);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
