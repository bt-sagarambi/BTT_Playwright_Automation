import { Page, Locator } from '@playwright/test';

/**
 * Locators for Monitoring / Real User Browser / Performance Detail
 * (menu label may appear as "Performance Detail (RUM Browser)").
 */
export class RumPerformanceDetailLocators {
  readonly pageTitle: Locator;
  readonly configureMetricsButton: Locator;
  readonly chooseMetricsHeading: Locator;

  readonly toggleGlobalMarkers: Locator;
  readonly markerCaret: Locator;
  readonly markersContainer: Locator;

  readonly filtersToggle: Locator;
  readonly applyFiltersButton: Locator;
  readonly clearFiltersCacheButton: Locator;
  readonly viewFiltersButton: Locator;
  readonly viewFiltersBanner: Locator;
  readonly pageNameFilter: Locator;
  readonly performanceDetailsByPage: Locator;
  readonly metricCards: Locator;
  readonly visitorTypeSelect: Locator;
  readonly pageGroupSelect: Locator;
  readonly trafficSegmentSelect: Locator;
  readonly dataOriginSelect: Locator;

  readonly pageScatterType: Locator;
  readonly scatterPlotWcd: Locator;
  readonly sessionScatterType: Locator;

  readonly pageTimingsGraphToggle: Locator;
  readonly pageTimingsTableToggle: Locator;
  readonly pageViewsGraphToggle: Locator;
  readonly pageViewsTableToggle: Locator;
  readonly sessionLookupGraphToggle: Locator;
  readonly sessionLookupTableToggle: Locator;
  readonly domainObjectGraphToggle: Locator;
  readonly domainObjectTableToggle: Locator;

  readonly pageViewsChart: Locator;
  readonly pageViewsSessionChart: Locator;
  readonly pageViewsSessionTable: Locator;
  readonly objectLevelDetailTable: Locator;
  readonly domainLevelSection: Locator;
  readonly objectLevelSection: Locator;
  readonly objectActivitySection: Locator;

  readonly highchartsContainers: Locator;
  readonly highchartsPoints: Locator;
  readonly highchartsLegendItems: Locator;
  readonly highchartsTooltip: Locator;
  readonly chartContextMenuButtons: Locator;
  readonly tables: Locator;

  constructor(private readonly page: Page) {
    this.pageTitle = page.locator('#page-title');
    this.configureMetricsButton = page.locator('#configure-metrics-button');
    this.chooseMetricsHeading = page.getByText(/Choose Metrics|Choose Your Displayed Metrics/i).first();

    this.toggleGlobalMarkers = page.locator('#toggle-markers-container, #toggle-dropdown-con');
    this.markerCaret = page.locator('#marker-caret');
    this.markersContainer = page.locator('#toggle-markers-container');

    this.filtersToggle = page.locator('#toggle-filters');
    this.applyFiltersButton = page.getByRole('button', { name: /Apply Filters/i }).first();
    this.clearFiltersCacheButton = page.getByRole('button', { name: /Clear Cache|Clear Genius Cache/i }).first();
    // Confluence: top-left View Filters / Hide Filters (not revenue-opportunity-view-filter)
    this.viewFiltersButton = page.locator('#performance-view-filter');
    this.viewFiltersBanner = page.locator('#toggle-filter-section');
    this.pageNameFilter = page.locator('#page-name, select[name="page-name[]"]').first();
    this.performanceDetailsByPage = page.getByText(/Performance Details by Page/i).first();
    this.metricCards = page.locator('#cardThings .column, #cardThings [class*="card"], .choose-matrix-row .column');
    this.visitorTypeSelect = page.locator('#visitor-type');
    this.pageGroupSelect = page.locator('#page-group');
    this.trafficSegmentSelect = page.locator('#traffic-segment');
    this.dataOriginSelect = page.locator('#data-origin');

    this.pageScatterType = page.locator('#page-scatter-type');
    this.scatterPlotWcd = page.locator('#scatterPlotWcd');
    this.sessionScatterType = page.locator('#session-scatter-type');

    this.pageTimingsGraphToggle = page.locator('#toggle-perf-graph-button');
    this.pageTimingsTableToggle = page.locator('#toggle-perf-table-button');
    this.pageViewsGraphToggle = page.locator('#toggle-inp-graph-button');
    this.pageViewsTableToggle = page.locator('#toggle-inp-table-button');
    this.sessionLookupGraphToggle = page.locator('#session-lookup-graph-view');
    this.sessionLookupTableToggle = page.locator('#session-lookup-table-view');
    this.domainObjectGraphToggle = page.locator('#graph-rum-performance-detail-btn');
    this.domainObjectTableToggle = page.locator('#table-rum-performance-detail-btn');

    this.pageViewsChart = page.locator('#page-volume-graph, .highcharts-container').filter({ hasText: /Page Views/i }).or(
      page.locator('.highcharts-title', { hasText: /^Page Views$/i }).locator('xpath=ancestor::*[contains(@class,"highcharts-container") or contains(@id,"graph")][1]')
    );
    this.pageViewsSessionChart = page.locator('#page-views-for-session-scatter-plot-graph');
    this.pageViewsSessionTable = page.locator('#page-views-for-session-scatter-plot-table-container');
    this.objectLevelDetailTable = page.locator('#object-level-detail-table');
    this.domainLevelSection = page.getByText(/Domain Level Activity/i).first();
    this.objectLevelSection = page.getByText(/Object Level Detail/i).first();
    this.objectActivitySection = page.getByText(/Object Activity By Domain/i).first();

    this.highchartsContainers = page.locator('.highcharts-container');
    this.highchartsPoints = page.locator('.highcharts-point, .highcharts-markers .highcharts-point, .highcharts-series-group .highcharts-point');
    this.highchartsLegendItems = page.locator('.highcharts-legend-item');
    this.highchartsTooltip = page.locator('.highcharts-tooltip, .highcharts-label.highcharts-tooltip');
    this.chartContextMenuButtons = page.locator('.highcharts-button, .highcharts-contextbutton, .fal.fa-bars, button.highcharts-a11y-proxy-button');
    this.tables = page.locator('table');
  }

  metricCard(name: string | RegExp): Locator {
    return this.page.locator('#cardThings .column, #cardThings [class*=card], .choose-matrix-row').filter({ hasText: name }).first();
  }

  sectionByTitle(title: string | RegExp): Locator {
    return this.page.locator('section, .perf-page-section, .row, .card, .panel').filter({ hasText: title }).first();
  }

  graphById(id: string): Locator {
    return this.page.locator(`#${id}`);
  }

  select2ContainerFor(selectId: string): Locator {
    return this.page.locator(`#select2-${selectId}-container, span[aria-labelledby*="${selectId}"]`).first();
  }
}
