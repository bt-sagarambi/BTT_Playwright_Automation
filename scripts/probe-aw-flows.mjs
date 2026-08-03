import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import os from 'os';

process.env.PLAYWRIGHT_BROWSERS_PATH =
  process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright');

const text = fs.readFileSync('config/env.local.ts', 'utf8');
const username = (text.match(/username:\s*'([^']+)'/) || [])[1];
const password = (text.match(/password:\s*'([^']+)'/) || [])[1];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto('https://portal.bluetriangle.com/btportal/web/index.php?r=site/login', {
  waitUntil: 'domcontentloaded',
});
await page.locator('#loginform-username').fill(username);
await page.locator('#loginform-password').fill(password);
await page.getByRole('button', { name: /^Sign In$/i }).click();
await page.waitForURL((u) => !/site\/login|site%2Flogin/i.test(u.toString()), { timeout: 60000 });
await page.goto(
  'https://portal.bluetriangle.com/btportal/web/index.php?r=real-user-monitoring/object-level-trending',
  { waitUntil: 'domcontentloaded' }
);
await page.waitForTimeout(12000);

const out = {};

// quick filter ids near badges
out.quickFilters = await page.evaluate(() =>
  [...document.querySelectorAll('[id*="quick"], [id*="bot"], [id*="os"]')]
    .map((e) => e.id)
    .filter(Boolean)
    .slice(0, 80)
);

// bot / os badge click menus
for (const id of ['bot-traffic-view', 'operating-system-view', 'device-view']) {
  await page.locator(`#${id}`).click({ force: true }).catch(() => {});
  await page.waitForTimeout(500);
  out[`afterClick_${id}`] = await page.evaluate(() =>
    [...document.querySelectorAll('.flex-dropdown, [id*="quick"], .daterangepicker')]
      .filter((e) => getComputedStyle(e).display !== 'none')
      .map((e) => ({ id: e.id, cls: e.className, text: (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120) }))
      .slice(0, 20)
  );
  await page.keyboard.press('Escape').catch(() => {});
}

// Run Comparison
await page.locator('#run-comparison-button').click({ force: true });
await page.waitForTimeout(2500);
out.afterRunComparison = await page.evaluate(() => ({
  visibleButtons: [...document.querySelectorAll('button, a.btn')]
    .map((b) => ({ id: b.id, text: (b.textContent || '').replace(/\s+/g, ' ').trim() }))
    .filter((b) => /compar|apply|cancel|filter|what/i.test(b.text + b.id))
    .slice(0, 40),
  compareVisible: {
    compareGraph: !!document.querySelector('#domain-level-detail-compare-graph') && getComputedStyle(document.querySelector('#domain-level-detail-compare-graph')).display !== 'none',
    whatsChanged: (document.body.innerText || '').includes("What's Changed"),
    durationTab: !!document.querySelector('#duration-tab'),
    countTab: !!document.querySelector('#count-tab'),
  },
  filterPane: [...document.querySelectorAll('#filter-pane, .filter-pane, #filters-container, [id*="comparison"]')]
    .map((e) => ({ id: e.id, display: getComputedStyle(e).display, text: (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 100) }))
    .slice(0, 20),
  applyCmp: [...document.querySelectorAll('button, a')]
    .filter((b) => /Apply Filters for Comparison|Apply.*Comparison/i.test(b.textContent || ''))
    .map((b) => ({ id: b.id, text: (b.textContent || '').trim() })),
}));

// Try apply comparison filters if button exists
const applyCmp = page.locator('button, a').filter({ hasText: /Apply Filters for Comparison|Apply.*Comparison/i }).first();
if (await applyCmp.isVisible().catch(() => false)) {
  await applyCmp.click({ force: true });
  await page.waitForTimeout(8000);
}
out.afterApplyComparison = await page.evaluate(() => ({
  charts: document.querySelectorAll('.highcharts-container').length,
  whatsChanged: (document.body.innerText || '').includes("What's Changed"),
  compareGraphDisplay: document.querySelector('#domain-level-detail-compare-graph')
    ? getComputedStyle(document.querySelector('#domain-level-detail-compare-graph')).display
    : null,
  durationActive: document.querySelector('#duration-tab')?.className,
  countVisible: !!document.querySelector('#domain-level-detail-count-table'),
  ids: [...document.querySelectorAll('[id*="compare"], [id*="comparison"], [id*="changed"]')].map((e) => e.id).slice(0, 40),
}));

// Domain table view + customize
await page.locator('#table-rum-level-btn').click({ force: true });
await page.waitForTimeout(2000);
out.domainTableHeaders = await page.evaluate(() =>
  [...document.querySelectorAll('#table-for-domain-level-detail-table thead th')].map((th) =>
    (th.textContent || '').replace(/\s+/g, ' ').trim()
  )
);
out.customizeBtn = await page.evaluate(() =>
  [...document.querySelectorAll('button, a')]
    .filter((b) => /Customize Table/i.test(b.textContent || ''))
    .map((b) => ({ id: b.id, text: b.textContent.trim() }))
);
out.expandIcons = await page.evaluate(() =>
  [...document.querySelectorAll('#table-for-domain-level-detail-table tbody tr td:first-child a, #table-for-domain-level-detail-table tbody tr td:first-child button, #table-for-domain-level-detail-table .fa-chart, #table-for-domain-level-detail-table [class*="graph"], #table-for-domain-level-detail-table i')]
    .slice(0, 10)
    .map((e) => ({ tag: e.tagName, cls: e.className, id: e.id, tip: e.getAttribute('data-original-title') || e.getAttribute('title') || '' }))
);

// Object tab
await page.locator('#object-rum-level-detail-btn').click({ force: true });
await page.waitForTimeout(6000);
out.objectState = await page.evaluate(() => ({
  objectBtnClass: document.querySelector('#object-rum-level-detail-btn')?.className,
  tableRows: document.querySelectorAll('#table-for-object-level-detail-table tbody tr').length,
  headers: [...document.querySelectorAll('#table-for-object-level-detail-table thead th')].map((th) =>
    (th.textContent || '').replace(/\s+/g, ' ').trim()
  ),
  charts: document.querySelectorAll('.highcharts-container').length,
}));

fs.mkdirSync('config/tmp', { recursive: true });
fs.writeFileSync('config/tmp/aw-flow-probe.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2).slice(0, 12000));
await browser.close();
