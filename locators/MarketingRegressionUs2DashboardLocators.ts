import { Page, Locator } from '@playwright/test';

/**
 * Locators for custom dashboard Marketing Regression - US2.
 * Route: site/dashboard | menu: Dashboards | option: Marketing Regression - US2 (Custom)
 *
 * Prefer stable control IDs and widget **titles** / id prefixes.
 * Do not hard-code dynamic grid-stack / chartID_* / highcharts-* numeric suffixes.
 */
export class MarketingRegressionUs2DashboardLocators {
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
    this.highchartsTooltip = page.locator(
      '.highcharts-tooltip, .highcharts-label.highcharts-tooltip, [id^="salesFunnelToolTip-"]'
    );
  }

  widgetByTitle(title: RegExp): Locator {
    return this.page.locator('.grid-stack-item').filter({ hasText: title }).first();
  }

  campaignInformationWidget(): Locator {
    return this.widgetByTitle(/Campaign Information\s*-\s*US2|Campaign Information/i);
  }

  bottomOfSalesFunnelWidget(): Locator {
    return this.widgetByTitle(/Bottom\s+of\s+(the\s+)?Sales\s+Funnel\s*-\s*US2|Bottom\s+of\s+(the\s+)?Sales\s+Funnel/i);
  }

  revenueOpportunityWidget(): Locator {
    return this.widgetByTitle(/Revenue Opportunity\s*-\s*US2|Revenue Opportunity by Page/i);
  }

  campaignName(): Locator {
    return this.page.locator('[id^="campaign-name_"]').first();
  }

  campaignButton(): Locator {
    return this.page.locator('[id^="campaign-button_"]').first();
  }

  campaignDiv(): Locator {
    return this.page.locator('[id^="campaignDiv_"]').first();
  }

  funnelViewBySelector(): Locator {
    return this.page.locator('[id^="sales-funnel-page-views-sessions-selector-"]').first();
  }

  funnelPageViewsChart(): Locator {
    return this.page.locator('[id^="bottom-sales-funnel-chart-page-views-"]').first();
  }

  funnelSessionsChart(): Locator {
    return this.page.locator('[id^="bottom-sales-funnel-chart-sessions-"]').first();
  }

  chartHost(widget: Locator): Locator {
    return widget.locator('[id^="chartID_"], .highcharts-container, svg.highcharts-root').first();
  }

  roAllBtn(): Locator {
    return this.page.locator('[id^="all-total-btn-"]').first();
  }

  roDesktopBtn(): Locator {
    return this.page.locator('[id^="desktop-btn-"]').first();
  }

  roIosBtn(): Locator {
    return this.page.locator('[id^="ios-btn-"]').first();
  }

  roAndroidBtn(): Locator {
    return this.page.locator('[id^="android-btn-"]').first();
  }

  roAllGraph(): Locator {
    return this.page.locator('[id^="all-total-graph-"]').first();
  }

  roDesktopGraph(): Locator {
    return this.page.locator('[id^="desktop-graph-"]').first();
  }

  roIosGraph(): Locator {
    return this.page.locator('[id^="ios-graph-"]').first();
  }

  roAndroidGraph(): Locator {
    return this.page.locator('[id^="android-graph-"]').first();
  }
}
