/**
 * Generates docs/BTT_Smoke_Manual_Test_Cases.xlsx from the smoke suite inventory.
 * Run: node scripts/generate-smoke-manual-excel.js
 *
 * Columns: Test Case ID | Type | Module | Submodule | Title | Steps | Expected Results | Status
 */
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');

const SITE = 'GDC Test Site 2';
const DC = 'US';

/** Map automation key prefix / id → Module + Submodule */
function moduleFor(key) {
  const map = {
    'auth.login': ['Common', 'Authentication'],
    'nav.site-dropdown': ['Common', 'Site Dropdown'],
    'nav.left-nav': ['Common', 'Left Navigation'],
    'nav.top-nav-breadcrumb': ['Common', 'Top Navigation'],
    'rum.dxo': ['Advanced Reporting & Alerting', 'Executive'],
    'rum.executive-kpi': ['Advanced Reporting & Alerting', 'Executive'],
    'rum.crux': ['Advanced Reporting & Alerting', 'Executive'],
    'rum.automated-reports': ['Advanced Reporting & Alerting', 'Automated Reporting'],
    'rum.alerts': ['Advanced Reporting & Alerting', 'Alerting'],
    'rum.data-science': ['Advanced Reporting & Alerting', 'Custom Reporting'],
    'logs.alerts-log': ['Advanced Reporting & Alerting', 'Logs'],
    'logs.reports-log': ['Advanced Reporting & Alerting', 'Logs'],
    'logs.domain-violation-audit': ['Advanced Reporting & Alerting', 'Logs'],
    'logs.synthetic-monitors': ['Advanced Reporting & Alerting', 'Logs'],
    'logs.instant-measurement': ['Advanced Reporting & Alerting', 'Logs'],
    'logs.consultant-access': ['Advanced Reporting & Alerting', 'Logs'],
    'logs.site-variables': ['Advanced Reporting & Alerting', 'Logs'],
    'rum.performance-overview': ['Real User Monitoring (RUM)', 'Performance'],
    'rum.performance-detail': ['Real User Monitoring (RUM)', 'Performance'],
    'rum.performance-comparison': ['Real User Monitoring (RUM)', 'Performance'],
    'rum.aggregate-waterfall': ['Real User Monitoring (RUM)', 'Performance'],
    'rum.bounce-exit': ['Real User Monitoring (RUM)', 'Analysis'],
    'rum.errors-explorer': ['Real User Monitoring (RUM)', 'Errors'],
    'rum.performance-budget': ['Real User Monitoring (RUM)', 'Performance'],
    'rum.session-lookup': ['Real User Monitoring (RUM)', 'Sessions'],
    'rum.vitalscope': ['Real User Monitoring (RUM)', 'Core Web Vitals'],
    'synth.performance-overview': ['Synthetic Monitoring', 'Browser Synthetic'],
    'synth.performance-detail': ['Synthetic Monitoring', 'Browser Synthetic'],
    'synth.test-results': ['Synthetic Monitoring', 'Browser Synthetic'],
    'synth.error-state-tracking': ['Synthetic Monitoring', 'Browser Synthetic'],
    'synth.page-perf-comparison': ['Synthetic Monitoring', 'Browser Synthetic'],
    'synth.aggregate-waterfall': ['Synthetic Monitoring', 'Browser Synthetic'],
    'synth.errors-explorer': ['Synthetic Monitoring', 'Errors'],
    'synth.monitors-list': ['Synthetic Monitoring', 'Monitors'],
    'synth.erroring-monitors': ['Synthetic Monitoring', 'Monitors'],
    'synth.codes': ['Synthetic Monitoring', 'Configuration'],
    'synth.data-repos': ['Synthetic Monitoring', 'Configuration'],
    'synth.basepage-overview': ['Synthetic Monitoring', 'Base Page / SSL'],
    'synth.basepage-detail': ['Synthetic Monitoring', 'Base Page / SSL'],
    'synth.basepage-results': ['Synthetic Monitoring', 'Base Page / SSL'],
    'synth.network-overview': ['Synthetic Monitoring', 'Network Health Checks'],
    'synth.network-detail': ['Synthetic Monitoring', 'Network Health Checks'],
    'synth.network-results': ['Synthetic Monitoring', 'Network Health Checks'],
    'tag.overview': ['Tag & Content Governance', 'Overview'],
    'tag.domain-details': ['Tag & Content Governance', 'Domains'],
    'tag.inventory': ['Tag & Content Governance', 'Inventory'],
    'tag.domain-baseline': ['Tag & Content Governance', 'Domains'],
    'tag.service-profiles': ['Tag & Content Governance', 'Services'],
    'tag.service-details': ['Tag & Content Governance', 'Services'],
    'tag.sla-status': ['Tag & Content Governance', 'SLA'],
    'biz.dashboards': ['Business Analytics', 'Dashboards'],
    'biz.revenue-opportunity': ['Business Analytics', 'Revenue'],
    'biz.revenue-analysis': ['Business Analytics', 'Revenue'],
    'biz.customer-journey': ['Business Analytics', 'Customer Journey'],
    'mkt.marketing-overview': ['Marketing Insights', 'Overview'],
    'mkt.my-campaign': ['Marketing Insights', 'Campaigns'],
    'mkt.brand-journey': ['Marketing Insights', 'Brand'],
    'mkt.competitive-table': ['Marketing Insights', 'Competitive Index'],
    'mkt.competitive-trends': ['Marketing Insights', 'Competitive Index'],
    'mkt.bottom-funnel': ['Marketing Insights', 'Sales Funnel'],
    'biz.brand-opportunity': ['Business Analytics', 'Brand'],
    'biz.revenue-calculator': ['Business Analytics', 'Calculators'],
    'biz.brand-calculator': ['Business Analytics', 'Calculators'],
    'biz.revenue-attribution': ['Business Analytics', 'Attribution'],
    'biz.brand-attribution': ['Business Analytics', 'Attribution'],
    'biz.brand-analysis': ['Business Analytics', 'Brand'],
    'biz.cart-refresh': ['Business Analytics', 'Commerce'],
    'biz.out-of-stock': ['Business Analytics', 'Commerce'],
    'biz.revenue-assurance': ['Business Analytics', 'Revenue Assurance'],
    'native.performance-overview': ['Native App Monitoring', 'Performance'],
    'native.performance-detail': ['Native App Monitoring', 'Performance'],
    'native.aggregate-waterfall': ['Native App Monitoring', 'Performance'],
    'native.bounce-exit': ['Native App Monitoring', 'Analysis'],
    'native.errors-explorer': ['Native App Monitoring', 'Errors'],
    'acct.my-account': ['Account', 'My Account'],
    'acct.view-profile': ['Account', 'Profile'],
    'rum.dxo.controls': ['Advanced Reporting & Alerting', 'Executive'],
    'nav.advanced-reporting-submenu-walk': ['Advanced Reporting & Alerting', 'Navigation'],
    'meta.smoke-catalog-integrity': ['Common', 'Test Framework'],
  };
  return map[key] || ['Portal', 'General'];
}

const chromeCases = [
  {
    key: 'auth.login',
    title: 'Login page → portal landing',
    steps: [
      '1. Open Blue Triangle portal URL',
      '2. Enter valid stage/test user credentials',
      '3. Click Sign In',
      '4. Observe post-login landing page',
    ].join('\n'),
    expected: [
      'User is redirected away from the login page',
      'Portal chrome loads (site dropdown visible)',
      'No login error is shown',
    ].join('\n'),
  },
  {
    key: 'nav.site-dropdown',
    title: `Site dropdown — ensure ${DC} site ${SITE}`,
    steps: [
      '1. Login to the portal',
      '2. Locate the site dropdown in the top navigation',
      `3. If selected site is not "${SITE}", choose "${SITE}"`,
      '4. Confirm the selected value',
    ].join('\n'),
    expected: [
      `Site dropdown shows "${SITE}"`,
      `Datacenter profile context is ${DC}`,
      'If site cannot be selected, test fails with clear error',
    ].join('\n'),
  },
  {
    key: 'nav.left-nav',
    title: 'Left nav opens; favorites check (read-only)',
    steps: [
      '1. Login and select GDC Test Site 2',
      '2. Click the hamburger / left navigation toggle',
      '3. Confirm navigation links are visible',
      '4. Look for Favorites section or star controls (do not modify favorites)',
    ].join('\n'),
    expected: [
      'Left navigation panel opens',
      'Multiple portal menu links are visible',
      'Favorites UI is noted if present (absence is logged; do not write/change favorites)',
    ].join('\n'),
  },
  {
    key: 'nav.top-nav-breadcrumb',
    title: 'Top nav / breadcrumb on Digital Experience Overview',
    steps: [
      '1. Login and select GDC Test Site 2',
      '2. Open Digital Experience Overview from left nav',
      '3. Check page title / breadcrumb in the top bar',
      '4. Hover right-side top-nav controls and note tooltips',
    ].join('\n'),
    expected: [
      'Page title/breadcrumb includes Digital Experience Overview',
      'Right-nav controls are visible with tooltips',
      'Page is read-only (do not change settings)',
    ].join('\n'),
  },
];

const pages = [
  ['rum.dxo', 'Digital Experience Overview'],
  ['rum.executive-kpi', 'Executive KPI Report'],
  ['rum.crux', 'CrUX Report'],
  ['rum.automated-reports', 'Automated Reports (list only)'],
  ['rum.alerts', 'Alerts (list only)'],
  ['rum.data-science', 'Data Science'],
  ['logs.alerts-log', 'Alerts Log'],
  ['logs.reports-log', 'Reports Log'],
  ['logs.domain-violation-audit', 'Domain Violation & Audit Log'],
  ['logs.synthetic-monitors', 'Synthetic Monitors Log'],
  ['logs.instant-measurement', 'Instant Measurement Log'],
  ['logs.consultant-access', 'Consultant Access History'],
  ['logs.site-variables', 'Site Variables Log'],
  ['rum.performance-overview', 'RUM — Performance Overview'],
  ['rum.performance-detail', 'RUM — Performance Detail'],
  ['rum.performance-comparison', 'RUM — Performance Comparison'],
  ['rum.aggregate-waterfall', 'RUM — Aggregate Waterfall'],
  ['rum.bounce-exit', 'RUM — Bounce & Exit Analysis'],
  ['rum.errors-explorer', 'RUM — Errors Explorer'],
  ['rum.performance-budget', 'RUM — Performance Budget'],
  ['rum.session-lookup', 'RUM — Session Lookup'],
  ['rum.vitalscope', 'Core Web Vitals (VitalScope)'],
  ['synth.performance-overview', 'Synthetic — Performance Overview'],
  ['synth.performance-detail', 'Synthetic — Performance Detail'],
  ['synth.test-results', 'Synthetic — Test Results'],
  ['synth.error-state-tracking', 'Error State Tracking'],
  ['synth.page-perf-comparison', 'Page Performance Comparison'],
  ['synth.aggregate-waterfall', 'Synthetic — Aggregate Waterfall'],
  ['synth.errors-explorer', 'Synthetic — Errors Explorer'],
  ['synth.monitors-list', 'Synthetic Monitors (list)'],
  ['synth.erroring-monitors', 'Erroring Synthetic Monitors'],
  ['synth.codes', 'Synthetic Codes'],
  ['synth.data-repos', 'Central Data Repositories'],
  ['synth.basepage-overview', 'Base Page — Performance Overview'],
  ['synth.basepage-detail', 'Base Page — Performance Detail'],
  ['synth.basepage-results', 'Base Page — Test Results'],
  ['synth.network-overview', 'Network Health — Performance Overview'],
  ['synth.network-detail', 'Network Health — Performance Detail'],
  ['synth.network-results', 'Network Health — Test Results'],
  ['tag.overview', 'Tag & Content Overview'],
  ['tag.domain-details', 'Domain Details'],
  ['tag.inventory', 'Inventory Analysis'],
  ['tag.domain-baseline', 'Domain Baseline Analysis'],
  ['tag.service-profiles', 'Service Profiles'],
  ['tag.service-details', 'Service Details'],
  ['tag.sla-status', 'SLA Status'],
  ['biz.dashboards', 'Dashboards'],
  ['biz.revenue-opportunity', 'Revenue Opportunity'],
  ['biz.revenue-analysis', 'Revenue Analysis'],
  ['biz.customer-journey', 'Customer Journey Analysis'],
  ['mkt.marketing-overview', 'Marketing Overview'],
  ['mkt.my-campaign', 'My Campaign'],
  ['mkt.brand-journey', 'Brand Customer Journey Analysis'],
  ['mkt.competitive-table', 'Competitive Index Table'],
  ['mkt.competitive-trends', 'Competitive Index Trends'],
  ['mkt.bottom-funnel', 'Bottom of the Sales Funnel Analysis'],
  ['biz.brand-opportunity', 'Brand Opportunity'],
  ['biz.revenue-calculator', 'Revenue Calculator'],
  ['biz.brand-calculator', 'Brand Calculator'],
  ['biz.revenue-attribution', 'Revenue Attribution'],
  ['biz.brand-attribution', 'Brand Attribution'],
  ['biz.brand-analysis', 'Brand Analysis'],
  ['biz.cart-refresh', 'Cart Refresh'],
  ['biz.out-of-stock', 'Out of Stock'],
  ['biz.revenue-assurance', 'Revenue Assurance'],
  ['native.performance-overview', 'Native — Performance Overview'],
  ['native.performance-detail', 'Native — Performance Detail'],
  ['native.aggregate-waterfall', 'Native — Aggregate Waterfall'],
  ['native.bounce-exit', 'Native — Bounce & Exit Analysis'],
  ['native.errors-explorer', 'Native — Errors Explorer'],
  ['acct.my-account', 'My Account (view only)'],
  ['acct.view-profile', 'View Profile (view only)'],
];

function pageCase(key, title) {
  return {
    key,
    title: `Page load — ${title}`,
    steps: [
      '1. Login to Blue Triangle portal (if not already logged in)',
      `2. Ensure site dropdown is set to "${SITE}" (${DC} instance)`,
      `3. Open left navigation and go to: ${title}`,
      '4. Wait for the page to finish loading',
      '5. Observe page title/breadcrumb and main content area',
      '6. Do NOT create, edit, save, delete, or run any write action',
    ].join('\n'),
    expected: [
      'User remains authenticated (not redirected to login)',
      `Page for "${title}" loads successfully`,
      'Page title / breadcrumb (#page-title) is visible and non-empty',
      'Main content area is present (table, chart, panel, or page body)',
      'No unexpected error page / blank shell',
    ].join('\n'),
  };
}

/** Extra scenarios covered by the 80 automated smoke tests but not in page-load list */
const extraCases = [
  {
    key: 'rum.dxo.controls',
    title: 'DXO dashboard controls — time period, auto-refresh, right-nav',
    steps: [
      '1. Login and select GDC Test Site 2',
      '2. Open Digital Experience Overview',
      '3. Confirm page title/breadcrumb includes Digital Experience Overview',
      '4. Open Time Period filter and review available options',
      '5. Open Auto Refresh menu and review available options',
      '6. Hover right-side top-nav controls and confirm tooltips (User menu, Settings, Help, Theme, Filters, Feedback, etc.)',
      '7. Do not change saved settings or submit writes',
    ].join('\n'),
    expected: [
      'DXO page loads with correct breadcrumb/title',
      'Time period options include: Custom Date Selection, Last 2/7/14/30/90 days, Today/This week/This month so far, Last 3/6/12/24 hours',
      'Auto refresh options include: Off, 2/5/10/15/30/60 Minutes',
      'Right-nav controls are visible, enabled, and expose tooltips',
      'No write/save actions are performed',
    ].join('\n'),
  },
  {
    key: 'nav.advanced-reporting-submenu-walk',
    title: 'Advanced Reporting & Alerting — open each read-only submenu page',
    steps: [
      '1. Login and select GDC Test Site 2',
      '2. Open left navigation',
      '3. Expand Advanced Reporting & Alerting sections (Executive, Automated Reporting, Alerting, Custom Reporting, Logs)',
      '4. Open each read-only submenu page in turn:',
      '   Digital Experience Overview, Executive KPI Report, CrUX Report, Automated Reports (list), Alerts (list), Data Science,',
      '   Alerts Log, Reports Log, Domain Violation & Audit Log, Synthetic Monitors Log, Instant Measurement Log,',
      '   Consultant Access History, Site Variables Log',
      '5. For each page, confirm title/breadcrumb and that the page loads',
      '6. Skip Create Automated Report / Create Alert (write entry points)',
    ].join('\n'),
    expected: [
      'Every listed read-only submenu page loads successfully',
      'User is not redirected to login',
      'Page title is visible/non-empty for each page',
      'Create/write menu items are not exercised',
    ].join('\n'),
  },
  {
    key: 'meta.smoke-catalog-integrity',
    title: 'Smoke catalog integrity — page inventory count',
    steps: [
      '1. Open config/smokeCatalog.ts (or the latest smoke page inventory)',
      '2. Count read-only portal page entries in the catalog',
      '3. Confirm count matches the agreed smoke page total (72 page-load TCs)',
      '4. Confirm Create/Edit/write pages are excluded',
    ].join('\n'),
    expected: [
      'Catalog contains exactly 72 read-only page entries',
      'No create=true / profile-update write pages are included',
      'Chrome/nav scenarios remain separate from the page catalog',
    ].join('\n'),
  },
];

async function main() {
  const cases = [
    ...chromeCases,
    ...pages.map(([key, title]) => pageCase(key, title)),
    ...extraCases,
  ];

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'BTT Playwright Automation';
  workbook.created = new Date();

  const enriched = cases.map((c, index) => {
    const [module, submodule] = moduleFor(c.key);
    return {
      testCaseId: `SMK-${String(index + 1).padStart(3, '0')}`,
      type: 'Smoke',
      module,
      submodule,
      title: `${c.key} — ${c.title}`,
      steps: c.steps,
      expected: c.expected,
      status: 'Not Executed',
      key: c.key,
    };
  });

  // --- Summary tab (module / submodule counts) ---
  const summary = workbook.addWorksheet('Summary', {
    views: [{ state: 'frozen', ySplit: 3 }],
  });
  summary.getColumn(1).width = 36;
  summary.getColumn(2).width = 28;
  summary.getColumn(3).width = 12;
  summary.getColumn(4).width = 55;

  summary.mergeCells(1, 1, 1, 4);
  summary.getCell(1, 1).value =
    `Profile: ${DC} / ${SITE} | Type: Smoke (read-only) | Total TCs: ${enriched.length}`;
  summary.getCell(1, 1).font = { bold: true, size: 12 };

  summary.getRow(3).values = [undefined, 'Module', 'Submodule', 'TC Count', 'Test Case IDs'];
  styleHeader(summary.getRow(3));

  const byModule = new Map();
  for (const row of enriched) {
    if (!byModule.has(row.module)) byModule.set(row.module, []);
    byModule.get(row.module).push(row);
  }

  let rIdx = 4;
  const sectionMod = summary.getRow(rIdx++);
  sectionMod.values = [undefined, 'Module totals', '', '', ''];
  sectionMod.font = { bold: true };
  sectionMod.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD6E3F0' },
  };

  const moduleTotals = [...byModule.entries()]
    .map(([module, rows]) => ({
      module,
      count: rows.length,
      ids: rows.map((r) => r.testCaseId).join(', '),
    }))
    .sort((a, b) => b.count - a.count || a.module.localeCompare(b.module));

  for (const { module, count, ids } of moduleTotals) {
    const row = summary.getRow(rIdx++);
    row.values = [undefined, module, '(all)', count, ids];
    row.alignment = { vertical: 'top', wrapText: true };
  }

  const totalRow = summary.getRow(rIdx++);
  totalRow.values = [
    undefined,
    'TOTAL',
    '',
    enriched.length,
    `SMK-001 .. SMK-${String(enriched.length).padStart(3, '0')}`,
  ];
  totalRow.font = { bold: true };
  totalRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFF2CC' },
  };

  rIdx++;
  const sectionSub = summary.getRow(rIdx++);
  sectionSub.values = [undefined, 'Breakdown by Module + Submodule', '', '', ''];
  sectionSub.font = { bold: true };
  sectionSub.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD6E3F0' },
  };

  const byModuleSub = new Map();
  for (const row of enriched) {
    const k = `${row.module}||${row.submodule}`;
    if (!byModuleSub.has(k)) byModuleSub.set(k, []);
    byModuleSub.get(k).push(row);
  }

  const subRows = [...byModuleSub.entries()]
    .map(([k, rows]) => {
      const [module, submodule] = k.split('||');
      return {
        module,
        submodule,
        count: rows.length,
        ids: rows.map((r) => r.testCaseId).join(', '),
      };
    })
    .sort(
      (a, b) =>
        a.module.localeCompare(b.module) ||
        b.count - a.count ||
        a.submodule.localeCompare(b.submodule)
    );

  for (const { module, submodule, count, ids } of subRows) {
    const row = summary.getRow(rIdx++);
    row.values = [undefined, module, submodule, count, ids];
    row.alignment = { vertical: 'top', wrapText: true };
  }

  // --- Smoke Manual TCs tab ---
  const sheet = workbook.addWorksheet('Smoke Manual TCs', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  sheet.columns = [
    { header: 'Test Case ID', key: 'testCaseId', width: 14 },
    { header: 'Type', key: 'type', width: 10 },
    { header: 'Module', key: 'module', width: 32 },
    { header: 'Submodule', key: 'submodule', width: 24 },
    { header: 'Title', key: 'title', width: 52 },
    { header: 'Steps', key: 'steps', width: 68 },
    { header: 'Expected Results', key: 'expected', width: 68 },
    { header: 'Status', key: 'status', width: 14 },
  ];

  styleHeader(sheet.getRow(1));
  sheet.getRow(1).height = 22;

  for (const row of enriched) {
    const r = sheet.addRow({
      testCaseId: row.testCaseId,
      type: row.type,
      module: row.module,
      submodule: row.submodule,
      title: row.title,
      steps: row.steps,
      expected: row.expected,
      status: row.status,
    });
    r.alignment = { vertical: 'top', wrapText: true };
    r.height = 90;
  }

  for (let i = 2; i <= enriched.length + 1; i++) {
    sheet.getCell(`H${i}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"Not Executed,Pass,Fail,Blocked,Skipped"'],
    };
  }

  const notes = workbook.addWorksheet('Notes');
  notes.getColumn(1).width = 100;
  notes.addRow(['Blue Triangle Portal — Smoke Manual Test Cases']);
  notes.addRow([`Profile / Site: ${DC} — ${SITE}`]);
  notes.addRow(['Type: Smoke (read-only). Do NOT write to any account, site, or page.']);
  notes.addRow([
    'Columns: Test Case ID | Type | Module | Submodule | Title | Steps | Expected Results | Status',
  ]);
  notes.addRow(['See Summary tab for TC counts by Module and Submodule.']);
  notes.addRow([
    'Excluded: Create Automated Report, Create Alert, Edit Profile, Run Instant Measurement, save/settings writes.',
  ]);
  notes.addRow([`Total cases: ${enriched.length} (SMK-001..SMK-${String(enriched.length).padStart(3, '0')})`]);
  notes.addRow([
    'Aligned to 80 automated smoke tests: 4 chrome + 72 page loads + DXO controls + Advanced Reporting submenu walk + catalog integrity (auth.setup is automation-only).',
  ]);
  notes.addRow([
    'Automation mapping: config/smokeCatalog.ts, nav.chrome / portal-pages / digital-experience-overview / menu-submenu-navigation specs',
  ]);
  notes.getRow(1).font = { bold: true };

  const outDir = path.join(__dirname, '..', 'docs');
  fs.mkdirSync(outDir, { recursive: true });
  const candidates = [
    path.join(outDir, 'BTT_Smoke_Manual_Test_Cases.xlsx'),
    path.join(outDir, 'BTT_Smoke_Manual_Test_Cases_updated.xlsx'),
    path.join(outDir, 'BTT_Smoke_Manual_Test_Cases_complete.xlsx'),
  ];
  let written = false;
  for (const outPath of candidates) {
    try {
      await workbook.xlsx.writeFile(outPath);
      console.log(`Wrote ${enriched.length} test cases → ${outPath}`);
      written = true;
    } catch (err) {
      if (err && err.code === 'EBUSY') {
        console.warn(`Locked, skip: ${outPath}`);
        continue;
      }
      throw err;
    }
  }
  if (!written) {
    throw new Error('Could not write Excel — all output paths are locked. Close Excel and re-run.');
  }
}

function styleHeader(row) {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1F4E79' },
  };
  row.alignment = { vertical: 'middle', wrapText: true };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
