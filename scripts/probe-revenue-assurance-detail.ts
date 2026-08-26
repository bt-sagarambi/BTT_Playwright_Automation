/**
 * Deep probe: Revenue Assurance recommendation detail / Show Me / status lists
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

const out = path.join(process.cwd(), 'docs', 'prompts', 'revenue-assurance-detail-probe.json');

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
  await page.keyboard.press('Escape').catch(() => undefined);

  const detail: Record<string, unknown> = {};

  // Prefer Internal Review Show Me via status button id
  const irBtn = page.locator('#internal-review-records-btn, button.internal-review-records-btn, [id*="internal-review"]').first();
  if (await irBtn.isVisible().catch(() => false)) {
    await irBtn.click({ force: true });
    detail.clicked = 'internal-review-records-btn';
  } else {
    // Click Show Me near Internal Review text
    const showMes = page.locator('button.show-me-btn, a.show-me-btn, button:has-text("Show Me"), a:has-text("Show Me")');
    const n = await showMes.count();
    for (let i = 0; i < n; i++) {
      const ctx = await showMes
        .nth(i)
        .evaluate((el) => {
          const p = el.closest('.chart-container, .status-item, li, div, tr, section') as HTMLElement | null;
          return (p?.innerText || '').replace(/\s+/g, ' ').slice(0, 160);
        })
        .catch(() => '');
      if (/Internal Review/i.test(ctx)) {
        await showMes.nth(i).click({ force: true });
        detail.clicked = `show-me near: ${ctx}`;
        break;
      }
    }
  }
  await page.waitForTimeout(4000);

  // Scroll recommendations table into view / open All Recommendations
  const allRec = page.locator('text=/All Recommendations/i').first();
  if (await allRec.isVisible().catch(() => false)) {
    await allRec.click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(1500);
  }

  const table = page.locator('#revenueAssuranceTable');
  await table.scrollIntoViewIfNeeded().catch(() => undefined);
  detail.tableVisible = await table.isVisible().catch(() => false);
  detail.rowCount = await table.locator('tbody tr').count().catch(() => 0);
  detail.statusFilter = await page.locator('#statusFilter').inputValue().catch(() => '');
  detail.tableSearch = await page.locator('#table-search-revenueAssuranceTable').inputValue().catch(() => '');

  // Click first Internal Review row if possible, else first row
  let row = table.locator('tbody tr').filter({ hasText: /Internal Review/i }).first();
  if (!(await row.isVisible().catch(() => false))) {
    row = table.locator('tbody tr').first();
  }
  if (await row.isVisible().catch(() => false)) {
    const rowText = ((await row.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim().slice(0, 200);
    detail.rowText = rowText;
    await row.click({ force: true });
    await page.waitForTimeout(4000);
  }

  // Expand recommendation card if present
  const expand = page.locator('button, a, span').filter({ hasText: /Expand|Details|View/i }).first();
  if (await expand.isVisible().catch(() => false)) {
    await expand.click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(2000);
  }

  detail.afterRowClick = await page.evaluate(`(() => {
    const txt = (el) => ((el && (el.innerText || el.textContent)) || '').replace(/\\s+/g, ' ').trim();
    const tabs = Array.from(document.querySelectorAll('[role="tab"], .nav-tabs a, .nav-link, button, a'))
      .map((el) => txt(el))
      .filter((t) => /overview|action|history|data science|object detail|source data|detailed analysis/i.test(t))
      .slice(0, 50);
    const labels = Array.from(document.querySelectorAll('label, th, h1,h2,h3,h4,.modal-title,.panel-title,.section-title'))
      .map((el) => txt(el))
      .filter(Boolean)
      .slice(0, 100);
    const ids = Array.from(document.querySelectorAll('[id]'))
      .map((el) => el.id)
      .filter((id) =>
        /recommend|overview|action|history|detail|object|science|source|status|modal|tab|assur|rec-|preview|impact|perf/i.test(id)
      )
      .slice(0, 150);
    const idLinks = Array.from(document.querySelectorAll('a[href]'))
      .map((a) => ({ text: txt(a).slice(0, 100), href: a.href.slice(0, 250) }))
      .filter((x) => /ID:|recommendation|assurance|detail/i.test(x.text + x.href))
      .slice(0, 40);
    const body = txt(document.body).slice(0, 8000);
    const modals = Array.from(document.querySelectorAll('.modal, .jconfirm, [role="dialog"]'))
      .filter((el) => !!el.offsetParent || /in|show|open/i.test(el.className))
      .map((el) => ({
        id: el.id,
        cls: String(el.className).slice(0, 120),
        text: txt(el).slice(0, 1500),
      }))
      .slice(0, 10);
    return { url: location.href, title: document.title, tabs, labels, ids, idLinks, modals, body };
  })()`);

  for (const name of ['Overview', 'Action', 'History']) {
    const t = page
      .getByRole('tab', { name: new RegExp(`^${name}$`, 'i') })
      .or(page.locator('a,button,[role="tab"],li').filter({ hasText: new RegExp(`^${name}$`, 'i') }))
      .first();
    if (await t.isVisible().catch(() => false)) {
      await t.click({ force: true }).catch(() => undefined);
      await page.waitForTimeout(1500);
      detail[`tab_${name}`] = ((await page.locator('body').innerText().catch(() => '')) || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 2500);
    }
  }

  for (const name of ['Data Science', 'Object Detail']) {
    const link = page.locator('a,button,span,div').filter({ hasText: new RegExp(name, 'i') }).first();
    if (await link.isVisible().catch(() => false)) {
      await link.click({ force: true }).catch(() => undefined);
      await page.waitForTimeout(3000);
      detail[`popup_${name.replace(/\s/g, '')}`] = await page.evaluate(`(() => {
        const txt = (el) => ((el && (el.innerText || el.textContent)) || '').replace(/\\s+/g, ' ').trim();
        const modal =
          document.querySelector('.modal.in, .modal.show, .jconfirm.jconfirm-open, #recPerfViewDataModal, #raImpactAnalysisModal') ||
          document.body;
        const options = Array.from(modal.querySelectorAll('a, button, .nav-link, li, option, .btn'))
          .map((el) => txt(el))
          .filter((t) => t && t.length < 80)
          .slice(0, 40);
        const tableRows = modal.querySelectorAll('table tbody tr').length;
        const headers = Array.from(modal.querySelectorAll('table thead th, table th'))
          .map((th) => txt(th))
          .filter(Boolean)
          .slice(0, 30);
        return { text: txt(modal).slice(0, 3000), options, tableRows, headers };
      })()`);
      await page.keyboard.press('Escape').catch(() => undefined);
      await page
        .locator('.modal .close, button:has-text("Close"), button:has-text("Cancel"), .jconfirm-closeIcon')
        .first()
        .click({ force: true })
        .catch(() => undefined);
      await page.waitForTimeout(800);
    }
  }

  fs.writeFileSync(out, JSON.stringify(detail, null, 2));

  // Hero Show Me + Compact/Relaxed
  try {
    await page.goto('https://portal.bluetriangle.com/btportal/web/index.php?r=revenue-assurance/dashboard', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await page.waitForTimeout(4000);
    const heroShow = page.locator('.opportunity-item-card button.show-me-btn, .main-card button.show-me-btn').first();
    if (await heroShow.isVisible().catch(() => false)) {
      await heroShow.click({ force: true });
      await page.waitForTimeout(3500);
      detail.heroShowMe = {
        tableVisible: await table.isVisible().catch(() => false),
        rowCount: await table.locator('tbody tr').count().catch(() => 0),
        body: (
          (await page
            .locator('#revenue-assurance-recommendations-table, #chartsContainer, body')
            .first()
            .innerText()
            .catch(() => '')) || ''
        )
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 2000),
      };
    }

    detail.gridView = await page.locator('#gridViewBtn').isVisible().catch(() => false);
    detail.cardSearch = await page.locator('#cardSearch').isVisible().catch(() => false);
    detail.compactRelaxed = await page
      .locator('a,button,span,label')
      .filter({ hasText: /Compact|Relaxed/i })
      .evaluateAll((els) => els.map((e) => (e.textContent || '').replace(/\s+/g, ' ').trim()))
      .catch(() => []);

    const card = page.locator('#card-4, [id^="card-"]').filter({ hasText: /\$[1-9]/ }).first();
    if (await card.isVisible().catch(() => false)) {
      const before = ((await card.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim().slice(0, 200);
      await card.click({ force: true });
      await page.waitForTimeout(3500);
      detail.cardDrill = {
        before,
        url: page.url(),
        body: ((await page.locator('body').innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim().slice(0, 3000),
        areas: await page
          .locator('text=/TOP REVENUE OPPORTUNITY AREAS|AREAS/i')
          .first()
          .isVisible()
          .catch(() => false),
      };
    }
  } catch (err) {
    detail.secondPassError = err instanceof Error ? err.message : String(err);
  }

  fs.writeFileSync(out, JSON.stringify(detail, null, 2));
  console.log(
    JSON.stringify(
      {
        clicked: detail.clicked,
        tableVisible: detail.tableVisible,
        rowCount: detail.rowCount,
        tabs: (detail.afterRowClick as any)?.tabs,
        idLinks: (detail.afterRowClick as any)?.idLinks?.slice?.(0, 10),
        hasOverview: !!(detail as any).tab_Overview,
        hasAction: !!(detail as any).tab_Action,
        hasHistory: !!(detail as any).tab_History,
        ds: !!(detail as any).popup_DataScience,
        od: !!(detail as any).popup_ObjectDetail,
        heroShowMeRows: (detail.heroShowMe as any)?.rowCount,
        cardDrill: !!(detail as any).cardDrill,
      },
      null,
      2
    )
  );
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
