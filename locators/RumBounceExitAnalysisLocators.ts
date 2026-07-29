import { Page, Locator } from '@playwright/test';

/**
 * Locators for Monitoring / Real User Browser / Bounce & Exit Analysis
 * Route: real-user-monitoring/bounce-and-exit-analysis
 */
export class RumBounceExitAnalysisLocators {
  readonly pageTitle: Locator;

  readonly markersContainer: Locator;
  readonly markerDropdownTitle: Locator;
  readonly markerDropdown: Locator;
  readonly markerDropdownItems: Locator;

  readonly dataOriginBadge: Locator;
  readonly timePeriodBadge: Locator;
  readonly deviceBadge: Locator;
  readonly browserBadge: Locator;
  readonly osBadge: Locator;
  readonly bucketSizeBadge: Locator;
  readonly performanceMetricBadge: Locator;
  readonly discardSessionsBadge: Locator;
  readonly pageControlsToggle: Locator;

  readonly quickDataOriginFilter: Locator;
  readonly quickDeviceFilter: Locator;
  readonly quickBrowserFilter: Locator;
  readonly quickOsFilter: Locator;
  readonly quickBucketSizeFilter: Locator;

  readonly bounceRateCard: Locator;
  readonly bounceNumberCard: Locator;
  readonly exitRateCard: Locator;
  readonly pageExitRateCard: Locator;
  readonly exitNumberCard: Locator;
  readonly pagesCard: Locator;
  readonly pagesPerVisitorCard: Locator;
  readonly onloadCard: Locator;

  readonly bounceAverageRateBtn: Locator;
  readonly bounceRateBtn: Locator;
  readonly exitRateBtn: Locator;
  readonly pageExitRateBtn: Locator;
  readonly graphTimeBtn: Locator;
  readonly tableTimeBtn: Locator;

  readonly bounceRateOverTimeAverageGraph: Locator;
  readonly bounceRateOverTimeAverageTable: Locator;
  readonly bounceRateOverTimeGraph: Locator;
  readonly bounceRateOverTimeTable: Locator;
  readonly exitRateOverTimeGraph: Locator;
  readonly exitRateOverTimeTable: Locator;
  readonly pageExitRateOverTimeGraph: Locator;
  readonly pageExitRateOverTimeTable: Locator;

  readonly bounceRateOnloadBtn: Locator;
  readonly bouncePageOnloadBtn: Locator;
  readonly exitRateOnloadBtn: Locator;
  readonly pageExitRateOnloadBtn: Locator;
  readonly graphCurveBtn: Locator;
  readonly tableCurveBtn: Locator;

  readonly bounceRateCurveGraph: Locator;
  readonly bounceRateCurveTable: Locator;
  readonly bounceRateCurveByPageGraph: Locator;
  readonly bounceRateCurveByPageTable: Locator;
  readonly exitRateCurveByPageGraph: Locator;
  readonly exitRateCurveByPageTable: Locator;
  readonly pageExitRateCurveByPageGraph: Locator;
  readonly pageExitRateCurveByPageTable: Locator;

  readonly bounceRateOverviewTable: Locator;
  readonly toggle7DayTable: Locator;

  readonly filtersToggle: Locator;
  readonly applyFiltersButton: Locator;
  readonly cancelFiltersButton: Locator;
  readonly sharePageButton: Locator;
  readonly highchartsContainers: Locator;
  readonly infoIcons: Locator;

  constructor(private readonly page: Page) {
    this.pageTitle = page.locator('#page-title');

    this.markersContainer = page.locator('#toggle-markers-container');
    this.markerDropdownTitle = page.locator('#toggle-dropdown-title');
    this.markerDropdown = page.locator('#toggle-dropdown');
    this.markerDropdownItems = page.locator('#toggle-dropdown-items li.toggle-markers-dropdown-item');

    this.dataOriginBadge = page.locator('#data-origin-view');
    this.timePeriodBadge = page.locator('#time-period-view');
    this.deviceBadge = page.locator('#device-view');
    this.browserBadge = page.locator('#browser-view');
    this.osBadge = page.locator('#operating-system-view');
    this.bucketSizeBadge = page.locator('#bucket-size-view');
    this.performanceMetricBadge = page.locator('#performance-metric-view');
    this.discardSessionsBadge = page.locator('#discard-sessions-over-view');
    this.pageControlsToggle = page.locator('#page-controls-toggle');

    this.quickDataOriginFilter = page.locator('#quick-data-origin-filter');
    this.quickDeviceFilter = page.locator('#quick-device-filter');
    this.quickBrowserFilter = page.locator('#quick-browser-filter');
    this.quickOsFilter = page.locator('#quick-operating-system-filter');
    this.quickBucketSizeFilter = page.locator('#quick-bucket-size-filter');

    this.bounceRateCard = page.locator('#bounce-rate-card');
    this.bounceNumberCard = page.locator('#bounce-number-card');
    this.exitRateCard = page.locator('#exit-rate-card');
    this.pageExitRateCard = page.locator('#page-exit-rate-card');
    this.exitNumberCard = page.locator('#exit-number-card');
    this.pagesCard = page.locator('#pages-card');
    this.pagesPerVisitorCard = page.locator('#pages-per-visitor-card');
    this.onloadCard = page.locator('#onload-for-bounce');

    this.bounceAverageRateBtn = page.locator('#bounce-average-rate-btn');
    this.bounceRateBtn = page.locator('#bounce-rate-btn');
    this.exitRateBtn = page.locator('#exit-rate-btn');
    this.pageExitRateBtn = page.locator('#page-exit-rate-btn');
    this.graphTimeBtn = page.locator('#graph-time-btn');
    this.tableTimeBtn = page.locator('#table-time-btn');

    this.bounceRateOverTimeAverageGraph = page.locator('#bounce-rate-over-time-average-graph');
    this.bounceRateOverTimeAverageTable = page.locator('#table-for-bounce-rate-over-time-average-table');
    this.bounceRateOverTimeGraph = page.locator('#bounce-rate-over-time-graph');
    this.bounceRateOverTimeTable = page.locator('#table-for-bounce-rate-over-time-table');
    this.exitRateOverTimeGraph = page.locator('#exit-rate-over-time-graph');
    this.exitRateOverTimeTable = page.locator('#table-for-exit-rate-over-time-table');
    this.pageExitRateOverTimeGraph = page.locator('#page-exit-rate-over-time-graph');
    this.pageExitRateOverTimeTable = page.locator('#table-for-page-exit-rate-over-time-table');

    this.bounceRateOnloadBtn = page.locator('#bounce-rate-onload-btn');
    this.bouncePageOnloadBtn = page.locator('#bounce-page-onload-btn');
    this.exitRateOnloadBtn = page.locator('#exit-rate-onload-btn');
    this.pageExitRateOnloadBtn = page.locator('#page-exit-rate-onload-btn');
    this.graphCurveBtn = page.locator('#graph-curve-btn');
    this.tableCurveBtn = page.locator('#table-curve-btn');

    this.bounceRateCurveGraph = page.locator('#bounce-rate-curve-graph');
    this.bounceRateCurveTable = page.locator('#table-for-bounce-rate-curve-table');
    this.bounceRateCurveByPageGraph = page.locator('#bounce-rate-curve-by-page-graph');
    this.bounceRateCurveByPageTable = page.locator('#table-for-bounce-rate-curve-by-page-table');
    this.exitRateCurveByPageGraph = page.locator('#exit-rate-curve-by-page-graph');
    this.exitRateCurveByPageTable = page.locator('#table-for-exit-rate-curve-by-page-table');
    this.pageExitRateCurveByPageGraph = page.locator('#page-exit-rate-curve-by-page-graph');
    this.pageExitRateCurveByPageTable = page.locator('#table-for-page-exit-rate-curve-by-page-table');

    this.bounceRateOverviewTable = page.locator('#table-for-bounce-rate-overview-table');
    this.toggle7DayTable = page.getByText(/Toggle 7 Day Table/i).or(
      page.locator('button, a').filter({ hasText: /Toggle 7 Day Table/i }).first()
    );

    this.filtersToggle = page.locator('#toggle-filters');
    this.applyFiltersButton = page.locator('#apply-filters');
    this.cancelFiltersButton = page.locator('#cancel-filters');
    this.sharePageButton = page.locator('#share-page-btn');
    this.highchartsContainers = page.locator('.highcharts-container');
    this.infoIcons = page.locator(
      '.fa-info-circle, .fal.fa-info-circle, i[class*="fa-info"], [data-toggle="tooltip"][data-original-title]'
    );
  }

  markerOption(label: string | RegExp): Locator {
    return this.markerDropdownItems.filter({ hasText: label }).first();
  }
}
