import { Page, Locator } from '@playwright/test';

/**
 * Locators for custom dashboard RUM Regression - US2.
 * Route: site/dashboard | menu: Dashboards | option: RUM Regression - US2 (Custom)
 *
 * Prefer stable control IDs and widget **titles** / id prefixes.
 * Do not hard-code dynamic grid-stack / chartID_* / highcharts-* numeric suffixes.
 */
export class RumRegressionUs2DashboardLocators {
  readonly pageTitle: Locator;

  readonly switchDashboard: Locator;
  readonly switchDashboardContainer: Locator;
  readonly quickSiteContainer: Locator;
  readonly timeLookback: Locator;
  readonly refreshDashboard: Locator;
  readonly autoRefresh: Locator;
  readonly autoRefreshFrequency: Locator;
  readonly lastUpdated: Locator;

  readonly toggleFilters: Locator;
  readonly applyFilters: Locator;
  readonly cancelFilters: Locator;
  readonly myFiltersTab: Locator;
  readonly sharedFiltersTab: Locator;

  readonly dashboardManager: Locator;
  readonly dashboardSettingsToggle: Locator;
  readonly createWidget: Locator;
  readonly createDashboard: Locator;
  readonly widgetWizardModal: Locator;
  readonly carouselControl: Locator;

  readonly highchartsContainers: Locator;
  readonly highchartsTooltip: Locator;

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
    this.lastUpdated = page.locator('#last-updated-dashboard');

    this.toggleFilters = page.locator('#toggle-filters, #mobile-controls-filters-btn').first();
    this.applyFilters = page
      .locator('#apply-filters, button:has-text("Apply Filters"), button:has-text("Apply")')
      .filter({ visible: true })
      .first();
    this.cancelFilters = page.locator('#cancel-filters, button:has-text("Cancel")').first();
    this.myFiltersTab = page.locator('#my-filters-tab');
    this.sharedFiltersTab = page.locator('#shared-filters-tab');

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
  }

  widgetByTitle(title: RegExp): Locator {
    return this.page.locator('.grid-stack-item').filter({ hasText: title }).first();
  }

  /** RUM Performance - US2 (not Native App / Comparison / Summary). */
  rumPerformanceWidget(): Locator {
    return this.page
      .locator('.grid-stack-item')
      .filter({ hasText: /RUM\s+Performance\s*-\s*US2|Performance Details/i })
      .filter({ hasNotText: /Native App Performance|Performance Comparison|Performance Summary|Performance Path|Performance by/i })
      .first();
  }

  rumNativeAppPerformanceWidget(): Locator {
    return this.widgetByTitle(/RUM\s+Native\s+App\s+Performance\s*-\s*US2/i);
  }

  rumPerformanceComparisonWidget(): Locator {
    return this.widgetByTitle(/RUM\s+Performance\s+Comparison\s*-\s*US2/i);
  }

  bounceRateWidget(): Locator {
    return this.widgetByTitle(/Bounce\s+Rate\s*-\s*US2/i);
  }

  kpiDateComparisonWidget(): Locator {
    return this.widgetByTitle(/KPI\s+Date\s+Comparison\s*-\s*US2/i);
  }

  performanceByBrowserWidget(): Locator {
    return this.widgetByTitle(/Performance\s+by\s+Browser\s*-\s*US2/i);
  }

  performanceByCountryWidget(): Locator {
    return this.widgetByTitle(/Performance\s+by\s+Country\s*-\s*US2/i);
  }

  performanceByRegionWidget(): Locator {
    return this.widgetByTitle(/Performance\s+by\s+Region\s*-\s*US2/i);
  }

  performanceSummaryWidget(): Locator {
    return this.page
      .locator('.grid-stack-item')
      .filter({ hasText: /Performance\s+Summary\s*-\s*US2|PAGE\s+HITS/i })
      .filter({ hasNotText: /RUM\s+Performance\s*-\s*US2|Native App|Comparison|Bounce Rate/i })
      .first();
  }

  trafficInformationWidget(): Locator {
    return this.widgetByTitle(/Traffic\s+Information\s*-\s*US2/i);
  }

  timingInformationWidget(): Locator {
    return this.widgetByTitle(/Timing\s+Information\s*-\s*US2/i);
  }

  deviceMetricsWidget(): Locator {
    return this.widgetByTitle(/Device\s+Metrics\s*-\s*US2/i);
  }

  performancePathWidget(): Locator {
    return this.widgetByTitle(/Performance\s+Path\s*-\s*US2/i);
  }

  performanceByGeographyWidget(): Locator {
    return this.widgetByTitle(/Performance\s+by\s+Geography\s*-\s*US2/i);
  }

  slaViolationsWidget(): Locator {
    return this.widgetByTitle(/SLA\s+Violations\s*-\s*US2/i);
  }

  yearByYearComparisonWidget(): Locator {
    return this.widgetByTitle(/Year\s+by\s+Year\s+Comparison\s*-\s*US2/i);
  }

  chartHost(widget: Locator): Locator {
    return widget.locator('[id^="chartID_"], .highcharts-container, svg.highcharts-root').first();
  }

  perfGraphHost(widget: Locator): Locator {
    return widget.locator('[id^="perfGraph-chartID_"], [id^="perfGraph-page-timings-graph-chartID_"]').first();
  }

  kpiTypeOfComparison(widget: Locator): Locator {
    return widget.locator('[id^="type-of-comparison-"]').first();
  }

  kpiDayToDay(widget: Locator): Locator {
    return widget.locator('button, a, label, span, input').filter({ hasText: /Day to Day/i }).first();
  }

  kpiYearToYear(widget: Locator): Locator {
    return widget.locator('button, a, label, span, input').filter({ hasText: /Year to Year/i }).first();
  }

  pathHighLevel(widget: Locator): Locator {
    return widget.locator('[id^="toggle-high-level-"], button, a, span').filter({ hasText: /High Level/i }).first();
  }

  pathDetailLevel(widget: Locator): Locator {
    return widget.locator('[id^="toggle-detail-level-"], button, a, span').filter({ hasText: /Detail Level/i }).first();
  }

  pathAllDevices(widget: Locator): Locator {
    return widget.locator('[id^="allDevicesButton_"]').first();
  }

  pathDesktop(widget: Locator): Locator {
    return widget.locator('[id^="desktopButton_"]').first();
  }

  geographyMetric(widget: Locator): Locator {
    return widget.locator('[id^="metric-"]').first();
  }

  geographyMap(widget: Locator): Locator {
    return widget.locator('[id^="map-"]').first();
  }

  trafficTable(widget: Locator): Locator {
    return widget.locator('[id^="trafficTable_"], [id^="trafficDiv_"]').first();
  }

  timingTable(widget: Locator): Locator {
    return widget.locator('[id^="timersTable_"], [id^="timersDiv_"]').first();
  }

  deviceMetricsTable(widget: Locator): Locator {
    return widget.locator('[id^="dMetricsTable_"], [id^="deviceMetricsPanel_"]').first();
  }

  summaryHitsCard(): Locator {
    return this.page.locator('[id^="hits-card-chartID_"], [id^="div-hits-card-chartID_"]').first();
  }

  summarySessionsCard(): Locator {
    return this.page.locator('[id^="sessions-card-chartID_"], [id^="div-sessions-card-chartID_"]').first();
  }
}
