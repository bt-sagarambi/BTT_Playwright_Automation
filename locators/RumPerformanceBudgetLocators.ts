import { Page, Locator } from '@playwright/test';

/**
 * Locators for Monitoring / Real User Browser / Performance Budget
 * Route: overview-dashboard/performance-budget
 * Chart IDs are dynamic — prefer stable prefixes / titles.
 */
export class RumPerformanceBudgetLocators {
  readonly pageTitle: Locator;

  readonly timeLookback: Locator;
  readonly autoRefresh: Locator;
  readonly refreshDashboard: Locator;

  readonly performanceBudgetHeader: Locator;
  readonly performanceBudgetSelector: Locator;
  readonly performanceBudgetManagerButton: Locator;
  readonly resetWidgetsButton: Locator;

  readonly deviceBadge: Locator;
  readonly browserBadge: Locator;
  readonly osBadge: Locator;
  readonly pageControlsToggle: Locator;

  readonly quickDeviceFilter: Locator;
  readonly quickBrowserFilter: Locator;
  readonly quickOsFilter: Locator;

  readonly latestResultsHeading: Locator;
  readonly timingsHeading: Locator;
  readonly assetsHeading: Locator;

  readonly partyActivityHeading: Locator;
  readonly servicesTab: Locator;
  readonly domainsTab: Locator;
  readonly filesTab: Locator;
  readonly party1st: Locator;
  readonly party3rd: Locator;
  readonly partyAll: Locator;

  readonly slowestMetricSelect: Locator;
  readonly graphBtn: Locator;
  readonly tableBtn: Locator;
  readonly slowestServicesGraph: Locator;
  readonly slowestDomainsGraph: Locator;
  readonly slowestFilesGraph: Locator;
  readonly slowestServicesTable: Locator;
  readonly slowestDomainsTable: Locator;
  readonly slowestFilesTable: Locator;

  readonly compositionPie: Locator;
  readonly pageMetricsTable: Locator;

  readonly filtersToggle: Locator;
  readonly applyFiltersButton: Locator;
  readonly cancelFiltersButton: Locator;
  readonly sharePageButton: Locator;
  readonly highchartsContainers: Locator;
  readonly infoIcons: Locator;
  readonly pageContents: Locator;
  readonly dashboardManagerHeading: Locator;

  constructor(private readonly page: Page) {
    this.pageTitle = page.locator('#page-title');

    this.timeLookback = page.locator('#time-lookback');
    this.autoRefresh = page.locator('#auto-refresh');
    this.refreshDashboard = page.locator('#refresh-dashboard');

    this.performanceBudgetHeader = page.locator('#performance-budget-header');
    this.performanceBudgetSelector = page.locator('#performance-budget-selector');
    this.performanceBudgetManagerButton = page.locator('#performance-budget-manager-button');
    this.resetWidgetsButton = page
      .locator('button, a, .btn')
      .filter({ hasText: /^Reset Widgets$/i })
      .first();

    this.deviceBadge = page.locator('#device-view');
    this.browserBadge = page.locator('#browser-view');
    this.osBadge = page.locator('#operating-system-view');
    this.pageControlsToggle = page.locator('#page-controls-toggle');

    this.quickDeviceFilter = page.locator('#quick-device-filter');
    this.quickBrowserFilter = page.locator('#quick-browser-filter');
    this.quickOsFilter = page.locator('#quick-operating-system-filter');

    this.latestResultsHeading = page.getByText(/Latest Results/i).first();
    this.timingsHeading = page.getByText(/^Timings$/i).first();
    this.assetsHeading = page.getByText(/^Assets$/i).first();

    this.partyActivityHeading = page.getByText(/1st vs 3rd Party Activity/i).first();
    this.servicesTab = page.getByText(/^SERVICES$/i).first();
    this.domainsTab = page.getByText(/^DOMAINS$/i).first();
    this.filesTab = page.getByText(/^FILES$/i).first();
    this.party1st = page.getByText(/^1st Party$/i).first();
    this.party3rd = page.getByText(/^3rd Party$/i).first();
    this.partyAll = page.getByText(/^All$/i).first();

    this.slowestMetricSelect = page.locator('[id^="slowest-metric-"]').first();
    this.graphBtn = page.locator('[id^="first-vs-third-graph-btn-"]').first();
    this.tableBtn = page.locator('[id^="first-vs-third-table-btn-"]').first();
    this.slowestServicesGraph = page.locator('[id^="slowest-services-graph-"]').first();
    this.slowestDomainsGraph = page.locator('[id^="slowest-domains-graph-"]').first();
    this.slowestFilesGraph = page.locator('[id^="slowest-files-graph-"]').first();
    this.slowestServicesTable = page.locator('[id^="table-for-slowest-services-table-"]').first();
    this.slowestDomainsTable = page.locator('[id^="table-for-slowest-domains-table-"]').first();
    this.slowestFilesTable = page.locator('[id^="table-for-slowest-files-table-"]').first();

    this.compositionPie = page.locator('#tg-pie-time, [id^="chartID_"]').first();
    this.pageMetricsTable = page.locator('table[id^="table-for-chartID_"]').first();

    this.filtersToggle = page.locator('#toggle-filters');
    this.applyFiltersButton = page.locator('#apply-filters');
    this.cancelFiltersButton = page.locator('#cancel-filters');
    this.sharePageButton = page.locator('#share-page-btn');
    this.highchartsContainers = page.locator('.highcharts-container');
    this.infoIcons = page.locator(
      '.fa-info-circle, .fal.fa-info-circle, i[class*="fa-info"], [data-toggle="tooltip"][data-original-title]'
    );
    this.pageContents = page.locator('#page-contents');
    this.dashboardManagerHeading = page.getByText(/DASHBOARD MANAGER|Saved Performance Budgets/i).first();
  }

  metricCardLabel(label: string | RegExp): Locator {
    return this.page.getByText(label).first();
  }
}
