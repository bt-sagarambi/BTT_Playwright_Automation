import { Frame, Page, Locator } from '@playwright/test';

/**
 * Locators for BI Dashboard: CWV Top 10 Period over Period (PoP)
 * Portal shell: business-intelligence/tool → #bi-iframe (jbi.bluetriangletech.com)
 *
 * Live hosts (Aug 2026 probe): Lookback Period → "Last 1 Complete Month";
 * Refresh Data | Save As | Reset to Defaults; Filters panel with Browser,
 * Bot Traffic, Device, OS, Originated From, Page Name, Percentile (p75), etc.
 */
export class CwvTop10PopDashboardLocators {
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
      dashboardsNav: frame.getByRole('button', { name: /^Dashboards$/i }).or(
        frame.locator('a, button, [role="menuitem"], [role="button"]').filter({ hasText: /^Dashboards$/i }).first()
      ),
      favoritesNav: frame.locator('a, button, [role="menuitem"]').filter({ hasText: /^Favorites$/i }).first(),
      searchInput: frame.locator('input[placeholder*="Search" i], input[type="search"]').first(),
      createDashboard: frame.locator('button, a').filter({ hasText: /Create Dashboard/i }).first(),
      folderFilter: frame.locator('select, button, [role="combobox"]').filter({ hasText: /All Folders|Folder/i }).first(),
      listReset: frame.locator('button, a').filter({ hasText: /^Reset$/i }).first(),
      popCardTitle: frame
        .getByRole('link', { name: /CWV Top 10 Period over Period \(PoP\)/i })
        .or(frame.locator('a, h2, h3, h4').filter({ hasText: /^CWV Top 10 Period over Period \(PoP\)$/i }))
        .first(),
      dashboardTitle: frame
        .locator('h1, h2, h3, [role="heading"], .dashboard-title')
        .filter({ hasText: /CWV Top 10 Period over Period \(PoP\)/i })
        .first(),
      backBtn: frame.locator('button, a').filter({ hasText: /^Back$/i }).first(),
      lookbackPeriod: frame.locator('label, button, div, span').filter({ hasText: /Lookback Period/i }).first(),
      comparisonMethod: frame.locator('label, button, div, span').filter({ hasText: /Comparison Method|Comparison Period/i }).first(),
      endDate: frame.locator('label, button, div, span').filter({ hasText: /^End date|^End Date/i }).first(),
      applyBtn: frame.locator('button, a').filter({ hasText: /^Apply$/i }).first(),
      saveAsBtn: frame.locator('button, a').filter({ hasText: /Save As|Save as/i }).first(),
      refreshDataBtn: frame.locator('button, a').filter({ hasText: /Refresh Data|^Refresh$/i }).first(),
      resetToDefaultBtn: frame
        .locator('button, a')
        .filter({ hasText: /Reset to Defaults?|Reset to defaults?/i })
        .first(),
      filtersBtn: frame.locator('button, a').filter({ hasText: /^Filters$/i }).first(),
      lookbackValue: frame.locator('button, div, span').filter({ hasText: /Last \d+ Complete Month|Complete Month|Last \d+ Month/i }).first(),
    };
  }
}
