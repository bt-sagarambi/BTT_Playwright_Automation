/**
 * Live probe: Revenue Attribution (Improve Conversion)
 * Run: npx tsx scripts/probe-revenue-attribution.ts
 * Uses string-based page.evaluate to avoid TSX __name injection into browser context.
 */
import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { ensurePortalSession } from '../helpers/portalSession';
import { SiteDropdownPage } from '../pages/SiteDropdownPage';
import { LeftNavPage } from '../pages/LeftNavPage';

const PAGE_DEF = {
  id: 'biz.revenue-attribution',
  module: 'biz',
  menuLabel: 'Revenue Attribution',
  route: 'business-analytics/revenue-attribution',
  titleIncludes: /Revenue Attribution/i,
};

const outDir = path.join(process.cwd(), 'docs', 'prompts');
const out = path.join(outDir, 'revenue-attribution-live-probe.json');
const shot = path.join(outDir, 'revenue-attribution-live.png');

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
      /attr|revenue|brand|chart|metric|filter|compare|conversion|graph|toggle|view|bot|device|campaign|page|table|highchart|export|select|period|timezone|visitor|os|browser|country|influence|platform|kpi|session|aov|report|scale|run|save/i.test(
        id
      )
    )
    .slice(0, 350);
  const select2 = Array.from(document.querySelectorAll('[id^="select2-"]'))
    .map((el) => ({
      id: el.id,
      text: txt(el).slice(0, 200),
      visible: !!el.getClientRects().length,
    }))
    .slice(0, 120);
  const uniqueButtons = Array.from(
    new Set(
      Array.from(document.querySelectorAll('button, a.btn, .btn, input[type="button"], input[type="submit"], [role="button"]'))
        .map((el) => txt(el) || el.getAttribute('value') || el.getAttribute('title') || '')
        .filter((t) => t && t.length > 0 && t.length < 120)
    )
  ).slice(0, 150);
  const labels = Array.from(
    new Set(
      Array.from(document.querySelectorAll('label, .control-label, .filter-label, th, .ci-tab, [role="tab"], .nav-tabs a, h1, h2, h3, h4, .panel-title, .widget-title, .section-title, legend'))
        .map((el) => txt(el))
        .filter((t) => t && t.length < 160)
    )
  ).slice(0, 180);
  const tabs = Array.from(
    document.querySelectorAll(
      '.ci-tab, [role="tab"], .nav-tabs a, .nav-tabs li, [id$="-toggle"], [id$="-tab"], .btt-tab, .page-tab, .btn-group .btn, .device-btn, [class*="device"] button, [class*="platform"] button'
    )
  )
    .map((el) => ({
      id: el.id || '',
      text: txt(el).slice(0, 100),
      cls: String(el.className || '').slice(0, 160),
      active: /active|selected|btn-primary|btn-info|outlined|checked/i.test(String(el.className || '') + ' ' + (el.getAttribute('aria-pressed') || '')),
    }))
    .filter((t) => t.text)
    .slice(0, 100);
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
          .slice(0, 25),
        w: Math.round(r.width),
        h: Math.round(r.height),
      };
    }
  );
  const tables = Array.from(document.querySelectorAll('table'))
    .map((tb) => ({
      id: tb.id || '',
      className: String(tb.className || '').slice(0, 140),
      headers: Array.from(tb.querySelectorAll('thead th, tr th'))
        .map((th) => txt(th))
        .filter(Boolean)
        .slice(0, 40),
      rows: tb.querySelectorAll('tbody tr').length,
      visible: !!tb.getClientRects().length,
    }))
    .filter((t) => t.headers.length || t.id)
    .slice(0, 40);
  const inputs = Array.from(document.querySelectorAll('input, select, textarea'))
    .map((el) => ({
      id: el.id || '',
      name: el.getAttribute('name') || '',
      type: el.getAttribute('type') || el.tagName.toLowerCase(),
      value: String((el).value || '').slice(0, 100),
      placeholder: el.getAttribute('placeholder') || '',
      visible: !!el.getClientRects().length,
    }))
    .filter((x) => x.id || x.name)
    .slice(0, 150);
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
    if (el) badges[id] = { text: txt(el).slice(0, 160), visible: !!el.getClientRects().length };
  });
  const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,.page-header,.panel-heading,.section-header'))
    .map((el) => txt(el))
    .filter(Boolean)
    .slice(0, 50);
  const bodySample = txt(document.body).slice(0, 6000);
  const pageTitle = txt(document.querySelector('#page-title, .page-title, h1'));
  const url = location.href;
  const title = document.title;
  const influenceHits = Array.from(
    new Set(
      (bodySample.match(/Performance|Stability|Sessions|Average Order Value|Intent|Traffic|Experience Influence|Marketing Influence|Revenue Influence|KPI Change|Revenue Per Session|basis point|Desktop|Mobile|All Devices|Scaling|Save & Run|Run Report/gi) || []).map((s) => s)
    )
  );
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
    influenceHits,
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
  await page.waitForTimeout(6000);
  await page
    .locator('.jconfirm.jconfirm-open button, .get-started button')
    .filter({ hasText: /ok|close|got it|don't show|dismiss/i })
    .first()
    .click({ force: true })
    .catch(() => undefined);
  await page.waitForTimeout(2000);

  // Wait soft for charts / report chrome
  await page
    .locator('.highcharts-container, #page-title, table, [id*="attribution"], [id*="revenue"]')
    .first()
    .waitFor({ state: 'attached', timeout: 45000 })
    .catch(() => undefined);
  await page.waitForTimeout(3000);

  await page.screenshot({ path: shot, fullPage: true }).catch(() => undefined);
  const base = await page.evaluate(SNAPSHOT_JS);
  savePartial({
    nav: PAGE_DEF,
    snap: {
      url: (base as any).url,
      title: (base as any).title,
      pageTitle: (base as any).pageTitle,
      highcharts: (base as any).highcharts,
      headings: ((base as any).headings || []).slice(0, 40),
      badges: (base as any).badges,
      tabs: ((base as any).tabs || []).slice(0, 60),
      buttons: ((base as any).uniqueButtons || []).slice(0, 60),
      labels: ((base as any).labels || []).slice(0, 100),
      select2: ((base as any).select2 || []).slice(0, 60),
      charts: ((base as any).charts || []).slice(0, 30),
      tables: ((base as any).tables || []).slice(0, 20),
      inputs: ((base as any).inputs || []).slice(0, 80),
      relevantIds: ((base as any).relevantIds || []).slice(0, 180),
      bodySample: ((base as any).bodySample || '').slice(0, 5000),
      influenceHits: (base as any).influenceHits,
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
  await page.waitForTimeout(2500);
  const filtersOpen = await page.evaluate(SNAPSHOT_JS);
  savePartial({
    filtersOpen: {
      labels: ((filtersOpen as any).labels || []).slice(0, 100),
      select2: ((filtersOpen as any).select2 || []).slice(0, 60),
      badges: (filtersOpen as any).badges,
      inputs: ((filtersOpen as any).inputs || []).slice(0, 80),
      buttons: ((filtersOpen as any).uniqueButtons || []).slice(0, 50),
      bodySample: ((filtersOpen as any).bodySample || '').slice(0, 3500),
      influenceHits: (filtersOpen as any).influenceHits,
    },
  });
  // Soft note Save & Run presence — do NOT click Save & Run
  const saveRun = await page
    .locator('button, a, input[type="submit"]')
    .filter({ hasText: /Save\s*&\s*Run|Run Report|Save and Run/i })
    .count()
    .catch(() => 0);
  savePartial({ saveAndRunSoft: { count: saveRun, clicked: false } });
  await page.keyboard.press('Escape').catch(() => undefined);
  await page.locator('#cancel-filters').click({ force: true, timeout: 3000 }).catch(() => undefined);
  await page.waitForTimeout(800);

  // Sample visible Select2 options (report picker etc.)
  const select2Samples: any[] = [];
  for (const entry of ((base as any).select2 || []).slice(0, 16) as any[]) {
    if (!entry.visible) continue;
    try {
      await page.locator(`#${CSS.escape(entry.id)}`).click({ force: true, timeout: 3000 });
      await page.waitForTimeout(800);
      const opts = await page.evaluate(
        `(() => Array.from(document.querySelectorAll('.select2-results__option, .select2-results__message')).map(el => (el.textContent||'').replace(/\\s+/g,' ').trim()).filter(Boolean).slice(0,40))()`
      );
      select2Samples.push({ id: entry.id, current: entry.text, optionsSample: opts });
      await page.keyboard.press('Escape').catch(() => undefined);
      await page.waitForTimeout(300);
    } catch (e) {
      select2Samples.push({ id: entry.id, error: String(e).slice(0, 140) });
    }
  }
  savePartial({ select2Samples });

  // Soft device toggles (Desktop / Mobile / All Devices) — restore after sampling
  const deviceSoft: any = { sampled: [] as any[] };
  const deviceBtns = page.locator('button, a, .btn, [role="button"]').filter({
    hasText: /^\s*(Desktop|Mobile|All Devices|Tablet)\s*$/i,
  });
  const deviceCount = await deviceBtns.count().catch(() => 0);
  deviceSoft.count = deviceCount;
  for (let i = 0; i < Math.min(deviceCount, 4); i++) {
    const btn = deviceBtns.nth(i);
    const text = ((await btn.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
    const clsBefore = (await btn.getAttribute('class').catch(() => '')) || '';
    await btn.click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(1200);
    const clsAfter = (await btn.getAttribute('class').catch(() => '')) || '';
    deviceSoft.sampled.push({ text, clsBefore: clsBefore.slice(0, 120), clsAfter: clsAfter.slice(0, 120) });
  }
  // Re-click to try restore first three if still present
  for (let i = 0; i < Math.min(deviceCount, 3); i++) {
    await deviceBtns.nth(i).click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(400);
  }
  const afterDevice = await page.evaluate(SNAPSHOT_JS);
  deviceSoft.after = {
    highcharts: (afterDevice as any).highcharts,
    influenceHits: (afterDevice as any).influenceHits,
    buttons: ((afterDevice as any).uniqueButtons || []).filter((t: string) =>
      /Desktop|Mobile|All Devices|Tablet/i.test(t)
    ),
  };
  savePartial({ deviceSoft });

  // Soft report selection change — sample first alternate option then restore if possible
  const reportSoft: any = {};
  const reportContainer = page.locator(
    '#select2-existingReportSelect-container, #select2-report-select-container, [id*="select2-"][id*="report"], [id*="select2-"][id*="Report"]'
  ).first();
  if (await reportContainer.isVisible().catch(() => false)) {
    const before = ((await reportContainer.innerText().catch(() => '')) || '').trim();
    reportSoft.before = before.slice(0, 200);
    await reportContainer.click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(700);
    const opts = await page.evaluate(
      `(() => Array.from(document.querySelectorAll('.select2-results__option')).map(el => (el.textContent||'').replace(/\\s+/g,' ').trim()).filter(Boolean).slice(0,25))()`
    );
    reportSoft.optionsSample = opts;
    await page.keyboard.press('Escape').catch(() => undefined);
  } else {
    reportSoft.note = 'No obvious report Select2 container by common ids; see select2Samples';
  }
  savePartial({ reportSoft });

  // Graph/table / section chrome soft sample
  const graphTable = await page.evaluate(`(() => {
    const txt = (el) => ((el && (el.innerText || el.textContent)) || '').replace(/\\s+/g, ' ').trim();
    return Array.from(document.querySelectorAll('button, a, .btn, [role="tab"]'))
      .map((el) => ({ id: el.id || '', text: txt(el).slice(0, 80), cls: String(el.className||'').slice(0,100) }))
      .filter((x) => /graph|table|chart|platform|page|influence|kpi|device|desktop|mobile|all devices|report|export|filter/i.test(x.text + ' ' + x.id))
      .slice(0, 60);
  })()`);
  savePartial({ graphTableToggles: graphTable });

  // Soft Brand Attribution discrimination peek via menu text only (no nav if possible)
  const brandAttrMenu = await page
    .locator('a, span, li')
    .filter({ hasText: /^\s*Brand Attribution\s*$/i })
    .count()
    .catch(() => 0);
  savePartial({ brandAttributionSoft: { menuHits: brandAttrMenu } });

  console.log('Wrote', out);
  await browser.close();
}

main().catch((e) => {
  savePartial({ fatal: String(e).slice(0, 800) });
  console.error(e);
  process.exit(1);
});
