/**
 * Live probe: Bottom of the Sales Funnel Analysis
 * Run: npx tsx scripts/probe-bottom-sales-funnel.ts
 * Uses string-based page.evaluate to avoid TSX __name injection into browser context.
 */
import { chromium, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { ensurePortalSession } from '../helpers/portalSession';
import { SiteDropdownPage } from '../pages/SiteDropdownPage';
import { LeftNavPage } from '../pages/LeftNavPage';

const PAGE_DEF = {
  id: 'mkt.bottom-funnel',
  module: 'mkt',
  menuLabel: 'Bottom of the Sales Funnel Analysis',
  route: 'marketing-insights/bottom-sales-funnel',
  hrefIncludes: ['bottom-sales-funnel'],
  titleIncludes: /Sales Funnel|Bottom|Funnel/i,
};

const outDir = path.join(process.cwd(), 'docs', 'prompts');
const out = path.join(outDir, 'bottom-sales-funnel-live-probe.json');

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
  const funnelish = allIds
    .filter((id) =>
      /funnel|step|path|config|chart|metric|filter|compare|conversion|graph|toggle|view|bot|device|campaign|page|table|highchart|export|sales|widget|select|period|timezone|visitor|os|browser|country/i.test(
        id
      )
    )
    .slice(0, 250);
  const select2 = Array.from(document.querySelectorAll('[id^="select2-"]'))
    .map((el) => ({
      id: el.id,
      text: txt(el).slice(0, 140),
      visible: !!el.getClientRects().length,
    }))
    .slice(0, 80);
  const uniqueButtons = Array.from(
    new Set(
      Array.from(document.querySelectorAll('button, a.btn, .btn'))
        .map((el) => txt(el))
        .filter((t) => t && t.length > 0 && t.length < 90)
    )
  ).slice(0, 100);
  const labels = Array.from(
    new Set(
      Array.from(document.querySelectorAll('label, .control-label, .filter-label, th, .ci-tab, [role="tab"]'))
        .map((el) => txt(el))
        .filter((t) => t && t.length < 110)
    )
  ).slice(0, 100);
  const tabs = Array.from(
    document.querySelectorAll(
      '.ci-tab, [role="tab"], .nav-tabs a, .nav-tabs li, [id$="-toggle"], [id$="-tab"], .btt-tab, .page-tab'
    )
  )
    .map((el) => ({
      id: el.id || '',
      text: txt(el).slice(0, 100),
      cls: String(el.className || '').slice(0, 120),
      active: /active|selected/i.test(String(el.className || '')),
    }))
    .filter((t) => t.text)
    .slice(0, 50);
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
        w: Math.round(r.width),
        h: Math.round(r.height),
      };
    }
  );
  const tables = Array.from(document.querySelectorAll('table'))
    .map((tb) => ({
      id: tb.id || '',
      className: String(tb.className || '').slice(0, 100),
      headers: Array.from(tb.querySelectorAll('thead th, tr th'))
        .map((th) => txt(th))
        .filter(Boolean)
        .slice(0, 25),
      rows: tb.querySelectorAll('tbody tr').length,
      visible: !!tb.getClientRects().length,
    }))
    .filter((t) => t.headers.length || t.id)
    .slice(0, 25);
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
    'statistical-method-view',
    'page-type-view',
    'custom-vars-view',
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) badges[id] = txt(el);
  });
  const chipText = Array.from(
    document.querySelectorAll('[id$="-view"], .filter-badge, .quick-filter, .qf-item')
  )
    .map((el) => (el.id || el.className) + ': ' + txt(el).slice(0, 120))
    .filter((t) => t.length > 3)
    .slice(0, 40);
  const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,.panel-title,.box-title,.section-title'))
    .map((el) => txt(el))
    .filter(Boolean)
    .slice(0, 50);
  const bodySnippet = txt(document.body).slice(0, 2000);
  const links = Array.from(document.querySelectorAll('a'))
    .map((el) => ({
      text: txt(el).slice(0, 80),
      href: (el.getAttribute('href') || '').slice(0, 160),
    }))
    .filter((x) => /funnel|config|path|comparison|export|help|training/i.test(x.text + x.href))
    .slice(0, 40);
  return {
    url: location.href,
    title: document.title,
    pageTitle: txt(document.getElementById('page-title')),
    funnelishIds: funnelish,
    allIdCount: allIds.length,
    select2,
    uniqueButtons,
    labels,
    tabs,
    charts,
    highcharts: charts.length,
    tables,
    badges,
    chipText,
    headings,
    bodySnippet,
    links,
  };
})()`;

async function dismiss(page: Page) {
  for (let i = 0; i < 6; i++) {
    const btn = page
      .locator('button, a, .jconfirm-buttons button, .jconfirm-closeIcon, [data-dismiss="modal"]')
      .filter({
        hasText: /ok|close|yes|got it|continue|dismiss|agree|don't show|dont show|get started|skip/i,
      })
      .first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click({ force: true, timeout: 2500 }).catch(() => undefined);
      await page.waitForTimeout(400);
      continue;
    }
    if (
      !(await page
        .locator('.jconfirm.jconfirm-open, .modal.in, .introjs-overlay')
        .first()
        .isVisible()
        .catch(() => false))
    )
      break;
    await page.keyboard.press('Escape').catch(() => undefined);
    await page.waitForTimeout(300);
  }
}

async function main() {
  savePartial({
    probedAt: new Date().toISOString(),
    pageDef: {
      id: PAGE_DEF.id,
      module: PAGE_DEF.module,
      menuLabel: PAGE_DEF.menuLabel,
      route: PAGE_DEF.route,
    },
    videoWalkthroughScenarios: [
      '1 Navigation: BI Improve Traffic / Marketing Insights > Bottom of the Sales Funnel Analysis',
      '2 Purpose: identify friction in bottom of sales funnel (checkout path)',
      '3 Create/find Bottom of Funnel Path configuration (Funnel Configuration / Other section / search)',
      '4 Build path: name steps; map page groups / page names',
      '5 Always include Order/Purchase Confirmation; max ~8 steps',
      '6 Select configured path on analysis page (e.g. Typical checkout process)',
      '7 Step-to-step conversion rates + friction identification',
      '8 Total / Bottom Funnel Conversion KPI',
      '9 Comparisons (time periods, new vs returning visitors) + filter options — soft depth',
    ],
    pdfNotes: {
      source: 'Bottom of the Sales Funnel Widget - Blue Triangle Help Center.pdf',
      article:
        'https://help.bluetriangle.com/hc/en-us/articles/360037345713-Bottom-of-the-Sales-Funnel-Widget',
      focus:
        'Widget-centric DOC; same step-by-step conversion graph and Bottom Funnel Conversion KPI as Analysis page; requires a Sales Funnel Path from Funnel Configuration',
    },
  });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: path.join(process.cwd(), 'playwright/.auth/user.json'),
  });
  const page = await context.newPage();
  page.setDefaultTimeout(90000);

  try {
    await ensurePortalSession(page);
    await new SiteDropdownPage(page).ensureProfileSite();
  } catch (e) {
    savePartial({ sessionNote: String(e).slice(0, 300) });
    await ensurePortalSession(page).catch(() => undefined);
    await new SiteDropdownPage(page).ensureProfileSite().catch(() => undefined);
  }

  let openedVia = 'menu';
  try {
    await new LeftNavPage(page).openSmokePage(PAGE_DEF);
  } catch (e) {
    openedVia = 'direct-url';
    savePartial({ menuOpenError: String(e).slice(0, 300) });
    const cur = page.url();
    const root = cur.includes('/btportal/web/index.php')
      ? cur.split('/btportal/web/index.php')[0] + '/btportal/web/index.php'
      : cur;
    await page.goto(`${root}?r=marketing-insights/bottom-sales-funnel`, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });
  }

  await page.waitForSelector('#page-title, body', { timeout: 90000 }).catch(() => undefined);
  await page.waitForTimeout(12000);
  await dismiss(page);
  savePartial({ openedVia, urlAfterOpen: page.url(), titleAfterOpen: await page.title() });

  const base = await page.evaluate(SNAPSHOT_JS);
  savePartial({ base });
  console.log(
    'BASE',
    JSON.stringify(
      {
        url: (base as any).url,
        title: (base as any).title,
        pageTitle: (base as any).pageTitle,
        charts: (base as any).highcharts,
        select2: ((base as any).select2 || []).slice(0, 15),
        tabs: (base as any).tabs,
        headings: ((base as any).headings || []).slice(0, 15),
        badges: (base as any).badges,
        buttons: ((base as any).uniqueButtons || []).slice(0, 25),
      },
      null,
      2
    )
  );

  await page
    .locator('#toggle-filters, #mobile-controls-filters-btn')
    .first()
    .click({ force: true, timeout: 8000 })
    .catch(() => undefined);
  await page.waitForTimeout(2000);
  const filtersOpen = await page.evaluate(SNAPSHOT_JS);
  savePartial({ filtersOpen: { select2: (filtersOpen as any).select2, labels: (filtersOpen as any).labels, badges: (filtersOpen as any).badges } });
  await page.keyboard.press('Escape').catch(() => undefined);
  await page.locator('#cancel-filters').click({ force: true, timeout: 3000 }).catch(() => undefined);

  // Sample select2 options
  const select2Samples: any[] = [];
  for (const entry of ((base as any).select2 || []).slice(0, 10) as any[]) {
    if (!entry.visible) continue;
    try {
      await page.locator(`#${CSS.escape(entry.id)}`).click({ force: true, timeout: 3000 });
      await page.waitForTimeout(700);
      const opts = await page.evaluate(`(() => Array.from(document.querySelectorAll('.select2-results__option, .select2-results__message')).map(el => (el.textContent||'').replace(/\\s+/g,' ').trim()).filter(Boolean).slice(0,25))()`);
      select2Samples.push({ id: entry.id, current: entry.text, optionsSample: opts });
      await page.keyboard.press('Escape').catch(() => undefined);
      await page.waitForTimeout(250);
    } catch (e) {
      select2Samples.push({ id: entry.id, error: String(e).slice(0, 100) });
    }
  }
  savePartial({ select2Samples });

  // Soft-click Add Comparison if present
  const addComp = page.locator('button, a, .btn').filter({ hasText: /Add Comparison/i }).first();
  let comparisonOpen = false;
  if (await addComp.isVisible().catch(() => false)) {
    await addComp.click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(1500);
    comparisonOpen = true;
    const after = await page.evaluate(SNAPSHOT_JS);
    savePartial({
      comparisonSoft: {
        opened: true,
        headings: (after as any).headings,
        uniqueButtons: ((after as any).uniqueButtons || []).slice(0, 30),
      },
    });
    await page.keyboard.press('Escape').catch(() => undefined);
    await page.locator('button, a').filter({ hasText: /cancel|close|×/i }).first().click({ force: true }).catch(() => undefined);
  }
  savePartial({ comparisonOpen });

  // Soft sample path config link if present without saving
  const configLinks = await page.evaluate(`(() => {
    const txt = (el) => ((el && (el.innerText || el.textContent)) || '').replace(/\\s+/g, ' ').trim();
    return Array.from(document.querySelectorAll('a, button, .btn'))
      .map((el) => ({ text: txt(el).slice(0, 80), href: (el.getAttribute('href') || '').slice(0, 160) }))
      .filter((x) => /config|path|funnel configuration|manage path|create path|edit/i.test(x.text + ' ' + x.href))
      .slice(0, 25);
  })()`);
  savePartial({ configLinks });

  console.log('Wrote', out);
  await browser.close();
}

main().catch((e) => {
  savePartial({ fatal: String(e).slice(0, 800) });
  console.error(e);
  process.exit(1);
});
