import { Page, Locator } from '@playwright/test';

/**
 * Locators for Monitoring / Real User Browser / Aggregate Waterfall
 * Route: real-user-monitoring/object-level-trending
 */
export class RumAggregateWaterfallLocators {
  readonly pageTitle: Locator;

  readonly performanceDetailButton: Locator;
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
  readonly pageControlsToggle: Locator;

  readonly quickDataOriginFilter: Locator;
  readonly quickDeviceFilter: Locator;
  readonly quickBrowserFilter: Locator;
  readonly quickOsFilter: Locator;
  readonly quickBotTrafficFilter: Locator;

  readonly togglePieChartsButton: Locator;
  readonly pieChartRow: Locator;
  readonly pageViewsByPageChart: Locator;

  readonly domainLevelTab: Locator;
  readonly objectLevelTab: Locator;
  readonly graphViewButton: Locator;
  readonly tableViewButton: Locator;

  readonly firstPartyButton: Locator;
  readonly thirdPartyButton: Locator;
  readonly allPartyButton: Locator;
  readonly slowestMetricSelect: Locator;

  readonly domainAverageCards: Locator;
  readonly domainDomIntAvg: Locator;
  readonly domainDomConAvg: Locator;
  readonly domainOnloadAvg: Locator;
  readonly domainTtiAvg: Locator;
  readonly domainFcpAvg: Locator;
  readonly domainLcpAvg: Locator;
  readonly domainTbtAvg: Locator;
  readonly domainClsAvg: Locator;
  readonly domainFidAvg: Locator;

  readonly domainLevelGraph: Locator;
  readonly domainLevelTable: Locator;
  readonly domainLevelTableHost: Locator;
  readonly objectLevelTable: Locator;
  readonly objectLevelTableHost: Locator;
  readonly resourceTimingsTable: Locator;
  readonly resourceTimingsHost: Locator;
  readonly tableSearch: Locator;

  readonly runComparisonButton: Locator;
  readonly domainCompareGraph: Locator;
  readonly domainCompareTable: Locator;
  readonly domainCountTable: Locator;
  readonly objectCompareGraph: Locator;
  readonly objectCompareTable: Locator;
  readonly durationTab: Locator;
  readonly countTab: Locator;
  readonly objectDurationTab: Locator;
  readonly objectCountTab: Locator;
  readonly compareTableTabs: Locator;

  readonly customizeTableButton: Locator;
  readonly customizeTableModal: Locator;
  readonly includeAllColumns: Locator;
  readonly excludeAllColumns: Locator;
  readonly resetCustomizedTable: Locator;
  readonly defaultCustomizedTable: Locator;
  readonly saveCustomizedTable: Locator;

  readonly filtersToggle: Locator;
  readonly applyFiltersButton: Locator;
  readonly cancelFiltersButton: Locator;
  readonly timePeriodInput: Locator;
  readonly dataOriginSelect: Locator;

  readonly highchartsContainers: Locator;
  readonly highchartsTooltip: Locator;
  readonly infoIcons: Locator;
  readonly sharePageButton: Locator;

  constructor(private readonly page: Page) {
    this.pageTitle = page.locator('#page-title');

    this.performanceDetailButton = page.locator('#internal-link-to-button');
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
    this.pageControlsToggle = page.locator('#page-controls-toggle');

    this.quickDataOriginFilter = page.locator('#quick-data-origin-filter');
    this.quickDeviceFilter = page.locator('#quick-device-filter');
    this.quickBrowserFilter = page.locator('#quick-browser-filter');
    this.quickOsFilter = page.locator('#quick-operating-system-filter');
    this.quickBotTrafficFilter = page.locator('#quick-bot-traffic-filter');

    this.togglePieChartsButton = page.locator('#toggle-pie-chart-row');
    this.pieChartRow = page.locator('#pie-chart-row');
    this.pageViewsByPageChart = page.locator('#page-views-by-page-wcd');

    this.domainLevelTab = page.locator('#domain-rum-level-detail-btn');
    this.objectLevelTab = page.locator('#object-rum-level-detail-btn');
    this.graphViewButton = page.locator('#graph-rum-level-btn');
    this.tableViewButton = page.locator('#table-rum-level-btn');

    this.firstPartyButton = page.locator('#first-party-btn');
    this.thirdPartyButton = page.locator('#third-party-btn');
    this.allPartyButton = page.locator('#all-btn');
    this.slowestMetricSelect = page.locator('#slowest-metric');

    this.domainAverageCards = page.locator('#domain-average-cards');
    this.domainDomIntAvg = page.locator('#domain-dom-int-avg');
    this.domainDomConAvg = page.locator('#domain-dom-con-avg');
    this.domainOnloadAvg = page.locator('#domain-onload-avg');
    this.domainTtiAvg = page.locator('#domain-tti-avg');
    this.domainFcpAvg = page.locator('#domain-fcp-avg');
    this.domainLcpAvg = page.locator('#domain-lcp-avg');
    this.domainTbtAvg = page.locator('#domain-tbt-avg');
    this.domainClsAvg = page.locator('#domain-cls-avg');
    this.domainFidAvg = page.locator('#domain-fid-avg');

    this.domainLevelGraph = page.locator('#domain-level-detail-graph');
    this.domainLevelTableHost = page.locator('#domain-level-detail-table');
    this.domainLevelTable = page.locator('#table-for-domain-level-detail-table');
    this.objectLevelTableHost = page.locator('#object-level-detail-table, #object-level-detail');
    this.objectLevelTable = page.locator('#table-for-object-level-detail-table');
    this.resourceTimingsHost = page.locator('#resource-timings-by-file, .resource-timings').first();
    this.resourceTimingsTable = page.locator('#table-for-resource-timings-by-file');
    this.tableSearch = page.locator('#table-search').or(page.locator('input[id*="table-search"]').first());

    this.runComparisonButton = page.locator('#run-comparison-button');
    this.domainCompareGraph = page.locator('#domain-level-detail-compare-graph');
    this.domainCompareTable = page.locator('#domain-level-detail-compare-table');
    this.domainCountTable = page.locator('#domain-level-detail-count-table');
    this.objectCompareGraph = page.locator('#object-level-detail-compare-graph');
    this.objectCompareTable = page.locator('#object-level-detail-compare-table');
    this.durationTab = page.locator('#duration-tab');
    this.countTab = page.locator('#count-tab');
    this.objectDurationTab = page.locator('#object-duration-tab');
    this.objectCountTab = page.locator('#object-count-tab');
    this.compareTableTabs = page.locator('#compare-table-tabs');

    this.customizeTableButton = page.getByRole('button', { name: /Customize Table/i }).or(
      page.locator('button, a.btn').filter({ hasText: /Customize Table/i }).first()
    );
    this.customizeTableModal = page.locator('#customize-table-modal, .modal.in, .modal.show').filter({
      hasText: /Customize|column/i,
    }).first();
    this.includeAllColumns = page.locator('#include-all');
    this.excludeAllColumns = page.locator('#exclude-all');
    this.resetCustomizedTable = page.locator('#reset-customized-table');
    this.defaultCustomizedTable = page.locator('#default-customized-table');
    this.saveCustomizedTable = page.locator('#save-customized-table');

    this.filtersToggle = page.locator('#toggle-filters');
    this.applyFiltersButton = page.locator('#apply-filters');
    this.cancelFiltersButton = page.locator('#cancel-filters');
    this.timePeriodInput = page.locator('#time-period');
    this.dataOriginSelect = page.locator('#data-origin');

    this.highchartsContainers = page.locator('.highcharts-container');
    this.highchartsTooltip = page.locator('.highcharts-tooltip, .highcharts-label.highcharts-tooltip');
    this.infoIcons = page.locator(
      '.fa-info-circle, .fal.fa-info-circle, i[class*="fa-info"], [data-toggle="tooltip"][data-original-title]'
    );
    this.sharePageButton = page.locator('#share-page-btn');
  }

  markerOption(label: string | RegExp): Locator {
    return this.markerDropdownItems.filter({ hasText: label }).first();
  }

  domainExpandIcon(index = 0): Locator {
    return this.page.locator(`#domainGraph_${index}, i.fa-expand-alt[id^="domainGraph_"]`).first();
  }

  objectExpandIcon(): Locator {
    return this.objectLevelTable.locator('i.fa-expand-alt, i.fas.fa-expand-alt').first();
  }

  tableHeader(table: Locator, name: string | RegExp): Locator {
    return table.locator('thead th').filter({ hasText: name }).first();
  }

  pagerSelectNear(host: Locator): Locator {
    return host
      .locator('select.gotoPage, .tablesorter-pager select, select[aria-controls]')
      .or(this.page.locator('.tablesorter-pager select').first())
      .first();
  }
}
