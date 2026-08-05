/**
 * Generates docs/BlueTriangle_Portal_Automation_Testing_Plan.xlsx
 * Leadership-facing schedule for Playwright regression automation across portal screens.
 *
 * Run: node scripts/generate-portal-automation-plan.js
 */
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');

const PLAN_OWNER = 'QA Automation — US2 (GDC Test Site 2)';
const TODAY = new Date(2026, 7, 3); // 3 Aug 2026 (month 0-indexed)
const HIST_START = new Date(2026, 6, 22); // 22 Jul 2026
const FORWARD_START = new Date(2026, 7, 4); // 4 Aug 2026 (tomorrow)

const HOURS_PER_SCREEN = 8;
const COLORS = {
  headerBg: 'FF1F4E79',
  headerFg: 'FFFFFFFF',
  titleBg: 'FF0D2B4A',
  completed: 'FFC6EFCE',
  completedFg: 'FF006100',
  planned: 'FFDDEBF7',
  plannedFg: 'FF1F4E79',
  buffer: 'FFFCE4D6',
  bufferFg: 'FFC65911',
  inProgress: 'FFFFF2CC',
  inProgressFg: 'FF9C5700',
  blocked: 'FFFFC7CE',
  blockedFg: 'FF9C0006',
  altRow: 'FFF5F8FB',
  summaryCard: 'FFE7F3FF',
  greenDark: 'FF548235',
};

/** Google Sheets–friendly date text, e.g. 14-Mar-2012 */
function fmtDate(d) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dd = String(d.getDate()).padStart(2, '0');
  const mon = months[d.getMonth()];
  const yyyy = d.getFullYear();
  return `${dd}-${mon}-${yyyy}`;
}

function addDays(d, n) {
  const x = new Date(d.getTime());
  x.setDate(x.getDate() + n);
  return x;
}

/** Mon–Fri only (leadership working calendar for forward schedule). */
function addBusinessDays(d, n) {
  const x = new Date(d.getTime());
  let left = n;
  while (left > 0) {
    x.setDate(x.getDate() + 1);
    const day = x.getDay();
    if (day !== 0 && day !== 6) left -= 1;
  }
  return x;
}

function isWeekend(d) {
  const day = d.getDay();
  return day === 0 || day === 6;
}

function nextBusinessDay(d) {
  let x = new Date(d.getTime());
  while (isWeekend(x)) x = addDays(x, 1);
  return x;
}

/**
 * Portal screen inventory (smoke-catalog aligned) with Module / Submodule for live nav.
 * Exclude rum.vitalscope duplicate — covered by BI Core Web Vitals (VitalScope).
 */
const COMPLETED = [
  {
    module: 'Monitoring',
    submodule: 'Real User Browser',
    screen: 'Performance Overview',
    notes: 'Regression suite delivered; Allure + workbook available.',
    catalogId: 'rum.performance-overview',
  },
  {
    module: 'Monitoring',
    submodule: 'Real User Browser',
    screen: 'Performance Detail',
    notes: 'Regression suite delivered; Allure + workbook available.',
    catalogId: 'rum.performance-detail',
  },
  {
    module: 'Monitoring',
    submodule: 'Real User Browser',
    screen: 'Performance Comparison',
    notes: 'Regression suite delivered; Allure + workbook available.',
    catalogId: 'rum.performance-comparison',
  },
  {
    module: 'Monitoring',
    submodule: 'Real User Browser',
    screen: 'Aggregate Waterfall',
    notes: 'Regression suite delivered; Allure + workbook available.',
    catalogId: 'rum.aggregate-waterfall',
  },
  {
    module: 'Monitoring',
    submodule: 'Real User Browser',
    screen: 'Bounce & Exit Analysis',
    notes: 'Regression suite delivered; Allure + workbook available.',
    catalogId: 'rum.bounce-exit',
  },
  {
    module: 'Monitoring',
    submodule: 'Real User Browser',
    screen: 'Errors Explorer',
    notes: 'Regression suite delivered; Allure + workbook available.',
    catalogId: 'rum.errors-explorer',
  },
  {
    module: 'Monitoring',
    submodule: 'Real User Browser',
    screen: 'Performance Budget',
    notes: 'Regression suite delivered; Allure + workbook available.',
    catalogId: 'rum.performance-budget',
  },
  {
    module: 'Monitoring',
    submodule: 'Real User Browser',
    screen: 'Session Lookup',
    notes: 'Regression suite delivered; Allure + workbook available.',
    catalogId: 'rum.session-lookup',
  },
  {
    module: 'Business Insights',
    submodule: 'Improve Conversion',
    screen: 'Revenue Opportunity',
    notes: 'First BI Improve Conversion screen completed.',
    catalogId: 'biz.revenue-opportunity',
  },
  {
    module: 'Business Insights',
    submodule: 'Improve Traffic',
    screen: 'Marketing Overview',
    notes: 'Improve Traffic track started.',
    catalogId: 'mkt.marketing-overview',
  },
  {
    module: 'Business Insights',
    submodule: 'Improve Traffic',
    screen: 'Core Web Vitals (VitalScope)',
    notes: 'Same underlying RUM performance-overview route; covered via BI Improve Traffic path. RUM VitalScope leaf treated as same coverage.',
    catalogId: 'rum.vitalscope',
  },
  {
    module: 'Business Insights',
    submodule: 'Improve Traffic',
    screen: 'Customer Journey Analysis',
    notes: 'conversion-type=sales; Brand sibling is separate screen.',
    catalogId: 'biz.customer-journey',
  },
  {
    module: 'Business Insights',
    submodule: 'Improve Traffic',
    screen: 'Brand Customer Journey Analysis',
    notes: 'conversion-type=brand; completed 03-Aug-2026 (31/31 passed).',
    catalogId: 'mkt.brand-journey',
  },
];

/** Remaining screens after completed — Improve Traffic first, then rest of portal. */
const REMAINING = [
  // --- Finish Improve Traffic ---
  {
    module: 'Business Insights',
    submodule: 'Improve Traffic',
    screen: 'My Campaign',
    notes: 'Continue Improve Traffic sequence from portal menu order.',
    catalogId: 'mkt.my-campaign',
  },
  {
    module: 'Business Insights',
    submodule: 'Improve Traffic',
    screen: 'Competitive Index Table',
    notes: 'view=table; pair with Trends screen.',
    catalogId: 'mkt.competitive-table',
  },
  {
    module: 'Business Insights',
    submodule: 'Improve Traffic',
    screen: 'Competitive Index Trends',
    notes: 'view=trends; pair with Table screen.',
    catalogId: 'mkt.competitive-trends',
  },
  {
    module: 'Business Insights',
    submodule: 'Improve Traffic',
    screen: 'Bottom of the Sales Funnel Analysis',
    notes: 'Last Improve Traffic leaf in current catalog.',
    catalogId: 'mkt.bottom-funnel',
  },

  // --- Improve Conversion remainder ---
  {
    module: 'Business Insights',
    submodule: 'Improve Conversion',
    screen: 'Dashboards',
    notes: 'BI dashboards (exclude marketing=yes My Campaign).',
    catalogId: 'biz.dashboards',
  },
  {
    module: 'Business Insights',
    submodule: 'Improve Conversion',
    screen: 'Revenue Analysis',
    notes: 'conversion-type=sales.',
    catalogId: 'biz.revenue-analysis',
  },
  {
    module: 'Business Insights',
    submodule: 'Improve Conversion',
    screen: 'Brand Opportunity',
    notes: 'Brand conversion sibling of Revenue Opportunity.',
    catalogId: 'biz.brand-opportunity',
  },
  {
    module: 'Business Insights',
    submodule: 'Improve Conversion',
    screen: 'Brand Analysis',
    notes: 'conversion-type=brand.',
    catalogId: 'biz.brand-analysis',
  },
  {
    module: 'Business Insights',
    submodule: 'Improve Conversion',
    screen: 'Revenue Calculator',
    notes: 'conversion-type=sales.',
    catalogId: 'biz.revenue-calculator',
  },
  {
    module: 'Business Insights',
    submodule: 'Improve Conversion',
    screen: 'Brand Calculator',
    notes: 'conversion-type=brand.',
    catalogId: 'biz.brand-calculator',
  },
  {
    module: 'Business Insights',
    submodule: 'Improve Conversion',
    screen: 'Revenue Attribution',
    notes: 'Read-only regression; do not mutate attribution config in automation.',
    catalogId: 'biz.revenue-attribution',
  },
  {
    module: 'Business Insights',
    submodule: 'Improve Conversion',
    screen: 'Brand Attribution',
    notes: 'Read-only regression; do not mutate attribution config in automation.',
    catalogId: 'biz.brand-attribution',
  },

  // --- Improve Revenue ---
  {
    module: 'Business Insights',
    submodule: 'Improve Revenue',
    screen: 'Cart Refresh',
    notes: 'Broken-links / cart refresh analytics.',
    catalogId: 'biz.cart-refresh',
  },
  {
    module: 'Business Insights',
    submodule: 'Improve Revenue',
    screen: 'Out of Stock',
    notes: '',
    catalogId: 'biz.out-of-stock',
  },
  {
    module: 'Business Insights',
    submodule: 'Improve Revenue',
    screen: 'Revenue Assurance',
    notes: '',
    catalogId: 'biz.revenue-assurance',
  },

  // --- Advanced Reporting & Alerting ---
  {
    module: 'Monitoring',
    submodule: 'Advanced Reporting & Alerting',
    screen: 'Digital Experience Overview',
    notes: '',
    catalogId: 'rum.dxo',
  },
  {
    module: 'Monitoring',
    submodule: 'Advanced Reporting & Alerting',
    screen: 'Executive KPI Report',
    notes: '',
    catalogId: 'rum.executive-kpi',
  },
  {
    module: 'Monitoring',
    submodule: 'Advanced Reporting & Alerting',
    screen: 'CrUX Report',
    notes: '',
    catalogId: 'rum.crux',
  },
  {
    module: 'Monitoring',
    submodule: 'Advanced Reporting & Alerting',
    screen: 'Automated Reports',
    notes: 'List/view only — exclude create flows.',
    catalogId: 'rum.automated-reports',
  },
  {
    module: 'Monitoring',
    submodule: 'Advanced Reporting & Alerting',
    screen: 'Alerts',
    notes: 'List/view only — exclude create flows.',
    catalogId: 'rum.alerts',
  },
  {
    module: 'Monitoring',
    submodule: 'Advanced Reporting & Alerting',
    screen: 'Data Science',
    notes: 'Custom comparison / data science.',
    catalogId: 'rum.data-science',
  },

  // --- Logs ---
  {
    module: 'Monitoring',
    submodule: 'Logs',
    screen: 'Alerts Log',
    notes: '',
    catalogId: 'logs.alerts-log',
  },
  {
    module: 'Monitoring',
    submodule: 'Logs',
    screen: 'Reports Log',
    notes: '',
    catalogId: 'logs.reports-log',
  },
  {
    module: 'Monitoring',
    submodule: 'Logs',
    screen: 'Domain Violation & Audit Log',
    notes: '',
    catalogId: 'logs.domain-violation-audit',
  },
  {
    module: 'Monitoring',
    submodule: 'Logs',
    screen: 'Synthetic Monitors Log',
    notes: '',
    catalogId: 'logs.synthetic-monitors',
  },
  {
    module: 'Monitoring',
    submodule: 'Logs',
    screen: 'Instant Measurement Log',
    notes: '',
    catalogId: 'logs.instant-measurement',
  },
  {
    module: 'Monitoring',
    submodule: 'Logs',
    screen: 'Consultant Access History',
    notes: '',
    catalogId: 'logs.consultant-access',
  },
  {
    module: 'Monitoring',
    submodule: 'Logs',
    screen: 'Site Variables Log',
    notes: '',
    catalogId: 'logs.site-variables',
  },

  // --- Native App ---
  {
    module: 'Monitoring',
    submodule: 'Native App',
    screen: 'Performance Overview',
    notes: 'Native App overview (distinct from RUM Browser).',
    catalogId: 'native.performance-overview',
  },
  {
    module: 'Monitoring',
    submodule: 'Native App',
    screen: 'Performance Detail',
    notes: '',
    catalogId: 'native.performance-detail',
  },
  {
    module: 'Monitoring',
    submodule: 'Native App',
    screen: 'Aggregate Waterfall',
    notes: '',
    catalogId: 'native.aggregate-waterfall',
  },
  {
    module: 'Monitoring',
    submodule: 'Native App',
    screen: 'Bounce & Exit Analysis',
    notes: '',
    catalogId: 'native.bounce-exit',
  },
  {
    module: 'Monitoring',
    submodule: 'Native App',
    screen: 'Errors Explorer',
    notes: '',
    catalogId: 'native.errors-explorer',
  },

  // --- Synthetic Real Browser ---
  {
    module: 'Monitoring',
    submodule: 'Synthetic — Real Browser',
    screen: 'Performance Overview',
    notes: '',
    catalogId: 'synth.performance-overview',
  },
  {
    module: 'Monitoring',
    submodule: 'Synthetic — Real Browser',
    screen: 'Performance Detail',
    notes: '',
    catalogId: 'synth.performance-detail',
  },
  {
    module: 'Monitoring',
    submodule: 'Synthetic — Real Browser',
    screen: 'Test Results',
    notes: '',
    catalogId: 'synth.test-results',
  },
  {
    module: 'Monitoring',
    submodule: 'Synthetic — Real Browser',
    screen: 'Error State Tracking',
    notes: '',
    catalogId: 'synth.error-state-tracking',
  },
  {
    module: 'Monitoring',
    submodule: 'Synthetic — Real Browser',
    screen: 'Page Performance Comparison',
    notes: '',
    catalogId: 'synth.page-perf-comparison',
  },
  {
    module: 'Monitoring',
    submodule: 'Synthetic — Real Browser',
    screen: 'Aggregate Waterfall',
    notes: '',
    catalogId: 'synth.aggregate-waterfall',
  },
  {
    module: 'Monitoring',
    submodule: 'Synthetic — Real Browser',
    screen: 'Errors Explorer',
    notes: '',
    catalogId: 'synth.errors-explorer',
  },
  {
    module: 'Monitoring',
    submodule: 'Synthetic — Real Browser',
    screen: 'Synthetic Monitors',
    notes: 'List/view — avoid create/edit/run write paths.',
    catalogId: 'synth.monitors-list',
  },
  {
    module: 'Monitoring',
    submodule: 'Synthetic — Real Browser',
    screen: 'Erroring Synthetic Monitors',
    notes: '',
    catalogId: 'synth.erroring-monitors',
  },
  {
    module: 'Monitoring',
    submodule: 'Synthetic — Real Browser',
    screen: 'Synthetic Codes',
    notes: '',
    catalogId: 'synth.codes',
  },
  {
    module: 'Monitoring',
    submodule: 'Synthetic — Real Browser',
    screen: 'Central Data Repositories',
    notes: '',
    catalogId: 'synth.data-repos',
  },

  // --- API / Base Page ---
  {
    module: 'Monitoring',
    submodule: 'Synthetic — API Checks (Base Page)',
    screen: 'Performance Overview',
    notes: 'Base page overview.',
    catalogId: 'synth.basepage-overview',
  },
  {
    module: 'Monitoring',
    submodule: 'Synthetic — API Checks (Base Page)',
    screen: 'Performance Detail',
    notes: 'Base page & SSL detail.',
    catalogId: 'synth.basepage-detail',
  },
  {
    module: 'Monitoring',
    submodule: 'Synthetic — API Checks (Base Page)',
    screen: 'Test Results',
    notes: '',
    catalogId: 'synth.basepage-results',
  },

  // --- Network ---
  {
    module: 'Monitoring',
    submodule: 'Network Health Checks',
    screen: 'Performance Overview',
    notes: '',
    catalogId: 'synth.network-overview',
  },
  {
    module: 'Monitoring',
    submodule: 'Network Health Checks',
    screen: 'Performance Detail',
    notes: '',
    catalogId: 'synth.network-detail',
  },
  {
    module: 'Monitoring',
    submodule: 'Network Health Checks',
    screen: 'Test Results',
    notes: '',
    catalogId: 'synth.network-results',
  },

  // --- Tag / CSP ---
  {
    module: 'Monitoring',
    submodule: 'CSP & Tag Governance',
    screen: 'Tag & Content Overview',
    notes: '',
    catalogId: 'tag.overview',
  },
  {
    module: 'Monitoring',
    submodule: 'CSP & Tag Governance',
    screen: 'Domain Details',
    notes: '',
    catalogId: 'tag.domain-details',
  },
  {
    module: 'Monitoring',
    submodule: 'CSP & Tag Governance',
    screen: 'Inventory Analysis',
    notes: '',
    catalogId: 'tag.inventory',
  },
  {
    module: 'Monitoring',
    submodule: 'CSP & Tag Governance',
    screen: 'Domain Baseline Analysis',
    notes: '',
    catalogId: 'tag.domain-baseline',
  },
  {
    module: 'Monitoring',
    submodule: 'CSP & Tag Governance',
    screen: 'Service Profiles',
    notes: '',
    catalogId: 'tag.service-profiles',
  },
  {
    module: 'Monitoring',
    submodule: 'CSP & Tag Governance',
    screen: 'Service Details',
    notes: '',
    catalogId: 'tag.service-details',
  },
  {
    module: 'Monitoring',
    submodule: 'CSP & Tag Governance',
    screen: 'SLA Status',
    notes: '',
    catalogId: 'tag.sla-status',
  },

  // --- Account ---
  {
    module: 'Account',
    submodule: 'Account Settings',
    screen: 'My Account',
    notes: 'View-only profile/account settings.',
    catalogId: 'acct.my-account',
  },
  {
    module: 'Account',
    submodule: 'Account Settings',
    screen: 'View Profile',
    notes: 'View-only.',
    catalogId: 'acct.view-profile',
  },
];

/** Buffer hours after finishing all screens in a submodule (bulk regression fix). */
function bufferHoursForSubmodule(screenCount) {
  if (screenCount <= 3) return 4;
  if (screenCount <= 6) return 8;
  if (screenCount <= 10) return 16;
  return 24;
}

function bufferDays(hours) {
  return Math.max(0.5, hours / HOURS_PER_SCREEN);
}

function styleHeader(row) {
  row.font = { bold: true, color: { argb: COLORS.headerFg }, size: 11 };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
  row.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  row.height = 28;
}

function applyStatusCell(cell, status) {
  cell.alignment = { vertical: 'middle', horizontal: 'center' };
  cell.font = { bold: true, size: 10 };
  if (status === 'Completed') {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.completed } };
    cell.font.color = { argb: COLORS.completedFg };
  } else if (status === 'Planned') {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.planned } };
    cell.font.color = { argb: COLORS.plannedFg };
  } else if (status === 'Buffer') {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.buffer } };
    cell.font.color = { argb: COLORS.bufferFg };
  } else if (status === 'In Progress') {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.inProgress } };
    cell.font.color = { argb: COLORS.inProgressFg };
  } else if (status === 'Blocked') {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.blocked } };
    cell.font.color = { argb: COLORS.blockedFg };
  }
}

function buildPlanRows() {
  const rows = [];
  let sr = 1;

  // Historical completed: 1 calendar day each from 22 Jul → 3 Aug
  COMPLETED.forEach((item, idx) => {
    const day = addDays(HIST_START, idx);
    rows.push({
      srNo: sr++,
      module: item.module,
      submodule: item.submodule,
      screen: item.screen,
      etaHours: HOURS_PER_SCREEN,
      start: fmtDate(day),
      end: fmtDate(day),
      status: 'Completed',
      notes: item.notes,
      kind: 'screen',
      catalogId: item.catalogId,
    });
  });

  // Retroactive buffer for completed Real User Browser + Improve Traffic/Conversion so far
  // (document as completed stabilization already absorbed during delivery)
  rows.push({
    srNo: sr++,
    module: 'Monitoring',
    submodule: 'Real User Browser',
    screen: '[Buffer] Bulk regression fix & suite stabilization',
    etaHours: 16,
    start: fmtDate(HIST_START),
    end: fmtDate(TODAY),
    status: 'Completed',
    notes:
      'Stabilization absorbed across delivery window (defect fixes, Allure isolation, serial soft-deadline hardening). Documented for leadership visibility.',
    kind: 'buffer',
    catalogId: '',
  });

  // Forward schedule: group remaining by submodule, insert buffer after each group.
  // Buffer sizing uses full submodule screen count (completed + remaining).
  const completedCountBySub = new Map();
  for (const c of COMPLETED) {
    const key = `${c.module}||${c.submodule}`;
    completedCountBySub.set(key, (completedCountBySub.get(key) || 0) + 1);
  }

  let cursor = nextBusinessDay(FORWARD_START);
  const bySub = [];
  for (const item of REMAINING) {
    const key = `${item.module}||${item.submodule}`;
    let g = bySub.find((x) => x.key === key);
    if (!g) {
      g = { key, module: item.module, submodule: item.submodule, items: [] };
      bySub.push(g);
    }
    g.items.push(item);
  }

  for (const g of bySub) {
    for (const item of g.items) {
      const start = cursor;
      const end = cursor;
      rows.push({
        srNo: sr++,
        module: item.module,
        submodule: item.submodule,
        screen: item.screen,
        etaHours: HOURS_PER_SCREEN,
        start: fmtDate(start),
        end: fmtDate(end),
        status: 'Planned',
        notes: item.notes || 'Playwright regression (POM) + Allure + manual workbook.',
        kind: 'screen',
        catalogId: item.catalogId,
      });
      cursor = addBusinessDays(cursor, 1);
    }

    const priorDone = completedCountBySub.get(g.key) || 0;
    const totalInSub = priorDone + g.items.length;
    const bh = bufferHoursForSubmodule(totalInSub);
    const bDays = bufferDays(bh);
    const bStart = cursor;
    const daySlots = Math.ceil(bDays);
    let bEnd = bStart;
    for (let i = 1; i < daySlots; i++) bEnd = addBusinessDays(bEnd, 1);
    rows.push({
      srNo: sr++,
      module: g.module,
      submodule: g.submodule,
      screen: `[Buffer] ${g.submodule} — bulk regression run & failure fix`,
      etaHours: bh,
      start: fmtDate(bStart),
      end: fmtDate(bEnd),
      status: 'Buffer',
      notes: `Reserved after all screens in submodule (total ${totalInSub}: ${priorDone} already done + ${g.items.length} newly scheduled). Run suites in bulk, triage flakes/hard failures, refresh Allure, update workbooks.`,
      kind: 'buffer',
      catalogId: '',
    });
    cursor = addBusinessDays(bEnd, 1);
  }

  return rows;
}

async function main() {
  const rows = buildPlanRows();
  const screenRows = rows.filter((r) => r.kind === 'screen');
  const completedScreens = screenRows.filter((r) => r.status === 'Completed');
  const plannedScreens = screenRows.filter((r) => r.status === 'Planned');
  const bufferRows = rows.filter((r) => r.kind === 'buffer');
  const totalEta = rows.reduce((s, r) => s + r.etaHours, 0);
  const completedEta = completedScreens.reduce((s, r) => s + r.etaHours, 0) +
    bufferRows.filter((r) => r.status === 'Completed').reduce((s, r) => s + r.etaHours, 0);
  const remainingEta = totalEta - completedEta;
  const planEnd = rows[rows.length - 1].end;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Blue Triangle QA Automation';
  wb.created = TODAY;
  wb.modified = TODAY;

  // ========== Summary ==========
  const summary = wb.addWorksheet('Summary', { views: [{ state: 'frozen', ySplit: 1 }] });
  summary.getColumn(1).width = 42;
  summary.getColumn(2).width = 28;
  summary.getColumn(3).width = 22;
  summary.getColumn(4).width = 18;

  summary.mergeCells('A1:D1');
  summary.getCell('A1').value = 'Blue Triangle Portal — Comprehensive Automation Testing Plan';
  summary.getCell('A1').font = { bold: true, size: 16, color: { argb: COLORS.headerFg } };
  summary.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.titleBg } };
  summary.getCell('A1').alignment = { vertical: 'middle', horizontal: 'left' };
  summary.getRow(1).height = 32;

  summary.mergeCells('A2:D2');
  summary.getCell('A2').value = `${PLAN_OWNER}  |  Portal: https://portal.bluetriangle.com/  |  Plan as of ${fmtDate(TODAY)}`;
  summary.getCell('A2').font = { italic: true, size: 10, color: { argb: 'FF595959' } };

  const kpiStart = 4;
  const kpis = [
    ['Metric', 'Value'],
    ['Total portal screens in plan', screenRows.length],
    ['Screens completed', completedScreens.length],
    ['Screens remaining (Planned)', plannedScreens.length],
    ['Submodule buffer slots', bufferRows.length],
    ['Automation progress %', `${Math.round((completedScreens.length / screenRows.length) * 100)}%`],
    ['Total planned effort (hours)', totalEta],
    ['Effort completed (hours)', completedEta],
    ['Effort remaining (hours)', remainingEta],
    ['Historical cadence', '1 screen / calendar day (22-Jul → 03-Aug)'],
    ['Forward cadence', '1 screen / business day (Mon–Fri) + submodule buffers'],
    ['Standard ETA per screen', `${HOURS_PER_SCREEN} hours`],
    ['Plan start (completed work)', fmtDate(HIST_START)],
    ['Next screen start', fmtDate(FORWARD_START)],
    ['Projected plan end (incl. buffers)', planEnd],
    ['Profile / site focus', 'US2 — GDC Test Site 2'],
  ];
  kpis.forEach((pair, i) => {
    const r = summary.getRow(kpiStart + i);
    r.getCell(1).value = pair[0];
    r.getCell(2).value = pair[1];
    if (i === 0) {
      styleHeader(r);
      r.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
      r.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
    } else {
      r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.summaryCard } };
      r.getCell(1).font = { bold: true };
      if (String(pair[0]).includes('progress')) {
        r.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.completed } };
        r.getCell(2).font = { bold: true, color: { argb: COLORS.completedFg } };
      }
    }
  });

  let subTableRow = kpiStart + kpis.length + 2;
  summary.getCell(`A${subTableRow}`).value = 'Progress by Module / Submodule (screens only)';
  summary.getCell(`A${subTableRow}`).font = { bold: true, size: 12 };
  subTableRow += 1;
  const subHeader = summary.getRow(subTableRow);
  ['Module', 'Submodule', 'Completed', 'Remaining', 'Buffer Hours (forward)'].forEach((h, i) => {
    subHeader.getCell(i + 1).value = h;
  });
  styleHeader(subHeader);

  const subMap = new Map();
  for (const r of screenRows) {
    const key = `${r.module}||${r.submodule}`;
    if (!subMap.has(key)) subMap.set(key, { module: r.module, submodule: r.submodule, done: 0, rem: 0 });
    const s = subMap.get(key);
    if (r.status === 'Completed') s.done += 1;
    else s.rem += 1;
  }
  for (const b of bufferRows.filter((x) => x.status === 'Buffer')) {
    const key = `${b.module}||${b.submodule}`;
    if (!subMap.has(key)) continue;
    subMap.get(key).bufferHrs = (subMap.get(key).bufferHrs || 0) + b.etaHours;
  }

  let rr = subTableRow + 1;
  for (const s of subMap.values()) {
    const row = summary.getRow(rr++);
    row.getCell(1).value = s.module;
    row.getCell(2).value = s.submodule;
    row.getCell(3).value = s.done;
    row.getCell(4).value = s.rem;
    row.getCell(5).value = s.bufferHrs || 0;
    if (s.rem === 0 && s.done > 0) {
      row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.completed } };
    } else if (s.done > 0) {
      row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.inProgress } };
    }
  }

  // ========== Automation Plan ==========
  const plan = wb.addWorksheet('Automation Plan', { views: [{ state: 'frozen', ySplit: 1 }] });
  plan.columns = [
    { header: 'Sr. No', key: 'srNo', width: 10 },
    { header: 'Module', key: 'module', width: 22 },
    { header: 'Submodule', key: 'submodule', width: 34 },
    { header: 'Screen Name', key: 'screen', width: 52 },
    { header: 'Automation ETA (In hours)', key: 'etaHours', width: 22 },
    { header: 'Start Date', key: 'start', width: 14 },
    { header: 'End Date', key: 'end', width: 14 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Notes', key: 'notes', width: 62 },
  ];
  styleHeader(plan.getRow(1));

  rows.forEach((item, idx) => {
    const row = plan.addRow({
      srNo: item.srNo,
      module: item.module,
      submodule: item.submodule,
      screen: item.screen,
      etaHours: item.etaHours,
      start: item.start,
      end: item.end,
      status: item.status,
      notes: item.notes,
    });
    row.alignment = { vertical: 'middle', wrapText: true };
    row.height = item.kind === 'buffer' ? 36 : 28;
    applyStatusCell(row.getCell(8), item.status);
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
    if (item.kind === 'buffer') {
      for (let c = 1; c <= 7; c++) {
        if (c === 8) continue;
        row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF5EE' } };
      }
      row.getCell(4).font = { italic: true, color: { argb: COLORS.bufferFg } };
    } else if (idx % 2 === 1 && item.status === 'Planned') {
      for (let c = 1; c <= 7; c++) {
        row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.altRow } };
      }
    } else if (item.status === 'Completed' && item.kind === 'screen') {
      for (let c = 1; c <= 7; c++) {
        row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F9F0' } };
      }
    }

    row.getCell(8).dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: ['"Completed,In Progress,Planned,Buffer,Blocked"'],
    };
  });

  // AutoFilter
  plan.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: rows.length + 1, column: 9 },
  };

  // ========== Legend & Notes ==========
  const notes = wb.addWorksheet('Assumptions & Notes');
  notes.getColumn(1).width = 110;
  const noteLines = [
    'Blue Triangle Portal — Automation Testing Plan (Assumptions & Notes)',
    '',
    'Scope',
    '• Screen inventory sourced from portal smoke catalog (config/smokeCatalog.ts), aligned to live portal.bluetriangle.com navigation labels.',
    '• Core Web Vitals (VitalScope) under Improve Traffic covers the shared RUM performance-overview route; RUM VitalScope is not double-counted as a separate remaining screen.',
    '• Automation is read-only regression (Playwright + TypeScript POM). No Save Filter, shared dashboard saves, create/edit/run write flows, or attribution config mutation.',
    '',
    'Scheduling rules',
    '• Completed screens listed first; historical dates assigned 22-Jul-2026 → 03-Aug-2026 at ~1 screen/day (matches delivery cadence).',
    '• From 04-Aug-2026 onward: remaining Business Insights > Improve Traffic screens first, then Improve Conversion, Improve Revenue, then Monitoring (Advanced Reporting, Logs, Native, Synthetic, Network, Tag) and Account.',
    '• Forward schedule uses business days (Mon–Fri). Weekends are non-working for projected dates.',
    '• Standard Automation ETA = 8 hours per screen (analysis + POM/locators + regression suite + Allure + manual workbook).',
    '',
    'Buffers',
    '• After every submodule’s screens complete, a Buffer row is inserted for bulk suite execution and failure remediation.',
    '• Buffer sizing (by full submodule screen count): ≤3 → 4h; 4–6 → 8h; 7–10 → 16h; 11+ → 24h.',
    '• Partially completed submodules (Improve Traffic / Improve Conversion) size buffers on completed + remaining screens.',
    '• Real User Browser historical buffer (16h) marked Completed — stabilization was absorbed during the Jul–Aug delivery window.',
    '',
    'Status legend',
    '• Completed (green) — suite delivered and executed.',
    '• Planned (blue) — scheduled, not started.',
    '• Buffer (orange) — reserved bulk-fix / stabilization slot (not a product screen).',
    '• In Progress / Blocked — for live plan updates during execution.',
    '',
    'Deliverables expected per screen',
    '• Regression spec under tests/regression_tests/US2/…',
    '• Page Object + Locators (reuse framework helpers)',
    '• Isolated Allure HTML report',
    '• Manual regression workbook (Summary / Regression TCs / Notes)',
    '• npm script entry when applicable',
    '',
    'Risks & leadership notes',
    '• Live-data / site-dependent empty states may extend ETA on sparse environments; plan assumes GDC Test Site 2 has representative data.',
    '• Sibling conversion-type screens (sales vs brand) are separate lines even when routes share a base path.',
    '• Plan should be re-baselined if portal menu adds/removes leaves or if capacity changes (multiple engineers).',
    '',
    `Generated: ${fmtDate(TODAY)}  |  Regenerate: node scripts/generate-portal-automation-plan.js`,
  ];
  noteLines.forEach((line, i) => {
    const row = notes.addRow([line]);
    if (i === 0) row.font = { bold: true, size: 14, color: { argb: COLORS.titleBg } };
    else if (
      [
        'Scope',
        'Scheduling rules',
        'Buffers',
        'Status legend',
        'Deliverables expected per screen',
        'Risks & leadership notes',
      ].includes(line)
    ) {
      row.font = { bold: true, size: 12, color: { argb: COLORS.headerBg } };
      row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.summaryCard } };
    }
  });

  // ========== Legend strip on Summary ==========
  const legendRow = rr + 2;
  summary.getCell(`A${legendRow}`).value = 'Status color legend';
  summary.getCell(`A${legendRow}`).font = { bold: true };
  const legend = [
    ['Completed', COLORS.completed, COLORS.completedFg],
    ['Planned', COLORS.planned, COLORS.plannedFg],
    ['Buffer', COLORS.buffer, COLORS.bufferFg],
    ['In Progress', COLORS.inProgress, COLORS.inProgressFg],
    ['Blocked', COLORS.blocked, COLORS.blockedFg],
  ];
  legend.forEach((L, i) => {
    const cell = summary.getCell(legendRow + 1 + i, 1);
    cell.value = L[0];
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: L[1] } };
    cell.font = { bold: true, color: { argb: L[2] } };
  });

  const outPath = path.join(__dirname, '..', 'docs', 'BlueTriangle_Portal_Automation_Testing_Plan.xlsx');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  await wb.xlsx.writeFile(outPath);

  console.log(`Wrote plan → ${outPath}`);
  console.log(
    `Screens: ${screenRows.length} total | ${completedScreens.length} completed | ${plannedScreens.length} planned | buffers: ${bufferRows.length}`
  );
  console.log(`ETA hours: total=${totalEta} completed=${completedEta} remaining=${remainingEta}`);
  console.log(`Projected end: ${planEnd}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
