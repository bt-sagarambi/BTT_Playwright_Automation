import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import os from 'os';

process.env.PLAYWRIGHT_BROWSERS_PATH =
  process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright');

const queries = [
  {
    key: 'bounce-exit',
    query: 'The RUM Bounce and Exit Analysis Page',
    folder: 'bounce-and-exit-analysis',
    pdfName: 'The RUM Bounce and Exit Analysis Page - Blue Triangle Help Center.pdf',
  },
  {
    key: 'errors-explorer',
    query: 'Errors Explorer',
    folder: 'errors-explorer',
    pdfName: 'The RUM Errors Explorer Page - Blue Triangle Help Center.pdf',
  },
  {
    key: 'performance-budget',
    query: 'Performance Budget',
    folder: 'performance-budget',
    pdfName: 'The RUM Performance Budget Page - Blue Triangle Help Center.pdf',
  },
];

const baseAgents = 'D:/Project_Work/BlueTriangle/AI Agents/US2/monitoring/real-user-browser';
fs.mkdirSync('config/tmp', { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

const results = {};

for (const q of queries) {
  const searchUrl = `https://help.bluetriangle.com/hc/en-us/search?utf8=%E2%9C%93&query=${encodeURIComponent(q.query)}`;
  await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(8000);

  // Cloudflare may block; try wait for results
  const articleLinks = await page.evaluate(() =>
    [...document.querySelectorAll('a[href*="/hc/en-us/articles/"]')]
      .map((a) => ({ href: a.href, text: (a.textContent || '').replace(/\s+/g, ' ').trim() }))
      .filter((a) => a.text && !/sign in|submit/i.test(a.text))
      .slice(0, 15)
  );

  let best =
    articleLinks.find((a) => new RegExp(q.query.split(' ').slice(0, 3).join('.*'), 'i').test(a.text)) ||
    articleLinks.find((a) => /bounce|exit|error|budget/i.test(a.text)) ||
    articleLinks[0];

  // Known fallbacks from related-article naming patterns
  const fallbacks = {
    'bounce-exit': [
      'https://help.bluetriangle.com/hc/en-us/articles/360033775473-The-RUM-Bounce-and-Exit-Analysis-Page',
      'https://help.bluetriangle.com/hc/en-us/articles/360033775453',
    ],
    'errors-explorer': [
      'https://help.bluetriangle.com/hc/en-us/articles/360041149754-The-RUM-Errors-Explorer-Page',
      'https://help.bluetriangle.com/hc/en-us/articles/360033775493-Errors-Explorer',
    ],
    'performance-budget': [
      'https://help.bluetriangle.com/hc/en-us/articles/360041149774-The-RUM-Performance-Budget-Page',
      'https://help.bluetriangle.com/hc/en-us/articles/360033775513-Performance-Budget',
    ],
  };

  if (!best) {
    for (const fb of fallbacks[q.key] || []) {
      const resp = await page.goto(fb, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => null);
      if (resp && resp.ok()) {
        best = { href: fb, text: q.query };
        break;
      }
    }
  } else {
    await page.goto(best.href, { waitUntil: 'domcontentloaded', timeout: 90000 });
  }

  await page.waitForTimeout(5000);
  const articleText = await page.evaluate(() => {
    const article =
      document.querySelector('article') ||
      document.querySelector('.article-body') ||
      document.querySelector('#article-container') ||
      document.body;
    return {
      title: document.querySelector('h1')?.textContent?.trim() || document.title,
      url: location.href,
      text: (article?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 12000),
      blocked: /just a moment|enable javascript and cookies/i.test(document.body?.innerText || ''),
    };
  });

  const outDir = path.join(baseAgents, q.folder);
  fs.mkdirSync(outDir, { recursive: true });
  const pdfPath = path.join(outDir, q.pdfName);
  const txtPath = path.join(outDir, q.pdfName.replace(/\.pdf$/i, '.txt'));

  let pdfOk = false;
  if (!articleText.blocked && articleText.text.length > 200) {
    try {
      await page.pdf({ path: pdfPath, format: 'A4', printBackground: true });
      pdfOk = true;
    } catch (e) {
      console.warn('pdf fail', e.message);
    }
    fs.writeFileSync(txtPath, `${articleText.title}\n${articleText.url}\n\n${articleText.text}`);
  }

  results[q.key] = {
    searchLinks: articleLinks,
    chosen: best,
    articleTitle: articleText.title,
    articleUrl: articleText.url,
    blocked: articleText.blocked,
    textLen: articleText.text.length,
    pdfOk,
    pdfPath: pdfOk ? pdfPath : null,
    txtPath: fs.existsSync(txtPath) ? txtPath : null,
  };
  console.log(JSON.stringify(results[q.key], null, 2));
}

fs.writeFileSync('config/tmp/help-center-fetch.json', JSON.stringify(results, null, 2));
await browser.close();
