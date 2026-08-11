/**
 * Generate docs/Automation_Screens_Coverage_Summary.xlsx
 * Inventory of regression + smoke screens with test case counts.
 */
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.spec\.ts$/.test(e.name)) acc.push(p);
  }
  return acc;
}

function countTests(file) {
  const t = fs.readFileSync(file, 'utf8');
  const m = t.match(/\btest\s*\(\s*['`"]/g) || [];
  return m.length;
}

// Smoke catalog length (dynamic page smokes)
function smokeCatalogCount() {
  const t = fs.readFileSync(path.join('config', 'smokeCatalog.ts'), 'utf8');
  const ids = t.match(/id:\s*'[^']+'/g) || [];
  return ids.length;
}

function countNavChrome() {
  return countTests(path.join('tests', 'smoke_tests', 'nav.chrome.smoke.spec.ts'));
}

function countMenuSubmenu() {
  const f = path.join('tests', 'smoke_tests', 'menu-submenu-navigation.smoke.spec.ts');
  return fs.existsSync(f) ? countTests(f) : 0;
}

function countDxoSmoke() {
  const f = path.join('tests', 'smoke_tests', 'digital-experience-overview.smoke.spec.ts');
  return fs.existsSync(f) ? countTests(f) : 0;
}

const smokePageCount = smokeCatalogCount();

/** @type {Array<{module:string, subModule:string, screen:string, scripts:number, status:string, type:string}>} */
const rows = [
  // --- Login / Auth ---
  {
    module: 'Common / Auth',
    subModule: 'Login',
    screen: 'Portal Login',
    scripts: countTests(path.join('tests', 'common', 'login.spec.ts')),
    status: 'Completed',
    type: 'Smoke/Common',
  },
  // --- Smoke ---
  {
    module: 'Smoke',
    subModule: 'Portal navigation',
    screen: 'Portal page loads (catalog — 1 TC per nav page)',
    scripts: smokePageCount, // dynamically generated from catalog; + integrity is separate
    status: 'Completed',
    type: 'Smoke',
  },
  {
    module: 'Smoke',
    subModule: 'Portal navigation',
    screen: 'Smoke catalog integrity check',
    scripts: 1,
    status: 'Completed',
    type: 'Smoke',
  },
  {
    module: 'Smoke',
    subModule: 'Chrome / shell',
    screen: 'Nav chrome smoke (site, global chrome)',
    scripts: countNavChrome(),
    status: 'Completed',
    type: 'Smoke',
  },
  {
    module: 'Smoke',
    subModule: 'Menu',
    screen: 'Menu / submenu navigation smoke',
    scripts: countMenuSubmenu(),
    status: 'Completed',
    type: 'Smoke',
  },
  {
    module: 'Smoke',
    subModule: 'Executive',
    screen: 'Digital Experience Overview (dedicated smoke)',
    scripts: countDxoSmoke(),
    status: 'Completed',
    type: 'Smoke',
  },

  // --- Monitoring RUM ---
  {
    module: 'Monitoring',
    subModule: 'Real User Browser',
    screen: 'Performance Detail',
    scripts: countTests(
      path.join(
        'tests',
        'regression_tests',
        'US2',
        'monitoring',
        'real-user-browser',
        'performance-detail',
        'rum.performance-detail.browser.regression.spec.ts'
      )
    ),
    status: 'Completed',
    type: 'Regression',
  },
  {
    module: 'Monitoring',
    subModule: 'Real User Browser',
    screen: 'Performance Overview',
    scripts: countTests(
      path.join(
        'tests',
        'regression_tests',
        'US2',
        'monitoring',
        'real-user-browser',
        'performance-overview',
        'rum.performance-overview.browser.regression.spec.ts'
      )
    ),
    status: 'Completed',
    type: 'Regression',
  },
  {
    module: 'Monitoring',
    subModule: 'Real User Browser',
    screen: 'Page Performance Comparison',
    scripts: countTests(
      path.join(
        'tests',
        'regression_tests',
        'US2',
        'monitoring',
        'real-user-browser',
        'performance-comparison',
        'rum.performance-comparison.browser.regression.spec.ts'
      )
    ),
    status: 'Completed',
    type: 'Regression',
  },
  {
    module: 'Monitoring',
    subModule: 'Real User Browser',
    screen: 'Aggregate Waterfall',
    scripts: countTests(
      path.join(
        'tests',
        'regression_tests',
        'US2',
        'monitoring',
        'real-user-browser',
        'aggregate-waterfall',
        'rum.aggregate-waterfall.browser.regression.spec.ts'
      )
    ),
    status: 'Completed',
    type: 'Regression',
  },
  {
    module: 'Monitoring',
    subModule: 'Real User Browser',
    screen: 'Bounce and Exit Analysis',
    scripts: countTests(
      path.join(
        'tests',
        'regression_tests',
        'US2',
        'monitoring',
        'real-user-browser',
        'bounce-and-exit-analysis',
        'rum.bounce-exit.browser.regression.spec.ts'
      )
    ),
    status: 'Completed',
    type: 'Regression',
  },
  {
    module: 'Monitoring',
    subModule: 'Real User Browser',
    screen: 'Errors Explorer',
    scripts: countTests(
      path.join(
        'tests',
        'regression_tests',
        'US2',
        'monitoring',
        'real-user-browser',
        'errors-explorer',
        'rum.errors-explorer.browser.regression.spec.ts'
      )
    ),
    status: 'Completed',
    type: 'Regression',
  },
  {
    module: 'Monitoring',
    subModule: 'Real User Browser',
    screen: 'Performance Budgets',
    scripts: countTests(
      path.join(
        'tests',
        'regression_tests',
        'US2',
        'monitoring',
        'real-user-browser',
        'performance-budget',
        'rum.performance-budget.browser.regression.spec.ts'
      )
    ),
    status: 'Completed',
    type: 'Regression',
  },
  {
    module: 'Monitoring',
    subModule: 'Real User Browser',
    screen: 'Session Lookup',
    scripts: countTests(
      path.join(
        'tests',
        'regression_tests',
        'US2',
        'monitoring',
        'real-user-browser',
        'session-lookup',
        'rum.session-lookup.browser.regression.spec.ts'
      )
    ),
    status: 'Completed',
    type: 'Regression',
  },

  // --- Business Insights ---
  {
    module: 'Business Insights',
    subModule: 'Improve Conversion',
    screen: 'Revenue Opportunity',
    scripts: countTests(
      path.join(
        'tests',
        'regression_tests',
        'US2',
        'business-insights',
        'improve-conversion',
        'revenue-opportunity',
        'revenue.opportunity.regression.spec.ts'
      )
    ),
    status: 'Completed',
    type: 'Regression',
  },
  {
    module: 'Business Insights',
    subModule: 'Improve Traffic',
    screen: 'Marketing Overview',
    scripts: countTests(
      path.join(
        'tests',
        'regression_tests',
        'US2',
        'business-insights',
        'improve-traffic',
        'marketing-overview',
        'marketing.overview.regression.spec.ts'
      )
    ),
    status: 'Completed',
    type: 'Regression',
  },
  {
    module: 'Business Insights',
    subModule: 'Improve Traffic',
    screen: 'Core Web Vitals',
    scripts: countTests(
      path.join(
        'tests',
        'regression_tests',
        'US2',
        'business-insights',
        'improve-traffic',
        'core-web-vitals',
        'core.web.vitals.regression.spec.ts'
      )
    ),
    status: 'Completed',
    type: 'Regression',
  },
  {
    module: 'Business Insights',
    subModule: 'Improve Traffic',
    screen: 'Customer Journey Analysis',
    scripts: countTests(
      path.join(
        'tests',
        'regression_tests',
        'US2',
        'business-insights',
        'improve-traffic',
        'customer-journey-analysis',
        'customer.journey.analysis.regression.spec.ts'
      )
    ),
    status: 'Completed',
    type: 'Regression',
  },
  {
    module: 'Business Insights',
    subModule: 'Improve Traffic',
    screen: 'Brand Customer Journey Analysis',
    scripts: countTests(
      path.join(
        'tests',
        'regression_tests',
        'US2',
        'business-insights',
        'improve-traffic',
        'brand-customer-journey-analysis',
        'brand.customer.journey.analysis.regression.spec.ts'
      )
    ),
    status: 'Completed',
    type: 'Regression',
  },
  {
    module: 'Business Insights',
    subModule: 'Improve Traffic',
    screen: 'Competitive Index Table',
    scripts: countTests(
      path.join(
        'tests',
        'regression_tests',
        'US2',
        'business-insights',
        'improve-traffic',
        'competitive-index-table',
        'competitive.index.table.regression.spec.ts'
      )
    ),
    status: 'Completed',
    type: 'Regression',
  },
  {
    module: 'Business Insights',
    subModule: 'Improve Traffic',
    screen: 'Competitive Index Trends',
    scripts: countTests(
      path.join(
        'tests',
        'regression_tests',
        'US2',
        'business-insights',
        'improve-traffic',
        'competitive-index-trends',
        'competitive.index.trends.regression.spec.ts'
      )
    ),
    status: 'Completed',
    type: 'Regression',
  },
  {
    module: 'Business Insights',
    subModule: 'Improve Traffic',
    screen: 'Bottom of the Sales Funnel Analysis',
    scripts: countTests(
      path.join(
        'tests',
        'regression_tests',
        'US2',
        'business-insights',
        'improve-traffic',
        'bottom-of-the-sales-funnel-analysis',
        'bottom.of.the.sales.funnel.analysis.regression.spec.ts'
      )
    ),
    status: 'Completed',
    type: 'Regression',
  },

  // --- Dashboards (Preconfigured) ---
  {
    module: 'Dashboards',
    subModule: 'Preconfigured',
    screen: 'Site Overview Dashboard',
    scripts: countTests(
      path.join(
        'tests',
        'regression_tests',
        'US2',
        'dashboards',
        'preconfigured',
        'site-overview',
        'site.overview.dashboard.regression.spec.ts'
      )
    ),
    status: 'Completed',
    type: 'Regression',
  },
  {
    module: 'Dashboards',
    subModule: 'Preconfigured',
    screen: 'VitalPulse Dashboard',
    scripts: countTests(
      path.join(
        'tests',
        'regression_tests',
        'US2',
        'dashboards',
        'preconfigured',
        'vital-pulse',
        'vital.pulse.dashboard.regression.spec.ts'
      )
    ),
    status: 'Completed',
    type: 'Regression',
  },
  {
    module: 'Dashboards',
    subModule: 'Preconfigured',
    screen: 'Synthetic Site Health Dashboard',
    scripts: countTests(
      path.join(
        'tests',
        'regression_tests',
        'US2',
        'dashboards',
        'preconfigured',
        'synthetic-site-health',
        'synthetic.site.health.dashboard.regression.spec.ts'
      )
    ),
    status: 'Completed',
    type: 'Regression',
  },
  {
    module: 'Dashboards',
    subModule: 'Preconfigured',
    screen: 'Traffic Source and Medium Dashboard',
    scripts: countTests(
      path.join(
        'tests',
        'regression_tests',
        'US2',
        'dashboards',
        'preconfigured',
        'traffic-source-and-medium',
        'traffic.source.medium.dashboard.regression.spec.ts'
      )
    ),
    status: 'Completed',
    type: 'Regression',
  },
  {
    module: 'Dashboards',
    subModule: 'Preconfigured',
    screen: 'RUM Performance Detail Dashboard',
    scripts: countTests(
      path.join(
        'tests',
        'regression_tests',
        'US2',
        'dashboards',
        'preconfigured',
        'rum-performance-detail',
        'rum.performance.detail.dashboard.regression.spec.ts'
      )
    ),
    status: 'Completed',
    type: 'Regression',
  },
  {
    module: 'Dashboards',
    subModule: 'Preconfigured',
    screen: 'Synthetic Performance Detail Dashboard',
    scripts: countTests(
      path.join(
        'tests',
        'regression_tests',
        'US2',
        'dashboards',
        'preconfigured',
        'synthetic-performance-detail',
        'synthetic.performance.detail.dashboard.regression.spec.ts'
      )
    ),
    status: 'Completed',
    type: 'Regression',
  },
];

async function main() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'BTT Playwright Automation';
  wb.created = new Date();

  const ws = wb.addWorksheet('Coverage Summary');
  ws.columns = [
    { header: 'Sr. No.', key: 'sr', width: 10 },
    { header: 'Module', key: 'module', width: 22 },
    { header: 'Sub Module', key: 'subModule', width: 24 },
    { header: 'Screen', key: 'screen', width: 52 },
    { header: 'No of automation scripts', key: 'scripts', width: 26 },
    { header: 'Status', key: 'status', width: 14 },
  ];

  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1F4E79' },
  };
  header.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

  let grand = 0;
  rows.forEach((r, i) => {
    grand += r.scripts;
    const row = ws.addRow({
      sr: i + 1,
      module: r.module,
      subModule: r.subModule,
      screen: r.screen,
      scripts: r.scripts,
      status: r.status,
    });
    row.alignment = { vertical: 'middle', wrapText: true };
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
  });

  const totalRow = ws.addRow({
    sr: '',
    module: '',
    subModule: '',
    screen: 'GRAND TOTAL',
    scripts: grand,
    status: '',
  });
  totalRow.font = { bold: true };
  totalRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD9E2F3' },
  };
  totalRow.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' };
  totalRow.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };

  // freeze header
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  // Notes sheet
  const notes = wb.addWorksheet('Notes');
  notes.getColumn(1).width = 100;
  notes.addRow(['Automation Screens Coverage Summary — Notes']);
  notes.getRow(1).font = { bold: true };
  notes.addRow([]);
  notes.addRow([
    '“No of automation scripts” = Playwright test() cases in the dedicated suite/spec for that screen (not assertion steps).',
  ]);
  notes.addRow([
    `Smoke “Portal page loads (catalog)” expands to ${smokePageCount} independent TCs, one per entry in config/smokeCatalog.ts.`,
  ]);
  notes.addRow([
    'auth.setup.ts is framework setup (not counted as a product screen suite). Login is listed under Common / Auth if present.',
  ]);
  notes.addRow([
    'RUM Performance Detail (Monitoring path) is distinct from RUM Performance Detail preconfigured Dashboard.',
  ]);
  notes.addRow([
    'Synthetic Performance Detail (preconfigured Dashboard) is distinct from Monitoring Synthetic Real Browser Performance Detail.',
  ]);
  notes.addRow(['Generated: ' + new Date().toISOString()]);
  notes.addRow(['Repo base: US2 regression + smoke_tests + tests/common.']);

  // By type pivot summary
  const byType = wb.addWorksheet('By Type');
  byType.columns = [
    { header: 'Type', key: 'type', width: 16 },
    { header: 'Screens', key: 'screens', width: 12 },
    { header: 'Scripts', key: 'scripts', width: 12 },
  ];
  byType.getRow(1).font = { bold: true };
  const types = {};
  for (const r of rows) {
    if (!types[r.type]) types[r.type] = { screens: 0, scripts: 0 };
    types[r.type].screens += 1;
    types[r.type].scripts += r.scripts;
  }
  let tScripts = 0;
  let tScreens = 0;
  for (const [type, v] of Object.entries(types)) {
    byType.addRow({ type, screens: v.screens, scripts: v.scripts });
    tScripts += v.scripts;
    tScreens += v.screens;
  }
  const tr = byType.addRow({ type: 'GRAND TOTAL', screens: tScreens, scripts: tScripts });
  tr.font = { bold: true };

  const out = path.join('docs', 'Automation_Screens_Coverage_Summary.xlsx');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await wb.xlsx.writeFile(out);

  console.log('Wrote', out);
  console.log('Screens:', rows.length, 'Grand total scripts:', grand);
  rows.forEach((r, i) => console.log(String(i + 1).padStart(2), r.scripts, r.module, '|', r.subModule, '|', r.screen));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
