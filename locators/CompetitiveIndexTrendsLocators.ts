import { Page, Locator } from '@playwright/test';
import { CompetitiveIndexTableLocators } from './CompetitiveIndexTableLocators';

/**
 * Locators for Competitive Index Trends (view=trends).
 * Extends shared Competitive Index locators with Trends chart hosts.
 */
export class CompetitiveIndexTrendsLocators extends CompetitiveIndexTableLocators {
  readonly trendsCon: Locator;
  readonly groupsChart: Locator;
  readonly industryTrendChart: Locator;
  readonly industryTrendChartContainer: Locator;
  readonly trendSaveGroup: Locator;
  readonly hideTrendFilters: Locator;
  readonly createGroupBtn: Locator;
  readonly manageGroupsBtn: Locator;
  readonly viewMetricBtn: Locator;
  readonly siteCheckboxes: Locator;

  constructor(page: Page) {
    super(page);
    this.trendsCon = page.locator('#trends-con');
    this.groupsChart = page.locator('#groupsChart');
    this.industryTrendChart = page.locator('#industryTrendChart');
    this.industryTrendChartContainer = page.locator('#industryTrendChartContainer');
    this.trendSaveGroup = page.locator('#trendSaveGroup');
    this.hideTrendFilters = page.locator('#hideTrendFilters');
    this.createGroupBtn = page.locator('button, a').filter({ hasText: /Create Group/i }).first();
    this.manageGroupsBtn = page.locator('button, a').filter({ hasText: /Manage Groups/i }).first();
    this.viewMetricBtn = page.locator('button, a').filter({ hasText: /View Metric/i }).first();
    this.siteCheckboxes = page.locator(
      '#compToggleBox input[type="checkbox"], #companyToggler input[type="checkbox"], #companyToggleConatiner input[type="checkbox"], [id$="_toggle_container"] input[type="checkbox"]'
    );
  }
}
