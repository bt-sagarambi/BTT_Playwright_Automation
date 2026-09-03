import { Frame, Page, Locator } from '@playwright/test';

/**
 * Locators for BI Chart: CWV Top 10 Summary Onload
 * Portal shell: business-intelligence/tool → #bi-iframe (jbi.bluetriangletech.com)
 * Home: BI rail Charts → Search → card title (not Dashboards / PoP / plain Summary).
 *
 * Live hosts (Sep 2026 probe): Back | Global | Export ▾ | Refresh Data |
 * Lookback Last 30 Days | Comparison Directly Previous / Same Time Last Year |
 * Filters Percentile/Device/Browser/… | table Page Name|Onload|Page Hits|Current|Previous|Change
 */
export class CwvTop10SummaryOnloadChartLocators {
  readonly pageTitle: Locator;
  readonly siteSelectContainer: Locator;
  readonly biIframe: Locator;
  readonly biIframeLoading: Locator;

  constructor(private readonly page: Page) {
    this.pageTitle = page.locator('#page-title');
    this.siteSelectContainer = page.locator('#select2-site-id-container, #select2-quick-site-id-container').first();
    this.biIframe = page.locator('#bi-iframe');
    this.biIframeLoading = page.locator('#jbi-iframe-loading');
  }

  /** Locators scoped to the BI iframe frame. */
  inFrame(frame: Frame) {
    return {
      chartsNav: frame
        .getByRole('button', { name: /^Charts$/i })
        .or(frame.locator('a, button, [role="menuitem"], [role="button"]').filter({ hasText: /^Charts$/i }))
        .first(),
      dashboardsNav: frame.locator('a, button, [role="menuitem"]').filter({ hasText: /^Dashboards$/i }).first(),
      favoritesNav: frame.locator('a, button, [role="menuitem"]').filter({ hasText: /^Favorites$/i }).first(),
      searchInput: frame
        .locator('input[placeholder*="Search" i], input[type="search"], input[aria-label*="Search" i]')
        .first(),
      chartBuilderBtn: frame.locator('button, a, [role="button"]').filter({ hasText: /^Chart Builder$/i }).first(),
      createDashboard: frame.locator('button, a').filter({ hasText: /Create Dashboard/i }).first(),
      folderFilter: frame.locator('select, button, [role="combobox"]').filter({ hasText: /All Folders|Folder/i }).first(),
      listReset: frame.locator('button, a').filter({ hasText: /^Reset$/i }).first(),
      chartCardTitle: frame
        .getByRole('link', { name: /^CWV Top 10 Summary Onload$/i })
        .or(frame.locator('a, h2, h3, h4, [role="heading"]').filter({ hasText: /^\s*CWV Top 10 Summary Onload\s*$/i }))
        .first(),
      chartTitle: frame
        .locator('h1, h2, h3, [role="heading"], .chart-title')
        .filter({ hasText: /CWV Top 10 Summary Onload/i })
        .first(),
      backBtn: frame.locator('button, a').filter({ hasText: /^Back$/i }).first(),
      lookbackPeriod: frame.locator('label, button, div, span').filter({ hasText: /Lookback Period/i }).first(),
      comparison: frame.locator('label, button, div, span').filter({ hasText: /^Comparison/i }).first(),
      applyBtn: frame.locator('button, a').filter({ hasText: /^Apply$/i }).first(),
      refreshDataBtn: frame.locator('button, a').filter({ hasText: /Refresh Data|^Refresh$/i }).first(),
      resetToDefaultBtn: frame
        .locator('button, a')
        .filter({ hasText: /Reset to Defaults?|Reset to defaults?/i })
        .first(),
      filtersBtn: frame.locator('button, a').filter({ hasText: /^Filters$/i }).first(),
      exportBtn: frame
        .locator('button, a, [role="button"]')
        .filter({ hasText: /^Export/i })
        .or(frame.locator('[title="Export chart"], button[title*="Export" i]'))
        .first(),
      lookbackChip: frame
        .locator('button, div, span, [role="button"]')
        .filter({ hasText: /Last\s+\d+\s+Days?/i })
        .first(),
      runQueryBtn: frame.locator('button, a').filter({ hasText: /Run Query/i }).first(),
      selectTable: frame.locator('button, a, [role="button"]').filter({ hasText: /Select table/i }).first(),
      pageNameHeader: frame.locator('th, [role="columnheader"]').filter({ hasText: /Page Name/i }).first(),
      onloadHeader: frame.locator('th, [role="columnheader"]').filter({ hasText: /^Onload$/i }).first(),
    };
  }
}
