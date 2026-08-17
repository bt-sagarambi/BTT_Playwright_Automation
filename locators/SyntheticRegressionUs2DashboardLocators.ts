import { Page, Locator } from '@playwright/test';

/**
 * Locators for custom dashboard Synthetic Regression - US2.
 * Route: site/dashboard | menu: Dashboards | option: Synthetic Regression - US2 (Custom)
 *
 * Prefer stable control IDs and widget **titles** / id prefixes.
 * Do not hard-code dynamic grid-stack / chartID_* / highcharts-* numeric suffixes.
 */
export class SyntheticRegressionUs2DashboardLocators {
  readonly pageTitle: Locator;

  readonly switchDashboard: Locator;
  readonly switchDashboardContainer: Locator;
  readonly quickSiteContainer: Locator;
  readonly timeLookback: Locator;
  readonly refreshDashboard: Locator;
  readonly autoRefresh: Locator;
  readonly autoRefreshFrequency: Locator;
  readonly autoRefreshBtnGroup: Locator;
  readonly lastUpdated: Locator;
  readonly dashboardPageControls: Locator;

  readonly toggleFilters: Locator;
  readonly applyFilters: Locator;
  readonly cancelFilters: Locator;
  readonly myFiltersTab: Locator;
  readonly sharedFiltersTab: Locator;
  readonly filtersSection: Locator;

  readonly dashboardManager: Locator;
  readonly dashboardSettingsToggle: Locator;
  readonly createWidget: Locator;
  readonly createDashboard: Locator;
  readonly widgetWizardModal: Locator;
  readonly carouselControl: Locator;

  readonly highchartsContainers: Locator;
  readonly highchartsTooltip: Locator;
  readonly chartContextMenuButtons: Locator;

  readonly pauseBanner: Locator;
  readonly continueAutoRefresh: Locator;
  readonly hideDetails: Locator;
  readonly resetScatter: Locator;

  readonly detailTabWaterfall: Locator;
  readonly detailTabFilmStrip: Locator;
  readonly detailTabHarFile: Locator;
  readonly detailTabTestEventLog: Locator;

  constructor(private readonly page: Page) {
    this.pageTitle = page.locator('#page-title');

    this.switchDashboard = page.locator('#switch-dashboard');
    this.switchDashboardContainer = page.locator('#select2-switch-dashboard-container');
    this.quickSiteContainer = page
      .locator('#select2-quick-site-id-container, #select2-site-id-container')
      .first();
    this.timeLookback = page
      .locator('#time-lookback')
      .or(page.getByRole('button', { name: /Change dashboard time period|Last \d|Today so far/i }))
      .first();
    this.refreshDashboard = page.locator('#refresh-dashboard');
    this.autoRefresh = page.locator('#auto-refresh');
    this.autoRefreshFrequency = page.locator('#auto-refresh-frequency');
    this.autoRefreshBtnGroup = page.locator('#auto-refresh-btn-group');
    this.lastUpdated = page.locator('#last-updated-dashboard');
    this.dashboardPageControls = page.locator('#dashboard-page-controls');

    this.toggleFilters = page.locator('#toggle-filters, #mobile-controls-filters-btn').first();
    this.applyFilters = page
      .locator('#apply-filters, button:has-text("Apply Filters"), button:has-text("Apply")')
      .filter({ visible: true })
      .first();
    this.cancelFilters = page.locator('#cancel-filters, button:has-text("Cancel")').first();
    this.myFiltersTab = page.locator('#my-filters-tab');
    this.sharedFiltersTab = page.locator('#shared-filters-tab');
    this.filtersSection = page.locator('#filters-section, .filters-section, #filter-pane').first();

    this.dashboardManager = page.locator('#dashboard-manager');
    this.dashboardSettingsToggle = page
      .locator('#dashboard-settings-toggle, #dashboard-manager-share-btn, [title*="Dashboard Manager" i]')
      .first();
    this.createWidget = page.locator('button.create-widget, a.create-widget, button:has-text("+ Widget")').first();
    this.createDashboard = page
      .locator('#create-dashboard, button:has-text("+ Dashboard"), a:has-text("+ Dashboard")')
      .first();
    this.widgetWizardModal = page.locator('#widget-wizard-modal');
    this.carouselControl = page.getByText(/Carousel/i).first();

    this.highchartsContainers = page.locator('.highcharts-container, [data-highcharts-chart]');
    this.highchartsTooltip = page.locator('.highcharts-tooltip, .highcharts-label.highcharts-tooltip');
    this.chartContextMenuButtons = page.locator(
      '.highcharts-button, .highcharts-contextbutton, .fal.fa-bars, button.highcharts-a11y-proxy-button'
    );

    this.pauseBanner = page.getByText(/Dashboard Auto Refresh Is Now Paused/i).first();
    this.continueAutoRefresh = page
      .getByRole('button', { name: /Continue Auto Refresh/i })
      .or(page.locator('button, a.btn').filter({ hasText: /Continue Auto Refresh/i }))
      .first();
    this.hideDetails = page
      .getByRole('button', { name: /Hide Details/i })
      .or(page.locator('button, a.btn').filter({ hasText: /Hide Details/i }))
      .first();
    this.resetScatter = page.locator('#reset-scatter, [id^="reset-scatter"]').first();

    this.detailTabWaterfall = page
      .locator('#wcd-tab, [role="tab"], .nav-tabs a, .nav-pills a')
      .filter({ hasText: /^Waterfall$/i })
      .first();
    this.detailTabFilmStrip = page
      .locator('#film-strip-tab, [role="tab"], .nav-tabs a, .nav-pills a')
      .filter({ hasText: /Film\s*Strip/i })
      .first();
    this.detailTabHarFile = page
      .locator('#agentDetails, [role="tab"], .nav-tabs a, .nav-pills a')
      .filter({ hasText: /Har\s*File/i })
      .first();
    this.detailTabTestEventLog = page
      .locator('#test-event-log-tab, [role="tab"], .nav-tabs a, .nav-pills a')
      .filter({ hasText: /Test Event Log/i })
      .first();
  }

  pageContents(): Locator {
    return this.page.locator('#page-contents, #page-wrapper, body').first();
  }

  widgetByTitle(title: RegExp): Locator {
    return this.page.locator('.grid-stack-item').filter({ hasText: title }).first();
  }

  performanceSummaryWidget(): Locator {
    return this.widgetByTitle(/Performance Summary\s*-\s*US2/i);
  }

  performanceDetailsWidget(): Locator {
    const byId = this.page.locator('.grid-stack-item').filter({
      has: this.page.locator('[id^="perfGraph-chartID_"], [id^="chartID_"]'),
    });
    const byText = this.page
      .locator('.grid-stack-item')
      .filter({ hasText: /Performance\s*-\s*US2|Performance Details/i });
    return byText.or(byId).first();
  }

  performanceGraphHost(): Locator {
    return this.page.locator('[id^="perfGraph-chartID_"], [id^="perfGraph-"]').first();
  }

  networkHealthWidget(): Locator {
    return this.widgetByTitle(/Network Health Check\s*-\s*US2/i);
  }

  apiChecksWidget(): Locator {
    return this.widgetByTitle(/API Checks\s*-\s*US2/i);
  }

  siteAvailabilityWidget(): Locator {
    return this.widgetByTitle(/Site Availability\s*-\s*US2/i);
  }

  perfComparisonWidget(): Locator {
    return this.widgetByTitle(/Perf\.?\s*Comparison\s*-\s*US2|Performance Comparison\s*-\s*US2/i);
  }

  errorTrackingWidget(): Locator {
    return this.widgetByTitle(/Error Tracking and Performance\s*-\s*US2|Error Tracking/i);
  }

  scatterWidget(): Locator {
    const byId = this.page.locator('.grid-stack-item').filter({
      has: this.page.locator('[id^="page-scatter_"], [id^="session-scatter_"]'),
    });
    const byText = this.page
      .locator('.grid-stack-item')
      .filter({ hasText: /Session Scatter Plot Analysis\s*-\s*US2|Session And Page Scatter/i });
    return byId.or(byText).first();
  }

  pageScatterHost(): Locator {
    return this.page.locator('[id^="page-scatter_"]').first();
  }

  sessionScatterHost(): Locator {
    return this.page.locator('[id^="session-scatter_"]').first();
  }

  scatterPoints(): Locator {
    return this.scatterWidget().locator(
      '.highcharts-series-group .highcharts-point, .highcharts-markers .highcharts-point, .highcharts-point'
    );
  }

  fxnTimingWidget(): Locator {
    return this.widgetByTitle(/1st vs 3rd Party|Fxn Timing\s*-\s*Synthetic\s*-\s*US2/i);
  }

  slowestFunctionsTable(): Locator {
    return this.page
      .locator('[id^="table-for-slowest-functions-table-"] table, .grid-stack-item:has-text("Slowest Functions") table')
      .first();
  }

  geographyWidget(): Locator {
    return this.widgetByTitle(/Perf\.?\s*by Geography\s*-\s*US2|Performance by Geography\s*-\s*US2/i);
  }

  metricCardHosts(): Locator {
    return this.page.locator(
      '[id*="-card-chartID_"], [id^="hits-card-"], [id^="page-onload-card-"], [id^="first-contentful-paint-card-"]'
    );
  }
}
