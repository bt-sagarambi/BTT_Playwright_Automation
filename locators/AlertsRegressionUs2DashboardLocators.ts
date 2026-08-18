import { Page, Locator } from '@playwright/test';

/**
 * Locators for custom dashboard Alerts Regression - US2.
 * Route: site/dashboard | menu: Dashboards | option: Alerts Regression - US2 (Custom)
 *
 * Prefer stable control IDs and widget **titles** / id prefixes.
 * Do not hard-code dynamic grid-stack / chartID_* numeric suffixes.
 */
export class AlertsRegressionUs2DashboardLocators {
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

  readonly pauseBanner: Locator;
  readonly continueAutoRefresh: Locator;

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

    this.pauseBanner = page.getByText(/Dashboard Auto Refresh Is Now Paused/i).first();
    this.continueAutoRefresh = page
      .getByRole('button', { name: /Continue Auto Refresh/i })
      .or(page.locator('button, a.btn').filter({ hasText: /Continue Auto Refresh/i }))
      .first();
  }

  widgetByTitle(title: RegExp): Locator {
    return this.page.locator('.grid-stack-item').filter({ hasText: title }).first();
  }

  deoWidget(): Locator {
    return this.widgetByTitle(/DEO Anomalies\s*-\s*US2|DEO Anomalies|Site Opportunities/i);
  }

  announcementsWidget(): Locator {
    return this.widgetByTitle(/Blue Triangle Announcements/i);
  }

  activeAlertsWidget(): Locator {
    return this.widgetByTitle(/Active Alerts\s*-\s*US2/i);
  }

  deoTable(): Locator {
    return this.page.locator('[id^="homepage-issue-tracker-chartID_"]').filter({ has: this.page.locator('th') }).first();
  }

  deoSearch(): Locator {
    return this.deoWidget().locator('#table-search, input[type="search"], input[placeholder*="Search" i]').first();
  }

  deoViewAllIssues(): Locator {
    return this.deoWidget().locator('a, button').filter({ hasText: /View All Issues/i }).first();
  }

  deoExport(): Locator {
    return this.deoWidget().locator('button, a').filter({ hasText: /^Export$/i }).first();
  }

  deoPagerInfo(): Locator {
    return this.page.locator('[id*="homepage-issue-tracker"][id*="pager_info"]').first();
  }

  activeAlertsTable(): Locator {
    return this.page.locator('[id^="activeAlertsTable_"]').first();
  }

  activeAlertsDiv(): Locator {
    return this.page.locator('[id^="activeAlertsDiv_"]').first();
  }
}
