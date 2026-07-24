import { Page, Locator } from '@playwright/test';

/**
 * Locators for Business Insights / Improve Conversion / Revenue Opportunity
 * Confluence: https://bluetriangletech.atlassian.net/wiki/spaces/HCT/pages/3186360451/The+Revenue+Opportunity+Page
 */
export class RevenueOpportunityLocators {
  readonly pageTitle: Locator;

  readonly revenueDataTypeSelect: Locator;
  readonly reportTypeSelect: Locator;
  readonly reportListSelect: Locator;

  readonly viewFiltersButton: Locator;
  readonly viewFiltersBanner: Locator;
  readonly reportManagerToggle: Locator;
  readonly filtersToggle: Locator;
  readonly applyFiltersButton: Locator;

  readonly topOpportunityRow: Locator;
  readonly allDevicesCard: Locator;
  readonly desktopCard: Locator;
  readonly mobileCard: Locator;
  readonly tabletCard: Locator;

  readonly opportunityByPageGraph: Locator;
  readonly opportunityByPlatformGraph: Locator;
  readonly totalActualRevenueGraph: Locator;
  readonly allBrowserDevicesGraph: Locator;

  readonly whatIfTable: Locator;
  readonly whatIfEditSelects: Locator;
  readonly saveWhatIfButton: Locator;
  readonly cancelWhatIfButton: Locator;

  readonly revenueOpportunityTable: Locator;
  readonly tableSearch: Locator;

  readonly highchartsContainers: Locator;
  readonly highchartsPoints: Locator;
  readonly highchartsLegendItems: Locator;
  readonly highchartsTooltip: Locator;
  readonly chartContextMenuButtons: Locator;
  readonly infoIcons: Locator;

  constructor(private readonly page: Page) {
    this.pageTitle = page.locator('#page-title');

    this.revenueDataTypeSelect = page.locator('#data-type');
    this.reportTypeSelect = page.locator('#dynamic-selector-config');
    this.reportListSelect = page.locator('#report-list');

    this.viewFiltersButton = page.locator('#revenue-opportunity-view-filter');
    this.viewFiltersBanner = page.locator('#toggle-filter-section');
    this.reportManagerToggle = page.locator('#report-manager-toggle');
    this.filtersToggle = page.locator('#toggle-filters');
    this.applyFiltersButton = page.locator('#apply-filters').or(
      page.locator('button, a.btn').filter({ hasText: /Apply Filters/i }).first()
    );

    this.topOpportunityRow = page.locator('#top-opportunity-row');
    this.allDevicesCard = page.locator('#all-devices-table-section-card');
    this.desktopCard = page.locator('#desktop-table-section-card');
    this.mobileCard = page.locator('#mobile-table-section-card');
    this.tabletCard = page.locator('#tablet-table-section-card');

    this.opportunityByPageGraph = page.locator(
      '#all-opportunity-bar-graph, #desktop-opportunity-bar-graph, #mobile-opportunity-bar-graph, #ios-opportunity-bar-graph, #android-opportunity-bar-graph'
    );
    this.opportunityByPlatformGraph = page.locator('#revenue-opportunity-by-platform-graph');
    this.totalActualRevenueGraph = page.locator('#total-actual-revenue-graph');
    this.allBrowserDevicesGraph = page.locator(
      '#all-actual-sales-over-time-graph, #desktop-actual-sales-over-time-graph, #mobile-actual-sales-over-time-graph'
    );

    this.whatIfTable = page.locator('#all-business-overview-table');
    this.whatIfEditSelects = page.locator(
      '#edit-what-if-variable-1, #edit-what-if-variable-2, #edit-what-if-variable-3'
    );
    this.saveWhatIfButton = page.locator('#save-what-if-variables');
    this.cancelWhatIfButton = page
      .locator('button, a.btn')
      .filter({ hasText: /^Cancel$/i })
      .first();

    this.revenueOpportunityTable = page.locator('#all-business-overview-table, #desktop-business-overview-table').first();
    this.tableSearch = page.locator(
      'input.tablesorter-filter, input[id*="table-search"], input[type="search"]'
    ).first();

    this.highchartsContainers = page.locator('.highcharts-container');
    this.highchartsPoints = page.locator(
      '.highcharts-point, .highcharts-markers .highcharts-point, .highcharts-series-group .highcharts-point'
    );
    this.highchartsLegendItems = page.locator('.highcharts-legend-item');
    this.highchartsTooltip = page.locator('.highcharts-tooltip, .highcharts-label.highcharts-tooltip');
    this.chartContextMenuButtons = page.locator(
      '.highcharts-button, .highcharts-contextbutton, .fal.fa-bars, button.highcharts-a11y-proxy-button'
    );
    this.infoIcons = page.locator(
      '.fa-info-circle, .fal.fa-info-circle, [data-toggle="tooltip"][data-original-title], i[class*="info"]'
    );
  }

  sectionByText(text: string | RegExp): Locator {
    return this.page.getByText(text).first();
  }

  graphById(id: string): Locator {
    return this.page.locator(`#${id}`);
  }

  deviceCard(device: 'all' | 'desktop' | 'mobile' | 'tablet' | 'ios' | 'android'): Locator {
    const map: Record<string, string> = {
      all: 'all-devices-table-section-card',
      desktop: 'desktop-table-section-card',
      mobile: 'mobile-table-section-card',
      tablet: 'tablet-table-section-card',
      ios: 'ios-table-section-card',
      android: 'android-table-section-card',
    };
    return this.page.locator(`#${map[device]}`).first();
  }

  select2ContainerFor(selectId: string): Locator {
    return this.page.locator(`#select2-${selectId}-container, span[aria-labelledby*="${selectId}"]`).first();
  }
}
