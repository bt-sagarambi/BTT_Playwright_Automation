import { Page, Locator } from '@playwright/test';

/**
 * Locators for preconfigured Site Overview dashboard.
 * Route: site/dashboard | menu: Dashboards
 *
 * Prefer stable control IDs and widget **titles**.
 * Do not hard-code dynamic grid-stack / chartID_* numeric suffixes.
 */
export class SiteOverviewDashboardLocators {
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
  readonly highchartsLegendItems: Locator;
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
    this.applyFilters = page.locator('#apply-filters, button:has-text("Apply Filters")').first();
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
    this.highchartsLegendItems = page.locator('.highcharts-legend-item');
    this.chartContextMenuButtons = page.locator(
      '.highcharts-button, .highcharts-contextbutton, .fal.fa-bars, button.highcharts-a11y-proxy-button'
    );
  }

  /**
   * Resolve a dashboard widget host by title.
   * Prefer exact widget titles / chart img alt (avoid "RUM Performance Detail" help links).
   */
  widgetByTitle(title: string | RegExp): Locator {
    const re = typeof title === 'string' ? new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') : title;
    const exactName = typeof title === 'string' ? title : undefined;
    const titleNode = exactName
      ? this.page
          .getByText(exactName, { exact: true })
          .or(this.page.getByRole('img', { name: exactName, exact: true }))
          .filter({ visible: true })
      : this.page.getByText(re).or(this.page.getByRole('img', { name: re })).filter({ visible: true });
    const byItemText = this.page.locator('.grid-stack-item').filter({ hasText: re });
    const byImg = this.page.locator('.grid-stack-item').filter({
      has: exactName
        ? this.page.getByRole('img', { name: exactName, exact: true })
        : this.page.getByRole('img', { name: re }),
    });
    return byItemText.or(byImg).or(titleNode).first();
  }

  /** Soft visible title / chart alt for a widget label. */
  widgetTitleText(title: string | RegExp): Locator {
    if (typeof title === 'string') {
      return this.page
        .getByText(title, { exact: true })
        .or(this.page.getByRole('img', { name: title, exact: true }))
        .filter({ visible: true })
        .first();
    }
    return this.page
      .getByText(title)
      .or(this.page.getByRole('img', { name: title }))
      .filter({ visible: true })
      .first();
  }

  performanceWidget(): Locator {
    return this.widgetByTitle(/^Performance$|Performance\b/i);
  }

  deviceMetricsWidget(): Locator {
    return this.widgetByTitle(/Device Metrics/i);
  }

  revenueOverTimeWidget(): Locator {
    return this.widgetByTitle(/(?:Revenue|Numbers)\s+Over Time/i);
  }

  geographyWidget(): Locator {
    return this.widgetByTitle(/^Geography$|Geography\b/i);
  }

  deviceMetricsTable(): Locator {
    return this.page
      .locator('[id^="dMetricsTable_"] table, [id^="deviceMetricsPanel_"] table, .grid-stack-item:has-text("Device Metrics") table')
      .first();
  }

  deviceMetricsHeaders(): Locator {
    return this.deviceMetricsTable().locator('thead th, thead td, tr:first-child th, tr:first-child td');
  }

  mapHosts(): Locator {
    return this.page.locator(
      '[id*="map"], .highcharts-map-series, .highcharts-map-group, .grid-stack-item:has-text("Geography") .highcharts-container'
    );
  }
}
