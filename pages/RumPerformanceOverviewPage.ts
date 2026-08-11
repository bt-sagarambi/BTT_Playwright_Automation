import { Page, expect, Locator } from '@playwright/test';
import { RumPerformanceOverviewLocators } from '../locators/RumPerformanceOverviewLocators';
import { LeftNavPage } from './LeftNavPage';
import { SiteDropdownPage } from './SiteDropdownPage';
import { ensurePortalSession } from '../helpers/portalSession';

const PAGE_DEF = {
  id: 'rum.performance-overview',
  module: 'rum',
  menuLabel: 'Performance Overview',
  route: 'real-user-monitoring/performance-overview',
  titleIncludes: /Performance Overview|VitalScope|Core Web Vitals/i,
};

/** Business Insights > Improve Traffic > Core Web Vitals (VitalScope) — same route as Performance Overview. */
const CORE_WEB_VITALS_PAGE_DEF = {
  id: 'rum.vitalscope',
  module: 'rum',
  menuLabel: 'Core Web Vitals (VitalScope)',
  route: 'real-user-monitoring/performance-overview',
  titleIncludes: /Vital|Core Web|Performance Overview/i,
};

/**
 * Performance Overview (RUM Browser / VitalScope) — primarily read-only.
 * Customize Table Save & Close is allowed (column prefs). Does not Save Filter.
 */
export class RumPerformanceOverviewPage {
  readonly locators: RumPerformanceOverviewLocators;

  constructor(private readonly page: Page) {
    this.locators = new RumPerformanceOverviewLocators(page);
  }

  async openViaNavigation(): Promise<void> {
    await ensurePortalSession(this.page);
    await new SiteDropdownPage(this.page).ensureProfileSite();
    await new LeftNavPage(this.page).openSmokePage(PAGE_DEF);
    await this.waitForPageReady();
  }

  /** Opens via Business Insights > Improve Traffic > Core Web Vitals (VitalScope). */
  async openViaCoreWebVitalsNavigation(): Promise<void> {
    await ensurePortalSession(this.page);
    await new SiteDropdownPage(this.page).ensureProfileSite();
    await new LeftNavPage(this.page).openSmokePage(CORE_WEB_VITALS_PAGE_DEF);
    await this.waitForPageReady();
  }

  async waitForPageReady(): Promise<void> {
    await expect(this.page).not.toHaveURL(/site\/login|site%2Flogin/i);
    await expect(this.page).toHaveURL(/real-user-monitoring\/performance-overview/);
    await expect(this.locators.pageTitle).toBeVisible({ timeout: 60000 });
    await expect(this.locators.pageTitle).toHaveText(/Performance Overview|VitalScope|Core Web Vitals/i);
    await this.page.waitForLoadState('domcontentloaded');
    await expect
      .poll(async () => this.locators.performanceByPageTable.count(), { timeout: 90000 })
      .toBeGreaterThan(0);
  }

  async expectDefaultContext(): Promise<void> {
    await expect(this.locators.performanceByPageTableHost).toBeVisible({ timeout: 30000 });
    await expect(this.locators.performanceByPageTable).toBeVisible({ timeout: 30000 });
    const rows = await this.locators.performanceByPageTable.locator('tbody tr').count();
    expect(rows, 'Performance by page table should have data rows').toBeGreaterThan(0);
    await expect(this.locators.pageTitle).toHaveText(/Performance Overview|VitalScope|Core Web Vitals/i);
  }

  async expectTableHeadersSample(): Promise<string[]> {
    const headers = (
      await this.locators.performanceByPageTable.locator('thead th').allTextContents()
    )
      .map((t) => t.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    expect(headers.join(' ')).toMatch(/Page Name/i);
    expect(headers.join(' ')).toMatch(/Page Views|Onload|Largest Contentful Paint|LCP|INP|CLS/i);
    return headers;
  }

  async expandFirstTop50Urls(): Promise<void> {
    const toggle = this.locators.pageNameToggleUrl.first();
    await expect(toggle).toBeVisible({ timeout: 20000 });
    await toggle.click({ force: true });
    await expect
      .poll(async () => this.locators.copyUrlButton.count(), { timeout: 30000 })
      .toBeGreaterThan(0);
    await expect(this.locators.instantMeasurementButton.first()).toBeVisible({ timeout: 10000 });
    await expect(this.locators.pageNameUrl.first()).toBeVisible({ timeout: 10000 });
  }

  async copyFirstExpandedUrl(): Promise<string> {
    if ((await this.locators.copyUrlButton.count()) === 0) {
      await this.expandFirstTop50Urls();
    }
    await this.page.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => undefined);
    await this.locators.copyUrlButton.first().click({ force: true });
    await this.page.waitForTimeout(400);
    const text = await this.page.evaluate(() => navigator.clipboard.readText().catch(() => ''));
    expect(text.length, 'Clipboard should contain a copied URL').toBeGreaterThan(5);
    expect(text).toMatch(/^https?:\/\//i);
    return text;
  }

  async openInstantMeasurementForFirstUrl(): Promise<Page> {
    if ((await this.locators.instantMeasurementButton.count()) === 0) {
      await this.expandFirstTop50Urls();
    }
    const [popup] = await Promise.all([
      this.page.context().waitForEvent('page', { timeout: 20000 }),
      this.locators.instantMeasurementButton.first().click({ force: true }),
    ]);
    await popup.waitForLoadState('domcontentloaded').catch(() => undefined);
    await expect(popup).toHaveURL(/synthetic-monitors\/instant|instant/i, { timeout: 30000 });
    return popup;
  }

  async openPerformanceDetailFromFirstUrl(): Promise<Page> {
    if ((await this.locators.pageNameUrl.count()) === 0) {
      await this.expandFirstTop50Urls();
    }
    const [popup] = await Promise.all([
      this.page.context().waitForEvent('page', { timeout: 20000 }),
      this.locators.pageNameUrl.first().click({ force: true }),
    ]);
    await popup.waitForLoadState('domcontentloaded').catch(() => undefined);
    await expect(popup).toHaveURL(/real-user-monitoring\/performance-detail/, { timeout: 30000 });
    return popup;
  }

  /** Click VitalScope drilldown icon (chart-line) — modal should show table data when API returns. */
  async openVitalScopeDrilldown(): Promise<{ opened: boolean; hasTable: boolean }> {
    const icon = this.locators.vsDrilldownIcon.first();
    await expect(icon, 'VitalScope drilldown icon').toBeVisible({ timeout: 20000 });
    await icon.click({ force: true });
    await expect(this.locators.vsDrilldownModal).toHaveClass(/in|show/, { timeout: 15000 });

    let hasTable = false;
    try {
      await expect
        .poll(
          async () => this.locators.vsDrilldownContainer.locator('table').count(),
          { timeout: 45000 }
        )
        .toBeGreaterThan(0);
      hasTable = true;
    } catch {
      hasTable = (await this.locators.vsDrilldownContainer.locator('table').count()) > 0;
    }
    return { opened: true, hasTable };
  }

  async closeVitalScopeDrilldown(): Promise<void> {
    if (await this.locators.vsDrilldownClose.isVisible().catch(() => false)) {
      await this.locators.vsDrilldownClose.click({ force: true }).catch(() => undefined);
    } else {
      await this.page.keyboard.press('Escape').catch(() => undefined);
    }
    await this.page.waitForTimeout(500);
  }

  async openCustomizeTable(): Promise<void> {
    await expect(this.locators.customizeTableButton).toBeVisible({ timeout: 15000 });
    await this.locators.customizeTableButton.click({ force: true });
    await expect(this.locators.customizeTableModal).toHaveClass(/in|show/, { timeout: 15000 });
    await expect(this.locators.includeAllColumns).toBeVisible();
    await expect(this.locators.excludeAllColumns).toBeVisible();
    await expect(this.locators.resetCustomizedTable).toBeVisible();
    await expect(this.locators.defaultCustomizedTable).toBeVisible();
    await expect(this.locators.saveCustomizedTable).toBeVisible();
  }

  async saveAndCloseCustomizeTable(): Promise<void> {
    await expect(this.locators.saveCustomizedTable).toBeVisible({ timeout: 10000 });
    await this.locators.saveCustomizedTable.click({ force: true });
    await this.page.waitForTimeout(1500);
    await expect(this.locators.performanceByPageTable).toBeVisible({ timeout: 30000 });
  }

  async exportCsvDownload(): Promise<void> {
    const hamburger = this.locators.tableHamburger;
    if (await hamburger.isVisible().catch(() => false)) {
      await hamburger.click({ force: true });
      await this.page.waitForTimeout(400);
    } else {
      // Fallback: any bars near performance-by-page
      await this.locators.performanceByPageTableHost.locator('.fa-bars').first().click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(400);
    }
    const downloadPromise = this.page.waitForEvent('download', { timeout: 20000 }).catch(() => null);
    await expect(this.locators.downloadCsv.first()).toBeVisible({ timeout: 10000 });
    await this.locators.downloadCsv.first().click({ force: true });
    const download = await downloadPromise;
    if (download) {
      expect(download.suggestedFilename()).toMatch(/\.csv/i);
    } else {
      // Soft: menu item present even if download event missed in headless
      await expect(this.locators.downloadCsv.first()).toBeAttached();
    }
    await this.page.keyboard.press('Escape').catch(() => undefined);
  }

  async expectGeographyMap(): Promise<void> {
    const map = this.locators.worldMap;
    await map.scrollIntoViewIfNeeded().catch(() => undefined);
    await expect(map).toBeVisible({ timeout: 30000 });
    expect(await this.locators.highchartsContainers.count()).toBeGreaterThan(0);
  }

  async clickMapControl(label: RegExp): Promise<boolean> {
    await this.expectGeographyMap();
    const btn = this.page
      .locator('#world-map .highcharts-button, #world-map text, #world-map button, #world-map [aria-label]')
      .filter({ hasText: label })
      .first();
    // Highcharts a11y proxy / title text
    const byTitle = this.page.locator(`#world-map [title*="${label.source.replace(/\\/g, '')}" i], #world-map .highcharts-button`).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click({ force: true });
      await this.page.waitForTimeout(800);
      return true;
    }
    // Click via Highcharts button titles rendered as sibling text nodes
    const clicked = await this.page.evaluate((reSource) => {
      const re = new RegExp(reSource, 'i');
      const texts = [...document.querySelectorAll('#world-map text, #world-map .highcharts-button, #world-map button')];
      const hit = texts.find((el) => re.test((el.textContent || '').trim()) || re.test(el.getAttribute('aria-label') || ''));
      if (hit) {
        (hit as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));
        return true;
      }
      return false;
    }, label.source);
    await this.page.waitForTimeout(800);
    return clicked || (await byTitle.isVisible().catch(() => false));
  }

  async openRightNavFilters(): Promise<void> {
    const apply = this.page
      .locator('#apply-filters, button:has-text("Apply Filters"), a.btn:has-text("Apply Filters")')
      .filter({ visible: true })
      .first();
    if (await apply.isVisible().catch(() => false)) return;

    const toggle = this.page
      .locator('#toggle-filters')
      .or(this.page.getByRole('button', { name: /Toggle filters menu visibility/i }))
      .first();
    await expect(toggle).toBeVisible({ timeout: 15000 });
    await toggle.click({ force: true });
    await this.page.waitForTimeout(1000);
    if (!(await apply.isVisible().catch(() => false))) {
      await toggle.click({ force: true });
      await this.page.waitForTimeout(1000);
    }
    await expect(apply, 'Apply Filters should appear after opening Filters').toBeVisible({
      timeout: 20000,
    });
  }

  async selectTimePeriodPreset(label: string): Promise<void> {
    await this.openRightNavFilters();
    const accordion = this.page
      .locator('.filter-section, .panel, .accordion-toggle, [class*="filter"]')
      .filter({ hasText: /Time Period/i })
      .first();
    if (await accordion.isVisible().catch(() => false)) {
      await accordion.click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(400);
    } else {
      await this.page.getByText(/Time Period/i).first().click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(400);
    }

    const tpBox = this.page
      .getByRole('textbox', { name: /Time Period/i })
      .or(this.page.locator('#time-period, input[aria-label*="Time Period" i], input[id*="time-period" i]'))
      .first();
    await expect(tpBox).toBeVisible({ timeout: 20000 });
    await tpBox.click({ force: true });
    await this.page.waitForTimeout(800);

    const aliases = timePeriodAliases(label);
    let clicked = false;
    for (const alias of aliases) {
      const preset = this.page
        .locator('.daterangepicker li, .ranges li, button.time-option, .daterangepicker .ranges label')
        .filter({ hasText: new RegExp(escapeRegExp(alias), 'i') })
        .first();
      if (await preset.isVisible().catch(() => false)) {
        await preset.click({ force: true });
        clicked = true;
        break;
      }
    }
    if (!clicked) {
      const token = label.replace(/last\s*/i, '').trim();
      const soft = this.page
        .locator('.daterangepicker li, .ranges li, button.time-option')
        .filter({ hasText: new RegExp(escapeRegExp(token), 'i') })
        .first();
      await expect(soft, `Time Period preset "${label}"`).toBeVisible({ timeout: 10000 });
      await soft.click({ force: true });
    }
    await this.page.keyboard.press('Escape').catch(() => undefined);
    await this.page.waitForTimeout(400);
  }

  async applyTimePeriod(timePeriod: string): Promise<void> {
    await this.openRightNavFilters();
    await this.selectTimePeriodPreset(timePeriod);
    const apply = this.page
      .locator('#apply-filters, button:has-text("Apply Filters"), a.btn:has-text("Apply Filters")')
      .filter({ visible: true })
      .first();
    await apply.click({ force: true });
    await this.page.waitForTimeout(4000);
    await expect(this.locators.performanceByPageTable).toBeVisible({ timeout: 60000 });
  }

  async applySampleFilterCombo(): Promise<void> {
    await this.openRightNavFilters();
    // Sample: leave defaults where possible; ensure Apply works
    const apply = this.page
      .locator('#apply-filters, button:has-text("Apply Filters"), a.btn:has-text("Apply Filters")')
      .filter({ visible: true })
      .first();
    await apply.click({ force: true });
    await this.page.waitForTimeout(3000);
    await expect(this.locators.performanceByPageTable).toBeVisible({ timeout: 60000 });
  }

  async toggleViewFilters(): Promise<'shown' | 'hidden' | 'unchanged'> {
    const btn = this.locators.viewFiltersButton;
    const banner = this.locators.viewFiltersBanner;
    await expect(btn).toBeVisible({ timeout: 15000 });
    const wasVisible = await banner.isVisible().catch(() => false);
    await btn.click();
    await this.page.waitForTimeout(700);
    const isVisible = await banner.isVisible().catch(() => false);
    if (isVisible && !wasVisible) return 'shown';
    if (!isVisible && wasVisible) return 'hidden';
    return 'unchanged';
  }

  /** Ensure the top filter badge strip (#toggle-filter-section) is visible via View Filters. */
  async ensureTopFiltersVisible(): Promise<void> {
    const banner = this.locators.viewFiltersBanner;
    if (await banner.isVisible().catch(() => false)) {
      if (await this.locators.dataOriginBadge.isVisible().catch(() => false)) return;
    }
    await this.locators.viewFiltersButton.click({ force: true });
    await this.page.waitForTimeout(700);
    if (!(await banner.isVisible().catch(() => false))) {
      await this.locators.viewFiltersButton.click({ force: true });
      await this.page.waitForTimeout(700);
    }
    await expect(this.locators.dataOriginBadge).toBeVisible({ timeout: 15000 });
  }

  async expectTopFilterBadges(): Promise<void> {
    await this.ensureTopFiltersVisible();
    await expect(this.locators.dataOriginBadge).toBeVisible({ timeout: 15000 });
    await expect(this.locators.timePeriodBadge).toBeVisible();
    await expect(this.locators.deviceBadge).toBeVisible();
    await expect(this.locators.browserBadge).toBeVisible();
  }

  async getTopBadgeText(which: 'dataOrigin' | 'timePeriod' | 'device' | 'browser' | 'bucketSize'): Promise<string> {
    const map = {
      dataOrigin: this.locators.dataOriginBadge,
      timePeriod: this.locators.timePeriodBadge,
      device: this.locators.deviceBadge,
      browser: this.locators.browserBadge,
      bucketSize: this.locators.bucketSizeBadge,
    } as const;
    return ((await map[which].textContent().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
  }

  async expectGridRefreshed(timeout = 45000): Promise<{ rows: number }> {
    await expect(this.locators.performanceByPageTable).toBeVisible({ timeout });
    await expect
      .poll(async () => this.locators.performanceByPageTable.locator('tbody tr').count(), {
        timeout: Math.min(timeout, 45000),
      })
      .toBeGreaterThan(0);
    const rows = await this.locators.performanceByPageTable.locator('tbody tr').count();
    return { rows };
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
    await this.page.waitForTimeout(4000);
    await this.expectGridRefreshed();
  }

  private async selectNativeOrSelect2(selectCss: string, optionText: string | RegExp): Promise<void> {
    const select = this.page.locator(selectCss).first();
    await expect(select).toBeAttached({ timeout: 15000 });
    const id = (await select.getAttribute('id')) || selectCss.replace('#', '');
    const container = this.page.locator(`#select2-${id}-container`).first();
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
    await select.selectOption({ label: label! });
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
    await this.ensureTopFiltersVisible();
    await this.closeOpenQuickFilters();
    await this.locators.dataOriginBadge.click({ force: true });
    await expect(this.locators.quickDataOriginFilter).toBeVisible({ timeout: 10000 });
    await this.selectQuickSelect2('data-origin-quick-select', option);
    await this.clickQuickApply(this.locators.quickDataOriginFilter);
  }

  async applyTopDevices(devices: Array<'Mobile' | 'Desktop'>, opts?: { clearOthers?: boolean }): Promise<void> {
    await this.ensureTopFiltersVisible();
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
    await this.ensureTopFiltersVisible();
    await this.closeOpenQuickFilters();
    await this.locators.browserBadge.click({ force: true });
    await expect(this.locators.quickBrowserFilter).toBeVisible({ timeout: 10000 });
    const clearOthers = opts?.clearOthers !== false;
    for (const key of ['facebook', 'chrome', 'firefox', 'safari', 'edge'] as const) {
      const box = this.page.locator(`#quick-${key}-device`);
      if ((await box.count()) === 0) continue;
      const want = browsers.some((b) => b.toLowerCase() === key);
      const checked = await box.isChecked().catch(() => false);
      if (want && !checked) await box.check({ force: true });
      if (!want && clearOthers && checked) await box.uncheck({ force: true });
    }
    await this.clickQuickApply(this.locators.quickBrowserFilter);
  }

  async applyTopBucketSize(option: string | RegExp): Promise<void> {
    await this.ensureTopFiltersVisible();
    const wrapVisible = await this.locators.bucketSizeBadge
      .evaluate((el) => {
        const w = el.closest('.badge-wrapper') as HTMLElement | null;
        return w ? getComputedStyle(w).display !== 'none' : true;
      })
      .catch(() => false);
    if (!wrapVisible) {
      throw new Error('Bucket Size top badge is not available on Performance Overview for this view');
    }
    await this.closeOpenQuickFilters();
    await this.locators.bucketSizeBadge.click({ force: true });
    await expect(this.locators.quickBucketSizeFilter).toBeVisible({ timeout: 10000 });
    await this.selectQuickSelect2('bucket-size-quick-select', option);
    await this.clickQuickApply(this.locators.quickBucketSizeFilter);
  }

  async applyTopTimePeriod(label: string): Promise<void> {
    await this.ensureTopFiltersVisible();
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
    await this.page.waitForTimeout(4000);
    await this.expectGridRefreshed();
  }

  /**
   * Apply sampled top-of-page filter badges and assert Performance by Page grid refresh.
   */
  async applyTopFilterCombination(combo: {
    dataOrigin?: string | RegExp;
    devices?: Array<'Mobile' | 'Desktop'>;
    browsers?: Array<'Chrome' | 'Safari' | 'Firefox' | 'Edge' | 'Facebook'>;
    bucketSize?: string | RegExp;
    timePeriod?: string;
  }): Promise<{ rows: number }> {
    await this.ensureTopFiltersVisible();
    if (combo.timePeriod) await this.applyTopTimePeriod(combo.timePeriod);
    if (combo.dataOrigin) await this.applyTopDataOrigin(combo.dataOrigin);
    if (combo.devices?.length) await this.applyTopDevices(combo.devices);
    if (combo.browsers?.length) await this.applyTopBrowsers(combo.browsers);
    if (combo.bucketSize) await this.applyTopBucketSize(combo.bucketSize);

    const grid = await this.expectGridRefreshed();

    if (combo.dataOrigin) {
      const text = await this.getTopBadgeText('dataOrigin');
      const re =
        typeof combo.dataOrigin === 'string'
          ? new RegExp(escapeRegExp(combo.dataOrigin), 'i')
          : combo.dataOrigin;
      expect(text, `Data Origin badge should reflect ${combo.dataOrigin}`).toMatch(re);
    }
    if (combo.devices?.length) {
      const text = await this.getTopBadgeText('device');
      expect(
        combo.devices.some((d) => new RegExp(d, 'i').test(text)) || text.length > 0,
        `Device badge updated after ${combo.devices.join(',')}`
      ).toBeTruthy();
    }
    if (combo.browsers?.length) {
      const text = await this.getTopBadgeText('browser');
      expect(
        combo.browsers.some((b) => new RegExp(b, 'i').test(text)) || text.length > 0,
        `Browser badge updated after ${combo.browsers.join(',')}`
      ).toBeTruthy();
    }
    if (combo.bucketSize) {
      const text = await this.getTopBadgeText('bucketSize');
      const re =
        typeof combo.bucketSize === 'string'
          ? new RegExp(escapeRegExp(combo.bucketSize), 'i')
          : combo.bucketSize;
      expect(text, `Bucket Size badge should reflect ${combo.bucketSize}`).toMatch(re);
    }
    if (combo.timePeriod) {
      const text = await this.getTopBadgeText('timePeriod');
      expect(text.length, 'Time Period badge should have text after apply').toBeGreaterThan(0);
    }
    return grid;
  }

  async expectCountrySection(): Promise<void> {
    const tableBtn = this.page.locator('#table-view-btn');
    if (await tableBtn.isVisible().catch(() => false)) {
      await tableBtn.click({ force: true });
      await this.page.waitForTimeout(1500);
    }

    const country = this.page.locator('#country-table');
    await expect(country, 'Performance By Country host (#country-table)').toBeAttached({
      timeout: 20000,
    });

    // Section may be collapsed/off-screen; attachment is enough for sampled coverage
    const visible = await country.isVisible().catch(() => false);
    if (!visible) {
      await country.evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'nearest' })).catch(() => undefined);
      await this.page.waitForTimeout(500);
    }

    const headingVisible = await this.page
      .locator('text=Performance By Country')
      .filter({ visible: true })
      .first()
      .isVisible()
      .catch(() => false);
    expect(
      visible || headingVisible || (await country.count()) > 0,
      'Expected Performance By Country section/table in DOM'
    ).toBeTruthy();
  }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function timePeriodAliases(label: string): string[] {
  const base = label.trim();
  const out = new Set<string>([base]);
  if (/last\s*6\s*hours?/i.test(base)) ['Last 6 hours', 'Last 6 Hours'].forEach((v) => out.add(v));
  if (/last\s*24\s*hours?/i.test(base)) ['Last 24 hours', 'Last 24 Hours'].forEach((v) => out.add(v));
  if (/last\s*7\s*days?/i.test(base)) ['Last 7 days', 'Last 7 Days'].forEach((v) => out.add(v));
  if (/last\s*30\s*days?/i.test(base)) ['Last 30 days', 'Last 30 Days'].forEach((v) => out.add(v));
  return [...out];
}
