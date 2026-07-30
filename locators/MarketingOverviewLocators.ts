import { Page, Locator } from '@playwright/test';

/**
 * Locators for Business Insights / Improve Traffic / Marketing Overview
 * Route: overview-dashboard/marketing
 *
 * Prefer stable control IDs, visible titles, and scoped graph hosts.
 * Do not hard-code dynamic dashboard/widget numeric IDs (e.g. table-for-355897-*).
 */
export class MarketingOverviewLocators {
  readonly pageTitle: Locator;

  readonly switchDashboard: Locator;
  readonly quickSiteId: Locator;
  readonly timeLookback: Locator;
  readonly refreshDashboard: Locator;
  readonly autoRefresh: Locator;
  readonly autoRefreshFrequency: Locator;
  readonly toggleMarkersContainer: Locator;
  readonly resetAllInactiveWidgets: Locator;
  readonly expandCollapseInactiveWidgets: Locator;
  readonly viewOrEdit: Locator;
  readonly switchUser: Locator;

  readonly sitewideTotalsHeading: Locator;
  readonly bounceRateCard: Locator;
  readonly numberOfBouncesCard: Locator;
  readonly sessionExitRateCard: Locator;
  readonly numberOfExitsCard: Locator;
  readonly revenueCard: Locator;
  readonly numberOfSessionsCard: Locator;
  readonly numberOfPageViewsCard: Locator;
  readonly pageViewsPerSessionCard: Locator;
  readonly onloadCard: Locator;
  readonly conversionRateCard: Locator;

  readonly campaignsHeading: Locator;
  readonly campaignCards: Locator;
  readonly campaignButtons: Locator;
  readonly campaignNames: Locator;

  readonly revenueCampaigns: Locator;
  readonly ordersCampaigns: Locator;
  readonly aovCampaigns: Locator;
  readonly convRateCampaigns: Locator;
  readonly bounceRateCampaigns: Locator;
  readonly exitRateCampaigns: Locator;
  readonly sessionsCampaigns: Locator;

  readonly topCampaignsBar: Locator;
  readonly topCampaignsLine: Locator;
  readonly topCampaignsBarRow: Locator;
  readonly topCampaignsLineRow: Locator;

  readonly revenueByDeviceBar: Locator;
  readonly revenueByDeviceLine: Locator;
  readonly conversionRateByDeviceBar: Locator;
  readonly conversionRateByDeviceLine: Locator;
  readonly sessionsByDeviceBar: Locator;
  readonly sessionsByDeviceLine: Locator;

  readonly sourceTableHeading: Locator;
  readonly mediumTableHeading: Locator;
  readonly dataTables: Locator;

  readonly toggleFilters: Locator;
  readonly applyFilters: Locator;
  readonly cancelFilters: Locator;
  readonly timePeriod: Locator;
  readonly timezone: Locator;
  readonly campaignSource: Locator;
  readonly campaignMedium: Locator;
  readonly campaignName: Locator;
  readonly visitorType: Locator;
  readonly includeBots: Locator;
  readonly excludeBots: Locator;
  readonly botsOnly: Locator;
  readonly country: Locator;
  readonly region: Locator;

  readonly highchartsContainers: Locator;
  readonly highchartsTooltip: Locator;
  readonly highchartsLegendItems: Locator;
  readonly chartContextMenuButtons: Locator;
  readonly infoIcons: Locator;
  readonly pageContents: Locator;

  constructor(private readonly page: Page) {
    this.pageTitle = page.locator('#page-title');

    this.switchDashboard = page.locator('#switch-dashboard');
    this.quickSiteId = page.locator('#quick-site-id, #site-id').first();
    this.timeLookback = page
      .locator('#time-lookback')
      .or(page.getByRole('button', { name: /Change dashboard time period|Last \d|Today so far/i }))
      .or(page.locator('[aria-label*="time period" i]'))
      .first();
    this.refreshDashboard = page.locator('#refresh-dashboard');
    this.autoRefresh = page.locator('#auto-refresh');
    this.autoRefreshFrequency = page.locator('#auto-refresh-frequency');
    this.toggleMarkersContainer = page
      .locator('#toggle-markers-container')
      .or(page.getByText(/Global Event Markers|Event Markers|No Markers/i).first())
      .first();
    this.resetAllInactiveWidgets = page.locator('#reset-all-inactive-widgets');
    this.expandCollapseInactiveWidgets = page.locator('#expand-collapse-inactive-widgets');
    this.viewOrEdit = page.locator('#view-or-edit');
    this.switchUser = page.locator('#switch-user');

    this.sitewideTotalsHeading = page.getByText(/Sitewide Totals/i).first();
    this.bounceRateCard = page.locator('#bounce-rate-card');
    this.numberOfBouncesCard = page.locator('#number-of-bounces-card');
    this.sessionExitRateCard = page.locator('#session-exit-rate-card');
    this.numberOfExitsCard = page.locator('#number-of-exits-card');
    this.revenueCard = page.locator('#revenue-card');
    this.numberOfSessionsCard = page.locator('#number-of-sessions-card');
    this.numberOfPageViewsCard = page.locator('#number-of-page-views-card');
    this.pageViewsPerSessionCard = page.locator('#page-views-per-session-card');
    this.onloadCard = page.locator('#onload-card');
    this.conversionRateCard = page.locator('#conversion-rate-card');

    this.campaignsHeading = page.getByText(/^Campaigns$/i).first();
    this.campaignCards = page.locator('[id^="campaignDiv_"]');
    this.campaignButtons = page.locator('[id^="campaign-button_"]');
    this.campaignNames = page.locator('[id^="campaign-name_"]');

    this.revenueCampaigns = page.locator('#revenue-campaigns');
    this.ordersCampaigns = page.locator('#orders-campaigns');
    this.aovCampaigns = page.locator('#aov-campaigns');
    this.convRateCampaigns = page.locator('#conv-rate-campaigns');
    this.bounceRateCampaigns = page.locator('#bounce-rate-campaigns');
    this.exitRateCampaigns = page.locator('#exit-rate-campaigns');
    this.sessionsCampaigns = page.locator('#sessions-campaigns');

    this.topCampaignsBar = page.locator('#top-campaigns-by-campaign-bar');
    this.topCampaignsLine = page.locator('#top-campaigns-by-campaign-line');
    this.topCampaignsBarRow = page.locator('#top-campaigns-by-campaign-bar-row');
    this.topCampaignsLineRow = page.locator('#top-campaigns-by-campaign-line-row');

    this.revenueByDeviceBar = page.locator('#revenue-by-device-bar');
    this.revenueByDeviceLine = page.locator('#revenue-by-device-line');
    this.conversionRateByDeviceBar = page.locator('#conversionRate-by-device-bar');
    this.conversionRateByDeviceLine = page.locator('#conversionRate-by-device-line');
    this.sessionsByDeviceBar = page.locator('#sessions-by-device-bar');
    this.sessionsByDeviceLine = page.locator('#sessions-by-device-line');

    this.sourceTableHeading = page.getByText(/^Source$/i).first();
    this.mediumTableHeading = page.getByText(/^Medium$/i).first();
    this.dataTables = page.locator('table.dataTable, .dataTables_wrapper table');

    this.toggleFilters = page.locator('#toggle-filters');
    this.applyFilters = page.locator('#apply-filters');
    this.cancelFilters = page.locator('#cancel-filters');
    this.timePeriod = page.locator('#time-period');
    this.timezone = page.locator('#timezone');
    this.campaignSource = page.locator('#campaign-source');
    this.campaignMedium = page.locator('#campaign-medium');
    this.campaignName = page.locator('#campaign-name');
    this.visitorType = page.locator('#visitor-type');
    this.includeBots = page.locator('#include-bots');
    this.excludeBots = page.locator('#exclude-bots');
    this.botsOnly = page.locator('#bots-only');
    this.country = page.locator('#country');
    this.region = page.locator('#region');

    this.highchartsContainers = page.locator('.highcharts-container');
    this.highchartsTooltip = page.locator('.highcharts-tooltip, .highcharts-label.highcharts-tooltip');
    this.highchartsLegendItems = page.locator('.highcharts-legend-item');
    this.chartContextMenuButtons = page.locator(
      '.highcharts-button, .highcharts-contextbutton, .fal.fa-bars, button.highcharts-a11y-proxy-button'
    );
    this.infoIcons = page.locator(
      '.fa-info-circle, .fal.fa-info-circle, [class*="info-circle"], .glyphicon-info-sign, i[title], a[title]'
    );
    this.pageContents = page.locator('#page-contents, #dashboard-widgets, .dashboard-widgets, main').first();
  }

  sitewideMetricCards(): Locator[] {
    return [
      this.bounceRateCard,
      this.numberOfBouncesCard,
      this.sessionExitRateCard,
      this.numberOfExitsCard,
      this.revenueCard,
      this.numberOfSessionsCard,
      this.numberOfPageViewsCard,
      this.pageViewsPerSessionCard,
      this.onloadCard,
      this.conversionRateCard,
    ];
  }

  campaignMetricButtons(): Locator[] {
    return [
      this.revenueCampaigns,
      this.ordersCampaigns,
      this.aovCampaigns,
      this.convRateCampaigns,
      this.bounceRateCampaigns,
      this.exitRateCampaigns,
      this.sessionsCampaigns,
    ];
  }
}
