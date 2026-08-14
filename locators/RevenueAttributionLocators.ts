import { Page, Locator } from '@playwright/test';

/**
 * Locators for Business Insights / Improve Conversion / Revenue Attribution
 * Route: business-analytics/revenue-attribution
 * Prefer stable host ids / titles — not dynamic highcharts-* suffixes.
 */
export class RevenueAttributionLocators {
  readonly pageTitle: Locator;

  readonly siteSelectContainer: Locator;
  readonly toggleFilters: Locator;
  readonly mobileFiltersBtn: Locator;
  readonly applyFilters: Locator;
  readonly cancelFilters: Locator;
  readonly myFiltersTab: Locator;
  readonly sharedFiltersTab: Locator;

  readonly reportList: Locator;
  readonly reportTimePeriod: Locator;
  readonly reportManagerToggle: Locator;

  readonly deviceToggleAll: Locator;
  readonly deviceToggleDesktop: Locator;
  readonly deviceToggleMobile: Locator;
  readonly deviceToggleIos: Locator;
  readonly deviceToggleAndroid: Locator;
  readonly deviceToggleWrapper: Locator;

  readonly totalAttributionCardContainer: Locator;
  readonly allDevicesCard: Locator;
  readonly totalAttributionGraphContainer: Locator;
  readonly allDevicesPlatformGraph: Locator;
  readonly desktopPlatformGraph: Locator;
  readonly iosPlatformGraph: Locator;
  readonly androidPlatformGraph: Locator;

  readonly desktopTableSectionTab: Locator;
  readonly mobileTableSectionTab: Locator;
  readonly iosTableSectionTab: Locator;
  readonly androidTableSectionTab: Locator;

  readonly desktopPageGraph: Locator;
  readonly mobilePageGraph: Locator;
  readonly iosPageGraph: Locator;
  readonly androidPageGraph: Locator;
  readonly desktopPageTable: Locator;
  readonly mobilePageTable: Locator;
  readonly iosPageTable: Locator;
  readonly androidPageTable: Locator;

  readonly tableAllDevices: Locator;
  readonly tableDesktop: Locator;
  readonly tableMobile: Locator;
  readonly tableIos: Locator;
  readonly tableAndroid: Locator;

  readonly addComparison: Locator;
  readonly revenueImpactRulesBtn: Locator;
  readonly viewActiveRuleBtn: Locator;
  readonly exportMenu: Locator;
  readonly revenueCalculatorBtnContainer: Locator;
  readonly highchartsContainers: Locator;
  readonly highchartsTooltip: Locator;
  readonly tableSearch: Locator;

  readonly dateOfPerformanceChangeView: Locator;
  readonly performanceMetricView: Locator;
  readonly discardSessionsView: Locator;
  readonly dataOriginView: Locator;

  constructor(private readonly page: Page) {
    this.pageTitle = page.locator('#page-title');

    this.siteSelectContainer = page.locator('#select2-site-id-container');
    this.toggleFilters = page.locator('#toggle-filters');
    this.mobileFiltersBtn = page.locator('#mobile-controls-filters-btn');
    // On this page #apply-filters is labeled "Save & Run Report" — soft-assert only; never click in suite.
    this.applyFilters = page.locator('#apply-filters');
    this.cancelFilters = page.locator('#cancel-filters').or(
      page.locator('button, a.btn').filter({ hasText: /^Cancel$/i }).first()
    );
    this.myFiltersTab = page.locator('#my-filters-tab');
    this.sharedFiltersTab = page.locator('#shared-filters-tab');

    this.reportList = page.locator('#report-list');
    this.reportTimePeriod = page.locator('#report-time-period');
    this.reportManagerToggle = page.locator('#report-manager-toggle');

    this.deviceToggleWrapper = page.locator('#rev-attr-values-vis_toggle_wrapper');
    this.deviceToggleAll = page.locator('#rev-attr-values-vis_toggle-all_devices');
    this.deviceToggleDesktop = page.locator('#rev-attr-values-vis_toggle-desktop');
    this.deviceToggleMobile = page.locator('#rev-attr-values-vis_toggle-mobile');
    this.deviceToggleIos = page.locator('#rev-attr-values-vis_toggle-ios');
    this.deviceToggleAndroid = page.locator('#rev-attr-values-vis_toggle-android');

    this.totalAttributionCardContainer = page.locator('#total-attribution-card-container');
    this.allDevicesCard = page.locator('#all-devices-card, #rev-attr-values-all_devices').first();
    this.totalAttributionGraphContainer = page.locator('#total-attribution-graph-container');
    this.allDevicesPlatformGraph = page.locator('#rev-attr-values-bar-graph-all_devices');
    this.desktopPlatformGraph = page.locator('#rev-attr-values-bar-graph-desktop');
    this.iosPlatformGraph = page.locator('#rev-attr-values-bar-graph-ios');
    this.androidPlatformGraph = page.locator('#rev-attr-values-bar-graph-android');

    this.desktopTableSectionTab = page.locator('#desktop-table-section-tab');
    this.mobileTableSectionTab = page.locator('#mobile-table-section-tab');
    this.iosTableSectionTab = page.locator('#ios-table-section-tab');
    this.androidTableSectionTab = page.locator('#android-table-section-tab');

    this.desktopPageGraph = page.locator('#desktop-revenue-attribution-by-page-graph');
    this.mobilePageGraph = page.locator('#mobile-revenue-attribution-by-page-graph');
    this.iosPageGraph = page.locator('#ios-revenue-attribution-by-page-graph');
    this.androidPageGraph = page.locator('#android-revenue-attribution-by-page-graph');
    this.desktopPageTable = page.locator('#desktop-revenue-attribution-table');
    this.mobilePageTable = page.locator('#mobile-revenue-attribution-table');
    this.iosPageTable = page.locator('#ios-revenue-attribution-table');
    this.androidPageTable = page.locator('#android-revenue-attribution-table');

    this.tableAllDevices = page.locator('#rev-attr-values-table-all_devices');
    this.tableDesktop = page.locator('#rev-attr-values-table-desktop');
    this.tableMobile = page.locator('#rev-attr-values-table-mobile');
    this.tableIos = page.locator('#rev-attr-values-table-ios');
    this.tableAndroid = page.locator('#rev-attr-values-table-android');

    this.addComparison = page
      .locator('button, a.btn, a')
      .filter({ hasText: /Add Comparison/i })
      .first();
    this.revenueImpactRulesBtn = page.locator('#revenue-impact-rules-config-button');
    this.viewActiveRuleBtn = page.locator('#view-active-rule-btn');
    this.exportMenu = page.locator('button, a, .btn').filter({ hasText: /^Export$/i }).first();
    this.revenueCalculatorBtnContainer = page.locator('#revenue-calculator-btn-container');
    this.highchartsContainers = page.locator('.highcharts-container');
    this.highchartsTooltip = page.locator('.highcharts-tooltip, .highcharts-label.highcharts-tooltip');
    this.tableSearch = page
      .locator('input.tablesorter-filter, input[id*="table-search"], input[type="search"][placeholder*="Search" i]')
      .first();

    this.dateOfPerformanceChangeView = page.locator('#date-of-performance-change-view');
    this.performanceMetricView = page.locator('#performance-metric-view');
    this.discardSessionsView = page.locator('#discard-sessions-over-view');
    this.dataOriginView = page.locator('#data-origin-view');
  }

  deviceCard(device: string): Locator {
    return this.page.locator(`#rev-attr-values-${device}`);
  }

  deviceMetric(device: string, metric: string): Locator {
    return this.page.locator(`#rev-attr-values-${device}-${metric}`);
  }

  runAdHocReport(): Locator {
    return this.page.locator('button, a.btn, a').filter({ hasText: /Run Ad-Hoc Report/i }).first();
  }
}
