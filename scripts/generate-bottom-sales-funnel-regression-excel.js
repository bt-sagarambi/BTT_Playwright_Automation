/**
 * Generates docs/Bottom_Of_The_Sales_Funnel_Analysis_Regression.xlsx
 * Sheets: Summary / Regression TCs / Notes
 *
 * Run: node scripts/generate-bottom-sales-funnel-regression-excel.js
 */
const path = require('path');
const fs = require('fs');
const { writeRegressionManualWorkbook } = require('./lib/regressionManualExcel');

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
  { id: 'REG-BSF-003', submodule: 'Context', title: 'Portal site GDC Test Site 2; Time Period / device badges present', steps: 'Confirm active profile site; capture #time-period-view / device / browser / OS / data-type badges when rendered; if badge strip empty, open Filters and soft-capture Path / Timezone / Visitor Type (or site context).', expected: 'Site matches GDC Test Site 2 (profile); at least one badge, filter-context label, or site-context text is non-empty. Soft-accept when badge strip is hidden on this build (filters/context fallback).' },
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
  const out = path.join(__dirname, '..', 'docs', 'Bottom_Of_The_Sales_Funnel_Analysis_Regression.xlsx');
  const { path: written, count } = await writeRegressionManualWorkbook({
    outPath: out,
    screenTitle: 'Bottom of the Sales Funnel Conversion Analysis',
    site: SITE,
    dc: DC,
    module: MODULE,
    typeLabel: 'Regression (read-only)',
    automation: AUTOMATION,
    executionStatus: EXECUTION_STATUS,
    executionNote: EXECUTION_NOTE,
    notes: [
      'Purpose: step-by-step late-funnel conversion analysis; path-based.',
      'Do not hard-code path/step names or conversion %. No Save Filter / permanent Create Path / Clear Cache.',
      'Badge strip may be empty — Filters path/context soft-fallback is acceptable (REG-BSF-003).',
      'POM: pages/BottomOfTheSalesFunnelAnalysisPage.ts | npm run test:regression:us2:bottom-sales-funnel',
    ],
    cases,
  });
  console.log(`Wrote ${written} (${count} cases)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
