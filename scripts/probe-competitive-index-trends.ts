/**
 * Live probe: Competitive Index Trends (view=trends)
 * Run: npx tsx scripts/probe-competitive-index-trends.ts
 */
import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { ensurePortalSession } from '../helpers/portalSession';
import { SiteDropdownPage } from '../pages/SiteDropdownPage';
import { LeftNavPage } from '../pages/LeftNavPage';

const PAGE_DEF = {
  id: 'mkt.competitive-trends',
  module: 'mkt',
  menuLabel: 'Competitive Index Trends',
  route: 'competitive-index/index',
  hrefIncludes: ['view=trends'],
  titleIncludes: /Competitive Index/i,
};

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: path.join(process.cwd(), 'playwright/.auth/user.json'),
  });
  const page = await context.newPage();
  await ensurePortalSession(page);
  await new SiteDropdownPage(page).ensureProfileSite();
  await new LeftNavPage(page).openSmokePage(PAGE_DEF);
  await page.waitForSelector('#page-title', { timeout: 90000 }).catch(() => undefined);
  await page.waitForTimeout(14000);
  await page
    .locator('.jconfirm-buttons button, .jconfirm-closeIcon, button:has-text("Dismiss"), button:has-text("Close")')
    .first()
    .click({ timeout: 2000 })
    .catch(() => undefined);

  // Ensure trends tab active if landed with both
  await page.locator('#trends-tab').click({ force: true, timeout: 5000 }).catch(() => undefined);
  await page.waitForTimeout(3000);

  const base = await page.evaluate(`(() => {
    const txt = (el) => ((el && (el.innerText || el.textContent)) || '').replace(/\\s+/g, ' ').trim();
    const allIds = Array.from(document.querySelectorAll('[id]')).map((el) => el.id).filter(Boolean);
    const trendish = allIds
      .filter((id) =>
        /trend|comp|group|chart|metric|site|toggle|filter|search|industry|vertical|hide|view-metric|highchart|graph|company|marker/i.test(
          id
        )
      )
      .filter((id) => !/_toggle_container$/.test(id))
      .slice(0, 180);
    const tabs = ['table-tab', 'trends-tab'].map((id) => {
      const el = document.getElementById(id);
      return {
        id,
        text: txt(el),
        cls: el ? el.className : '',
        active: !!(el && /active/i.test(el.className || '')),
      };
    });
    const select2 = Array.from(document.querySelectorAll('[id^="select2-"]'))
      .map((el) => ({ id: el.id, text: txt(el).slice(0, 100), visible: !!(el.offsetParent || el.getClientRects().length) }))
      .slice(0, 50);
    const buttons = Array.from(document.querySelectorAll('button, a.btn, .btn'))
      .map((el) => txt(el))
      .filter((t) => t && t.length < 70);
    const uniqueButtons = Array.from(new Set(buttons)).slice(0, 70);
    const labels = Array.from(document.querySelectorAll('label, .control-label'))
      .map((el) => txt(el))
      .filter((t) => t && t.length < 90);
    const charts = Array.from(document.querySelectorAll('.highcharts-container, [data-highcharts-chart]')).map(
      (el, i) => ({
        i,
        id: el.id || '',
        parentId: el.parentElement ? el.parentElement.id : '',
        title: txt(el.querySelector('.highcharts-title, .highcharts-subtitle')) || '',
        w: Math.round(el.getBoundingClientRect().width),
        h: Math.round(el.getBoundingClientRect().height),
      })
    );
    const badges = {};
    ['time-period-view', 'traffic-segment-view', 'statistical-method-view', 'device-view', 'data-type-view'].forEach(
      (id) => {
        badges[id] = txt(document.getElementById(id));
      }
    );
    const siteToggles = Array.from(document.querySelectorAll('[id$="_toggle_container"]')).length;
    const checkedToggles = Array.from(document.querySelectorAll('input[type="checkbox"]:checked')).length;
    return {
      url: location.href,
      title: document.title,
      pageTitle: txt(document.getElementById('page-title')),
      tabs,
      trendishIds: trendish,
      select2,
      uniqueButtons,
      labels: Array.from(new Set(labels)).slice(0, 60),
      charts,
      highcharts: charts.length,
      badges,
      siteToggles,
      checkedToggles,
      hosts: {
        hideTrendFilters: !!document.getElementById('hideTrendFilters'),
        trendFilterContent: !!document.getElementById('trendFilterContent'),
        trendCompSearch: !!document.getElementById('trendCompSearch'),
        searchBox: !!document.getElementById('searchBox'),
        btnClearSites: !!document.getElementById('btnClearSites'),
        companyToggler: !!document.getElementById('companyToggler'),
        compToggleBox: !!document.getElementById('compToggleBox'),
        trendSaveGroup: !!document.getElementById('trendSaveGroup'),
        companyToggleConatiner: !!document.getElementById('companyToggleConatiner'),
        tableTab: !!document.getElementById('table-tab'),
        trendsTab: !!document.getElementById('trends-tab'),
        performanceTable: !!document.getElementById('performance_index_table'),
        viewMetric: Array.from(document.querySelectorAll('button,a')).some((el) =>
          /View Metric/i.test(el.textContent || '')
        ),
        createGroup: Array.from(document.querySelectorAll('button,a')).some((el) =>
          /Create Group/i.test(el.textContent || '')
        ),
        manageGroups: Array.from(document.querySelectorAll('button,a')).some((el) =>
          /Manage Groups/i.test(el.textContent || '')
        ),
      },
      bodySnippet: (document.body.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 2800),
    };
  })()`);

  // Soft interactions
  const interactions: Record<string, unknown> = {};

  // Toggle hide filters if present
  if (await page.locator('#hideTrendFilters').isVisible().catch(() => false)) {
    await page.locator('#hideTrendFilters').click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(600);
    interactions.hideTrendFiltersClicked = true;
    await page.locator('#hideTrendFilters').click({ force: true }).catch(() => undefined);
  }

  // Capture available group/industry options
  await page.locator('#select2-trendIndustrySelector-container').click({ force: true, timeout: 5000 }).catch(() => undefined);
  await page.waitForTimeout(500);
  interactions.trendIndustryOptions = await page
    .locator('.select2-results__option')
    .evaluateAll((els) =>
      els
        .map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .slice(0, 25)
    )
    .catch(() => []);
  await page.keyboard.press('Escape').catch(() => undefined);

  await page.locator('#select2-verticalSelector_trends-container').click({ force: true, timeout: 5000 }).catch(() => undefined);
  await page.waitForTimeout(500);
  interactions.trendVerticalOptions = await page
    .locator('.select2-results__option')
    .evaluateAll((els) =>
      els
        .map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .slice(0, 25)
    )
    .catch(() => []);
  await page.keyboard.press('Escape').catch(() => undefined);

  await page.locator('#select2-trendGroupSelector-container').click({ force: true, timeout: 5000 }).catch(() => undefined);
  await page.waitForTimeout(500);
  interactions.trendGroupOptions = await page
    .locator('.select2-results__option')
    .evaluateAll((els) =>
      els
        .map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .slice(0, 20)
    )
    .catch(() => []);
  await page.keyboard.press('Escape').catch(() => undefined);

  // Soft toggle a few site rows if visible
  const toggleCount = await page.locator('[id$="_toggle_container"] input[type="checkbox"], #compToggleBox input[type="checkbox"]').count().catch(() => 0);
  interactions.siteCheckboxCount = toggleCount;
  if (toggleCount > 0) {
    await page
      .locator('[id$="_toggle_container"] input[type="checkbox"], #compToggleBox input[type="checkbox"]')
      .nth(0)
      .check({ force: true })
      .catch(() => undefined);
    await page.waitForTimeout(1500);
    interactions.afterToggleCharts = await page.locator('.highcharts-container, [data-highcharts-chart]').count();
    if (await page.locator('#btnClearSites').isVisible().catch(() => false)) {
      await page.locator('#btnClearSites').click({ force: true }).catch(() => undefined);
      await page.waitForTimeout(800);
      interactions.clearedSites = true;
    }
  }

  // Switch to TABLE and back
  await page.locator('#table-tab').click({ force: true }).catch(() => undefined);
  await page.waitForTimeout(1500);
  interactions.afterTable = await page.evaluate(`({
    tableActive: /active/i.test(document.getElementById('table-tab')?.className || ''),
    hasTable: !!document.getElementById('performance_index_table'),
    url: location.href
  })`);
  await page.locator('#trends-tab').click({ force: true }).catch(() => undefined);
  await page.waitForTimeout(2000);
  interactions.afterTrends = await page.evaluate(`({
    trendsActive: /active/i.test(document.getElementById('trends-tab')?.className || ''),
    charts: document.querySelectorAll('.highcharts-container, [data-highcharts-chart]').length,
    url: location.href
  })`);

  // Filters drawer
  await page.locator('#toggle-filters, #mobile-controls-filters-btn').first().click({ force: true, timeout: 3000 }).catch(() => undefined);
  await page.waitForTimeout(1000);
  const filters = await page.evaluate(`(() => {
    const txt = (el) => ((el && (el.innerText || el.textContent)) || '').replace(/\\s+/g, ' ').trim();
    return {
      labels: Array.from(new Set(Array.from(document.querySelectorAll('label, .control-label')).map((el) => txt(el)).filter((t) => t && t.length < 90))).slice(0, 50),
      apply: !!document.getElementById('apply-filters'),
      cancel: !!document.getElementById('cancel-filters'),
      myFilters: !!document.getElementById('my-filters-tab'),
      sharedFilters: !!document.getElementById('shared-filters-tab'),
      timezone: txt(document.getElementById('select2-timezone-container')),
      statistical: txt(document.getElementById('select2-statistical-method-container')),
      percentile: txt(document.getElementById('select2-percentile-container')),
    };
  })()`);
  await page.keyboard.press('Escape').catch(() => undefined);

  // Menu siblings
  const menu = await page.evaluate(`Array.from(document.querySelectorAll('a'))
    .map((a) => ({ text: ((a.textContent || '') + '').replace(/\\s+/g, ' ').trim(), href: a.getAttribute('href') || '' }))
    .filter((l) => /Competitive Index/i.test(l.text) || /competitive-index/i.test(l.href))
    .slice(0, 16)`);

  const out = { base, interactions, filters, menu };
  const outPath = path.join(process.cwd(), 'docs/prompts/competitive-index-trends-live-probe.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  console.log('WROTE', outPath);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
