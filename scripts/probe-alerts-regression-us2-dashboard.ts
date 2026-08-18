/**
 * Live probe: Alerts Regression - US2 (custom/shared dashboard)
 * Nav: Dashboards → #switch-dashboard → exact "Alerts Regression - US2"
 * Run: npx tsx scripts/probe-alerts-regression-us2-dashboard.ts
 */
import { chromium, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { ensurePortalSession } from '../helpers/portalSession';
import { SiteDropdownPage } from '../pages/SiteDropdownPage';
import { LeftNavPage } from '../pages/LeftNavPage';

const DASHBOARD_EXACT = 'Alerts Regression - US2';
const DASHBOARD_RE = /^\s*Alerts Regression\s*-\s*US2\s*$/i;

const outDir = path.join(process.cwd(), 'docs', 'prompts');
const out = path.join(outDir, 'alerts-regression-us2-dashboard-live-probe.json');
const shot = path.join(outDir, 'alerts-regression-us2-dashboard-live.png');

function save(obj: Record<string, unknown>) {
  fs.mkdirSync(outDir, { recursive: true });
  let prev: Record<string, unknown> = {};
  try {
    prev = JSON.parse(fs.readFileSync(out, 'utf8'));
  } catch {
    // ignore
  }
  fs.writeFileSync(out, JSON.stringify({ ...prev, ...obj, savedAt: new Date().toISOString() }, null, 2));
}

const SNAPSHOT_JS = `(() => {
  const txt = (el) => ((el && (el.innerText || el.textContent)) || '').replace(/\\s+/g, ' ').trim();
  const allIds = Array.from(document.querySelectorAll('[id]')).map((el) => el.id).filter(Boolean);
  const interesting = allIds
    .filter((id) =>
      /dashboard|widget|chart|graph|map|geo|device|revenue|performance|vital|pulse|filter|time|lookback|refresh|period|timezone|highchart|metric|switch|auto|marker|table|card|export|legend|onload|lcp|cls|inp|session|page|synthetic|avail|scatter|screenshot|error|health|test|browser|regression|waterfall|film|har|grid|alert|announce|deo|anomal|opportunit|warning|critical|notification/i.test(
        id
      )
    )
    .slice(0, 450);
  const select2 = Array.from(document.querySelectorAll('[id^="select2-"]'))
    .map((el) => ({
      id: el.id,
      text: txt(el).slice(0, 200),
      visible: !!el.getClientRects().length,
    }))
    .slice(0, 120);
  const buttons = Array.from(
    new Set(
      Array.from(document.querySelectorAll('button, a.btn, .btn, [role="button"]'))
        .map((el) => txt(el) || el.getAttribute('title') || el.getAttribute('aria-label') || '')
        .filter((t) => t && t.length > 0 && t.length < 120)
    )
  ).slice(0, 160);
  const labels = Array.from(
    new Set(
      Array.from(document.querySelectorAll('label, .control-label, .filter-label, th, h1, h2, h3, h4, .panel-title, .widget-title, .box-title, [role="tab"], legend'))
        .map((el) => txt(el))
        .filter((t) => t && t.length > 0 && t.length < 160)
    )
  ).slice(0, 220);
  const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,.panel-title,.widget-title,.box-title,.card-title'))
    .map((el) => txt(el))
    .filter((t) => t && t.length < 160)
    .slice(0, 140);
  const tabs = Array.from(
    document.querySelectorAll(
      '[role="tab"], .nav-tabs a, .nav-tabs li, .ci-tab, .btt-tab, .page-tab, .nav-pills a, [data-toggle="tab"], #my-filters-tab, #shared-filters-tab'
    )
  )
    .map((el) => ({
      id: el.id || '',
      text: txt(el).slice(0, 100),
      cls: String(el.className || '').slice(0, 140),
      active: /active|selected/i.test(String(el.className || '')),
    }))
    .filter((t) => t.text)
    .slice(0, 80);
  const charts = Array.from(document.querySelectorAll('.highcharts-container, [data-highcharts-chart]'))
    .map((el, i) => {
      const host = el.closest('[id]') || el.parentElement;
      const box = el.getBoundingClientRect();
      const legend = Array.from(el.querySelectorAll('.highcharts-legend-item, .highcharts-legend text'))
        .map((n) => txt(n))
        .filter(Boolean)
        .slice(0, 25);
      return {
        i,
        id: el.id || '',
        hostId: (host && host.id) || '',
        parentId: el.parentElement ? el.parentElement.id : '',
        w: Math.round(box.width),
        h: Math.round(box.height),
        title: txt(el.querySelector('.highcharts-title, .highcharts-subtitle')).slice(0, 160),
        legend,
      };
    })
    .filter((c) => c.w > 10 && c.h > 10)
    .slice(0, 80);
  const widgets = Array.from(document.querySelectorAll('.grid-stack-item, .dashboard-widget, .gs-item'))
    .map((el) => {
      const img = el.querySelector('img[alt]');
      const title =
        (img && img.getAttribute('alt')) ||
        txt(el.querySelector('.panel-title, .widget-title, h3, h4, .box-title, .card-header') || el).slice(0, 180);
      const box = el.getBoundingClientRect();
      const tableHeaders = Array.from(el.querySelectorAll('th'))
        .map((th) => txt(th))
        .filter(Boolean)
        .slice(0, 40);
      const ids = Array.from(el.querySelectorAll('[id]'))
        .map((n) => n.id)
        .filter(Boolean)
        .slice(0, 30);
      return {
        id: el.id || '',
        title: title.slice(0, 180),
        visible: !!el.getClientRects().length,
        w: Math.round(box.width),
        h: Math.round(box.height),
        hasChart: !!el.querySelector('.highcharts-container, svg.highcharts-root'),
        hasTable: !!el.querySelector('table'),
        tableHeaders,
        childIds: ids,
        bodySample: txt(el).slice(0, 1000),
      };
    })
    .filter((w) => w.title || w.id || w.hasChart || w.hasTable)
    .slice(0, 80);
  const tables = Array.from(document.querySelectorAll('table'))
    .map((tb) => ({
      id: tb.id || '',
      className: String(tb.className || '').slice(0, 140),
      headers: Array.from(tb.querySelectorAll('thead th, tr th'))
        .map((th) => txt(th))
        .filter(Boolean)
        .slice(0, 40),
      rows: tb.querySelectorAll('tbody tr').length,
      visible: !!tb.getClientRects().length,
    }))
    .filter((t) => t.headers.length || t.id)
    .slice(0, 40);
  const optionGroups = Array.from(document.querySelectorAll('#switch-dashboard optgroup')).map((g) => ({
    label: g.getAttribute('label') || '',
    options: Array.from(g.querySelectorAll('option'))
      .map((o) => ({
        value: o.value || '',
        text: txt(o).slice(0, 140),
        selected: !!o.selected,
      }))
      .slice(0, 80),
  }));
  // Flat option list for search hits
  const allDashOptions = Array.from(document.querySelectorAll('#switch-dashboard option'))
    .map((o) => ({
      text: txt(o).slice(0, 140),
      value: o.value || '',
      selected: !!o.selected,
      group: (o.parentElement && o.parentElement.getAttribute && o.parentElement.getAttribute('label')) || '',
    }))
    .filter((o) => o.text)
    .slice(0, 200);
  const syntheticHits = allDashOptions.filter((o) => /synthetic|regression|US2|alert|announce/i.test(o.text));
  const filterChrome = {
    toggleFilters: !!document.querySelector('#toggle-filters, #mobile-controls-filters-btn'),
    applyFilters: !!document.querySelector('#apply-filters'),
    cancelFilters: !!document.querySelector('#cancel-filters'),
    timeLookback: !!document.querySelector('#time-lookback'),
    switchDashboard: !!document.querySelector('#switch-dashboard, #select2-switch-dashboard-container'),
    autoRefresh: !!document.querySelector('#auto-refresh'),
    refreshDashboard: !!document.querySelector('#refresh-dashboard'),
    lastUpdated: txt(document.querySelector('#last-updated-dashboard')).slice(0, 120),
    myFilters: !!document.querySelector('#my-filters-tab'),
    sharedFilters: !!document.querySelector('#shared-filters-tab'),
  };
  const bodySample = txt(document.body).slice(0, 5500);
  return {
    title: document.title,
    url: location.href,
    pageTitle: txt(document.querySelector('#page-title')),
    interestingIds: interesting,
    select2,
    buttons,
    labels,
    headings,
    tabs,
    charts,
    widgets,
    tables,
    optionGroups,
    allDashOptions,
    syntheticHits,
    filterChrome,
    bodySample,
    highcharts: charts.length,
  };
})()`;

async function dismiss(page: Page) {
  for (let i = 0; i < 5; i++) {
    const open = page.locator('.jconfirm.jconfirm-open, .modal.in, .blockUI, .get-started');
    if (!(await open.first().isVisible().catch(() => false))) break;
    const btn = page
      .locator('.jconfirm.jconfirm-open button, .modal.in button, .get-started button')
      .filter({ hasText: /ok|close|yes|got it|don't show|dismiss|continue|agree/i })
      .first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click({ force: true }).catch(() => undefined);
    } else {
      await page.keyboard.press('Escape').catch(() => undefined);
    }
    await page.waitForTimeout(400);
  }
}

async function selectDashboardExact(page: Page, exact: string, re: RegExp): Promise<{
  selected: boolean;
  matchedText: string;
  group: string;
  note: string;
}> {
  const container = page.locator('#select2-switch-dashboard-container').first();
  const native = page.locator('#switch-dashboard').first();

  // Prefer Select2 open + exact option text
  if (await container.isVisible().catch(() => false)) {
    await container.click({ force: true });
    await page.waitForTimeout(600);
    // Type to filter if search box present
    const search = page.locator('.select2-search__field, input.select2-search__field').first();
    if (await search.isVisible().catch(() => false)) {
      await search.fill('Alerts Regression').catch(() => undefined);
      await page.waitForTimeout(500);
    }
    const options = page.locator('.select2-results__option');
    const count = await options.count();
    for (let i = 0; i < count; i++) {
      const text = ((await options.nth(i).textContent()) || '').replace(/\s+/g, ' ').trim();
      if (!re.test(text) && text !== exact) continue;
      // Reject near-misses
      if (/Synthetic Regression|Business Regression|Marketing Regression|RUM Regression|Tag Governance/i.test(text) && !/^Alerts Regression/i.test(text))
        continue;
      await options.nth(i).click({ force: true });
      await page.waitForTimeout(8000);
      return { selected: true, matchedText: text, group: 'select2', note: `clicked select2 option "${text}"` };
    }
    await page.keyboard.press('Escape').catch(() => undefined);
  }

  if ((await native.count()) > 0) {
    const opts = native.locator('option');
    const n = await opts.count();
    for (let i = 0; i < n; i++) {
      const text = ((await opts.nth(i).textContent()) || '').replace(/\s+/g, ' ').trim();
      if (!re.test(text) && text !== exact) continue;
      const val = await opts.nth(i).getAttribute('value');
      if (val) await native.selectOption(val);
      else await native.selectOption({ label: text }).catch(() => undefined);
      await page.waitForTimeout(8000);
      return { selected: true, matchedText: text, group: 'native-select', note: `selected native option "${text}"` };
    }
  }

  return { selected: false, matchedText: '', group: '', note: 'exact dashboard option not found' };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: path.join(process.cwd(), 'playwright/.auth', 'user.json'),
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  try {
    await ensurePortalSession(page);
    await new SiteDropdownPage(page).ensureProfileSite().catch(() => undefined);

    await new LeftNavPage(page).openSmokePage({
      id: 'biz.dashboards',
      module: 'biz',
      menuLabel: 'Dashboards',
      route: 'site/dashboard',
      hrefIncludes: ['site/dashboard'],
      hrefExcludes: ['marketing=yes'],
      titleIncludes: /Dashboard/i,
    });
    await dismiss(page);
    await page.waitForTimeout(3000);
    const before = await page.evaluate(SNAPSHOT_JS);
    save({
      target: DASHBOARD_EXACT,
      afterDashboardsNav: {
        title: (before as any).title,
        pageTitle: (before as any).pageTitle,
        switchText: ((before as any).select2 || []).find((s: any) => /switch-dashboard/i.test(s.id)),
        syntheticHits: (before as any).syntheticHits,
        optionGroupLabels: ((before as any).optionGroups || []).map((g: any) => g.label),
      },
    });

    const sel = await selectDashboardExact(page, DASHBOARD_EXACT, DASHBOARD_RE);
    await dismiss(page);
    await page.waitForTimeout(5000);
    // Wait soft for widgets
    await page
      .locator('.grid-stack-item, .highcharts-container, #page-contents')
      .first()
      .waitFor({ state: 'attached', timeout: 45000 })
      .catch(() => undefined);
    await page.waitForTimeout(4000);

    const after = await page.evaluate(SNAPSHOT_JS);
    await page.screenshot({ path: shot, fullPage: true }).catch(() => undefined);
    save({
      selectResult: sel,
      screenshot: shot,
      snap: {
        url: (after as any).url,
        title: (after as any).title,
        pageTitle: (after as any).pageTitle,
        highcharts: (after as any).highcharts,
        filterChrome: (after as any).filterChrome,
        select2: ((after as any).select2 || []).slice(0, 40),
        buttons: ((after as any).buttons || []).slice(0, 60),
        labels: ((after as any).labels || []).slice(0, 100),
        headings: ((after as any).headings || []).slice(0, 50),
        tabs: ((after as any).tabs || []).slice(0, 40),
        widgets: ((after as any).widgets || []).slice(0, 40),
        charts: ((after as any).charts || []).slice(0, 40),
        tables: ((after as any).tables || []).slice(0, 20),
        interestingIds: ((after as any).interestingIds || []).slice(0, 180),
        syntheticHits: (after as any).syntheticHits,
        optionGroups: ((after as any).optionGroups || []).map((g: any) => ({
          label: g.label,
          count: (g.options || []).length,
          sample: (g.options || []).slice(0, 15),
          hasTarget: (g.options || []).some((o: any) => DASHBOARD_RE.test(o.text)),
        })),
        bodySample: ((after as any).bodySample || '').slice(0, 4500),
      },
    });

    // Filters open
    await page.locator('#toggle-filters, #mobile-controls-filters-btn').first().click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(1500);
    const filters = await page.evaluate(SNAPSHOT_JS);
    save({
      filtersOpen: {
        labels: ((filters as any).labels || []).slice(0, 100),
        select2: ((filters as any).select2 || []).slice(0, 50),
        buttons: ((filters as any).buttons || []).slice(0, 40),
        tabs: ((filters as any).tabs || []).slice(0, 20),
        bodySample: ((filters as any).bodySample || '').slice(0, 3000),
      },
    });
    await page.keyboard.press('Escape').catch(() => undefined);
    await page.locator('#cancel-filters').click({ force: true }).catch(() => undefined);

    // Lookback menu
    await page.locator('#time-lookback').click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(500);
    const lookbackOptions = await page.evaluate(() => {
      const root = document.querySelector('#time-lookback')?.closest('.dropdown, .btn-group, .btn-group-sm') || document.body;
      return [...(root?.querySelectorAll('button.time-option, a, button, li') || [])]
        .map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim())
        .filter((t) => t && t.length < 60)
        .slice(0, 40);
    });
    save({ lookbackOptions: [...new Set(lookbackOptions)] });
    await page.keyboard.press('Escape').catch(() => undefined);

    // Auto refresh menu soft
    await page.locator('#auto-refresh, #auto-refresh-btn-group button').first().click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(400);
    const autoRefreshOptions = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('#auto-refresh-frequency button, #auto-refresh .dropdown-menu a, .auto-refresh-option, button'))
        .map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim())
        .filter((t) => /off|minute|auto refresh/i.test(t) && t.length < 40)
        .slice(0, 20);
    });
    save({ autoRefreshOptions: [...new Set(autoRefreshOptions)] });
    await page.keyboard.press('Escape').catch(() => undefined);

    // Soft Dashboard Manager open/close
    const mgr = page.locator('#dashboard-manager, #dashboard-settings-toggle, button').filter({ hasText: /Dashboard Manager|Manage/i }).first();
    if (await page.locator('#dashboard-manager, #dashboard-settings-toggle').first().isVisible().catch(() => false)) {
      await page.locator('#dashboard-manager, #dashboard-settings-toggle').first().click({ force: true }).catch(() => undefined);
      await page.waitForTimeout(1000);
      const mgrSnap = await page.evaluate(SNAPSHOT_JS);
      save({
        dashboardManagerSoft: {
          opened: true,
          headings: ((mgrSnap as any).headings || []).slice(0, 20),
          buttons: ((mgrSnap as any).buttons || []).slice(0, 30),
        },
      });
      await page.keyboard.press('Escape').catch(() => undefined);
      await page.locator('button, a').filter({ hasText: /^Close$|^Cancel$/i }).first().click({ force: true }).catch(() => undefined);
    }
    void mgr;

    console.log('[probe-alerts-regression-us2] wrote', out);
    console.log('[probe] select=', sel);
    console.log(
      '[probe] switch=',
      ((after as any).select2 || []).find((s: any) => /switch-dashboard/i.test(s.id))
    );
    console.log(
      '[probe] widgets=',
      ((after as any).widgets || []).map((w: any) => w.title).slice(0, 25)
    );
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  save({ fatal: String(e).slice(0, 1000) });
  console.error(e);
  process.exit(1);
});
