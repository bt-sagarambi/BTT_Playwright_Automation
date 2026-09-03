/**
 * Generates docs/URL_Category_Analysis_Regression.xlsx
 * Sheets: Summary / Regression TCs / Notes
 *
 * Run: node scripts/generate-url-category-analysis-excel.js
 */
const path = require('path');
const { writeRegressionManualWorkbook } = require('./lib/regressionManualExcel');

const SITE = 'GDC Test Site 2';
const DC = 'US';
const MODULE = 'Advanced Reporting — Custom Reporting — Business Intelligence';
const AUTOMATION =
  'tests/regression_tests/US2/advanced-reporting/custom-reporting/business-intelligence/url-category-analysis/url.category.analysis.regression.spec.ts';
const EXECUTION_STATUS = process.env.URL_CAT_EXECUTION_STATUS || 'Not Executed';
const EXECUTION_NOTE =
  process.env.URL_CAT_EXECUTION_NOTE ||
  'Run npm run test:regression:us2:url-category-analysis and record live-data annotations from Allure.';

const cases = [
  { id: 'REG-URL-CAT-001', submodule: 'Navigation', title: 'Portal BI tool loads; title/route; no login redirect', steps: 'Login; Advanced Reporting > Custom Reporting > Business Intelligence.', expected: 'URL business-intelligence/tool; #page-title Business Intelligence; #bi-iframe attached.' },
  { id: 'REG-URL-CAT-002', submodule: 'Context', title: 'GDC Test Site 2; iframe ready; URL Category Analysis identity', steps: 'Wait #bi-iframe; Dashboards Search open URL Category Analysis.', expected: 'GDC soft; viewer title URL Category Analysis.' },
  { id: 'REG-URL-CAT-003', submodule: 'Chrome', title: 'BI rail Favorites/Dashboards/AI Query/Charts/Schedules/Folders soft', steps: 'Inspect left rail in iframe.', expected: 'All rail labels soft-present.' },
  { id: 'REG-URL-CAT-004', submodule: 'Catalog', title: 'Dashboards Search finds URL Category Analysis (~9 widgets soft)', steps: 'Search URL Category; open card; clear sticky search.', expected: 'Matching card; open viewer; ~9 widgets annotate.' },
  { id: 'REG-URL-CAT-005', submodule: 'Catalog', title: 'List chrome folders/Local-UTC/Reset non-destructive', steps: 'Soft list toolbar; restore; re-open URL Category Analysis.', expected: 'No sticky list filter; dashboard reopened.' },
  { id: 'REG-URL-CAT-006', submodule: 'Sibling', title: 'Sibling Site Ops / CWV PoP soft; restore URL Category Analysis', steps: 'Note sibling; re-open URL Category Analysis.', expected: 'URL Category Analysis viewer restored.' },
  { id: 'REG-URL-CAT-007', submodule: 'Viewer', title: 'Viewer title exact; Global / Responsive Grid soft', steps: 'Assert BI viewer title + badges.', expected: '/URL Category Analysis/i; Global/Responsive Grid soft.' },
  { id: 'REG-URL-CAT-008', submodule: 'Widgets', title: 'Distribution chart + Daily table + Desktop/Mobile CWV URL tables', steps: 'Scroll widgets; assert titles/headers/series.', expected: 'Distribution + Daily + Desktop/Mobile; Good/Needs Improvement/Poor series.' },
  { id: 'REG-URL-CAT-009', submodule: 'Filters', title: 'Bot Traffic filter sample + restore', steps: 'Filters → Bot Traffic Non-Bot/Bot; assert refresh; Reset.', expected: 'Signature change or empty annotate; restored.' },
  { id: 'REG-URL-CAT-010', submodule: 'Filters', title: 'Origin filter sample + restore', steps: 'Filters → Origin RUM Browser/Native Webview; Reset.', expected: 'Soft refresh; restored.' },
  { id: 'REG-URL-CAT-011', submodule: 'Filters', title: 'Traffic Segment + Bot+Origin combo + restore', steps: 'Sample Traffic Segment; combine Bot+Origin; Reset.', expected: 'Widgets refresh soft; restored.' },
  { id: 'REG-URL-CAT-012', submodule: 'Lifecycle', title: 'Refresh Data soft settle; identity retained', steps: 'Click Refresh Data.', expected: 'Loading→ready; URL Category Analysis + GDC retained.' },
  { id: 'REG-URL-CAT-013', submodule: 'Lifecycle', title: 'Reset to Defaults after Bot/Origin change', steps: 'Change Bot/Origin; Reset to Defaults.', expected: 'Defaults restored or annotate Global lock.' },
  { id: 'REG-URL-CAT-014', submodule: 'Lifecycle', title: 'Save As disposable clone; verify; cleanup', steps: 'Save As URL-CAT-QA-<unique>; verify; delete if possible.', expected: 'Clone created; Global title not overwritten; cleanup.' },
  { id: 'REG-URL-CAT-015', submodule: 'Export', title: 'Hamburger PNG/PDF/PowerPoint soft vs UI', steps: 'Open top-right export; assert options; soft export each; compare labels to UI.', expected: 'PNG/PDF present; PPT soft; downloads soft; identity retained.' },
  { id: 'REG-URL-CAT-016', submodule: 'Sort', title: 'Daily Distribution column sort soft', steps: 'Click DATE and GOOD URL COUNT headers; assert first-page order soft; Reset.', expected: 'Sort markers/order change or annotate equal values.' },
  { id: 'REG-URL-CAT-017', submodule: 'Sort', title: 'Desktop/Mobile CWV URL table column sort soft', steps: 'Click HITS / CATEGORY / LCP headers; assert first-page reorder soft.', expected: 'Visible row order/markers change or annotate virtualized.' },
  { id: 'REG-URL-CAT-018', submodule: 'Legend', title: 'Good/Needs Improvement/Poor series toggle (green/yellow/red)', steps: 'Click each legend series; restore all three.', expected: 'Series hide/show soft; all restored before end.' },
  { id: 'REG-URL-CAT-019', submodule: 'A11y', title: 'Escape closes overlays; soft focus Filters', steps: 'Open Filters; Escape; focus Filters.', expected: 'No stuck overlays.' },
  { id: 'REG-URL-CAT-020', submodule: 'Responsive', title: '~1100px viewport keeps BI title reachable', steps: 'Resize 1100x800; assert widgets score.', expected: 'Business Intelligence reachable; URL Category Analysis soft.' },
  { id: 'REG-URL-CAT-021', submodule: 'Recovery', title: 'Portal reload; re-open URL Category Analysis + GDC soft', steps: 'Reload; re-enter iframe; Search open dashboard.', expected: 'Healthy URL Category Analysis on GDC.' },
  { id: 'REG-URL-CAT-022', submodule: 'Discrimination', title: 'Not Site Ops / VitalPulse / VitalScope / CWV PoP', steps: 'Assert route + title.', expected: 'Only URL Category Analysis in BI tool.' },
];

async function main() {
  const { path: written, count } = await writeRegressionManualWorkbook({
    outPath: path.join(process.cwd(), 'docs', 'URL_Category_Analysis_Regression.xlsx'),
    screenTitle: 'URL Category Analysis',
    site: SITE,
    dc: DC,
    module: MODULE,
    typeLabel: 'Regression (reversible Bot/Origin/Segment filters + sort + legend + disposable Save As + soft export)',
    helpLine:
      'SoT = Help Core Web Vital URL Volume + live #bi-iframe probe. Suite home: Business Intelligence → Dashboards → URL Category Analysis.',
    automation: AUTOMATION,
    executionStatus: EXECUTION_STATUS,
    executionNote: EXECUTION_NOTE,
    notes: [
      'Exact home: Advanced Reporting & Alerting / Custom Reporting / Business Intelligence / Dashboards / URL Category Analysis.',
      'Help title Core Web Vital URL Volume maps to live catalog title URL Category Analysis.',
      'Never accept Site Ops Page Names/Groups, CWV Top 10 PoP, VitalPulse, or VitalScope as suite home.',
      'All widgets/filters/sort/legend/export live inside #bi-iframe (jbi.bluetriangletech.com).',
      'Portal #toggle-filters is NOT BI dashboard Filters.',
      'Widgets: URL Performance Category Distribution; Daily Distribution; CWV Performance by URL Desktop/Mobile.',
      'Required: Bot Traffic/Origin/Traffic Segment combos; Save As/Refresh/Reset; column sort; legend Good/Needs/Poor; PNG/PDF/PPT soft.',
      'npm run test:regression:us2:url-category-analysis',
    ],
    cases: cases.map((c) => ({ ...c, module: MODULE, type: 'Regression' })),
  });
  console.log('Wrote', written, 'cases=', count);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
