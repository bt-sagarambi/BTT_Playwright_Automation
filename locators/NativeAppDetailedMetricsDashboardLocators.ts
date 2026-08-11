import { Page, Locator } from '@playwright/test';

/**
 * Locators for preconfigured Native App Detailed Metrics dashboards.
 * Route: site/dashboard | Dashboards | options:
 *   Native App Detailed Metrics - Android | Native App Detailed Metrics - iOS
 *
 * Prefer stable control IDs / id **prefixes** and widget **titles**.
 * Do not hard-code dynamic Highcharts instance IDs or chartID_* suffixes.
 *
 * NOT Native App Performance Detail (four-widget PD board).
 * NOT Monitoring → Native App pages.
 */
export class NativeAppDetailedMetricsDashboardLocators {
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

  readonly dashboardManager: Locator;
  readonly dashboardSettingsToggle: Locator;
  readonly createWidget: Locator;
  readonly createDashboard: Locator;
  readonly widgetWizardModal: Locator;
  readonly carouselControl: Locator;

  readonly nativeAppPerfGraph: Locator;
  readonly highchartsContainers: Locator;
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

    this.nativeAppPerfGraph = page.locator(
      '[id^="perfGraph-page-timings-graph"], [id^="perf-graph-div-chartID_"]'
    );
    this.highchartsContainers = page.locator('.highcharts-container, [data-highcharts-chart]');
    this.highchartsLegendItems = page.locator(
      '.highcharts-legend-item, .highcharts-legend text, .highcharts-legend-item text'
    );
  }

  gridStackItem(hasText: RegExp): Locator {
    return this.page.locator('.grid-stack-item').filter({ hasText }).first();
  }

  widgetByTitle(re: RegExp): Locator {
    return this.gridStackItem(re);
  }

  nativeAppPerformanceWidget(): Locator {
    const byHost = this.page.locator('.grid-stack-item').filter({
      has: this.page.locator('[id^="perfGraph-page-timings-graph"], [id^="perf-graph-div-chartID_"]'),
    });
    const byText = this.gridStackItem(/Native App Performance/i);
    return byHost.or(byText).first();
  }

  partyActivityWidget(): Locator {
    return this.gridStackItem(/1st vs 3rd Party Activity\s*-\s*Native/i);
  }

  networkFailuresWidget(): Locator {
    return this.gridStackItem(/Network Request Failures Over Time/i);
  }

  frictionMapWidget(): Locator {
    return this.gridStackItem(/(Android|iOS)\s+(Friction Map|App Friction Map)/i);
  }

  crashSummaryWidget(): Locator {
    return this.gridStackItem(/Native App Crash Summary/i);
  }

  httpResponsesWidget(): Locator {
    // Prefer exact title without "By Error Count"
    return this.page
      .locator('.grid-stack-item')
      .filter({ hasText: /Native App HTTP Responses/i })
      .filter({ hasNotText: /By Error Count|by Error Count/i })
      .first();
  }

  httpResponsesByErrorWidget(): Locator {
    return this.gridStackItem(/Native App HTTP Responses\s+(By|by)\s+Error Count/i);
  }

  anrWidget(): Locator {
    return this.gridStackItem(/Native App ANR|Out Of Memory|Out of Memory/i);
  }

  cpuMemoryWidget(): Locator {
    const byHost = this.page.locator('.grid-stack-item').filter({
      has: this.page.locator('[id*="cpu-and-memory"]'),
    });
    const byText = this.gridStackItem(/CPU and Memory Usage|Average CPU And Memory Usage/i);
    return byHost.or(byText).first();
  }

  partyGraphBtn(): Locator {
    return this.page.locator('[id^="first-vs-third-graph-btn-"]').first();
  }

  partyTableBtn(): Locator {
    return this.page.locator('[id^="first-vs-third-table-btn-"]').first();
  }

  cpuGraphBtn(): Locator {
    return this.page.locator('[id^="cpu-and-memory-graph-btn-"]').first();
  }

  cpuTableBtn(): Locator {
    return this.page.locator('[id^="cpu-and-memory-table-btn-"]').first();
  }

  cpuTableHeaders(): Locator {
    return this.cpuMemoryWidget().locator('th, .slick-header-column, [role="columnheader"]');
  }

  partyTableHeaders(): Locator {
    return this.partyActivityWidget().locator('th, .slick-header-column, [role="columnheader"]');
  }
}
