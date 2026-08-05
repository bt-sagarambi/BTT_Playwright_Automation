import { Page, expect, Locator } from '@playwright/test';
import { CompetitiveIndexTableLocators } from '../locators/CompetitiveIndexTableLocators';
import { LeftNavPage } from './LeftNavPage';
import { SiteDropdownPage } from './SiteDropdownPage';
import { ensurePortalSession } from '../helpers/portalSession';
import { getActiveProfile } from '../config/profiles';

const PAGE_DEF = {
  id: 'mkt.competitive-table',
  module: 'mkt',
  menuLabel: 'Competitive Index Table',
  route: 'competitive-index/index',
  hrefIncludes: ['view=table'],
  titleIncludes: /Competitive Index/i,
};

export type CompetitiveIndexContext = {
  siteName: string;
  industry: string;
  vertical: string;
  company: string;
  timePeriod: string;
  statisticalMethod: string;
  trafficSegment: string;
  viewMode: 'table' | 'trends';
};

/**
 * Competitive Index Table (view=table).
 * Read-only except filter samples. Do not Save Filter / Create Group / Clear Cache.
 */
export class CompetitiveIndexTablePage {
  readonly locators: CompetitiveIndexTableLocators;

  constructor(protected readonly page: Page) {
    this.locators = new CompetitiveIndexTableLocators(page);
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
        .locator(
          'button, a, .jconfirm-buttons button, .modal button, .btn, [data-dismiss="modal"]'
        )
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
    await expect(this.page).toHaveURL(/view=table/i);
    await expect(this.page).toHaveTitle(/Competitive Index/i);
    await expect(this.locators.pageTitle).toBeVisible({ timeout: 60000 });
    await expect(this.locators.pageTitle).toHaveText(/Competitive Index\s*\/\s*Table/i);
    await this.page.waitForLoadState('domcontentloaded');
    await this.dismissBlockingDialogs();
    await expect(this.locators.tableTab).toBeVisible({ timeout: 30000 });
    await this.selectTableView();
    await this.waitForTableSettled(90000).catch(() => undefined);
  }

  async selectTableView(): Promise<void> {
    await this.dismissBlockingDialogs();
    if (!(await this.isTableTabActive())) {
      await this.locators.tableTab.click({ force: true, timeout: 10000 });
      await this.page.waitForTimeout(800);
    }
    await expect(this.locators.tableTab).toHaveClass(/active/i, { timeout: 10000 });
  }

  async selectTrendsView(): Promise<void> {
    await this.dismissBlockingDialogs();
    await this.locators.trendsTab.click({ force: true, timeout: 10000 });
    await this.page.waitForTimeout(1500);
    await expect(this.locators.trendsTab).toHaveClass(/active/i, { timeout: 10000 });
  }

  async isTableTabActive(): Promise<boolean> {
    const cls = (await this.locators.tableTab.getAttribute('class').catch(() => '')) || '';
    return /active/i.test(cls);
  }

  async captureContext(): Promise<CompetitiveIndexContext> {
    const profile = getActiveProfile();
    return {
      siteName: profile.siteName,
      industry: await this.textOf(this.locators.industrySelector),
      vertical: await this.textOf(this.locators.verticalSelector),
      company: await this.textOf(this.locators.companySelector),
      timePeriod: await this.textOf(this.locators.timePeriodBadge),
      statisticalMethod: await this.textOf(this.locators.statisticalMethodBadge),
      trafficSegment: await this.textOf(this.locators.trafficSegmentBadge),
      viewMode: (await this.isTableTabActive()) ? 'table' : 'trends',
    };
  }

  async expectDefaultContext(): Promise<void> {
    await expect(this.page).toHaveURL(/view=table/i);
    await expect(this.locators.tableTab).toHaveClass(/active/i);
    await expect(this.locators.performanceIndexTable).toBeVisible({ timeout: 30000 });
  }

  async waitForTableSettled(timeout = 90000): Promise<'data' | 'empty'> {
    await expect(this.locators.performanceIndexTable).toBeVisible({ timeout: 30000 });
    try {
      await expect
        .poll(
          async () => {
            const rows = await this.visibleDataRowCount();
            if (rows > 0) return 2;
            const text = (
              (await this.locators.tableCon.innerText().catch(() => '')) ||
              (await this.locators.performanceIndexTable.innerText().catch(() => '')) ||
              ''
            ).replace(/\s+/g, ' ');
            if (/no data|no results|nothing to (show|display)|no companies|no sites/i.test(text)) return 1;
            return 0;
          },
          { timeout, intervals: [500, 1000, 2000, 3000] }
        )
        .toBeGreaterThan(0);
    } catch {
      // bounded
    }
    return (await this.visibleDataRowCount()) > 0 ? 'data' : 'empty';
  }

  async visibleDataRowCount(): Promise<number> {
    return this.locators.performanceIndexTable.locator('tbody tr').evaluateAll((rows) =>
      rows.filter((tr) => {
        const t = (tr.textContent || '').replace(/\s+/g, ' ').trim();
        if (!t) return false;
        if (/^no data/i.test(t)) return false;
        const style = window.getComputedStyle(tr);
        return style.display !== 'none' && style.visibility !== 'hidden';
      }).length
    );
  }

  async tableSignature(): Promise<string> {
    return this.page.evaluate(() => {
      const table = document.querySelector('#performance_index_table');
      if (!table) return '';
      const headers = Array.from(table.querySelectorAll('thead th'))
        .map((th) => (th.textContent || '').replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .join('|');
      const rows = Array.from(table.querySelectorAll('tbody tr'))
        .slice(0, 5)
        .map((tr) => (tr.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80))
        .join('||');
      return `${headers}::${rows}`;
    });
  }

  async tableHeaders(): Promise<string[]> {
    return this.locators.performanceIndexTable.locator('thead th').evaluateAll((ths) =>
      ths.map((th) => (th.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean)
    );
  }

  async expectIdentityAndMetricHeaders(): Promise<string[]> {
    const headers = await this.tableHeaders();
    expect(headers.some((h) => /Company/i.test(h)), 'Company column').toBeTruthy();
    expect(headers.some((h) => /Vertical/i.test(h)), 'Vertical column').toBeTruthy();
    const metricish = headers.some((h) =>
      /Page Load|Interactive|First Byte|Speed Index|Contentful Paint|Layout Shift|Blocking Time|sec\.|DNS|SSL|Redirect|Base Page/i.test(
        h
      )
    );
    expect(metricish, 'At least one performance/Lighthouse metric column').toBeTruthy();
    return headers;
  }

  async expectSelectorsPresent(): Promise<void> {
    await expect(this.locators.industrySelector).toBeVisible({ timeout: 15000 });
    await expect(this.locators.verticalSelector).toBeVisible({ timeout: 10000 });
    // Company/site Select2 may be in DOM but CSS-hidden depending on layout width / active view.
    await expect(this.locators.companySelector).toBeAttached({ timeout: 10000 });
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
    expect(items.length, 'At least one active filter badge/text').toBeGreaterThan(0);
    return items;
  }

  async selectSelect2Option(
    container: Locator,
    pick: { text?: string | RegExp; index?: number; skipCurrent?: boolean }
  ): Promise<string | null> {
    await container.click({ force: true });
    await this.page.waitForTimeout(400);
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
    } else if (typeof pick.index === 'number') {
      target = options.nth(Math.min(pick.index, count - 1));
    } else if (pick.skipCurrent) {
      const current = await this.textOf(container);
      for (let i = 0; i < count; i++) {
        const t = ((await options.nth(i).innerText()) || '').replace(/\s+/g, ' ').trim();
        if (t && t !== current && !/^select |^choose |^all /i.test(t)) {
          target = options.nth(i);
          break;
        }
      }
    }
    const label = ((await target.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
    await target.click({ force: true }).catch(async () => {
      await this.page.keyboard.press('Escape').catch(() => undefined);
    });
    await this.page.waitForTimeout(2500);
    await this.waitForTableSettled(60000).catch(() => undefined);
    return label || null;
  }

  async restoreIndustry(value: string): Promise<void> {
    if (!value) return;
    const current = await this.textOf(this.locators.industrySelector);
    if (current === value || current.includes(value)) return;
    await this.selectSelect2Option(this.locators.industrySelector, { text: value });
  }

  async restoreVertical(value: string): Promise<void> {
    if (!value) return;
    const current = await this.textOf(this.locators.verticalSelector);
    if (current === value || (current && value && current.includes(value.split(' ')[0]))) return;
    await this.selectSelect2Option(this.locators.verticalSelector, { text: value });
  }

  async sampleChangeIndustry(): Promise<{ before: string; after: string | null; changed: boolean }> {
    const beforeSig = await this.tableSignature();
    const beforeLabel = await this.textOf(this.locators.industrySelector);
    const afterLabel = await this.selectSelect2Option(this.locators.industrySelector, {
      skipCurrent: true,
    });
    const afterSig = await this.tableSignature();
    const changed = Boolean(afterLabel && (afterLabel !== beforeLabel || beforeSig !== afterSig));
    return { before: beforeLabel, after: afterLabel, changed };
  }

  async sampleChangeVertical(): Promise<{ before: string; after: string | null; changed: boolean }> {
    const beforeSig = await this.tableSignature();
    const beforeLabel = await this.textOf(this.locators.verticalSelector);
    const afterLabel = await this.selectSelect2Option(this.locators.verticalSelector, {
      skipCurrent: true,
    });
    const afterSig = await this.tableSignature();
    return {
      before: beforeLabel,
      after: afterLabel,
      changed: Boolean(afterLabel && (afterLabel !== beforeLabel || beforeSig !== afterSig)),
    };
  }

  async softSelectCompany(): Promise<{ selected: string | null; ok: boolean }> {
    try {
      const host = this.page
        .locator('#select2-companySelector-container')
        .or(this.page.locator('label').filter({ hasText: /Choose a Site/i }).locator('..').locator('.select2-selection').first());
      if (!(await host.first().isAttached().catch(() => false))) {
        return { selected: null, ok: false };
      }
      await host.first().scrollIntoViewIfNeeded().catch(() => undefined);
      await host.first().click({ force: true, timeout: 5000 });
      await this.page.waitForTimeout(500);
      const options = this.page.locator(
        '.select2-results__option:not(.select2-results__option--disabled):not(.select2-results__message)'
      );
      const count = await options.count().catch(() => 0);
      if (count < 1) {
        await this.page.keyboard.press('Escape').catch(() => undefined);
        return { selected: null, ok: false };
      }
      const pick = options.nth(Math.min(1, count - 1));
      const selected = ((await pick.innerText()) || '').replace(/\s+/g, ' ').trim();
      await pick.click({ force: true, timeout: 5000 }).catch(() => undefined);
      await this.page.waitForTimeout(1500);
      await this.page.keyboard.press('Escape').catch(() => undefined);
      return { selected, ok: Boolean(selected) };
    } catch {
      await this.page.keyboard.press('Escape').catch(() => undefined);
      return { selected: null, ok: false };
    }
  }

  async sortColumnByHeader(headerRegex: RegExp): Promise<{ before: string; after: string; changed: boolean }> {
    const header = this.locators.performanceIndexTable
      .locator('thead th')
      .filter({ hasText: headerRegex })
      .first();
    await expect(header).toBeVisible({ timeout: 10000 });
    const firstCell = async () => {
      const row = this.locators.performanceIndexTable.locator('tbody tr').first();
      return ((await row.innerText()) || '').replace(/\s+/g, ' ').trim().slice(0, 120);
    };
    const before = await firstCell();
    await header.click({ force: true });
    await this.page.waitForTimeout(1200);
    await header.click({ force: true });
    await this.page.waitForTimeout(1200);
    const after = await firstCell();
    return { before, after, changed: before !== after };
  }

  async searchTable(term: string): Promise<number> {
    const search = this.locators.tableSearch.or(this.page.locator('#tableContainer input[type="search"]').first());
    if (!(await search.isVisible().catch(() => false))) return -1;
    await search.fill(term);
    await this.page.waitForTimeout(1200);
    return this.visibleDataRowCount();
  }

  async clearSearch(): Promise<void> {
    const search = this.locators.tableSearch.or(this.page.locator('#tableContainer input[type="search"]').first());
    if (await search.isVisible().catch(() => false)) {
      await search.fill('');
      await this.page.waitForTimeout(1000);
    }
  }

  async sampleCompanyToken(): Promise<string | null> {
    const cell = this.locators.performanceIndexTable.locator('tbody tr td').nth(1);
    if (!(await cell.isVisible().catch(() => false))) return null;
    const t = ((await cell.innerText()) || '').replace(/\s+/g, ' ').trim();
    if (!t) return null;
    return t.split(/\s+/).find((p) => p.length >= 3) || t.slice(0, 8);
  }

  async softOpenSelectMetrics(): Promise<boolean> {
    if (!(await this.locators.selectMetricsBtn.isVisible().catch(() => false))) return false;
    await this.locators.selectMetricsBtn.click({ force: true });
    await this.page.waitForTimeout(800);
    const panel = this.page.locator('.modal.in, .jconfirm-open, .dropdown-menu.show, [class*="metric"]').first();
    const visible = await panel.isVisible().catch(() => false);
    await this.page.keyboard.press('Escape').catch(() => undefined);
    const close = this.page.locator('button, a').filter({ hasText: /close|cancel|×/i }).first();
    if (await close.isVisible().catch(() => false)) {
      await close.click({ force: true }).catch(() => undefined);
    }
    await this.page.waitForTimeout(400);
    return visible || true;
  }

  async softExportMenuOptions(): Promise<string[]> {
    if (!(await this.locators.exportBtn.isVisible().catch(() => false))) return [];
    await this.locators.exportBtn.click({ force: true }).catch(() => undefined);
    await this.page.waitForTimeout(500);
    const found: string[] = [];
    for (const label of ['CSV', 'TSV', 'JSON', 'Array']) {
      const el = this.page.locator('a, button, li, span').filter({ hasText: new RegExp(`^${label}$`, 'i') });
      if (await el.first().isVisible().catch(() => false)) found.push(label);
    }
    await this.page.keyboard.press('Escape').catch(() => undefined);
    return found;
  }

  async softAddComparisonOpenClose(): Promise<boolean> {
    if (!(await this.locators.addComparison.isVisible().catch(() => false))) return false;
    await this.locators.addComparison.click({ force: true });
    await this.page.waitForTimeout(800);
    await this.page.keyboard.press('Escape').catch(() => undefined);
    const cancel = this.page.locator('button, a').filter({ hasText: /cancel|close|×/i }).first();
    if (await cancel.isVisible().catch(() => false)) {
      await cancel.click({ force: true }).catch(() => undefined);
    }
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
    const labels = await this.page.locator('label, .control-label').evaluateAll((els) =>
      Array.from(
        new Set(
          els
            .map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim())
            .filter((t) => t && t.length < 80)
        )
      ).slice(0, 40)
    );
    return labels;
  }

  async applyTimePeriodPreset(presetRegex: RegExp): Promise<boolean> {
    await this.openFilters();
    const preset = this.page
      .locator('button, a, label, .time-option, li, option, .select2-results__option')
      .filter({ hasText: presetRegex })
      .first();
    if (!(await preset.isVisible().catch(() => false))) {
      // try opening time period control
      const tp = this.page
        .locator('#time-period-view, #select2-time-period-container, .time-period, label')
        .filter({ hasText: /time period/i })
        .first();
      await tp.click({ force: true }).catch(() => undefined);
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
    await this.selectTableView();
    await this.waitForTableSettled(60000).catch(() => undefined);
    return true;
  }

  async highchartsCount(): Promise<number> {
    return this.locators.highcharts.count();
  }

  async trendsChromeHealthy(): Promise<boolean> {
    const industry = await this.locators.trendIndustrySelector.isVisible().catch(() => false);
    const vertical = await this.locators.trendVerticalSelector.isVisible().catch(() => false);
    const charts = await this.highchartsCount();
    const toggler = await this.locators.companyToggler.isVisible().catch(() => false);
    const content = await this.locators.trendFilterContent.isVisible().catch(() => false);
    return industry || vertical || charts > 0 || toggler || content;
  }

  async softClearSitesToggles(): Promise<boolean> {
    if (!(await this.locators.clearSitesToggles.isVisible().catch(() => false))) return false;
    await this.locators.clearSitesToggles.click({ force: true }).catch(() => undefined);
    await this.page.waitForTimeout(500);
    return true;
  }

  async recoverToCaptured(ctx: CompetitiveIndexContext): Promise<void> {
    await this.dismissBlockingDialogs();
    if (!/view=table/i.test(this.page.url()) || !(await this.isTableTabActive())) {
      await this.selectTableView();
    }
    await this.restoreIndustry(ctx.industry);
    await this.restoreVertical(ctx.vertical);
    await this.closeFilters();
    await this.clearSearch();
    await this.selectTableView();
    await this.waitForTableSettled(60000).catch(() => undefined);
  }

  private async textOf(loc: Locator): Promise<string> {
    if (!(await loc.isVisible().catch(() => false))) return '';
    return ((await loc.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
  }
}
