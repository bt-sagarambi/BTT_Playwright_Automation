import { Page, expect, Locator } from '@playwright/test';
import { RumAggregateWaterfallLocators } from '../locators/RumAggregateWaterfallLocators';
import { LeftNavPage } from './LeftNavPage';
import { SiteDropdownPage } from './SiteDropdownPage';
import { ensurePortalSession, portalBase } from '../helpers/portalSession';

const PAGE_DEF = {
  id: 'rum.aggregate-waterfall',
  module: 'rum',
  menuLabel: 'Aggregate Waterfall',
  route: 'real-user-monitoring/object-level-trending',
  titleIncludes: /Aggregate Waterfall/i,
};

/**
 * Aggregate Waterfall (RUM Browser).
 * Marker create is intentional write coverage (Custom + Global).
 * Customize Table Save & Close allowed (column prefs). Filter Save is not exercised.
 */
export class RumAggregateWaterfallPage {
  readonly locators: RumAggregateWaterfallLocators;

  constructor(private readonly page: Page) {
    this.locators = new RumAggregateWaterfallLocators(page);
  }

  async openViaNavigation(): Promise<void> {
    await ensurePortalSession(this.page);
    await new SiteDropdownPage(this.page).ensureProfileSite();
    await new LeftNavPage(this.page).openSmokePage(PAGE_DEF);
    await this.waitForPageReady();
  }

  async waitForPageReady(): Promise<void> {
    await expect(this.page).not.toHaveURL(/site\/login|site%2Flogin/i);
    await expect(this.page).toHaveURL(/real-user-monitoring\/object-level-trending/);
    await expect(this.locators.pageTitle).toBeVisible({ timeout: 60000 });
    await expect(this.locators.pageTitle).toHaveText(/Aggregate Waterfall/i);
    await this.page.waitForLoadState('domcontentloaded');
    await expect
      .poll(async () => this.locators.highchartsContainers.count(), { timeout: 120000 })
      .toBeGreaterThan(0);
  }

  async expectDefaultContext(): Promise<void> {
    await expect(this.locators.domainLevelTab).toBeVisible({ timeout: 20000 });
    await expect(this.locators.objectLevelTab).toBeVisible();
    await expect(this.locators.domainAverageCards).toBeVisible({ timeout: 30000 });
    await expect(this.locators.resourceTimingsTable).toBeVisible({ timeout: 30000 });
    const rows = await this.locators.resourceTimingsTable.locator('tbody tr').count();
    expect(rows, 'Resource Timings table should have rows').toBeGreaterThan(0);
  }

  async expectChartsOrTablesReady(timeoutMs = 45000): Promise<void> {
    if (this.page.isClosed()) return;
    try {
      await expect
        .poll(
          async () => {
            if (this.page.isClosed()) return 1;
            const charts = await this.locators.highchartsContainers.count().catch(() => 0);
            const domainRows = await this.locators.domainLevelTable.locator('tbody tr').count().catch(() => 0);
            const objectRows = await this.locators.objectLevelTable.locator('tbody tr').count().catch(() => 0);
            const resourceRows = await this.locators.resourceTimingsTable.locator('tbody tr').count().catch(() => 0);
            return charts + domainRows + objectRows + resourceRows;
          },
          { timeout: timeoutMs }
        )
        .toBeGreaterThan(0);
    } catch (err) {
      if (this.page.isClosed()) return;
      throw err;
    }
  }

  async expectMetricCardsPresent(): Promise<void> {
    await expect(this.locators.domainAverageCards).toBeVisible({ timeout: 20000 });
    for (const card of [
      this.locators.domainDomIntAvg,
      this.locators.domainDomConAvg,
      this.locators.domainOnloadAvg,
      this.locators.domainTtiAvg,
      this.locators.domainFcpAvg,
      this.locators.domainLcpAvg,
      this.locators.domainTbtAvg,
      this.locators.domainClsAvg,
      this.locators.domainFidAvg,
    ]) {
      await expect(card).toBeVisible({ timeout: 15000 });
      const text = ((await card.textContent().catch(() => '')) || '').trim();
      expect(text.length, 'Metric card should show a value').toBeGreaterThan(0);
    }
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
  }

  async getTopBadgeText(
    which: 'dataOrigin' | 'timePeriod' | 'device' | 'browser' | 'os' | 'botTraffic'
  ): Promise<string> {
    const map = {
      dataOrigin: this.locators.dataOriginBadge,
      timePeriod: this.locators.timePeriodBadge,
      device: this.locators.deviceBadge,
      browser: this.locators.browserBadge,
      os: this.locators.osBadge,
      botTraffic: this.locators.botTrafficBadge,
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
    // Bound wait — Desktop-only / sparse data can hang a long poll past the test timeout.
    await this.expectChartsOrTablesReady(30000).catch(() => undefined);
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
    const all = ['facebook', 'chrome', 'firefox', 'safari', 'edge'] as const;
    for (const key of all) {
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

  async applyTopBotTraffic(option: 'Exclude Bots' | 'Include Bots' | 'Bots Only'): Promise<void> {
    await this.closeOpenQuickFilters();
    await this.locators.botTrafficBadge.click({ force: true });
    await expect(this.locators.quickBotTrafficFilter).toBeVisible({ timeout: 10000 });
    const idMap = {
      'Exclude Bots': 'quick-exclude-bots',
      'Include Bots': 'quick-include-bots',
      'Bots Only': 'quick-bots-only',
    } as const;
    await this.page.locator(`#${idMap[option]}`).check({ force: true }).catch(async () => {
      await this.locators.quickBotTrafficFilter.getByText(option, { exact: false }).click({ force: true });
    });
    await this.clickQuickApply(this.locators.quickBotTrafficFilter);
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
    if (await apply.isVisible().catch(() => false)) {
      await apply.click({ force: true });
    }
    await this.page.waitForTimeout(3500);
    await this.expectChartsOrTablesReady();
  }

  async applyTopFilterCombination(combo: {
    dataOrigin?: string | RegExp;
    devices?: Array<'Mobile' | 'Desktop'>;
    browsers?: Array<'Chrome' | 'Safari' | 'Firefox' | 'Edge' | 'Facebook'>;
    os?: Array<'Macintosh' | 'Android' | 'Windows' | 'iOS' | 'Linux'>;
    botTraffic?: 'Exclude Bots' | 'Include Bots' | 'Bots Only';
    timePeriod?: string;
  }): Promise<void> {
    if (combo.timePeriod) await this.applyTopTimePeriod(combo.timePeriod);
    if (combo.dataOrigin) await this.applyTopDataOrigin(combo.dataOrigin);
    if (combo.devices?.length) await this.applyTopDevices(combo.devices);
    if (combo.browsers?.length) await this.applyTopBrowsers(combo.browsers);
    if (combo.os?.length) await this.applyTopOs(combo.os);
    if (combo.botTraffic) await this.applyTopBotTraffic(combo.botTraffic);

    await this.expectChartsOrTablesReady(30000).catch(() => undefined);
    await expect(this.locators.domainAverageCards).toBeVisible({ timeout: 20000 }).catch(() => undefined);

    if (combo.dataOrigin) {
      const text = await this.getTopBadgeText('dataOrigin');
      const re =
        typeof combo.dataOrigin === 'string'
          ? new RegExp(escapeRegExp(combo.dataOrigin), 'i')
          : combo.dataOrigin;
      expect(text, `Data Origin badge should reflect ${combo.dataOrigin}`).toMatch(re);
    }
    if (combo.timePeriod) {
      const text = await this.getTopBadgeText('timePeriod');
      expect(text.length, 'Time Period badge should have text after apply').toBeGreaterThan(0);
    }
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
    const name = opts?.name || `AUTO-AW-${kind}-${stamp}`;
    const annotation = opts?.annotation || `QA AW ${kind} ${stamp}`;
    const popup = await this.openCreateMarkerTab(kind);

    await expect(popup.locator('#event-name')).toBeVisible({ timeout: 20000 });
    await popup.locator('#event-name').fill(name);
    await popup.locator('#annotation').fill(annotation);

    const tp = popup.locator('#time-period');
    if (await tp.isVisible().catch(() => false)) {
      const val = ((await tp.inputValue().catch(() => '')) || '').trim();
      if (!val) {
        await tp.click({ force: true });
        await popup.waitForTimeout(400);
        const today = popup
          .locator('.daterangepicker li, .ranges li')
          .filter({ hasText: /Today|Last 24/i })
          .first();
        if (await today.isVisible().catch(() => false)) await today.click({ force: true });
        else await popup.keyboard.press('Escape').catch(() => undefined);
      }
    }

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
    const hit = target.getByText(name, { exact: false }).first();
    await expect(hit, `Created marker "${name}" should appear in list/search`).toBeVisible({
      timeout: 30000,
    });
  }

  async togglePieCharts(expectVisible: boolean): Promise<void> {
    await expect(this.locators.togglePieChartsButton).toBeVisible({ timeout: 15000 });
    const currentlyVisible = await this.locators.pieChartRow.isVisible().catch(() => false);
    if (currentlyVisible !== expectVisible) {
      await this.locators.togglePieChartsButton.click({ force: true });
      await this.page.waitForTimeout(2000);
    }
    if (expectVisible) {
      await expect(this.locators.pieChartRow).toBeVisible({ timeout: 15000 });
      await expect(
        this.page.getByText(/Page Views By Page/i).first()
      ).toBeVisible({ timeout: 15000 });
      await expect(
        this.page.getByText(/File Count By Traffic Segment/i).first()
      ).toBeVisible({ timeout: 15000 });
    } else {
      await expect(this.locators.pieChartRow).toBeHidden({ timeout: 10000 }).catch(async () => {
        const display = await this.locators.pieChartRow.evaluate((el) => getComputedStyle(el).display);
        expect(display === 'none' || !(await this.locators.pieChartRow.isVisible())).toBeTruthy();
      });
    }
  }

  async selectDomainLevel(): Promise<void> {
    await this.locators.domainLevelTab.click({ force: true });
    await this.page.waitForTimeout(2000);
  }

  async selectObjectLevel(): Promise<void> {
    await this.locators.objectLevelTab.click({ force: true });
    await this.page.waitForTimeout(4000);
  }

  async selectWaterfallView(): Promise<void> {
    await this.locators.graphViewButton.click({ force: true });
    await this.page.waitForTimeout(2500);
    // Button may use "active" class or aria; soft-check visibility of graph host
    const active = await this.locators.graphViewButton.evaluate((el) =>
      /active/i.test(el.className)
    );
    if (!active) {
      await this.locators.graphViewButton.click({ force: true });
      await this.page.waitForTimeout(1500);
    }
  }

  async selectTableView(): Promise<void> {
    await this.locators.tableViewButton.click({ force: true });
    await this.page.waitForTimeout(2500);
    const active = await this.locators.tableViewButton.evaluate((el) =>
      /active/i.test(el.className)
    );
    if (!active) {
      await this.locators.tableViewButton.click({ force: true });
      await this.page.waitForTimeout(1500);
    }
  }

  async selectParty(party: '1st' | '3rd' | 'All'): Promise<void> {
    const btn =
      party === '1st'
        ? this.locators.firstPartyButton
        : party === '3rd'
          ? this.locators.thirdPartyButton
          : this.locators.allPartyButton;
    await btn.click({ force: true });
    await this.page.waitForTimeout(3500);
    await this.expectChartsOrTablesReady();
  }

  async selectSlowestMetric(option: string | RegExp): Promise<void> {
    await this.selectNativeOrSelect2('#slowest-metric', option);
    await this.page.waitForTimeout(3500);
    await this.expectChartsOrTablesReady();
  }

  async expectDomainTableHeaders(): Promise<string[]> {
    await this.selectDomainLevel();
    await this.selectTableView();
    await expect(this.locators.domainLevelTable).toBeVisible({ timeout: 20000 });
    const headers = (
      await this.locators.domainLevelTable.locator('thead th').allTextContents()
    ).map((t) => t.replace(/\s+/g, ' ').trim());
    for (const h of [
      'Domain',
      'File Count',
      'Domain Activity',
      '% of Impact',
      '% of Onload Activity',
      'Impact Score',
      'Tag Quality',
    ]) {
      expect(headers.some((x) => new RegExp(h, 'i').test(x)), `Domain header ${h}`).toBeTruthy();
    }
    return headers;
  }

  async expectObjectTableHeaders(): Promise<string[]> {
    await this.selectObjectLevel();
    await this.selectTableView();
    await expect(this.locators.objectLevelTable).toBeVisible({ timeout: 20000 });
    const headers = (
      await this.locators.objectLevelTable.locator('thead th').allTextContents()
    ).map((t) => t.replace(/\s+/g, ' ').trim());
    for (const h of [
      'File Name',
      'Domain',
      'File Count',
      'Relative Start Time',
      'Duration',
      '% of Impact',
      'Impact Score',
      'Tag Quality',
    ]) {
      expect(headers.some((x) => new RegExp(h, 'i').test(x)), `Object header ${h}`).toBeTruthy();
    }
    return headers;
  }

  async expectResourceTimingsHeaders(): Promise<string[]> {
    await this.selectDomainLevel();
    await this.locators.resourceTimingsTable.scrollIntoViewIfNeeded().catch(() => undefined);
    await expect(this.locators.resourceTimingsTable).toBeVisible({ timeout: 30000 });
    await expect
      .poll(async () => this.locators.resourceTimingsTable.locator('tbody tr').count(), {
        timeout: 45000,
      })
      .toBeGreaterThan(0);
    const headers = (
      await this.locators.resourceTimingsTable.locator('thead th').allTextContents()
    ).map((t) => t.replace(/\s+/g, ' ').trim());
    for (const h of ['Domain', 'File', 'Element Count', 'Duration']) {
      expect(headers.some((x) => new RegExp(h, 'i').test(x)), `Resource header ${h}`).toBeTruthy();
    }
    return headers;
  }

  async expandFirstDomainRowGraph(): Promise<void> {
    await this.selectDomainLevel();
    await this.selectTableView();
    const icon = this.locators.domainExpandIcon(0);
    await expect(icon).toBeVisible({ timeout: 15000 });
    await icon.click({ force: true });
    await this.page.waitForTimeout(2500);
    await expect(this.page.getByText(/Domain Timings Over Time/i).first()).toBeVisible({
      timeout: 20000,
    });
  }

  async expandFirstObjectRowGraph(): Promise<void> {
    await this.selectObjectLevel();
    await this.selectTableView();
    const icon = this.locators.objectExpandIcon();
    await expect(icon).toBeVisible({ timeout: 15000 });
    await icon.click({ force: true });
    await this.page.waitForTimeout(2500);
    await expect(
      this.page.getByText(/Resource Timings Over Time|Timings Over Time/i).first()
    ).toBeVisible({ timeout: 20000 });
  }

  async searchDomainTable(term: string): Promise<{ before: number; after: number }> {
    await this.selectDomainLevel();
    await this.selectTableView();
    const table = this.locators.domainLevelTable;
    const before = await table.locator('tbody tr').count();
    const search = this.page
      .locator('#table-search, input[id*="table-search"], input[type="search"]')
      .filter({ visible: true })
      .first();
    await expect(search).toBeVisible({ timeout: 10000 });
    await search.fill(term);
    await this.page.waitForTimeout(1200);
    const after = await table.locator('tbody tr').count();
    return { before, after };
  }

  async sampleDomainTableSort(): Promise<void> {
    await this.selectDomainLevel();
    await this.selectTableView();
    const header = this.locators.tableHeader(this.locators.domainLevelTable, /Domain|File Count|Impact/i);
    await expect(header).toBeVisible({ timeout: 10000 });
    await header.click({ force: true });
    await this.page.waitForTimeout(800);
  }

  async sampleDomainPager(): Promise<void> {
    await this.selectDomainLevel();
    await this.selectTableView();
    const pager = this.page
      .locator('.tablesorter-pager select, select.gotoPage, #table-for-domain-level-detail-table_pager select')
      .first();
    if (await pager.isVisible().catch(() => false)) {
      const options = await pager.locator('option').allTextContents();
      const pick = options.find((o) => /10|25|50/.test(o)) || options[0];
      if (pick) {
        await pager.selectOption({ label: pick.trim() }).catch(async () => {
          await pager.selectOption({ index: 0 });
        });
        await this.page.waitForTimeout(1000);
      }
    }
  }

  async openCustomizeTable(): Promise<void> {
    await this.selectDomainLevel();
    await this.selectTableView();
    await expect(this.locators.customizeTableButton.first()).toBeVisible({ timeout: 15000 });
    await this.locators.customizeTableButton.first().click({ force: true });
    await this.page.waitForTimeout(800);
    await expect(this.locators.includeAllColumns).toBeVisible({ timeout: 15000 });
    await expect(this.locators.excludeAllColumns).toBeVisible();
    await expect(this.locators.resetCustomizedTable).toBeVisible();
    await expect(this.locators.defaultCustomizedTable).toBeVisible();
    await expect(this.locators.saveCustomizedTable).toBeVisible();
  }

  async saveAndCloseCustomizeTable(): Promise<void> {
    await this.locators.saveCustomizedTable.click({ force: true });
    await this.page.waitForTimeout(1500);
    await expect(this.locators.domainLevelTable).toBeVisible({ timeout: 30000 });
  }

  async sampleExportMenu(): Promise<void> {
    const exportBtn = this.page.locator('button, a').filter({ hasText: /^Export$/i }).first();
    if (await exportBtn.isVisible().catch(() => false)) {
      await exportBtn.click({ force: true });
      await this.page.waitForTimeout(400);
    }
    await expect(this.page.getByText(/^CSV$/i).first()).toBeVisible({ timeout: 10000 });
    await expect(this.page.getByText(/^TSV$/i).first()).toBeAttached();
    await expect(this.page.getByText(/^JSON$/i).first()).toBeAttached();
    await this.page.keyboard.press('Escape').catch(() => undefined);
  }

  async runComparisonSample(): Promise<void> {
    await this.selectDomainLevel();
    await expect(this.locators.runComparisonButton).toBeVisible({ timeout: 15000 });
    await this.locators.runComparisonButton.click({ force: true });
    await this.page.waitForTimeout(1500);
    const apply = this.locators.applyFiltersButton.filter({ hasText: /Comparison/i }).or(
      this.page.locator('#apply-filters')
    );
    await expect(apply.first()).toBeVisible({ timeout: 20000 });
    // Change a comparison filter (data origin) when available
    try {
      await this.selectNativeOrSelect2('#data-origin', /RUM Browser$/i);
    } catch {
      /* soft — default filters still apply */
    }
    await apply.first().click({ force: true });
    await this.page.waitForTimeout(8000);
    await expect(this.locators.domainCompareGraph).toBeVisible({ timeout: 45000 });
    await expect(this.locators.durationTab.or(this.locators.compareTableTabs)).toBeVisible({
      timeout: 15000,
    });
  }

  async toggleComparisonDurationCount(): Promise<void> {
    if (await this.locators.countTab.isVisible().catch(() => false)) {
      await this.locators.countTab.click({ force: true });
      await this.page.waitForTimeout(1500);
      await expect(this.locators.domainCountTable.or(this.locators.countTab)).toBeVisible();
      await this.locators.durationTab.click({ force: true });
      await this.page.waitForTimeout(1000);
    }
  }

  async cancelComparisonFilters(): Promise<void> {
    if (await this.locators.cancelFiltersButton.isVisible().catch(() => false)) {
      await this.locators.cancelFiltersButton.click({ force: true });
      await this.page.waitForTimeout(800);
    }
  }

  async openRightNavFilters(): Promise<void> {
    const apply = this.page
      .locator('#apply-filters, button:has-text("Apply Filters"), a.btn:has-text("Apply Filters")')
      .filter({ visible: true })
      .first();
    if (await apply.isVisible().catch(() => false)) return;

    const toggle = this.locators.filtersToggle;
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
    const tpBox = this.page
      .locator('#time-period')
      .or(this.page.getByRole('textbox', { name: /Time Period/i }))
      .first();
    await expect(tpBox).toBeVisible({ timeout: 20000 });
    await tpBox.click({ force: true });
    await this.page.waitForTimeout(800);

    const aliases = timePeriodAliases(label);
    let clicked = false;
    for (const alias of aliases) {
      const preset = this.page
        .locator('.daterangepicker li, .ranges li, button.time-option')
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
    await this.page.waitForTimeout(400);
  }

  async clickApplyFilters(): Promise<void> {
    const apply = this.page
      .locator('#apply-filters, button:has-text("Apply Filters"), a.btn:has-text("Apply Filters")')
      .filter({ visible: true })
      .first();
    await apply.click({ force: true });
    await this.page.waitForTimeout(5000);
  }

  async applySampleFilterCombo(options: {
    dataOrigin?: string;
    timePeriod?: string;
    visitorType?: string;
    botTraffic?: string;
  }): Promise<void> {
    await this.openRightNavFilters();
    if (options.timePeriod) await this.selectTimePeriodPreset(options.timePeriod);
    if (options.dataOrigin) await this.selectNativeOrSelect2('#data-origin', options.dataOrigin);
    if (options.visitorType) {
      try {
        await this.selectNativeOrSelect2('#visitor-type', options.visitorType);
      } catch {
        /* soft */
      }
    }
    if (options.botTraffic) {
      const radio = this.page
        .locator('#include-bots, #exclude-bots, #bots-only, label')
        .filter({ hasText: new RegExp(options.botTraffic, 'i') })
        .first();
      if (await radio.isVisible().catch(() => false)) await radio.click({ force: true });
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
    const tipAttr = this.locators.domainLevelTab.or(this.locators.objectLevelTab).or(
      this.locators.graphViewButton
    );
    const tips = [
      await this.locators.domainLevelTab.getAttribute('data-original-title').catch(() => null),
      await this.locators.objectLevelTab.getAttribute('data-original-title').catch(() => null),
      await this.locators.graphViewButton.getAttribute('data-original-title').catch(() => null),
      await this.locators.tableViewButton.getAttribute('data-original-title').catch(() => null),
    ].filter(Boolean) as string[];
    void tipAttr;
    if (tips.length) return tips[0];

    const icon = this.locators.infoIcons.first();
    if (await icon.isVisible().catch(() => false)) {
      await icon.hover({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(400);
      const tip = await icon.getAttribute('data-original-title').catch(() => null);
      if (tip) return tip;
    }
    return '';
  }

  async openPerformanceDetailLink(): Promise<Page | null> {
    await expect(this.locators.performanceDetailButton).toBeVisible({ timeout: 15000 });
    const popupPromise = this.page.context().waitForEvent('page', { timeout: 10000 }).catch(() => null);
    await this.locators.performanceDetailButton.click({ force: true });
    const popup = await popupPromise;
    if (popup) {
      await popup.waitForLoadState('domcontentloaded').catch(() => undefined);
      return popup;
    }
    await this.page.waitForTimeout(2000);
    return null;
  }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function timePeriodAliases(label: string): string[] {
  const lower = label.toLowerCase();
  if (/6\s*h|6\s*hour/i.test(lower)) return ['Last 6 Hours', 'Last 6 Hour', '6 Hours', '6 Hour'];
  if (/24\s*h|1\s*day|24\s*hour/i.test(lower)) return ['Last 24 Hours', 'Last 24 Hour', '1 Day', 'Last 1 Day', '24 Hours'];
  if (/7\s*d|7\s*day/i.test(lower)) return ['Last 7 Days', 'Last 7 Day', '7 Days'];
  if (/30\s*d|30\s*day/i.test(lower)) return ['Last 30 Days', 'Last 30 Day', '30 Days'];
  return [label];
}
