import { Page, expect, Locator } from '@playwright/test';
import { CompetitiveIndexTrendsLocators } from '../locators/CompetitiveIndexTrendsLocators';
import { LeftNavPage } from './LeftNavPage';
import { SiteDropdownPage } from './SiteDropdownPage';
import { ensurePortalSession } from '../helpers/portalSession';
import { getActiveProfile } from '../config/profiles';

const PAGE_DEF = {
  id: 'mkt.competitive-trends',
  module: 'mkt',
  menuLabel: 'Competitive Index Trends',
  route: 'competitive-index/index',
  hrefIncludes: ['view=trends'],
  titleIncludes: /Competitive Index/i,
};

export type CompetitiveIndexTrendsContext = {
  siteName: string;
  industry: string;
  vertical: string;
  group: string;
  timePeriod: string;
  statisticalMethod: string;
  trafficSegment: string;
  viewMode: 'table' | 'trends';
};

/**
 * Competitive Index Trends (view=trends).
 * Read-only except filter/toggle samples. Do not Save Filter / Groups / Clear Cache.
 */
export class CompetitiveIndexTrendsPage {
  readonly locators: CompetitiveIndexTrendsLocators;

  constructor(protected readonly page: Page) {
    this.locators = new CompetitiveIndexTrendsLocators(page);
  }

  async openViaNavigation(): Promise<void> {
    await ensurePortalSession(this.page);
    await new SiteDropdownPage(this.page).ensureProfileSite();
    await new LeftNavPage(this.page).openSmokePage(PAGE_DEF);
    await this.waitForPageReady();
  }

  async dismissBlockingDialogs(): Promise<void> {
    for (let i = 0; i < 5; i++) {
      const dismiss = this.page
        .locator('button, a, .jconfirm-buttons button, .modal button, .btn, [data-dismiss="modal"]')
        .filter({
          hasText: /ok|close|yes|got it|continue|dismiss|agree|don't show|dont show|get started|skip/i,
        })
        .first();
      if (await dismiss.isVisible().catch(() => false)) {
        await dismiss.click({ force: true, timeout: 3000 }).catch(() => undefined);
        await this.page.waitForTimeout(400);
        continue;
      }
      const open = this.page.locator('.jconfirm.jconfirm-open, .modal.in, .blockUI, .introjs-overlay');
      if (!(await open.first().isVisible().catch(() => false))) break;
      await this.page.keyboard.press('Escape').catch(() => undefined);
      await this.page.waitForTimeout(350);
    }
  }

  async waitForPageReady(): Promise<void> {
    await expect(this.page).not.toHaveURL(/site\/login|site%2Flogin/i);
    await expect(this.page).toHaveURL(/competitive-index(?:\/|%2F)index/i);
    await expect(this.page).toHaveURL(/view=trends/i);
    await expect(this.page).toHaveTitle(/Competitive Index/i);
    await expect(this.locators.pageTitle).toBeVisible({ timeout: 60000 });
    await expect(this.locators.pageTitle).toHaveText(/Competitive Index\s*\/\s*Trends/i);
    await this.page.waitForLoadState('domcontentloaded');
    await this.dismissBlockingDialogs();
    await expect(this.locators.trendsTab).toBeVisible({ timeout: 30000 });
    await this.selectTrendsView();
    await this.waitForTrendsSettled(90000).catch(() => undefined);
  }

  async selectTrendsView(): Promise<void> {
    await this.dismissBlockingDialogs();
    if (!(await this.isTrendsTabActive())) {
      await this.locators.trendsTab.click({ force: true, timeout: 10000 });
      await this.page.waitForTimeout(1200);
    }
    await expect(this.locators.trendsTab).toHaveClass(/active/i, { timeout: 10000 });
  }

  async selectTableView(): Promise<void> {
    await this.dismissBlockingDialogs();
    await this.locators.tableTab.click({ force: true, timeout: 10000 });
    await this.page.waitForTimeout(1200);
    await expect(this.locators.tableTab).toHaveClass(/active/i, { timeout: 10000 });
  }

  async isTrendsTabActive(): Promise<boolean> {
    const cls = (await this.locators.trendsTab.getAttribute('class').catch(() => '')) || '';
    return /active/i.test(cls);
  }

  async waitForTrendsSettled(timeout = 90000): Promise<'charts' | 'empty'> {
    try {
      await expect
        .poll(
          async () => {
            const charts = await this.visibleHighchartsCount();
            if (charts > 0) return 2;
            const filter = await this.locators.trendFilterContent.isVisible().catch(() => false);
            const industry = await this.locators.trendIndustrySelector.isVisible().catch(() => false);
            if (filter || industry) return 1;
            return 0;
          },
          { timeout, intervals: [500, 1000, 2000, 3000] }
        )
        .toBeGreaterThan(0);
    } catch {
      // bounded
    }
    const charts = await this.visibleHighchartsCount();
    return charts > 0 ? 'charts' : 'empty';
  }

  async visibleHighchartsCount(): Promise<number> {
    return this.page.locator('.highcharts-container, [data-highcharts-chart]').evaluateAll((els) =>
      els.filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 20 && r.height > 20;
      }).length
    );
  }

  async chartSignature(): Promise<string> {
    return this.page.evaluate(() => {
      const title = (sel: string) => {
        const host = document.querySelector(sel);
        if (!host) return '';
        const t =
          host.querySelector('.highcharts-title, .highcharts-subtitle') ||
          host;
        return ((t as HTMLElement).innerText || t.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 160);
      };
      const visibleCharts = Array.from(
        document.querySelectorAll('.highcharts-container, [data-highcharts-chart]')
      ).filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 20 && r.height > 20;
      }).length;
      return [
        title('#groupsChart'),
        title('#industryTrendChart'),
        title('#industryTrendChartContainer'),
        `charts=${visibleCharts}`,
      ].join('||');
    });
  }

  async groupsChartTitle(): Promise<string> {
    const host = this.locators.groupsChart;
    if (!(await host.count().then((c) => c > 0).catch(() => false))) return '';
    const t = host.locator('.highcharts-title, .highcharts-subtitle').first();
    if (await t.isVisible().catch(() => false)) {
      return ((await t.innerText()) || '').replace(/\s+/g, ' ').trim();
    }
    return ((await host.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim().slice(0, 200);
  }

  async captureContext(): Promise<CompetitiveIndexTrendsContext> {
    const profile = getActiveProfile();
    return {
      siteName: profile.siteName,
      industry: await this.textOf(this.locators.trendIndustrySelector),
      vertical: await this.textOf(this.locators.trendVerticalSelector),
      group: await this.textOf(this.locators.trendGroupSelector),
      timePeriod: await this.textOf(this.locators.timePeriodBadge),
      statisticalMethod: await this.textOf(this.locators.statisticalMethodBadge),
      trafficSegment: await this.textOf(this.locators.trafficSegmentBadge),
      viewMode: (await this.isTrendsTabActive()) ? 'trends' : 'table',
    };
  }

  async expectDefaultTrendsContext(): Promise<void> {
    await expect(this.page).toHaveURL(/view=trends/i);
    await expect(this.locators.trendsTab).toHaveClass(/active/i);
    await expect(this.locators.trendIndustrySelector).toBeVisible({ timeout: 15000 });
  }

  async expectTrendsSelectorsPresent(): Promise<void> {
    await expect(this.locators.trendIndustrySelector).toBeVisible({ timeout: 15000 });
    await expect(this.locators.trendVerticalSelector).toBeVisible({ timeout: 10000 });
    await expect(this.locators.trendGroupSelector).toBeVisible({ timeout: 10000 });
  }

  async expectQuickBadges(): Promise<string[]> {
    const items: string[] = [];
    for (const loc of [
      this.locators.timePeriodBadge,
      this.locators.trafficSegmentBadge,
      this.locators.statisticalMethodBadge,
    ]) {
      const t = await this.textOf(loc);
      if (t) items.push(t);
    }
    expect(items.length, 'At least one badge').toBeGreaterThan(0);
    return items;
  }

  async selectSelect2Option(
    container: Locator,
    pick: { text?: string | RegExp; skipCurrent?: boolean }
  ): Promise<string | null> {
    await container.scrollIntoViewIfNeeded().catch(() => undefined);
    await container.click({ force: true });
    await this.page.waitForTimeout(450);
    const options = this.page.locator(
      '.select2-results__option:not(.select2-results__option--disabled):not(.select2-results__message)'
    );
    await expect(options.first()).toBeVisible({ timeout: 10000 }).catch(() => undefined);
    const count = await options.count();
    if (count === 0) {
      await this.page.keyboard.press('Escape').catch(() => undefined);
      return null;
    }
    let target = options.first();
    if (pick.text) {
      target = options.filter({ hasText: pick.text }).first();
    } else if (pick.skipCurrent) {
      const current = await this.textOf(container);
      for (let i = 0; i < count; i++) {
        const t = ((await options.nth(i).innerText()) || '').replace(/\s+/g, ' ').trim();
        if (t && t !== current && !/^select |^choose |^no results/i.test(t)) {
          target = options.nth(i);
          break;
        }
      }
    }
    const label = ((await target.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
    if (/no results found/i.test(label)) {
      await this.page.keyboard.press('Escape').catch(() => undefined);
      return null;
    }
    await target.click({ force: true }).catch(async () => {
      await this.page.keyboard.press('Escape').catch(() => undefined);
    });
    await this.page.waitForTimeout(2800);
    await this.waitForTrendsSettled(45000).catch(() => undefined);
    return label || null;
  }

  async sampleChangeIndustry(): Promise<{ before: string; after: string | null; sigChanged: boolean }> {
    const beforeSig = await this.chartSignature();
    const before = await this.textOf(this.locators.trendIndustrySelector);
    const after = await this.selectSelect2Option(this.locators.trendIndustrySelector, {
      skipCurrent: true,
    });
    const afterSig = await this.chartSignature();
    return { before, after, sigChanged: beforeSig !== afterSig };
  }

  async sampleChangeVertical(): Promise<{ before: string; after: string | null; sigChanged: boolean }> {
    const beforeSig = await this.chartSignature();
    const before = await this.textOf(this.locators.trendVerticalSelector);
    const after = await this.selectSelect2Option(this.locators.trendVerticalSelector, {
      skipCurrent: true,
    });
    const afterSig = await this.chartSignature();
    return { before, after, sigChanged: beforeSig !== afterSig };
  }

  async restoreIndustry(value: string): Promise<void> {
    if (!value) return;
    const current = await this.textOf(this.locators.trendIndustrySelector);
    // Exact/trimmed match only — avoid "Retail" matching current "Retail - EU"
    const cur = current.replace(/\s+/g, ' ').trim();
    const want = value.replace(/\s+/g, ' ').trim();
    if (cur === want) return;
    await this.selectSelect2Option(this.locators.trendIndustrySelector, { text: new RegExp(`^${escapeReg(want)}$`, 'i') });
  }

  async restoreVertical(value: string): Promise<void> {
    if (!value) return;
    const current = await this.textOf(this.locators.trendVerticalSelector);
    const cur = current.replace(/\s+/g, ' ').trim();
    const want = value.replace(/\s+/g, ' ').trim();
    if (cur === want) return;
    await this.selectSelect2Option(this.locators.trendVerticalSelector, { text: new RegExp(`^${escapeReg(want)}$`, 'i') });
  }

  async softOpenGroupSelector(): Promise<{ empty: boolean; sample: string }> {
    await this.locators.trendGroupSelector.click({ force: true });
    await this.page.waitForTimeout(500);
    const options = this.page.locator('.select2-results__option, .select2-results__message');
    const texts = await options.evaluateAll((els) =>
      els.map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean)
    );
    await this.page.keyboard.press('Escape').catch(() => undefined);
    const joined = texts.join(' | ');
    return {
      empty: /no results found/i.test(joined) || texts.length === 0,
      sample: joined.slice(0, 200),
    };
  }

  async sampleSiteToggleLabel(): Promise<string | null> {
    const label = this.page
      .locator('#compToggleBox label, #companyToggler label, [id$="_toggle_container"] label, #compToggleBox')
      .first();
    if (!(await label.isVisible().catch(() => false))) {
      // try any checkbox parent text
      const box = this.locators.siteCheckboxes.first();
      if (!(await box.count())) return null;
      const parentText = await box.evaluate((el) => {
        const p = el.closest('[id$="_toggle_container"]') || el.parentElement;
        return ((p?.textContent || '') as string).replace(/\s+/g, ' ').trim();
      });
      const token = (parentText || '').split(/\s+/).find((p) => p.length >= 3);
      return token || null;
    }
    const t = ((await label.innerText()) || '').replace(/\s+/g, ' ').trim();
    return t.split(/\s+/).find((p) => p.length >= 3) || t.slice(0, 10) || null;
  }

  private companySearchInput(): Locator {
    // Live: #searchBox is a wrapper div; input may be #trendCompSearch or nested.
    return this.page
      .locator(
        '#trendCompSearch input, #searchBox input, input#trendCompSearch, #trendFilterContent input[type="search"], #trendFilterContent input[type="text"]'
      )
      .first();
  }

  async searchCompanies(term: string): Promise<boolean> {
    const search = this.companySearchInput();
    if (!(await search.isVisible().catch(() => false))) {
      // fallback: click wrapper and type
      const wrap = this.locators.trendCompSearch;
      if (!(await wrap.isVisible().catch(() => false))) return false;
      await wrap.click({ force: true }).catch(() => undefined);
      await this.page.keyboard.type(term, { delay: 30 }).catch(() => undefined);
      await this.page.waitForTimeout(800);
      return true;
    }
    await search.fill(term);
    await this.page.waitForTimeout(800);
    return true;
  }

  async clearCompanySearch(): Promise<void> {
    const search = this.companySearchInput();
    if (await search.isVisible().catch(() => false)) {
      await search.fill('');
      await this.page.waitForTimeout(600);
      return;
    }
    const wrap = this.locators.trendCompSearch;
    if (await wrap.isVisible().catch(() => false)) {
      await wrap.click({ force: true }).catch(() => undefined);
      await this.page.keyboard.press('Control+A').catch(() => undefined);
      await this.page.keyboard.press('Backspace').catch(() => undefined);
      await this.page.waitForTimeout(600);
    }
  }

  async softToggleFirstSites(count = 2): Promise<number> {
    // Prefer visible toggle rows; skip hidden off-DOM clones
    const boxes = this.locators.siteCheckboxes;
    const n = await boxes.count().catch(() => 0);
    let toggled = 0;
    for (let i = 0; i < n && toggled < count; i++) {
      const box = boxes.nth(i);
      try {
        if (!(await box.isVisible().catch(() => false))) continue;
        await box.scrollIntoViewIfNeeded().catch(() => undefined);
        const checked = await box.isChecked().catch(() => false);
        if (!checked) {
          await box.check({ force: true });
        } else {
          await box.uncheck({ force: true });
          await box.check({ force: true });
        }
        toggled += 1;
        await this.page.waitForTimeout(600);
      } catch {
        // continue
      }
    }
    await this.page.waitForTimeout(1200);
    return toggled;
  }

  async clearSitesToggles(): Promise<boolean> {
    if (!(await this.locators.clearSitesToggles.isVisible().catch(() => false))) return false;
    await this.locators.clearSitesToggles.click({ force: true });
    await this.page.waitForTimeout(800);
    return true;
  }

  async softOpenClose(btn: Locator): Promise<boolean> {
    if (!(await btn.isVisible().catch(() => false))) return false;
    await btn.click({ force: true }).catch(() => undefined);
    await this.page.waitForTimeout(700);
    await this.page.keyboard.press('Escape').catch(() => undefined);
    const cancel = this.page.locator('button, a').filter({ hasText: /cancel|close|×|dismiss/i }).first();
    if (await cancel.isVisible().catch(() => false)) {
      await cancel.click({ force: true }).catch(() => undefined);
    }
    await this.page.waitForTimeout(300);
    return true;
  }

  async softToggleHideFilters(): Promise<boolean> {
    if (!(await this.locators.hideTrendFilters.isVisible().catch(() => false))) return false;
    await this.locators.hideTrendFilters.click({ force: true });
    await this.page.waitForTimeout(500);
    await this.locators.hideTrendFilters.click({ force: true });
    await this.page.waitForTimeout(400);
    return true;
  }

  async openFilters(): Promise<void> {
    const already =
      (await this.locators.applyFilters.isVisible().catch(() => false)) ||
      (await this.locators.myFiltersTab.isVisible().catch(() => false));
    if (already) return;
    await this.locators.toggleFilters.click({ force: true, timeout: 10000 }).catch(() => undefined);
    await this.page.waitForTimeout(800);
  }

  async closeFilters(): Promise<void> {
    if (await this.locators.cancelFilters.isVisible().catch(() => false)) {
      await this.locators.cancelFilters.click({ force: true }).catch(() => undefined);
    } else {
      await this.page.keyboard.press('Escape').catch(() => undefined);
    }
    await this.page.waitForTimeout(400);
  }

  async filterLabelsSample(): Promise<string[]> {
    await this.openFilters();
    return this.page.locator('label, .control-label').evaluateAll((els) =>
      Array.from(
        new Set(
          els
            .map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim())
            .filter((t) => t && t.length < 80)
        )
      ).slice(0, 40)
    );
  }

  async applyTimePeriodPreset(presetRegex: RegExp): Promise<boolean> {
    await this.openFilters();
    const preset = this.page
      .locator('button, a, label, .time-option, li, option, .select2-results__option')
      .filter({ hasText: presetRegex })
      .first();
    if (!(await preset.isVisible().catch(() => false))) {
      await this.page.locator('#time-period-view').click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(400);
    }
    if (!(await preset.isVisible().catch(() => false))) {
      await this.closeFilters();
      return false;
    }
    await preset.click({ force: true });
    await this.page.waitForTimeout(400);
    if (await this.locators.applyFilters.isVisible().catch(() => false)) {
      await this.locators.applyFilters.click({ force: true });
    }
    await this.page.waitForTimeout(3000);
    await this.selectTrendsView();
    await this.waitForTrendsSettled(45000).catch(() => undefined);
    return true;
  }

  async softTableParity(): Promise<{ headers: string[]; ok: boolean }> {
    await this.selectTableView();
    const table = this.locators.performanceIndexTable;
    await expect(table).toBeVisible({ timeout: 20000 }).catch(() => undefined);
    const headers = await table.locator('thead th').evaluateAll((ths) =>
      ths.map((th) => (th.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean)
    );
    const ok =
      headers.some((h) => /Company/i.test(h)) && headers.some((h) => /Vertical/i.test(h));
    await this.selectTrendsView();
    return { headers, ok };
  }

  async recoverToCaptured(ctx: CompetitiveIndexTrendsContext): Promise<void> {
    await this.dismissBlockingDialogs();
    await this.selectTrendsView();
    await this.clearSitesToggles().catch(() => undefined);
    await this.clearCompanySearch().catch(() => undefined);
    await this.restoreIndustry(ctx.industry);
    await this.restoreVertical(ctx.vertical);
    await this.closeFilters();
    await this.selectTrendsView();
    await this.waitForTrendsSettled(45000).catch(() => undefined);
  }

  private async textOf(loc: Locator): Promise<string> {
    if (!(await loc.isVisible().catch(() => false))) {
      // still try attached text (select2 may report hidden sometimes)
      if (!(await loc.count())) return '';
    }
    return ((await loc.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
  }
}

function escapeReg(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
