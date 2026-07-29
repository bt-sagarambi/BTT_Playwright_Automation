import { Page, Locator } from '@playwright/test';

/**
 * Locators for Monitoring / Real User Browser / Errors Explorer
 * Route: javascript-errors/real-user
 */
export class RumErrorsExplorerLocators {
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
  readonly botTrafficBadge: Locator;
  readonly bucketSizeBadge: Locator;
  readonly errorTypesBadge: Locator;
  readonly pageControlsToggle: Locator;

  readonly quickDataOriginFilter: Locator;
  readonly quickDeviceFilter: Locator;
  readonly quickBrowserFilter: Locator;
  readonly quickOsFilter: Locator;
  readonly quickBotTrafficFilter: Locator;
  readonly quickBucketSizeFilter: Locator;

  readonly errorsByTypeContainer: Locator;
  readonly totalJsErrorsSum: Locator;
  readonly allErrorsDonut: Locator;
  readonly uniqueJsErrorsSum: Locator;
  readonly uniqueErrorsDonut: Locator;

  readonly topLocationsChart: Locator;
  readonly topLocationsTable: Locator;
  readonly topDomainsChart: Locator;
  readonly topDomainsTable: Locator;
  readonly topPagesChart: Locator;
  readonly topPagesTable: Locator;
  readonly topDevicesChart: Locator;
  readonly topDevicesTable: Locator;
  readonly topOsChart: Locator;
  readonly topOsTable: Locator;
  readonly topBrowsersChart: Locator;
  readonly topBrowsersTable: Locator;

  readonly filterPreview: Locator;
  readonly clearJsErrorFilters: Locator;
  readonly errorsOverTimeGraph: Locator;
  readonly errorsTableWrapper: Locator;
  readonly sessionCountLabel: Locator;

  readonly filtersToggle: Locator;
  readonly applyFiltersButton: Locator;
  readonly cancelFiltersButton: Locator;
  readonly sharePageButton: Locator;
  readonly highchartsContainers: Locator;
  readonly infoIcons: Locator;
  readonly pageContents: Locator;

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
    this.botTrafficBadge = page.locator('#bot-traffic-view');
    this.bucketSizeBadge = page.locator('#bucket-size-view');
    this.errorTypesBadge = page.locator('#js-error-type-inclusion-exclusion-view');
    this.pageControlsToggle = page.locator('#page-controls-toggle');

    this.quickDataOriginFilter = page.locator('#quick-data-origin-filter');
    this.quickDeviceFilter = page.locator('#quick-device-filter');
    this.quickBrowserFilter = page.locator('#quick-browser-filter');
    this.quickOsFilter = page.locator('#quick-operating-system-filter');
    this.quickBotTrafficFilter = page.locator('#quick-bot-traffic-filter');
    this.quickBucketSizeFilter = page.locator('#quick-bucket-size-filter');

    this.errorsByTypeContainer = page.locator('#js-errors-by-type-donut-chart-container');
    this.totalJsErrorsSum = page.locator('#total-js-errors-sum');
    this.allErrorsDonut = page.locator('#javascript-error-type-donut-chart');
    this.uniqueJsErrorsSum = page.locator('#unique-js-errors-sum');
    this.uniqueErrorsDonut = page.locator('#unique-javascript-error-type-donut-chart');

    this.topLocationsChart = page.locator('#javascript-errors-region-donut-chart');
    this.topLocationsTable = page.locator('#javascript-errors-region-donut-chart-table-wrapper');
    this.topDomainsChart = page.locator('#javascript-errors-fileName-donut-chart');
    this.topDomainsTable = page.locator('#javascript-errors-fileName-donut-chart-table-wrapper');
    this.topPagesChart = page.locator('#javascript-errors-pageName-donut-chart');
    this.topPagesTable = page.locator('#javascript-errors-pageName-donut-chart-table-wrapper');
    this.topDevicesChart = page.locator('#javascript-errors-device-donut-chart');
    this.topDevicesTable = page.locator('#javascript-errors-device-donut-chart-table-wrapper');
    this.topOsChart = page.locator('#javascript-errors-os-donut-chart');
    this.topOsTable = page.locator('#javascript-errors-os-donut-chart-table-wrapper');
    this.topBrowsersChart = page.locator('#javascript-errors-browser-donut-chart');
    this.topBrowsersTable = page.locator('#javascript-errors-browser-donut-chart-table-wrapper');

    this.filterPreview = page.locator('#javascript-error-filter-preview');
    this.clearJsErrorFilters = page.locator('#js-error-clear-filters');
    this.errorsOverTimeGraph = page.locator('#javascript-error-type-bar-graph');
    this.errorsTableWrapper = page.locator('#javascript-error-type-by-file-message-table-wrapper');
    this.sessionCountLabel = page.locator('#javascript-error-total-session-count');

    this.filtersToggle = page.locator('#toggle-filters');
    this.applyFiltersButton = page.locator('#apply-filters');
    this.cancelFiltersButton = page.locator('#cancel-filters');
    this.sharePageButton = page.locator('#share-page-btn');
    this.highchartsContainers = page.locator('.highcharts-container');
    this.infoIcons = page.locator(
      '.fa-info-circle, .fal.fa-info-circle, i[class*="fa-info"], [data-toggle="tooltip"][data-original-title]'
    );
    this.pageContents = page.locator('#page-contents');
  }

  markerOption(label: string | RegExp): Locator {
    return this.markerDropdownItems.filter({ hasText: label }).first();
  }

  errorsTable(): Locator {
    return this.errorsTableWrapper.locator('table').first();
  }

  topChartTable(which: 'region' | 'fileName' | 'pageName' | 'device' | 'os' | 'browser'): Locator {
    const map = {
      region: this.topLocationsTable,
      fileName: this.topDomainsTable,
      pageName: this.topPagesTable,
      device: this.topDevicesTable,
      os: this.topOsTable,
      browser: this.topBrowsersTable,
    } as const;
    return map[which].locator('table').first();
  }
}
