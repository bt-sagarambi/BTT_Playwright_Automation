import { Page, expect, Locator } from '@playwright/test';
import { RumBounceExitAnalysisLocators } from '../locators/RumBounceExitAnalysisLocators';
import { LeftNavPage } from './LeftNavPage';
import { SiteDropdownPage } from './SiteDropdownPage';
import { ensurePortalSession, portalBase } from '../helpers/portalSession';

const PAGE_DEF = {
  id: 'rum.bounce-exit',
  module: 'rum',
  menuLabel: 'Bounce & Exit Analysis',
  route: 'real-user-monitoring/bounce-and-exit-analysis',
  titleIncludes: /Bounce|Exit/i,
};

/**
 * Bounce & Exit Analysis (RUM Browser).
 * Marker create is intentional write coverage (Custom + Global).
 * Filter Save is not exercised.
 */
export class RumBounceExitAnalysisPage {
  readonly locators: RumBounceExitAnalysisLocators;

  constructor(private readonly page: Page) {
    this.locators = new RumBounceExitAnalysisLocators(page);
  }

  async openViaNavigation(): Promise<void> {
    await ensurePortalSession(this.page);
    await new SiteDropdownPage(this.page).ensureProfileSite();
    await new LeftNavPage(this.page).openSmokePage(PAGE_DEF);
    await this.waitForPageReady();
  }

  async waitForPageReady(): Promise<void> {
    await expect(this.page).not.toHaveURL(/site\/login|site%2Flogin/i);
    await expect(this.page).toHaveURL(/real-user-monitoring\/bounce-and-exit-analysis/);
    await expect(this.locators.pageTitle).toBeVisible({ timeout: 60000 });
    await expect(this.locators.pageTitle).toHaveText(/Bounce|Exit/i);
    await this.page.waitForLoadState('domcontentloaded');
    await expect
      .poll(async () => this.locators.highchartsContainers.count(), { timeout: 120000 })
      .toBeGreaterThan(0);
  }

  async expectDefaultContext(): Promise<void> {
    await expect(this.locators.bounceRateCard).toBeVisible({ timeout: 30000 });
    await expect(this.locators.bounceAverageRateBtn).toBeVisible();
    await expect(this.locators.bounceRateOnloadBtn).toBeVisible();
    await this.expectChartsOrTablesReady();
  }

  async expectChartsOrTablesReady(): Promise<void> {
    await expect
      .poll(
        async () => {
          const charts = await this.locators.highchartsContainers.count();
          const cards = await this.locators.bounceRateCard.isVisible().catch(() => false);
          return charts + (cards ? 1 : 0);
        },
        { timeout: 30000 }
      )
      .toBeGreaterThan(0);
  }

  async expectMetricSummaryCards(): Promise<void> {
    for (const card of [
      this.locators.bounceRateCard,
      this.locators.bounceNumberCard,
      this.locators.exitRateCard,
      this.locators.pageExitRateCard,
      this.locators.exitNumberCard,
      this.locators.pagesCard,
      this.locators.pagesPerVisitorCard,
      this.locators.onloadCard,
    ]) {
      await expect(card).toBeVisible({ timeout: 15000 });
      const text = ((await card.textContent().catch(() => '')) || '').trim();
      expect(text.length, 'Metric card should show content').toBeGreaterThan(0);
    }
    await expect(this.page.getByText(/Conversion Rate/i).first()).toBeVisible({ timeout: 10000 });
    await expect(this.page.getByText(/# of Sessions|# OF SESSIONS/i).first()).toBeVisible();
  }

  async sampleExitRateTooltips(): Promise<{ session?: string; page?: string }> {
    const tipFrom = async (card: Locator): Promise<string | undefined> => {
      const direct = await card.getAttribute('data-original-title', { timeout: 2000 }).catch(() => null);
      if (direct) return direct;
      const child = card.locator('[data-original-title], .fa-info-circle, [data-toggle="tooltip"]').first();
      if (!(await child.count().catch(() => 0))) return undefined;
      return (
        (await child.getAttribute('data-original-title', { timeout: 2000 }).catch(() => null)) ||
        (await child.getAttribute('title', { timeout: 2000 }).catch(() => null)) ||
        undefined
      );
    };
    const session = await tipFrom(this.locators.exitRateCard);
    const pageTip = await tipFrom(this.locators.pageExitRateCard);
    const infoNearExit = this.locators.exitRateCard
      .locator('.fa-info-circle, [data-toggle="tooltip"]')
      .first();
    if ((await infoNearExit.count().catch(() => 0)) > 0) {
      await infoNearExit.hover({ force: true, timeout: 3000 }).catch(() => undefined);
    }
    return { session: session || undefined, page: pageTip || undefined };
  }

  async toggleTopFiltersPanel(): Promise<'expanded' | 'collapsed' | 'unchanged'> {
    const btn = this.locators.pageControlsToggle;
    await expect(btn).toBeVisible({ timeout: 15000 });
    const chevronDown = await btn.locator('.glyphicon-chevron-down').count();
    await btn.click({ force: true });
    await this.page.waitForTimeout(700);
    const chevronDownAfter = await btn.locator('.glyphicon-chevron-down').count();
    if (chevronDown && !chevronDownAfter) return 'collapsed';
    if (!chevronDown && chevronDownAfter) return 'expanded';
    const up = await btn.locator('.glyphicon-chevron-up').count();
    if (up) return 'collapsed';
    return 'unchanged';
  }

  async expectTopFilterBadges(): Promise<void> {
    await expect(this.locators.dataOriginBadge).toBeVisible({ timeout: 15000 });
    await expect(this.locators.timePeriodBadge).toBeVisible();
    await expect(this.locators.deviceBadge).toBeVisible();
    await expect(this.locators.browserBadge).toBeVisible();
    await expect(this.locators.osBadge).toBeVisible();
    await expect(this.locators.bucketSizeBadge).toBeVisible();
    await expect(this.locators.performanceMetricBadge).toBeVisible();
    if (await this.locators.discardSessionsBadge.isVisible().catch(() => false)) {
      await expect(this.locators.discardSessionsBadge).toContainText(/./);
    }
  }

  async getTopBadgeText(
    which:
      | 'dataOrigin'
      | 'timePeriod'
      | 'device'
      | 'browser'
      | 'os'
      | 'bucketSize'
      | 'performanceMetric'
  ): Promise<string> {
    const map = {
      dataOrigin: this.locators.dataOriginBadge,
      timePeriod: this.locators.timePeriodBadge,
      device: this.locators.deviceBadge,
      browser: this.locators.browserBadge,
      os: this.locators.osBadge,
      bucketSize: this.locators.bucketSizeBadge,
      performanceMetric: this.locators.performanceMetricBadge,
    } as const;
    return ((await map[which].textContent().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
  }

  private async closeOpenQuickFilters(): Promise<void> {
    await this.page.keyboard.press('Escape').catch(() => undefined);
    await this.page.waitForTimeout(200);
    await this.page
      .evaluate(() => {
        document.querySelectorAll('.flex-dropdown').forEach((el) => {
          (el as HTMLElement).style.display = 'none';
        });
      })
      .catch(() => undefined);
  }

  private async clickQuickApply(menu: Locator): Promise<void> {
    const apply = menu.locator('button.btn-success, button:has-text("Apply")').first();
    await expect(apply).toBeVisible({ timeout: 10000 });
    await apply.click({ force: true });
    await this.page.waitForTimeout(3500);
    await this.expectChartsOrTablesReady();
  }

  private async selectQuickSelect2(selectId: string, optionText: string | RegExp): Promise<void> {
    const container = this.page.locator(`#select2-${selectId}-container`).first();
    if (await container.isVisible().catch(() => false)) {
      await container.click({ force: true });
      await this.page.waitForTimeout(300);
      const opt = this.page.locator('.select2-results__option').filter({ hasText: optionText }).first();
      await expect(opt).toBeVisible({ timeout: 10000 });
      await opt.click();
      return;
    }
    await this.selectNativeOrSelect2(`#${selectId}`, optionText);
  }

  async applyTopDataOrigin(option: string | RegExp): Promise<void> {
    await this.closeOpenQuickFilters();
    await this.locators.dataOriginBadge.click({ force: true });
    await expect(this.locators.quickDataOriginFilter).toBeVisible({ timeout: 10000 });
    await this.selectQuickSelect2('data-origin-quick-select', option);
    await this.clickQuickApply(this.locators.quickDataOriginFilter);
  }

  async applyTopDevices(devices: Array<'Mobile' | 'Desktop'>, opts?: { clearOthers?: boolean }): Promise<void> {
    await this.closeOpenQuickFilters();
    await this.locators.deviceBadge.click({ force: true });
    await expect(this.locators.quickDeviceFilter).toBeVisible({ timeout: 10000 });
    const clearOthers = opts?.clearOthers !== false;
    for (const id of ['quick-mobile-device', 'quick-desktop-device'] as const) {
      const box = this.page.locator(`#${id}`);
      const want =
        (id === 'quick-mobile-device' && devices.includes('Mobile')) ||
        (id === 'quick-desktop-device' && devices.includes('Desktop'));
      const checked = await box.isChecked().catch(() => false);
      if (want && !checked) await box.check({ force: true });
      if (!want && clearOthers && checked) await box.uncheck({ force: true });
    }
    await this.clickQuickApply(this.locators.quickDeviceFilter);
  }

  async applyTopBrowsers(
    browsers: Array<'Chrome' | 'Safari' | 'Firefox' | 'Edge' | 'Facebook'>,
    opts?: { clearOthers?: boolean }
  ): Promise<void> {
    await this.closeOpenQuickFilters();
    await this.locators.browserBadge.click({ force: true });
    await expect(this.locators.quickBrowserFilter).toBeVisible({ timeout: 10000 });
    const clearOthers = opts?.clearOthers !== false;
    for (const key of ['facebook', 'chrome', 'firefox', 'safari', 'edge'] as const) {
      const box = this.page.locator(`#quick-${key}-device`);
      const want = browsers.some((b) => b.toLowerCase() === key);
      const checked = await box.isChecked().catch(() => false);
      if (want && !checked) await box.check({ force: true });
      if (!want && clearOthers && checked) await box.uncheck({ force: true });
    }
    await this.clickQuickApply(this.locators.quickBrowserFilter);
  }

  async applyTopOs(
    systems: Array<'Macintosh' | 'Android' | 'Windows' | 'iOS' | 'Linux'>,
    opts?: { clearOthers?: boolean }
  ): Promise<void> {
    await this.closeOpenQuickFilters();
    await this.locators.osBadge.click({ force: true });
    await expect(this.locators.quickOsFilter).toBeVisible({ timeout: 10000 });
    const clearOthers = opts?.clearOthers !== false;
    const map: Record<string, string> = {
      Macintosh: 'quick-macintosh-device',
      Android: 'quick-android-device',
      Windows: 'quick-windows-device',
      iOS: 'quick-ios-device',
      Linux: 'quick-linux-device',
    };
    for (const [label, id] of Object.entries(map)) {
      const box = this.page.locator(`#${id}`);
      const want = systems.includes(label as (typeof systems)[number]);
      const checked = await box.isChecked().catch(() => false);
      if (want && !checked) await box.check({ force: true });
      if (!want && clearOthers && checked) await box.uncheck({ force: true });
    }
    await this.clickQuickApply(this.locators.quickOsFilter);
  }

  async applyTopBucketSize(option: string | RegExp): Promise<void> {
    await this.closeOpenQuickFilters();
    await this.locators.bucketSizeBadge.click({ force: true });
    await expect(this.locators.quickBucketSizeFilter).toBeVisible({ timeout: 10000 });
    await this.selectQuickSelect2('bucket-size-quick-select', option);
    await this.clickQuickApply(this.locators.quickBucketSizeFilter);
  }

  async applyTopTimePeriod(label: string): Promise<void> {
    await this.closeOpenQuickFilters();
    await this.locators.timePeriodBadge.click({ force: true });
    await this.page.waitForTimeout(600);
    const aliases = timePeriodAliases(label);
    let clicked = false;
    for (const alias of aliases) {
      const preset = this.page
        .locator('.daterangepicker li, .ranges li')
        .filter({ hasText: new RegExp(escapeRegExp(alias), 'i') })
        .first();
      if (await preset.isVisible().catch(() => false)) {
        await preset.click({ force: true });
        clicked = true;
        break;
      }
    }
    expect(clicked, `Top Time Period preset "${label}"`).toBeTruthy();
    const apply = this.page
      .locator('.daterangepicker button.applyBtn, .daterangepicker button:has-text("Apply")')
      .first();
    if (await apply.isVisible().catch(() => false)) await apply.click({ force: true });
    await this.page.waitForTimeout(3500);
    await this.expectChartsOrTablesReady();
  }

  async applyTopFilterCombination(combo: {
    dataOrigin?: string | RegExp;
    devices?: Array<'Mobile' | 'Desktop'>;
    browsers?: Array<'Chrome' | 'Safari' | 'Firefox' | 'Edge' | 'Facebook'>;
    os?: Array<'Macintosh' | 'Android' | 'Windows' | 'iOS' | 'Linux'>;
    bucketSize?: string | RegExp;
    timePeriod?: string;
  }): Promise<void> {
    if (combo.timePeriod) await this.applyTopTimePeriod(combo.timePeriod);
    if (combo.dataOrigin) await this.applyTopDataOrigin(combo.dataOrigin);
    if (combo.devices?.length) await this.applyTopDevices(combo.devices);
    if (combo.browsers?.length) await this.applyTopBrowsers(combo.browsers);
    if (combo.os?.length) await this.applyTopOs(combo.os);
    if (combo.bucketSize) await this.applyTopBucketSize(combo.bucketSize);
    await this.expectChartsOrTablesReady();
    await expect(this.locators.bounceRateCard).toBeVisible({ timeout: 20000 });
  }

  async openMarkersMenu(): Promise<void> {
    await expect(this.locators.markersContainer).toBeVisible({ timeout: 15000 });
    await this.locators.markerDropdownTitle.click({ force: true });
    await this.page.waitForTimeout(300);
    await this.locators.markerDropdown.evaluate((el: HTMLElement) => {
      el.style.display = 'block';
    });
    await expect(this.locators.markerDropdownItems.first()).toBeVisible({ timeout: 10000 });
  }

  async selectMarkerMenuOption(label: string | RegExp): Promise<void> {
    await this.openMarkersMenu();
    await this.locators.markerOption(label).click({ force: true });
    await this.page.waitForTimeout(800);
  }

  async openCreateMarkerTab(kind: 'custom' | 'global'): Promise<Page> {
    const label = kind === 'custom' ? /Create Custom Marker/i : /Create Global Marker/i;
    await this.openMarkersMenu();
    const [popup] = await Promise.all([
      this.page.context().waitForEvent('page', { timeout: 20000 }),
      this.locators.markerOption(label).click({ force: true }),
    ]);
    await popup.waitForLoadState('domcontentloaded').catch(() => undefined);
    if (kind === 'custom') {
      await expect(popup).toHaveURL(/site-level-events\/create/, { timeout: 30000 });
    } else {
      await expect(popup).toHaveURL(/global-level-events\/create/, { timeout: 30000 });
    }
    return popup;
  }

  async createMarkerRecord(
    kind: 'custom' | 'global',
    opts?: { name?: string; annotation?: string }
  ): Promise<{ name: string; popup: Page }> {
    const stamp = Date.now();
    const name = opts?.name || `AUTO-BE-${kind}-${stamp}`;
    const annotation = opts?.annotation || `QA BE ${kind} ${stamp}`;
    const popup = await this.openCreateMarkerTab(kind);
    await expect(popup.locator('#event-name')).toBeVisible({ timeout: 20000 });
    await popup.locator('#event-name').fill(name);
    await popup.locator('#annotation').fill(annotation);
    await popup.locator('#site-event-markers-create').click({ force: true });
    await popup.waitForTimeout(4000);
    const onList = /site-level-events|global-level-events/i.test(popup.url()) && !/\/create/i.test(popup.url());
    if (!onList) {
      const indexRoute = kind === 'custom' ? 'site-level-events/index' : 'global-level-events/index';
      await popup
        .goto(`${portalBase()}/index.php?r=${indexRoute}`, {
          waitUntil: 'domcontentloaded',
        })
        .catch(() => undefined);
      await popup.waitForTimeout(3000);
    }
    await this.searchMarkerInPage(popup, name);
    return { name, popup };
  }

  async searchMarkerInPage(target: Page, name: string): Promise<void> {
    const search = target
      .locator(
        'input[type="search"], input.tablesorter-filter, input[placeholder*="Search" i], #table-search, input[id*="search"]'
      )
      .first();
    if (await search.isVisible().catch(() => false)) {
      await search.fill(name);
      await target.waitForTimeout(1200);
    }
    await expect(target.getByText(name, { exact: false }).first()).toBeVisible({ timeout: 30000 });
  }

  async selectOverTimeTab(
    which: 'average' | 'bounce' | 'sessionExit' | 'pageExit'
  ): Promise<void> {
    const map = {
      average: this.locators.bounceAverageRateBtn,
      bounce: this.locators.bounceRateBtn,
      sessionExit: this.locators.exitRateBtn,
      pageExit: this.locators.pageExitRateBtn,
    } as const;
    await map[which].click({ force: true });
    await this.page.waitForTimeout(2000);
    await this.expectChartsOrTablesReady();
  }

  async selectOverTimeView(mode: 'graph' | 'table'): Promise<void> {
    const btn = mode === 'graph' ? this.locators.graphTimeBtn : this.locators.tableTimeBtn;
    await btn.click({ force: true });
    await this.page.waitForTimeout(1500);
  }

  async selectOnloadTab(
    which: 'average' | 'bounce' | 'sessionExit' | 'pageExit'
  ): Promise<void> {
    const map = {
      average: this.locators.bounceRateOnloadBtn,
      bounce: this.locators.bouncePageOnloadBtn,
      sessionExit: this.locators.exitRateOnloadBtn,
      pageExit: this.locators.pageExitRateOnloadBtn,
    } as const;
    await map[which].click({ force: true });
    await this.page.waitForTimeout(2000);
    await this.expectChartsOrTablesReady();
  }

  async selectOnloadView(mode: 'graph' | 'table'): Promise<void> {
    const btn = mode === 'graph' ? this.locators.graphCurveBtn : this.locators.tableCurveBtn;
    await btn.click({ force: true });
    await this.page.waitForTimeout(1500);
  }

  async expectAverageOverTimeTableHeaders(): Promise<void> {
    await this.selectOverTimeTab('average');
    await this.selectOverTimeView('table');
    await expect(this.locators.bounceRateOverTimeAverageTable).toBeVisible({ timeout: 20000 });
    const headers = (
      await this.locators.bounceRateOverTimeAverageTable.locator('thead th').allTextContents()
    ).map((t) => t.replace(/\s+/g, ' ').trim());
    for (const h of ['Date', 'Onload', 'Bounce Rate', 'Session Exit Rate', 'Page Exit Rate']) {
      expect(headers.some((x) => new RegExp(h, 'i').test(x)), `header ${h}`).toBeTruthy();
    }
  }

  async expectOnloadCurveTableHeaders(): Promise<void> {
    await this.selectOnloadTab('average');
    await this.selectOnloadView('table');
    await expect(this.locators.bounceRateCurveTable).toBeVisible({ timeout: 20000 });
    const headers = (
      await this.locators.bounceRateCurveTable.locator('thead th').allTextContents()
    ).map((t) => t.replace(/\s+/g, ' ').trim());
    for (const h of ['Seconds', 'Sessions', 'Bounce Rate']) {
      expect(headers.some((x) => new RegExp(h, 'i').test(x)), `curve header ${h}`).toBeTruthy();
    }
  }

  async expectOverview7DayTable(): Promise<{ redOrGreen: boolean }> {
    const toggle = this.locators.toggle7DayTable.first();
    if (await toggle.isVisible().catch(() => false)) {
      await toggle.click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(1000);
    }
    await this.locators.bounceRateOverviewTable.scrollIntoViewIfNeeded().catch(() => undefined);
    await expect(this.locators.bounceRateOverviewTable).toBeVisible({ timeout: 20000 });
    await expect(this.page.getByText(/Bounce Rate and Onload|Previous 7 Days|30 Day Average/i).first()).toBeVisible();
    const colored = await this.locators.bounceRateOverviewTable
      .locator('td .text-danger, td .text-success, td.red, td.green, [style*="color"], .worse, .better')
      .count()
      .catch(() => 0);
    return { redOrGreen: colored > 0 };
  }

  async sampleExportNear(table: Locator): Promise<void> {
    await table.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => undefined);
    const exportBtn = this.page
      .locator('button:has-text("Export"), a:has-text("Export"), .btn:has-text("Export")')
      .first();
    const visible = await exportBtn.isVisible({ timeout: 4000 }).catch(() => false);
    if (!visible) return;
    await exportBtn.click({ force: true, timeout: 5000 });
    await this.page.waitForTimeout(400);
    const csvVisible = await this.page
      .getByText(/^CSV$/i)
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    if (csvVisible) {
      await this.page.keyboard.press('Escape').catch(() => undefined);
    }
  }

  async openRightNavFilters(): Promise<void> {
    const apply = this.page
      .locator('#apply-filters, button:has-text("Apply Filters"), a.btn:has-text("Apply Filters")')
      .filter({ visible: true })
      .first();
    if (await apply.isVisible().catch(() => false)) return;
    await expect(this.locators.filtersToggle).toBeVisible({ timeout: 15000 });
    await this.locators.filtersToggle.click({ force: true });
    await this.page.waitForTimeout(1000);
    if (!(await apply.isVisible().catch(() => false))) {
      await this.locators.filtersToggle.click({ force: true });
      await this.page.waitForTimeout(1000);
    }
    await expect(apply).toBeVisible({ timeout: 20000 });
  }

  private async selectNativeOrSelect2(selectCss: string, optionText: string | RegExp): Promise<void> {
    const select = this.page.locator(selectCss).first();
    await expect(select).toBeAttached({ timeout: 15000 });
    const id = (await select.getAttribute('id')) || selectCss.replace('#', '');
    const container = this.page
      .locator(`#select2-${id}-container, span[aria-labelledby*="${id}"]`)
      .first();
    if (await container.isVisible().catch(() => false)) {
      await container.click({ force: true });
      await this.page.waitForTimeout(300);
      const opt = this.page.locator('.select2-results__option').filter({ hasText: optionText }).first();
      await expect(opt).toBeVisible({ timeout: 10000 });
      await opt.click();
      return;
    }
    const labels = (await select.locator('option').allTextContents()).map((t) => t.trim()).filter(Boolean);
    const label =
      typeof optionText === 'string'
        ? labels.find((t) => t === optionText) ||
          labels.find((t) => t.toLowerCase().includes(optionText.toLowerCase()))
        : labels.find((t) => optionText.test(t));
    expect(label, `Option ${optionText} in ${selectCss}`).toBeTruthy();
    await select.selectOption({ label: label! }).catch(async () => {
      await select.evaluate((el, lab) => {
        const sel = el as HTMLSelectElement;
        const opt = [...sel.options].find((o) => (o.textContent || '').trim() === lab);
        if (!opt) throw new Error(`missing ${lab}`);
        sel.value = opt.value;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }, label!);
    });
  }

  async selectTimePeriodPreset(label: string): Promise<void> {
    await this.openRightNavFilters();
    const tpBox = this.page.locator('#time-period').first();
    await expect(tpBox).toBeVisible({ timeout: 20000 });
    await tpBox.click({ force: true });
    await this.page.waitForTimeout(800);
    const aliases = timePeriodAliases(label);
    let clicked = false;
    for (const alias of aliases) {
      const preset = this.page
        .locator('.daterangepicker li, .ranges li')
        .filter({ hasText: new RegExp(escapeRegExp(alias), 'i') })
        .first();
      if (await preset.isVisible().catch(() => false)) {
        await preset.click({ force: true });
        clicked = true;
        break;
      }
    }
    expect(clicked, `Time Period "${label}"`).toBeTruthy();
    await this.page.keyboard.press('Escape').catch(() => undefined);
  }

  async clickApplyFilters(): Promise<void> {
    const apply = this.page
      .locator('#apply-filters, button:has-text("Apply Filters")')
      .filter({ visible: true })
      .first();
    await apply.click({ force: true });
    await this.page.waitForTimeout(5000);
  }

  async applySampleFilterCombo(options: { dataOrigin?: string; timePeriod?: string }): Promise<void> {
    await this.openRightNavFilters();
    if (options.timePeriod) await this.selectTimePeriodPreset(options.timePeriod);
    if (options.dataOrigin) await this.selectNativeOrSelect2('#data-origin', options.dataOrigin);
    await this.clickApplyFilters();
    await this.expectChartsOrTablesReady();
  }

  async applyTimePeriod(timePeriod: string): Promise<void> {
    await this.openRightNavFilters();
    await this.selectTimePeriodPreset(timePeriod);
    await this.clickApplyFilters();
    await this.expectChartsOrTablesReady();
  }

  async sampleInfoTooltip(): Promise<string> {
    const tips = [
      await this.locators.exitRateCard.getAttribute('data-original-title').catch(() => null),
      await this.locators.pageExitRateCard.getAttribute('data-original-title').catch(() => null),
      await this.locators.bounceAverageRateBtn.getAttribute('data-original-title').catch(() => null),
    ].filter(Boolean) as string[];
    if (tips.length) return tips[0];
    const icon = this.locators.infoIcons.first();
    if (await icon.isVisible().catch(() => false)) {
      return (await icon.getAttribute('data-original-title').catch(() => null)) || '';
    }
    return '';
  }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function timePeriodAliases(label: string): string[] {
  const lower = label.toLowerCase();
  if (/6\s*h|6\s*hour/i.test(lower)) return ['Last 6 Hours', 'Last 6 Hour', '6 Hours', '6 Hour'];
  if (/24\s*h|1\s*day|24\s*hour/i.test(lower))
    return ['Last 24 Hours', 'Last 24 Hour', '1 Day', 'Last 1 Day', '24 Hours'];
  if (/7\s*d|7\s*day/i.test(lower)) return ['Last 7 Days', 'Last 7 Day', '7 Days'];
  if (/30\s*d|30\s*day/i.test(lower)) return ['Last 30 Days', 'Last 30 Day', '30 Days'];
  return [label];
}
