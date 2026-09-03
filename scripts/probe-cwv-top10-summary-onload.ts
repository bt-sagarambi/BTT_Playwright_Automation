/**
 * Live probe: BI iframe — Charts → CWV Top 10 Summary Onload (+ Chart Builder soft)
 * Shell: business-intelligence/tool → #bi-iframe → jbi.bluetriangletech.com
 *
 * Run: npx tsx scripts/probe-cwv-top10-summary-onload.ts
 */
import { chromium, Frame, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { ensurePortalSession, portalBase } from '../helpers/portalSession';
import { SiteDropdownPage } from '../pages/SiteDropdownPage';
import { LeftNavPage } from '../pages/LeftNavPage';

const outDir = path.join(process.cwd(), 'docs', 'prompts');
const out = path.join(outDir, 'cwv-top10-summary-onload-live-probe.json');
const shot = path.join(outDir, 'cwv-top10-summary-onload-live.png');
const shotChart = path.join(outDir, 'cwv-top10-summary-onload-chart.png');
const shotBuilder = path.join(outDir, 'cwv-top10-summary-onload-chart-builder.png');
const notesPath = path.join(outDir, 'cwv-top10-summary-onload-live-notes.txt');

const CHART_NAME = /CWV Top 10 Summary Onload/i;
const CHART_SEARCH = 'CWV Top 10 Summary Onload';

function save(obj: Record<string, unknown>) {
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
  const interesting = allIds
    .filter((id) =>
      /dashboard|widget|chart|graph|filter|lookback|period|compare|refresh|reset|save|export|table|metric|cwv|lcp|inp|cls|onload|page|browser|device|bot|timezone|percentile|segment|origin|nav|menu|search|apply|cancel|month|delta|builder|axis|dimension|explore|query|order|top/i.test(
        id
      )
    )
    .slice(0, 400);
  const buttons = Array.from(
    new Set(
      Array.from(document.querySelectorAll('button, a.btn, .btn, [role="button"], a, [role="menuitem"]'))
        .map((el) => txt(el))
        .filter((t) => t && t.length > 0 && t.length < 140)
    )
  ).slice(0, 260);
  const labels = Array.from(
    new Set(
      Array.from(document.querySelectorAll('label, .control-label, th, h1, h2, h3, h4, [role="tab"], .filter-title, .widget-title, .MuiTypography-root, span'))
        .map((el) => txt(el))
        .filter((t) => t && t.length > 1 && t.length < 160)
    )
  ).slice(0, 300);
  const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,[role="heading"]'))
    .map((el) => txt(el))
    .filter((t) => t && t.length < 160)
    .slice(0, 100);
  const inputs = Array.from(document.querySelectorAll('input, select, textarea'))
    .map((el) => ({
      tag: el.tagName,
      id: el.id || '',
      name: (el.getAttribute('name') || '').slice(0, 80),
      type: (el.getAttribute('type') || '').slice(0, 40),
      placeholder: (el.getAttribute('placeholder') || '').slice(0, 100),
      aria: (el.getAttribute('aria-label') || '').slice(0, 100),
      value: String(el.value || '').slice(0, 80),
      visible: !!el.getClientRects().length,
    }))
    .filter((x) => x.visible || x.placeholder || x.aria)
    .slice(0, 180);
  const tables = Array.from(document.querySelectorAll('table'))
    .map((t, i) => ({
      i,
      id: t.id || '',
      headers: Array.from(t.querySelectorAll('th')).map((th) => txt(th)).filter(Boolean).slice(0, 30),
      rows: t.querySelectorAll('tbody tr').length,
      visible: !!t.getClientRects().length,
    }))
    .slice(0, 20);
  const charts = Array.from(document.querySelectorAll('svg, canvas, .highcharts-container, [class*="chart" i]'))
    .map((el, i) => {
      const box = el.getBoundingClientRect();
      return {
        i,
        tag: el.tagName,
        cls: String(el.className || '').toString().slice(0, 80),
        w: Math.round(box.width),
        h: Math.round(box.height),
        visible: box.width > 20 && box.height > 20,
      };
    })
    .filter((c) => c.visible)
    .slice(0, 40);
  return {
    title: document.title || '',
    url: location.href,
    interestingIds: interesting,
    buttons,
    labels,
    headings,
    inputs,
    tables,
    charts,
    bodySample: txt(document.body).slice(0, 8000),
  };
})()`;

async function dismiss(page: Page) {
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('Escape').catch(() => undefined);
    await page
      .locator('button')
      .filter({ hasText: /ok|close|got it|don't show|dismiss|continue|agree/i })
      .first()
      .click({ force: true })
      .catch(() => undefined);
    await page.waitForTimeout(300);
  }
}

async function waitForBiFrame(page: Page): Promise<Frame> {
  await page.waitForSelector('#bi-iframe', { timeout: 90000 });
  const handle = await page.$('#bi-iframe');
  const frame = await handle!.contentFrame();
  if (!frame) throw new Error('#bi-iframe has no contentFrame');
  for (let i = 0; i < 40; i++) {
    const ready = await frame
      .evaluate(() => document.body && document.body.innerText && document.body.innerText.length > 40)
      .catch(() => false);
    if (ready) break;
    await page.waitForTimeout(1000);
  }
  await page.waitForTimeout(2000);
  return frame;
}

async function openBiTool(page: Page) {
  const nav = new LeftNavPage(page);
  await nav.openMenu().catch(() => undefined);
  await nav.expandCommonSections().catch(() => undefined);
  const bi = page.locator('a[href*="business-intelligence"]').first();
  const href = (await bi.getAttribute('href').catch(() => null)) || '';
  if (href && (await bi.isVisible().catch(() => false))) {
    await bi.click({ force: true }).catch(() => undefined);
  }
  if (!/business-intelligence\/tool|business-intelligence%2Ftool/i.test(page.url())) {
    await page.goto(`${portalBase()}/index.php?r=business-intelligence/tool&sid=305836`, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });
  }
  await page.waitForURL(/business-intelligence\/tool|business-intelligence%2Ftool/i, { timeout: 90000 });
  await dismiss(page);
}

async function clickNavInFrame(frame: Frame, re: RegExp) {
  const el = frame.locator('a, button, [role="button"], [role="menuitem"], span, div').filter({ hasText: re }).first();
  if (await el.isVisible().catch(() => false)) {
    await el.click({ force: true });
    await frame.waitForTimeout(1500);
    return true;
  }
  return false;
}

async function goToChartsList(frame: Frame) {
  const clicked =
    (await clickNavInFrame(frame, /^Charts$/i)) || (await clickNavInFrame(frame, /\bCharts\b/i));
  await frame.waitForTimeout(2500);
  return clicked;
}

async function searchOpenChart(frame: Frame, page: Page) {
  const search = frame
    .locator(
      'input[placeholder*="Search" i], input[type="search"], input[aria-label*="Search" i], input[placeholder="Search..."]'
    )
    .first();
  if (await search.isVisible({ timeout: 10000 }).catch(() => false)) {
    await search.click({ force: true });
    await search.fill('');
    await search.fill(CHART_SEARCH);
    await frame.waitForTimeout(3500);
  }

  // Prefer exact title link/heading — avoid clicking the whole card preview blob
  const titleCandidates = [
    frame.getByRole('link', { name: CHART_NAME }),
    frame.getByRole('heading', { name: CHART_NAME }),
    frame.locator('a, h2, h3, h4, [role="heading"]').filter({ hasText: /^\s*CWV Top 10 Summary Onload\s*$/i }),
    frame.locator('a, h2, h3, h4, [role="heading"]').filter({ hasText: CHART_NAME }),
  ];
  for (const loc of titleCandidates) {
    const el = loc.first();
    if (await el.isVisible({ timeout: 2500 }).catch(() => false)) {
      const text = ((await el.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim().slice(0, 160);
      await el.scrollIntoViewIfNeeded().catch(() => undefined);
      await el.click({ force: true });
      await page.waitForTimeout(8000);
      // Confirm we left the Charts catalog (Back + viewer chrome, or Catalog Search gone)
      const sample = await frame
        .evaluate(() => (document.body?.innerText || '').replace(/\s+/g, ' ').slice(0, 2500))
        .catch(() => '');
      const inViewer =
        /CWV Top 10 Summary Onload/i.test(sample) &&
        (/\bBack\b/i.test(sample) || /Refresh Data|Export chart|Filters|Lookback Period|PNG Image/i.test(sample)) &&
        !/Chart Builder\s+5 \/ Page/i.test(sample);
      if (inViewer) return { found: true, how: 'title-locator', text, inViewer: true };
      // dblclick soft retry
      await el.dblclick({ force: true }).catch(() => undefined);
      await page.waitForTimeout(8000);
      const sample2 = await frame
        .evaluate(() => (document.body?.innerText || '').replace(/\s+/g, ' ').slice(0, 2500))
        .catch(() => '');
      const inViewer2 =
        /CWV Top 10 Summary Onload/i.test(sample2) &&
        (/\bBack\b/i.test(sample2) || /Refresh Data|Export chart|Filters|Lookback Period/i.test(sample2));
      if (inViewer2) return { found: true, how: 'title-dblclick', text, inViewer: true };
    }
  }

  const clicked = await frame.evaluate(() => {
    const want = /^\s*CWV Top 10 Summary Onload\s*$/i;
    const soft = /CWV Top 10 Summary Onload/i;
    const nodes = Array.from(
      document.querySelectorAll('a, button, h1, h2, h3, h4, [role="heading"], [role="link"]')
    ) as HTMLElement[];
    const scored = nodes
      .map((el) => {
        const t = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
        if (!soft.test(t)) return null;
        const score = want.test(t) ? 5 : t.length < 60 ? 3 : 1;
        return { el, t, score };
      })
      .filter(Boolean) as { el: HTMLElement; t: string; score: number }[];
    scored.sort((a, b) => b.score - a.score || a.t.length - b.t.length);
    const hit = scored[0];
    if (!hit) return { ok: false, text: '' };
    hit.el.scrollIntoView({ block: 'center' });
    hit.el.click();
    return { ok: true, text: hit.t.slice(0, 160) };
  });

  if (clicked?.ok) {
    await page.waitForTimeout(10000);
    return { found: true, how: 'dom-click', text: clicked.text };
  }

  const body = await frame.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 4000));
  return { found: CHART_NAME.test(body), how: 'body-scan', text: body.match(CHART_NAME)?.[0] || '', bodySample: body };
}

async function bestChartFrame(page: Page, fallback: Frame): Promise<Frame> {
  let best = fallback;
  let bestScore = -1;
  for (const f of page.frames()) {
    const sample = await f
      .evaluate(() => (document.body?.innerText || '').replace(/\s+/g, ' ').slice(0, 5000))
      .catch(() => '');
    if (!/CWV Top 10 Summary Onload/i.test(sample)) continue;
    let score = 0;
    if (/Refresh Data|Export|Filters|Lookback Period|Percentile/i.test(sample)) score += 5;
    if (/Save As|Reset/i.test(sample)) score += 2;
    if (/Chart Builder|Create Chart/i.test(sample) && /Search/i.test(sample)) score -= 2; // still on list
    if (score > bestScore) {
      bestScore = score;
      best = f;
    }
  }
  return best;
}

async function softOpenFilters(frame: Frame, page: Page) {
  await frame
    .locator('button, a, [role="button"]')
    .filter({ hasText: /^Filters$/i })
    .first()
    .click({ force: true })
    .catch(() => undefined);
  await page.waitForTimeout(1500);
}

async function softOpenChartBuilder(frame: Frame, page: Page) {
  // Prefer explicit Chart Builder control on Charts list
  const clicked =
    (await clickNavInFrame(frame, /^Chart Builder$/i)) ||
    (await clickNavInFrame(frame, /Chart Builder/i));
  await page.waitForTimeout(5000);
  return clicked;
}

async function softExploreBuilder(frame: Frame, page: Page) {
  // Soft-click Data Explorer / table chips if visible
  for (const label of [/Sessions Page/i, /^Sessions$/i, /RUM Hits/i, /Data Explorer/i]) {
    const el = frame.locator('button, a, [role="button"], [role="option"], li, div, span').filter({ hasText: label }).first();
    if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
      await el.click({ force: true }).catch(() => undefined);
      await page.waitForTimeout(1200);
    }
  }
  // Soft open Chart Type / Options / Order By / Top N if present
  for (const label of [/^Chart Type$/i, /^Options$/i, /^Order By$/i, /^Top N$/i, /Bar/i, /Line/i, /Run Query/i]) {
    const el = frame.locator('button, a, [role="button"], [role="tab"], summary').filter({ hasText: label }).first();
    if (await el.isVisible({ timeout: 1500 }).catch(() => false)) {
      await el.click({ force: true }).catch(() => undefined);
      await page.waitForTimeout(800);
    }
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: path.join(process.cwd(), 'playwright/.auth/user.json'),
    viewport: { width: 1500, height: 950 },
  });
  const page = await context.newPage();
  try {
    await ensurePortalSession(page);
    await new SiteDropdownPage(page).ensureProfileSite().catch(() => undefined);
    await dismiss(page);
    await openBiTool(page);

    let frame = await waitForBiFrame(page);
    const homeSnap = await frame.evaluate(SNAPSHOT_JS);
    save({
      shellUrl: page.url(),
      shellTitle: await page.title(),
      biHome: homeSnap,
    });
    await page.screenshot({ path: shot, fullPage: true }).catch(() => undefined);

    // --- Chart Builder soft pass (user requirement #3) before opening the named chart ---
    const wentChartsForBuilder = await goToChartsList(frame);
    await frame.waitForTimeout(2000);
    const chartsListBeforeBuilder = await frame.evaluate(SNAPSHOT_JS);
    save({ wentChartsForBuilder, chartsListBeforeBuilder });

    const openedBuilder = await softOpenChartBuilder(frame, page);
    frame = (await (await page.$('#bi-iframe'))?.contentFrame()) || frame;
    await softExploreBuilder(frame, page);
    const builderSnap = await frame.evaluate(SNAPSHOT_JS);
    await page.screenshot({ path: shotBuilder, fullPage: true }).catch(() => undefined);
    save({ chartBuilderOpened: openedBuilder, chartBuilder: builderSnap });

    // Escape / Back toward Charts list
    await page.keyboard.press('Escape').catch(() => undefined);
    await clickNavInFrame(frame, /^Charts$/i).catch(() => undefined);
    await page.waitForTimeout(2000);
    frame = (await (await page.$('#bi-iframe'))?.contentFrame()) || frame;

    // --- Charts list → search open CWV Top 10 Summary Onload ---
    const wentCharts = await goToChartsList(frame);
    await frame.waitForTimeout(2500);
    const chartsListSnap = await frame.evaluate(SNAPSHOT_JS);
    save({ wentCharts, chartsList: chartsListSnap });

    const opened = await searchOpenChart(frame, page);
    let frame2 = (await (await page.$('#bi-iframe'))?.contentFrame()) || frame;
    frame2 = await bestChartFrame(page, frame2);
    for (let i = 0; i < 20; i++) {
      const sample = await frame2
        .evaluate(() => (document.body?.innerText || '').replace(/\s+/g, ' ').slice(0, 3000))
        .catch(() => '');
      const inViewer =
        /CWV Top 10 Summary Onload/i.test(sample) &&
        (/Refresh Data|Export|Filters|Lookback Period|Percentile|PNG Image|PDF Document/i.test(sample) ||
          !/Create Chart|Chart Builder[\s\S]{0,40}Search/i.test(sample));
      if (inViewer) break;
      await page.waitForTimeout(1500);
      frame2 = await bestChartFrame(page, frame2);
    }

    await softOpenFilters(frame2, page);
    const chartSnap = await frame2.evaluate(SNAPSHOT_JS);
    await page.screenshot({ path: shotChart, fullPage: true }).catch(() => undefined);

    const body = String((chartSnap as any).bodySample || '');
    const chromeHints = {
      hasRefresh: /Refresh Data/i.test(body),
      hasExport: /Export|PNG Image|PDF Document|CSV/i.test(body),
      hasFilters: /Filters|Lookback Period|Percentile|Device|Browser/i.test(body),
      hasLookback: /Lookback Period/i.test(body),
      hasComparison: /Comparison/i.test(body),
      hasPercentile: /Percentile/i.test(body),
      hasDevice: /\bDevice\b/i.test(body),
      hasPageName: /Page Name/i.test(body),
      hasPageGroup: /Page Group/i.test(body),
      hasBrowser: /\bBrowser\b/i.test(body),
      hasOS: /Operating System/i.test(body),
      hasReturnNew: /Return\/New|Returning|New Visitor/i.test(body),
      hasTimezone: /Timezone|Time Zone/i.test(body),
      hasBot: /Bot Traffic/i.test(body),
      hasOrigin: /Origin|Originated From/i.test(body),
      hasTrafficSegment: /Traffic Segment/i.test(body),
      hasChartBuilder: /Chart Builder/i.test(body),
      hasRunQuery: /Run Query/i.test(body),
      titleHit: CHART_NAME.test(body),
    };

    save({
      opened,
      chartViewer: chartSnap,
      chromeHints,
      screenshots: { live: shot, chart: shotChart, builder: shotBuilder },
    });

    const notes = [
      'CWV Top 10 Summary Onload — live reverse-engineering notes',
      '==============================================================================',
      `shellUrl=${page.url()}`,
      `shellTitle=${await page.title()}`,
      `wentCharts=${wentCharts} opened=${JSON.stringify(opened)}`,
      `chartBuilderOpened=${openedBuilder}`,
      `chromeHints=${JSON.stringify(chromeHints)}`,
      `headings=${((chartSnap as any).headings || []).slice(0, 40).join(' | ')}`,
      `buttons sample=${((chartSnap as any).buttons || []).slice(0, 60).join(' | ')}`,
      `labels sample=${((chartSnap as any).labels || []).slice(0, 80).join(' | ')}`,
      `charts visible=${((chartSnap as any).charts || []).length}`,
      `tables=${JSON.stringify(((chartSnap as any).tables || []).slice(0, 5))}`,
      `bodySample=${body.slice(0, 3500)}`,
      `builder bodySample=${String((builderSnap as any).bodySample || '').slice(0, 2500)}`,
      `screenshots: ${shot} | ${shotChart} | ${shotBuilder}`,
      `probe json: ${out}`,
      `savedAt=${new Date().toISOString()}`,
    ].join('\n');
    fs.writeFileSync(notesPath, notes);
    console.log(`[probe-cwv-top10-summary-onload] wrote ${out}`);
    console.log(`[probe-cwv-top10-summary-onload] notes ${notesPath}`);
    console.log(`[probe-cwv-top10-summary-onload] opened=${opened.found} builder=${openedBuilder}`);
  } catch (err) {
    console.error('[probe-cwv-top10-summary-onload] fatal:', err);
    save({ fatal: err instanceof Error ? err.message : String(err) });
    process.exitCode = 1;
  } finally {
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
}

main();
