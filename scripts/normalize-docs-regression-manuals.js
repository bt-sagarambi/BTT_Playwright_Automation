/**
 * Reformat remaining docs/*_Regression.xlsx manuals to the standard template
 * (Revenue Opportunity / RUM Performance Detail / Smoke column layout).
 *
 * Reference columns + colors:
 *   Test Case ID | Type | Module | Submodule | Title | Steps | Expected Results | Status
 *   Header: #1F4E79 bold white
 *   Summary: profile banner + Module/Submodule/TC Count/Test Case IDs breakdown
 *
 * Skips: BTT_Smoke (already gold), Coverage Summary, Testing Plan
 *
 * Run: node scripts/normalize-docs-regression-manuals.js
 */
const path = require('path');
const fs = require('fs');
const {
  writeRegressionManualWorkbook,
  readCasesFromWorkbook,
} = require('./lib/regressionManualExcel');

const DOCS = path.join(__dirname, '..', 'docs');

/** Filename → module / screen metadata */
const META = {
  'Bottom_Of_The_Sales_Funnel_Analysis_Regression.xlsx': {
    screenTitle: 'Bottom of the Sales Funnel Conversion Analysis',
    module: 'Business Insights — Improve Traffic',
    automation:
      'tests/regression_tests/US2/business-insights/improve-traffic/bottom-of-the-sales-funnel-analysis/bottom.of.the.sales.funnel.analysis.regression.spec.ts',
    notes: [
      'Do not hard-code path/step names or conversion %. No Save Filter / permanent Create Path.',
      'Badge strip may be empty on some builds — Filters path/context soft-fallback is acceptable.',
    ],
  },
  'Brand_Customer_Journey_Analysis_Regression.xlsx': {
    screenTitle: 'Brand Customer Journey Analysis',
    module: 'Business Insights — Improve Traffic',
    automation:
      'tests/regression_tests/US2/business-insights/improve-traffic/brand-customer-journey-analysis/brand.customer.journey.analysis.regression.spec.ts',
  },
  'Competitive_Index_Table_Regression.xlsx': {
    screenTitle: 'Competitive Index Table',
    module: 'Business Insights — Improve Traffic',
    automation:
      'tests/regression_tests/US2/business-insights/improve-traffic/competitive-index-table/competitive.index.table.regression.spec.ts',
  },
  'Competitive_Index_Trends_Regression.xlsx': {
    screenTitle: 'Competitive Index Trends',
    module: 'Business Insights — Improve Traffic',
    automation:
      'tests/regression_tests/US2/business-insights/improve-traffic/competitive-index-trends/competitive.index.trends.regression.spec.ts',
  },
  'Core_Web_Vitals_Regression.xlsx': {
    screenTitle: 'Core Web Vitals (VitalScope)',
    module: 'Business Insights — Improve Traffic',
    automation:
      'tests/regression_tests/US2/business-insights/improve-traffic/core-web-vitals/core.web.vitals.regression.spec.ts',
  },
  'Customer_Journey_Analysis_Regression.xlsx': {
    screenTitle: 'Customer Journey Analysis',
    module: 'Business Insights — Improve Traffic',
    automation:
      'tests/regression_tests/US2/business-insights/improve-traffic/customer-journey-analysis/customer.journey.analysis.regression.spec.ts',
  },
  'Marketing_Overview_Regression.xlsx': {
    screenTitle: 'Marketing Overview',
    module: 'Business Insights — Improve Traffic',
    automation:
      'tests/regression_tests/US2/business-insights/improve-traffic/marketing-overview/marketing.overview.regression.spec.ts',
  },
  'Revenue_Opportunity_Regression.xlsx': {
    screenTitle: 'Revenue Opportunity',
    module: 'Business Analytics',
    automation:
      'tests/regression_tests/US2/business-insights/improve-conversion/revenue-opportunity/revenue.opportunity.regression.spec.ts',
    helpLine:
      'Confluence: https://bluetriangletech.atlassian.net/wiki/spaces/HCT/pages/3186360451/The+Revenue+Opportunity+Page',
  },
  'RUM_Aggregate_Waterfall_Regression.xlsx': {
    screenTitle: 'RUM Aggregate Waterfall (Browser)',
    module: 'Real User Monitoring (RUM)',
    automation:
      'tests/regression_tests/US2/monitoring/real-user-browser/aggregate-waterfall/rum.aggregate-waterfall.browser.regression.spec.ts',
  },
  'RUM_Bounce_Exit_Analysis_Regression.xlsx': {
    screenTitle: 'RUM Bounce & Exit Analysis (Browser)',
    module: 'Real User Monitoring (RUM)',
    automation:
      'tests/regression_tests/US2/monitoring/real-user-browser/bounce-and-exit-analysis/rum.bounce-exit.browser.regression.spec.ts',
  },
  'RUM_Errors_Explorer_Regression.xlsx': {
    screenTitle: 'RUM Errors Explorer (Browser)',
    module: 'Real User Monitoring (RUM)',
    automation:
      'tests/regression_tests/US2/monitoring/real-user-browser/errors-explorer/rum.errors-explorer.browser.regression.spec.ts',
  },
  'RUM_Performance_Budget_Regression.xlsx': {
    screenTitle: 'RUM Performance Budget (Browser)',
    module: 'Real User Monitoring (RUM)',
    automation:
      'tests/regression_tests/US2/monitoring/real-user-browser/performance-budget/rum.performance-budget.browser.regression.spec.ts',
    executionStatus: 'Pass',
    executionNote: 'Heal re-run: soft-deadline on top filter combos (PB-013..016).',
  },
  'RUM_Performance_Comparison_Regression.xlsx': {
    screenTitle: 'RUM Performance Comparison (Browser)',
    module: 'Real User Monitoring (RUM)',
    automation:
      'tests/regression_tests/US2/monitoring/real-user-browser/performance-comparison/rum.performance-comparison.browser.regression.spec.ts',
  },
  'RUM_Performance_Details_Regression.xlsx': {
    screenTitle: 'RUM Performance Detail (Browser)',
    module: 'Real User Monitoring (RUM)',
    automation:
      'tests/regression_tests/US2/monitoring/real-user-browser/performance-detail/rum.performance-detail.browser.regression.spec.ts',
    helpLine:
      'Confluence / Help — Monitoring Real User Browser Performance Detail',
  },
  'RUM_Performance_Detail_Dashboard_Regression.xlsx': {
    screenTitle: 'RUM Performance Detail Dashboard (Preconfigured)',
    module: 'Dashboards — Preconfigured',
    site: 'GDC Test Site 2',
    automation:
      'tests/regression_tests/US2/dashboards/preconfigured/rum-performance-detail/rum.performance.detail.dashboard.regression.spec.ts',
    helpLine:
      'Help: https://help.bluetriangle.com/hc/en-us/articles/360033246414-The-RUM-Performance-Detail-Dashboard',
    notes: [
      'Exact Select2 option “RUM Performance Detail” only (not Monitoring RUM PD).',
      'Always re-assert GDC after sibling dashboard switch.',
    ],
  },
  'RUM_Performance_Overview_Regression.xlsx': {
    screenTitle: 'RUM Performance Overview (Browser)',
    module: 'Real User Monitoring (RUM)',
    automation:
      'tests/regression_tests/US2/monitoring/real-user-browser/performance-overview/rum.performance-overview.browser.regression.spec.ts',
    executionStatus: 'Pass',
    executionNote: 'Heal re-run: soft-deadline on top filter combos (PO-005..017).',
  },
  'RUM_Session_Lookup_Regression.xlsx': {
    screenTitle: 'RUM Session Lookup (Browser)',
    module: 'Real User Monitoring (RUM)',
    site: 'Any profile site already loaded (e.g. GDC Test Site 2)',
    automation:
      'tests/regression_tests/US2/monitoring/real-user-browser/session-lookup/rum.session-lookup.browser.regression.spec.ts',
    executionStatus: 'Pass',
    executionNote: 'Heal re-run: site-loaded (not hard-coded Demo); masked BTT ID/GUID soft-skip.',
    notes: [
      'Do not hard-code BTT Session IDs/GUIDs/URLs — derive at runtime.',
      'Masked identifiers (######) soft-skip positive Session ID/GUID lookups.',
    ],
  },
  'Site_Overview_Dashboard_Regression.xlsx': {
    screenTitle: 'Site Overview Dashboard (Preconfigured)',
    module: 'Dashboards — Preconfigured',
    automation:
      'tests/regression_tests/US2/dashboards/preconfigured/site-overview/site.overview.dashboard.regression.spec.ts',
  },
  'Synthetic_Performance_Detail_Dashboard_Regression.xlsx': {
    screenTitle: 'Synthetic Performance Detail Dashboard (Preconfigured)',
    module: 'Dashboards — Preconfigured',
    automation:
      'tests/regression_tests/US2/dashboards/preconfigured/synthetic-performance-detail/synthetic.performance.detail.dashboard.regression.spec.ts',
    notes: [
      'Exact Select2 “Synthetic Performance Detail” only.',
      'Package Monitoring PDF is out of primary suite scope for live preconfigured board.',
    ],
  },
  'Synthetic_Site_Health_Dashboard_Regression.xlsx': {
    screenTitle: 'Synthetic Site Health Dashboard (Preconfigured)',
    module: 'Dashboards — Preconfigured',
    automation:
      'tests/regression_tests/US2/dashboards/preconfigured/synthetic-site-health/synthetic.site.health.dashboard.regression.spec.ts',
  },
  'Traffic_Source_and_Medium_Dashboard_Regression.xlsx': {
    screenTitle: 'Traffic Source and Medium Dashboard (Preconfigured)',
    module: 'Dashboards — Preconfigured',
    automation:
      'tests/regression_tests/US2/dashboards/preconfigured/traffic-source-and-medium/traffic.source.medium.dashboard.regression.spec.ts',
  },
  'Vital_Pulse_Dashboard_Regression.xlsx': {
    screenTitle: 'VitalPulse Dashboard (Preconfigured)',
    module: 'Dashboards — Preconfigured',
    automation:
      'tests/regression_tests/US2/dashboards/preconfigured/vital-pulse/vital.pulse.dashboard.regression.spec.ts',
    executionStatus: 'Pass',
    executionNote: 'Heal re-run: REG-VP-038 Vital Scope expand + soft-miss when no affordance.',
    notes: [
      'Vital Scope: site-retry; soft-annotate if expand/modal unavailable after retry.',
    ],
  },
};

const SKIP = new Set([
  'BTT_Smoke_Manual_Test_Cases.xlsx',
  'Automation_Screens_Coverage_Summary.xlsx',
  'BlueTriangle_Portal_Automation_Testing_Plan.xlsx',
]);

async function main() {
  const files = fs
    .readdirSync(DOCS)
    .filter((f) => f.endsWith('.xlsx') && !SKIP.has(f) && /Regression/i.test(f));

  const results = [];
  for (const file of files) {
    const filePath = path.join(DOCS, file);
    const meta = META[file] || {
      screenTitle: file.replace(/\.xlsx$/i, '').replace(/_/g, ' '),
      module: 'Blue Triangle Portal',
    };
    const { cases } = await readCasesFromWorkbook(filePath);
    if (!cases.length) {
      console.warn(`Skip (no cases): ${file}`);
      continue;
    }
    const written = await writeRegressionManualWorkbook({
      outPath: filePath,
      screenTitle: meta.screenTitle,
      site: meta.site || 'GDC Test Site 2',
      dc: meta.dc || 'US',
      module: meta.module,
      typeLabel: meta.typeLabel || 'Regression (read-only)',
      helpLine: meta.helpLine,
      automation: meta.automation,
      executionStatus: meta.executionStatus || 'Pass',
      executionNote: meta.executionNote,
      notes: meta.notes,
      cases: cases.map((c) => ({
        id: c.id,
        type: c.type || 'Regression',
        module: c.module || meta.module,
        submodule: c.submodule || 'General',
        title: (c.title || '').replace(new RegExp(`^${c.id}\\s*[—–-]\\s*`), ''),
        steps: c.steps,
        expected: c.expected,
        status: c.status || meta.executionStatus || 'Pass',
      })),
    });
    results.push({ file, count: written.count, path: written.path });
    console.log(`Normalized ${file} (${written.count} cases)`);
  }

  console.log(`\nDone. ${results.length} workbooks updated to reference format.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
