/**
 * Live probe: Competitive Index Table (view=table)
 * Run: npx tsx scripts/probe-competitive-index-table.ts
 */
import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { ensurePortalSession } from '../helpers/portalSession';
import { SiteDropdownPage } from '../pages/SiteDropdownPage';
import { LeftNavPage } from '../pages/LeftNavPage';

const PAGE_DEF = {
  id: 'mkt.competitive-table',
  module: 'mkt',
  menuLabel: 'Competitive Index Table',
  route: 'competitive-index/index',
  hrefIncludes: ['view=table'],
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
  await page.waitForTimeout(12000);

  // Dismiss jconfirm if any
  await page.locator('.jconfirm-buttons button, .jconfirm-closeIcon').first().click({ timeout: 2000 }).catch(() => undefined);

  const base = await page.evaluate(`(() => {
    const txt = (el) => ((el && (el.innerText || el.textContent)) || '').replace(/\\s+/g, ' ').trim();
    const allIds = Array.from(document.querySelectorAll('[id]')).map((el) => el.id).filter(Boolean);
    const interestingIds = allIds.filter((id) =>
      /compet|index|table|tab|filter|chart|graph|highchart|metric|device|browser|time|period|compar|view|toggle|export|search|pager|rank|site|segment|bot|country|os/i.test(id)
    ).slice(0, 200);
    const tabs = Array.from(document.querySelectorAll('[id$="-toggle"], .CI-tab, .nav-tabs a, [role="tab"], .tab, .ci-tabs a, button.tab'))
      .map((el) => ({ tag: el.tagName, id: el.id, cls: el.className, text: txt(el).slice(0, 80), href: el.getAttribute('href') || '' }))
      .filter((t) => t.text || t.id)
      .slice(0, 40);
    const tables = Array.from(document.querySelectorAll('table')).map((t, i) => ({
      i,
      id: t.id,
      cls: t.className,
      headers: Array.from(t.querySelectorAll('thead th')).map((th) => txt(th)).filter(Boolean).slice(0, 25),
      rows: t.querySelectorAll('tbody tr').length,
      sample: Array.from(t.querySelectorAll('tbody tr')).slice(0, 3).map((tr) => txt(tr).slice(0, 200))
    })).slice(0, 15);
    const badgeIds = allIds.filter((id) => /view$|badge|filter|period|device|browser|metric/i.test(id)).slice(0, 40);
    const badges = {};
    badgeIds.forEach((id) => { badges[id] = txt(document.getElementById(id)).slice(0, 120); });
    const highcharts = document.querySelectorAll('.highcharts-container, [data-highcharts-chart]').length;
    const svgs = document.querySelectorAll('svg').length;
    const select2 = Array.from(document.querySelectorAll('[id^="select2-"]')).map((el) => ({ id: el.id, text: txt(el).slice(0, 80) })).slice(0, 40);
    const buttons = Array.from(document.querySelectorAll('button, a.btn, .btn'))
      .map((el) => txt(el))
      .filter((t) => t && t.length < 60)
      .slice(0, 60);
    const uniqueButtons = Array.from(new Set(buttons));
    const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,.page-title,#page-title,[class*="title"]'))
      .map((el) => txt(el))
      .filter((t) => t && t.length < 120)
      .slice(0, 30);
    const labels = Array.from(document.querySelectorAll('label, .control-label'))
      .map((el) => txt(el))
      .filter((t) => t && t.length < 90);
    return {
      url: location.href,
      title: document.title,
      pageTitle: txt(document.getElementById('page-title')),
      interestingIds,
      tabs,
      tables,
      badges,
      highcharts,
      svgs,
      select2,
      uniqueButtons: uniqueButtons.slice(0, 50),
      headings: Array.from(new Set(headings)).slice(0, 25),
      bodySnippet: (document.body.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 2500)
    };
  })()`);

  // Open Filters if present
  await page.locator('#toggle-filters, #mobile-controls-filters-btn, button:has-text("Filters"), a:has-text("Filters")').first().click({ timeout: 3000 }).catch(() => undefined);
  await page.waitForTimeout(1500);
  const filters = await page.evaluate(`(() => {
    const txt = (el) => ((el && (el.innerText || el.textContent)) || '').replace(/\\s+/g, ' ').trim();
    const labels = Array.from(document.querySelectorAll('label, .control-label, .filter-label, .sidebar label'))
      .map((el) => txt(el))
      .filter((t) => t && t.length < 90);
    return {
      labels: Array.from(new Set(labels)).slice(0, 80),
      myFilters: !!document.getElementById('my-filters-tab'),
      sharedFilters: !!document.getElementById('shared-filters-tab'),
      apply: !!document.getElementById('apply-filters'),
      cancel: !!document.getElementById('cancel-filters'),
      filterPanelVisible: !!(document.querySelector('#filters, #filter-panel, .filters-panel, #sidebar-filters') || document.getElementById('apply-filters'))
    };
  })()`);
  await page.keyboard.press('Escape').catch(() => undefined);

  // Click any secondary tabs / view toggles that look relevant
  const tabClicks = await page.evaluate(`(() => {
    const candidates = Array.from(document.querySelectorAll('[id$="-toggle"], .CI-tab, .nav-tabs a, [role="tab"], a[href*="view="], button'))
      .filter((el) => {
        const t = ((el.innerText || el.textContent) || '').replace(/\\s+/g, ' ').trim();
        return /table|trend|chart|graph|metric|onload|score|device|browser|conversion|session|page|compet|compar/i.test(t + ' ' + el.id);
      })
      .map((el) => ({ id: el.id, text: ((el.innerText || el.textContent) || '').replace(/\\s+/g, ' ').trim().slice(0, 80), tag: el.tagName }));
    return candidates.slice(0, 25);
  })()`);

  const tabSnapshots = [];
  for (const t of tabClicks.slice(0, 8)) {
    try {
      if (t.id) await page.locator(`#${t.id}`).first().click({ timeout: 2000 }).catch(() => undefined);
      else await page.getByText(t.text, { exact: false }).first().click({ timeout: 2000 }).catch(() => undefined);
      await page.waitForTimeout(2500);
      const snap = await page.evaluate(`(() => {
        const txt = (el) => ((el && (el.innerText || el.textContent)) || '').replace(/\\s+/g, ' ').trim();
        return {
          url: location.href,
          tables: Array.from(document.querySelectorAll('table')).map((tb) => ({
            id: tb.id,
            headers: Array.from(tb.querySelectorAll('thead th')).map((th) => txt(th)).filter(Boolean).slice(0, 20),
            rows: tb.querySelectorAll('tbody tr').length
          })).slice(0, 8),
          charts: document.querySelectorAll('.highcharts-container, [data-highcharts-chart]').length,
          active: Array.from(document.querySelectorAll('.active, .selected, [aria-selected="true"]'))
            .map((el) => ({ id: el.id, cls: (el.className+'').slice(0,60), text: txt(el).slice(0,60) }))
            .filter((x) => x.id || x.text)
            .slice(0, 20)
        };
      })()`);
      tabSnapshots.push({ tab: t, snap });
    } catch {
      tabSnapshots.push({ tab: t, error: true });
    }
  }

  // Menu siblings for scope notes
  const menu = await page.evaluate(`Array.from(document.querySelectorAll('a'))
    .map((a) => ({ text: ((a.textContent || '') + '').replace(/\\s+/g, ' ').trim(), href: a.getAttribute('href') || '' }))
    .filter((l) => /Competitive Index/i.test(l.text) || /competitive-index/i.test(l.href))
    .slice(0, 20)`);

  // Export / customize / i-icons soft presence
  const chrome = await page.evaluate(`(() => {
    const txt = (el) => ((el && (el.innerText || el.textContent)) || '').replace(/\\s+/g, ' ').trim();
    const icons = document.querySelectorAll('i.fa-info-circle, .info-icon, [data-original-title], .i-icon').length;
    const exportish = Array.from(document.querySelectorAll('button,a,li')).map((el) => txt(el)).filter((t) => /export|csv|tsv|download/i.test(t)).slice(0, 20);
    const search = !!document.querySelector('#table-search, input[type="search"], input[placeholder*="Search"]');
    const pager = Array.from(document.querySelectorAll('[id*="pager"], .pager, .pagination')).map((el) => el.id || el.className).slice(0, 10);
    return { icons, exportish: Array.from(new Set(exportish)), search, pager };
  })()`);

  const out = { base, filters, tabClicks, tabSnapshots, menu, chrome };
  const outPath = path.join(process.cwd(), 'docs/prompts/competitive-index-table-live-probe.json');
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
