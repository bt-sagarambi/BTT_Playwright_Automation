import { Frame, Page, Locator } from '@playwright/test';

/**
 * Locators for BI Dashboard: Site Operations Dashboard for Page Names
 * Portal shell: business-intelligence/tool → #bi-iframe (jbi.bluetriangletech.com)
 *
 * Live hosts (Aug 2026 probe): Lookback Period → "Last 3 Complete Months";
 * Refresh Data | Save As | Reset to Defaults; LCP/CLS/INP tables with PAGE NAME + month cols;
 * Export chart → PNG Image | PDF Document | CSV Data.
 */
export class SiteOpsPageNamesDashboardLocators {
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

  inFrame(frame: Frame) {
    return {
      dashboardsNav: frame.getByRole('button', { name: /^Dashboards$/i }).or(
        frame.locator('a, button, [role="menuitem"], [role="button"]').filter({ hasText: /^Dashboards$/i }).first()
      ),
      favoritesNav: frame.locator('a, button, [role="menuitem"]').filter({ hasText: /^Favorites$/i }).first(),
      searchInput: frame.locator('input[placeholder*="Search" i], input[type="search"]').first(),
      createDashboard: frame.locator('button, a').filter({ hasText: /Create Dashboard/i }).first(),
      listReset: frame.locator('button, a').filter({ hasText: /^Reset$/i }).first(),
      cardTitle: frame
        .locator('a, h2, h3, h4, [role="heading"]')
        .filter({ hasText: /Site Operations Dashboard for Page Names/i })
        .filter({ hasNotText: /Page Groups|\+ CWV/i })
        .first(),
      dashboardTitle: frame
        .locator('h1, h2, h3, [role="heading"], .dashboard-title')
        .filter({ hasText: /Site Operations Dashboard for Page Names/i })
        .first(),
      backBtn: frame.locator('button, a').filter({ hasText: /^Back$/i }).first(),
      lookbackPeriod: frame.locator('label, button, div, span').filter({ hasText: /Lookback Period/i }).first(),
      lookbackValue: frame
        .locator('button, div, span')
        .filter({ hasText: /Last \d+ Complete Months?|Complete Month/i })
        .first(),
      applyBtn: frame.locator('button, a').filter({ hasText: /^Apply$/i }).first(),
      saveAsBtn: frame.locator('button, a').filter({ hasText: /Save As|Save as/i }).first(),
      refreshDataBtn: frame.locator('button, a').filter({ hasText: /Refresh Data|^Refresh$/i }).first(),
      resetToDefaultBtn: frame
        .locator('button, a')
        .filter({ hasText: /Reset to Defaults?|Reset to defaults?/i })
        .first(),
      filtersBtn: frame.locator('button, a').filter({ hasText: /^Filters$/i }).first(),
      exportChartBtn: frame.locator('[title="Export chart"], button[title*="Export" i]').first(),
      pngOption: frame.locator('button, a, [role="menuitem"]').filter({ hasText: /PNG Image/i }).first(),
      pdfOption: frame.locator('button, a, [role="menuitem"]').filter({ hasText: /PDF Document/i }).first(),
      pptOption: frame.locator('button, a, [role="menuitem"]').filter({ hasText: /PowerPoint|PPT/i }).first(),
      csvOption: frame.locator('button, a, [role="menuitem"]').filter({ hasText: /CSV Data/i }).first(),
      pageNameHeader: frame.locator('th, [role="columnheader"]').filter({ hasText: /PAGE NAME/i }).first(),
    };
  }
}
