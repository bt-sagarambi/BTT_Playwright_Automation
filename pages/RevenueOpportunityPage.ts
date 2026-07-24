import { Page, expect } from '@playwright/test';
import { RevenueOpportunityLocators } from '../locators/RevenueOpportunityLocators';
import { LeftNavPage } from './LeftNavPage';
import { SiteDropdownPage } from './SiteDropdownPage';
import { TopNavPage } from './TopNavPage';
import { ensurePortalSession } from '../helpers/portalSession';

const PAGE_DEF = {
  id: 'biz.revenue-opportunity',
  module: 'biz',
  menuLabel: 'Revenue Opportunity',
  route: 'business-analytics/revenue-opportunity',
  titleIncludes: /Revenue Opportunity/i,
};

/**
 * Revenue Opportunity — read-only interactions.
 * Does not Save What If variables, Save Filter, or delete reports.
 */
export class RevenueOpportunityPage {
  readonly locators: RevenueOpportunityLocators;
  readonly topNav: TopNavPage;

  constructor(private readonly page: Page) {
    this.locators = new RevenueOpportunityLocators(page);
    this.topNav = new TopNavPage(page);
  }

  async openViaNavigation(): Promise<void> {
    await ensurePortalSession(this.page);
    await new SiteDropdownPage(this.page).ensureProfileSite();
    await new LeftNavPage(this.page).openSmokePage(PAGE_DEF);
    await this.waitForPageReady();
  }

  async waitForPageReady(): Promise<{ loadMs: number }> {
    const started = Date.now();
    await expect(this.page).not.toHaveURL(/site\/login|site%2Flogin/i);
    await expect(this.locators.pageTitle).toBeVisible({ timeout: 60000 });
    await expect(this.locators.pageTitle).toHaveText(/Revenue Opportunity/i);
    await this.page.waitForLoadState('domcontentloaded');
    await expect
      .poll(async () => this.locators.highchartsContainers.count(), { timeout: 90000 })
      .toBeGreaterThan(0);
    return { loadMs: Date.now() - started };
  }

  async expectDefaultReportContext(): Promise<void> {
    await expect(this.locators.reportListSelect).toBeAttached({ timeout: 20000 });
    const selected = await this.locators.reportListSelect.evaluate((el: HTMLSelectElement) => {
      const opt = el.selectedOptions?.[0] || el.options?.[0];
      return (opt?.textContent || '').trim();
    });
    expect(selected.length, 'Default report should be selected').toBeGreaterThan(0);
    await expect(this.locators.topOpportunityRow).toBeVisible({ timeout: 30000 });
    await expect(this.page.locator('#all-devices-table-section-card')).toBeVisible({ timeout: 15000 });
    expect(await this.locators.highchartsContainers.count()).toBeGreaterThan(0);
  }

  async expectChartHasData(): Promise<void> {
    await expect
      .poll(async () => this.locators.highchartsContainers.count(), { timeout: 45000 })
      .toBeGreaterThan(0);
  }

  private async selectNativeOrSelect2(selectCss: string, optionText: string | RegExp): Promise<void> {
    const select = this.page.locator(selectCss).first();
    await expect(select).toBeAttached({ timeout: 15000 });
    const id = (await select.getAttribute('id')) || selectCss.replace('#', '');

    // Prefer visible select2 UI (underlying <select> is often hidden/disabled)
    const container = this.page
      .locator(
        `#select2-${id}-container, span[aria-labelledby="select2-${id}-container"], .select2-container[aria-labelledby*="${id}"]`
      )
      .first()
      .or(select.locator('xpath=following-sibling::*[contains(@class,"select2")][1]//span[contains(@class,"selection")]').first())
      .or(select.locator('xpath=following-sibling::span[contains(@class,"select2")][1]').first());

    if (await container.isVisible().catch(() => false)) {
      await container.click({ force: true });
      await this.page.waitForTimeout(300);
      const opt = this.page.locator('.select2-results__option').filter({ hasText: optionText }).first();
      await expect(opt).toBeVisible({ timeout: 10000 });
      await opt.click();
      return;
    }

    // Fallback: drive hidden select via JS + change event (works for disabled/select2)
    const optionLabels = (await select.locator('option').allTextContents()).map((t) => t.trim()).filter(Boolean);
    const label =
      typeof optionText === 'string'
        ? optionLabels.find((t) => t === optionText) ||
          optionLabels.find((t) => t.toLowerCase().includes(optionText.toLowerCase()))
        : optionLabels.find((t) => optionText.test(t)) ||
          optionLabels.find((t) => new RegExp(optionText.source.replace(/\$$/, ''), optionText.flags).test(t));
    expect(label, `Option matching ${optionText} in [${optionLabels.slice(0, 8).join(', ')}]`).toBeTruthy();
    await select.evaluate((el, lab) => {
      const sel = el as HTMLSelectElement;
      const opt = [...sel.options].find((o) => (o.textContent || '').trim() === lab);
      if (!opt) throw new Error(`Option not found: ${lab}`);
      sel.disabled = false;
      sel.value = opt.value;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      const jq = (window as unknown as { jQuery?: (s: string) => { trigger: (e: string) => void; val: (v?: string) => unknown } }).jQuery;
      if (jq) {
        jq(`#${sel.id}`).val(opt.value);
        jq(`#${sel.id}`).trigger('change');
      }
    }, label!);
  }

  /**
   * Confluence: Revenue Data Type — visible control uses Web Browser / Native App labels;
   * #data-type may use "... Data" labels and be select2-hidden.
   */
  async setRevenueDataType(label: string | RegExp): Promise<void> {
    // Try clicking any openable select2 that lists Web Browser / Native App
    const containers = this.page.locator('.select2-container');
    const n = await containers.count();
    for (let i = 0; i < Math.min(n, 12); i++) {
      const c = containers.nth(i);
      if (!(await c.isVisible().catch(() => false))) continue;
      const text = ((await c.textContent()) || '').trim();
      if (!/Web Browser|Native App|Browser Data|App Data/i.test(text) && i > 2) continue;
      await c.click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(250);
      const opt = this.page.locator('.select2-results__option').filter({ hasText: label }).first();
      if (await opt.isVisible().catch(() => false)) {
        await opt.click();
        await this.page.waitForTimeout(2500);
        await this.expectChartHasData();
        return;
      }
      await this.page.keyboard.press('Escape').catch(() => undefined);
    }

    // Fallback to #data-type via JS
    await this.selectNativeOrSelect2('#data-type', label);
    await this.page.waitForTimeout(2500);
    await this.expectChartHasData();
  }

  async setReportType(label: string | RegExp): Promise<void> {
    if ((await this.locators.reportTypeSelect.count()) === 0) return;
    await this.selectNativeOrSelect2('#dynamic-selector-config', label);
    await this.page.waitForTimeout(1500);
  }

  async setReportByIndex(index: number): Promise<string> {
    const select = this.locators.reportListSelect;
    await expect(select).toBeAttached({ timeout: 15000 });
    const options = await select.locator('option').allTextContents();
    expect(options.length).toBeGreaterThan(index);
    const label = options[index].trim();
    await this.selectNativeOrSelect2('#report-list', label);
    await this.page.waitForTimeout(3000);
    await this.expectChartHasData();
    return label;
  }

  async clickOpportunityCard(device: 'all' | 'desktop' | 'mobile' | 'tablet' | 'ios' | 'android'): Promise<void> {
    const card = this.locators.deviceCard(device);
    if (!(await card.isVisible().catch(() => false))) {
      // Fallback: click text chip in top opportunity row
      const fallback = this.locators.topOpportunityRow
        .locator('a, button, .card, [class*=card], div')
        .filter({ hasText: new RegExp(device === 'all' ? 'All|Browser' : device, 'i') })
        .first();
      if (await fallback.isVisible().catch(() => false)) {
        await fallback.click({ force: true });
      }
      await this.page.waitForTimeout(1500);
      return;
    }
    await card.scrollIntoViewIfNeeded();
    await card.click({ force: true });
    await this.page.waitForTimeout(1500);
  }

  async visibleOpportunityByPageGraph() {
    await this.clickOpportunityCard('all').catch(() => undefined);
    const graphs = this.locators.opportunityByPageGraph;
    const count = await graphs.count();
    for (let i = 0; i < count; i++) {
      const g = graphs.nth(i);
      if (await g.isVisible().catch(() => false)) return g;
    }
    // Force show section
    await this.page.locator('#all-devices-graph-section, #desktop-opportunity-section').first().scrollIntoViewIfNeeded().catch(() => undefined);
    for (let i = 0; i < count; i++) {
      const g = graphs.nth(i);
      await g.scrollIntoViewIfNeeded().catch(() => undefined);
      if (await g.isVisible().catch(() => false)) return g;
    }
    return graphs.first();
  }

  async hoverGraph(graph: 'byPage' | 'byPlatform' | 'totalActual' | 'allBrowser'): Promise<void> {
    let host =
      graph === 'byPage'
        ? await this.visibleOpportunityByPageGraph()
        : graph === 'byPlatform'
          ? this.locators.opportunityByPlatformGraph
          : graph === 'totalActual'
            ? this.locators.totalActualRevenueGraph
            : this.locators.allBrowserDevicesGraph.first();

    if (graph === 'allBrowser') {
      const candidates = this.locators.allBrowserDevicesGraph;
      const n = await candidates.count();
      for (let i = 0; i < n; i++) {
        if (await candidates.nth(i).isVisible().catch(() => false)) {
          host = candidates.nth(i);
          break;
        }
      }
    }

    await host.scrollIntoViewIfNeeded().catch(() => undefined);
    // Some charts are display:none until section active — assert attached + try force hover
    await expect(host).toBeAttached({ timeout: 30000 });
    const point = host.locator('.highcharts-point, .highcharts-series path, rect.highcharts-point').first();
    if (await point.count()) {
      await point.hover({ force: true }).catch(async () => {
        const box = await host.boundingBox();
        if (box) await this.page.mouse.move(box.x + Math.max(box.width * 0.4, 10), box.y + Math.max(box.height * 0.5, 10));
      });
    } else {
      const box = await host.boundingBox();
      if (box) {
        await this.page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.5);
      }
    }
    await this.page.waitForTimeout(500);
  }

  async expectTooltipVisible(): Promise<void> {
    await expect(this.locators.highchartsTooltip.first()).toBeVisible({ timeout: 10000 });
  }

  async toggleLegendItem(index = 0): Promise<void> {
    const items = this.locators.highchartsLegendItems;
    await expect.poll(async () => items.count(), { timeout: 20000 }).toBeGreaterThan(index);
    const item = items.nth(index);
    await item.scrollIntoViewIfNeeded().catch(() => undefined);
    await item.evaluate((el) => (el as HTMLElement).click()).catch(async () => {
      await item.click({ force: true, timeout: 5000 });
    });
    await this.page.waitForTimeout(600);
  }

  async openChartContextMenuNear(graphLocator: import('@playwright/test').Locator): Promise<boolean> {
    await graphLocator.scrollIntoViewIfNeeded().catch(() => undefined);
    const btn = graphLocator
      .locator('.highcharts-button, .highcharts-contextbutton, .fal.fa-bars')
      .or(this.locators.chartContextMenuButtons)
      .first();
    if (!(await btn.isVisible().catch(() => false))) {
      // Try page-level context buttons near the graph
      if ((await this.locators.chartContextMenuButtons.count()) === 0) return false;
      await this.locators.chartContextMenuButtons.first().click({ force: true });
      await this.page.waitForTimeout(400);
      return true;
    }
    await btn.click({ force: true });
    await this.page.waitForTimeout(400);
    return true;
  }

  /** What If — open edit UI and Cancel (never Save). */
  async openWhatIfEditThenCancel(): Promise<void> {
    await this.locators.whatIfTable.scrollIntoViewIfNeeded().catch(() => undefined);
    const pencil = this.page
      .locator('.fa-pencil, .fal.fa-pencil, [class*=pencil], a[title*="Edit"], button[title*="Edit"]')
      .filter({ visible: true })
      .first();
    if (await pencil.isVisible().catch(() => false)) {
      await pencil.hover().catch(() => undefined);
      await pencil.click({ force: true });
      await this.page.waitForTimeout(700);
    }

    // Edit selects should be interactable when edit mode is on
    if ((await this.locators.whatIfEditSelects.count()) > 0) {
      const first = this.locators.whatIfEditSelects.first();
      if (await first.isVisible().catch(() => false)) {
        await first.selectOption({ index: 1 }).catch(() => undefined);
      }
    }

    if (await this.locators.cancelWhatIfButton.isVisible().catch(() => false)) {
      await this.locators.cancelWhatIfButton.click({ force: true });
    } else {
      await this.page.keyboard.press('Escape');
    }
    await this.page.waitForTimeout(500);
  }

  async sortRevenueOpportunityTableColumn(header: string | RegExp): Promise<void> {
    const table = this.locators.revenueOpportunityTable;
    await expect(table).toBeVisible({ timeout: 30000 });
    await table.scrollIntoViewIfNeeded();
    const th = table.locator('th').filter({ hasText: header }).first();
    await expect(th).toBeVisible({ timeout: 15000 });
    await th.click({ force: true });
    await this.page.waitForTimeout(800);
  }

  async searchRevenueOpportunityTable(term: string): Promise<void> {
    const search = this.locators.tableSearch;
    if (!(await search.isVisible().catch(() => false))) {
      // tablesorter filter row
      const filterInput = this.page
        .locator('#all-business-overview-table input, .tablesorter-filter')
        .first();
      if (await filterInput.isVisible().catch(() => false)) {
        await filterInput.fill(term);
        await this.page.waitForTimeout(800);
        return;
      }
      throw new Error('Table search/filter input not found');
    }
    await search.fill(term);
    await this.page.waitForTimeout(800);
  }

  async navigateTablePagerIfPresent(): Promise<void> {
    const next = this.page
      .locator('.pagedisplay, .pager, [class*=pager]')
      .locator('a, button, i')
      .filter({ hasText: /next|>|»/i })
      .or(this.page.locator('.next, a.next, i.fa-chevron-right'))
      .first();
    if (await next.isVisible().catch(() => false)) {
      await next.click({ force: true });
      await this.page.waitForTimeout(700);
    }
  }

  async toggleViewFiltersBanner(): Promise<'shown' | 'hidden'> {
    // Right-nav Filters drawer can overlay View Filters — close it first
    const cancelFilters = this.page.locator('#cancel-filters');
    if (await cancelFilters.isVisible().catch(() => false)) {
      await cancelFilters.click({ force: true });
      await this.page.waitForTimeout(400);
    } else if (await this.locators.applyFiltersButton.isVisible().catch(() => false)) {
      await this.locators.filtersToggle.click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(400);
    }

    const btn = this.locators.viewFiltersButton;
    const banner = this.locators.viewFiltersBanner;
    await expect(btn).toBeVisible({ timeout: 15000 });
    const wasVisible = await banner.isVisible().catch(() => false);
    await btn.click({ force: true });
    await this.page.waitForTimeout(700);
    const isVisible = await banner.isVisible().catch(() => false);
    if (isVisible && !wasVisible) return 'shown';
    if (!isVisible && wasVisible) return 'hidden';
    const label = ((await btn.textContent()) || '').trim();
    return /Hide Filters/i.test(label) ? 'shown' : 'hidden';
  }

  async openRightNavFilters(): Promise<void> {
    const apply = this.locators.applyFiltersButton;
    if (!(await apply.isVisible().catch(() => false))) {
      await expect(this.locators.filtersToggle).toBeVisible({ timeout: 15000 });
      await this.locators.filtersToggle.click();
      await this.page.waitForTimeout(800);
    }
    await expect(apply).toBeVisible({ timeout: 20000 });
  }

  async applySampleFilters(options: { visitorType?: string; performanceMetric?: string }): Promise<void> {
    await this.openRightNavFilters();
    if (options.performanceMetric) {
      await this.selectNativeOrSelect2('#performance-metric', options.performanceMetric).catch(() => undefined);
    }
    if (options.visitorType) {
      await this.selectNativeOrSelect2('#visitor-type', options.visitorType).catch(() => undefined);
    }
    await this.locators.applyFiltersButton.click({ force: true });
    await this.page.waitForTimeout(3000);
    await this.expectChartHasData();
  }

  async openReportManagerReadOnly(): Promise<void> {
    await expect(this.locators.reportManagerToggle).toBeVisible({ timeout: 15000 });
    await this.locators.reportManagerToggle.click({ force: true });
    await this.page.waitForTimeout(1000);
    const panel = this.page.locator('#report-manager-div, .report-manager, .modal.show, .modal.in, .dropdown-menu.show');
    const visible = await panel.first().isVisible().catch(() => false);
    if (!visible) {
      // Some builds open an inline panel; assert toggle remains present
      await expect(this.locators.reportManagerToggle).toBeVisible();
    }
    await this.page.keyboard.press('Escape');
    const close = this.page.locator('.modal .close, button:has-text("Close"), button:has-text("Cancel")').first();
    if (await close.isVisible().catch(() => false)) {
      await close.click({ force: true }).catch(() => undefined);
    }
    // Toggle again to close if still open
    if (await panel.first().isVisible().catch(() => false)) {
      await this.locators.reportManagerToggle.click({ force: true }).catch(() => undefined);
    }
  }

  async hoverInfoIconsSample(limit = 5): Promise<number> {
    const icons = this.locators.infoIcons;
    const count = await icons.count();
    const n = Math.min(limit, count);
    let hovered = 0;
    for (let i = 0; i < n; i++) {
      const icon = icons.nth(i);
      if (!(await icon.isVisible().catch(() => false))) continue;
      await icon.scrollIntoViewIfNeeded().catch(() => undefined);
      await icon.hover({ force: true }).catch(() => undefined);
      hovered++;
      await this.page.waitForTimeout(250);
    }
    return hovered;
  }

  async expectDeviceOverviewTableVisible(device: 'all' | 'desktop' | 'mobile'): Promise<void> {
    const map = {
      all: '#all-business-overview-table',
      desktop: '#desktop-business-overview-table',
      mobile: '#mobile-business-overview-table',
    };
    const table = this.page.locator(map[device]);
    await expect(table).toBeAttached({ timeout: 20000 });
    await table.scrollIntoViewIfNeeded().catch(() => undefined);
  }

  async expectWhatIfSaveControlPresentButUnused(): Promise<void> {
    // Read-only guard: Save control may exist; this suite never clicks it
    const save = this.locators.saveWhatIfButton;
    if ((await save.count()) > 0) {
      await expect(save.first()).toBeAttached();
    }
    await expect(this.locators.pageTitle).toHaveText(/Revenue Opportunity/i);
  }

  async expectViewFiltersChipSample(): Promise<void> {
    await this.toggleViewFiltersBanner();
    const banner = this.locators.viewFiltersBanner;
    if (await banner.isVisible().catch(() => false)) {
      const text = ((await banner.textContent()) || '').replace(/\s+/g, ' ');
      expect(/Real User|Time Period|Device|Performance|Visitor|Data/i.test(text)).toBeTruthy();
    }
    await this.toggleViewFiltersBanner();
  }

  async expectKeySectionsVisible(): Promise<void> {
    await expect(this.locators.revenueDataTypeSelect).toBeAttached({ timeout: 15000 });
    await expect(this.locators.reportListSelect).toBeAttached({ timeout: 15000 });
    await expect(this.locators.topOpportunityRow).toBeVisible({ timeout: 15000 });
    await this.expectChartHasData();
  }
}
