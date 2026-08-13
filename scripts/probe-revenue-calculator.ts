/**
 * Live probe: Revenue Calculator (sales conversion-type)
 * Run: npx tsx scripts/probe-revenue-calculator.ts
 * Uses string-based page.evaluate to avoid TSX __name injection into browser context.
 */
import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { ensurePortalSession } from '../helpers/portalSession';
import { SiteDropdownPage } from '../pages/SiteDropdownPage';
import { LeftNavPage } from '../pages/LeftNavPage';

const PAGE_DEF = {
  id: 'biz.revenue-calculator',
  module: 'biz',
  menuLabel: 'Revenue Calculator',
  route: 'business-analytics/revenue-calculator',
  hrefIncludes: ['conversion-type=sales', 'revenue-calculator'],
  titleIncludes: /Revenue Calculator|Calculator/i,
};

const outDir = path.join(process.cwd(), 'docs', 'prompts');
const out = path.join(outDir, 'revenue-calculator-live-probe.json');
const shot = path.join(outDir, 'revenue-calculator-live.png');

function savePartial(obj: Record<string, unknown>) {
  fs.mkdirSync(outDir, { recursive: true });
  let prev: Record<string, unknown> = {};
  try {
    prev = JSON.parse(fs.readFileSync(out, 'utf8'));
  } catch {
    // ignore
  }
  fs.writeFileSync(out, JSON.stringify({ ...prev, ...obj, savedAt: new Date().toISOString() }, null, 2));
}

const SNAPSHOT_JS = `(() => {
  const txt = (el) => ((el && (el.innerText || el.textContent)) || '').replace(/\\s+/g, ' ').trim();
  const allIds = Array.from(document.querySelectorAll('[id]')).map((el) => el.id).filter(Boolean);
  const relevantIds = allIds
    .filter((id) =>
      /calc|revenue|brand|chart|metric|filter|compare|conversion|graph|toggle|view|bot|device|campaign|page|table|highchart|export|select|period|timezone|visitor|os|browser|country|what.?if|slider|kpi|load.?time|opportunity|session|bounce|aov|crc/i.test(
        id
      )
    )
    .slice(0, 300);
  const select2 = Array.from(document.querySelectorAll('[id^="select2-"]'))
    .map((el) => ({
      id: el.id,
      text: txt(el).slice(0, 160),
      visible: !!el.getClientRects().length,
    }))
    .slice(0, 100);
  const uniqueButtons = Array.from(
    new Set(
      Array.from(document.querySelectorAll('button, a.btn, .btn, input[type="button"], input[type="submit"]'))
        .map((el) => txt(el) || el.getAttribute('value') || '')
        .filter((t) => t && t.length > 0 && t.length < 100)
    )
  ).slice(0, 120);
  const labels = Array.from(
    new Set(
      Array.from(document.querySelectorAll('label, .control-label, .filter-label, th, .ci-tab, [role="tab"], .nav-tabs a, h1, h2, h3, h4, .panel-title, .widget-title'))
        .map((el) => txt(el))
        .filter((t) => t && t.length < 120)
    )
  ).slice(0, 150);
  const tabs = Array.from(
    document.querySelectorAll(
      '.ci-tab, [role="tab"], .nav-tabs a, .nav-tabs li, [id$="-toggle"], [id$="-tab"], .btt-tab, .page-tab, .btn-group .btn'
    )
  )
    .map((el) => ({
      id: el.id || '',
      text: txt(el).slice(0, 100),
      cls: String(el.className || '').slice(0, 140),
      active: /active|selected|btn-primary/i.test(String(el.className || '')),
    }))
    .filter((t) => t.text)
    .slice(0, 80);
  const charts = Array.from(document.querySelectorAll('.highcharts-container, [data-highcharts-chart]')).map(
    (el, i) => {
      const r = el.getBoundingClientRect();
      return {
        i,
        id: el.id || '',
        parentId: el.parentElement ? el.parentElement.id : '',
        grandParentId:
          el.parentElement && el.parentElement.parentElement ? el.parentElement.parentElement.id : '',
        title: txt(el.querySelector('.highcharts-title, .highcharts-subtitle')) || '',
        legend: Array.from(el.querySelectorAll('.highcharts-legend-item, .highcharts-legend text'))
          .map((n) => txt(n))
          .filter(Boolean)
          .slice(0, 20),
        w: Math.round(r.width),
        h: Math.round(r.height),
      };
    }
  );
  const tables = Array.from(document.querySelectorAll('table'))
    .map((tb) => ({
      id: tb.id || '',
      className: String(tb.className || '').slice(0, 120),
      headers: Array.from(tb.querySelectorAll('thead th, tr th'))
        .map((th) => txt(th))
        .filter(Boolean)
        .slice(0, 30),
      rows: tb.querySelectorAll('tbody tr').length,
      visible: !!tb.getClientRects().length,
    }))
    .filter((t) => t.headers.length || t.id)
    .slice(0, 30);
  const inputs = Array.from(document.querySelectorAll('input, select, textarea'))
    .map((el) => ({
      id: el.id || '',
      name: el.getAttribute('name') || '',
      type: el.getAttribute('type') || el.tagName.toLowerCase(),
      value: String((el).value || '').slice(0, 80),
      placeholder: el.getAttribute('placeholder') || '',
      visible: !!el.getClientRects().length,
    }))
    .filter((x) => x.id || x.name)
    .slice(0, 120);
  const badges = {};
  [
    'time-period-view',
    'timezone-view',
    'device-view',
    'browser-view',
    'operating-system-view',
    'visitor-type-view',
    'bot-traffic-view',
    'data-type-view',
    'campaign-view',
    'country-view',
    'traffic-segment-view',
    'page-name-view',
    'page-group-view',
    'content-group-view',
    'statistical-method-view',
    'conversion-type-view',
    'report-type-view',
    'minimum-load-time-view',
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) badges[id] = { text: txt(el).slice(0, 120), visible: !!el.getClientRects().length };
  });
  const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,.page-header,.panel-heading'))
    .map((el) => txt(el))
    .filter(Boolean)
    .slice(0, 40);
  const bodySample = txt(document.body).slice(0, 4500);
  const pageTitle = txt(document.querySelector('#page-title, .page-title, h1'));
  const url = location.href;
  const title = document.title;
  return {
    url,
    title,
    pageTitle,
    relevantIds,
    select2,
    uniqueButtons,
    labels,
    tabs,
    charts,
    tables,
    inputs,
    badges,
    headings,
    bodySample,
    highcharts: charts.length,
  };
})()`;

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: path.join(process.cwd(), 'playwright', '.auth', 'user.json'),
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  await ensurePortalSession(page);
  await new SiteDropdownPage(page).ensureProfileSite().catch(() => undefined);
  await new LeftNavPage(page).openSmokePage(PAGE_DEF);
  await page.waitForTimeout(4000);
  await page
    .locator('.jconfirm.jconfirm-open button, .get-started button')
    .filter({ hasText: /ok|close|got it|don't show|dismiss/i })
    .first()
    .click({ force: true })
    .catch(() => undefined);
  await page.waitForTimeout(1500);

  await page.screenshot({ path: shot, fullPage: true }).catch(() => undefined);
  const base = await page.evaluate(SNAPSHOT_JS);
  savePartial({
    nav: PAGE_DEF,
    snap: {
      url: (base as any).url,
      title: (base as any).title,
      pageTitle: (base as any).pageTitle,
      highcharts: (base as any).highcharts,
      headings: ((base as any).headings || []).slice(0, 25),
      badges: (base as any).badges,
      tabs: ((base as any).tabs || []).slice(0, 40),
      buttons: ((base as any).uniqueButtons || []).slice(0, 40),
      labels: ((base as any).labels || []).slice(0, 60),
      select2: ((base as any).select2 || []).slice(0, 40),
      charts: ((base as any).charts || []).slice(0, 25),
      tables: ((base as any).tables || []).slice(0, 15),
      inputs: ((base as any).inputs || []).slice(0, 50),
      relevantIds: ((base as any).relevantIds || []).slice(0, 120),
      bodySample: ((base as any).bodySample || '').slice(0, 3500),
    },
    screenshot: shot,
  });

  // Open filters
  await page
    .locator('#toggle-filters, #mobile-controls-filters-btn, #performance-view-filter, button, a')
    .filter({ hasText: /View Filters|Hide Filters|Filters/i })
    .first()
    .click({ force: true, timeout: 8000 })
    .catch(async () => {
      await page.locator('#toggle-filters').click({ force: true }).catch(() => undefined);
    });
  await page.waitForTimeout(2000);
  const filtersOpen = await page.evaluate(SNAPSHOT_JS);
  savePartial({
    filtersOpen: {
      labels: ((filtersOpen as any).labels || []).slice(0, 80),
      select2: ((filtersOpen as any).select2 || []).slice(0, 50),
      badges: (filtersOpen as any).badges,
      inputs: ((filtersOpen as any).inputs || []).slice(0, 60),
      buttons: ((filtersOpen as any).uniqueButtons || []).slice(0, 40),
      bodySample: ((filtersOpen as any).bodySample || '').slice(0, 2500),
    },
  });
  await page.keyboard.press('Escape').catch(() => undefined);
  await page.locator('#cancel-filters').click({ force: true, timeout: 3000 }).catch(() => undefined);

  // Sample visible Select2 options
  const select2Samples: any[] = [];
  for (const entry of ((base as any).select2 || []).slice(0, 12) as any[]) {
    if (!entry.visible) continue;
    try {
      await page.locator(`#${CSS.escape(entry.id)}`).click({ force: true, timeout: 3000 });
      await page.waitForTimeout(700);
      const opts = await page.evaluate(
        `(() => Array.from(document.querySelectorAll('.select2-results__option, .select2-results__message')).map(el => (el.textContent||'').replace(/\\s+/g,' ').trim()).filter(Boolean).slice(0,30))()`
      );
      select2Samples.push({ id: entry.id, current: entry.text, optionsSample: opts });
      await page.keyboard.press('Escape').catch(() => undefined);
      await page.waitForTimeout(250);
    } catch (e) {
      select2Samples.push({ id: entry.id, error: String(e).slice(0, 120) });
    }
  }
  savePartial({ select2Samples });

  // Soft Add Comparison
  const addComp = page.locator('button, a, .btn').filter({ hasText: /Add Comparison/i }).first();
  if (await addComp.isVisible().catch(() => false)) {
    await addComp.click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(1500);
    const after = await page.evaluate(SNAPSHOT_JS);
    savePartial({
      comparisonSoft: {
        opened: true,
        headings: (after as any).headings,
        uniqueButtons: ((after as any).uniqueButtons || []).slice(0, 30),
        labels: ((after as any).labels || []).slice(0, 40),
      },
    });
    await page.keyboard.press('Escape').catch(() => undefined);
    await page
      .locator('button, a')
      .filter({ hasText: /cancel|close|A-/i })
      .first()
      .click({ force: true })
      .catch(() => undefined);
  }

  // Soft What If / Edit if present
  const whatIf = page.locator('button, a, .btn').filter({ hasText: /What If|Edit What|What-If/i }).first();
  if (await whatIf.isVisible().catch(() => false)) {
    await whatIf.click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(1200);
    const wi = await page.evaluate(SNAPSHOT_JS);
    savePartial({
      whatIfSoft: {
        opened: true,
        headings: (wi as any).headings,
        inputs: ((wi as any).inputs || []).slice(0, 40),
        buttons: ((wi as any).uniqueButtons || []).slice(0, 30),
      },
    });
    await page.keyboard.press('Escape').catch(() => undefined);
    await page
      .locator('button, a')
      .filter({ hasText: /cancel|close/i })
      .first()
      .click({ force: true })
      .catch(() => undefined);
  }

  // Graph/table toggles soft sample
  const graphTable = await page.evaluate(`(() => {
    const txt = (el) => ((el && (el.innerText || el.textContent)) || '').replace(/\\s+/g, ' ').trim();
    return Array.from(document.querySelectorAll('button, a, .btn, [role="tab"]'))
      .map((el) => ({ id: el.id || '', text: txt(el).slice(0, 60), cls: String(el.className||'').slice(0,80) }))
      .filter((x) => /graph|table|chart|conversion rate|sessions|aov|bounce|page views|revenue/i.test(x.text + ' ' + x.id))
      .slice(0, 40);
  })()`);
  savePartial({ graphTableToggles: graphTable });

  console.log('Wrote', out);
  await browser.close();
}

main().catch((e) => {
  savePartial({ fatal: String(e).slice(0, 800) });
  console.error(e);
  process.exit(1);
});
