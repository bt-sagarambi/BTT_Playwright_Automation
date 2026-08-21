import { Page, Locator } from '@playwright/test';

/**
 * Locators for custom dashboard Tag Governance - US2.
 * Route: site/dashboard | menu: Dashboards | option: Tag Governance - US2 (Custom)
 *
 * Prefer stable control IDs and widget **titles** / id prefixes.
 * Do not hard-code dynamic grid-stack / chartID_* / highcharts-* numeric suffixes.
 */
export class TagGovernanceUs2DashboardLocators {
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

  /** Unlabeled / primary Composition (not RUM-titled). */
  compositionUs2Widget(): Locator {
    return this.page
      .locator('.grid-stack-item')
      .filter({ hasText: /1st\s+vs\s+3rd\s+Party\s+Composition\s*-\s*US2/i })
      .filter({ hasNotText: /Composition\s*-\s*RUM/i })
      .first();
  }

  compositionRumWidget(): Locator {
    return this.widgetByTitle(/1st\s+vs\s+3rd\s+Party\s+Composition\s*-\s*RUM\s*-\s*US2/i);
  }

  activitySyntheticWidget(): Locator {
    return this.page
      .locator('.grid-stack-item')
      .filter({ hasText: /1st\s+vs\s+3rd\s+Party\s+Activity\s*-\s*Synthetic\s*-\s*US2/i })
      .filter({ has: this.page.locator('[id^="chartID_"], [id^="slowest-services-graph-"], [id^="domains-btn-"]') })
      .or(
        this.page
          .locator('.grid-stack-item')
          .filter({ hasText: /Activity\s*-\s*Synthetic\s*-\s*US2/i })
          .filter({ hasNotText: /Activity\s*-\s*RUM/i })
      )
      .first();
  }

  activityRumWidget(): Locator {
    return this.page
      .locator('.grid-stack-item')
      .filter({ hasText: /1st\s+vs\s+3rd\s+Party\s+Activity\s*-\s*RUM\s*-\s*US2/i })
      .filter({ hasNotText: /Synthetic/i })
      .filter({ has: this.page.locator('[id^="chartID_"], [id^="slowest-services-graph-"], [id^="domains-btn-"]') })
      .or(
        this.page
          .locator('.grid-stack-item')
          .filter({ hasText: /Activity\s*-\s*RUM\s*-\s*US2/i })
          .filter({ hasNotText: /Synthetic/i })
      )
      .first();
  }

  environmentWidget(): Locator {
    return this.widgetByTitle(/Environment\s*-\s*US2|^Environment$/i);
  }

  chartHost(widget: Locator): Locator {
    return widget.locator('[id^="chartID_"], .highcharts-container, svg.highcharts-root').first();
  }

  compositionDurationChart(widget: Locator): Locator {
    return widget.locator('[id^="first-vs-third-duration-"]').first();
  }

  compositionSizeChart(widget: Locator): Locator {
    return widget.locator('[id^="first-vs-third-size-"]').first();
  }

  compositionCountChart(widget: Locator): Locator {
    return widget.locator('[id^="first-vs-third-count-"]').first();
  }

  activityDomainsBtn(widget: Locator): Locator {
    return widget.locator('[id^="domains-btn-"], button, a, span').filter({ hasText: /^\s*DOMAINS\s*$/i }).first();
  }

  activityServicesBtn(widget: Locator): Locator {
    return widget.locator('button, a, span, [role="tab"]').filter({ hasText: /^\s*SERVICES\s*$/i }).first();
  }

  activityFilesBtn(widget: Locator): Locator {
    return widget.locator('button, a, span, [role="tab"]').filter({ hasText: /^\s*FILES\s*$/i }).first();
  }

  activityFirstPartyBtn(widget: Locator): Locator {
    return widget
      .locator('[id^="first-party-btn-"], button, a, span')
      .filter({ hasText: /^\s*1st Party\s*$/i })
      .first();
  }

  activityThirdPartyBtn(widget: Locator): Locator {
    return widget
      .locator('[id^="third-party-btn-"], button, a, span')
      .filter({ hasText: /^\s*3rd Party\s*$/i })
      .first();
  }

  activityAllBtn(widget: Locator): Locator {
    return widget.locator('button, a, span').filter({ hasText: /^\s*All\s*$/i }).first();
  }

  activitySlowestMetricContainer(widget: Locator): Locator {
    return widget.locator('[id^="select2-slowest-metric-"][id$="-container"], [id^="slowest-metric-"]').first();
  }

  activityGraphBtn(widget: Locator): Locator {
    return widget
      .locator('[id^="first-vs-third-graph-btn-"], button, a')
      .filter({ hasText: /View Graph|Graph/i })
      .first();
  }

  activityTableBtn(widget: Locator): Locator {
    return widget
      .locator('[id^="first-vs-third-table-btn-"], button, a')
      .filter({ hasText: /View Table|Table/i })
      .first();
  }

  activityServicesGraph(widget: Locator): Locator {
    return widget.locator('[id^="slowest-services-graph-"]').first();
  }

  activityDomainsGraph(widget: Locator): Locator {
    return widget.locator('[id^="slowest-domains-graph-"]').first();
  }

  activityFilesGraph(widget: Locator): Locator {
    return widget.locator('[id^="slowest-files-graph-"]').first();
  }

  environmentSparklines(): Locator {
    return this.page.locator(
      '[id^="sparkline_domains_rum-"], [id^="sparkline_pages_rum-"], [id^="sparkline_files_rum-"], [id^="sparkline_domains_synth-"], [id^="sparkline_pages_synth-"], [id^="sparkline_files_synth-"], [id^="sparkline_vendors-"]'
    );
  }
}
