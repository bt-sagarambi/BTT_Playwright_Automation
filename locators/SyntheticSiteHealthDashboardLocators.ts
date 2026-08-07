import { Page, Locator } from '@playwright/test';

/**
 * Locators for preconfigured Synthetic Site Health dashboard.
 * Route: site/dashboard | menu: Dashboards | option: Synthetic Site Health
 *
 * Prefer stable control IDs and widget **labels**.
 * Do not hard-code dynamic grid-stack / chartID_* numeric suffixes.
 */
export class SyntheticSiteHealthDashboardLocators {
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
  readonly hideSelectedScript: Locator;
  readonly drillIntoPerformanceDetail: Locator;
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
    this.hideSelectedScript = page
      .getByRole('button', { name: /Hide Selected Script/i })
      .or(page.locator('button, a.btn').filter({ hasText: /Hide Selected Script/i }))
      .first();
    this.drillIntoPerformanceDetail = page
      .getByRole('button', { name: /Drill Into Performance Detail/i })
      .or(page.locator('button, a.btn, a').filter({ hasText: /Drill Into Performance Detail/i }))
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

  highLevelMetricsText(): Locator {
    return this.page
      .locator('#page-contents, .grid-stack')
      .getByText(/High Level Metrics/i)
      .filter({ visible: true })
      .first();
  }

  highLevelMetricsWidget(): Locator {
    const byId = this.page.locator('.grid-stack-item').filter({
      has: this.page.locator('[id^="highLevelMetrics_"], [id^="highLevelMetrics_Table_"]'),
    });
    const byText = this.page.locator('.grid-stack-item').filter({ hasText: /High Level Metrics/i });
    return byId.or(byText).first();
  }

  highLevelMetricsTable(): Locator {
    return this.page
      .locator(
        '[id^="highLevelMetrics_Table_"] table, [id*="highLevelMetrics_Table_"] table, .grid-stack-item:has-text("High Level Metrics") table'
      )
      .first();
  }

  highLevelMetricHeaders(): Locator {
    return this.highLevelMetricsTable().locator('th, thead td, [role="columnheader"]');
  }

  siteAvailabilityText(): Locator {
    return this.page
      .locator('#page-contents, .grid-stack')
      .getByText(/Site Availability/i)
      .filter({ visible: true })
      .first();
  }

  siteAvailabilityWidget(): Locator {
    return this.page
      .locator('.grid-stack-item')
      .filter({ hasText: /Site Availability/i })
      .filter({ has: this.page.locator('.highcharts-container, [data-highcharts-chart]') })
      .first();
  }

  siteAvailabilityChartTitle(): Locator {
    return this.page
      .locator('#page-contents, .grid-stack, .highcharts-title, .highcharts-subtitle')
      .getByText(/Site Availability Over Time/i)
      .filter({ visible: true })
      .first();
  }

  screenshotText(): Locator {
    return this.page
      .locator('#page-contents, .grid-stack')
      .getByText(/^Screenshot$|Screenshot/i)
      .filter({ visible: true })
      .first();
  }

  screenshotWidget(): Locator {
    return this.page.locator('.grid-stack-item').filter({ hasText: /Screenshot/i }).first();
  }

  screenshotPrevious(): Locator {
    return this.screenshotWidget()
      .locator('button, a, .btn')
      .filter({ hasText: /Previous|<<\s*Previous/i })
      .first();
  }

  screenshotNext(): Locator {
    return this.screenshotWidget()
      .locator('button, a, .btn')
      .filter({ hasText: /Next|Next\s*>>/i })
      .first();
  }

  scatterplotText(): Locator {
    return this.page
      .locator('#page-contents, .grid-stack')
      .getByText(/Session And Page Scatterplot|Session and Page Scatterplot/i)
      .filter({ visible: true })
      .first();
  }

  scatterplotWidget(): Locator {
    const byId = this.page.locator('.grid-stack-item').filter({
      has: this.page.locator('[id^="page-scatter_"], [id^="session-scatter_"], [id^="scatter-row_"]'),
    });
    const byText = this.page
      .locator('.grid-stack-item')
      .filter({ hasText: /Session And Page Scatterplot|Session and Page Scatterplot|Synthetic Script Timing/i });
    return byId.or(byText).first();
  }

  pageScatterHost(): Locator {
    return this.page.locator('[id^="page-scatter_"]').first();
  }

  sessionScatterHost(): Locator {
    return this.page.locator('[id^="session-scatter_"]').first();
  }

  pageWaterfallHost(): Locator {
    return this.page.locator('[id^="page-waterfall_"]').first();
  }

  displayedMetricLabels(): Locator {
    return this.scatterplotWidget().getByText(/Displayed Metric/i);
  }

  scatterPoints(): Locator {
    return this.scatterplotWidget().locator(
      '.highcharts-series-group .highcharts-point, .highcharts-markers .highcharts-point, .highcharts-point'
    );
  }

  siteAvailabilityLegendItems(): Locator {
    return this.siteAvailabilityWidget().locator('.highcharts-legend-item, .highcharts-legend text, .highcharts-legend-item span');
  }
}
