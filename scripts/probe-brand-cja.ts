/**
 * Live probe: Brand Customer Journey Analysis (conversion-type=brand)
 * Run: npx tsx scripts/probe-brand-cja.ts
 */
import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { ensurePortalSession } from '../helpers/portalSession';
import { SiteDropdownPage } from '../pages/SiteDropdownPage';
import { LeftNavPage } from '../pages/LeftNavPage';

const PAGE_DEF = {
  id: 'mkt.brand-journey',
  module: 'mkt',
  menuLabel: 'Brand Customer Journey Analysis',
  route: 'marketing-insights/customer-journey-analysis',
  hrefIncludes: ['conversion-type=brand'],
  titleIncludes: /Brand|Customer Journey/i,
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
  await page.waitForSelector('#page-title', { timeout: 90000 });
  await page.waitForTimeout(10000);
  await page
    .waitForFunction('document.querySelectorAll("#campaigns-table tbody tr td").length > 0', null, {
      timeout: 90000,
    })
    .catch(() => undefined);

  const probe = await page.evaluate(`(() => {
    const txt = (el) => ((el && (el.innerText || el.textContent)) || '').replace(/\\s+/g, ' ').trim();
    const headers = (sel) => Array.from(document.querySelectorAll(sel + ' thead th')).map((th) => txt(th)).filter(Boolean);
    const badgeIds = ['data-type-view','time-period-view','device-view','browser-view','operating-system-view','visitor-type-view','bot-traffic-view','focal-page-view','focal-page-real-view','customer-journey-paths-view','campaign-view','country-view','show-remainder-view'];
    const badges = {};
    badgeIds.forEach((id) => { badges[id] = txt(document.getElementById(id)); });
    const tabs = ['campaigns-toggle','path-analytics-toggle','path-flow-toggle'].map((id) => {
      const el = document.getElementById(id);
      return { id, text: txt(el), cls: el ? el.className : '', visible: !!el };
    });
    return {
      url: location.href,
      title: document.title,
      pageTitle: txt(document.getElementById('page-title')),
      tabs,
      campaignsHeaders: headers('#campaigns-table'),
      campaignRowSample: Array.from(document.querySelectorAll('#campaigns-table tbody tr')).slice(0, 3).map((tr) => txt(tr).slice(0, 160)),
      campaignRowCount: document.querySelectorAll('#campaigns-table tbody tr').length,
      badges,
      hosts: {
        campaignsWrapper: !!document.getElementById('campaigns-wrapper'),
        pathAnalyticsWrapper: !!document.getElementById('path-analytics-wrapper'),
        pathFlowWrapper: !!document.getElementById('path-flow-wrapper'),
        overview: !!document.getElementById('path-analytics-overview-table'),
        pathsTable: !!document.getElementById('paths-table'),
        pagesTable: !!document.getElementById('path-analytics-table'),
        pathsBtn: !!document.getElementById('paths-btn'),
        pagesBtn: !!document.getElementById('pages-btn'),
        landingFlow: !!document.getElementById('landing-page-path-flow'),
        focalFlow: !!document.getElementById('focal-page-path-flow'),
        focalToggle: !!document.getElementById('focal-page-toggle'),
        viewCampaignRevenue: !!document.getElementById('view-campaign-revenue'),
        viewCampaignConversions: !!document.getElementById('view-campaign-conversions')
      },
      chrome: {
        goDashboard: Array.from(document.querySelectorAll('button,a')).some((el) => /Go to my Campaign dashboard/i.test(el.textContent || '')),
        saveCampaign: Array.from(document.querySelectorAll('button,a')).some((el) => /Save Campaign to dashboard/i.test(el.textContent || '')),
        brandAttribution: Array.from(document.querySelectorAll('button,a')).some((el) => /Brand Attribution/i.test(el.textContent || '')),
        revenueAttribution: Array.from(document.querySelectorAll('button,a')).some((el) => /Revenue Attribution/i.test(el.textContent || ''))
      }
    };
  })()`);

  await page.locator('#path-analytics-toggle').click().catch(() => undefined);
  await page.waitForTimeout(4000);
  const pathAnalytics = await page.evaluate(`(() => {
    const txt = (el) => ((el && (el.innerText || el.textContent)) || '').replace(/\\s+/g, ' ').trim();
    const headers = (sel) => Array.from(document.querySelectorAll(sel + ' thead th')).map((th) => txt(th)).filter(Boolean);
    const ids = ['allPathsRow','topXPathsRow','topXPathsEntrances','topXPathsHits','topXPathsOrders','topXPathsRevenue','topXPathsAvgOrderValue','topXPathsBrand'];
    const active = document.querySelector('[id$="-toggle"].active');
    return {
      overviewHeaders: headers('#path-analytics-overview-table'),
      hierarchyIds: ids.map((id) => ({ id, present: !!document.getElementById(id) })),
      activeTab: active ? active.id : null,
      overviewSample: txt(document.getElementById('path-analytics-overview-table')).slice(0, 300)
    };
  })()`);

  await page.locator('#paths-btn').click().catch(() => undefined);
  await page.waitForTimeout(2000);
  const pathsHeaders = await page.evaluate(
    `Array.from(document.querySelectorAll('#paths-table thead th')).map((th) => ((th.innerText || th.textContent || '') + '').replace(/\\s+/g, ' ').trim()).filter(Boolean)`
  );
  await page.locator('#pages-btn').click().catch(() => undefined);
  await page.waitForTimeout(2000);
  const pagesHeaders = await page.evaluate(
    `Array.from(document.querySelectorAll('#path-analytics-table thead th')).map((th) => ((th.innerText || th.textContent || '') + '').replace(/\\s+/g, ' ').trim()).filter(Boolean)`
  );

  await page.locator('#path-flow-toggle').click().catch(() => undefined);
  await page.waitForTimeout(5000);
  const pathFlow = await page.evaluate(`(() => {
    const host = document.querySelector('#landing-page-path-flow') || document.querySelector('#path-flow-wrapper');
    return {
      landingCards: host ? host.querySelectorAll('.page-card.landingCard').length : 0,
      pageCards: host ? host.querySelectorAll('.page-card').length : 0,
      columns: host ? host.querySelectorAll('.column').length : 0,
      svgs: host ? host.querySelectorAll('svg').length : 0,
      focalToggle: !!document.getElementById('focal-page-toggle')
    };
  })()`);

  await page.locator('#toggle-filters').click().catch(() => undefined);
  await page.waitForTimeout(1200);
  const filters = await page.evaluate(`(() => {
    const labels = Array.from(document.querySelectorAll('label, .control-label'))
      .map((el) => ((el.innerText || el.textContent || '') + '').replace(/\\s+/g, ' ').trim())
      .filter((t) => t && t.length < 90);
    return {
      labels: Array.from(new Set(labels)).slice(0, 55),
      myFilters: !!document.getElementById('my-filters-tab'),
      sharedFilters: !!document.getElementById('shared-filters-tab'),
      apply: !!document.getElementById('apply-filters'),
      cancel: !!document.getElementById('cancel-filters')
    };
  })()`);
  await page.keyboard.press('Escape').catch(() => undefined);

  await page.locator('#campaigns-toggle').click().catch(() => undefined);
  await page.waitForTimeout(1500);
  const expand = await page.evaluate(`(() => {
    const rows = Array.from(document.querySelectorAll('#campaigns-table tbody tr.campaign-row.parent'));
    let target = null;
    for (let i = 0; i < rows.length; i++) {
      const t = rows[i].textContent || '';
      if (!/\\(All Traffic\\)/i.test(t) && rows[i].querySelector('td.text-left svg.dropdown-arrow')) {
        target = rows[i];
        break;
      }
    }
    if (!target) return { ok: false };
    const cell = target.querySelector('td.text-left');
    if (cell) cell.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return { ok: true, campaign: ((cell && cell.textContent) || '').replace(/\\s+/g, ' ').trim().slice(0, 120) };
  })()`);
  await page.waitForTimeout(2500);
  const landingKids = await page.locator('#campaigns-table tbody tr.load-campaign-landing-page').count();

  const menu = await page.evaluate(`Array.from(document.querySelectorAll('a'))
    .map((a) => ({ text: ((a.textContent || '') + '').replace(/\\s+/g, ' ').trim(), href: a.getAttribute('href') || '' }))
    .filter((l) => /Customer Journey Analysis/i.test(l.text))
    .slice(0, 12)`);

  const breadcrumbMenuPath = await page.evaluate(`(() => {
    const title = ((document.getElementById('page-title') && document.getElementById('page-title').innerText) || '').replace(/\\s+/g, ' ').trim();
    return title;
  })()`);

  const out = {
    probe,
    pathAnalytics: { ...pathAnalytics, pathsHeaders, pagesHeaders },
    pathFlow,
    filters,
    expand: { ...expand, landingKids },
    menu,
    breadcrumbMenuPath,
  };
  const outPath = path.join(process.cwd(), 'docs/prompts/brand-cja-live-probe.json');
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
