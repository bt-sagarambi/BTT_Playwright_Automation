/**
 * Fetch Help Center article text for Core Web Vital URL Volume / URL Category Analysis.
 * Run: npx tsx scripts/fetch-url-category-analysis-help.ts
 */
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const out = path.join(process.cwd(), 'docs', 'prompts', 'url-category-analysis-pdf-extract.txt');
const htmlOut = path.join(process.cwd(), 'docs', 'prompts', 'BI_Dashboard_Core_Web_Vital_URL_Volume.html');
const url =
  'https://help.bluetriangle.com/hc/en-us/articles/37515340733843-BI-Dashboard-Core-Web-Vital-URL-Volume';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForTimeout(10000);
    // Cloudflare challenge may need extra wait
    for (let i = 0; i < 20; i++) {
      const body = (await page.locator('body').innerText().catch(() => '')) || '';
      if (/URL Performance Category|Core Web Vital URL Volume|Dashboard Components|Filter Options/i.test(body)) break;
      await page.waitForTimeout(2000);
    }
    const html = await page.content();
    fs.writeFileSync(htmlOut, html);
    const text =
      (await page
        .locator('article, .article-body, .article-info, main, #main-content')
        .first()
        .innerText()
        .catch(async () => page.locator('body').innerText())) || '';
    fs.writeFileSync(out, String(text));
    console.log(`wrote ${out} (${text.length} chars)`);
    console.log(String(text).slice(0, 1500));
  } finally {
    await browser.close();
  }
}

void main();
