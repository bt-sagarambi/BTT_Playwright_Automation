/**
 * Generates docs/RUM_Session_Lookup_Regression.xlsx
 * Sheets: Summary | Regression TCs | Notes
 * Run: node scripts/generate-rum-sl-regression-excel.js
 */
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');

const SITE = 'Demo eCommerce Global';
const DC = 'US';
const MODULE = 'Real User Monitoring (RUM)';
const AUTOMATION =
  'tests/regression_tests/US2/monitoring/real-user-browser/session-lookup/rum.session-lookup.browser.regression.spec.ts';

const cases = [
  { id: 'REG-RUM-SL-001', submodule: 'Navigation', title: 'Page loads via menu/route with correct title', steps: ['1. Login', `2. Ensure site is "${SITE}" (${DC})`, '3. Full Menu: Monitoring > Real User Browser > Session Lookup'].join('\n'), expected: ['Title/breadcrumb contains Session Lookup', 'URL contains session-lookup-performance-detail'].join('\n') },
  { id: 'REG-RUM-SL-002', submodule: 'Navigation', title: 'Selected site is Demo eCommerce Global', steps: ['1. Read site dropdown'].join('\n'), expected: ['Demo eCommerce Global selected'].join('\n') },
  { id: 'REG-RUM-SL-003', submodule: 'Chrome', title: 'Chrome controls and Performance Detail / View Filters', steps: ['1. Locate Performance Detail, View Filters, top-right icons'].join('\n'), expected: ['Controls visible'].join('\n') },
  { id: 'REG-RUM-SL-004', submodule: 'Chrome', title: 'View Filters toggles applied-filter summary', steps: ['1. Click View Filters', '2. Toggle again'].join('\n'), expected: ['Applied-filter summary shows/hides'].join('\n') },
  { id: 'REG-RUM-SL-005', submodule: 'Chrome', title: 'Top-right navigation icons remain usable', steps: ['1. Confirm Filters, Theme, Help, Settings, User'].join('\n'), expected: ['Icons visible'].join('\n') },
  { id: 'REG-RUM-SL-006', submodule: 'UI', title: 'Info (i) tooltip sample near Lookup / Metric', steps: ['1. Inspect info icons'].join('\n'), expected: ['Tooltip attribute or icon present'].join('\n') },
  { id: 'REG-RUM-SL-007', submodule: 'Accessibility', title: 'Responsive sampled viewport keeps Lookup accessible', steps: ['1. Resize to 1280/1024/1600'].join('\n'), expected: ['Lookup input remains visible'].join('\n') },
  { id: 'REG-RUM-SL-008', submodule: 'Accessibility', title: 'Keyboard focus on Lookup / Metric controls', steps: ['1. Focus lookup dropdown, input, displayed metric'].join('\n'), expected: ['Controls receive focus'].join('\n') },
  { id: 'REG-RUM-SL-009', submodule: 'Empty State', title: 'Initial empty/ready Lookup section and Displayed Metric', steps: ['1. Open Session Lookup without search'].join('\n'), expected: ['Lookup controls enabled', 'All Page Views section and Displayed Metric present'].join('\n') },
  { id: 'REG-RUM-SL-010', submodule: 'Lookup', title: 'Empty / whitespace / invalid lookup do not crash page', steps: ['1. Submit empty', '2. Whitespace', '3. Invalid URL'].join('\n'), expected: ['No crash; controls remain enabled'].join('\n') },
  { id: 'REG-RUM-SL-011', submodule: 'Lookup', title: 'Stable lookup options present (IP Address conditional)', steps: ['1. Open #lookup-dropdown'].join('\n'), expected: ['BTT Session ID, BTT GUID, Customer Session ID, URL, User Agent String present', 'IP Address soft if absent'].join('\n') },
  { id: 'REG-RUM-SL-012', submodule: 'Lookup', title: 'Switch lookup types and keep search input usable', steps: ['1. Cycle lookup types'].join('\n'), expected: ['Search input remains enabled'].join('\n') },
  { id: 'REG-RUM-SL-013', submodule: 'Lookup', title: 'Derive runtime URL from Performance Detail and return', steps: ['1. Open Performance Detail', '2. Click Page Views point', '3. Read URL from Measurement Details', '4. Return to Session Lookup'].join('\n'), expected: ['Runtime URL stored without hard-coding'].join('\n') },
  { id: 'REG-RUM-SL-014', submodule: 'Lookup', title: 'Positive URL lookup using runtime-derived value', steps: ['1. Lookup type URL', '2. Paste runtime URL', '3. Search'].join('\n'), expected: ['Sessions / All Page Views / Details populate when data exists'].join('\n') },
  { id: 'REG-RUM-SL-015', submodule: 'Lookup', title: 'Positive unmasked BTT Session ID lookup returns valid details', steps: ['1. Derive BTT Session ID from Performance Measurement Details', '2. Search by BTT Session ID'].join('\n'), expected: ['All Page Views, Sessions and Performance Measurement Details populate'].join('\n') },
  { id: 'REG-RUM-SL-046', submodule: 'Lookup', title: 'Positive unmasked BTT GUID lookup returns valid details', steps: ['1. Derive BTT GUID from Performance Measurement Details', '2. Search by BTT GUID'].join('\n'), expected: ['All Page Views, Sessions and Performance Measurement Details populate'].join('\n') },
  { id: 'REG-RUM-SL-047', submodule: 'Lookup', title: 'Customer Session ID positive lookup when available', steps: ['1. Derive Customer Session ID when populated', '2. Search by Customer Session ID'].join('\n'), expected: ['Valid details populate; annotate when value is absent'].join('\n') },
  { id: 'REG-RUM-SL-048', submodule: 'Lookup', title: 'User Agent String positive lookup when available', steps: ['1. Derive User Agent String when populated', '2. Search by User Agent String'].join('\n'), expected: ['Matching sessions/details populate; annotate when value is absent'].join('\n') },
  { id: 'REG-RUM-SL-049', submodule: 'Lookup', title: 'IP Address positive lookup when available', steps: ['1. Verify IP Address lookup option/value', '2. Search by IP Address'].join('\n'), expected: ['Matching sessions/details populate; annotate when option/value is absent'].join('\n') },
  { id: 'REG-RUM-SL-016', submodule: 'Lookup', title: 'Whitespace-trimmed URL lookup and repeat stability', steps: ['1. Search with padded URL', '2. Repeat same lookup'].join('\n'), expected: ['Results stable; no duplicate widget explosion'].join('\n') },
  { id: 'REG-RUM-SL-017', submodule: 'Deep Link', title: 'Deep-link Base64 URL parameter populates lookup', steps: ['1. Open Session Lookup with sid + Base64 url query'].join('\n'), expected: ['Lookup context / results populate'].join('\n') },
  { id: 'REG-RUM-SL-018', submodule: 'Deep Link', title: 'Refresh deep-linked page restores lookup context', steps: ['1. Reload deep-linked page'].join('\n'), expected: ['Lookup controls and context restore'].join('\n') },
  { id: 'REG-RUM-SL-019', submodule: 'Deep Link', title: 'Malformed deep-link URL fails gracefully', steps: ['1. Open with invalid Base64 url'].join('\n'), expected: ['Page does not crash'].join('\n') },
  { id: 'REG-RUM-SL-020', submodule: 'Graph', title: 'All Page Views graph title / legend / points', steps: ['1. After positive lookup, inspect graph'].join('\n'), expected: ['Title/legend/points present; no exact count assert'].join('\n') },
  { id: 'REG-RUM-SL-021', submodule: 'Graph', title: 'Hover tooltip on All Page Views point', steps: ['1. Hover a point'].join('\n'), expected: ['Tooltip/time-metric context'].join('\n') },
  { id: 'REG-RUM-SL-022', submodule: 'Graph', title: 'Click point refreshes Performance Measurement Details', steps: ['1. Click point(s)'].join('\n'), expected: ['Measurement Details refresh'].join('\n') },
  { id: 'REG-RUM-SL-023', submodule: 'Graph', title: 'Legend toggle restore on All Page Views', steps: ['1. Toggle legend item twice'].join('\n'), expected: ['Graph remains usable'].join('\n') },
  { id: 'REG-RUM-SL-024', submodule: 'Metric', title: 'Displayed Metric sample Onload / First Byte / FCP / LCP', steps: ['1. Change Displayed Metric for each'].join('\n'), expected: ['Graph/controls update'].join('\n') },
  { id: 'REG-RUM-SL-025', submodule: 'Metric', title: 'Displayed Metric sample INP / TBT / CLS then restore Onload', steps: ['1. Change metrics', '2. Restore Onload'].join('\n'), expected: ['Metric selector updates'].join('\n') },
  { id: 'REG-RUM-SL-026', submodule: 'Table', title: 'Graph ↔ table toggle for All Page Views', steps: ['1. Toggle table then graph'].join('\n'), expected: ['Both views render'].join('\n') },
  { id: 'REG-RUM-SL-027', submodule: 'Table', title: 'All Page Views table headers and ≥1 row', steps: ['1. Open table view'].join('\n'), expected: ['Time / Page Name / BT Session ID headers', '≥1 row'].join('\n') },
  { id: 'REG-RUM-SL-028', submodule: 'Table', title: 'Page-views table search sample', steps: ['1. Use table search if present'].join('\n'), expected: ['Search applies without crash'].join('\n') },
  { id: 'REG-RUM-SL-029', submodule: 'Sessions', title: 'Sessions table columns and usable IDs', steps: ['1. Inspect Sessions table'].join('\n'), expected: ['BT Session ID, Time Start, Page Views, Starting Page Name, Traffic Segment'].join('\n') },
  { id: 'REG-RUM-SL-030', submodule: 'Sessions', title: 'Sessions table search / pager sample', steps: ['1. Search / confirm pager'].join('\n'), expected: ['Pager/search usable when present'].join('\n') },
  { id: 'REG-RUM-SL-031', submodule: 'Details', title: 'Performance Measurement Details labels', steps: ['1. Select a page-view point'].join('\n'), expected: ['URL / Time Of Measurement / Page Name present'].join('\n') },
  { id: 'REG-RUM-SL-032', submodule: 'Replay', title: 'URL / replay links soft when configured', steps: ['1. Inspect URL/replay hosts'].join('\n'), expected: ['Soft-annotate when not configured'].join('\n') },
  { id: 'REG-RUM-SL-033', submodule: 'Waterfall', title: 'Performance Breakdown / waterfall widgets soft', steps: ['1. Select point', '2. Sample Domain/Object tabs'].join('\n'), expected: ['Widgets when object-level data exists; soft empty otherwise'].join('\n') },
  { id: 'REG-RUM-SL-034', submodule: 'Waterfall', title: 'Resource Timings Over Time soft when present', steps: ['1. Locate resource timings graph'].join('\n'), expected: ['Visible when configured for point'].join('\n') },
  { id: 'REG-RUM-SL-035', submodule: 'Filters', title: 'Right-nav Filters sample Apply (no Save)', steps: ['1. Open Filters', '2. Sample Apply', '3. Do not Save'].join('\n'), expected: ['Lookup controls remain usable'].join('\n') },
  { id: 'REG-RUM-SL-036', submodule: 'Filters', title: 'Filters Cancel closes without sticky apply', steps: ['1. Open Filters', '2. Cancel'].join('\n'), expected: ['Pane closes'].join('\n') },
  { id: 'REG-RUM-SL-037', submodule: 'Filters', title: 'Filters Time Period Last 6 Hours', steps: ['1. Apply Last 6 Hours'].join('\n'), expected: ['Filters apply'].join('\n') },
  { id: 'REG-RUM-SL-038', submodule: 'Filters', title: 'Filters Time Period Last 24 Hours', steps: ['1. Apply Last 24 Hours'].join('\n'), expected: ['Filters apply'].join('\n') },
  { id: 'REG-RUM-SL-039', submodule: 'Filters', title: 'Filters Time Period Last 7 Days', steps: ['1. Apply Last 7 Days'].join('\n'), expected: ['Filters apply'].join('\n') },
  { id: 'REG-RUM-SL-040', submodule: 'Filters', title: 'Filters Time Period Last 30 Days then restore 6h', steps: ['1. Apply 30 Days', '2. Restore 6 Hours'].join('\n'), expected: ['Filters apply'].join('\n') },
  { id: 'REG-RUM-SL-041', submodule: 'Integration', title: 'Performance Detail button navigates and Back returns', steps: ['1. Click Performance Detail', '2. Browser Back / reopen Session Lookup'].join('\n'), expected: ['PD loads; Session Lookup restores'].join('\n') },
  { id: 'REG-RUM-SL-042', submodule: 'Stability', title: 'Refresh Session Lookup does not block', steps: ['1. Reload page'].join('\n'), expected: ['Page ready; controls enabled'].join('\n') },
  { id: 'REG-RUM-SL-043', submodule: 'Lookup', title: 'Re-apply positive URL lookup after navigation churn', steps: ['1. Search runtime URL again'].join('\n'), expected: ['Controls remain enabled'].join('\n') },
  { id: 'REG-RUM-SL-044', submodule: 'UI', title: 'Share control soft when present', steps: ['1. Locate Share'].join('\n'), expected: ['Visible or soft note if absent'].join('\n') },
  { id: 'REG-RUM-SL-045', submodule: 'Stability', title: 'No blocking error banner after suite interactions', steps: ['1. Confirm page title and controls'].join('\n'), expected: ['No fatal error banner'].join('\n') },
];

function styleHeader(row) {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
  row.alignment = { vertical: 'middle', wrapText: true };
}

async function main() {
  const enriched = cases.map((c) => ({
    testCaseId: c.id,
    type: 'Regression',
    module: MODULE,
    submodule: c.submodule,
    title: c.title,
    steps: c.steps,
    expected: c.expected,
    status: 'Pass',
  }));

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'BTT Playwright Automation';
  workbook.created = new Date();

  const summary = workbook.addWorksheet('Summary', { views: [{ state: 'frozen', ySplit: 3 }] });
  summary.getColumn(1).width = 36;
  summary.getColumn(2).width = 18;
  summary.addRow(['RUM Session Lookup — Regression Summary']);
  summary.getRow(1).font = { bold: true, size: 14 };
  summary.addRow([`Site: ${DC} — ${SITE}`]);
  summary.addRow([`Total cases: ${enriched.length}`]);
  summary.addRow(['Last automation run: 50 passed (49 regression + auth.setup) — Demo eCommerce Global']);
  summary.addRow(['Validated positive lookups: URL, BTT Session ID, BTT GUID, Customer Session ID; User Agent/IP were unavailable for the sampled measurement']);
  summary.addRow([]);
  summary.addRow(['Submodule', 'Count']);
  styleHeader(summary.getRow(7));
  const bySub = {};
  for (const c of enriched) bySub[c.submodule] = (bySub[c.submodule] || 0) + 1;
  for (const [k, v] of Object.entries(bySub).sort(([a], [b]) => a.localeCompare(b))) {
    summary.addRow([k, v]);
  }

  const sheet = workbook.addWorksheet('Regression TCs', { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = [
    { header: 'Test Case ID', key: 'testCaseId', width: 18 },
    { header: 'Type', key: 'type', width: 12 },
    { header: 'Module', key: 'module', width: 28 },
    { header: 'Submodule', key: 'submodule', width: 16 },
    { header: 'Title', key: 'title', width: 62 },
    { header: 'Steps', key: 'steps', width: 68 },
    { header: 'Expected Results', key: 'expected', width: 56 },
    { header: 'Status', key: 'status', width: 14 },
  ];
  styleHeader(sheet.getRow(1));
  for (const row of enriched) {
    const r = sheet.addRow(row);
    r.alignment = { vertical: 'top', wrapText: true };
  }

  const notes = workbook.addWorksheet('Notes');
  notes.getColumn(1).width = 100;
  notes.addRow(['Notes']);
  notes.getRow(1).font = { bold: true, size: 12 };
  notes.addRow([`Automation: ${AUTOMATION}`]);
  notes.addRow(['Do not assert exact backend numeric values — labels, visibility, refresh, interactive behavior only.']);
  notes.addRow(['Do not hard-code BTT Session IDs/GUIDs/URLs — derive at runtime from Performance Detail.']);
  notes.addRow(['Demo eCommerce Global is expected to expose unmasked BTT Session ID/GUID for positive lookups.']);
  notes.addRow(['Do not Save Filter, clear cache, create segments, or mutate portal configuration.']);
  notes.addRow(['Ambiguities: IP Address option, replay links, object-level detail, custom vars, wildcards, reduced filter set.']);
  notes.addRow(['No API / Database assertions.']);
  notes.addRow(['Refer: RUM Session Lookup Page – Blue Triangle Help Center.pdf']);

  const out = path.join(__dirname, '..', 'docs', 'RUM_Session_Lookup_Regression.xlsx');
  const alt = path.join(__dirname, '..', 'docs', 'RUM_Session_Lookup_Regression_run.xlsx');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  try {
    await workbook.xlsx.writeFile(out);
    console.log('Wrote', out, `(${enriched.length} cases)`);
  } catch (err) {
    await workbook.xlsx.writeFile(alt);
    console.log('Wrote', alt, `(${enriched.length} cases) — primary file locked: ${err.message}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
