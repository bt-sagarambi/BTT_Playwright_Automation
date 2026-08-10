import { Page, Locator } from '@playwright/test';

/**
 * Locators for preconfigured RUM Performance Detail dashboard.
 * Route: site/dashboard | menu: Dashboards | option: RUM Performance Detail
 *
 * Prefer stable control IDs and widget **titles/headers**.
 * Do not hard-code dynamic Highcharts instance IDs.
 *
 * NOT Monitoring → Real User Browser → Performance Detail.
 */
export class RumPerformanceDetailDashboardLocators {
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

  readonly multiStepBarGraph: Locator;
  readonly pageOnloadCard: Locator;
  readonly perfGraphPageTimings: Locator;
  readonly pageTimingsGraph: Locator;
  readonly dailyAveragesTable: Locator;
  readonly dailyAveragesViewport: Locator;
  readonly dailyAveragesPagerInfo: Locator;
  readonly tableMetric: Locator;

  readonly highchartsContainers: Locator;
  readonly highchartsTooltip: Locator;
  readonly highchartsLegendItems: Locator;

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

    this.multiStepBarGraph = page.locator('#multi-step-bar-graph');
    this.pageOnloadCard = page.locator('#page-onload-card');
    this.perfGraphPageTimings = page.locator('#perfGraph-page-timings-graph');
    this.pageTimingsGraph = page.locator('#page-timings-graph');
    this.dailyAveragesTable = page.locator('#table-for-average-performance-chart');
    this.dailyAveragesViewport = page.locator('#table-for-average-performance-chart-table-viewport');
    this.dailyAveragesPagerInfo = page.locator('#table-for-average-performance-chart_pager_info');
    this.tableMetric = page.locator('#table-metric');

    this.highchartsContainers = page.locator('.highcharts-container, [data-highcharts-chart]');
    this.highchartsTooltip = page.locator('.highcharts-tooltip, .highcharts-label.highcharts-tooltip');
    this.highchartsLegendItems = page.locator(
      '.highcharts-legend-item, .highcharts-legend text, .highcharts-legend-item text'
    );
  }

  pageContents(): Locator {
    return this.page.locator('#page-contents, #page-wrapper, body').first();
  }

  barGraphText(): Locator {
    return this.page
      .locator('#page-contents, .grid-stack')
      .getByText(/Bar Graph/i)
      .filter({ visible: true })
      .first();
  }

  barGraphWidget(): Locator {
    const byId = this.page.locator('.grid-stack-item').filter({
      has: this.page.locator('#multi-step-bar-graph'),
    });
    const byText = this.page.locator('.grid-stack-item').filter({ hasText: /Bar Graph/i });
    return byId.or(byText).first();
  }

  detailsText(): Locator {
    return this.page
      .locator('#page-contents, .grid-stack')
      .getByText(/\bDetails\b/i)
      .filter({ visible: true })
      .first();
  }

  detailsWidget(): Locator {
    const byId = this.page.locator('.grid-stack-item').filter({
      has: this.page.locator('#page-onload-card, [id*="page-onload"], [class*="metric-card"]'),
    });
    const byText = this.page
      .locator('.grid-stack-item')
      .filter({ hasText: /Details|all selected pages \(avg\)/i });
    return byId.or(byText).first();
  }

  performanceGraphText(): Locator {
    return this.page
      .locator('#page-contents, .grid-stack')
      .getByText(/Performance Graph|Page Timings Over Time/i)
      .filter({ visible: true })
      .first();
  }

  performanceGraphWidget(): Locator {
    const byId = this.page.locator('.grid-stack-item').filter({
      has: this.page.locator('#perfGraph-page-timings-graph, #page-timings-graph'),
    });
    const byText = this.page
      .locator('.grid-stack-item')
      .filter({ hasText: /Performance Graph|Page Timings Over Time/i });
    return byId.or(byText).first();
  }

  dailyAveragesText(): Locator {
    return this.page
      .locator('#page-contents, .grid-stack')
      .getByText(/Daily Averages/i)
      .filter({ visible: true })
      .first();
  }

  dailyAveragesWidget(): Locator {
    const byId = this.page.locator('.grid-stack-item').filter({
      has: this.page.locator(
        '#table-for-average-performance-chart, #table-metric, [id*="average-performance"]'
      ),
    });
    const byText = this.page.locator('.grid-stack-item').filter({ hasText: /Daily Averages/i });
    return byId.or(byText).first();
  }

  metricCardByLabel(label: RegExp | string): Locator {
    const re = typeof label === 'string' ? new RegExp(label, 'i') : label;
    return this.detailsWidget()
      .locator('button, a, .card, [class*="card"], [class*="metric"], div, span')
      .filter({ hasText: re })
      .first();
  }

  dailyHeaders(): Locator {
    return this.dailyAveragesWidget().locator(
      'th, .slick-header-column, [role="columnheader"], thead td'
    );
  }

  dailyBodyRows(): Locator {
    return this.dailyAveragesWidget().locator(
      'tbody tr, .slick-row, [id$="-tbody"] tr, [role="row"]'
    );
  }

  dailyExport(): Locator {
    return this.dailyAveragesWidget()
      .locator('button, a, .btn, [role="button"]')
      .filter({ hasText: /^Export$/i })
      .first();
  }

  performanceLegendItems(): Locator {
    return this.performanceGraphWidget().locator(
      '.highcharts-legend-item, .highcharts-legend text, .highcharts-legend-item text'
    );
  }

  performanceGraphGear(): Locator {
    return this.performanceGraphWidget()
      .locator('button, a, .btn, i.fa-cog, i.fa-gear, .glyphicon-cog, [class*="gear"], [title*="setting" i]')
      .first();
  }
}
