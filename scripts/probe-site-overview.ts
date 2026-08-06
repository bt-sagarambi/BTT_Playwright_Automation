/**
 * Live probe: Site Overview (preconfigured dashboard)
 * Run: npx tsx scripts/probe-site-overview.ts
 */
import { chromium, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { ensurePortalSession } from '../helpers/portalSession';
import { SiteDropdownPage } from '../pages/SiteDropdownPage';
import { LeftNavPage } from '../pages/LeftNavPage';

const outDir = path.join(process.cwd(), 'docs', 'prompts');
const out = path.join(outDir, 'site-overview-live-probe.json');

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
      /dashboard|widget|chart|graph|map|geo|device|revenue|performance|filter|time|lookback|refresh|period|timezone|highchart|metric|switch|auto|marker|inactive|table|card|export|menu|legend|onLoad|order|session|page.?view|mobile|desktop|tablet/i.test(
        id
      )
    )
    .slice(0, 300);
  const select2 = Array.from(document.querySelectorAll('[id^="select2-"]'))
    .map((el) => ({
      id: el.id,
      text: txt(el).slice(0, 160),
      visible: !!el.getClientRects().length,
    }))
    .slice(0, 100);
  const buttons = Array.from(
    new Set(
      Array.from(document.querySelectorAll('button, a.btn, .btn, [role="button"]'))
        .map((el) => txt(el))
        .filter((t) => t && t.length > 0 && t.length < 100)
    )
  ).slice(0, 120);
  const labels = Array.from(
    new Set(
      Array.from(document.querySelectorAll('label, .control-label, .filter-label, th, h1, h2, h3, h4, .panel-title, .widget-title, .box-title, [role="tab"]'))
        .map((el) => txt(el))
        .filter((t) => t && t.length > 0 && t.length < 140)
    )
  ).slice(0, 150);
  const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,.panel-title,.widget-title,.box-title,.card-title'))
    .map((el) => txt(el))
    .filter((t) => t && t.length < 140)
    .slice(0, 80);
  const tabs = Array.from(
    document.querySelectorAll(
      '[role="tab"], .nav-tabs a, .nav-tabs li, .ci-tab, .btt-tab, .page-tab, .nav-pills a, [data-toggle="tab"]'
    )
  )
    .map((el) => ({
      id: el.id || '',
      text: txt(el).slice(0, 100),
      cls: String(el.className || '').slice(0, 120),
      active: /active|selected/i.test(String(el.className || '')),
    }))
    .filter((t) => t.text)
    .slice(0, 60);
  const charts = Array.from(document.querySelectorAll('.highcharts-container, [data-highcharts-chart], svg.highcharts-root'))
    .map((el, i) => {
      const host = el.closest('[id]') || el.parentElement;
      const box = el.getBoundingClientRect();
      return {
        i,
        hostId: (host && host.id) || '',
        w: Math.round(box.width),
        h: Math.round(box.height),
        title: txt(el.querySelector('.highcharts-title, .highcharts-subtitle') || el).slice(0, 120),
      };
    })
    .slice(0, 40);
  const widgets = Array.from(
    document.querySelectorAll(
      '.dashboard-widget, .widget, [class*="widget"], .grid-stack-item, [id*="widget"], .panel.panel-default'
    )
  )
    .map((el) => ({
      id: el.id || '',
      cls: String(el.className || '').slice(0, 160),
      title: txt(el.querySelector('.panel-title, .widget-title, h3, h4, .box-title') || el).slice(0, 160),
      visible: !!el.getClientRects().length,
    }))
    .filter((w) => w.title || w.id)
    .slice(0, 40);
  const mapHosts = Array.from(document.querySelectorAll('[id*="map"], [id*="geo"], [id*="geography"], .highcharts-map-series, .highcharts-map-group'))
    .map((el) => ({ id: el.id || '', cls: String(el.className || '').slice(0, 100), text: txt(el).slice(0, 80) }))
    .slice(0, 30);
  const optionGroups = Array.from(document.querySelectorAll('#switch-dashboard optgroup, select[id*="dashboard"] optgroup')).map((g) => ({
    label: g.getAttribute('label') || '',
    options: Array.from(g.querySelectorAll('option'))
      .map((o) => ({
        value: o.value || '',
        text: txt(o).slice(0, 120),
        selected: !!o.selected,
        preconfigured: o.getAttribute('data-preconfigured'),
        marketing: o.getAttribute('data-marketing'),
        favorite: o.getAttribute('data-favorite'),
      }))
      .slice(0, 40),
  }));
  const rawOptions = Array.from(document.querySelectorAll('#switch-dashboard option, select[id*="dashboard"] option'))
    .map((o) => txt(o))
    .filter(Boolean)
    .slice(0, 80);
  const filterChrome = {
    toggleFilters: !!document.querySelector('#toggle-filters, #mobile-controls-filters-btn, [title*="Filter" i], [aria-label*="Filter" i]'),
    applyFilters: !!document.querySelector('#apply-filters'),
    cancelFilters: !!document.querySelector('#cancel-filters'),
    timePeriod: !!document.querySelector('#time-period, #time-lookback, #time-period-row'),
    switchDashboard: !!document.querySelector('#switch-dashboard, #select2-switch-dashboard-container'),
    autoRefresh: !!document.querySelector('#auto-refresh'),
    refreshDashboard: !!document.querySelector('#refresh-dashboard'),
    wrench: !!document.querySelector('[title*="Dashboard Manager" i], #view-or-edit, .fa-wrench, [class*="wrench"]'),
  };
  const bodySample = txt(document.body).slice(0, 2500);
  return {
    title: document.title,
    url: location.href,
    pageTitle: txt(document.querySelector('#page-title')),
    breadcrumbs: txt(document.querySelector('.breadcrumb, #page-title, .page-header')),
    interestingIds: interesting,
    select2,
    buttons,
    labels,
    headings,
    tabs,
    charts,
    widgets,
    mapHosts,
    optionGroups,
    rawDashboardOptions: rawOptions,
    filterChrome,
    bodySample,
  };
})()`;

async function dismiss(page: Page) {
  for (let i = 0; i < 4; i++) {
    const open = page.locator('.jconfirm.jconfirm-open, .modal.in, .blockUI');
    if (!(await open.first().isVisible().catch(() => false))) break;
    const btn = page
      .locator('.jconfirm.jconfirm-open button, .modal.in button')
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

async function selectDashboardByText(page: Page, re: RegExp): Promise<boolean> {
  const container = page.locator('#select2-switch-dashboard-container, #switch-dashboard + .select2, [aria-labelledby*="switch-dashboard"]').first();
  const native = page.locator('#switch-dashboard').first();

  if (await container.isVisible().catch(() => false)) {
    await container.click({ force: true });
    await page.waitForTimeout(500);
    const opt = page.locator('.select2-results__option').filter({ hasText: re }).first();
    if (await opt.isVisible().catch(() => false)) {
      await opt.click({ force: true });
      await page.waitForTimeout(4000);
      return true;
    }
    await page.keyboard.press('Escape').catch(() => undefined);
  }

  if ((await native.count()) > 0) {
    const labels = await native.locator('option').allTextContents();
    const match = labels.find((t) => re.test(t.replace(/\s+/g, ' ').trim()));
    if (match) {
      await native.selectOption({ label: match }).catch(async () => {
        const val = await native.locator('option').filter({ hasText: re }).first().getAttribute('value');
        if (val) await native.selectOption(val);
      });
      await page.waitForTimeout(4000);
      return true;
    }
  }
  return false;
}

async function openFilters(page: Page) {
  const toggle = page
    .locator('#toggle-filters, #mobile-controls-filters-btn, button[title*="Filter" i], [aria-label*="Filter" i]')
    .first();
  if (await toggle.isVisible().catch(() => false)) {
    await toggle.click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(1000);
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: path.join(process.cwd(), 'playwright/.auth/user.json'),
  });
  const page = await context.newPage();
  const result: Record<string, unknown> = { probes: [] as unknown[] };

  try {
    await ensurePortalSession(page);
    await new SiteDropdownPage(page).ensureProfileSite();

    // Path A: Business menu Dashboards (site/dashboard)
    try {
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
      const snapA = await page.evaluate(SNAPSHOT_JS);
      (result.probes as unknown[]).push({ path: 'biz.dashboards site/dashboard', snapshot: snapA });
      save({ afterDashboardsNav: snapA });

      const selected = await selectDashboardByText(page, /Site Overview/i);
      await dismiss(page);
      await page.waitForTimeout(5000);
      const snapSite = await page.evaluate(SNAPSHOT_JS);
      (result.probes as unknown[]).push({
        path: 'site/dashboard after Site Overview select',
        selected,
        snapshot: snapSite,
      });
      save({ afterSiteOverviewSelect: { selected, snap: snapSite } });

      await openFilters(page);
      const snapFilters = await page.evaluate(SNAPSHOT_JS);
      (result.probes as unknown[]).push({ path: 'filters open on site overview', snapshot: snapFilters });
      save({ filtersOpen: snapFilters });
    } catch (err) {
      result.dashboardsPathError = err instanceof Error ? err.message : String(err);
      save({ dashboardsPathError: result.dashboardsPathError });
    }

    // Path B: Digital Experience Overview (overview-dashboard/overview)
    try {
      await new LeftNavPage(page).openSmokePage({
        id: 'rum.dxo',
        module: 'rum',
        menuLabel: 'Digital Experience Overview',
        route: 'overview-dashboard/overview',
        titleIncludes: /Digital Experience Overview|Overview|Dashboard/i,
      });
      await dismiss(page);
      await page.waitForTimeout(3000);
      const snapDxo = await page.evaluate(SNAPSHOT_JS);
      (result.probes as unknown[]).push({ path: 'rum.dxo overview-dashboard/overview', snapshot: snapDxo });
      save({ afterDxo: snapDxo });

      const selected = await selectDashboardByText(page, /Site Overview/i);
      await dismiss(page);
      await page.waitForTimeout(5000);
      const snapDxoSite = await page.evaluate(SNAPSHOT_JS);
      (result.probes as unknown[]).push({
        path: 'dxo after Site Overview select',
        selected,
        snapshot: snapDxoSite,
      });
      save({ afterDxoSiteOverview: { selected, snap: snapDxoSite } });
    } catch (err) {
      result.dxoPathError = err instanceof Error ? err.message : String(err);
      save({ dxoPathError: result.dxoPathError });
    }

    // Direct URL attempt to overview with common params
    try {
      await page.goto('/btportal/web/index.php?r=overview-dashboard/overview', {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
      await dismiss(page);
      await page.waitForTimeout(3000);
      await selectDashboardByText(page, /Site Overview/i);
      await page.waitForTimeout(4000);
      const snapDirect = await page.evaluate(SNAPSHOT_JS);
      (result.probes as unknown[]).push({ path: 'direct overview-dashboard/overview', snapshot: snapDirect });
      save({ directOverview: snapDirect });
    } catch (err) {
      result.directError = err instanceof Error ? err.message : String(err);
    }

    save({ final: result });
    console.log('[probe-site-overview] wrote', out);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
