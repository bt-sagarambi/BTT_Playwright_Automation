import { Page, Locator } from '@playwright/test';

/**
 * Locators for Business Insights / Improve Revenue / Revenue Assurance Dashboard
 * Route: revenue-assurance/dashboard
 * Prefer stable host ids — not dynamic highcharts-* suffixes.
 */
export class RevenueAssuranceLocators {
  readonly pageTitle: Locator;
  readonly siteSelectContainer: Locator;

  readonly platformAll: Locator;
  readonly platformBrowser: Locator;
  readonly platformIos: Locator;
  readonly platformAndroid: Locator;
  readonly shareBtn: Locator;
  readonly opportunityFactorSetting: Locator;
  readonly opportunityFactorModal: Locator;

  readonly heroCard: Locator;
  readonly heroShowMe: Locator;
  readonly recommendationsChart: Locator;
  readonly platformChart: Locator;

  readonly newRecordsBtn: Locator;
  readonly inProgressRecordsBtn: Locator;
  readonly implementedRecordsBtn: Locator;
  readonly declinedRecordsBtn: Locator;
  readonly internalDeclinedRecordsBtn: Locator;
  readonly internalReviewRecordsBtn: Locator;
  readonly browserPlatformShowBtn: Locator;
  readonly iosPlatformShowBtn: Locator;
  readonly androidPlatformShowBtn: Locator;

  readonly revenueCardsSection: Locator;
  readonly gridViewBtn: Locator;
  readonly cardSearch: Locator;
  readonly opportunityCards: Locator;

  readonly recommendationsTableSection: Locator;
  readonly revenueAssuranceTable: Locator;
  readonly revenueAssuranceTableWrapper: Locator;
  readonly tableViewport: Locator;
  readonly improveRevenueToolbarIcon: Locator;
  readonly statusFilter: Locator;
  readonly sortPlatform: Locator;
  readonly tableSearch: Locator;
  readonly batchStatusSelect: Locator;
  readonly pagerInfo: Locator;

  readonly recommendationContainer: Locator;
  readonly recommendationCard: Locator;
  readonly estimatedEffortDetails: Locator;
  readonly overviewTab: Locator;
  readonly actionTab: Locator;
  readonly historyTab: Locator;
  readonly backBtn: Locator;

  readonly recPerfViewDataModal: Locator;
  readonly raImpactAnalysisModal: Locator;
  readonly customShareModal: Locator;
  readonly generateRecsModal: Locator;
  readonly clearRecsModal: Locator;

  readonly toggleFilters: Locator;
  readonly cancelFilters: Locator;
  readonly myFiltersTab: Locator;
  readonly sharedFiltersTab: Locator;

  readonly highchartsContainers: Locator;

  constructor(private readonly page: Page) {
    this.pageTitle = page.locator('#page-title');
    this.siteSelectContainer = page.locator('#select2-site-id-container');

    // data-type tab buttons (may report CSS-hidden to Playwright while still on-screen in card)
    this.platformAll = page.locator('button.tab-btn[data-type="all"], button.all-tab-btn').first();
    this.platformBrowser = page
      .locator('button.tab-btn[data-type="browser"], button.browser-tab-btn')
      .or(page.locator('button.tab-btn').filter({ hasText: /^\s*Browser\s*$/i }))
      .first();
    this.platformIos = page
      .locator('button.tab-btn[data-type="ios"], button.ios-tab-btn')
      .or(page.locator('button.tab-btn').filter({ hasText: /^\s*iOS(\s+Native App)?\s*$/i }))
      .first();
    this.platformAndroid = page
      .locator('button.tab-btn[data-type="android"], button.android-tab-btn')
      .or(page.locator('button.tab-btn').filter({ hasText: /^\s*Android(\s+Native App)?\s*$/i }))
      .first();
    this.shareBtn = page
      .locator('button, a.btn')
      .filter({ hasText: /^Share$/i })
      .first();
    this.opportunityFactorSetting = page.locator('#opportunity-factor-setting');
    this.opportunityFactorModal = page.locator('#opportunityFactorModal');

    this.heroCard = page.locator('.opportunity-item-card, .main-card').filter({ hasText: /TOTAL ANNUALIZED OPPORTUNITY/i }).first();
    this.heroShowMe = this.heroCard.locator('button.show-me-btn, .show-me-btn, button:has-text("Show Me")').first();
    this.recommendationsChart = page.locator('#recommendationsChart');
    this.platformChart = page.locator('#platformChart');

    this.newRecordsBtn = page.locator('#new-records-btn').or(
      page.locator('button, a').filter({ hasText: /^New\s*\(/i }).first()
    );
    this.inProgressRecordsBtn = page.locator('#in-progress-records-btn');
    this.implementedRecordsBtn = page.locator('#implemented-records-btn');
    this.declinedRecordsBtn = page.locator('#declined-records-btn');
    this.internalDeclinedRecordsBtn = page.locator('#internal-declined-records-btn');
    this.internalReviewRecordsBtn = page.locator('#internal-review-records-btn');
    this.browserPlatformShowBtn = page.locator('#browser-platform-show-btn');
    this.iosPlatformShowBtn = page.locator('#ios-platform-show-btn');
    this.androidPlatformShowBtn = page.locator('#android-platform-show-btn');

    this.revenueCardsSection = page.locator('#revenue-cards-section');
    this.gridViewBtn = page.locator('#gridViewBtn');
    this.cardSearch = page.locator('#cardSearch');
    this.opportunityCards = page.locator('#revenue-cards-section [id^="card-"], #revenue-cards-section .sortable-opportunity-cards > *');

    this.recommendationsTableSection = page.locator('#revenue-assurance-recommendations-table');
    this.revenueAssuranceTable = page.locator('#revenueAssuranceTable');
    this.revenueAssuranceTableWrapper = page.locator('#revenueAssuranceTableWrapper');
    this.tableViewport = page.locator('#revenueAssuranceTable-table-viewport');
    this.improveRevenueToolbarIcon = page
      .locator(
        [
          'a.ctrl.pull-right[href*="revenue-assurance"]',
          'a.ctrl.pull-right[data-original-title*="Assurance" i]',
          'a.ctrl.pull-right[title*="Assurance" i]',
          'button.ctrl.pull-right[data-original-title*="Assurance" i]',
          'button.ctrl.pull-right[title*="Assurance" i]',
          '#revenue-assurance-icon',
          'a.ctrl.pull-right:has(.fa-dollar-sign, .fa-dollar, .fas.fa-dollar-sign)',
        ].join(', ')
      )
      .first();
    this.statusFilter = page.locator('#statusFilter');
    this.sortPlatform = page.locator('#sortPlatform');
    this.tableSearch = page.locator('#table-search-revenueAssuranceTable');
    this.batchStatusSelect = page.locator('#batchStatusSelect');
    this.pagerInfo = page.locator('#revenueAssuranceTable_pager_info');

    this.recommendationContainer = page.locator('#recommendationContainer');
    this.recommendationCard = page.locator('#recommendation-card');
    this.estimatedEffortDetails = page.locator('#estimatedEffortDetails');
    this.overviewTab = page
      .locator('[role="tab"], a, button, li')
      .filter({ hasText: /^Overview$/i })
      .first();
    this.actionTab = page
      .locator('[role="tab"], a, button, li')
      .filter({ hasText: /^Action$/i })
      .first();
    this.historyTab = page
      .locator('[role="tab"], a, button, li')
      .filter({ hasText: /^History$/i })
      .first();
    this.backBtn = page
      .locator('a, button')
      .filter({ hasText: /^Back$|^Back to Dashboard$/i })
      .first();

    this.recPerfViewDataModal = page.locator('#recPerfViewDataModal');
    this.raImpactAnalysisModal = page.locator('#raImpactAnalysisModal');
    this.customShareModal = page.locator('#customShareModal');
    this.generateRecsModal = page.locator('#generateRecsModal');
    this.clearRecsModal = page.locator('#clearRecsModal');

    this.toggleFilters = page.locator('#toggle-filters');
    this.cancelFilters = page.locator('#cancel-filters');
    this.myFiltersTab = page.locator('#my-filters-tab');
    this.sharedFiltersTab = page.locator('#shared-filters-tab');

    this.highchartsContainers = page.locator('.highcharts-container, [data-highcharts-chart]');
  }
}
