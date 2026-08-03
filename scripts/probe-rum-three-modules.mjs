import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import os from 'os';

process.env.PLAYWRIGHT_BROWSERS_PATH =
  process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright');

const text = fs.readFileSync('config/env.local.ts', 'utf8');
const username = (text.match(/username:\s*'([^']+)'/) || [])[1];
const password = (text.match(/password:\s*'([^']+)'/) || [])[1];

const pages = [
  {
    key: 'bounce-exit',
    route: 'real-user-monitoring/bounce-and-exit-analysis',
    out: 'config/tmp/probe-bounce-exit.json',
  },
  {
    key: 'errors-explorer',
    route: 'javascript-errors/real-user',
    out: 'config/tmp/probe-errors-explorer.json',
  },
  {
    key: 'performance-budget',
    route: 'overview-dashboard/performance-budget',
    out: 'config/tmp/probe-performance-budget.json',
  },
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto('https://portal.bluetriangle.com/btportal/web/index.php?r=site/login', {
  waitUntil: 'domcontentloaded',
});
await page.locator('#loginform-username').fill(username);
await page.locator('#loginform-password').fill(password);
await page.getByRole('button', { name: /^Sign In$/i }).click();
await page.waitForURL((u) => !/site\/login|site%2Flogin/i.test(u.toString()), { timeout: 60000 });

fs.mkdirSync('config/tmp', { recursive: true });

for (const def of pages) {
  await page.goto(`https://portal.bluetriangle.com/btportal/web/index.php?r=${def.route}`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForTimeout(14000);

  const probe = await page.evaluate(() => {
    const title = document.querySelector('#page-title')?.textContent?.trim() || '';
    const interestingIds = [...document.querySelectorAll('[id]')]
      .map((e) => e.id)
      .filter((id) =>
        /filter|graph|chart|table|time|period|bucket|page|marker|toggle|view|search|pager|badge|quick|error|bounce|exit|budget|metric|device|browser|origin|bot/i.test(
          id
        )
      )
      .slice(0, 180);
    const headings = [...document.querySelectorAll('h1,h2,h3,h4,.section-title,.card-title,.highcharts-title')]
      .map((h) => (h.textContent || '').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .slice(0, 60);
    const badges = [...document.querySelectorAll('.badge-wrapper, [id$="-view"].badge, span.badge, [id$="-view"]')]
      .map((el) => ({
        id: el.id,
        text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 140),
        label: el.closest('.badge-wrapper')?.querySelector('b')?.textContent?.trim() || null,
        visible: (() => {
          const host = el.closest('.badge-wrapper') || el;
          return getComputedStyle(host).display !== 'none' && host.offsetParent !== null;
        })(),
      }))
      .filter((b) => b.id || b.text)
      .slice(0, 50);
    const selects = [...document.querySelectorAll('select')]
      .filter((s) => s.id && !/site-id|genius/i.test(s.id))
      .map((s) => ({
        id: s.id,
        options: [...s.options].slice(0, 10).map((o) => (o.textContent || '').trim()),
      }))
      .slice(0, 40);
    const tables = [...document.querySelectorAll('table')]
      .filter((t) => t.id || t.querySelector('thead th'))
      .map((t) => ({
        id: t.id,
        th: [...t.querySelectorAll('thead th')]
          .map((th) => (th.textContent || '').replace(/\s+/g, ' ').trim())
          .slice(0, 20),
        rows: t.querySelectorAll('tbody tr').length,
        visible: getComputedStyle(t).display !== 'none' && t.offsetParent !== null,
      }))
      .slice(0, 20);
    const buttons = [...document.querySelectorAll('button, a.btn')]
      .map((b) => ({
        id: b.id,
        text: (b.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80),
        tip: b.getAttribute('data-original-title') || b.getAttribute('title') || '',
      }))
      .filter((b) => b.text || b.id || b.tip)
      .slice(0, 70);
    const labels = [...document.querySelectorAll('label, b')]
      .map((l) => (l.textContent || '').replace(/\s+/g, ' ').trim())
      .filter((t) => t && t.length < 60)
      .slice(0, 80);
    return {
      title,
      url: location.href,
      interestingIds,
      headings: [...new Set(headings)],
      badges,
      selects,
      tables,
      buttons,
      charts: document.querySelectorAll('.highcharts-container').length,
      labels: [...new Set(labels)].slice(0, 50),
      bodySample: (document.body.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 3500),
    };
  });

  fs.writeFileSync(def.out, JSON.stringify(probe, null, 2));
  await page.screenshot({
    path: `config/tmp/probe-${def.key}.png`,
    fullPage: true,
  });
  console.log(`\n==== ${def.key} ====`);
  console.log(JSON.stringify({ title: probe.title, url: probe.url, charts: probe.charts, headings: probe.headings.slice(0, 25), tables: probe.tables, badges: probe.badges.filter((b) => b.visible).slice(0, 15), buttons: probe.buttons.filter((b) => b.text).slice(0, 25) }, null, 2));
}

await browser.close();
