/**
 * Live probe: RUM Performance Detail preconfigured dashboard (site/dashboard)
 * NOT Monitoring > Real User Browser > Performance Detail
 * Run: npx tsx scripts/probe-rum-performance-detail-dashboard.ts
 */
import { chromium, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { ensurePortalSession } from '../helpers/portalSession';
import { SiteDropdownPage } from '../pages/SiteDropdownPage';
import { LeftNavPage } from '../pages/LeftNavPage';

const outDir = path.join(process.cwd(), 'docs', 'prompts');
const out = path.join(outDir, 'rum-performance-detail-dashboard-live-probe.json');

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
      /dashboard|widget|chart|graph|filter|time|lookback|refresh|period|timezone|highchart|metric|switch|auto|marker|table|card|export|legend|onload|daily|average|page|timing|detail|bar|cwv|lcp|cls|inp|fid|fcp|ttfb|slick|gear|setting/i.test(
        id
      )
    )
    .slice(0, 500);
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
  ).slice(0, 160);
  const labels = Array.from(
    new Set(
      Array.from(document.querySelectorAll('label, .control-label, .filter-label, th, h1, h2, h3, h4, .panel-title, .widget-title, .box-title, [role="tab"], .slick-header-column, .card-title, .metric-label'))
        .map((el) => txt(el))
        .filter((t) => t && t.length > 0 && t.length < 140)
    )
  ).slice(0, 260);
  const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,.panel-title,.widget-title,.box-title,.card-title'))
    .map((el) => txt(el))
    .filter((t) => t && t.length < 160)
    .slice(0, 120);
  const titleNodes = Array.from(document.querySelectorAll('.grid-stack-item, .dashboard-widget, img[alt]'))
    .map((el) => {
      const alt = el.getAttribute && el.getAttribute('alt');
      const t = alt || txt(el.querySelector('.panel-title, .widget-title, h3, h4, .box-title') || el);
      return t.slice(0, 120);
    })
    .filter((t) => t && t.length > 2 && t.length < 120)
    .slice(0, 100);
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
      const legend = Array.from(el.querySelectorAll('.highcharts-legend-item, .highcharts-legend text'))
        .map((n) => txt(n))
        .filter(Boolean)
        .slice(0, 40);
      const titleEl = el.closest('.grid-stack-item, .panel, .box')?.querySelector('.panel-title, .widget-title, h3, h4, .highcharts-title');
      return {
        i,
        hostId: (host && host.id) || '',
        w: Math.round(box.width),
        h: Math.round(box.height),
        title: txt(titleEl || el.querySelector('.highcharts-title, .highcharts-subtitle') || el).slice(0, 160),
        legend,
      };
    })
    .filter((c) => c.w > 20 && c.h > 20)
    .slice(0, 80);
  const widgets = Array.from(document.querySelectorAll('.grid-stack-item'))
    .map((el) => {
      const img = el.querySelector('img[alt]');
      const title =
        (img && img.getAttribute('alt')) ||
        txt(el.querySelector('.panel-title, .widget-title, h3, h4, .box-title') || el).slice(0, 200);
      const box = el.getBoundingClientRect();
      const tableHeaders = Array.from(el.querySelectorAll('th, .slick-header-column, [role="columnheader"]'))
        .map((th) => txt(th))
        .filter(Boolean)
        .slice(0, 50);
      const cards = Array.from(el.querySelectorAll('.card, .metric-card, .summary-card, [class*="card"]'))
        .map((c) => txt(c).slice(0, 120))
        .filter((t) => t && t.length > 2 && t.length < 120)
        .slice(0, 30);
      return {
        id: el.id || '',
        title: title.slice(0, 200),
        visible: !!el.getClientRects().length,
        w: Math.round(box.width),
        h: Math.round(box.height),
        hasChart: !!el.querySelector('.highcharts-container, svg'),
        hasTable: !!el.querySelector('table, .slick-viewport, [id*="table-for"]'),
        tableHeaders,
        cards,
        bodySample: txt(el).slice(0, 1400),
      };
    })
    .filter((w) => w.title || w.id)
    .slice(0, 60);
  const optionGroups = Array.from(document.querySelectorAll('#switch-dashboard optgroup')).map((g) => ({
    label: g.getAttribute('label') || '',
    options: Array.from(g.querySelectorAll('option'))
      .map((o) => ({
        value: o.value || '',
        text: txt(o).slice(0, 120),
        selected: !!o.selected,
      }))
      .slice(0, 50),
  }));
  const filterChrome = {
    toggleFilters: !!document.querySelector('#toggle-filters, #mobile-controls-filters-btn'),
    applyFilters: !!document.querySelector('#apply-filters'),
    cancelFilters: !!document.querySelector('#cancel-filters'),
    timePeriod: !!document.querySelector('#time-period, #time-lookback, #time-period-row'),
    switchDashboard: !!document.querySelector('#switch-dashboard, #select2-switch-dashboard-container'),
    autoRefresh: !!document.querySelector('#auto-refresh'),
    refreshDashboard: !!document.querySelector('#refresh-dashboard'),
  };
  const bodySample = txt(document.body).slice(0, 6000);
  return {
    title: document.title,
    url: location.href,
    pageTitle: txt(document.querySelector('#page-title')),
    interestingIds: interesting,
    select2,
    buttons,
    labels,
    headings,
    titleNodes: Array.from(new Set(titleNodes)),
    tabs,
    charts,
    widgets,
    optionGroups,
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

const RUM_PD_EXACT = /^\s*RUM Performance Detail\s*$/i;
const RUM_PD_ALT = /^\s*RUM\s+Performance\s+Detail\s+Dashboard\s*$/i;

function isRumPerformanceDetailLabel(text: string): boolean {
  const t = text.replace(/\s+/g, ' ').trim();
  // Must NOT match Synthetic Performance Detail, Native App Performance Detail, etc.
  if (/synthetic|native\s*app|overview/i.test(t)) return false;
  return RUM_PD_EXACT.test(t) || RUM_PD_ALT.test(t) || /^RUM Performance Detail$/i.test(t);
}

async function selectRumPerformanceDetail(page: Page): Promise<boolean> {
  const container = page.locator('#select2-switch-dashboard-container').first();
  const native = page.locator('#switch-dashboard').first();

  if (await container.isVisible().catch(() => false)) {
    await container.click({ force: true });
    await page.waitForTimeout(500);
    const options = page.locator('.select2-results__option');
    const count = await options.count();
    for (let i = 0; i < count; i++) {
      const text = ((await options.nth(i).textContent()) || '').replace(/\s+/g, ' ').trim();
      if (!isRumPerformanceDetailLabel(text)) continue;
      await options.nth(i).click({ force: true });
      await page.waitForTimeout(8000);
      const now = ((await container.textContent()) || '').replace(/\s+/g, ' ').trim();
      return isRumPerformanceDetailLabel(now);
    }
    await page.keyboard.press('Escape').catch(() => undefined);
  }

  if ((await native.count()) > 0) {
    const labels = await native.locator('option').allTextContents();
    const match = labels.find((t) => isRumPerformanceDetailLabel(t.replace(/\s+/g, ' ').trim()));
    if (match) {
      await native.selectOption({ label: match }).catch(async () => {
        const val = await native
          .locator('option')
          .filter({ hasText: /^\s*RUM Performance Detail\s*$/i })
          .first()
          .getAttribute('value');
        if (val) await native.selectOption(val);
      });
      await page.waitForTimeout(8000);
      return true;
    }
  }
  return false;
}

async function ensureGdc(page: Page) {
  await new SiteDropdownPage(page).ensureProfileSite().catch(async () => {
    const qs = page.locator('#select2-quick-site-id-container');
    if (await qs.isVisible().catch(() => false)) {
      await qs.click({ force: true });
      await page.waitForTimeout(400);
      await page
        .locator('.select2-results__option')
        .filter({ hasText: /GDC Test Site 2/i })
        .first()
        .click({ force: true })
        .catch(() => undefined);
      await page.waitForTimeout(2500);
    }
  });
  const siteNow = ((await page.locator('#select2-quick-site-id-container').textContent()) || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!/GDC Test Site 2/i.test(siteNow)) {
    await page.locator('#select2-quick-site-id-container').click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(400);
    await page
      .locator('.select2-results__option')
      .filter({ hasText: /GDC Test Site 2/i })
      .first()
      .click({ force: true })
      .catch(() => undefined);
    await page.waitForTimeout(4000);
  }
}

async function openFilters(page: Page) {
  const toggle = page.locator('#toggle-filters, #mobile-controls-filters-btn').first();
  if (await toggle.isVisible().catch(() => false)) {
    await toggle.click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(1200);
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: path.join(process.cwd(), 'playwright/.auth/user.json'),
  });
  const page = await context.newPage();

  try {
    await ensurePortalSession(page);
    await ensureGdc(page);

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
    save({ afterDashboardsNav: await page.evaluate(SNAPSHOT_JS) });

    await ensureGdc(page);

    const selected = await selectRumPerformanceDetail(page);
    await dismiss(page);
    await page.waitForTimeout(10000);
    await ensureGdc(page);

    let dashNow = (
      (await page.locator('#select2-switch-dashboard-container').textContent()) || ''
    )
      .replace(/\s+/g, ' ')
      .trim();
    if (!isRumPerformanceDetailLabel(dashNow)) {
      await selectRumPerformanceDetail(page);
      await page.waitForTimeout(8000);
      await ensureGdc(page);
    }

    const afterSelect = await page.evaluate(SNAPSHOT_JS);
    dashNow = (
      (await page.locator('#select2-switch-dashboard-container').textContent()) || ''
    )
      .replace(/\s+/g, ' ')
      .trim();
    const siteAfter = (
      (await page.locator('#select2-quick-site-id-container').textContent()) || ''
    )
      .replace(/\s+/g, ' ')
      .trim();

    save({
      afterRumPerformanceDetailSelect: {
        selected,
        dashAfter: dashNow,
        siteAfter,
        snap: afterSelect,
      },
    });

    const shot = path.join(outDir, 'rum-performance-detail-dashboard-live.png');
    await page.screenshot({ path: shot, fullPage: true }).catch(() => undefined);

    // Soft click metric cards area if visible (first visible card-like clickable)
    const cardClick = page
      .locator('.grid-stack-item')
      .filter({ hasText: /Details|Onload|LCP|CLS|INP|Page Views/i })
      .locator('button, .card, [class*="metric"], a')
      .first();
    if (await cardClick.isVisible().catch(() => false)) {
      await cardClick.click({ force: true }).catch(() => undefined);
      await page.waitForTimeout(2000);
      save({ afterMetricCardClick: await page.evaluate(SNAPSHOT_JS) });
    }

    // Open Performance Graph gear if present
    const gear = page
      .locator('.grid-stack-item')
      .filter({ hasText: /Page Timings Over Time|Performance Graph/i })
      .locator('.fa-cog, .glyphicon-cog, [class*="gear"], button')
      .filter({ has: page.locator('.fa-cog, .glyphicon-cog, i') })
      .first();
    if ((await gear.count()) > 0) {
      await gear.click({ force: true }).catch(() => undefined);
      await page.waitForTimeout(800);
      save({ performanceGraphGearOpen: await page.evaluate(SNAPSHOT_JS) });
      await page.keyboard.press('Escape').catch(() => undefined);
    }

    await openFilters(page);
    save({ filtersOpen: await page.evaluate(SNAPSHOT_JS) });
    await page.keyboard.press('Escape').catch(() => undefined);

    await page.locator('#time-lookback').click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(400);
    const lookbackOptions = await page.evaluate(() => {
      const root = document.querySelector('#time-lookback')?.closest('.dropdown');
      return [...(root?.querySelectorAll('button.time-option, a, button, li') || [])]
        .map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim())
        .filter((t) => t && t.length < 60)
        .slice(0, 40);
    });
    save({ lookbackOptions: [...new Set(lookbackOptions)] });

    await page.locator('#auto-refresh, #auto-refresh-btn-group button').first().click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(400);
    const autoRefreshOptions = await page.evaluate(() => {
      const root =
        document.querySelector('#auto-refresh')?.closest('.dropdown, .btn-group') ||
        document.querySelector('#auto-refresh-btn-group');
      return [...(root?.querySelectorAll('a, button, li') || [])]
        .map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim())
        .filter((t) => t && t.length < 40)
        .slice(0, 30);
    });
    save({ autoRefreshOptions: [...new Set(autoRefreshOptions)] });
    await page.keyboard.press('Escape').catch(() => undefined);

    console.log('[probe-rum-pd-dashboard] wrote', out);
    console.log('[probe-rum-pd-dashboard] selected=', selected, 'dashboard=', dashNow, 'site=', siteAfter);
    console.log(
      '[probe-rum-pd-dashboard] widgets=',
      afterSelect.widgets?.map?.((w: { title: string }) => w.title?.slice(0, 100))
    );
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
