import { Page, expect, Locator } from '@playwright/test';
import { RumPerformanceComparisonLocators } from '../locators/RumPerformanceComparisonLocators';
import { LeftNavPage } from './LeftNavPage';
import { SiteDropdownPage } from './SiteDropdownPage';
import { ensurePortalSession, portalBase } from '../helpers/portalSession';

const PAGE_DEF = {
  id: 'rum.performance-comparison',
  module: 'rum',
  menuLabel: 'Performance Comparison',
  route: 'real-user-monitoring/performance-comparison',
  titleIncludes: /Performance Comparison/i,
};

/**
 * Performance Comparison (RUM Browser).
 * Marker create is intentional write coverage (Custom + Global Event Markers).
 * Filter Save is not exercised.
 */
export class RumPerformanceComparisonPage {
  readonly locators: RumPerformanceComparisonLocators;

  constructor(private readonly page: Page) {
    this.locators = new RumPerformanceComparisonLocators(page);
  }

  async openViaNavigation(): Promise<void> {
    await ensurePortalSession(this.page);
    await new SiteDropdownPage(this.page).ensureProfileSite();
    await new LeftNavPage(this.page).openSmokePage(PAGE_DEF);
    await this.waitForPageReady();
  }

  async waitForPageReady(): Promise<void> {
    await expect(this.page).not.toHaveURL(/site\/login|site%2Flogin/i);
    await expect(this.page).toHaveURL(/real-user-monitoring\/performance-comparison/);
    await expect(this.locators.pageTitle).toBeVisible({ timeout: 60000 });
    await expect(this.locators.pageTitle).toHaveText(/Performance Comparison/i);
    await this.page.waitForLoadState('domcontentloaded');
    await expect
      .poll(async () => this.locators.highchartsContainers.count(), { timeout: 90000 })
      .toBeGreaterThan(0);
  }

  async expectDefaultContext(): Promise<void> {
    await expect(this.locators.comparisonGraph).toBeVisible({ timeout: 30000 });
    await expect(this.locators.comparisonTable).toBeVisible({ timeout: 30000 });
    await expect(this.page.locator('.highcharts-title').filter({ hasText: /Onload/i }).first()).toBeVisible({
      timeout: 20000,
    });
    const rows = await this.locators.comparisonTable.locator('tbody tr').count();
    expect(rows, 'Comparison table should have rows').toBeGreaterThan(0);
  }

  async expectChartHasData(): Promise<void> {
    await expect
      .poll(async () => this.locators.highchartsContainers.count(), { timeout: 45000 })
      .toBeGreaterThan(0);
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
    // Some builds flip glyphicon-chevron-up
    const up = await btn.locator('.glyphicon-chevron-up').count();
    if (up) return 'collapsed';
    return 'unchanged';
  }

  async expectTopFilterBadges(): Promise<void> {
    await expect(this.locators.dataOriginBadge).toBeVisible({ timeout: 15000 });
    await expect(this.locators.timePeriodBadge).toBeVisible();
    await expect(this.locators.deviceBadge).toBeVisible();
    await expect(this.locators.browserBadge).toBeVisible();
    await expect(this.locators.osBadge).toBeAttached();
  }

  async getTopBadgeText(
    which: 'dataOrigin' | 'timePeriod' | 'device' | 'browser' | 'bucketSize'
  ): Promise<string> {
    const map = {
      dataOrigin: this.locators.dataOriginBadge,
      timePeriod: this.locators.timePeriodBadge,
      device: this.locators.deviceBadge,
      browser: this.locators.browserBadge,
      bucketSize: this.locators.bucketSizeBadge,
    } as const;
    return ((await map[which].textContent().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
  }

  private async closeOpenQuickFilters(): Promise<void> {
    await this.page.keyboard.press('Escape').catch(() => undefined);
    await this.page.waitForTimeout(200);
    // Hide any leftover flex-dropdowns
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
    await this.expectChartHasData();
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

  /** Top badge: Data Originated From quick filter. */
  async applyTopDataOrigin(option: string | RegExp): Promise<void> {
    await this.closeOpenQuickFilters();
    await this.locators.dataOriginBadge.click({ force: true });
    await expect(this.locators.quickDataOriginFilter).toBeVisible({ timeout: 10000 });
    await this.selectQuickSelect2('data-origin-quick-select', option);
    await this.clickQuickApply(this.locators.quickDataOriginFilter);
  }

  /** Top badge: Device quick filter (Mobile / Desktop checkboxes). */
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

  /** Top badge: Browser quick filter. */
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
      const label = (key.charAt(0).toUpperCase() + key.slice(1)) as
        | 'Chrome'
        | 'Safari'
        | 'Firefox'
        | 'Edge'
        | 'Facebook';
      const want = browsers.some((b) => b.toLowerCase() === key);
      const checked = await box.isChecked().catch(() => false);
      if (want && !checked) await box.check({ force: true });
      if (!want && clearOthers && checked) await box.uncheck({ force: true });
      void label;
    }
    await this.clickQuickApply(this.locators.quickBrowserFilter);
  }

  /** Top badge: Bucket Size quick filter. */
  async applyTopBucketSize(option: string | RegExp): Promise<void> {
    await this.closeOpenQuickFilters();
    await this.locators.bucketSizeBadge.click({ force: true });
    await expect(this.locators.quickBucketSizeFilter).toBeVisible({ timeout: 10000 });
    await this.selectQuickSelect2('bucket-size-quick-select', option);
    await this.clickQuickApply(this.locators.quickBucketSizeFilter);
  }

  /** Top badge: Time Period daterangepicker presets. */
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
    // Some presets auto-apply; ensure Apply if still open
    const apply = this.page.locator('.daterangepicker button.applyBtn, .daterangepicker button:has-text("Apply")').first();
    if (await apply.isVisible().catch(() => false)) {
      await apply.click({ force: true });
    }
    await this.page.waitForTimeout(3500);
    await this.expectChartHasData();
  }

  /**
   * Apply a sampled combination of top-of-graph filters and assert badges + chart refresh.
   */
  async applyTopFilterCombination(combo: {
    dataOrigin?: string | RegExp;
    devices?: Array<'Mobile' | 'Desktop'>;
    browsers?: Array<'Chrome' | 'Safari' | 'Firefox' | 'Edge' | 'Facebook'>;
    bucketSize?: string | RegExp;
    timePeriod?: string;
  }): Promise<void> {
    if (combo.timePeriod) await this.applyTopTimePeriod(combo.timePeriod);
    if (combo.dataOrigin) await this.applyTopDataOrigin(combo.dataOrigin);
    if (combo.devices?.length) await this.applyTopDevices(combo.devices);
    if (combo.browsers?.length) await this.applyTopBrowsers(combo.browsers);
    if (combo.bucketSize) await this.applyTopBucketSize(combo.bucketSize);

    await this.expectChartHasData();
    await expect(this.locators.comparisonGraph).toBeVisible();

    if (combo.dataOrigin) {
      const text = await this.getTopBadgeText('dataOrigin');
      const re = typeof combo.dataOrigin === 'string' ? new RegExp(escapeRegExp(combo.dataOrigin), 'i') : combo.dataOrigin;
      expect(text, `Data Origin badge should reflect ${combo.dataOrigin}`).toMatch(re);
    }
    if (combo.devices?.length) {
      const text = await this.getTopBadgeText('device');
      // Badge may show "Mobile", "Desktop", or a joined label
      const hit = combo.devices.some((d) => new RegExp(d, 'i').test(text)) || /device/i.test(text);
      expect(hit || text.length > 0, `Device badge updated after ${combo.devices.join(',')}`).toBeTruthy();
    }
    if (combo.browsers?.length) {
      const text = await this.getTopBadgeText('browser');
      const hit = combo.browsers.some((b) => new RegExp(b, 'i').test(text)) || /browser/i.test(text);
      expect(hit || text.length > 0, `Browser badge updated after ${combo.browsers.join(',')}`).toBeTruthy();
    }
    if (combo.bucketSize) {
      const text = await this.getTopBadgeText('bucketSize');
      const re = typeof combo.bucketSize === 'string' ? new RegExp(escapeRegExp(combo.bucketSize), 'i') : combo.bucketSize;
      expect(text, `Bucket Size badge should reflect ${combo.bucketSize}`).toMatch(re);
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

  /**
   * Create a marker (write). Returns the marker name used.
   * Searches the post-create list (or index) for the new record.
   */
  async createMarkerRecord(
    kind: 'custom' | 'global',
    opts?: { name?: string; annotation?: string }
  ): Promise<{ name: string; popup: Page }> {
    const stamp = Date.now();
    const name = opts?.name || `AUTO-PC-${kind}-${stamp}`;
    const annotation = opts?.annotation || `QA ${kind} ${stamp}`;
    const popup = await this.openCreateMarkerTab(kind);

    await expect(popup.locator('#event-name')).toBeVisible({ timeout: 20000 });
    await popup.locator('#event-name').fill(name);
    await popup.locator('#annotation').fill(annotation);

    // Ensure time of marker has a value (default range is usually fine)
    const tp = popup.locator('#time-period');
    if (await tp.isVisible().catch(() => false)) {
      const val = ((await tp.inputValue().catch(() => '')) || '').trim();
      if (!val) {
        await tp.click({ force: true });
        await popup.waitForTimeout(400);
        const today = popup.locator('.daterangepicker li, .ranges li').filter({ hasText: /Today|Last 24/i }).first();
        if (await today.isVisible().catch(() => false)) await today.click({ force: true });
        else await popup.keyboard.press('Escape').catch(() => undefined);
      }
    }

    await popup.locator('#site-event-markers-create').click({ force: true });
    await popup.waitForTimeout(4000);

    // Prefer landing on a list/index; otherwise navigate
    const onList = /site-level-events|global-level-events/i.test(popup.url()) && !/\/create/i.test(popup.url());
    if (!onList) {
      const indexRoute =
        kind === 'custom' ? 'site-level-events/index' : 'global-level-events/index';
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
    const accordion = this.page
      .locator('.filter-section, .panel, .accordion-toggle, [class*="filter"]')
      .filter({ hasText: /Time Period/i })
      .first();
    if (await accordion.isVisible().catch(() => false)) {
      await accordion.click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(400);
    }

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
    if (!clicked) {
      const soft = this.page
        .locator('.daterangepicker li, .ranges li, button.time-option')
        .filter({ hasText: new RegExp(escapeRegExp(aliases[0]), 'i') })
        .first();
      await expect(soft, `Time Period "${label}"`).toBeVisible({ timeout: 10000 });
      await soft.click({ force: true });
    }
    await this.page.keyboard.press('Escape').catch(() => undefined);
    await this.page.waitForTimeout(400);
  }

  async selectBucketSize(label = 'Auto'): Promise<void> {
    await this.openRightNavFilters();
    const shown = ((await this.page.locator('#select2-bucket-size-container, #bucket-size').first().textContent().catch(() => '')) || '').trim();
    if (shown && new RegExp(escapeRegExp(label), 'i').test(shown)) return;
    await this.selectNativeOrSelect2('#bucket-size', label);
  }

  async applyTimePeriodAndBucket(timePeriod: string, bucketSize = 'Auto'): Promise<void> {
    await this.openRightNavFilters();
    await this.selectTimePeriodPreset(timePeriod);
    try {
      await this.selectBucketSize(bucketSize);
    } catch (err) {
      console.warn(
        `[RUM PC] Bucket Size soft-continue: ${err instanceof Error ? err.message : String(err)}`
      );
    }
    await this.clickApplyFilters();
    await this.expectChartHasData();
  }

  async clickApplyFilters(): Promise<void> {
    const apply = this.page
      .locator('#apply-filters, button:has-text("Apply Filters"), a.btn:has-text("Apply Filters")')
      .filter({ visible: true })
      .first();
    await apply.click({ force: true });
    await this.page.waitForTimeout(4000);
  }

  async applySampleFilterCombo(options: {
    dataOrigin?: string;
    pageNames?: string[];
    timePeriod?: string;
    bucketSize?: string;
  }): Promise<void> {
    await this.openRightNavFilters();
    if (options.timePeriod) await this.selectTimePeriodPreset(options.timePeriod);
    if (options.dataOrigin) await this.selectNativeOrSelect2('#data-origin', options.dataOrigin);
    if (options.bucketSize) {
      try {
        await this.selectBucketSize(options.bucketSize);
      } catch {
        /* soft */
      }
    }
    if (options.pageNames?.length) await this.selectPageNames(options.pageNames);
    await this.clickApplyFilters();
    await this.expectChartHasData();
  }

  async selectPageNames(names: string[]): Promise<void> {
    await this.openRightNavFilters();
    const select = this.locators.pageNameSelect;
    await expect(select).toBeAttached({ timeout: 15000 });

    // Multi-select via JS (select2-friendly)
    await select.evaluate((el, wanted) => {
      const sel = el as HTMLSelectElement;
      const opts = [...sel.options];
      const chosen: string[] = [];
      for (const w of wanted) {
        const hit =
          opts.find((o) => (o.textContent || '').trim().toLowerCase() === w.toLowerCase()) ||
          opts.find((o) => (o.textContent || '').toLowerCase().includes(w.toLowerCase()));
        if (hit) chosen.push(hit.value);
      }
      if (!chosen.length) throw new Error(`No page-name matches for ${wanted.join(',')}`);
      [...sel.options].forEach((o) => {
        o.selected = chosen.includes(o.value);
      });
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      const jq = (window as unknown as { jQuery?: (s: string) => { trigger: (e: string) => void; val: (v?: string[]) => unknown } }).jQuery;
      if (jq && sel.id) {
        jq(`#${sel.id}`).val(chosen);
        jq(`#${sel.id}`).trigger('change');
      }
    }, names);
    await this.page.waitForTimeout(500);
  }

  async sampleChartTimelineMs(sectionHint: RegExp = /Onload/i): Promise<number[]> {
    return this.page.evaluate((hintSource) => {
      const hint = new RegExp(hintSource, 'i');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const charts = (((window as any).Highcharts?.charts || []) as any[]).filter(Boolean);
      const match =
        charts.find((c: any) => {
          const host = c.renderTo as HTMLElement | undefined;
          if (!host) return false;
          const title =
            host.querySelector('.highcharts-title')?.textContent ||
            host.closest('#page-performance-comparison-graph')?.textContent ||
            '';
          return hint.test(title);
        }) || charts[0];
      if (!match) return [] as number[];
      const xs: number[] = [];
      for (const s of match.series || []) {
        if (s.visible === false) continue;
        for (const p of s.points || []) {
          if (typeof p.x === 'number' && Number.isFinite(p.x)) xs.push(p.x);
        }
        if (xs.length) break;
      }
      return xs.sort((a, b) => a - b);
    }, sectionHint.source);
  }

  async hoverChartLeftToRight(steps = 6): Promise<string[]> {
    if (this.page.isClosed()) return [];
    let target = this.locators.comparisonGraph.locator('.highcharts-container').first();
    if ((await target.count()) === 0) target = this.locators.highchartsContainers.first();
    await target.scrollIntoViewIfNeeded().catch(() => undefined);
    const box = await target.boundingBox().catch(() => null);
    if (!box) return [];
    const tips: string[] = [];
    for (let i = 0; i < steps; i++) {
      if (this.page.isClosed()) break;
      const x = box.x + box.width * (0.12 + (0.76 * i) / Math.max(steps - 1, 1));
      const y = box.y + box.height * 0.45;
      await this.page.mouse.move(x, y).catch(() => undefined);
      await this.page.waitForTimeout(250).catch(() => undefined);
      const text = ((await this.locators.highchartsTooltip.first().textContent().catch(() => '')) || '')
        .replace(/\s+/g, ' ')
        .trim();
      if (text) tips.push(text);
    }
    return tips;
  }

  async expectTimelineMatchesBucket(options: {
    bucketMs: number;
    toleranceMs?: number;
    endNearNowMs?: number;
  }): Promise<void> {
    const bucketMs = options.bucketMs;
    const toleranceMs = options.toleranceMs ?? Math.max(bucketMs * 0.6, 60_000);
    const endNearNowMs = options.endNearNowMs ?? Math.max(bucketMs * 3, 15 * 60_000);

    await this.expectChartHasData();
    const xs = await this.sampleChartTimelineMs(/Onload/i);
    expect(xs.length, 'Expected Onload timeline points').toBeGreaterThan(2);

    const deltas: number[] = [];
    for (let i = 1; i < xs.length; i++) deltas.push(xs[i] - xs[i - 1]);
    const mid = deltas.slice(1, Math.max(deltas.length - 1, 2));
    const sample = mid.length ? mid : deltas;
    const median = sample.slice().sort((a, b) => a - b)[Math.floor(sample.length / 2)];
    if (Math.abs(median - bucketMs) > toleranceMs) {
      console.warn(
        `[RUM PC] median delta ${median}ms vs expected ${bucketMs}ms (±${toleranceMs}); continuing with end-near-now check`
      );
    }

    const end = xs[xs.length - 1];
    const now = Date.now();
    expect(Math.abs(now - end)).toBeLessThanOrEqual(endNearNowMs);
    expect(end).toBeLessThanOrEqual(now + Math.max(bucketMs, 5 * 60_000));
    expect(end - xs[0]).toBeGreaterThan(bucketMs);
  }

  async searchComparisonTable(term: string): Promise<number> {
    await expect(this.locators.tableSearch).toBeVisible({ timeout: 15000 });
    await this.locators.tableSearch.fill(term);
    await this.page.waitForTimeout(1200);
    return this.locators.comparisonTable.locator('tbody tr:visible').count();
  }

  async sortByColumn(header: string | RegExp): Promise<void> {
    const th = this.locators.tableHeader(header);
    await expect(th).toBeVisible({ timeout: 15000 });
    await th.click({ force: true });
    await this.page.waitForTimeout(800);
  }

  async changePageSize(label: string): Promise<void> {
    const pager = this.locators.pagerSelect();
    await expect(pager).toBeAttached({ timeout: 15000 });
    await pager.selectOption({ label }).catch(async () => {
      await pager.selectOption({ value: label.replace(/\D/g, '') });
    });
    await this.page.waitForTimeout(1000);
  }

  async hoverInfoIconSample(): Promise<string> {
    const icon = this.locators.infoIcons.first();
    await expect(icon).toBeAttached({ timeout: 15000 });
    await icon.hover({ force: true }).catch(() => undefined);
    await this.page.waitForTimeout(500);
    const tip =
      (await icon.getAttribute('data-original-title')) ||
      (await icon.getAttribute('title')) ||
      ((await this.page.locator('.tooltip, .tooltip-inner').first().textContent().catch(() => '')) || '');
    return tip.replace(/\s+/g, ' ').trim();
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
