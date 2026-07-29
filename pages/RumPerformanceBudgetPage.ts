import { Page, expect, Locator } from '@playwright/test';
import { RumPerformanceBudgetLocators } from '../locators/RumPerformanceBudgetLocators';
import { LeftNavPage } from './LeftNavPage';
import { SiteDropdownPage } from './SiteDropdownPage';
import { ensurePortalSession } from '../helpers/portalSession';

const PAGE_DEF = {
  id: 'rum.performance-budget',
  module: 'rum',
  menuLabel: 'Performance Budget',
  route: 'overview-dashboard/performance-budget',
  titleIncludes: /Performance Budget/i,
};

/**
 * Performance Budget (RUM Browser) dashboard.
 * Budget manager is read-only browse — do not create/save/destroy budgets.
 * Filter Save is not exercised.
 * Chart widget IDs are dynamic — locate by stable prefixes / titles.
 */
export class RumPerformanceBudgetPage {
  readonly locators: RumPerformanceBudgetLocators;

  constructor(private readonly page: Page) {
    this.locators = new RumPerformanceBudgetLocators(page);
  }

  async openViaNavigation(): Promise<void> {
    await ensurePortalSession(this.page);
    await new SiteDropdownPage(this.page).ensureProfileSite();
    await new LeftNavPage(this.page).openSmokePage(PAGE_DEF);
    await this.waitForPageReady();
  }

  async waitForPageReady(): Promise<void> {
    await expect(this.page).not.toHaveURL(/site\/login|site%2Flogin/i);
    await expect(this.page).toHaveURL(/overview-dashboard\/performance-budget/);
    await expect(this.locators.pageTitle).toBeVisible({ timeout: 60000 });
    await expect(this.locators.pageTitle).toHaveText(/Performance Budget/i);
    await this.page.waitForLoadState('domcontentloaded');
    await expect
      .poll(async () => this.locators.latestResultsHeading.isVisible().catch(() => false), {
        timeout: 120000,
      })
      .toBeTruthy();
  }

  async expectDefaultContext(): Promise<void> {
    await expect(this.locators.latestResultsHeading).toBeVisible({ timeout: 30000 });
    await expect(this.locators.performanceBudgetSelector).toBeVisible({ timeout: 20000 });
    await expect(this.locators.timeLookback).toBeVisible();
    await this.expectWidgetsReady();
  }

  async expectWidgetsReady(): Promise<void> {
    await expect
      .poll(
        async () => {
          const charts = await this.locators.highchartsContainers.count();
          const latest = await this.locators.latestResultsHeading.isVisible().catch(() => false);
          return charts + (latest ? 1 : 0);
        },
        { timeout: 30000 }
      )
      .toBeGreaterThan(0);
  }

  async expectDashboardChrome(): Promise<void> {
    await expect(this.locators.timeLookback).toBeVisible({ timeout: 15000 });
    await expect(this.locators.autoRefresh).toBeVisible();
    await expect(this.locators.performanceBudgetSelector).toBeVisible();
    await expect(this.locators.resetWidgetsButton).toBeVisible();
    if (await this.locators.performanceBudgetManagerButton.isVisible().catch(() => false)) {
      await expect(this.locators.performanceBudgetManagerButton).toBeVisible();
    }
  }

  async expectTopFilterBadges(): Promise<void> {
    await expect(this.locators.deviceBadge).toBeVisible({ timeout: 15000 });
    await expect(this.locators.browserBadge).toBeVisible();
    await expect(this.locators.osBadge).toBeVisible();
  }

  async toggleTopFiltersPanel(): Promise<'expanded' | 'collapsed' | 'unchanged'> {
    const btn = this.locators.pageControlsToggle;
    if (!(await btn.isVisible({ timeout: 5000 }).catch(() => false))) return 'unchanged';
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

  async openTimeLookbackMenu(): Promise<void> {
    await this.locators.timeLookback.click({ force: true });
    await this.page.waitForTimeout(500);
  }

  async expectTimeLookbackPresetsSample(): Promise<void> {
    await this.openTimeLookbackMenu();
    for (const label of [
      /Last 1 hour/i,
      /Last 6 hours/i,
      /Last 24 hours/i,
      /Last 7 days/i,
      /Last 30 days/i,
      /Custom Date Selection/i,
    ]) {
      await expect(this.page.getByText(label).first()).toBeVisible({ timeout: 8000 });
    }
    await this.page.keyboard.press('Escape').catch(() => undefined);
  }

  async selectTimeLookback(label: string | RegExp): Promise<void> {
    await this.openTimeLookbackMenu();
    const opt = this.page.getByText(label).first();
    await expect(opt).toBeVisible({ timeout: 10000 });
    await opt.click({ force: true });
    await this.page.waitForTimeout(4000);
    await this.expectWidgetsReady();
  }

  async openAutoRefreshMenu(): Promise<void> {
    await this.locators.autoRefresh.click({ force: true });
    await this.page.waitForTimeout(400);
  }

  async selectAutoRefresh(label: string | RegExp): Promise<void> {
    await this.openAutoRefreshMenu();
    const opt = this.page.getByText(label).first();
    await expect(opt).toBeVisible({ timeout: 8000 });
    await opt.click({ force: true });
    await this.page.waitForTimeout(800);
  }

  async expectAutoRefreshOptions(): Promise<void> {
    await this.openAutoRefreshMenu();
    for (const label of [/Off/i, /2 Minutes/i, /5 Minutes/i, /15 Minutes/i, /60 Minutes/i]) {
      await expect(this.page.getByText(label).first()).toBeVisible({ timeout: 8000 });
    }
    await this.page.keyboard.press('Escape').catch(() => undefined);
  }

  async getActiveBudgetLabel(): Promise<string> {
    const sel = this.locators.performanceBudgetSelector;
    const rendered = this.page.locator('#select2-performance-budget-selector-container').first();
    if (await rendered.isVisible().catch(() => false)) {
      return ((await rendered.textContent()) || '').replace(/\s+/g, ' ').trim();
    }
    return ((await sel.inputValue().catch(() => '')) || (await sel.textContent()) || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Read-only open of Performance Budget manager. Closes without saving.
   */
  async browseBudgetManagerReadOnly(): Promise<void> {
    const btn = this.locators.performanceBudgetManagerButton;
    await expect(btn).toBeVisible({ timeout: 15000 });
    await btn.click({ force: true });
    await this.page.waitForTimeout(1500);
    await expect(this.locators.dashboardManagerHeading).toBeVisible({ timeout: 20000 });
    // Close via Escape / Cancel / close icon — do not Save
    const close = this.page
      .locator('button, a, .close, [data-dismiss="modal"]')
      .filter({ hasText: /Close|Cancel|×|Done/i })
      .first();
    if (await close.isVisible({ timeout: 3000 }).catch(() => false)) {
      await close.click({ force: true });
    } else {
      await this.page.keyboard.press('Escape').catch(() => undefined);
    }
    await this.page.waitForTimeout(800);
  }

  async resetWidgets(): Promise<void> {
    await expect(this.locators.resetWidgetsButton).toBeVisible({ timeout: 15000 });
    await this.locators.resetWidgetsButton.click({ force: true });
    await this.page.waitForTimeout(4000);
    await this.expectWidgetsReady();
    await expect(this.locators.latestResultsHeading).toBeVisible({ timeout: 30000 });
    await expect(this.locators.partyActivityHeading).toBeVisible({ timeout: 20000 });
  }

  async expectTimingMetricCards(): Promise<void> {
    await expect(this.locators.latestResultsHeading).toBeVisible();
    for (const label of [/LCP\s*\|\s*RUM/i, /CLS\s*\|\s*RUM/i, /Onload\s*\|\s*RUM/i, /TBT\s*\|\s*RUM/i, /First Byte\s*\|\s*RUM/i]) {
      await expect(this.page.getByText(label).first()).toBeVisible({ timeout: 15000 });
    }
    const targets = await this.page.getByText(/Target/i).count();
    expect(targets).toBeGreaterThan(0);
  }

  async expectAssetMetricCards(): Promise<void> {
    for (const label of [/JavaScript\s*\|\s*SYNTH/i, /CSS\s*\|\s*SYNTH/i, /Images\s*\|\s*SYNTH/i]) {
      await expect(this.page.getByText(label).first()).toBeVisible({ timeout: 15000 });
    }
  }

  async expectPartyActivityControls(): Promise<void> {
    await expect(this.locators.partyActivityHeading).toBeVisible({ timeout: 20000 });
    await expect(this.locators.servicesTab).toBeVisible();
    await expect(this.locators.domainsTab).toBeVisible();
    await expect(this.locators.filesTab).toBeVisible();
    await expect(this.locators.party1st).toBeVisible();
    await expect(this.locators.party3rd).toBeVisible();
    await expect(this.locators.partyAll).toBeVisible();
  }

  async selectPartyTab(which: 'services' | 'domains' | 'files'): Promise<void> {
    const map = {
      services: this.locators.servicesTab,
      domains: this.locators.domainsTab,
      files: this.locators.filesTab,
    } as const;
    await map[which].click({ force: true });
    await this.page.waitForTimeout(2000);
  }

  async selectPartyFilter(which: '1st' | '3rd' | 'all'): Promise<void> {
    const map = {
      '1st': this.locators.party1st,
      '3rd': this.locators.party3rd,
      all: this.locators.partyAll,
    } as const;
    await map[which].click({ force: true });
    await this.page.waitForTimeout(2000);
  }

  async selectSlowestMetric(option: string | RegExp): Promise<void> {
    const select = this.locators.slowestMetricSelect;
    await expect(select).toBeAttached({ timeout: 15000 });
    const id = (await select.getAttribute('id')) || '';
    const container = this.page.locator(`#select2-${id}-container`).first();
    if (await container.isVisible().catch(() => false)) {
      await container.click({ force: true });
      await this.page.waitForTimeout(300);
      const opt = this.page.locator('.select2-results__option').filter({ hasText: option }).first();
      await expect(opt).toBeVisible({ timeout: 10000 });
      await opt.click();
    } else {
      await this.selectNativeOrSelect2(`[id^="slowest-metric-"]`, option);
    }
    await this.page.waitForTimeout(2500);
  }

  async selectPartyView(mode: 'graph' | 'table'): Promise<void> {
    const btn = mode === 'graph' ? this.locators.graphBtn : this.locators.tableBtn;
    await expect(btn).toBeVisible({ timeout: 15000 });
    await btn.click({ force: true });
    await this.page.waitForTimeout(1500);
  }

  async expectSlowestTableHeaders(which: 'services' | 'domains' | 'files'): Promise<void> {
    await this.selectPartyTab(which);
    await this.selectPartyView('table');
    const table =
      which === 'services'
        ? this.locators.slowestServicesTable
        : which === 'domains'
          ? this.locators.slowestDomainsTable
          : this.locators.slowestFilesTable;
    await expect(table).toBeVisible({ timeout: 20000 });
    const headers = (await table.locator('thead th').allTextContents())
      .map((t) => t.replace(/\s+/g, ' ').trim())
      .join(' | ');
    if (which === 'services') expect(/Service/i.test(headers)).toBeTruthy();
    if (which === 'domains') expect(/Domain/i.test(headers)).toBeTruthy();
    if (which === 'files') expect(/File/i.test(headers)).toBeTruthy();
    expect(/Total Load Time|Load Time/i.test(headers)).toBeTruthy();
  }

  async expectSlowestGraph(which: 'services' | 'domains' | 'files'): Promise<void> {
    await this.selectPartyTab(which);
    await this.selectPartyView('graph');
    const graph =
      which === 'services'
        ? this.locators.slowestServicesGraph
        : which === 'domains'
          ? this.locators.slowestDomainsGraph
          : this.locators.slowestFilesGraph;
    await expect(graph).toBeVisible({ timeout: 20000 });
    await expect(graph.locator('.highcharts-container, svg').first()).toBeVisible({ timeout: 20000 });
  }

  async sampleExportNearPartyTable(): Promise<void> {
    await this.selectPartyTab('services');
    await this.selectPartyView('table');
    const exportBtn = this.page
      .locator('button:has-text("Export"), a:has-text("Export"), .btn:has-text("Export")')
      .first();
    if (!(await exportBtn.isVisible({ timeout: 4000 }).catch(() => false))) return;
    await exportBtn.click({ force: true, timeout: 5000 });
    await this.page.waitForTimeout(400);
    const csv = await this.page.getByText(/^CSV$/i).first().isVisible({ timeout: 5000 }).catch(() => false);
    if (csv) await this.page.keyboard.press('Escape').catch(() => undefined);
  }

  async expectCompositionCharts(): Promise<void> {
    await expect
      .poll(async () => this.locators.highchartsContainers.count(), { timeout: 30000 })
      .toBeGreaterThan(0);
    const legend = this.page.locator('.highcharts-legend-item').first();
    if ((await legend.count().catch(() => 0)) > 0) {
      await legend.hover({ force: true, timeout: 3000 }).catch(() => undefined);
    }
  }

  async expectPageMetricsTable(): Promise<void> {
    const table = this.locators.pageMetricsTable;
    if (!(await table.isVisible({ timeout: 8000 }).catch(() => false))) return;
    const headers = (await table.locator('thead th').allTextContents())
      .map((t) => t.replace(/\s+/g, ' ').trim())
      .join(' | ');
    expect(/Page Name/i.test(headers)).toBeTruthy();
    expect(/LCP|TBT|CLS|Onload|First Byte|JavaScript|CSS|Images/i.test(headers)).toBeTruthy();
    const rows = await table.locator('tbody tr').count();
    expect(rows).toBeGreaterThan(0);
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
    await this.expectWidgetsReady();
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

  async applyTopFilterCombination(combo: {
    devices?: Array<'Mobile' | 'Desktop'>;
    browsers?: Array<'Chrome' | 'Safari' | 'Firefox' | 'Edge' | 'Facebook'>;
    os?: Array<'Macintosh' | 'Android' | 'Windows' | 'iOS' | 'Linux'>;
  }): Promise<void> {
    if (combo.devices?.length) await this.applyTopDevices(combo.devices);
    if (combo.browsers?.length) await this.applyTopBrowsers(combo.browsers);
    if (combo.os?.length) await this.applyTopOs(combo.os);
    await this.expectWidgetsReady();
    await expect(this.locators.latestResultsHeading).toBeVisible({ timeout: 20000 });
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
    const id = (await select.getAttribute('id')) || selectCss.replace(/[^a-zA-Z0-9_-]/g, '');
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

  async clickApplyFilters(): Promise<void> {
    const apply = this.page
      .locator('#apply-filters, button:has-text("Apply Filters")')
      .filter({ visible: true })
      .first();
    await apply.click({ force: true });
    await this.page.waitForTimeout(5000);
  }

  async applySampleRightNavFilters(): Promise<void> {
    await this.openRightNavFilters();
    // Soft sample: try device checkboxes / selects if present in filter panel
    const mobile = this.page.locator('#mobile-device, input[name*="device"]').first();
    if (await mobile.isVisible({ timeout: 3000 }).catch(() => false)) {
      await mobile.check({ force: true }).catch(() => undefined);
    }
    await this.clickApplyFilters();
    await this.expectWidgetsReady();
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
    const targetTip = this.page.getByText(/Target/i).first();
    if (await targetTip.isVisible().catch(() => false)) return 'Target label present';
    return '';
  }
}
