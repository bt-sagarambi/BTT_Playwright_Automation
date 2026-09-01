/**
 * Live probe v2: BI iframe — CWV Top 10 Period over Period (PoP)
 * Shell: business-intelligence/tool → #bi-iframe → jbi.bluetriangletech.com
 *
 * Run: npx tsx scripts/probe-cwv-top10-pop.ts
 */
import { chromium, Frame, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { ensurePortalSession, portalBase } from '../helpers/portalSession';
import { SiteDropdownPage } from '../pages/SiteDropdownPage';
import { LeftNavPage } from '../pages/LeftNavPage';

const outDir = path.join(process.cwd(), 'docs', 'prompts');
const out = path.join(outDir, 'cwv-top10-pop-live-probe.json');
const shot = path.join(outDir, 'cwv-top10-pop-live.png');
const shotDash = path.join(outDir, 'cwv-top10-pop-dashboard.png');
const notesPath = path.join(outDir, 'cwv-top10-pop-live-notes.txt');

const DASH_NAME = /CWV Top 10 Period over Period \(PoP\)/i;
const DASH_SEARCH = 'CWV Top 10 Period over Period';

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
      /dashboard|widget|chart|graph|filter|lookback|period|compare|refresh|reset|save|export|table|metric|cwv|lcp|inp|cls|onload|page|browser|device|bot|timezone|percentile|segment|origin|nav|menu|search|apply|cancel|month|delta/i.test(
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
  ).slice(0, 220);
  const labels = Array.from(
    new Set(
      Array.from(document.querySelectorAll('label, .control-label, th, h1, h2, h3, h4, [role="tab"], .filter-title, .widget-title, .MuiTypography-root, span'))
        .map((el) => txt(el))
        .filter((t) => t && t.length > 1 && t.length < 160)
    )
  ).slice(0, 250);
  const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,[role="heading"]'))
    .map((el) => txt(el))
    .filter((t) => t && t.length < 160)
    .slice(0, 80);
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
    .slice(0, 150);
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
    bodySample: txt(document.body).slice(0, 6000),
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
  // Wait for BI app to paint
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
  // Try left nav / top nav "Dashboards"
  const clicked =
    (await clickNavInFrame(frame, /^Dashboards$/i)) ||
    (await clickNavInFrame(frame, /Dashboards/i));
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

  // Title text often concatenates with type badge: "...(PoP)Grid" — match CWV Top 10 PoP, exclude Native App
  const clicked = await frame.evaluate(() => {
    const want = /CWV Top 10 Period over Period \(PoP\)/i;
    const skip = /Native App/i;
    const nodes = Array.from(
      document.querySelectorAll('a, button, h1, h2, h3, h4, [role="heading"], [role="link"], div, span')
    ) as HTMLElement[];
    const scored = nodes
      .map((el) => {
        const t = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
        if (!want.test(t) || skip.test(t)) return null;
        // Prefer short title nodes over whole-card blobs
        const score = t.length < 80 ? 3 : t.length < 160 ? 2 : 1;
        return { el, t, score };
      })
      .filter(Boolean) as { el: HTMLElement; t: string; score: number }[];
    scored.sort((a, b) => b.score - a.score || a.t.length - b.t.length);
    const hit = scored[0];
    if (!hit) return { ok: false, text: '' };
    hit.el.scrollIntoView({ block: 'center' });
    hit.el.click();
    return { ok: true, text: hit.t.slice(0, 120) };
  });

  if (clicked?.ok) {
    await page.waitForTimeout(12000);
    return { found: true, how: 'dom-click', text: clicked.text };
  }

  // Playwright fallback: visible node containing PoP title (not Native App)
  const card = frame
    .locator('a, h2, h3, h4, [role="heading"], button, div')
    .filter({ hasText: DASH_NAME })
    .filter({ hasNotText: /Native App/i })
    .first();
  if (await card.isVisible({ timeout: 8000 }).catch(() => false)) {
    const text = ((await card.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim().slice(0, 120);
    await card.scrollIntoViewIfNeeded().catch(() => undefined);
    await card.click({ force: true });
    await page.waitForTimeout(12000);
    return { found: true, how: 'locator-click', text };
  }

  const body = await frame.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 3000));
  return { found: DASH_NAME.test(body), how: 'body-scan', text: body.match(DASH_NAME)?.[0] || '', bodySample: body };
}

/** Prefer the frame that actually shows the opened dashboard (nested iframes possible). */
async function bestDashboardFrame(page: Page, fallback: Frame): Promise<Frame> {
  const frames = page.frames().filter((f) => /jbi\.bluetriangletech|bi-iframe|about:blank/i.test(f.url()) || f === fallback);
  let best = fallback;
  let bestScore = -1;
  for (const f of [fallback, ...page.frames()]) {
    const sample = await f
      .evaluate(() => (document.body?.innerText || '').replace(/\s+/g, ' ').slice(0, 4000))
      .catch(() => '');
    if (!/CWV Top 10 Period over Period \(PoP\)/i.test(sample)) continue;
    let score = 0;
    if (/Save As|Refresh Data|Reset to Default/i.test(sample)) score += 5;
    if (/Lookback Period/i.test(sample)) score += 3;
    if (/\bLCP\b/i.test(sample) && /\bINP\b/i.test(sample)) score += 2;
    if (!/Create Dashboard/i.test(sample)) score += 2;
    if (/13 widgets/i.test(sample) && /Create Dashboard/i.test(sample)) score -= 3; // still on list
    if (score > bestScore) {
      bestScore = score;
      best = f;
    }
  }
  void frames;
  return best;
}

async function main() {
  const browser = await chromium.launch({ headless: false });
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
    save({
      shellUrl: page.url(),
      shellTitle: await page.title(),
      biHome: homeSnap,
    });
    await page.screenshot({ path: shot, fullPage: true }).catch(() => undefined);

    const wentDash = await goToDashboardsList(frame);
    await frame.waitForTimeout(2500);
    const listSnap = await frame.evaluate(SNAPSHOT_JS);
    save({ wentDashboards: wentDash, dashboardsList: listSnap });

    const opened = await searchOpenDashboard(frame, page);
    // Re-acquire frame (SPA may remount / nested frames)
    let frame2 = (await (await page.$('#bi-iframe'))?.contentFrame()) || frame;
    frame2 = await bestDashboardFrame(page, frame2);
    // Wait for viewer settle (list chrome should recede)
    for (let i = 0; i < 20; i++) {
      const sample = await frame2
        .evaluate(() => (document.body?.innerText || '').replace(/\s+/g, ' ').slice(0, 2500))
        .catch(() => '');
      const inViewer =
        /Save As|Refresh Data|Reset to Default|Comparison Method|Comparison Period/i.test(sample) ||
        (/Lookback Period/i.test(sample) && !/Create Dashboard[\s\S]{0,80}All Folders/i.test(sample));
      if (inViewer) break;
      await page.waitForTimeout(1500);
      frame2 = await bestDashboardFrame(page, frame2);
    }
    // Soft: open Filters panel to surface Lookback / filter inventory
    await frame2
      .locator('button, a, [role="button"]')
      .filter({ hasText: /^Filters$/i })
      .first()
      .click({ force: true })
      .catch(() => undefined);
    await page.waitForTimeout(1500);
    const dashSnap = await frame2.evaluate(SNAPSHOT_JS);
    await page.screenshot({ path: shotDash, fullPage: true }).catch(() => undefined);

    const body = String((dashSnap as any).bodySample || '');
    const chromeHints = {
      stillOnList: /Create Dashboard/i.test(body) && /All Folders/i.test(body) && /13 widgets/i.test(body),
      hasLookbackPeriod: /Lookback Period/i.test(body),
      hasComparisonPeriod: /Comparison Period|Comparison Method/i.test(body),
      hasEndDate: /End [Dd]ate/i.test(body),
      hasSaveAs: /Save As/i.test(body),
      hasRefreshData: /Refresh Data/i.test(body),
      hasResetToDefault: /Reset to Default/i.test(body),
      hasApply: /\bApply\b/i.test(body),
      hasLcp: /\bLCP\b/i.test(body),
      hasInp: /\bINP\b/i.test(body),
      hasCls: /\bCLS\b/i.test(body),
      hasPageViews: /Page Views?/i.test(body),
      hasPageLoad: /Page Load|Onload/i.test(body),
      hasDelta: /Delta|Improvement >|Degradation >/i.test(body),
      hasGoodNeedsPoor: /Needs improvement|Poor|\bGood\b/i.test(body),
      hasBrowser: /\bBrowser\b/i.test(body),
      hasDevice: /\bDevice\b/i.test(body),
      hasBotTraffic: /Bot Traffic/i.test(body),
      hasPercentile: /Percentile/i.test(body),
      hasTimezone: /Timezone|Time zone/i.test(body),
      hasPageName: /Page [Nn]ame/i.test(body),
      frameUrl: frame2.url(),
    };

    save({
      opened,
      dashboard: dashSnap,
      chromeHints,
      screenshots: {
        biHome: path.relative(process.cwd(), shot),
        dashboard: path.relative(process.cwd(), shotDash),
      },
    });

    const notes = [
      `CWV Top 10 PoP live probe ${new Date().toISOString()}`,
      `shell=${page.url()}`,
      `wentDashboards=${wentDash}`,
      `opened=${JSON.stringify(opened)}`,
      `dashUrl=${(dashSnap as any).url}`,
      `chromeHints=${JSON.stringify(chromeHints, null, 2)}`,
      `buttons=${((dashSnap as any).buttons || []).slice(0, 80).join(' | ')}`,
      `headings=${((dashSnap as any).headings || []).slice(0, 40).join(' | ')}`,
      `labels sample=${((dashSnap as any).labels || []).filter((t: string) => /lookback|compar|save|refresh|reset|lcp|inp|cls|page|apply|filter|month|device|browser|bot|delta|period/i.test(t)).slice(0, 80).join(' | ')}`,
      `tables=${JSON.stringify((dashSnap as any).tables || [])}`,
      `inputs=${JSON.stringify(((dashSnap as any).inputs || []).slice(0, 40))}`,
      `body=${body.slice(0, 2500)}`,
    ].join('\n');
    fs.writeFileSync(notesPath, notes);
    console.log(notes);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
