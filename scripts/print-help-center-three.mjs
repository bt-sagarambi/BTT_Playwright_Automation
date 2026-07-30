import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import os from 'os';

process.env.PLAYWRIGHT_BROWSERS_PATH =
  process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright');

const base = 'D:/Project_Work/BlueTriangle/AI Agents/US2/monitoring/real-user-browser';

const articles = [
  {
    folder: 'bounce-and-exit-analysis',
    url: 'https://help.bluetriangle.com/hc/en-us/articles/360033775293-The-RUM-Bounce-and-Exit-Analysis-Page',
    pdfName: 'The RUM Bounce and Exit Analysis Page - Blue Triangle Help Center.pdf',
  },
  {
    folder: 'errors-explorer',
    url: 'https://help.bluetriangle.com/hc/en-us/articles/360056819434-The-RUM-Errors-Explorer-Page',
    pdfName: 'The RUM Errors Explorer Page - Blue Triangle Help Center.pdf',
  },
  {
    folder: 'performance-budget',
    // resolve from section listing if this 404s
    url: 'https://help.bluetriangle.com/hc/en-us/articles/360033775413-Performance-Budgets',
    pdfName: 'Performance Budgets - Blue Triangle Help Center.pdf',
    resolveFromSection: true,
  },
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// Resolve Performance Budgets URL from RUM section if needed
await page.goto('https://help.bluetriangle.com/hc/en-us/sections/360003873194-Real-User-Monitoring', {
  waitUntil: 'domcontentloaded',
  timeout: 90000,
});
await page.waitForTimeout(6000);
const sectionLinks = await page.evaluate(() =>
  [...document.querySelectorAll('a[href*="/hc/en-us/articles/"]')].map((a) => ({
    href: a.href,
    text: (a.textContent || '').replace(/\s+/g, ' ').trim(),
  }))
);
const budgetLink = sectionLinks.find((l) => /performance budget/i.test(l.text));
if (budgetLink) {
  articles[2].url = budgetLink.href;
  console.log('Resolved Performance Budgets URL:', budgetLink.href);
} else {
  console.log('Section links sample:', sectionLinks.slice(0, 20));
}

for (const a of articles) {
  await page.goto(a.url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(5000);
  const info = await page.evaluate(() => {
    const body =
      document.querySelector('article .article-body, .article-body, article') || document.body;
    return {
      title: document.querySelector('h1')?.textContent?.trim() || document.title,
      url: location.href,
      text: (body?.innerText || '').trim(),
      blocked: /just a moment|enable javascript and cookies/i.test(document.body.innerText || ''),
    };
  });
  const dir = path.join(base, a.folder);
  fs.mkdirSync(dir, { recursive: true });
  const pdfPath = path.join(dir, a.pdfName);
  const txtPath = path.join(dir, a.pdfName.replace(/\.pdf$/i, '.txt'));
  fs.writeFileSync(txtPath, `${info.title}\n${info.url}\n\n${info.text}`);
  if (!info.blocked && info.text.length > 400) {
    await page.pdf({ path: pdfPath, format: 'A4', printBackground: true, margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' } });
    console.log('OK', a.folder, 'chars', info.text.length, 'pdf', pdfPath);
  } else {
    console.log('WEAK', a.folder, 'blocked', info.blocked, 'chars', info.text.length, 'url', info.url);
  }
}

await browser.close();
