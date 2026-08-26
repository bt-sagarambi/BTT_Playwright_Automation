/**
 * Live probe: Revenue Assurance dashboard
 * Run: npx tsx scripts/probe-revenue-assurance.ts
 * Uses string-based page.evaluate to avoid TSX __name injection into browser context.
 */
import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { ensurePortalSession } from '../helpers/portalSession';
import { SiteDropdownPage } from '../pages/SiteDropdownPage';
import { LeftNavPage } from '../pages/LeftNavPage';

const PAGE_DEF = {
  id: 'biz.revenue-assurance',
  module: 'biz',
  menuLabel: 'Revenue Assurance',
  route: 'revenue-assurance/dashboard',
  titleIncludes: /Revenue Assurance/i,
};

const outDir = path.join(process.cwd(), 'docs', 'prompts');
const out = path.join(outDir, 'revenue-assurance-live-probe.json');
const shot = path.join(outDir, 'revenue-assurance-live.png');
const notesPath = path.join(outDir, 'revenue-assurance-live-notes.txt');

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
      /assur|revenue|recommend|opportunit|status|show.?me|internal|review|progress|implement|declin|effort|platform|donut|hero|card|chart|filter|table|highchart|overview|action|history|detail|object|science|source|area|compact|relaxed|toggle|modal|popup|tab|kpi|metric|link|id/i.test(
        id
      )
    )
    .slice(0, 400);
  const select2 = Array.from(document.querySelectorAll('[id^="select2-"]'))
    .map((el) => ({
      id: el.id,
      text: txt(el).slice(0, 160),
      visible: !!el.getClientRects().length,
    }))
    .slice(0, 120);
  const uniqueButtons = Array.from(
    new Set(
      Array.from(document.querySelectorAll('button, a.btn, .btn, input[type="button"], input[type="submit"], a[href]'))
        .map((el) => txt(el) || el.getAttribute('value') || el.getAttribute('title') || '')
        .filter((t) => t && t.length > 0 && t.length < 120)
    )
  ).slice(0, 180);
  const labels = Array.from(
    new Set(
      Array.from(
        document.querySelectorAll(
          'label, .control-label, .filter-label, th, .ci-tab, [role="tab"], .nav-tabs a, h1, h2, h3, h4, .panel-title, .widget-title, .card-title, .stat-label, .kpi-label'
        )
      )
        .map((el) => txt(el))
        .filter((t) => t && t.length < 140)
    )
  ).slice(0, 200);
  const tabs = Array.from(
    document.querySelectorAll(
      '.ci-tab, [role="tab"], .nav-tabs a, .nav-tabs li, [id$="-toggle"], [id$="-tab"], .btt-tab, .page-tab, .btn-group .btn, .status-tab, .recommendation-tab'
    )
  )
    .map((el) => ({
      id: el.id || '',
      text: txt(el).slice(0, 120),
      cls: String(el.className || '').slice(0, 160),
      active: /active|selected|btn-primary/i.test(String(el.className || '')),
    }))
    .filter((t) => t.text)
    .slice(0, 100);
  const charts = Array.from(document.querySelectorAll('.highcharts-container, [data-highcharts-chart], canvas, svg.highcharts-root'))
    .map((el, i) => {
      const host = el.closest('[id]') || el.parentElement;
      const r = el.getBoundingClientRect();
      return {
        i,
        id: el.id || '',
        parentId: el.parentElement ? el.parentElement.id : '',
        hostId: host && host.id ? host.id : '',
        title: txt(el.querySelector('.highcharts-title, .highcharts-subtitle')) || '',
        legend: Array.from(el.querySelectorAll('.highcharts-legend-item, .highcharts-legend text'))
          .map((n) => txt(n))
          .filter(Boolean)
          .slice(0, 20),
        w: Math.round(r.width),
        h: Math.round(r.height),
      };
    })
    .slice(0, 40);
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
      sampleCells: Array.from(tb.querySelectorAll('tbody tr'))
        .slice(0, 3)
        .map((tr) =>
          Array.from(tr.querySelectorAll('td'))
            .map((td) => txt(td).slice(0, 80))
            .filter(Boolean)
            .slice(0, 10)
        ),
    }))
    .filter((t) => t.headers.length || t.id || t.rows)
    .slice(0, 40);
  const cards = Array.from(
    document.querySelectorAll(
      '[class*="opportunity"] [class*="card"], [class*="revenue"] [class*="card"], .card, [data-opportunity], [class*="opp-card"], [class*="recommendation-card"]'
    )
  )
    .map((el) => ({
      id: el.id || '',
      cls: String(el.className || '').slice(0, 160),
      text: txt(el).slice(0, 220),
      clickable: el.tagName === 'A' || el.tagName === 'BUTTON' || el.getAttribute('role') === 'button' || !!el.onclick,
      visible: !!el.getClientRects().length,
    }))
    .filter((c) => c.visible && c.text)
    .slice(0, 60);
  const showMe = Array.from(document.querySelectorAll('a, button, span, div'))
    .filter((el) => /show\\s*me/i.test(txt(el)))
    .map((el) => ({
      tag: el.tagName,
      id: el.id || '',
      cls: String(el.className || '').slice(0, 120),
      text: txt(el).slice(0, 80),
      href: el.getAttribute('href') || '',
    }))
    .slice(0, 40);
  const statusChips = Array.from(document.querySelectorAll('a, button, li, span, div, label'))
    .map((el) => txt(el))
    .filter((t) =>
      /^(new|in progress|implemented|declined|internal review|internal declined|all recommendations)/i.test(t) ||
      /internal review|in progress|implemented|declined|\\bnew\\b/i.test(t) && t.length < 60
    );
  const uniqueStatus = Array.from(new Set(statusChips)).slice(0, 40);
  const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,.page-header,.panel-heading,.section-title'))
    .map((el) => txt(el))
    .filter(Boolean)
    .slice(0, 50);
  const bodySample = txt(document.body).slice(0, 8000);
  const pageTitle = txt(document.querySelector('#page-title, .page-title, h1'));
  return {
    url: location.href,
    title: document.title,
    pageTitle,
    relevantIds,
    select2,
    uniqueButtons,
    labels,
    tabs,
    charts,
    tables,
    cards,
    showMe,
    uniqueStatus,
    headings,
    bodySample,
    highcharts: charts.length,
  };
})()`;

async function dismissOverlays(page: import('@playwright/test').Page) {
  await page
    .locator('.jconfirm.jconfirm-open button, .get-started button, .modal.in button')
    .filter({ hasText: /ok|close|got it|don't show|dismiss|continue|agree/i })
    .first()
    .click({ force: true })
    .catch(() => undefined);
  await page.keyboard.press('Escape').catch(() => undefined);
}

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
  await page.waitForTimeout(5000);
  await dismissOverlays(page);
  await page.waitForTimeout(2000);

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
      tabs: ((base as any).tabs || []).slice(0, 60),
      buttons: ((base as any).uniqueButtons || []).slice(0, 80),
      labels: ((base as any).labels || []).slice(0, 100),
      select2: ((base as any).select2 || []).slice(0, 50),
      charts: ((base as any).charts || []).slice(0, 30),
      tables: ((base as any).tables || []).slice(0, 20),
      cards: ((base as any).cards || []).slice(0, 40),
      showMe: ((base as any).showMe || []).slice(0, 30),
      uniqueStatus: ((base as any).uniqueStatus || []).slice(0, 40),
      relevantIds: ((base as any).relevantIds || []).slice(0, 200),
      bodySample: ((base as any).bodySample || '').slice(0, 6000),
    },
    screenshot: shot,
  });

  // Platform toggles soft
  const platformNotes: string[] = [];
  for (const label of [/All/i, /Browser/i, /iOS/i, /Android/i]) {
    const btn = page.getByRole('button', { name: label }).or(page.locator('a, button, .btn').filter({ hasText: label })).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click({ force: true }).catch(() => undefined);
      await page.waitForTimeout(2500);
      platformNotes.push(`clicked platform ~${String(label)}`);
    }
  }
  // Prefer restore All
  const allBtn = page.getByRole('button', { name: /^All$/i }).or(page.locator('a, button, .btn').filter({ hasText: /^All$/i })).first();
  if (await allBtn.isVisible().catch(() => false)) {
    await allBtn.click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(2000);
  }

  // Status / list Show Me soft
  const showMeBtn = page.locator('a, button, span').filter({ hasText: /^Show Me$/i }).first();
  let showMeOpened = false;
  if (await showMeBtn.isVisible().catch(() => false)) {
    await showMeBtn.click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(3000);
    showMeOpened = true;
  }

  // Internal Review soft click
  const internal = page.locator('a, button, li, span, div').filter({ hasText: /Internal Review/i }).first();
  if (await internal.isVisible().catch(() => false)) {
    await internal.click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(2500);
  }

  const afterShowMe = await page.evaluate(SNAPSHOT_JS);
  savePartial({
    platformNotes,
    showMeOpened,
    afterShowMe: {
      url: (afterShowMe as any).url,
      pageTitle: (afterShowMe as any).pageTitle,
      headings: ((afterShowMe as any).headings || []).slice(0, 30),
      tables: ((afterShowMe as any).tables || []).slice(0, 15),
      uniqueStatus: ((afterShowMe as any).uniqueStatus || []).slice(0, 30),
      showMe: ((afterShowMe as any).showMe || []).slice(0, 20),
      buttons: ((afterShowMe as any).uniqueButtons || []).slice(0, 60),
      bodySample: ((afterShowMe as any).bodySample || '').slice(0, 4500),
      relevantIds: ((afterShowMe as any).relevantIds || []).slice(0, 150),
    },
  });

  // Try open first recommendation / record row
  const firstRow = page.locator('table tbody tr, .recommendation-card, [class*="recommend"]').first();
  let detailSnap: Record<string, unknown> | null = null;
  if (await firstRow.isVisible().catch(() => false)) {
    await firstRow.click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(3000);
    // Overview / Action / History tabs
    for (const tabName of [/Overview/i, /Action/i, /History/i]) {
      const tab = page.getByRole('tab', { name: tabName }).or(page.locator('a, button, li, [role="tab"]').filter({ hasText: tabName })).first();
      if (await tab.isVisible().catch(() => false)) {
        await tab.click({ force: true }).catch(() => undefined);
        await page.waitForTimeout(1500);
      }
    }
    detailSnap = (await page.evaluate(SNAPSHOT_JS)) as any;
    savePartial({
      detail: {
        url: (detailSnap as any).url,
        pageTitle: (detailSnap as any).pageTitle,
        headings: ((detailSnap as any).headings || []).slice(0, 30),
        labels: ((detailSnap as any).labels || []).slice(0, 80),
        buttons: ((detailSnap as any).uniqueButtons || []).slice(0, 60),
        tables: ((detailSnap as any).tables || []).slice(0, 15),
        tabs: ((detailSnap as any).tabs || []).slice(0, 40),
        bodySample: ((detailSnap as any).bodySample || '').slice(0, 5000),
        relevantIds: ((detailSnap as any).relevantIds || []).slice(0, 150),
      },
    });

    // Data Science / Object Detail soft
    for (const name of [/Data Science/i, /Object Detail/i]) {
      const link = page.locator('a, button, span').filter({ hasText: name }).first();
      if (await link.isVisible().catch(() => false)) {
        await link.click({ force: true }).catch(() => undefined);
        await page.waitForTimeout(2500);
        const popup = await page.evaluate(SNAPSHOT_JS);
        savePartial({
          [`popup_${String(name).replace(/[^a-z]/gi, '')}`]: {
            headings: ((popup as any).headings || []).slice(0, 20),
            tables: ((popup as any).tables || []).slice(0, 10),
            buttons: ((popup as any).uniqueButtons || []).slice(0, 40),
            bodySample: ((popup as any).bodySample || '').slice(0, 2500),
          },
        });
        await page.keyboard.press('Escape').catch(() => undefined);
        await page
          .locator('.modal .close, .jconfirm-closeIcon, button')
          .filter({ hasText: /close|cancel|×/i })
          .first()
          .click({ force: true })
          .catch(() => undefined);
        await page.waitForTimeout(800);
      }
    }
  }

  // Opportunity card soft click
  const oppCard = page.locator('[class*="opportunity"] .card, [class*="opp"], .opportunity-card').filter({ hasText: /\$|K|M/ }).first();
  if (await oppCard.isVisible().catch(() => false)) {
    const beforeText = ((await oppCard.innerText().catch(() => '')) || '').slice(0, 200);
    await oppCard.click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(3000);
    const afterCard = await page.evaluate(SNAPSHOT_JS);
    savePartial({
      opportunityCardClick: {
        beforeText,
        url: (afterCard as any).url,
        headings: ((afterCard as any).headings || []).slice(0, 20),
        bodySample: ((afterCard as any).bodySample || '').slice(0, 3000),
        tables: ((afterCard as any).tables || []).slice(0, 10),
      },
    });
  }

  await page.screenshot({ path: path.join(outDir, 'revenue-assurance-live-detail.png'), fullPage: true }).catch(() => undefined);

  const notes = [
    'Revenue Assurance live probe notes',
    `URL: ${(base as any).url}`,
    `Title: ${(base as any).title}`,
    `Page title: ${(base as any).pageTitle}`,
    `Headings: ${(((base as any).headings || []) as string[]).slice(0, 15).join(' | ')}`,
    `Statuses: ${(((base as any).uniqueStatus || []) as string[]).join(' | ')}`,
    `Show Me count: ${(((base as any).showMe || []) as unknown[]).length}`,
    `Tables: ${(((base as any).tables || []) as unknown[]).length}`,
    `Cards: ${(((base as any).cards || []) as unknown[]).length}`,
    `Highcharts: ${(base as any).highcharts}`,
    `Platform notes: ${platformNotes.join('; ')}`,
    `ShowMeOpened: ${showMeOpened}`,
  ].join('\n');
  fs.writeFileSync(notesPath, notes);
  console.log(notes);
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
