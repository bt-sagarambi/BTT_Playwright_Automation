import { Page, Locator } from '@playwright/test';

/**
 * Locators for preconfigured Traffic Source and Medium dashboard.
 * Route: site/dashboard | menu: Dashboards | option: Traffic Source and Medium
 *
 * Prefer stable control IDs and widget **titles/headers**.
 * Do not hard-code dynamic chartID_* / table-for-* numeric suffixes.
 */
export class TrafficSourceMediumDashboardLocators {
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
  }

  pageContents(): Locator {
    return this.page.locator('#page-contents, #page-wrapper, body').first();
  }

  sitewideTotalsText(): Locator {
    return this.page
      .locator('#page-contents, .grid-stack')
      .getByText(/Sitewide Totals/i)
      .filter({ visible: true })
      .first();
  }

  sitewideTotalsWidget(): Locator {
    const byId = this.page.locator('.grid-stack-item').filter({
      has: this.page.locator('#campaignTotals, [id="campaignTotals"], #sitewide-date, [id*="revenue-card"]'),
    });
    const byText = this.page.locator('.grid-stack-item').filter({ hasText: /Sitewide Totals/i });
    return byId.or(byText).first();
  }

  trafficSourceBreakdownText(): Locator {
    return this.page
      .locator('#page-contents, .grid-stack')
      .getByText(/Traffic Source Breakdown/i)
      .filter({ visible: true })
      .first();
  }

  trafficSourceBreakdownWidget(): Locator {
    return this.page
      .locator('.grid-stack-item')
      .filter({ hasText: /Traffic Source Breakdown/i })
      .first();
  }

  trafficMediumBreakdownText(): Locator {
    return this.page
      .locator('#page-contents, .grid-stack')
      .getByText(/Traffic Medium Breakdown/i)
      .filter({ visible: true })
      .first();
  }

  trafficMediumBreakdownWidget(): Locator {
    return this.page
      .locator('.grid-stack-item')
      .filter({ hasText: /Traffic Medium Breakdown/i })
      .first();
  }

  sourceTable(): Locator {
    return this.trafficSourceBreakdownWidget()
      .locator('table, [id*="table-for-"][id$="-table-viewport"], [id^="table-for-"]')
      .first();
  }

  mediumTable(): Locator {
    return this.trafficMediumBreakdownWidget()
      .locator('table, [id*="table-for-"][id$="-table-viewport"], [id^="table-for-"]')
      .first();
  }

  sourceHeaders(): Locator {
    return this.trafficSourceBreakdownWidget().locator(
      'th, .slick-header-column, [role="columnheader"], thead td'
    );
  }

  mediumHeaders(): Locator {
    return this.trafficMediumBreakdownWidget().locator(
      'th, .slick-header-column, [role="columnheader"], thead td'
    );
  }

  sourceBodyRows(): Locator {
    return this.trafficSourceBreakdownWidget().locator(
      'tbody tr, .slick-row, [id$="-tbody"] tr, [role="row"]'
    );
  }

  mediumBodyRows(): Locator {
    return this.trafficMediumBreakdownWidget().locator(
      'tbody tr, .slick-row, [id$="-tbody"] tr, [role="row"]'
    );
  }

  sourceExport(): Locator {
    return this.trafficSourceBreakdownWidget()
      .locator('button, a, .btn')
      .filter({ hasText: /^Export$/i })
      .first();
  }

  mediumExport(): Locator {
    return this.trafficMediumBreakdownWidget()
      .locator('button, a, .btn')
      .filter({ hasText: /^Export$/i })
      .first();
  }

  pageSizeOption(label: RegExp | string): Locator {
    const re = typeof label === 'string' ? new RegExp(label, 'i') : label;
    return this.page.locator('a, button, li, option').filter({ hasText: re }).first();
  }

  campaignSourceFilterRow(): Locator {
    return this.page.locator('#campaign-source-row, [id*="campaign-source"]').first();
  }

  campaignMediumFilterRow(): Locator {
    return this.page.locator('#campaign-medium-row, [id*="campaign-medium"]').first();
  }

  trafficSegmentFilterRow(): Locator {
    return this.page.locator('#traffic-segment-row, [id*="traffic-segment"]').first();
  }
}
