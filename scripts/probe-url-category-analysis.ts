/**
 * Live probe: BI iframe — URL Category Analysis
 * Shell: business-intelligence/tool → #bi-iframe → jbi.bluetriangletech.com
 *
 * Run: npx tsx scripts/probe-url-category-analysis.ts
 */
import { chromium, Frame, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { ensurePortalSession, portalBase } from '../helpers/portalSession';
import { SiteDropdownPage } from '../pages/SiteDropdownPage';
import { LeftNavPage } from '../pages/LeftNavPage';

const outDir = path.join(process.cwd(), 'docs', 'prompts');
const out = path.join(outDir, 'url-category-analysis-live-probe.json');
const shot = path.join(outDir, 'url-category-analysis-live.png');
const shotDash = path.join(outDir, 'url-category-analysis-dashboard.png');
const notesPath = path.join(outDir, 'url-category-analysis-live-notes.txt');

const DASH_NAME = /URL Category Analysis/i;
const DASH_SEARCH = 'URL Category Analysis';

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
      /dashboard|widget|chart|graph|filter|lookback|period|compare|comparison|refresh|reset|save|export|table|metric|cwv|lcp|inp|cls|url|category|good|poor|needs|browser|device|bot|timezone|percentile|segment|origin|nav|menu|search|apply|cancel|delta|hamburger|download|png|pdf|ppt|powerpoint|gear|cog|visitor|operating|os|legend/i.test(
        id
      )
    )
    .slice(0, 500);
  const buttons = Array.from(
    new Set(
      Array.from(document.querySelectorAll('button, a.btn, .btn, [role="button"], a, [role="menuitem"]'))
        .map((el) => txt(el))
        .filter((t) => t && t.length > 0 && t.length < 140)
    )
  ).slice(0, 280);
  const labels = Array.from(
    new Set(
      Array.from(document.querySelectorAll('label, .control-label, th, h1, h2, h3, h4, [role="tab"], .filter-title, .widget-title, .MuiTypography-root, span'))
        .map((el) => txt(el))
        .filter((t) => t && t.length > 1 && t.length < 160)
    )
  ).slice(0, 350);
  const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,[role="heading"]'))
    .map((el) => txt(el))
    .filter((t) => t && t.length < 160)
    .slice(0, 120);
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
    .slice(0, 200);
  const tables = Array.from(document.querySelectorAll('table'))
    .map((t, i) => ({
      i,
      id: t.id || '',
      headers: Array.from(t.querySelectorAll('th')).map((th) => txt(th)).filter(Boolean).slice(0, 40),
      rows: t.querySelectorAll('tbody tr').length,
      visible: !!t.getClientRects().length,
    }))
    .slice(0, 30);
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
    .slice(0, 60);
  const legendItems = Array.from(
    document.querySelectorAll('.highcharts-legend-item, [class*="legend" i] text, [class*="legend" i] span, g.highcharts-legend *')
  )
    .map((el) => txt(el))
    .filter((t) => t && t.length > 0 && t.length < 80)
    .slice(0, 80);
  const gearIcons = Array.from(document.querySelectorAll('.fa-cog, .fa-gear, .glyphicon-cog, [class*="settings" i], [title*="settings" i], [aria-label*="settings" i], button, a'))
    .map((el) => ({
      aria: (el.getAttribute('aria-label') || '').slice(0, 80),
      title: (el.getAttribute('title') || '').slice(0, 80),
      cls: String(el.className || '').toString().slice(0, 100),
      text: txt(el).slice(0, 80),
      visible: !!el.getClientRects().length,
    }))
    .filter((x) => x.visible && /cog|gear|settings|metric|active/i.test([x.aria, x.title, x.cls, x.text].join(' ')))
    .slice(0, 40);
  const menuIcons = Array.from(document.querySelectorAll('[aria-label], button, a, svg, i, [class*="menu" i], [class*="export" i], [class*="download" i]'))
    .map((el) => ({
      aria: (el.getAttribute('aria-label') || '').slice(0, 80),
      title: (el.getAttribute('title') || '').slice(0, 80),
      cls: String(el.className || '').toString().slice(0, 100),
      text: txt(el).slice(0, 80),
      visible: !!el.getClientRects().length,
    }))
    .filter((x) => x.visible && /export|download|png|pdf|ppt|powerpoint|hamburger|menu|more|kebab|csv/i.test([x.aria, x.title, x.cls, x.text].join(' ')))
    .slice(0, 50);
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
    legendItems: Array.from(new Set(legendItems)),
    gearIcons,
    menuIcons,
    bodySample: txt(document.body).slice(0, 14000),
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
  if (!/business-intelligence\/tool|business-intelligence%2Ftool/i.test(page.url())) {
    await page.goto(
      `${portalBase()}/index.php?r=business-intelligence/tool&sid=305836`,
      { waitUntil: 'domcontentloaded', timeout: 90000 }
    );
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

async function goToDashboardsList(frame: Frame) {
  const clicked =
    (await clickNavInFrame(frame, /^Dashboards$/i)) || (await clickNavInFrame(frame, /Dashboards/i));
  await frame.waitForTimeout(2500);
  return clicked;
}

async function searchOpenDashboard(frame: Frame, page: Page) {
  const search = frame
    .locator(
      'input[placeholder*="Search" i], input[type="search"], input[aria-label*="Search" i], input[placeholder="Search..."]'
    )
    .first();
  if (await search.isVisible({ timeout: 10000 }).catch(() => false)) {
    await search.click({ force: true });
    await search.fill('');
    await search.fill(DASH_SEARCH);
    await frame.waitForTimeout(3000);
  }

  const clicked = await frame.evaluate(() => {
    const want = /URL Category Analysis/i;
    const nodes = Array.from(
      document.querySelectorAll('a, button, h1, h2, h3, h4, [role="heading"], [role="link"], div, span')
    );
    const scored: { el: Element; t: string; score: number }[] = [];
    for (const el of nodes) {
      const t = ((el as HTMLElement).innerText || (el as HTMLElement).textContent || '').replace(/\s+/g, ' ').trim();
      if (!want.test(t)) continue;
      const score = t.length < 80 ? 3 : t.length < 160 ? 2 : 1;
      scored.push({ el, t, score });
    }
    scored.sort((a, b) => b.score - a.score || a.t.length - b.t.length);
    const hit = scored[0];
    if (!hit) return { ok: false, text: '' };
    (hit.el as HTMLElement).scrollIntoView({ block: 'center' });
    (hit.el as HTMLElement).click();
    return { ok: true, text: hit.t.slice(0, 160) };
  });

  if (clicked?.ok) {
    await page.waitForTimeout(15000);
    return { found: true, how: 'dom-click', text: clicked.text };
  }

  const card = frame.locator('a, h2, h3, h4, [role="heading"], button, div').filter({ hasText: DASH_NAME }).first();
  if (await card.isVisible({ timeout: 8000 }).catch(() => false)) {
    const text = ((await card.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim().slice(0, 160);
    await card.scrollIntoViewIfNeeded().catch(() => undefined);
    await card.click({ force: true });
    await page.waitForTimeout(15000);
    return { found: true, how: 'locator-click', text };
  }

  const body = await frame.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 3000));
  return { found: DASH_NAME.test(body), how: 'body-scan', text: body.match(DASH_NAME)?.[0] || '', bodySample: body };
}

async function bestDashboardFrame(page: Page, fallback: Frame): Promise<Frame> {
  let best = fallback;
  let bestScore = -1;
  for (const f of page.frames()) {
    const sample = await f
      .evaluate(() => (document.body?.innerText || '').replace(/\s+/g, ' ').slice(0, 8000))
      .catch(() => '');
    if (!DASH_NAME.test(sample) && !/Performance Category|URL Volume|Good|Needs Improvement|Poor/i.test(sample)) continue;
    let score = 0;
    if (/Save As|Refresh Data|Reset to Default/i.test(sample)) score += 5;
    if (/Lookback Period|Time Period|End [Dd]ate|Filters/i.test(sample)) score += 3;
    if (/Good|Needs Improvement|Poor|URL/i.test(sample)) score += 2;
    if (!/Create Dashboard/i.test(sample)) score += 2;
    if (/9 widgets/i.test(sample) && /Create Dashboard/i.test(sample)) score -= 3;
    if (score > bestScore) {
      bestScore = score;
      best = f;
    }
  }
  return best;
}

async function softOpenExportMenu(frame: Frame, page: Page, scope?: 'dashboard' | 'widget') {
  const candidates =
    scope === 'widget'
      ? [
          frame.locator('[title="Export chart"], [title*="Export" i]').first(),
          frame.locator('button, [role="button"]').filter({ hasText: /Export|Download/i }).first(),
        ]
      : [
          frame.locator('button, [role="button"], a').filter({ hasText: /Export|Download|PNG|PDF|PowerPoint/i }).first(),
          frame.locator('[aria-label*="export" i], [title*="export" i], [aria-label*="more" i], [title*="more" i]').first(),
          frame.locator('[class*="hamburger" i], [class*="more-vert" i], [data-testid*="export" i]').first(),
        ];
  for (const c of candidates) {
    if (await c.isVisible().catch(() => false)) {
      await c.click({ force: true }).catch(() => undefined);
      await page.waitForTimeout(1000);
      const body = await frame.evaluate(() => (document.body?.innerText || '').replace(/\s+/g, ' ').slice(0, 3000));
      if (/PNG|PDF|PowerPoint|PPT|CSV/i.test(body)) {
        return { opened: true, bodySample: body.slice(0, 2000) };
      }
      await page.keyboard.press('Escape').catch(() => undefined);
    }
  }
  return { opened: false, bodySample: '' };
}

async function softClickLegendBands(frame: Frame, page: Page) {
  const results: { label: string; clicked: boolean }[] = [];
  for (const label of ['Good', 'Needs Improvement', 'Poor']) {
    const el = frame.locator('.highcharts-legend-item, [class*="legend" i], text, span, button, a').filter({ hasText: new RegExp(`^${label}$`, 'i') }).first();
    const visible = await el.isVisible().catch(() => false);
    if (visible) {
      await el.click({ force: true }).catch(() => undefined);
      await page.waitForTimeout(800);
      results.push({ label, clicked: true });
      await el.click({ force: true }).catch(() => undefined);
      await page.waitForTimeout(400);
    } else {
      results.push({ label, clicked: false });
    }
  }
  return results;
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

    const frame = await waitForBiFrame(page);
    const homeSnap = await frame.evaluate(SNAPSHOT_JS);
    save({ shellUrl: page.url(), shellTitle: await page.title(), biHome: homeSnap });
    await page.screenshot({ path: shot, fullPage: true }).catch(() => undefined);

    const wentDash = await goToDashboardsList(frame);
    await frame.waitForTimeout(2500);
    const listSnap = await frame.evaluate(SNAPSHOT_JS);
    save({ wentDashboards: wentDash, dashboardsList: listSnap });

    const opened = await searchOpenDashboard(frame, page);
    let frame2 = (await (await page.$('#bi-iframe'))?.contentFrame()) || frame;
    frame2 = await bestDashboardFrame(page, frame2);
    for (let i = 0; i < 25; i++) {
      const sample = await frame2
        .evaluate(() => (document.body?.innerText || '').replace(/\s+/g, ' ').slice(0, 4000))
        .catch(() => '');
      const inViewer =
        /Save As|Refresh Data|Reset to Default/i.test(sample) ||
        (/Lookback Period|Time Period|End [Dd]ate|Filters/i.test(sample) &&
          !/Create Dashboard[\s\S]{0,80}All Folders/i.test(sample));
      if (inViewer) break;
      await page.waitForTimeout(1500);
      frame2 = await bestDashboardFrame(page, frame2);
    }

    await frame2
      .locator('button, a, [role="button"]')
      .filter({ hasText: /^Filters$/i })
      .first()
      .click({ force: true })
      .catch(() => undefined);
    await page.waitForTimeout(1500);

    const exportProbeDashboard = await softOpenExportMenu(frame2, page, 'dashboard');
    await page.keyboard.press('Escape').catch(() => undefined);
    const exportProbeWidget = await softOpenExportMenu(frame2, page, 'widget');
    await page.keyboard.press('Escape').catch(() => undefined);
    const legendProbe = await softClickLegendBands(frame2, page);

    const dashSnap = await frame2.evaluate(SNAPSHOT_JS);
    await page.screenshot({ path: shotDash, fullPage: true }).catch(() => undefined);

    const body = String((dashSnap as Record<string, unknown>).bodySample || '');
    const chromeHints = {
      stillOnList: /Create Dashboard/i.test(body) && /All Folders/i.test(body) && /9 widgets/i.test(body),
      hasLookbackPeriod: /Lookback Period/i.test(body),
      hasTimePeriod: /Time Period/i.test(body),
      hasEndDate: /End [Dd]ate/i.test(body),
      hasSaveAs: /Save As/i.test(body),
      hasRefreshData: /Refresh Data/i.test(body),
      hasResetToDefault: /Reset to Defaults?/i.test(body),
      hasApply: /\bApply\b/i.test(body),
      hasGood: /\bGood\b/i.test(body),
      hasNeedsImprovement: /Needs Improvement/i.test(body),
      hasPoor: /\bPoor\b/i.test(body),
      hasUrlPerformanceCategory: /URL Performance Category|Performance Category/i.test(body),
      hasDailyDistribution: /Daily Distribution/i.test(body),
      hasPerformanceCategoryByUrl: /Performance Category by URL|Category by URL/i.test(body),
      hasBrowser: /\bBrowser\b/i.test(body),
      hasOperatingSystem: /Operating System|\bOS\b/i.test(body),
      hasReturnNewVisitor: /Return\/New Visitor|Return\/New User|New Visitor|Returning/i.test(body),
      hasPercentile: /Percentile|p75|0\.75/i.test(body),
      hasBotTraffic: /Bot Traffic/i.test(body),
      hasDevice: /\bDevice\b/i.test(body),
      hasOriginatedFrom: /Originated [Ff]rom|\bOrigin\b/i.test(body),
      hasPageName: /Page [Nn]ame/i.test(body),
      hasTrafficSegment: /Traffic Segment/i.test(body),
      hasTimezone: /Timezone|Time zone|Time Zone/i.test(body),
      hasExportPng: /PNG/i.test(body) || /PNG/i.test(String(exportProbeDashboard.bodySample || '')),
      hasExportPdf: /PDF/i.test(body) || /PDF/i.test(String(exportProbeDashboard.bodySample || '')),
      hasExportPpt: /PowerPoint|PPT/i.test(body) || /PowerPoint|PPT/i.test(String(exportProbeDashboard.bodySample || '')),
      hasExportCsv: /CSV/i.test(body) || /CSV/i.test(String(exportProbeWidget.bodySample || '')),
      chartCount: ((dashSnap as Record<string, unknown>).charts as unknown[])?.length || 0,
      tableCount: ((dashSnap as Record<string, unknown>).tables as unknown[])?.length || 0,
      gearCount: ((dashSnap as Record<string, unknown>).gearIcons as unknown[])?.length || 0,
      legendItems: (dashSnap as Record<string, unknown>).legendItems || [],
    };

    save({
      opened,
      dashboard: dashSnap,
      chromeHints,
      exportProbeDashboard,
      exportProbeWidget,
      legendProbe,
    });

    const notes = [
      `shell=${page.url()}`,
      `opened=${opened.found} how=${opened.how} text=${opened.text}`,
      `chromeHints=${JSON.stringify(chromeHints)}`,
      `exportDashboard=${JSON.stringify(exportProbeDashboard).slice(0, 600)}`,
      `exportWidget=${JSON.stringify(exportProbeWidget).slice(0, 600)}`,
      `legendProbe=${JSON.stringify(legendProbe)}`,
      `bodyHead=${body.slice(0, 2500)}`,
    ].join('\n');
    fs.writeFileSync(notesPath, notes);
    console.log(notes);
  } finally {
    await browser.close();
  }
}

void main();
