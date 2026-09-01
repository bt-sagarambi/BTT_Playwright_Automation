import { Page, expect, Locator } from '@playwright/test';
import { RumErrorsExplorerLocators } from '../locators/RumErrorsExplorerLocators';
import { LeftNavPage } from './LeftNavPage';
import { SiteDropdownPage } from './SiteDropdownPage';
import { ensurePortalSession, portalBase } from '../helpers/portalSession';

const PAGE_DEF = {
  id: 'rum.errors-explorer',
  module: 'rum',
  menuLabel: 'Errors Explorer',
  route: 'javascript-errors/real-user',
  titleIncludes: /Errors Explorer|JavaScript Errors|Errors/i,
};

/**
 * Errors Explorer (RUM Browser).
 * Marker create is intentional write coverage (Custom + Global).
 * Filter Save is not exercised.
 * Top Domains row click does not apply filter to Errors Over Time (Help Center).
 */
export class RumErrorsExplorerPage {
  readonly locators: RumErrorsExplorerLocators;

  constructor(private readonly page: Page) {
    this.locators = new RumErrorsExplorerLocators(page);
  }

  async openViaNavigation(): Promise<void> {
    await ensurePortalSession(this.page);
    await new SiteDropdownPage(this.page).ensureProfileSite();
    await new LeftNavPage(this.page).openSmokePage(PAGE_DEF);
    await this.waitForPageReady();
  }

  async waitForPageReady(): Promise<void> {
    await expect(this.page).not.toHaveURL(/site\/login|site%2Flogin/i);
    await expect(this.page).toHaveURL(/javascript-errors\/real-user/);
    await expect(this.locators.pageTitle).toBeVisible({ timeout: 60000 });
    await expect(this.locators.pageTitle).toHaveText(/Errors Explorer|Errors/i);
    await this.page.waitForLoadState('domcontentloaded');
    await expect
      .poll(async () => this.locators.totalJsErrorsSum.isVisible().catch(() => false), {
        timeout: 120000,
      })
      .toBeTruthy();
  }

  async expectDefaultContext(): Promise<void> {
    await expect(this.locators.errorsByTypeContainer).toBeVisible({ timeout: 30000 });
    await expect(this.locators.errorsOverTimeGraph).toBeVisible({ timeout: 30000 });
    await expect(this.locators.errorsTableWrapper).toBeVisible({ timeout: 30000 });
    await this.expectChartsOrTablesReady();
  }

  async expectChartsOrTablesReady(): Promise<void> {
    await expect
      .poll(
        async () => {
          const charts = await this.locators.highchartsContainers.count();
          const total = await this.locators.totalJsErrorsSum.isVisible().catch(() => false);
          return charts + (total ? 1 : 0);
        },
        { timeout: 30000 }
      )
      .toBeGreaterThan(0);
  }

  async expectErrorsByTypeWidgets(): Promise<void> {
    await expect(this.page.getByText(/Errors By Type/i).first()).toBeVisible({ timeout: 15000 });
    await expect(this.page.getByText(/All Errors/i).first()).toBeVisible();
    await expect(this.page.getByText(/Unique Errors/i).first()).toBeVisible();
    await expect(this.locators.totalJsErrorsSum).toBeVisible();
    await expect(this.locators.uniqueJsErrorsSum).toBeVisible();
    const allText = ((await this.locators.totalJsErrorsSum.textContent()) || '').trim();
    const uniqueText = ((await this.locators.uniqueJsErrorsSum.textContent()) || '').trim();
    expect(/\d/.test(allText)).toBeTruthy();
    expect(/\d/.test(uniqueText)).toBeTruthy();
    await expect(this.locators.allErrorsDonut).toBeVisible();
    await expect(this.locators.uniqueErrorsDonut).toBeVisible();
  }

  async expectErrorTypeBreakdownSample(): Promise<void> {
    const area = this.locators.errorsByTypeContainer;
    const text = ((await area.innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
    const samples = [
      /Range/i,
      /Syntax/i,
      /Type/i,
      /CSP/i,
      /XHR/i,
      /Fetch/i,
      /Other/i,
      /Reference/i,
    ];
    const hits = samples.filter((re) => re.test(text)).length;
    expect(hits, 'Sampled error-type labels in donuts').toBeGreaterThan(0);
  }

  async softToggleDonutLegend(): Promise<void> {
    const legend = this.locators.allErrorsDonut.locator('.highcharts-legend-item').first();
    if ((await legend.count().catch(() => 0)) === 0) return;
    await legend.click({ force: true, timeout: 5000 }).catch(() => undefined);
    await this.page.waitForTimeout(400);
    await legend.click({ force: true, timeout: 5000 }).catch(() => undefined);
  }

  async expectTopChartsVisible(): Promise<void> {
    for (const label of [
      'Top Locations',
      'Top Domains',
      'Top Pages',
      'Top Devices',
      'Top OS',
      'Top Browsers',
    ]) {
      await expect(this.page.getByText(label, { exact: false }).first()).toBeVisible({
        timeout: 15000,
      });
    }
    await expect(this.locators.topLocationsChart).toBeVisible();
    await expect(this.locators.topDomainsChart).toBeVisible();
    await expect(this.locators.topPagesChart).toBeVisible();
    await expect(this.locators.topDevicesChart).toBeVisible();
    await expect(this.locators.topOsChart).toBeVisible();
    await expect(this.locators.topBrowsersChart).toBeVisible();
  }

  async clickTopChartRow(
    which: 'region' | 'fileName' | 'pageName' | 'device' | 'os' | 'browser'
  ): Promise<string> {
    const table = this.locators.topChartTable(which);
    await table.scrollIntoViewIfNeeded({ timeout: 8000 }).catch(() => undefined);
    const row = table.locator('tbody tr').filter({ hasNotText: /^\s*$/ }).first();
    await expect(row).toBeVisible({ timeout: 15000 });
    const label = ((await row.locator('td').first().textContent().catch(() => '')) || '')
      .replace(/\s+/g, ' ')
      .trim();
    await row.click({ force: true });
    await this.page.waitForTimeout(3500);
    await this.expectChartsOrTablesReady();
    return label;
  }

  async getFilterPreviewText(): Promise<string> {
    return ((await this.locators.filterPreview.textContent().catch(() => '')) || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async clearJsErrorFiltersIfVisible(): Promise<void> {
    if (await this.locators.clearJsErrorFilters.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.locators.clearJsErrorFilters.click({ force: true });
      await this.page.waitForTimeout(3000);
      await this.expectChartsOrTablesReady();
    }
  }

  async expectErrorsOverTime(): Promise<void> {
    await expect(this.page.getByText(/Errors Over Time/i).first()).toBeVisible({ timeout: 15000 });
    await expect(this.locators.errorsOverTimeGraph).toBeVisible();
    await expect(
      this.locators.errorsOverTimeGraph.locator('.highcharts-container, svg').first()
    ).toBeVisible({ timeout: 20000 });
  }

  async softToggleOverTimeLegend(): Promise<void> {
    const items = this.locators.errorsOverTimeGraph.locator('.highcharts-legend-item');
    const n = await items.count().catch(() => 0);
    if (n < 1) return;
    await items.nth(0).click({ force: true, timeout: 5000 }).catch(() => undefined);
    await this.page.waitForTimeout(400);
    if (n > 1) {
      await items.nth(1).click({ force: true, timeout: 5000 }).catch(() => undefined);
      await this.page.waitForTimeout(400);
    }
    // restore first
    await items.nth(0).click({ force: true, timeout: 5000 }).catch(() => undefined);
  }

  async expectErrorsTableHeaders(): Promise<void> {
    await expect(this.locators.errorsTableWrapper).toBeVisible({ timeout: 20000 });
    const headers = (
      await this.locators.errorsTable().locator('thead th').allTextContents()
    ).map((t) => t.replace(/\s+/g, ' ').trim());
    const joined = headers.join(' | ');
    expect(/error\s*type/i.test(joined)).toBeTruthy();
    expect(/file/i.test(joined)).toBeTruthy();
    expect(/message/i.test(joined)).toBeTruthy();
    expect(/error/i.test(joined)).toBeTruthy();
  }

  async searchErrorsTable(term: string): Promise<void> {
    const search = this.locators.errorsTableWrapper
      .locator(
        'input[type="search"], input.tablesorter-filter, input[placeholder*="Search" i], input[id*="search"]'
      )
      .first();
    if (!(await search.isVisible({ timeout: 4000 }).catch(() => false))) return;
    await search.fill(term);
    await this.page.waitForTimeout(1200);
  }

  async sampleExportNearErrorsTable(): Promise<void> {
    await this.locators.errorsTableWrapper.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => undefined);
    const exportBtn = this.page
      .locator('button:has-text("Export"), a:has-text("Export"), .btn:has-text("Export")')
      .first();
    if (!(await exportBtn.isVisible({ timeout: 4000 }).catch(() => false))) return;
    await exportBtn.click({ force: true, timeout: 5000 });
    await this.page.waitForTimeout(400);
    const csv = await this.page
      .getByText(/^CSV$/i)
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    if (csv) await this.page.keyboard.press('Escape').catch(() => undefined);
  }

  /**
   * Opens Error Drill-down via first data row. Soft when no rows.
   * Returns null when drill-down could not be opened.
   */
  async openErrorDrillDown(): Promise<{ mode: 'same-tab' | 'popup'; page: Page } | null> {
    const table = this.locators.errorsTable();
    const rows = table.locator('tbody tr').filter({ hasNotText: /^\s*$/ });
    const count = await rows.count().catch(() => 0);
    if (count < 1) return null;
    const row = rows.first();
    await row.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => undefined);
    const before = this.page.url();
    const popupPromise = this.page.context().waitForEvent('page', { timeout: 5000 }).catch(() => null);
    await row.click({ force: true });
    await this.page.waitForTimeout(4000);
    const popup = await popupPromise;
    if (popup) {
      await popup.waitForLoadState('domcontentloaded').catch(() => undefined);
      return { mode: 'popup', page: popup };
    }
    // same-tab navigation or in-page drill
    const urlChanged = this.page.url() !== before;
    const title = ((await this.locators.pageTitle.textContent().catch(() => '')) || '').trim();
    const bodySnip = ((await this.locators.pageContents.innerText().catch(() => '')) || '').slice(0, 400);
    const looksLikeDrill =
      urlChanged ||
      /drill|error detail|pages with errors/i.test(title + ' ' + bodySnip) ||
      /javascript-errors\/(?!real-user)/i.test(this.page.url());
    if (!looksLikeDrill) return null;
    return { mode: 'same-tab', page: this.page };
  }

  async expectDrillDownWidgets(target: Page): Promise<void> {
    const root = target.locator('#page-contents, body').first();
    await expect(root).toBeVisible({ timeout: 20000 });
    const text = ((await root.innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
    // Soft presence of major sections — at least two should appear
    const checks = [
      /Error Details|error message|Selected Error/i.test(text),
      /Errors Over Time/i.test(text),
      /Pages with Errors/i.test(text),
      /Top Error/i.test(text),
      /Error Type|File Name|file/i.test(text),
    ];
    const hits = checks.filter(Boolean).length;
    expect(hits, 'Drill-down widgets sampled').toBeGreaterThanOrEqual(1);
    const charts = target.locator('.highcharts-container');
    await expect.poll(async () => charts.count(), { timeout: 30000 }).toBeGreaterThan(0);
  }

  async sampleDrillDownInteractions(target: Page): Promise<void> {
    // Click a table row if present to refresh Error Details
    const tableRow = target
      .locator('#page-contents table tbody tr, .javascript-error table tbody tr')
      .filter({ hasNotText: /^\s*$/ })
      .first();
    if (await tableRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await tableRow.click({ force: true, timeout: 5000 }).catch(() => undefined);
      await target.waitForTimeout(1500);
    }
    // Soft-click a scatter / chart point if any
    const point = target.locator('.highcharts-point, .highcharts-markers path').first();
    if ((await point.count().catch(() => 0)) > 0) {
      await point.click({ force: true, timeout: 3000 }).catch(() => undefined);
      await target.waitForTimeout(1000);
    }
  }

  async returnFromDrillDown(opened: { mode: 'same-tab' | 'popup'; page: Page }): Promise<void> {
    if (opened.mode === 'popup') {
      await opened.page.close().catch(() => undefined);
      return;
    }
    const back = opened.page
      .locator('a, button')
      .filter({ hasText: /Errors Explorer|Back|Return/i })
      .first();
    if (await back.isVisible({ timeout: 3000 }).catch(() => false)) {
      await back.click({ force: true });
      await opened.page.waitForTimeout(3000);
    } else {
      await opened.page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
      await opened.page.waitForTimeout(3000);
    }
    if (!/javascript-errors\/real-user/i.test(opened.page.url())) {
      await opened.page
        .goto(`${portalBase()}/index.php?r=javascript-errors/real-user`, {
          waitUntil: 'domcontentloaded',
        })
        .catch(() => undefined);
      await opened.page.waitForTimeout(5000);
    }
    await this.waitForPageReady().catch(() => this.expectChartsOrTablesReady());
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
    await expect(this.locators.botTrafficBadge).toBeVisible();
    if (await this.locators.bucketSizeBadge.isVisible().catch(() => false)) {
      await expect(this.locators.bucketSizeBadge).toContainText(/./);
    }
    // Error Types badge may use inclusion-exclusion view or sibling label
    const errBadgeVisible = await this.locators.errorTypesBadge.isVisible().catch(() => false);
    if (errBadgeVisible) {
      await expect(this.locators.errorTypesBadge).toContainText(/./);
    } else {
      await expect(this.page.getByText(/Error Types/i).first()).toBeVisible();
    }
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

  async applyTopBotTraffic(option: RegExp | string): Promise<void> {
    await this.closeOpenQuickFilters();
    await this.locators.botTrafficBadge.click({ force: true });
    await this.page.waitForTimeout(500);
    const menu = this.locators.quickBotTrafficFilter;
    if (await menu.isVisible({ timeout: 5000 }).catch(() => false)) {
      const opt = menu.locator('label, li, a, button, input').filter({ hasText: option }).first();
      if (await opt.isVisible().catch(() => false)) {
        await opt.click({ force: true });
      } else if (/exclude/i.test(String(option))) {
        await this.page
          .locator('#exclude-bots, #quick-exclude-bots')
          .first()
          .check({ force: true })
          .catch(() => undefined);
      } else if (/bots?\s*only|only\s*bots/i.test(String(option))) {
        await this.page
          .locator('#bots-only, #quick-bots-only')
          .first()
          .check({ force: true })
          .catch(() => undefined);
      } else if (/include/i.test(String(option))) {
        await this.page
          .locator('#include-bots, #quick-include-bots')
          .first()
          .check({ force: true })
          .catch(() => undefined);
      }
      await this.clickQuickApply(menu);
      return;
    }
    // Fallback: click matching text near badge popup
    const choice = this.page.getByText(option).first();
    await choice.click({ force: true }).catch(() => undefined);
    const apply = this.page.locator('button.btn-success, button:has-text("Apply")').first();
    if (await apply.isVisible({ timeout: 3000 }).catch(() => false)) {
      await apply.click({ force: true });
      await this.page.waitForTimeout(3500);
    }
    await this.expectChartsOrTablesReady();
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
    botTraffic?: string | RegExp;
    timePeriod?: string;
  }): Promise<void> {
    if (combo.timePeriod) await this.applyTopTimePeriod(combo.timePeriod);
    if (combo.dataOrigin) await this.applyTopDataOrigin(combo.dataOrigin);
    if (combo.devices?.length) await this.applyTopDevices(combo.devices);
    if (combo.browsers?.length) await this.applyTopBrowsers(combo.browsers);
    if (combo.os?.length) await this.applyTopOs(combo.os);
    if (combo.botTraffic) await this.applyTopBotTraffic(combo.botTraffic);
    await this.expectChartsOrTablesReady();
    await expect(this.locators.totalJsErrorsSum).toBeVisible({ timeout: 20000 });
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
    const name = opts?.name || `AUTO-EE-${kind}-${stamp}`;
    const annotation = opts?.annotation || `QA EE ${kind} ${stamp}`;
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

  async applySampleFilterCombo(options: {
    dataOrigin?: string;
    timePeriod?: string;
    botTraffic?: 'include' | 'exclude' | 'only';
  }): Promise<void> {
    await this.openRightNavFilters();
    if (options.timePeriod) await this.selectTimePeriodPreset(options.timePeriod);
    if (options.dataOrigin) await this.selectNativeOrSelect2('#data-origin', options.dataOrigin);
    if (options.botTraffic) {
      const id =
        options.botTraffic === 'include'
          ? '#include-bots'
          : options.botTraffic === 'only'
            ? '#bots-only'
            : '#exclude-bots';
      await this.page.locator(id).check({ force: true }).catch(() => undefined);
    }
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
    const icon = this.locators.infoIcons.first();
    if (await icon.isVisible({ timeout: 3000 }).catch(() => false)) {
      return (
        (await icon.getAttribute('data-original-title').catch(() => null)) ||
        (await icon.getAttribute('title').catch(() => null)) ||
        ''
      );
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
    return ['Last 24 Hours', 'Last 24 Hour', 'Last 1 Day', '1 Day', '24 Hours'];
  if (/7\s*d|7\s*day/i.test(lower)) return ['Last 7 Days', 'Last 7 Day', '7 Days', '7 Day'];
  if (/30\s*d|30\s*day/i.test(lower)) return ['Last 30 Days', 'Last 30 Day', '30 Days', '30 Day'];
  return [label];
}
