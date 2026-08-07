/**
 * Live probe: Synthetic Site Health preconfigured dashboard
 * Run: npx tsx scripts/probe-synthetic-site-health.ts
 */
import { chromium, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { ensurePortalSession } from '../helpers/portalSession';
import { SiteDropdownPage } from '../pages/SiteDropdownPage';
import { LeftNavPage } from '../pages/LeftNavPage';

const outDir = path.join(process.cwd(), 'docs', 'prompts');
const out = path.join(outDir, 'synthetic-site-health-live-probe.json');

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
      /dashboard|widget|chart|graph|map|geo|device|revenue|performance|vital|pulse|filter|time|lookback|refresh|period|timezone|highchart|metric|switch|auto|marker|table|card|export|legend|onload|lcp|cls|inp|session|page|synthetic|avail|scatter|screenshot|error|health|test|browser/i.test(
        id
      )
    )
    .slice(0, 400);
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
  ).slice(0, 140);
  const labels = Array.from(
    new Set(
      Array.from(document.querySelectorAll('label, .control-label, .filter-label, th, h1, h2, h3, h4, .panel-title, .widget-title, .box-title, [role="tab"]'))
        .map((el) => txt(el))
        .filter((t) => t && t.length > 0 && t.length < 140)
    )
  ).slice(0, 200);
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
        .slice(0, 20);
      return {
        i,
        hostId: (host && host.id) || '',
        w: Math.round(box.width),
        h: Math.round(box.height),
        title: txt(el.querySelector('.highcharts-title, .highcharts-subtitle') || el).slice(0, 120),
        alt: (el.closest('.grid-stack-item') || el).querySelector('img')?.getAttribute('alt') || '',
        legend,
      };
    })
    .filter((c) => c.w > 20 && c.h > 20)
    .slice(0, 60);
  const widgets = Array.from(document.querySelectorAll('.grid-stack-item'))
    .map((el) => {
      const img = el.querySelector('img[alt]');
      const title =
        (img && img.getAttribute('alt')) ||
        txt(el.querySelector('.panel-title, .widget-title, h3, h4, .box-title') || el).slice(0, 160);
      const box = el.getBoundingClientRect();
      const tableHeaders = Array.from(el.querySelectorAll('th'))
        .map((th) => txt(th))
        .filter(Boolean)
        .slice(0, 30);
      const images = Array.from(el.querySelectorAll('img'))
        .map((im) => ({
          alt: im.getAttribute('alt') || '',
          src: (im.getAttribute('src') || '').slice(0, 120),
          w: Math.round(im.getBoundingClientRect().width),
          h: Math.round(im.getBoundingClientRect().height),
        }))
        .filter((im) => im.w > 20 || im.h > 20)
        .slice(0, 10);
      return {
        id: el.id || '',
        title: title.slice(0, 160),
        visible: !!el.getClientRects().length,
        w: Math.round(box.width),
        h: Math.round(box.height),
        hasChart: !!el.querySelector('.highcharts-container, svg'),
        hasTable: !!el.querySelector('table'),
        tableHeaders,
        images,
        bodySample: txt(el).slice(0, 800),
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
      .slice(0, 40),
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
  const scatterPoints = Array.from(document.querySelectorAll('.highcharts-point, .highcharts-series-group .highcharts-point'))
    .slice(0, 5)
    .map((el, i) => ({
      i,
      cls: String(el.getAttribute('class') || '').slice(0, 80),
    }));
  const bodySample = txt(document.body).slice(0, 4500);
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
    scatterPoints,
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
  const container = page.locator('#select2-switch-dashboard-container').first();
  const native = page.locator('#switch-dashboard').first();

  if (await container.isVisible().catch(() => false)) {
    await container.click({ force: true });
    await page.waitForTimeout(500);
    const options = page.locator('.select2-results__option');
    const count = await options.count();
    for (let i = 0; i < count; i++) {
      const text = ((await options.nth(i).textContent()) || '').replace(/\s+/g, ' ').trim();
      if (!re.test(text)) continue;
      // Prefer exact-ish Synthetic Site Health (avoid Synthetic Performance Detail)
      if (/Synthetic Site Health/i.test(String(re)) && !/Synthetic Site Health/i.test(text)) continue;
      if (/Synthetic Performance Detail|Synthetic Performance Overview/i.test(text) && /Site Health/i.test(String(re))) continue;
      await options.nth(i).click({ force: true });
      await page.waitForTimeout(6000);
      return true;
    }
    const opt = page.locator('.select2-results__option').filter({ hasText: re }).first();
    if (await opt.isVisible().catch(() => false)) {
      await opt.click({ force: true });
      await page.waitForTimeout(6000);
      return true;
    }
    await page.keyboard.press('Escape').catch(() => undefined);
  }

  if ((await native.count()) > 0) {
    const labels = await native.locator('option').allTextContents();
    const match = labels.find((t) => re.test(t.replace(/\s+/g, ' ').trim()) && /Site Health/i.test(t));
    if (match) {
      await native.selectOption({ label: match }).catch(async () => {
        const val = await native.locator('option').filter({ hasText: re }).first().getAttribute('value');
        if (val) await native.selectOption(val);
      });
      await page.waitForTimeout(6000);
      return true;
    }
  }
  return false;
}

async function openFilters(page: Page) {
  const toggle = page.locator('#toggle-filters, #mobile-controls-filters-btn').first();
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

  try {
    await ensurePortalSession(page);
    await new SiteDropdownPage(page).ensureProfileSite();

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
    save({ afterDashboardsNav: before });

    const selected = await selectDashboardByText(page, /Synthetic Site Health/i);
    await dismiss(page);
    await page.waitForTimeout(8000);
    const afterSelect = await page.evaluate(SNAPSHOT_JS);
    save({ afterSyntheticSiteHealthSelect: { selected, snap: afterSelect } });

    // Screenshot of dashboard shell
    const shot = path.join(outDir, 'synthetic-site-health-live.png');
    await page.screenshot({ path: shot, fullPage: true }).catch(() => undefined);

    await openFilters(page);
    const filters = await page.evaluate(SNAPSHOT_JS);
    save({ filtersOpen: filters });

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

    // Soft sample click first scatter/highcharts point if any
    await page.keyboard.press('Escape').catch(() => undefined);
    const point = page.locator('.highcharts-series-group .highcharts-point, .highcharts-markers .highcharts-point').first();
    if (await point.isVisible().catch(() => false)) {
      await point.click({ force: true }).catch(() => undefined);
      await page.waitForTimeout(2000);
      const afterPoint = await page.evaluate(SNAPSHOT_JS);
      save({ afterScatterPointClick: afterPoint });
      await page.keyboard.press('Escape').catch(() => undefined);
      await page.locator('.jconfirm.jconfirm-open button').filter({ hasText: /close|ok|cancel/i }).first().click({ force: true }).catch(() => undefined);
    }

    console.log('[probe-synthetic-site-health] wrote', out);
    console.log(
      '[probe-synthetic-site-health] selected=',
      selected,
      'dashboard=',
      afterSelect.select2?.find?.((s: { id: string }) => /switch-dashboard/i.test(s.id))
    );
    console.log(
      '[probe-synthetic-site-health] widgets=',
      afterSelect.widgets?.map?.((w: { title: string }) => w.title)
    );
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
