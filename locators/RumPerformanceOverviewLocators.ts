import { Page, Locator } from '@playwright/test';

/**
 * Locators for Monitoring / Real User Browser / Performance Overview
 * (live page title often shows Core Web Vitals / VitalScope branding).
 * Route: real-user-monitoring/performance-overview
 */
export class RumPerformanceOverviewLocators {
  readonly pageTitle: Locator;

  readonly viewFiltersButton: Locator;
  readonly viewFiltersBanner: Locator;
  readonly filtersToggle: Locator;
  readonly applyFiltersButton: Locator;
  readonly timePeriodInput: Locator;

  readonly dataOriginBadge: Locator;
  readonly timePeriodBadge: Locator;
  readonly deviceBadge: Locator;
  readonly browserBadge: Locator;
  readonly pageNameBadge: Locator;
  readonly bucketSizeBadge: Locator;
  readonly quickDataOriginFilter: Locator;
  readonly quickDeviceFilter: Locator;
  readonly quickBrowserFilter: Locator;
  readonly quickBucketSizeFilter: Locator;

  readonly performanceByPageSection: Locator;
  readonly performanceByPageTableHost: Locator;
  readonly performanceByPageTable: Locator;
  readonly pageNameToggleUrl: Locator;
  readonly copyUrlButton: Locator;
  readonly instantMeasurementButton: Locator;
  readonly pageNameUrl: Locator;
  readonly vsDrilldownIcon: Locator;
  readonly vsMetricValue: Locator;

  readonly vsDrilldownModal: Locator;
  readonly vsDrilldownContainer: Locator;
  readonly vsDrilldownClose: Locator;

  readonly customizeTableButton: Locator;
  readonly customizeTableModal: Locator;
  readonly includeAllColumns: Locator;
  readonly excludeAllColumns: Locator;
  readonly resetCustomizedTable: Locator;
  readonly defaultCustomizedTable: Locator;
  readonly saveCustomizedTable: Locator;

  readonly tableHamburger: Locator;
  readonly downloadCsv: Locator;
  readonly downloadTsv: Locator;

  readonly worldMap: Locator;
  readonly countryTable: Locator;
  readonly regionTable: Locator;
  readonly browserTable: Locator;
  readonly ispTable: Locator;
  readonly trafficSourceTable: Locator;

  readonly highchartsContainers: Locator;

  constructor(private readonly page: Page) {
    this.pageTitle = page.locator('#page-title');

    this.viewFiltersButton = page.locator('#performance-view-filter');
    this.viewFiltersBanner = page.locator('#toggle-filter-section');
    this.filtersToggle = page.locator('#toggle-filters');
    this.applyFiltersButton = page.locator('#apply-filters').or(
      page.locator('button, a.btn').filter({ hasText: /Apply Filters/i }).first()
    );
    this.timePeriodInput = page.locator('#time-period');

    this.dataOriginBadge = page.locator('#data-origin-view');
    this.timePeriodBadge = page.locator('#time-period-view');
    this.deviceBadge = page.locator('#device-view');
    this.browserBadge = page.locator('#browser-view');
    this.pageNameBadge = page.locator('#page-name-view');
    this.bucketSizeBadge = page.locator('#bucket-size-view');
    this.quickDataOriginFilter = page.locator('#quick-data-origin-filter');
    this.quickDeviceFilter = page.locator('#quick-device-filter');
    this.quickBrowserFilter = page.locator('#quick-browser-filter');
    this.quickBucketSizeFilter = page.locator('#quick-bucket-size-filter');

    this.performanceByPageSection = page.getByText(/Performance Overview/i).first();
    this.performanceByPageTableHost = page.locator('#performance-by-page-table');
    this.performanceByPageTable = page.locator('#table-for-performance-by-page-table');
    this.pageNameToggleUrl = page.locator('.page-name-toggle-url');
    this.copyUrlButton = page.locator('.copy-url-btn');
    this.instantMeasurementButton = page.locator('.instant-measurement-btn');
    this.pageNameUrl = page.locator('.page-name-url');
    this.vsDrilldownIcon = page.locator('i.vsDrilldown');
    this.vsMetricValue = page.locator('.vs-metric-value');

    this.vsDrilldownModal = page.locator('#vsDrilldown-modal');
    this.vsDrilldownContainer = page.locator('#vsDrilldown-container');
    this.vsDrilldownClose = page.locator(
      '#vsDrilldown-modal .close, #vsDrilldown-modal [data-dismiss="modal"]'
    );

    this.customizeTableButton = page.locator('button.view-customize-table-modal');
    this.customizeTableModal = page.locator('#customize-table-modal');
    this.includeAllColumns = page.locator('#include-all');
    this.excludeAllColumns = page.locator('#exclude-all');
    this.resetCustomizedTable = page.locator('#reset-customized-table');
    this.defaultCustomizedTable = page.locator('#default-customized-table');
    this.saveCustomizedTable = page.locator('#save-customized-table');

    this.tableHamburger = this.performanceByPageTableHost.locator('.fal.fa-bars, .fa-bars').first();
    this.downloadCsv = page.locator('.download-csv');
    this.downloadTsv = page.locator('.download-tsv');

    this.worldMap = page.locator('#world-map');
    this.countryTable = page.locator('#country-table');
    this.regionTable = page.locator('#region-table');
    this.browserTable = page.locator('#browser-table');
    this.ispTable = page.locator('#isp-table');
    this.trafficSourceTable = page.locator('#traffic-source-table');

    this.highchartsContainers = page.locator('.highcharts-container');
  }
}
