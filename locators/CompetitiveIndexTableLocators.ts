import { Page, Locator } from '@playwright/test';

/**
 * Locators for Business Insights / Improve Traffic / Competitive Index Table
 * Route: competitive-index/index&view=table
 */
export class CompetitiveIndexTableLocators {
  readonly pageTitle: Locator;

  readonly tableTab: Locator;
  readonly trendsTab: Locator;

  readonly tableCon: Locator;
  readonly tableHero: Locator;
  readonly tableContainer: Locator;
  readonly performanceIndexTable: Locator;
  readonly tableSearch: Locator;
  readonly pagerInfo: Locator;
  readonly globalSiteSearch: Locator;

  readonly industrySelector: Locator;
  readonly verticalSelector: Locator;
  readonly companySelector: Locator;

  readonly trendIndustrySelector: Locator;
  readonly trendVerticalSelector: Locator;
  readonly trendGroupSelector: Locator;
  readonly trendCompSearch: Locator;
  readonly clearSitesToggles: Locator;
  readonly companyToggler: Locator;
  readonly trendFilterContent: Locator;

  readonly timePeriodBadge: Locator;
  readonly trafficSegmentBadge: Locator;
  readonly statisticalMethodBadge: Locator;

  readonly resetMetrics: Locator;
  readonly selectMetricsBtn: Locator;
  readonly addComparison: Locator;
  readonly exportBtn: Locator;
  readonly downloadCsv: Locator;
  readonly downloadTsv: Locator;
  readonly downloadJson: Locator;

  readonly toggleFilters: Locator;
  readonly applyFilters: Locator;
  readonly cancelFilters: Locator;
  readonly myFiltersTab: Locator;
  readonly sharedFiltersTab: Locator;
  readonly timezoneSelect: Locator;
  readonly statisticalMethodSelect: Locator;
  readonly percentileSelect: Locator;
  readonly infoIcons: Locator;
  readonly highcharts: Locator;

  constructor(private readonly page: Page) {
    this.pageTitle = page.locator('#page-title');

    this.tableTab = page.locator('#table-tab');
    this.trendsTab = page.locator('#trends-tab');

    this.tableCon = page.locator('#table-con');
    this.tableHero = page.locator('#tableHero');
    this.tableContainer = page.locator('#tableContainer');
    this.performanceIndexTable = page.locator('#performance_index_table');
    this.tableSearch = page.locator('#table-search');
    this.pagerInfo = page.locator('#performance_index_table_pager_info');
    this.globalSiteSearch = page.locator('#globalSiteSearchInput');

    this.industrySelector = page.locator('#select2-industrySelector-container');
    this.verticalSelector = page.locator('#select2-verticalSelector-container');
    this.companySelector = page.locator('#select2-companySelector-container');

    this.trendIndustrySelector = page.locator('#select2-trendIndustrySelector-container');
    this.trendVerticalSelector = page.locator('#select2-verticalSelector_trends-container');
    this.trendGroupSelector = page.locator('#select2-trendGroupSelector-container');
    this.trendCompSearch = page.locator('#trendCompSearch, #searchBox').first();
    this.clearSitesToggles = page.locator('#btnClearSites');
    this.companyToggler = page.locator('#companyToggler, #compToggleBox').first();
    this.trendFilterContent = page.locator('#trendFilterContent');

    this.timePeriodBadge = page.locator('#time-period-view');
    this.trafficSegmentBadge = page.locator('#traffic-segment-view');
    this.statisticalMethodBadge = page.locator('#statistical-method-view');

    this.resetMetrics = page.locator('#resetMetrics');
    this.selectMetricsBtn = page.locator('button, a').filter({ hasText: /^Select Metrics$/i }).first();
    this.addComparison = page.locator('#add-comparison');
    this.exportBtn = page.locator('button, a').filter({ hasText: /^Export$/i }).first();
    this.downloadCsv = page.locator('a, button, li').filter({ hasText: /^CSV$/i }).first();
    this.downloadTsv = page.locator('a, button, li').filter({ hasText: /^TSV$/i }).first();
    this.downloadJson = page.locator('a, button, li').filter({ hasText: /^JSON$/i }).first();

    this.toggleFilters = page.locator('#toggle-filters, #mobile-controls-filters-btn').first();
    this.applyFilters = page.locator('#apply-filters');
    this.cancelFilters = page.locator('#cancel-filters');
    this.myFiltersTab = page.locator('#my-filters-tab');
    this.sharedFiltersTab = page.locator('#shared-filters-tab');
    this.timezoneSelect = page.locator('#select2-timezone-container');
    this.statisticalMethodSelect = page.locator('#select2-statistical-method-container');
    this.percentileSelect = page.locator('#select2-percentile-container');
    this.infoIcons = page.locator(
      'i.fa-info-circle, .info-icon, [data-original-title], [data-toggle="tooltip"]'
    );
    this.highcharts = page.locator('.highcharts-container, [data-highcharts-chart]');
  }
}
