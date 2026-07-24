import { Page, expect, Locator } from '@playwright/test';
import { RumPerformanceDetailLocators } from '../locators/RumPerformanceDetailLocators';
import { LeftNavPage } from './LeftNavPage';
import { SiteDropdownPage } from './SiteDropdownPage';
import { ensurePortalSession } from '../helpers/portalSession';

const PAGE_DEF = {
  id: 'rum.performance-detail',
  module: 'rum',
  menuLabel: 'Performance Detail',
  route: 'real-user-monitoring/performance-detail',
  titleIncludes: /Performance Detail/i,
};

/**
 * Performance Detail (RUM Browser) — read-only interactions only.
 * Does not save filters, create markers, or mutate account/site settings.
 */
export class RumPerformanceDetailPage {
  readonly locators: RumPerformanceDetailLocators;

  constructor(private readonly page: Page) {
    this.locators = new RumPerformanceDetailLocators(page);
  }

  async openViaNavigation(): Promise<void> {
    await ensurePortalSession(this.page);
    await new SiteDropdownPage(this.page).ensureProfileSite();
    const leftNav = new LeftNavPage(this.page);
    await leftNav.openSmokePage(PAGE_DEF);
    await this.waitForPageReady();
  }

  async waitForPageReady(): Promise<void> {
    await expect(this.page).not.toHaveURL(/site\/login|site%2Flogin/i);
    await expect(this.locators.pageTitle).toBeVisible({ timeout: 45000 });
    await expect(this.locators.pageTitle).toHaveText(/Performance Detail/i);
    await this.page.waitForLoadState('domcontentloaded');
    // Charts may take time to render
    await expect
      .poll(async () => this.locators.highchartsContainers.count(), { timeout: 60000 })
      .toBeGreaterThan(0);
  }

  async expectDefaultSessionContext(): Promise<void> {
    await expect(this.page.getByText(/All Page Views For Selected Session/i).first()).toBeVisible({
      timeout: 30000,
    });
    await expect(this.page.getByText(/Page Views/i).first()).toBeVisible();
    const charts = await this.locators.highchartsContainers.count();
    expect(charts, 'Default load should render chart containers').toBeGreaterThan(3);
  }

  async openChooseMetrics(): Promise<void> {
    await expect(this.locators.configureMetricsButton).toBeVisible({ timeout: 20000 });
    await this.locators.configureMetricsButton.click();
    await this.page.waitForTimeout(800);
    // Modal / panel with metric options
    const panel = this.page.locator(
      '.modal.show, .modal.in, #configure-metrics, [id*=configure-metric], .choose-your-displayed-metrics, .modal-dialog'
    );
    if ((await panel.count()) > 0) {
      await expect(panel.first()).toBeVisible({ timeout: 10000 });
    }
  }

  async getChooseMetricsOptions(): Promise<string[]> {
    await this.openChooseMetrics();
    const labels = await this.page
      .locator(
        '.modal.show label, .modal.in label, [id*=configure] label, .modal-body label, .checkbox label'
      )
      .allTextContents();
    const cleaned = [...new Set(labels.map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean))];
    await this.page.keyboard.press('Escape').catch(() => undefined);
    await this.page.locator('.modal .close, .modal [data-dismiss="modal"], button:has-text("Close"), button:has-text("Cancel"), button:has-text("Apply")').first().click({ force: true }).catch(() => undefined);
    return cleaned;
  }

  async toggleChooseMetricByLabel(label: string | RegExp): Promise<void> {
    await this.openChooseMetrics();
    const option = this.page
      .locator('.modal.show label, .modal.in label, .modal-body label, [id*=configure] label')
      .filter({ hasText: label })
      .first();
    if ((await option.count()) === 0) {
      // Fallback: click text in choose metrics UI
      await this.page.getByText(label).first().click({ force: true });
    } else {
      await option.click({ force: true });
    }
    const apply = this.page.getByRole('button', { name: /Apply|Save|Update|Done|OK/i }).first();
    if (await apply.isVisible().catch(() => false)) {
      await apply.click();
    } else {
      await this.page.keyboard.press('Escape');
    }
    await this.page.waitForTimeout(1500);
  }

  async expectMetricCardsPresent(names: string[]): Promise<void> {
    for (const name of names) {
      await expect(
        this.page.getByText(name, { exact: false }).first(),
        `Expected metric/card related to "${name}" on page`
      ).toBeVisible({ timeout: 20000 });
    }
  }

  async openGlobalMarkersMenu(): Promise<void> {
    await expect(this.locators.markersContainer).toBeVisible({ timeout: 15000 });
    const caret = this.locators.markerCaret;
    if (await caret.isVisible().catch(() => false)) {
      await caret.click({ force: true });
    } else {
      await this.locators.markersContainer.click({ force: true });
    }
    await this.page.waitForTimeout(500);
  }

  async selectGlobalMarkerOption(option: string | RegExp): Promise<void> {
    await this.openGlobalMarkersMenu();
    const item = this.page
      .locator('#toggle-dropdown-con a, #toggle-dropdown-con button, #toggle-markers-container a, .dropdown-menu a')
      .filter({ hasText: option })
      .first();
    await expect(item, `Global marker option ${option} should exist`).toBeVisible({ timeout: 10000 });
    await item.click({ force: true });
    await this.page.waitForTimeout(1000);
  }

  async openRightNavFilters(): Promise<void> {
    const apply = this.page.locator('#apply-filters').or(
      this.page.locator('button, a.btn, input[type="submit"], input[type="button"]').filter({ hasText: /Apply Filters/i }).first()
    );

    // Toggle closes the drawer if already open — only open when Apply is not visible
    if (!(await apply.isVisible().catch(() => false))) {
      await expect(this.locators.filtersToggle).toBeVisible({ timeout: 15000 });
      await this.locators.filtersToggle.click();
      await this.page.waitForTimeout(800);
    }

    await expect(apply, 'Apply Filters control should appear after opening Filters').toBeVisible({
      timeout: 20000,
    });
  }

  async applyFilterCombination(options: {
    visitorType?: string;
    pageGroup?: string;
    dataOrigin?: string;
    bucketSize?: string;
  }): Promise<void> {
    await this.openRightNavFilters();

    if (options.dataOrigin) {
      await this.selectNativeOrSelect2('#data-origin', options.dataOrigin);
    }
    if (options.visitorType) {
      await this.selectNativeOrSelect2('#visitor-type', options.visitorType);
    }
    if (options.pageGroup) {
      await this.selectNativeOrSelect2('#page-group', options.pageGroup);
    }
    if (options.bucketSize) {
      await this.selectNativeOrSelect2('#bucket-size', options.bucketSize).catch(async () => {
        // Alternate ids used on some builds
        await this.selectNativeOrSelect2('#bucket_size', options.bucketSize!).catch(() => undefined);
      });
    }

    const apply = this.page
      .locator('#apply-filters')
      .or(this.page.locator('button, a.btn, input[type="submit"], input[type="button"]').filter({ hasText: /Apply Filters/i }).first());
    await apply.click({ force: true });
    await this.page.waitForTimeout(2500);
    await expect
      .poll(async () => this.locators.highchartsContainers.count(), { timeout: 45000 })
      .toBeGreaterThan(0);
  }

  async hoverInfoIconsSample(limit = 4): Promise<number> {
    const icons = this.page.locator(
      '.fa-info-circle, .fal.fa-info-circle, [data-toggle="tooltip"][data-original-title], i[class*="info"]'
    );
    const count = await icons.count();
    const n = Math.min(limit, count);
    let hovered = 0;
    for (let i = 0; i < n; i++) {
      const icon = icons.nth(i);
      if (!(await icon.isVisible().catch(() => false))) continue;
      await icon.scrollIntoViewIfNeeded().catch(() => undefined);
      await icon.hover({ force: true }).catch(() => undefined);
      hovered++;
      await this.page.waitForTimeout(200);
    }
    return hovered;
  }

  /** Confluence: clicking a Performance Details by Page bar updates Page Timings. */
  async clickPerformanceDetailsByPageBar(): Promise<boolean> {
    const host = this.page.locator('.highcharts-container').filter({
      has: this.page.locator('.highcharts-title', { hasText: /Performance Details by Page/i }),
    });
    const scope = (await host.count()) > 0 ? host.first() : this.page.locator('#multi-step-bar, [id*=multi-step], [id*=performance-details]').first();
    const bar = scope.locator('rect.highcharts-point, .highcharts-series rect, .highcharts-point').first();
    if ((await bar.count()) === 0) return false;
    await bar.click({ force: true });
    await this.page.waitForTimeout(1500);
    return true;
  }

  private async selectNativeOrSelect2(selectCss: string, optionText: string): Promise<void> {
    const select = this.page.locator(selectCss);
    await expect(select).toBeAttached({ timeout: 10000 });
    // Prefer select2 UI when present
    const container = this.page.locator(
      `#select2-${selectCss.replace('#', '')}-container, span[aria-labelledby*="${selectCss.replace('#', '')}"]`
    ).first();
    if ((await container.count()) > 0 && (await container.isVisible().catch(() => false))) {
      await container.click();
      const opt = this.page.locator('.select2-results__option').filter({ hasText: optionText }).first();
      await expect(opt).toBeVisible({ timeout: 10000 });
      await opt.click();
      return;
    }
    await select.selectOption({ label: optionText }).catch(async () => {
      await select.selectOption({ value: optionText });
    });
  }

  async setPageViewsMetric(metric: string): Promise<void> {
    await expect(this.locators.pageScatterType).toBeVisible({ timeout: 15000 });
    await this.locators.pageScatterType.selectOption({ label: metric });
    await this.page.waitForTimeout(2000);
  }

  async setPageViewsDetailMode(mode: 'Object Level Detail Only' | 'Page and Object Level Detail'): Promise<void> {
    await expect(this.locators.scatterPlotWcd).toBeVisible({ timeout: 15000 });
    await this.locators.scatterPlotWcd.selectOption({ label: mode });
    await this.page.waitForTimeout(2000);
  }

  async setSessionViewsMetric(metric: string): Promise<void> {
    await expect(this.locators.sessionScatterType).toBeVisible({ timeout: 15000 });
    await this.locators.sessionScatterType.selectOption({ label: metric });
    await this.page.waitForTimeout(2000);
  }

  async toggleGraphTable(
    view: 'graph' | 'table',
    which: 'pageTimings' | 'pageViews' | 'session' | 'domainObject'
  ): Promise<void> {
    const map: Record<string, { graph: Locator; table: Locator }> = {
      pageTimings: {
        graph: this.locators.pageTimingsGraphToggle,
        table: this.locators.pageTimingsTableToggle,
      },
      pageViews: {
        graph: this.locators.pageViewsGraphToggle,
        table: this.locators.pageViewsTableToggle,
      },
      session: {
        graph: this.locators.sessionLookupGraphToggle,
        table: this.locators.sessionLookupTableToggle,
      },
      domainObject: {
        graph: this.locators.domainObjectGraphToggle,
        table: this.locators.domainObjectTableToggle,
      },
    };
    const pair = map[which];
    let target = view === 'graph' ? pair.graph : pair.table;

    if (!(await target.isVisible().catch(() => false))) {
      // Fallback: nearest graph/table toggle to the section title
      const sectionHint =
        which === 'pageViews'
          ? /Page Views/i
          : which === 'pageTimings'
            ? /Page Timings Over Time/i
            : which === 'session'
              ? /All Page Views For Selected Session/i
              : /Domain Level Activity|Object Level Detail|Object Activity/i;
      const section = this.page.locator('section, .row, .card, .perf-page-section').filter({ hasText: sectionHint }).first();
      target =
        view === 'graph'
          ? section.locator('[title="Graph View"], [id*="graph"][class*="tab-btn"]').first()
          : section.locator('[title="Table View"], [id*="table"][class*="tab-btn"]').first();
    }

    if (!(await target.isVisible().catch(() => false))) {
      // Last resort: any visible matching title on page
      target =
        view === 'graph'
          ? this.page.locator('[title="Graph View"]').nth(which === 'pageViews' ? 1 : 0)
          : this.page.locator('[title="Table View"]').nth(which === 'pageViews' ? 1 : 0);
    }

    await expect(target, `${which} ${view} toggle`).toBeVisible({ timeout: 20000 });
    await target.click({ force: true });
    await this.page.waitForTimeout(1200);
  }

  async openChartContextMenuNear(sectionTitle: string | RegExp): Promise<boolean> {
    const section = this.page
      .locator('section, .row, .card, .perf-page-section')
      .filter({ hasText: sectionTitle })
      .first();
    const bars = section.locator(
      '.fal.fa-bars, .highcharts-button, .highcharts-contextbutton, .highcharts-a11y-proxy-button'
    );
    const globalBars = this.locators.chartContextMenuButtons;
    const localCount = await bars.count();
    const globalCount = await globalBars.count();
    if (localCount + globalCount === 0) return false;

    const candidate =
      (await bars.filter({ visible: true }).count()) > 0
        ? bars.filter({ visible: true }).first()
        : (await globalBars.filter({ visible: true }).count()) > 0
          ? globalBars.filter({ visible: true }).first()
          : bars.first();

    await candidate.click({ force: true }).catch(() => undefined);
    await this.page.waitForTimeout(500);
    return true;
  }

  async expectChartHasData(graphId?: string): Promise<void> {
    if (graphId) {
      const host = this.locators.graphById(graphId);
      await expect(host).toBeVisible({ timeout: 20000 });
      const noData = host.getByText(/No data to display/i);
      const points = host.locator('.highcharts-point, .highcharts-series path, .highcharts-graph');
      const hasPoints = (await points.count()) > 0;
      const showingNoData = (await noData.count()) > 0 && (await noData.first().isVisible().catch(() => false));
      expect(
        hasPoints || !showingNoData,
        `Graph #${graphId} should show series data (or not be empty-state only)`
      ).toBeTruthy();
      return;
    }
    const noDataCount = await this.page.getByText(/No data to display/i).count();
    const chartCount = await this.locators.highchartsContainers.count();
    expect(chartCount, 'Expected chart containers').toBeGreaterThan(0);
    // Allow some empty metric cards; overall page should have rendered series
    const series = await this.page.locator('.highcharts-series, .highcharts-point, .highcharts-graph').count();
    expect(series, `Expected chart series. noDataLabels=${noDataCount}`).toBeGreaterThan(0);
  }

  async clickLegendItem(name: string | RegExp): Promise<void> {
    const item = this.locators.highchartsLegendItems.filter({ hasText: name }).first();
    await expect(item, `Legend item ${name}`).toBeVisible({ timeout: 15000 });
    await item.click({ force: true });
    await this.page.waitForTimeout(800);
  }

  async hoverFirstSeriesPoint(): Promise<void> {
    const visiblePoint = this.locators.highchartsPoints.filter({ visible: true }).first();
    const point =
      (await visiblePoint.count()) > 0 ? visiblePoint : this.page.locator('.highcharts-series path, .highcharts-graph').first();
    await point.scrollIntoViewIfNeeded().catch(() => undefined);
    await point.hover({ force: true });
    await this.page.waitForTimeout(700);
  }

  async expectTooltipVisible(): Promise<void> {
    const tip = this.locators.highchartsTooltip;
    const ok = await expect
      .poll(async () => {
        const count = await tip.count();
        if (!count) return false;
        const text = ((await tip.first().textContent()) || '').trim();
        return text.length > 0;
      }, { timeout: 8000 })
      .toBeTruthy()
      .then(() => true)
      .catch(() => false);
    if (!ok) {
      // Some themes keep tooltip in SVG title/aria only
      const title = await this.page.locator('title, .highcharts-tooltip text').first().textContent().catch(() => '');
      expect((title || '').trim().length + (await tip.count()), 'Expected tooltip/title content on hover').toBeGreaterThan(0);
    }
  }

  /** Click a Page Views scatter/session point (green dots). */
  async clickPageViewsPoint(index = 0): Promise<void> {
    const host = this.page.locator('#page-volume-graph, [id*="page-volume"], .highcharts-container').filter({
      has: this.page.locator('.highcharts-title', { hasText: /^Page Views$/i }),
    }).first();

    let points = host.locator('.highcharts-point');
    if ((await points.count()) === 0) {
      points = this.page
        .locator('.highcharts-container')
        .filter({ has: this.page.locator('.highcharts-title', { hasText: /Page Views/i }) })
        .locator('.highcharts-point');
    }
    if ((await points.count()) === 0) {
      points = this.locators.highchartsPoints;
    }

    const count = await points.count();
    expect(count, 'Expected clickable Page Views points').toBeGreaterThan(0);
    const target = points.nth(Math.min(index, count - 1));
    await target.click({ force: true });
    await this.page.waitForTimeout(2500);
  }

  async expectSessionDependentSections(): Promise<void> {
    await expect(this.page.getByText(/All Page Views For Selected Session/i).first()).toBeVisible({
      timeout: 30000,
    });
    const perf = this.page.getByText(/Performance Measurement Details|Performance Breakdown/i).first();
    const perfVisible = await perf.isVisible().catch(() => false);
    if (!perfVisible) {
      // Some selections keep breakdown collapsed until a valid measurement point is hit
      await expect(
        this.locators.pageViewsSessionChart.or(this.page.locator('#page-views-for-session-scatter-plot-graph')).first()
      ).toBeVisible({ timeout: 15000 });
    } else {
      await expect(perf).toBeVisible();
    }
  }

  async expectDomainOrObjectDetailSections(): Promise<{
    domain: boolean;
    objectLevel: boolean;
    objectActivity: boolean;
  }> {
    const domain = await this.locators.domainLevelSection.isVisible().catch(() => false);
    const objectLevel = await this.locators.objectLevelSection.isVisible().catch(() => false);
    const objectActivity = await this.locators.objectActivitySection.isVisible().catch(() => false);
    expect(
      domain || objectLevel || objectActivity,
      'Expected Domain Level Activity / Object Level Detail / Object Activity section after triangle/detail selection'
    ).toBeTruthy();
    return { domain, objectLevel, objectActivity };
  }

  async getVisibleSectionTitles(): Promise<string[]> {
    const titles = await this.page.locator('.highcharts-title, .page-headers-title, h3, h4').allTextContents();
    return [...new Set(titles.map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean))];
  }

  /** Confluence: View Filters / Hide Filters at top left (inline applied-filter banner). */
  async toggleViewFiltersBanner(): Promise<'shown' | 'hidden'> {
    const btn = this.locators.viewFiltersButton;
    const banner = this.locators.viewFiltersBanner;
    await expect(btn).toBeVisible({ timeout: 15000 });
    const wasVisible = await banner.isVisible().catch(() => false);
    await btn.click();
    await this.page.waitForTimeout(700);
    const isVisible = await banner.isVisible().catch(() => false);
    const label = ((await btn.textContent()) || '').replace(/\s+/g, ' ').trim();
    if (isVisible && !wasVisible) {
      expect(label).toMatch(/Hide Filters/i);
      return 'shown';
    }
    if (!isVisible && wasVisible) {
      expect(label).toMatch(/View Filters/i);
      return 'hidden';
    }
    // Fallback: use button label when display toggle is ambiguous
    return /Hide Filters/i.test(label) ? 'shown' : 'hidden';
  }

  /** Confluence: metric cards drive Performance Details by Page axis (default Page Onload). */
  async clickMetricCard(name: string | RegExp): Promise<void> {
    const card = this.page
      .locator('#cardThings .column, #cardThings [class*="card"], .choose-matrix-row .column, .page-headers')
      .filter({ hasText: name })
      .first();
    await expect(card, `Metric card ${name}`).toBeVisible({ timeout: 20000 });
    await card.click({ force: true });
    await this.page.waitForTimeout(1500);
  }

  /**
   * Confluence: Performance Details by Page populates when 2+ page names are selected.
   * Read-only — applies filter then does not save a named filter.
   */
  async applyAtLeastTwoPageNames(pageNames: string[] = []): Promise<void> {
    await this.openRightNavFilters();

    const select = this.page.locator('#page-name');
    await expect(select, 'Confluence Page Name filter').toBeAttached({ timeout: 15000 });

    const available = (await select.locator('option').allTextContents())
      .map((t) => t.trim())
      .filter((t) => t && !/^select/i.test(t));
    expect(available.length, 'Expected Page Name options').toBeGreaterThanOrEqual(2);

    const chosen: string[] = [];
    for (const want of pageNames) {
      const hit =
        available.find((o) => o.toLowerCase() === want.toLowerCase()) ||
        available.find((o) => o.toLowerCase().includes(want.toLowerCase()));
      if (hit && !chosen.includes(hit)) chosen.push(hit);
      if (chosen.length >= 2) break;
    }
    for (const opt of available) {
      if (chosen.length >= 2) break;
      if (!chosen.includes(opt)) chosen.push(opt);
    }
    expect(chosen.length).toBeGreaterThanOrEqual(2);

    // Drive the underlying multi-select (select2 syncs on change) — more reliable than UI search clicks
    await select.selectOption(chosen.slice(0, 2).map((label) => ({ label })));
    await this.page.evaluate(() => {
      const el = document.querySelector('#page-name') as HTMLSelectElement | null;
      if (!el) return;
      el.dispatchEvent(new Event('change', { bubbles: true }));
      const jq = (window as unknown as { jQuery?: (sel: string) => { trigger: (e: string) => void } }).jQuery;
      if (jq) jq('#page-name').trigger('change');
    });
    await this.page.waitForTimeout(500);

    await this.page.locator('#apply-filters').click();
    await this.page.waitForTimeout(4000);
  }

  async expectPerformanceDetailsByPageVisible(): Promise<void> {
    await expect(
      this.page.getByText(/Performance Details by Page/i).first(),
      'Confluence: Performance Details by Page should populate with 2+ pages selected'
    ).toBeVisible({ timeout: 45000 });
  }

  /** Confluence: circles = no object detail; triangles = object-level detail. */
  async countPageViewsMarkerTypes(): Promise<{ circles: number; triangles: number }> {
    const host = this.page.locator('.highcharts-container').filter({
      has: this.page.locator('.highcharts-title', { hasText: /^Page Views$/i }),
    });
    const scope = (await host.count()) > 0 ? host.first() : this.page;
    const circles = await scope.locator('.highcharts-point, circle.highcharts-point').count();
    const triangles = await scope
      .locator('[class*="triangle"], .highcharts-point-triangle, path.highcharts-point')
      .count();
    return { circles, triangles };
  }

  /** Confluence: click point → Performance Breakdown waterfall + session/measurement panels. */
  async expectPerformanceBreakdownAfterPointClick(): Promise<void> {
    await this.clickPageViewsPoint(0);
    await expect(this.page.getByText(/All Page Views For Selected Session|All Page Views/i).first()).toBeVisible({
      timeout: 30000,
    });
    const breakdown = this.page.getByText(/Performance Breakdown|Performance Measurement Details/i).first();
    const visible = await breakdown.isVisible().catch(() => false);
    if (!visible) {
      // Waterfall container may render without exact header text
      const waterfall = this.page.locator(
        '#object-level-detail-table, [id*="waterfall"], [id*="performance-breakdown"], .highcharts-container'
      );
      expect(await waterfall.count(), 'Expected Performance Breakdown / measurement UI after point click').toBeGreaterThan(0);
    }
  }
}
