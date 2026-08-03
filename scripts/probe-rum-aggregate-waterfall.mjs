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
await page.waitForTimeout(15000);

const probe = await page.evaluate(() => {
  const title = document.querySelector('#page-title')?.textContent?.trim() || '';
  const interestingIds = [...document.querySelectorAll('[id]')]
    .map((e) => e.id)
    .filter((id) =>
      /filter|graph|chart|table|time|period|bucket|page|marker|waterfall|object|domain|metric|device|browser|origin|toggle|view|search|pager|onload|badge|quick/i.test(
        id
      )
    )
    .slice(0, 160);
  const headings = [...document.querySelectorAll('h1,h2,h3,h4,.section-title,.card-title,.highcharts-title')]
    .map((h) => (h.textContent || '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, 50);
  const badges = [...document.querySelectorAll('.badge-wrapper, [id$="-view"].badge, span.badge')]
    .map((el) => ({
      id: el.id,
      text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120),
      label: el.closest('.badge-wrapper')?.querySelector('b')?.textContent?.trim() || null,
      visible: getComputedStyle(el.closest('.badge-wrapper') || el).display !== 'none',
    }))
    .slice(0, 40);
  const selects = [...document.querySelectorAll('select')]
    .filter((s) => s.id && !/site-id|genius/i.test(s.id))
    .map((s) => ({
      id: s.id,
      name: s.name,
      options: [...s.options].slice(0, 12).map((o) => (o.textContent || '').trim()),
    }))
    .slice(0, 50);
  const tables = [...document.querySelectorAll('table')].map((t) => ({
    id: t.id,
    th: [...t.querySelectorAll('thead th')]
      .map((th) => (th.textContent || '').replace(/\s+/g, ' ').trim())
      .slice(0, 20),
    rows: t.querySelectorAll('tbody tr').length,
  }));
  const buttons = [...document.querySelectorAll('button, a.btn')]
    .map((b) => ({
      id: b.id,
      text: (b.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80),
      tip: b.getAttribute('data-original-title') || b.getAttribute('title') || '',
    }))
    .filter((b) => b.text || b.id || b.tip)
    .slice(0, 60);
  const charts = document.querySelectorAll('.highcharts-container').length;
  const infoIcons = document.querySelectorAll(
    '.fa-info-circle, .fal.fa-info-circle, [data-toggle="tooltip"]'
  ).length;
  const labels = [...document.querySelectorAll('label, b.badge-wrapper, .filter-section-title, .control-label')]
    .map((l) => (l.textContent || '').replace(/\s+/g, ' ').trim())
    .filter((t) => t && t.length < 80)
    .slice(0, 80);
  return {
    title,
    url: location.href,
    interestingIds,
    headings,
    badges,
    selects,
    tables,
    buttons,
    charts,
    infoIcons,
    labels: [...new Set(labels)].slice(0, 60),
    bodySample: (document.body.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 2500),
  };
});

fs.mkdirSync('docs/prompts', { recursive: true });
fs.writeFileSync('docs/prompts/aggregate-waterfall-live-probe.json', JSON.stringify(probe, null, 2));
console.log(JSON.stringify(probe, null, 2).slice(0, 14000));
await page.screenshot({ path: 'docs/prompts/aggregate-waterfall-live.png', fullPage: true });
await browser.close();
