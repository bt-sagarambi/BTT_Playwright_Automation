import { Page, Locator } from '@playwright/test';

/**
 * Locators for Monitoring / Real User Browser / Performance Comparison
 * Route: real-user-monitoring/performance-comparison
 */
export class RumPerformanceComparisonLocators {
  readonly pageTitle: Locator;

  readonly markersContainer: Locator;
  readonly markerCaret: Locator;
  readonly markerDropdownTitle: Locator;
  readonly markerDropdown: Locator;
  readonly markerDropdownItems: Locator;

  readonly dataOriginBadge: Locator;
  readonly timePeriodBadge: Locator;
  readonly deviceBadge: Locator;
  readonly browserBadge: Locator;
  readonly osBadge: Locator;
  readonly pageNameBadge: Locator;
  readonly bucketSizeBadge: Locator;
  readonly pageControlsToggle: Locator;

  readonly quickDataOriginFilter: Locator;
  readonly quickDeviceFilter: Locator;
  readonly quickBrowserFilter: Locator;
  readonly quickBucketSizeFilter: Locator;
  readonly dataOriginQuickSelect: Locator;
  readonly bucketSizeQuickSelect: Locator;

  readonly comparisonGraph: Locator;
  readonly comparisonTable: Locator;
  readonly comparisonTableHost: Locator;
  readonly tableSearch: Locator;

  readonly filtersToggle: Locator;
  readonly applyFiltersButton: Locator;
  readonly timePeriodInput: Locator;
  readonly dataOriginSelect: Locator;
  readonly bucketSizeSelect: Locator;
  readonly pageNameSelect: Locator;

  readonly highchartsContainers: Locator;
  readonly highchartsTooltip: Locator;
  readonly infoIcons: Locator;

  constructor(private readonly page: Page) {
    this.pageTitle = page.locator('#page-title');

    this.markersContainer = page.locator('#toggle-markers-container');
    this.markerCaret = page.locator('#marker-caret');
    this.markerDropdownTitle = page.locator('#toggle-dropdown-title');
    this.markerDropdown = page.locator('#toggle-dropdown');
    this.markerDropdownItems = page.locator('#toggle-dropdown-items li.toggle-markers-dropdown-item');

    this.dataOriginBadge = page.locator('#data-origin-view');
    this.timePeriodBadge = page.locator('#time-period-view');
    this.deviceBadge = page.locator('#device-view');
    this.browserBadge = page.locator('#browser-view');
    this.osBadge = page.locator('#osVersion-view');
    this.pageNameBadge = page.locator('#page-name-view');
    this.bucketSizeBadge = page.locator('#bucket-size-view');
    this.pageControlsToggle = page.locator('#page-controls-toggle');

    this.quickDataOriginFilter = page.locator('#quick-data-origin-filter');
    this.quickDeviceFilter = page.locator('#quick-device-filter');
    this.quickBrowserFilter = page.locator('#quick-browser-filter');
    this.quickBucketSizeFilter = page.locator('#quick-bucket-size-filter');
    this.dataOriginQuickSelect = page.locator('#data-origin-quick-select');
    this.bucketSizeQuickSelect = page.locator('#bucket-size-quick-select');

    this.comparisonGraph = page.locator('#page-performance-comparison-graph');
    this.comparisonTableHost = page.locator('#page-performance-comparison-table');
    this.comparisonTable = page.locator('#table-for-page-performance-comparison-table');
    this.tableSearch = page.locator('#table-search-table-for-page-performance-comparison-table');

    this.filtersToggle = page.locator('#toggle-filters');
    this.applyFiltersButton = page.locator('#apply-filters').or(
      page.locator('button, a.btn').filter({ hasText: /Apply Filters/i }).first()
    );
    this.timePeriodInput = page.locator('#time-period');
    this.dataOriginSelect = page.locator('#data-origin');
    this.bucketSizeSelect = page.locator('#bucket-size');
    this.pageNameSelect = page.locator('#page-name');

    this.highchartsContainers = page.locator('.highcharts-container');
    this.highchartsTooltip = page.locator('.highcharts-tooltip, .highcharts-label.highcharts-tooltip');
    this.infoIcons = page.locator(
      '.fa-info-circle, .fal.fa-info-circle, i[class*="fa-info"], [data-toggle="tooltip"][data-original-title]'
    );
  }

  markerOption(label: string | RegExp): Locator {
    return this.markerDropdownItems.filter({ hasText: label }).first();
  }

  tableHeader(name: string | RegExp): Locator {
    return this.comparisonTable.locator('thead th').filter({ hasText: name }).first();
  }

  pagerSelect(): Locator {
    return this.comparisonTableHost.locator('select.gotoPage, .tablesorter-pager select, select[aria-controls*="page-performance"]').first();
  }
}
