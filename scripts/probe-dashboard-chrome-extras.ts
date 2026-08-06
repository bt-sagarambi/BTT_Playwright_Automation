/**
 * Probe dashboard chrome icons, site lock, VitalScope table arrows.
 * Run: npx tsx scripts/probe-dashboard-chrome-extras.ts
 */
import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { ensurePortalSession } from '../helpers/portalSession';
import { LeftNavPage } from '../pages/LeftNavPage';

const out = path.join(process.cwd(), 'docs', 'prompts', 'dashboard-chrome-extras-probe.json');

async function snapChrome(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const txt = (el: Element | null) =>
      ((el && ((el as HTMLElement).innerText || el.textContent)) || '').replace(/\s+/g, ' ').trim();
    const controls = document.querySelector('#dashboard-page-controls, #page-controls-og, body');
    const candidates = [
      ...document.querySelectorAll(
        '#dashboard-page-controls a, #dashboard-page-controls button, #page-controls-og a, #page-controls-og button, #share-page-btn, #toggle-filters, #refresh-dashboard, #auto-refresh, #time-lookback, [id*="share"], .fa-lock, .fa-unlock, [class*="lock"], [title*="lock" i], [title*="Lock"]'
      ),
    ];
    const items = candidates.slice(0, 80).map((el) => {
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName,
        id: el.id,
        cls: String(el.className || '').slice(0, 120),
        title: el.getAttribute('title') || '',
        aria: el.getAttribute('aria-label') || '',
        dataOriginalTitle: el.getAttribute('data-original-title') || '',
        text: txt(el).slice(0, 80),
        visible: r.width > 0 && r.height > 0,
        x: Math.round(r.x),
        y: Math.round(r.y),
      };
    });
    const locks = [...document.querySelectorAll('[class*="lock"], .fa-lock, .fa-unlock, [title*="lock" i]')].map(
      (el) => ({
        id: el.id,
        cls: String(el.className || '').slice(0, 100),
        title: el.getAttribute('title') || '',
        text: txt(el).slice(0, 40),
      })
    );
    const arrows = [...document.querySelectorAll('table i, table .fa, [class*="arrow"], [class*="expand"], .slick-cell .fa')].slice(
      0,
      40
    ).map((el) => ({
      cls: String(el.className || '').slice(0, 80),
      title: el.getAttribute('title') || '',
      parent: txt(el.parentElement).slice(0, 60),
    }));
    const sortedHeaders = [...document.querySelectorAll('th, .slick-header-column')].map((el) => txt(el)).filter(Boolean).slice(0, 20);
    return {
      items,
      locks,
      arrows,
      sortedHeaders,
      bodyHas: {
        siteSummary: /Site Summary/i.test(document.body.innerText || ''),
        performance: /Performance Overview/i.test(document.body.innerText || ''),
        geography: /Geography/i.test(document.body.innerText || ''),
      },
    };
  });
}

async function selectDash(page: import('@playwright/test').Page, exact: string) {
  const container = page.locator('#select2-switch-dashboard-container');
  await container.click({ force: true });
  await page.waitForTimeout(400);
  const opts = page.locator('.select2-results__option');
  const n = await opts.count();
  for (let i = 0; i < n; i++) {
    const t = ((await opts.nth(i).textContent()) || '').replace(/\s+/g, ' ').trim();
    if (t === exact) {
      await opts.nth(i).click({ force: true });
      await page.waitForTimeout(4500);
      return true;
    }
  }
  await page.keyboard.press('Escape');
  return false;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: path.join(process.cwd(), 'playwright/.auth/user.json'),
  });
  const page = await context.newPage();
  await ensurePortalSession(page);
  await new LeftNavPage(page).openSmokePage({
    id: 'biz.dashboards',
    module: 'biz',
    menuLabel: 'Dashboards',
    route: 'site/dashboard',
    hrefIncludes: ['site/dashboard'],
    hrefExcludes: ['marketing=yes'],
    titleIncludes: /Dashboard/i,
  });
  await page.waitForTimeout(2000);

  const result: Record<string, unknown> = {};
  await selectDash(page, 'Site Overview');
  result.siteOverview = await snapChrome(page);

  await selectDash(page, 'VitalPulse');
  result.vitalPulse = await snapChrome(page);

  // try click first purple-ish icon in table if any
  const vsClick = await page.evaluate(() => {
    const icons = [
      ...document.querySelectorAll(
        'table i.fa, table .fa-arrow, [class*="vital"], .purple, i[style*="purple"], .grid-stack-item i.fa-chevron, .grid-stack-item i.fa-caret, .grid-stack-item i.fa-plus'
      ),
    ];
    return {
      count: icons.length,
      sample: icons.slice(0, 15).map((el) => ({
        cls: String(el.className || ''),
        title: el.getAttribute('title') || '',
        color: (el as HTMLElement).style.color || getComputedStyle(el).color,
      })),
    };
  });
  result.vitalPulseIcons = vsClick;

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(result, null, 2));
  console.log('wrote', out);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
