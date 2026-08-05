import { Page, Locator } from '@playwright/test';

/**
 * Locators for Business Insights / Improve Traffic /
 * Bottom of the Sales Funnel Conversion Analysis
 * Route: marketing-insights/bottom-sales-funnel
 */
export class BottomOfTheSalesFunnelAnalysisLocators {
  readonly pageTitle: Locator;
  readonly analysisHeading: Locator;

  readonly pathSelect: Locator;
  readonly pathSelectFallback: Locator;
  readonly createPathBtn: Locator;
  readonly addComparisonBtn: Locator;
  readonly viewByLabel: Locator;
  readonly viewByPageViews: Locator;
  readonly viewBySessions: Locator;
  readonly viewBySelector: Locator;

  readonly todayConversionWrapper: Locator;
  readonly comparisonConversionWrapper: Locator;
  readonly conversionRateCards: Locator;
  readonly funnelPageViews: Locator;
  readonly funnelSessions: Locator;
  readonly funnel2PageViews: Locator;
  readonly funnel2Sessions: Locator;

  readonly pathsConfigModal: Locator;
  readonly pathNameInput: Locator;
  readonly pathTypeContainer: Locator;
  readonly pathsHeaderTable: Locator;
  readonly pathsCreateSubmit: Locator;
  readonly pathsUpdateSubmit: Locator;

  readonly timePeriodBadge: Locator;
  readonly deviceBadge: Locator;
  readonly browserBadge: Locator;
  readonly osBadge: Locator;
  readonly dataTypeBadge: Locator;
  readonly visitorTypeBadge: Locator;

  readonly toggleFilters: Locator;
  readonly applyFilters: Locator;
  readonly cancelFilters: Locator;
  readonly timezoneSelect: Locator;
  readonly visitorTypeSelect: Locator;
  readonly myFiltersTab: Locator;
  readonly sharedFiltersTab: Locator;
  readonly existingPathSelectRow: Locator;

  readonly compareList: Locator;
  readonly addComparisonToGraph: Locator;
  readonly comparisonTitle: Locator;

  readonly configLink: Locator;
  readonly trainingVideoLink: Locator;
  readonly infoIcons: Locator;
  readonly highcharts: Locator;

  constructor(page: Page) {
    this.pageTitle = page.locator('#page-title');
    this.analysisHeading = page
      .locator('h1, h2, h3, h4, .panel-title, .box-title, .section-title')
      .filter({ hasText: /Bottom of the Sales Funnel Conversion Analysis/i })
      .first();

    this.pathSelect = page.locator('#select2-existingPathSelect-container');
    this.pathSelectFallback = page.locator('#existingPathSelect, #existingPathSelect-row').first();
    this.createPathBtn = page.locator('button, a, .btn').filter({ hasText: /^Create Path$/i }).first();
    this.addComparisonBtn = page.locator('button, a, .btn').filter({ hasText: /Add Comparison/i }).first();
    this.viewByLabel = page.locator('label, span, div').filter({ hasText: /^View By/i }).first();
    this.viewByPageViews = page.locator('label, a, button, span, li').filter({ hasText: /^Page Views$/i }).first();
    this.viewBySessions = page.locator('label, a, button, span, li').filter({ hasText: /^Sessions$/i }).first();
    this.viewBySelector = page.locator('#sales-funnel-page-views-sessions-selector');

    this.todayConversionWrapper = page.locator('#today-conversion-wrapper');
    this.comparisonConversionWrapper = page.locator('#comparison-conversion-wrapper');
    this.conversionRateCards = page.locator('#conversion-rate-cards');
    this.funnelPageViews = page.locator('#funnel-1-page-views');
    this.funnelSessions = page.locator('#funnel-1-sessions');
    this.funnel2PageViews = page.locator('#funnel-2-page-views');
    this.funnel2Sessions = page.locator('#funnel-2-sessions');

    this.pathsConfigModal = page.locator('#paths-config-modal');
    this.pathNameInput = page.locator('#path-name');
    this.pathTypeContainer = page.locator('#pathTypeContainer, #path-type').first();
    this.pathsHeaderTable = page.locator('#paths-header-table');
    this.pathsCreateSubmit = page.locator('#paths-create-submit');
    this.pathsUpdateSubmit = page.locator('#paths-update-submit');

    this.timePeriodBadge = page.locator('#time-period-view');
    this.deviceBadge = page.locator('#device-view');
    this.browserBadge = page.locator('#browser-view');
    this.osBadge = page.locator('#operating-system-view');
    this.dataTypeBadge = page.locator('#data-type-view');
    this.visitorTypeBadge = page.locator('#visitor-type-view');

    this.toggleFilters = page.locator('#toggle-filters, #mobile-controls-filters-btn').first();
    this.applyFilters = page.locator('#apply-filters');
    this.cancelFilters = page.locator('#cancel-filters');
    this.timezoneSelect = page.locator('#select2-timezone-container');
    this.visitorTypeSelect = page.locator('#visitor-type, #select2-visitor-type-container').first();
    this.myFiltersTab = page.locator('#my-filters-tab');
    this.sharedFiltersTab = page.locator('#shared-filters-tab');
    this.existingPathSelectRow = page.locator('#existingPathSelect-row');

    this.compareList = page.locator('#compareList');
    this.addComparisonToGraph = page.locator('#add-comparison-to-graph');
    this.comparisonTitle = page
      .locator('h1, h2, h3, h4, label, .modal-title')
      .filter({ hasText: /Comparison Title|Add Comparison/i })
      .first();

    this.configLink = page
      .locator('a')
      .filter({ hasText: /Bottom of the Sales Funnel Configuration/i })
      .first();
    this.trainingVideoLink = page
      .locator('a')
      .filter({ hasText: /Marketing Insights Module|Training Video/i })
      .first();
    this.infoIcons = page.locator(
      'i.fa-info-circle, .info-icon, [data-original-title], [data-toggle="tooltip"]'
    );
    this.highcharts = page.locator('.highcharts-container, [data-highcharts-chart]');
  }
}
