import { Page, Locator } from '@playwright/test';

/**
 * Locators for Business Insights / Improve Conversion / Revenue Calculator
 * Route: business-analytics/revenue-calculator&conversion-type=sales
 * Prefer stable host ids / titles — not dynamic highcharts-* suffixes.
 */
export class RevenueCalculatorLocators {
  readonly pageTitle: Locator;

  readonly siteSelectContainer: Locator;
  readonly toggleFilters: Locator;
  readonly mobileFiltersBtn: Locator;
  readonly applyFilters: Locator;
  readonly cancelFilters: Locator;
  readonly myFiltersTab: Locator;
  readonly sharedFiltersTab: Locator;

  readonly timePeriodView: Locator;
  readonly dataTypeView: Locator;
  readonly browserView: Locator;
  readonly osView: Locator;
  readonly pageNameView: Locator;
  readonly deviceView: Locator;
  readonly performanceMetricView: Locator;
  readonly discardSessionsView: Locator;
  readonly bucketSizeView: Locator;

  readonly revenueAttribution: Locator;
  readonly addComparison: Locator;
  readonly togglePieCharts: Locator;
  readonly pieChartRow: Locator;
  readonly pageViewsByPage: Locator;
  readonly pageViewsByTrafficSegment: Locator;
  readonly toggleCalibration: Locator;
  readonly calibrationSlider: Locator;
  readonly resetCalibration: Locator;
  readonly saveCalibration: Locator;
  readonly revenueImpactRulesBtn: Locator;

  readonly totalSessions: Locator;
  readonly totalConversions: Locator;
  readonly avgPageViews: Locator;
  readonly avgBounceRate: Locator;
  readonly selectedPercentile: Locator;
  readonly revOpportunity: Locator;

  readonly graphConvCurveBtn: Locator;
  readonly tableConvCurveBtn: Locator;
  readonly conversionRateCurveGraph: Locator;
  readonly conversionRateCurveTable: Locator;

  readonly whatIfSpedUpByToggle: Locator;
  readonly whatIfPageSpeedWasToggle: Locator;
  readonly spedUpByGraph: Locator;
  readonly spedUpToGraph: Locator;

  readonly graphConversionTimeBtn: Locator;
  readonly tableConversionTimeBtn: Locator;
  readonly conversionOverTimeGraph: Locator;
  readonly conversionOverTimeTable: Locator;

  readonly toggleFilterLegend: Locator;
  readonly highchartsContainers: Locator;
  readonly highchartsLegendItems: Locator;
  readonly highchartsTooltip: Locator;
  readonly tableSearch: Locator;
  readonly exportMenu: Locator;

  constructor(private readonly page: Page) {
    this.pageTitle = page.locator('#page-title');

    this.siteSelectContainer = page.locator('#select2-site-id-container');
    this.toggleFilters = page.locator('#toggle-filters');
    this.mobileFiltersBtn = page.locator('#mobile-controls-filters-btn');
    this.applyFilters = page.locator('#apply-filters').or(
      page.locator('button, a.btn').filter({ hasText: /Apply Filters/i }).first()
    );
    this.cancelFilters = page.locator('#cancel-filters').or(
      page.locator('button, a.btn').filter({ hasText: /^Cancel$/i }).first()
    );
    this.myFiltersTab = page.locator('#my-filters-tab');
    this.sharedFiltersTab = page.locator('#shared-filters-tab');

    this.timePeriodView = page.locator('#time-period-view');
    this.dataTypeView = page.locator('#data-type-view');
    this.browserView = page.locator('#browser-view');
    this.osView = page.locator('#operating-system-view');
    this.pageNameView = page.locator('#page-name-view');
    this.deviceView = page.locator('#device-view');
    this.performanceMetricView = page.locator('#performance-metric-view');
    this.discardSessionsView = page.locator('#discard-sessions-over-view');
    this.bucketSizeView = page.locator('#bucket-size-view');

    this.revenueAttribution = page.locator('#revenue-attribution');
    this.addComparison = page
      .locator('#add-comparison-to-graph, button, a.btn')
      .filter({ hasText: /Add Comparison/i })
      .first();
    this.togglePieCharts = page.locator('#toggle-pie-chart-row');
    this.pieChartRow = page.locator('#pie-chart-row');
    this.pageViewsByPage = page.locator('#page-views-by-page');
    this.pageViewsByTrafficSegment = page.locator('#page-views-by-traffic-segment');
    this.toggleCalibration = page.locator('#toggle-revenue-calibration');
    this.calibrationSlider = page.locator('#calibration-slider');
    this.resetCalibration = page.locator('#reset-calibration-slider');
    this.saveCalibration = page.locator('#save-calibration-slider');
    this.revenueImpactRulesBtn = page.locator('#revenue-impact-rules-config-button');

    this.totalSessions = page.locator('#total-sessions');
    this.totalConversions = page.locator('#total-conversions');
    this.avgPageViews = page.locator('#avg-page-views');
    this.avgBounceRate = page.locator('#avg-bounce-rate');
    this.selectedPercentile = page.locator('#selected-percentile');
    this.revOpportunity = page.locator('#rev-opportunity');

    this.graphConvCurveBtn = page.locator('#graph-conv-curve-btn');
    this.tableConvCurveBtn = page.locator('#table-conv-curve-btn');
    this.conversionRateCurveGraph = page.locator('#conversion-rate-curve-graph');
    this.conversionRateCurveTable = page.locator('#table-for-conversion-rate-curve-table');

    this.whatIfSpedUpByToggle = page
      .locator('button, a, .btn, [role="button"]')
      .filter({ hasText: /WHAT IF WE SPED PAGE UP BY/i })
      .first();
    this.whatIfPageSpeedWasToggle = page
      .locator('button, a, .btn, [role="button"]')
      .filter({ hasText: /WHAT IF PAGE SPEED WAS/i })
      .first();
    this.spedUpByGraph = page.locator('#revenue-calculator-sped-up-by');
    this.spedUpToGraph = page.locator('#revenue-calculator-sped-up-to');

    this.graphConversionTimeBtn = page.locator('#graph-conversion-time-btn');
    this.tableConversionTimeBtn = page.locator('#table-conversion-time-btn');
    this.conversionOverTimeGraph = page.locator('#conversion-rate-over-time-graph');
    this.conversionOverTimeTable = page.locator('#table-for-conversion-rate-over-time-table');

    this.toggleFilterLegend = page
      .locator('button, a, .btn')
      .filter({ hasText: /Toggle Filter Legend/i })
      .first();
    this.highchartsContainers = page.locator('.highcharts-container');
    this.highchartsLegendItems = page.locator('.highcharts-legend-item');
    this.highchartsTooltip = page.locator('.highcharts-tooltip, .highcharts-label.highcharts-tooltip');
    this.tableSearch = page
      .locator('input.tablesorter-filter, input[id*="table-search"], input[type="search"][placeholder*="Search" i]')
      .first();
    this.exportMenu = page.locator('button, a, .btn').filter({ hasText: /^Export$/i }).first();
  }

  kpiStripText(): Locator {
    return this.page.locator('#page-contents, #page-wrapper, body').first();
  }
}
