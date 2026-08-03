import { Page, Locator } from '@playwright/test';

/**
 * Locators for Business Insights / Improve Traffic / Customer Journey Analysis
 * Route: marketing-insights/customer-journey-analysis&conversion-type=sales
 */
export class CustomerJourneyAnalysisLocators {
  readonly pageTitle: Locator;

  readonly campaignsToggle: Locator;
  readonly pathAnalyticsToggle: Locator;
  readonly pathFlowToggle: Locator;

  readonly campaignsWrapper: Locator;
  readonly pathAnalyticsWrapper: Locator;
  readonly pathFlowWrapper: Locator;

  readonly campaignsTable: Locator;
  readonly campaignsTableWrapper: Locator;
  readonly campaignsPagerInfo: Locator;
  readonly campaignParentRows: Locator;
  readonly campaignLandingDetailRows: Locator;
  readonly pathFlowPageCards: Locator;
  readonly pathFlowLandingCards: Locator;
  readonly pathFlowColumns: Locator;

  readonly pathAnalyticsOverviewTable: Locator;
  readonly pathAnalyticsTable: Locator;
  readonly pathsTable: Locator;
  readonly pathsWrapper: Locator;
  readonly pathsBtn: Locator;
  readonly pagesBtn: Locator;

  readonly allPathsRow: Locator;
  readonly topXPathsRow: Locator;
  readonly topXPathsEntrances: Locator;
  readonly topXPathsHits: Locator;
  readonly topXPathsOrders: Locator;
  readonly topXPathsRevenue: Locator;

  readonly landingPagePathFlow: Locator;
  readonly focalPagePathFlow: Locator;
  readonly focalPageToggle: Locator;
  readonly landingPageViewBtn: Locator;
  readonly pathFlowRoot: Locator;

  readonly dataTypeBadge: Locator;
  readonly timePeriodBadge: Locator;
  readonly deviceBadge: Locator;
  readonly browserBadge: Locator;
  readonly osBadge: Locator;
  readonly visitorTypeBadge: Locator;
  readonly botTrafficBadge: Locator;
  readonly landingPageBadge: Locator;
  readonly focalPageBadge: Locator;
  readonly pathsModeBadge: Locator;
  readonly campaignBadge: Locator;
  readonly countryBadge: Locator;
  readonly remainderBadge: Locator;

  readonly toggleFilters: Locator;
  readonly applyFilters: Locator;
  readonly cancelFilters: Locator;
  readonly myFiltersTab: Locator;
  readonly sharedFiltersTab: Locator;
  readonly timePeriodInput: Locator;
  readonly dataTypeSelect: Locator;

  readonly goToCampaignDashboard: Locator;
  readonly saveCampaignToDashboard: Locator;
  readonly revenueAttribution: Locator;
  readonly brandAttribution: Locator;
  readonly tableSearch: Locator;
  readonly downloadCsv: Locator;
  readonly downloadTsv: Locator;
  readonly infoIcons: Locator;
  readonly pathRank: Locator;

  constructor(private readonly page: Page) {
    this.pageTitle = page.locator('#page-title');

    this.campaignsToggle = page.locator('#campaigns-toggle');
    this.pathAnalyticsToggle = page.locator('#path-analytics-toggle');
    this.pathFlowToggle = page.locator('#path-flow-toggle');

    this.campaignsWrapper = page.locator('#campaigns-wrapper');
    this.pathAnalyticsWrapper = page.locator('#path-analytics-wrapper');
    this.pathFlowWrapper = page.locator('#path-flow-wrapper');

    this.campaignsTable = page.locator('#campaigns-table');
    this.campaignsTableWrapper = page.locator('#campaigns-table-wrapper, #campaigns-wrapper').first();
    this.campaignsPagerInfo = page.locator('#campaigns-table_pager_info').first();
    this.campaignParentRows = page.locator('#campaigns-table tbody tr.campaign-row.parent');
    this.campaignLandingDetailRows = page.locator('#campaigns-table tbody tr.load-campaign-landing-page');
    this.pathFlowPageCards = page.locator('#landing-page-path-flow .page-card, #path-flow-wrapper .page-card');
    this.pathFlowLandingCards = page.locator(
      '#landing-page-path-flow .page-card.landingCard, #path-flow-wrapper .page-card.landingCard'
    );
    this.pathFlowColumns = page.locator('#landing-page-path-flow .column, #path-flow-wrapper .column');

    this.pathAnalyticsOverviewTable = page.locator('#path-analytics-overview-table');
    this.pathAnalyticsTable = page.locator('#path-analytics-table');
    this.pathsTable = page.locator('#paths-table');
    this.pathsWrapper = page.locator('#paths, #paths-table-wrapper').first();
    this.pathsBtn = page.locator('#paths-btn');
    this.pagesBtn = page.locator('#pages-btn');

    this.allPathsRow = page.locator('#allPathsRow');
    this.topXPathsRow = page.locator('#topXPathsRow');
    this.topXPathsEntrances = page.locator('#topXPathsEntrances');
    this.topXPathsHits = page.locator('#topXPathsHits');
    this.topXPathsOrders = page.locator('#topXPathsOrders');
    this.topXPathsRevenue = page.locator('#topXPathsRevenue');

    this.landingPagePathFlow = page.locator('#landing-page-path-flow');
    this.focalPagePathFlow = page.locator('#focal-page-path-flow');
    this.focalPageToggle = page.locator('#focal-page-toggle');
    this.landingPageViewBtn = page
      .locator('button, a, .tab-btn')
      .filter({ hasText: /^Landing Page View$/i })
      .first();
    this.pathFlowRoot = page.locator('#path-flow, #landing-page-path-flow, #path-flow-focal').first();

    this.dataTypeBadge = page.locator('#data-type-view');
    this.timePeriodBadge = page.locator('#time-period-view');
    this.deviceBadge = page.locator('#device-view');
    this.browserBadge = page.locator('#browser-view');
    this.osBadge = page.locator('#operating-system-view');
    this.visitorTypeBadge = page.locator('#visitor-type-view');
    this.botTrafficBadge = page.locator('#bot-traffic-view');
    this.landingPageBadge = page.locator('#focal-page-view');
    this.focalPageBadge = page.locator('#focal-page-real-view');
    this.pathsModeBadge = page.locator('#customer-journey-paths-view');
    this.campaignBadge = page.locator('#campaign-view');
    this.countryBadge = page.locator('#country-view');
    this.remainderBadge = page.locator('#show-remainder-view');

    this.toggleFilters = page.locator('#toggle-filters');
    this.applyFilters = page
      .locator('#apply-filters')
      .or(page.locator('button, a.btn').filter({ hasText: /Apply Filters/i }).first());
    this.cancelFilters = page
      .locator('#cancel-filters')
      .or(page.locator('button, a.btn').filter({ hasText: /^Cancel$/i }).first());
    this.myFiltersTab = page.locator('#my-filters-tab');
    this.sharedFiltersTab = page.locator('#shared-filters-tab');
    this.timePeriodInput = page.locator('#time-period');
    this.dataTypeSelect = page.locator('#select2-data-type-container, #data-type').first();

    this.goToCampaignDashboard = page
      .locator('button, a, #dropdownMenu1')
      .filter({ hasText: /Go to my Campaign dashboard/i })
      .first();
    this.saveCampaignToDashboard = page
      .locator('button, a')
      .filter({ hasText: /Save Campaign to dashboard/i })
      .first();
    this.revenueAttribution = page
      .locator('button, a')
      .filter({ hasText: /Revenue Attribution/i })
      .first();
    this.brandAttribution = page
      .locator('button, a')
      .filter({ hasText: /Brand Attribution/i })
      .first();
    this.tableSearch = page.locator('#table-search, input[type="search"]').first();
    this.downloadCsv = page.locator('.download-csv, a, button').filter({ hasText: /^CSV$/i }).first();
    this.downloadTsv = page.locator('.download-tsv, a, button').filter({ hasText: /^TSV$/i }).first();
    this.infoIcons = page.locator('.fa-info-circle, .fal.fa-info-circle, [data-original-title]');
    this.pathRank = page.locator('#select2-path-rank-container, #path-rank').first();
  }
}
