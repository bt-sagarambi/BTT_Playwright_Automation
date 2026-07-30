import { Page, Locator } from '@playwright/test';

/**
 * Locators for Monitoring / Real User Browser / Session Lookup
 * Route: real-user-monitoring/session-lookup-performance-detail
 */
export class RumSessionLookupLocators {
  readonly pageTitle: Locator;
  readonly pageHeading: Locator;

  readonly performanceDetailButton: Locator;
  readonly viewFiltersButton: Locator;
  readonly viewFiltersBanner: Locator;

  readonly lookupSection: Locator;
  readonly lookupDropdown: Locator;
  readonly lookupInput: Locator;
  readonly lookupSearch: Locator;

  readonly displayedMetricSelect: Locator;
  readonly sessionLookupGraphToggle: Locator;
  readonly sessionLookupTableToggle: Locator;
  readonly pageViewsSessionChart: Locator;
  readonly pageViewsSessionTableContainer: Locator;
  readonly pageViewsSessionTable: Locator;

  readonly sessionsHeading: Locator;
  readonly allSessionsTableContainer: Locator;
  readonly allSessionsTable: Locator;

  readonly performanceBreakdownGraph: Locator;
  readonly performanceBreakdownTable: Locator;
  readonly performanceMeasurementDetailsTable: Locator;

  readonly domainLevelActivityBtn: Locator;
  readonly objectLevelDetailBtn: Locator;
  readonly objectActivityByDomainBtn: Locator;
  readonly domainObjectGraphToggle: Locator;
  readonly domainObjectTableToggle: Locator;
  readonly domainLevelActivityGraph: Locator;
  readonly domainLevelActivityTable: Locator;
  readonly objectLevelDetailGraph: Locator;
  readonly objectLevelDetailTable: Locator;
  readonly objectActivityByDomainGraph: Locator;
  readonly resourceTimingsOverTimeGraph: Locator;

  readonly urlLinkTop: Locator;
  readonly replayUrl: Locator;
  readonly clicktaleReplayUrl: Locator;
  readonly contentsquareReplayLabel: Locator;

  readonly filtersToggle: Locator;
  readonly applyFiltersButton: Locator;
  readonly cancelFiltersButton: Locator;
  readonly sharePageButton: Locator;
  readonly themeToggle: Locator;
  readonly helpToggle: Locator;
  readonly settingsToggle: Locator;
  readonly userToggle: Locator;
  readonly tvModeToggle: Locator;
  readonly feedbackToggle: Locator;
  readonly assistantToggle: Locator;

  readonly highchartsContainers: Locator;
  readonly highchartsPoints: Locator;
  readonly highchartsLegendItems: Locator;
  readonly highchartsTooltip: Locator;
  readonly infoIcons: Locator;
  readonly noDataMessage: Locator;
  readonly pageContents: Locator;

  constructor(private readonly page: Page) {
    this.pageTitle = page.locator('#page-title');
    this.pageHeading = page.getByText(/Session Lookup\s*\(Real User Browser\)/i).first();

    this.performanceDetailButton = page.locator('#internal-link-to-button');
    this.viewFiltersButton = page.locator('#performance-detail-view-filter');
    this.viewFiltersBanner = page.locator('#toggle-filter-section');

    this.lookupSection = page.getByText(/^Lookup$/i).first();
    this.lookupDropdown = page.locator('#lookup-dropdown');
    this.lookupInput = page.locator('#lookup-input');
    this.lookupSearch = page.locator('#lookup-search');

    this.displayedMetricSelect = page.locator('#session-scatter-type');
    this.sessionLookupGraphToggle = page.locator('#session-lookup-graph-view');
    this.sessionLookupTableToggle = page.locator('#session-lookup-table-view');
    this.pageViewsSessionChart = page.locator('#page-views-for-session-scatter-plot-graph');
    this.pageViewsSessionTableContainer = page.locator(
      '#page-views-for-session-scatter-plot-table-container'
    );
    this.pageViewsSessionTable = page.locator('#page-views-for-session-scatter-plot-table');

    this.sessionsHeading = page.getByText(/^Sessions$/i).first();
    this.allSessionsTableContainer = page.locator('#all-sessions-table-container');
    this.allSessionsTable = page.locator('#all-sessions-table');

    this.performanceBreakdownGraph = page.locator('#performance-breakdown-graph');
    this.performanceBreakdownTable = page.locator('#performance-breakdown-table');
    this.performanceMeasurementDetailsTable = page.locator(
      '#table-for-performance-breakdown-table'
    );

    this.domainLevelActivityBtn = page.locator('#domain-level-rum-activity-btn');
    this.objectLevelDetailBtn = page.locator('#object-level-detail-rum-activity-btn');
    this.objectActivityByDomainBtn = page.locator('#by-domain-object-rum-activity-btn');
    this.domainObjectGraphToggle = page.locator('#graph-rum-performance-detail-btn');
    this.domainObjectTableToggle = page.locator('#table-rum-performance-detail-btn');
    this.domainLevelActivityGraph = page.locator('#domain-level-activity-hits-graph');
    this.domainLevelActivityTable = page.locator('#domain-level-activity-table');
    this.objectLevelDetailGraph = page.locator('#object-level-detail-hits-graph');
    this.objectLevelDetailTable = page.locator('#object-level-detail-table');
    this.objectActivityByDomainGraph = page.locator('#object-activity-by-domain-hits-graph');
    this.resourceTimingsOverTimeGraph = page.locator('#resource-timings-over-time-graph');

    this.urlLinkTop = page.locator('#url_link_top, #url').first();
    this.replayUrl = page.locator('#replay-url');
    this.clicktaleReplayUrl = page.locator('#clicktale-replay-url');
    this.contentsquareReplayLabel = page.getByText(/Contentsquare Replay Links/i).first();

    this.filtersToggle = page.locator('#toggle-filters');
    this.applyFiltersButton = page.locator('#apply-filters');
    this.cancelFiltersButton = page.locator('#cancel-filters');
    this.sharePageButton = page.locator('#share-page-btn');
    this.themeToggle = page.locator('#toggle-theme');
    this.helpToggle = page.locator('#toggle-help-articles');
    this.settingsToggle = page.locator('#toggle-settings');
    this.userToggle = page.locator('#toggle-user');
    this.tvModeToggle = page.locator('#toggle-tv-mode');
    this.feedbackToggle = page.locator('#toggle-feedback');
    this.assistantToggle = page.locator('#toggle-assistant-chat');

    this.highchartsContainers = page.locator('.highcharts-container');
    this.highchartsPoints = page.locator(
      '#page-views-for-session-scatter-plot-graph .highcharts-point, .highcharts-point'
    );
    this.highchartsLegendItems = page.locator(
      '#page-views-for-session-scatter-plot-graph .highcharts-legend-item, .highcharts-legend-item'
    );
    this.highchartsTooltip = page.locator('.highcharts-tooltip, .highcharts-label.highcharts-tooltip');
    this.infoIcons = page.locator(
      '.fa-info-circle, .fal.fa-info-circle, i[class*="fa-info"], [data-toggle="tooltip"][data-original-title]'
    );
    this.noDataMessage = page.getByText(/No data to display/i).first();
    this.pageContents = page.locator('#page-contents');
  }

  allPageViewsHeading(): Locator {
    return this.page.getByText(/All Page Views For/i).first();
  }

  performanceMeasurementDetailsHeading(): Locator {
    return this.page.getByText(/Performance Measurement Details/i).first();
  }
}
