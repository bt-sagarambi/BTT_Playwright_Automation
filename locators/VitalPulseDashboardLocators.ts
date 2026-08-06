import { Page, Locator } from '@playwright/test';

/**
 * Locators for preconfigured VitalPulse dashboard.
 * Route: site/dashboard | menu: Dashboards | option: VitalPulse
 *
 * Prefer stable control IDs and widget **labels** (Site Summary, Performance Overview).
 * Do not hard-code dynamic grid-stack / chartID_* numeric suffixes.
 */
export class VitalPulseDashboardLocators {
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
  }

  /** Page body sample used when grid-stack titles are only dynamic time-range strings. */
  pageContents(): Locator {
    return this.page.locator('#page-contents, #page-wrapper, body').first();
  }

  siteSummaryText(): Locator {
    return this.page.getByText(/Site Summary/i).filter({ visible: true }).first();
  }

  allMatchingPagesText(): Locator {
    return this.page.getByText(/All Matching Pages/i).filter({ visible: true }).first();
  }

  /** Grid-stack host for Site Summary (CWV cards / cardThings). */
  siteSummaryWidget(): Locator {
    const byCards = this.page
      .locator('.grid-stack-item')
      .filter({
        has: this.page.locator(
          '[id*="cardThings-"], [id*="largest-contentful-paint"], [id*="cumulative-layout-shift"], [id*="first-input-delay"]'
        ),
      });
    const byText = this.page.locator('.grid-stack-item').filter({ hasText: /Site Summary|All Matching Pages/i });
    return byCards.or(byText).first();
  }

  /**
   * Performance Overview **widget** — scope to #page-contents / grid-stack so
   * left-nav "Performance Overview" is not matched.
   */
  performanceOverviewHeading(): Locator {
    return this.page
      .locator('#page-contents, .grid-stack, .grid-stack-item')
      .getByText(/Performance Overview/i)
      .filter({ visible: true })
      .first();
  }

  performanceOverviewWidget(): Locator {
    const byTable = this.page.locator('.grid-stack-item').filter({
      has: this.page.locator('[id^="table-for-chartID_"], table'),
    });
    const byText = this.page.locator('.grid-stack-item').filter({ hasText: /Performance Overview/i });
    return byText.or(byTable).filter({ hasText: /Page Name|Page Views/i }).first();
  }

  performanceOverviewTable(): Locator {
    return this.page
      .locator(
        '[id^="table-for-chartID_"] table, [id*="table-for-chartID_"], .grid-stack-item:has-text("Performance Overview") table'
      )
      .first();
  }

  performanceOverviewHeaders(): Locator {
    return this.performanceOverviewTable().locator(
      'thead th, thead td, tr:first-child th, tr:first-child td, .slick-header-column, [role="columnheader"]'
    );
  }

  performanceOverviewBodyRows(): Locator {
    return this.performanceOverviewTable().locator(
      'tbody tr, [id$="-tbody"] tr, .slick-row, [role="row"]'
    );
  }

  /** CWV / business card hosts under Site Summary. */
  metricCards(): Locator {
    return this.page.locator(
      '[id*="largest-contentful-paint-card"], [id*="cumulative-layout-shift-card"], [id*="first-input-delay-card"], [id*="revenue-card"], [id*="sessions-card"], [id*="orders-card"]'
    );
  }

  metricToggleControls(): Locator {
    return this.page.locator(
      '[id$="-all-checked"], [id$="-cwv"], [id$="-revenue"], [id$="-sessions"], [id$="-orders"], [id$="-lcp"], [id$="-cls"], [id$="-fid"], [id*="edit-show-hide-chartID_"]'
    );
  }

  deselectAllMetrics(): Locator {
    return this.page.getByText(/Deselect All Metrics/i).filter({ visible: true }).first();
  }

  siteSummarySparklines(): Locator {
    return this.page.locator(
      '[id*="page-largest-contentful-paint-graph"], [id*="page-revenue-graph"], [id*="page-sessions-graph"], [id*="page-orders-graph"], [id*="page-first-input-delay-graph"], [id*="page-cumulative-layout-shift-graph"], .grid-stack-item:has([id*="cardThings-"]) .highcharts-container'
    );
  }
}
