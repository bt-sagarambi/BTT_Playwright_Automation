/**
 * Direct-URL Brand CJA probe (avoids slow menu resolution).
 * Run: npx tsx scripts/probe-brand-cja-direct.ts
 */
import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { ensurePortalSession } from '../helpers/portalSession';
import { SiteDropdownPage } from '../pages/SiteDropdownPage';
import { portalBase } from '../helpers/portalSession';
import { LeftNavPage } from '../pages/LeftNavPage';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: path.join(process.cwd(), 'playwright/.auth/user.json'),
  });
  const page = await context.newPage();
  await ensurePortalSession(page);
  await new SiteDropdownPage(page).ensureProfileSite().catch(() => undefined);

  const PAGE_DEF = {
    id: 'mkt.brand-journey',
    module: 'mkt',
    menuLabel: 'Brand Customer Journey Analysis',
    route: 'marketing-insights/customer-journey-analysis',
    hrefIncludes: ['conversion-type=brand'],
    titleIncludes: /Brand|Customer Journey/i,
  };
  await new LeftNavPage(page).openSmokePage(PAGE_DEF);
  await page.waitForSelector('#page-title', { timeout: 120000 });
  console.log('TITLE', await page.locator('#page-title').innerText());
  console.log('URL', page.url());
  console.log('DOC_TITLE', await page.title());
  console.log('PORTAL_BASE', portalBase());

  // Dismiss any blocking confirm/modal (seen on brand conversion-type)
  for (let i = 0; i < 3; i++) {
    const confirm = page.locator('.jconfirm.jconfirm-open button, .jconfirm.jconfirm-open .btn').filter({ hasText: /ok|close|yes|got it|continue/i }).first();
    if (await confirm.isVisible().catch(() => false)) {
      await confirm.click({ force: true }).catch(() => undefined);
      await page.waitForTimeout(500);
    } else {
      await page.keyboard.press('Escape').catch(() => undefined);
      await page.waitForTimeout(300);
    }
    if (!(await page.locator('.jconfirm.jconfirm-open').isVisible().catch(() => false))) break;
  }

  // wait for campaigns data
  for (let i = 0; i < 45; i++) {
    const n = await page.locator('#campaigns-table tbody tr td').count().catch(() => 0);
    if (n > 0) break;
    await page.waitForTimeout(2000);
  }

  const campaignsHeaders = await page.locator('#campaigns-table thead th').allTextContents();
  console.log('CAMPAIGN_HEADERS', campaignsHeaders.map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean));

  await page.locator('#path-analytics-toggle').click({ timeout: 15000, force: true });
  await page.waitForTimeout(4000);
  const overviewHeaders = await page.locator('#path-analytics-overview-table thead th').allTextContents();
  console.log('OVERVIEW_HEADERS', overviewHeaders.map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean));

  await page.locator('#paths-btn').click({ timeout: 10000, force: true }).catch(() => undefined);
  await page.waitForTimeout(2000);
  const pathsHeaders = await page.locator('#paths-table thead th').allTextContents();
  console.log('PATHS_HEADERS', pathsHeaders.map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean));

  await page.locator('#pages-btn').click({ timeout: 10000, force: true }).catch(() => undefined);
  await page.waitForTimeout(2000);
  const pagesHeaders = await page.locator('#path-analytics-table thead th').allTextContents();
  console.log('PAGES_HEADERS', pagesHeaders.map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean));

  await page.locator('#path-flow-toggle').click({ timeout: 15000, force: true });
  await page.waitForTimeout(4000);
  const flow = {
    landingCards: await page.locator('#landing-page-path-flow .page-card.landingCard, #path-flow-wrapper .page-card.landingCard').count(),
    pageCards: await page.locator('#landing-page-path-flow .page-card, #path-flow-wrapper .page-card').count(),
    focalToggle: await page.locator('#focal-page-toggle').count(),
  };
  console.log('PATH_FLOW', flow);

  await page.locator('#toggle-filters').click({ timeout: 10000 });
  await page.waitForTimeout(1000);
  const filterLabels = (await page.locator('label, .control-label').allTextContents())
    .map((t) => t.replace(/\s+/g, ' ').trim())
    .filter((t) => t && t.length < 90);
  console.log('FILTER_LABELS', [...new Set(filterLabels)].slice(0, 40));
  await page.keyboard.press('Escape');

  await page.locator('#campaigns-toggle').click();
  await page.waitForTimeout(1000);
  const badges: Record<string, string> = {};
  for (const id of [
    'data-type-view',
    'time-period-view',
    'device-view',
    'browser-view',
    'bot-traffic-view',
    'focal-page-view',
    'focal-page-real-view',
    'customer-journey-paths-view',
    'campaign-view',
  ]) {
    badges[id] = ((await page.locator(`#${id}`).textContent().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
  }
  console.log('BADGES', badges);

  // expand campaign
  const nameCell = page
    .locator('#campaigns-table tbody tr.campaign-row td.text-left')
    .filter({ hasNotText: /\(All Traffic\)/i })
    .first();
  if (await nameCell.count()) {
    await nameCell.click({ force: true });
    await page.waitForTimeout(2500);
  }
  const landingKids = await page.locator('#campaigns-table tbody tr.load-campaign-landing-page').count();
  console.log('LANDING_KIDS', landingKids);

  const chrome = {
    goDashboard: await page.getByText(/Go to my Campaign dashboard/i).count(),
    saveCampaign: await page.getByText(/Save Campaign to dashboard/i).count(),
    brandAttr: await page.getByText(/Brand Attribution/i).count(),
    revenueAttr: await page.getByText(/Revenue Attribution/i).count(),
  };
  console.log('CHROME', chrome);

  const out = {
    url: page.url(),
    docTitle: await page.title(),
    pageTitle: await page.locator('#page-title').innerText(),
    campaignsHeaders: campaignsHeaders.map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean),
    overviewHeaders: overviewHeaders.map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean),
    pathsHeaders: pathsHeaders.map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean),
    pagesHeaders: pagesHeaders.map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean),
    pathFlow: flow,
    filterLabels: [...new Set(filterLabels)].slice(0, 45),
    badges,
    landingKids,
    chrome,
    conversionType: /conversion-type=brand/i.test(page.url()) ? 'brand' : 'other',
  };
  const outPath = path.join(process.cwd(), 'docs/prompts/brand-cja-live-probe.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log('WROTE', outPath);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
