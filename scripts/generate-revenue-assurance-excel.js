/**
 * Generates docs/Revenue_Assurance_Dashboard_Regression.xlsx
 * Sheets: Summary / Regression TCs / Notes
 *
 * Run: node scripts/generate-revenue-assurance-excel.js
 */
const path = require('path');
const { writeRegressionManualWorkbook } = require('./lib/regressionManualExcel');

const SITE = 'GDC Test Site 2';
const DC = 'US';
const MODULE = 'Business Insights — Improve Revenue';
const AUTOMATION =
  'tests/regression_tests/US2/business-insights/improve-revenue/revenue-assurance/revenue.assurance.regression.spec.ts';
const EXECUTION_STATUS = process.env.RAS_EXECUTION_STATUS || 'Not Executed';
const EXECUTION_NOTE =
  process.env.RAS_EXECUTION_NOTE ||
  'Run npm run test:regression:us2:revenue-assurance and record live-data annotations from Allure.';

const cases = [
  { id: 'REG-RAS-001', submodule: 'Navigation', title: 'Page loads via BI Improve Revenue with correct title/route', steps: 'Login; Business Insights > Improve Revenue > Revenue Assurance.', expected: 'URL revenue-assurance/dashboard; title Revenue Assurance Dashboard.' },
  { id: 'REG-RAS-002', submodule: 'Context', title: 'GDC Test Site 2; core inventory settles', steps: 'Verify site and hero/donuts/cards/table hosts.', expected: 'GDC selected; core inventory soft ready.' },
  { id: 'REG-RAS-003', submodule: 'Chrome', title: 'Platform toggles All / Browser / iOS / Android present', steps: 'Inspect platform toggle row.', expected: 'All, Browser, iOS Native App, Android Native App visible.' },
  { id: 'REG-RAS-004', submodule: 'Chrome', title: 'Soft toggle Browser then restore All', steps: 'Select Browser; restore All.', expected: 'Dashboard re-scopes; All restored.' },
  { id: 'REG-RAS-005', submodule: 'Chrome', title: 'Soft sample iOS + Android; restore All', steps: 'Toggle iOS and Android; restore All.', expected: 'No sticky non-All platform.' },
  { id: 'REG-RAS-006', submodule: 'Chrome', title: 'Share open/cancel only', steps: 'Open Share; Cancel/Escape.', expected: 'No sticky share send.' },
  { id: 'REG-RAS-007', submodule: 'Chrome', title: 'Opportunity Factor / scaling Cancel only', steps: 'Open gear/factor; Cancel. Do not Save.', expected: 'No permanent scaling save.' },
  { id: 'REG-RAS-008', submodule: 'Hero', title: 'TOTAL ANNUALIZED OPPORTUNITY labels + formats soft', steps: 'Inspect hero card.', expected: 'Annualized + recognized progress/YTD/remaining; currency format soft.' },
  { id: 'REG-RAS-009', submodule: 'Hero', title: 'Hero Show Me shows all recommendation types', steps: 'Click hero Show Me; assert table / All status soft.', expected: 'Recommendations worklist with rows; filter All soft.' },
  { id: 'REG-RAS-010', submodule: 'Impact', title: 'Recommendations Impact donut + status inventory', steps: 'Inspect Recommendations Impact.', expected: 'Donut visible; New/In Progress/Implemented/(Declined/Internal*) soft.' },
  { id: 'REG-RAS-011', submodule: 'Impact', title: 'Status Show Me for data-bearing statuses; restore All', steps: 'Show Me each non-zero status; clear filter.', expected: 'Table filters to status; restored All.' },
  { id: 'REG-RAS-012', submodule: 'Platform', title: 'Opportunity by Platform + Browser Show Me soft', steps: 'Inspect platform donut; Browser Show Me.', expected: 'Platform donut; table soft filtered; restore.' },
  { id: 'REG-RAS-013', submodule: 'Cards', title: 'Revenue Opportunities section + card inventory', steps: 'List cards.', expected: 'Section visible; ≥1 card; classify non-zero vs zero.' },
  { id: 'REG-RAS-014', submodule: 'Cards', title: 'Non-zero card clickable; amount + AREAS sum; Show Me AREA', steps: 'Click non-zero card; compare amounts; AREAS; Show Me; Back.', expected: 'Amounts align soft; AREAS sum soft; restore home.' },
  { id: 'REG-RAS-015', submodule: 'Cards', title: 'Zero-value cards are not clickable', steps: 'Click $0 card.', expected: 'No recommendation_id deep drill.' },
  { id: 'REG-RAS-016', submodule: 'Cards', title: 'Coming Soon soft feedback Cancel only', steps: 'Open Coming Soon; Cancel.', expected: 'No permanent feedback submit.' },
  { id: 'REG-RAS-017', submodule: 'Table', title: 'All Recommendations table headers soft', steps: 'Scroll table; read headers.', expected: 'Recommendation/Category/Revenue Opp/Effort/Status/Platform/Date soft.' },
  { id: 'REG-RAS-018', submodule: 'Table', title: 'Table search soft then clear', steps: 'Search token; clear.', expected: 'Search applies; cleared before end.' },
  { id: 'REG-RAS-019', submodule: 'Detail', title: 'Internal Review Show Me → open record → detail chrome', steps: 'Internal Review Show Me; click row.', expected: 'recommendation_id URL; detail chrome.' },
  { id: 'REG-RAS-020', submodule: 'Detail', title: 'Overview / Action / History tabs soft', steps: 'Click each tab.', expected: 'Tabs switch; Overview shows Summary/Detailed Analysis soft.' },
  { id: 'REG-RAS-021', submodule: 'Detail', title: 'ID field deep-link opens same recommendation in new tab', steps: 'Copy ID link; open new tab.', expected: 'Same recommendation_id loads.' },
  { id: 'REG-RAS-022', submodule: 'Detail', title: 'Summary vs top-right stats soft consistency', steps: 'Compare summary and header amounts/status.', expected: 'Consistent soft (format-tolerant).' },
  { id: 'REG-RAS-023', submodule: 'Detail', title: 'Data Science SOURCE DATA table loads by default', steps: 'Open Data Science popup.', expected: 'Table headers/rows present or controlled empty annotate.' },
  { id: 'REG-RAS-024', submodule: 'Detail', title: 'Object Detail SOURCE DATA options reload table soft', steps: 'Open Object Detail; click options.', expected: 'Table refreshes soft; Close.' },
  { id: 'REG-RAS-025', submodule: 'Status', title: 'Internal Review → New count delta then restore', steps: 'Change status New; assert counts; restore Internal Review.', expected: 'IR −1 / New +1 soft; restored.' },
  { id: 'REG-RAS-026', submodule: 'Status', title: 'Soft status samples In Progress/Implemented/Declined/Internal Declined restore', steps: 'Sample each status; restore Internal Review.', expected: 'No sticky unrestored statuses.' },
  { id: 'REG-RAS-027', submodule: 'Filters', title: 'Filters drawer + My/Shared soft (no Save)', steps: 'Open Filters; My/Shared; Cancel.', expected: 'No Save Filter.' },
  { id: 'REG-RAS-028', submodule: 'A11y', title: 'Escape recovery; donut shells soft', steps: 'Open filters; Escape.', expected: 'Overlays close; charts visible.' },
  { id: 'REG-RAS-029', submodule: 'Sibling', title: 'Soft sibling Revenue Opportunity then restore RA', steps: 'Open RO; restore RA.', expected: 'Revenue Assurance Dashboard home.' },
  { id: 'REG-RAS-030', submodule: 'Sibling', title: 'Soft sibling Broken Links or Out of Stock then restore RA', steps: 'Open sibling; restore RA.', expected: 'RA identity retained.' },
  { id: 'REG-RAS-031', submodule: 'Responsive', title: '1100px viewport keeps hero reachable', steps: 'Resize; scroll hero.', expected: 'Title reachable.' },
  { id: 'REG-RAS-032', submodule: 'Recovery', title: 'Reload soft recovery; still RA + GDC', steps: 'Reload; re-assert.', expected: 'Healthy RA on GDC.' },
  { id: 'REG-RAS-033', submodule: 'Negative', title: 'Not Calculator / Opportunity / Attribution / Monitoring as home', steps: 'Assert route/title.', expected: 'RA dashboard only.' },
  {
    id: 'REG-RAS-034',
    submodule: 'Table',
    title: 'BUG-4870: All Recommendations table fits viewport (Internal Review; multi-width)',
    steps:
      'Internal Review Show Me (or hero Show Me); scroll #revenueAssuranceTable; hard assert 1440px; soft annotate 1280/1100.',
    expected:
      'At 1440px table fits wrapper (checkbox + Date not clipped; no horizontal overflow). 1280/1100px annotated soft (BUG-4870 / BTTS-3916).',
  },
  {
    id: 'REG-RAS-035',
    submodule: 'Chrome',
    title: 'BUG-4848: Improve Revenue ($) toolbar tooltip uses portal term',
    steps:
      'Read revenue portal term from page config; hover top-toolbar $ / Revenue Assurance icon; inspect title/bootstrap tooltip.',
    expected:
      'Tooltip reflects configured portal term (not hardcoded "revenue" when term customized); shows Revenue Assurance / Rev Assure label (BUG-4848 / BTTS-3886).',
  },
  { id: 'REG-RAS-036', submodule: 'Recovery', title: 'Restore initial context; suite home healthy', steps: 'restoreContext; assert.', expected: 'Healthy RA on GDC.' },
];

async function main() {
  const { path: written, count } = await writeRegressionManualWorkbook({
    outPath: path.join(process.cwd(), 'docs', 'Revenue_Assurance_Dashboard_Regression.xlsx'),
    screenTitle: 'Revenue Assurance Dashboard',
    site: SITE,
    dc: DC,
    module: MODULE,
    typeLabel: 'Regression (reversible status mutations only)',
    helpLine:
      'SoT = live probe + Help Center Revenue Assurance Product Overview. Suite home: Improve Revenue → Revenue Assurance Dashboard.',
    automation: AUTOMATION,
    executionStatus: EXECUTION_STATUS,
    executionNote: EXECUTION_NOTE,
    notes: [
      'Exact home: Business Insights / Improve Revenue / Revenue Assurance (route revenue-assurance/dashboard).',
      'Never accept Revenue Opportunity, Calculator, Attribution, Broken Links, or Monitoring as suite home.',
      'No Save Filter / Clear Genius Cache / permanent Clear|Generate Recommendations / permanent Scaling Save / permanent Jira create.',
      'Status changes must be restored (Internal Review sample preferred).',
      'Dollar amounts and status counts are live-data — never hard-code.',
      'Stable hosts: #recommendationsChart, #platformChart, #revenueAssuranceTable, #revenueAssuranceTable-table-viewport, #internal-review-records-btn, #recPerfViewDataModal.',
      'BUG-4870 (REG-RAS-034): All Recommendations table must fit viewport — checkbox + Date columns not clipped at 1440/1280/1100.',
      'BUG-4848 (REG-RAS-035): Top-toolbar $ icon tooltip must honor revenue portal term configuration.',
      'npm run test:regression:us2:revenue-assurance',
    ],
    cases: cases.map((c) => ({ ...c, module: MODULE, type: 'Regression' })),
  });
  console.log('Wrote', written, 'cases=', count);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
