import { Page, expect, Locator } from '@playwright/test';
import { CustomerJourneyAnalysisLocators } from '../locators/CustomerJourneyAnalysisLocators';
import { LeftNavPage } from './LeftNavPage';
import { SiteDropdownPage } from './SiteDropdownPage';
import { ensurePortalSession } from '../helpers/portalSession';
import { getActiveProfile } from '../config/profiles';

export type JourneyConversionType = 'sales' | 'brand';

const PAGE_DEFS: Record<JourneyConversionType, {
  id: string;
  module: string;
  menuLabel: string;
  route: string;
  hrefIncludes: string[];
  titleIncludes: RegExp;
}> = {
  sales: {
    id: 'biz.customer-journey',
    module: 'biz',
    menuLabel: 'Customer Journey Analysis',
    route: 'marketing-insights/customer-journey-analysis',
    hrefIncludes: ['conversion-type=sales'],
    titleIncludes: /Customer Journey/i,
  },
  brand: {
    id: 'mkt.brand-journey',
    module: 'mkt',
    menuLabel: 'Brand Customer Journey Analysis',
    route: 'marketing-insights/customer-journey-analysis',
    hrefIncludes: ['conversion-type=brand'],
    titleIncludes: /Brand|Customer Journey/i,
  },
};

export type CustomerJourneyContext = {
  siteName: string;
  timePeriod: string;
  campaign: string;
  landingPage: string;
  focalPage: string;
  pathsMode: string;
  dataType: string;
  botTraffic: string;
  activeTab: 'campaigns' | 'path-analytics' | 'path-flow';
};

/**
 * Customer Journey Analysis (sales or brand conversion-type).
 * Read-only except Apply Filters sampling. Do not Save Filter / Save Campaign.
 */
export class CustomerJourneyAnalysisPage {
  readonly locators: CustomerJourneyAnalysisLocators;
  readonly conversionType: JourneyConversionType;

  constructor(
    protected readonly page: Page,
    conversionType: JourneyConversionType = 'sales'
  ) {
    this.conversionType = conversionType;
    this.locators = new CustomerJourneyAnalysisLocators(page);
  }

  protected get pageDef() {
    return PAGE_DEFS[this.conversionType];
  }

  protected get currencyHeaderRegex(): RegExp {
    // Live Brand CJA header tracks site currency symbol/code, e.g. Brand (€), Brand ($), Brand £.
    return this.conversionType === 'brand'
      ? /Brand\s*\([^)]+\)|Brand\s*[\$€£¥]|Brand\b/i
      : /Revenue\s*\(\$\)|Revenue\s*\([^)]+\)|Revenue/i;
  }

  async openViaNavigation(): Promise<void> {
    await ensurePortalSession(this.page);
    await new SiteDropdownPage(this.page).ensureProfileSite();
    await new LeftNavPage(this.page).openSmokePage(this.pageDef);
    await this.waitForPageReady();
  }

  async dismissBlockingDialogs(): Promise<void> {
    for (let i = 0; i < 4; i++) {
      const open = this.page.locator('.jconfirm.jconfirm-open, .modal.in, .blockUI');
      if (!(await open.first().isVisible().catch(() => false))) break;
      const btn = this.page
        .locator('.jconfirm.jconfirm-open button, .jconfirm.jconfirm-open .btn, .modal.in button')
        .filter({ hasText: /ok|close|yes|got it|continue|dismiss|agree/i })
        .first();
      if (await btn.isVisible().catch(() => false)) {
        await btn.click({ force: true, timeout: 3000 }).catch(() => undefined);
      } else {
        await this.page.keyboard.press('Escape').catch(() => undefined);
      }
      await this.page.waitForTimeout(400);
    }
  }

  async waitForPageReady(): Promise<void> {
    await expect(this.page).not.toHaveURL(/site\/login|site%2Flogin/i);
    await expect(this.page).toHaveURL(/marketing-insights(?:\/|%2F)customer-journey-analysis/i);
    await expect(this.page).toHaveURL(new RegExp(`conversion-type=${this.conversionType}`));
    if (this.conversionType === 'brand') {
      await expect(this.page).not.toHaveURL(/conversion-type=sales/);
      await expect(this.page).toHaveTitle(/Brand Customer Journey Analysis/i);
    } else {
      await expect(this.page).not.toHaveURL(/conversion-type=brand/);
    }
    await expect(this.locators.pageTitle).toBeVisible({ timeout: 60000 });
    await expect(this.locators.pageTitle).toHaveText(
      /Business Insights\s*\/\s*Improve Traffic\s*\/\s*(?:Brand\s+)?Customer Journey Analysis/i
    );
    await this.page.waitForLoadState('domcontentloaded');
    await this.dismissBlockingDialogs();
    await expect(this.locators.campaignsToggle).toBeVisible({ timeout: 30000 });
    await expect
      .poll(async () => this.pageReadyScore(), { timeout: 120000 })
      .toBeGreaterThan(1);
    // Shell can be ready while Campaigns AJAX loader is still spinning.
    await this.waitForCampaignsDataSettled(90000).catch(() => undefined);
  }

  private async pageReadyScore(): Promise<number> {
    const campaigns = await this.locators.campaignsWrapper.isVisible().catch(() => false);
    const table = await this.locators.campaignsTable.isVisible().catch(() => false);
    const rows = await this.visibleDataRowCount(this.locators.campaignsTable).catch(() => 0);
    const tabs =
      Number(await this.locators.pathAnalyticsToggle.isVisible().catch(() => false)) +
      Number(await this.locators.pathFlowToggle.isVisible().catch(() => false));
    return Number(campaigns) + Number(table) + (rows > 0 ? 2 : 0) + tabs;
  }

  private async isCampaignsLoading(): Promise<boolean> {
    return this.page.evaluate(() => {
      const host =
        document.querySelector('#campaigns-table-wrapper') ||
        document.querySelector('#campaigns-wrapper') ||
        document.querySelector('#campaigns-table');
      if (!host) return false;
      const loaders = host.querySelectorAll(
        '.loading, .loader, [class*="loading"], .blockUI, .bt-loading, .gpu-loading, svg.loading-icon'
      );
      for (const el of Array.from(loaders)) {
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
        const box = el.getBoundingClientRect();
        if (box.width > 2 && box.height > 2) return true;
      }
      // Segmented GPU bar often has no "loading" class — detect short animated SVGs in empty tbody area.
      const tbody = document.querySelector('#campaigns-table tbody');
      const bodyText = (tbody?.textContent || '').replace(/\s+/g, ' ').trim();
      if (bodyText.length > 0) return false;
      const svgs = host.querySelectorAll('svg');
      for (const svg of Array.from(svgs)) {
        const box = svg.getBoundingClientRect();
        if (box.width > 20 && box.height > 8 && box.height < 80) return true;
      }
      return false;
    });
  }

  /**
   * Wait until Campaigns table has data rows or an explicit controlled empty message.
   * Does not treat a still-empty tbody as settled until timeout (AJAX may still be in flight).
   */
  async waitForCampaignsDataSettled(timeout = 90000): Promise<'data' | 'empty'> {
    await expect(this.locators.campaignsTable).toBeVisible({ timeout: 20000 });
    try {
      await expect
        .poll(
          async () => {
            const rows = await this.visibleDataRowCount(this.locators.campaignsTable);
            if (rows > 0) return 2;
            const hostText = (
              (await this.locators.campaignsWrapper.innerText().catch(() => '')) || ''
            ).replace(/\s+/g, ' ');
            if (/no data|no results|nothing to (show|display)|no campaigns/i.test(hostText)) return 1;
            return 0;
          },
          { timeout, intervals: [500, 1000, 2000, 3000] }
        )
        .toBeGreaterThan(0);
    } catch {
      // Bounded wait elapsed without rows/explicit empty — annotate as empty downstream.
    }
    const rows = await this.visibleDataRowCount(this.locators.campaignsTable);
    return rows > 0 ? 'data' : 'empty';
  }

  async captureContext(): Promise<CustomerJourneyContext> {
    const profile = getActiveProfile();
    return {
      siteName: profile.siteName,
      timePeriod: await this.badgeText(this.locators.timePeriodBadge),
      campaign: await this.badgeText(this.locators.campaignBadge),
      landingPage: await this.badgeText(this.locators.landingPageBadge),
      focalPage: await this.badgeText(this.locators.focalPageBadge),
      pathsMode: await this.badgeText(this.locators.pathsModeBadge),
      dataType: await this.badgeText(this.locators.dataTypeBadge),
      botTraffic: await this.badgeText(this.locators.botTrafficBadge),
      activeTab: await this.getActiveTab(),
    };
  }

  private async badgeText(badge: Locator): Promise<string> {
    const viaInner = ((await badge.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
    if (viaInner) return viaInner;
    const viaContent = ((await badge.textContent().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
    if (viaContent) return viaContent;
    return this.page.evaluate((el) => ((el && (el as HTMLElement).textContent) || '').replace(/\s+/g, ' ').trim(), await badge.elementHandle().catch(() => null));
  }

  async getActiveTab(): Promise<'campaigns' | 'path-analytics' | 'path-flow'> {
    if (await this.isTabActive(this.locators.pathAnalyticsToggle)) return 'path-analytics';
    if (await this.isTabActive(this.locators.pathFlowToggle)) return 'path-flow';
    return 'campaigns';
  }

  private async isTabActive(tab: Locator): Promise<boolean> {
    const cls = ((await tab.getAttribute('class').catch(() => '')) || '').toLowerCase();
    return /\bactive\b/.test(cls);
  }

  async expectDefaultContext(): Promise<void> {
    await expect(this.locators.campaignsToggle).toBeVisible();
    await expect(this.locators.pathAnalyticsToggle).toBeVisible();
    await expect(this.locators.pathFlowToggle).toBeVisible();
    await this.selectTab('campaigns');
    await expect(this.locators.campaignsWrapper).toBeVisible({ timeout: 20000 });
    await expect(this.locators.campaignsTable).toBeVisible({ timeout: 20000 });
  }

  /** Default load: Campaigns is active and All Campaigns table has live rows. */
  async expectDefaultCampaignsTabWithData(): Promise<{ rows: number }> {
    await expect(this.locators.campaignsToggle).toHaveClass(/active/i);
    await expect(this.locators.campaignsWrapper).toBeVisible({ timeout: 20000 });
    const settled = await this.waitForCampaignsDataSettled(90000);
    const rows = await this.visibleDataRowCount(this.locators.campaignsTable);
    if (settled === 'empty' || rows === 0) {
      throw new Error('Default Campaigns tab loaded without table data for current live filters');
    }
    expect(rows, 'Default Campaigns table should contain data rows').toBeGreaterThan(0);
    return { rows };
  }

  async expectQuickFilterBadges(): Promise<string[]> {
    // Some layouts keep the strip collapsed or use zero-height hosts; prefer attached text.
    const expand = this.page
      .locator('#performance-view-filter, #page-controls-toggle, button')
      .filter({ hasText: /View Filters|Show Filters|Hide Filters/i })
      .first();
    if (await expand.isVisible().catch(() => false)) {
      await expand.click({ timeout: 5000 }).catch(() => undefined);
      await this.page.waitForTimeout(500);
    }

    const badges = [
      this.locators.timePeriodBadge,
      this.locators.deviceBadge,
      this.locators.browserBadge,
      this.locators.campaignBadge,
      this.locators.landingPageBadge,
      this.locators.focalPageBadge,
      this.locators.pathsModeBadge,
      this.locators.botTrafficBadge,
      this.locators.dataTypeBadge,
      this.locators.osBadge,
      this.locators.visitorTypeBadge,
      this.locators.countryBadge,
    ];
    const texts: string[] = [];
    for (const badge of badges) {
      const attached = (await badge.count().catch(() => 0)) > 0;
      if (!attached) continue;
      const text = await this.badgeText(badge);
      if (text) texts.push(text);
    }
    expect(texts.length, 'Expected representative quick-filter badges').toBeGreaterThan(3);
    return texts;
  }

  async selectTab(tab: 'campaigns' | 'path-analytics' | 'path-flow'): Promise<void> {
    await this.dismissBlockingDialogs();
    const map = {
      campaigns: this.locators.campaignsToggle,
      'path-analytics': this.locators.pathAnalyticsToggle,
      'path-flow': this.locators.pathFlowToggle,
    } as const;
    const wrappers = {
      campaigns: this.locators.campaignsWrapper,
      'path-analytics': this.locators.pathAnalyticsWrapper,
      'path-flow': this.locators.pathFlowWrapper,
    } as const;
    await map[tab].click({ timeout: 10000, force: true });
    await expect.poll(async () => this.isTabActive(map[tab]), { timeout: 15000 }).toBeTruthy();
    await expect(wrappers[tab]).toBeVisible({ timeout: 20000 });
  }

  async expectOnlyWrapperVisible(tab: 'campaigns' | 'path-analytics' | 'path-flow'): Promise<void> {
    const visibility = {
      campaigns: await this.locators.campaignsWrapper.isVisible().catch(() => false),
      'path-analytics': await this.locators.pathAnalyticsWrapper.isVisible().catch(() => false),
      'path-flow': await this.locators.pathFlowWrapper.isVisible().catch(() => false),
    };
    expect(visibility[tab], `${tab} wrapper should be visible`).toBeTruthy();
    for (const [key, visible] of Object.entries(visibility)) {
      if (key !== tab) expect(visible, `${key} should hide when ${tab} is active`).toBeFalsy();
    }
  }

  async getTableHeaders(table: Locator): Promise<string[]> {
    return (await table.locator('thead th').allTextContents())
      .map((t) => t.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
  }

  async visibleDataRowCount(table: Locator): Promise<number> {
    // Prefer attached body rows with cell text; visibility can be false while strip/layout settles.
    return table.evaluate((el) => {
      const bodyRows = Array.from(el.querySelectorAll('tbody tr'));
      const fallbackRows =
        bodyRows.length > 0
          ? bodyRows
          : Array.from(el.querySelectorAll('tr')).filter((tr) => !tr.closest('thead'));
      return fallbackRows.filter((tr) => {
        const text = (tr.textContent || '').replace(/\s+/g, ' ').trim();
        if (!text) return false;
        if (/no data|no results|nothing to/i.test(text) && tr.querySelectorAll('td').length <= 1) return false;
        return tr.querySelectorAll('td').length > 0;
      }).length;
    });
  }

  async tableSignature(table: Locator): Promise<string> {
    const headers = (await this.getTableHeaders(table)).join('|');
    const first = ((await table.locator('tbody tr').first().innerText().catch(() => '')) || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 160);
    const rows = await this.visibleDataRowCount(table);
    return `${headers}::${rows}::${first}`;
  }

  async expectCampaignsTableHeaders(): Promise<string[]> {
    await this.selectTab('campaigns');
    const headers = await this.getTableHeaders(this.locators.campaignsTable);
    const joined = headers.join(' ');
    expect(joined).toMatch(/Campaigns/i);
    expect(joined).toMatch(/Journey Sessions|Sessions/i);
    expect(joined).toMatch(/Journey Page Views|Page Views/i);
    expect(joined).toMatch(/Bounce Rate/i);
    expect(joined).toMatch(/Exit Rate/i);
    expect(joined).toMatch(/Onload|Avg Onload/i);
    expect(joined).toMatch(/Orders/i);
    expect(joined).toMatch(/Conversion Rate/i);
    expect(joined, `Currency column for ${this.conversionType}`).toMatch(this.currencyHeaderRegex);
    if (this.conversionType === 'brand') {
      expect(joined, 'Brand CJA should not use Revenue ($) as terminal currency column').not.toMatch(
        /Revenue\s*\(\$\)/i
      );
    }
    return headers;
  }

  async expectCampaignSpecialRowsOrData(): Promise<{
    hasAllTraffic: boolean;
    hasNoCampaign: boolean;
    rows: number;
    settled: 'data' | 'empty';
  }> {
    await this.selectTab('campaigns');
    const settled = await this.waitForCampaignsDataSettled(90000);
    const body = ((await this.locators.campaignsTable.locator('tbody').innerText().catch(() => '')) || '').replace(
      /\s+/g,
      ' '
    );
    const rows = await this.visibleDataRowCount(this.locators.campaignsTable);
    if (settled === 'data') {
      expect(rows, 'Campaigns table should have data rows after load').toBeGreaterThan(0);
    } else {
      expect(
        rows === 0 || /no data|no results|nothing to/i.test(body),
        'Campaigns empty state should be controlled (no rows / no-data copy)'
      ).toBeTruthy();
    }
    return {
      hasAllTraffic: /\(All Traffic\)/i.test(body),
      hasNoCampaign: /\(No Campaign Assigned\)/i.test(body),
      rows,
      settled,
    };
  }

  async sortCampaignsColumn(headerRegex: RegExp): Promise<{ before: string; after: string }> {
    await this.selectTab('campaigns');
    const before = await this.tableSignature(this.locators.campaignsTable);
    const header = this.locators.campaignsTable.locator('thead th').filter({ hasText: headerRegex }).first();
    await expect(header).toBeVisible({ timeout: 10000 });
    await header.click({ timeout: 5000 });
    await this.page.waitForTimeout(800);
    let after = await this.tableSignature(this.locators.campaignsTable);
    if (after === before) {
      await header.click({ timeout: 5000 });
      await this.page.waitForTimeout(800);
      after = await this.tableSignature(this.locators.campaignsTable);
    }
    return { before, after };
  }

  async searchCampaigns(term: string): Promise<number> {
    const search = this.locators.campaignsWrapper.locator('#table-search, input[type="search"]').first();
    if (!(await search.isVisible().catch(() => false))) {
      const global = this.locators.tableSearch;
      if (!(await global.isVisible().catch(() => false))) return -1;
      await global.fill(term);
    } else {
      await search.fill(term);
    }
    await this.page.waitForTimeout(700);
    return this.visibleDataRowCount(this.locators.campaignsTable);
  }

  async clearCampaignsSearch(): Promise<void> {
    const search = this.locators.campaignsWrapper
      .locator('#table-search, input[type="search"]')
      .first()
      .or(this.locators.tableSearch);
    if (await search.isVisible().catch(() => false)) {
      await search.fill('');
      await this.page.waitForTimeout(500);
    }
  }

  async clickFirstDataCampaignRow(): Promise<string> {
    await this.selectTab('campaigns');
    await this.waitForCampaignsDataSettled(60000).catch(() => undefined);
    const rows = this.locators.campaignsTable.locator('tbody tr');
    const count = await rows.count();
    for (let i = 0; i < Math.min(count, 30); i++) {
      const row = rows.nth(i);
      const text = ((await row.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
      if (!text || /\(All Traffic\)/i.test(text)) continue;
      await row.click({ timeout: 5000, force: true });
      await this.page.waitForTimeout(2000);
      return text.slice(0, 160);
    }
    // fallback: first row with text
    const first = rows.first();
    const text = ((await first.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
    await first.click({ timeout: 5000, force: true });
    await this.page.waitForTimeout(2000);
    return text.slice(0, 160);
  }

  /**
   * Expand a Campaigns URL/name cell (dropdown-arrow), then click a landing-page detail row.
   * Expected handoff: Path Analytics with Hierarchy Ladder + Journey Details.
   */
  async expandCampaignUrlAndOpenLandingDetail(): Promise<{ campaign: string; landing: string }> {
    await this.selectTab('campaigns');
    await this.dismissBlockingDialogs();
    await this.clearCampaignsSearch().catch(() => undefined);
    await this.waitForCampaignsDataSettled(90000);

    // Prefer rows that expose the Campaigns-column dropdown arrow (URL expand control).
    const expandableNameCells = this.page.locator(
      '#campaigns-table tbody tr.campaign-row.parent td.text-left:has(svg.dropdown-arrow)'
    );
    const candidateCount = await expandableNameCells.count();
    expect(candidateCount, 'Expected Campaigns URL rows with dropdown expand control').toBeGreaterThan(0);

    let campaign = '';
    let expanded = false;
    const attempts = Math.min(candidateCount, 6);
    for (let i = 0; i < attempts; i++) {
      const nameCell = expandableNameCells.nth(i);
      const rowText = ((await nameCell.locator('xpath=ancestor::tr[1]').innerText().catch(() => '')) || '')
        .replace(/\s+/g, ' ')
        .trim();
      if (/\(All Traffic\)/i.test(rowText)) continue;

      // Collapse any previously expanded parent so child rows are unambiguous.
      const alreadyActive = await nameCell
        .locator('xpath=ancestor::tr[contains(@class,"active")]')
        .count()
        .catch(() => 0);
      if (alreadyActive) {
        await nameCell.click({ timeout: 5000, force: true }).catch(() => undefined);
        await this.page.waitForTimeout(400);
      }

      await nameCell.scrollIntoViewIfNeeded().catch(() => undefined);
      const arrow = nameCell.locator('svg.dropdown-arrow').first();
      if ((await arrow.count()) > 0) {
        await arrow.click({ timeout: 5000, force: true }).catch(async () => {
          await nameCell.click({ timeout: 8000, force: true });
        });
      } else {
        await nameCell.click({ timeout: 8000, force: true });
      }

      try {
        await expect
          .poll(async () => this.locators.campaignLandingDetailRows.count(), {
            timeout: 12000,
            intervals: [300, 600, 1000],
          })
          .toBeGreaterThan(0);
        campaign = rowText.slice(0, 160) || ((await nameCell.innerText()) || '').trim().slice(0, 160);
        expanded = true;
        break;
      } catch {
        // try next expandable URL
      }
    }
    expect(expanded, 'Expected an expandable Campaigns URL/name with landing-page details').toBeTruthy();

    const landingRow = this.locators.campaignLandingDetailRows.first();
    await expect(landingRow).toBeVisible({ timeout: 15000 });
    const landing = ((await landingRow.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim().slice(0, 160);
    expect(landing.length, 'Landing detail row should have text').toBeGreaterThan(0);
    await landingRow.click({ timeout: 8000, force: true });

    await expect.poll(async () => this.getActiveTab(), { timeout: 45000 }).toBe('path-analytics');
    await expect(this.locators.pathAnalyticsWrapper).toBeVisible({ timeout: 20000 });
    await this.expectPathAnalyticsHierarchyAndJourneyData();
    return { campaign, landing };
  }

  async expectPathAnalyticsHierarchyAndJourneyData(): Promise<{
    overviewRows: number;
    pathsRows: number;
    pagesRows: number;
  }> {
    await expect(this.locators.pathAnalyticsWrapper).toBeVisible({ timeout: 20000 });
    await expect(this.locators.pathAnalyticsOverviewTable).toBeVisible({ timeout: 20000 });

    await expect
      .poll(async () => this.visibleDataRowCount(this.locators.pathAnalyticsOverviewTable), {
        timeout: 60000,
        intervals: [500, 1000, 2000],
      })
      .toBeGreaterThan(0);

    const overviewRows = await this.visibleDataRowCount(this.locators.pathAnalyticsOverviewTable);
    expect(overviewRows, 'Hierarchy Ladder / overview should have metric rows').toBeGreaterThan(0);

    // Journey Details — Paths
    await this.togglePathsPages('paths');
    await expect
      .poll(async () => this.visibleDataRowCount(this.locators.pathsTable), {
        timeout: 60000,
        intervals: [500, 1000, 2000],
      })
      .toBeGreaterThan(0);
    const pathsRows = await this.visibleDataRowCount(this.locators.pathsTable);
    expect(pathsRows, 'Journey Details Paths table should have data').toBeGreaterThan(0);

    // Journey Details — Pages
    await this.togglePathsPages('pages');
    await expect
      .poll(async () => this.visibleDataRowCount(this.locators.pathAnalyticsTable), {
        timeout: 60000,
        intervals: [500, 1000, 2000],
      })
      .toBeGreaterThan(0);
    const pagesRows = await this.visibleDataRowCount(this.locators.pathAnalyticsTable);
    expect(pagesRows, 'Journey Details Pages table should have data').toBeGreaterThan(0);

    return { overviewRows, pathsRows, pagesRows };
  }

  async expectJourneyDetailsPathsAndPagesHaveData(): Promise<{ pathsRows: number; pagesRows: number }> {
    await this.openPathAnalytics();
    await this.togglePathsPages('paths');
    await expect(this.locators.pathsBtn).toBeVisible();
    await expect(this.locators.pagesBtn).toBeVisible();
    await expect
      .poll(async () => this.visibleDataRowCount(this.locators.pathsTable), { timeout: 60000 })
      .toBeGreaterThan(0);
    const pathsRows = await this.visibleDataRowCount(this.locators.pathsTable);

    await this.togglePathsPages('pages');
    await expect
      .poll(async () => this.visibleDataRowCount(this.locators.pathAnalyticsTable), { timeout: 60000 })
      .toBeGreaterThan(0);
    const pagesRows = await this.visibleDataRowCount(this.locators.pathAnalyticsTable);
    return { pathsRows, pagesRows };
  }

  /**
   * Path Flow is the last primary tab. Landing Page cards sit in the left-most column;
   * when that landing card has data, subsequent step columns should also carry page cards.
   */
  async expectPathFlowLandingAndStepCards(): Promise<{
    isLastTab: boolean;
    landingCards: number;
    stepColumnsWithData: number;
    landingSample: string;
  }> {
    const tabOrder = await this.page.evaluate(() =>
      Array.from(
        document.querySelectorAll('#campaigns-toggle, #path-analytics-toggle, #path-flow-toggle')
      ).map((el) => el.id)
    );
    const isLastTab = tabOrder[tabOrder.length - 1] === 'path-flow-toggle';
    expect(isLastTab, 'Path Flow should be the last primary tab').toBeTruthy();

    await this.openPathFlow();
    if (await this.locators.landingPageViewBtn.isVisible().catch(() => false)) {
      await this.locators.landingPageViewBtn.click({ timeout: 5000 }).catch(() => undefined);
      await this.page.waitForTimeout(1000);
    }

    await expect
      .poll(
        async () => {
          const landing = await this.locators.pathFlowLandingCards.count().catch(() => 0);
          const any = await this.locators.pathFlowPageCards.count().catch(() => 0);
          return Math.max(landing, any);
        },
        { timeout: 60000, intervals: [500, 1000, 2000] }
      )
      .toBeGreaterThan(0);

    const summary = await this.page.evaluate(() => {
      const host =
        (document.querySelector('#landing-page-path-flow') as HTMLElement | null) ||
        (document.querySelector('#path-flow-wrapper') as HTMLElement | null);
      if (!host) return { landingCards: 0, stepColumnsWithData: 0, landingSample: '', columns: 0 };

      const cardLabel = (card: Element): string => {
        const preferred = card.querySelector(
          '.page-name, .card-title, .title, [class*="page-name"], [class*="card-title"], .url'
        );
        let text = (preferred?.textContent || '').replace(/\s+/g, ' ').trim();
        if (!text) {
          text = ((card as HTMLElement).innerText || '').replace(/\s+/g, ' ').trim();
        }
        text = text
          .replace(/Blue Triangle.*?(?=https?:|\w|$)/gi, ' ')
          .replace(/Bounce & Exit Analysis|Revenue Calculator|Performance Details.*?\)/gi, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        // Prefer first URL-like or alphanumeric token chunk
        const url = text.match(/https?:\/\/\S+/);
        if (url) return url[0].slice(0, 120);
        return text.slice(0, 120);
      };

      const landingCards = Array.from(host.querySelectorAll('.page-card.landingCard'));
      const landingWithData = landingCards
        .map((c) => ({ el: c, label: cardLabel(c), box: c.getBoundingClientRect() }))
        .filter((c) => c.label.length > 0 && c.box.width > 40 && c.box.height > 30)
        .sort((a, b) => a.box.x - b.box.x || a.box.y - b.box.y);

      const landingSample = landingWithData[0]?.label || '';
      const landingHasData = landingWithData.length > 0;

      const columns = Array.from(host.querySelectorAll('.column'));
      // Left-most column = Landing; subsequent columns = Step 2+
      const sortedCols = columns
        .map((col) => ({ el: col, box: col.getBoundingClientRect() }))
        .filter((c) => c.box.width > 40)
        .sort((a, b) => a.box.x - b.box.x);

      let stepColumnsWithData = 0;
      for (let i = 1; i < sortedCols.length; i++) {
        const cards = Array.from(sortedCols[i].el.querySelectorAll('.page-card'))
          .map((c) => cardLabel(c))
          .filter((t) => t.length > 0);
        if (cards.length > 0) stepColumnsWithData++;
      }

      return {
        landingCards: landingWithData.length || landingCards.length,
        stepColumnsWithData: landingHasData ? stepColumnsWithData : 0,
        landingSample,
        columns: sortedCols.length,
        landingHasData,
      };
    });

    expect(summary.landingCards, 'Path Flow should show Landing Page card(s)').toBeGreaterThan(0);
    if (summary.landingSample) {
      expect(
        summary.stepColumnsWithData,
        'When Landing Page card has data, consecutive Step columns should show page cards'
      ).toBeGreaterThan(0);
    }

    return {
      isLastTab,
      landingCards: summary.landingCards,
      stepColumnsWithData: summary.stepColumnsWithData,
      landingSample: summary.landingSample,
    };
  }

  async expectExportOptionsPresent(): Promise<string[]> {
    const found: string[] = [];
    const exportBtn = this.page.locator('button, a').filter({ hasText: /^Export$/i }).first();
    if (await exportBtn.isVisible().catch(() => false)) {
      await exportBtn.click({ timeout: 5000 }).catch(() => undefined);
      await this.page.waitForTimeout(400);
    }
    if (await this.page.getByText(/^CSV$/i).first().isVisible().catch(() => false)) found.push('CSV');
    if (await this.page.getByText(/^TSV$/i).first().isVisible().catch(() => false)) found.push('TSV');
    if (await this.page.getByText(/^JSON$/i).first().isVisible().catch(() => false)) found.push('JSON');
    if (await this.page.getByText(/^Array$/i).first().isVisible().catch(() => false)) found.push('Array');
    await this.page.keyboard.press('Escape').catch(() => undefined);
    return found;
  }

  async openPathAnalytics(): Promise<void> {
    await this.selectTab('path-analytics');
    await expect(this.locators.pathAnalyticsWrapper).toBeVisible({ timeout: 20000 });
  }

  async expectHierarchyOrOverview(): Promise<{ overviewHeaders: string[]; hasTopX: boolean }> {
    await this.openPathAnalytics();
    const overviewHeaders = await this.getTableHeaders(this.locators.pathAnalyticsOverviewTable);
    const joined = overviewHeaders.join(' ');
    expect(joined).toMatch(/Journey Sessions|Sessions/i);
    expect(joined).toMatch(/Orders|Conversion/i);
    expect(joined, `Overview currency for ${this.conversionType}`).toMatch(this.currencyHeaderRegex);
    if (this.conversionType === 'brand') {
      expect(joined).not.toMatch(/Revenue\s*\(\$\)/i);
    }
    const hasTopX =
      (await this.locators.topXPathsRow.isVisible().catch(() => false)) ||
      (await this.locators.topXPathsEntrances.isVisible().catch(() => false)) ||
      (await this.locators.allPathsRow.isVisible().catch(() => false));
    return { overviewHeaders, hasTopX };
  }

  async togglePathsPages(mode: 'paths' | 'pages'): Promise<void> {
    await this.openPathAnalytics();
    if (mode === 'paths') {
      await this.locators.pathsBtn.click({ timeout: 8000 });
      await expect.poll(async () => this.isTabActive(this.locators.pathsBtn), { timeout: 10000 }).toBeTruthy();
      await expect(this.locators.pathsTable).toBeVisible({ timeout: 15000 });
    } else {
      await this.locators.pagesBtn.click({ timeout: 8000 });
      await expect.poll(async () => this.isTabActive(this.locators.pagesBtn), { timeout: 10000 }).toBeTruthy();
      await expect(this.locators.pathAnalyticsTable).toBeVisible({ timeout: 15000 });
    }
  }

  async expectPathsTableHeaders(): Promise<string[]> {
    await this.togglePathsPages('paths');
    const headers = await this.getTableHeaders(this.locators.pathsTable);
    const joined = headers.join(' ');
    expect(joined).toMatch(/Paths/i);
    expect(joined).toMatch(/Path Rank/i);
    expect(joined).toMatch(/Landing Page/i);
    expect(joined, `Paths currency for ${this.conversionType}`).toMatch(this.currencyHeaderRegex);
    if (this.conversionType === 'brand') {
      expect(joined).not.toMatch(/Revenue\s*\(\$\)/i);
    }
    return headers;
  }

  async expectPagesTableHeaders(): Promise<string[]> {
    await this.togglePathsPages('pages');
    const headers = await this.getTableHeaders(this.locators.pathAnalyticsTable);
    const joined = headers.join(' ');
    expect(joined).toMatch(/Pages in Journey|Pages/i);
    expect(joined).toMatch(/Journey Sessions|Sessions/i);
    expect(joined, `Pages currency for ${this.conversionType}`).toMatch(this.currencyHeaderRegex);
    if (this.conversionType === 'brand') {
      expect(joined).not.toMatch(/Revenue\s*\(\$\)/i);
    }
    return headers;
  }

  async clickFirstPathRow(): Promise<string> {
    await this.togglePathsPages('paths');
    const row = this.locators.pathsTable.locator('tbody tr').first();
    await expect(row).toBeVisible({ timeout: 15000 });
    const text = ((await row.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
    await row.click({ timeout: 5000 });
    await this.page.waitForTimeout(1500);
    return text.slice(0, 160);
  }

  async openPathFlow(): Promise<void> {
    await this.selectTab('path-flow');
    await expect(this.locators.pathFlowWrapper).toBeVisible({ timeout: 20000 });
  }

  async expectLandingPageView(): Promise<void> {
    await this.openPathFlow();
    if (await this.locators.landingPageViewBtn.isVisible().catch(() => false)) {
      await this.locators.landingPageViewBtn.click({ timeout: 5000 }).catch(() => undefined);
      await this.page.waitForTimeout(1000);
    }
    const landingVisible = await this.locators.landingPagePathFlow.isVisible().catch(() => false);
    const flowVisible = await this.locators.pathFlowRoot.isVisible().catch(() => false);
    expect(landingVisible || flowVisible, 'Landing Page Path Flow should be visible').toBeTruthy();
  }

  async switchToFocalPageView(): Promise<void> {
    await this.openPathFlow();
    await expect(this.locators.focalPageToggle).toBeVisible({ timeout: 10000 });
    await this.locators.focalPageToggle.click({ timeout: 8000 });
    await expect
      .poll(async () => this.isTabActive(this.locators.focalPageToggle), { timeout: 10000 })
      .toBeTruthy();
    await expect(this.locators.focalPagePathFlow).toBeVisible({ timeout: 20000 });
  }

  async switchToLandingPageView(): Promise<void> {
    await this.openPathFlow();
    if (await this.locators.landingPageViewBtn.isVisible().catch(() => false)) {
      await this.locators.landingPageViewBtn.click({ timeout: 8000 });
    } else if (await this.isTabActive(this.locators.focalPageToggle)) {
      await this.locators.focalPageToggle.click({ timeout: 8000 });
    }
    await this.page.waitForTimeout(1000);
    await expect(this.locators.landingPagePathFlow.or(this.locators.pathFlowRoot)).toBeVisible({
      timeout: 20000,
    });
  }

  async pathFlowSignature(): Promise<string> {
    return this.page.evaluate(() => {
      const host =
        document.querySelector('#focal-page-path-flow:not([style*="display: none"])') ||
        document.querySelector('#landing-page-path-flow') ||
        document.querySelector('#path-flow-wrapper');
      if (!host) return 'missing';
      const text = (host.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 240);
      const svgs = host.querySelectorAll('svg').length;
      const cards = host.querySelectorAll('[class*=card], [class*=node], [class*=page]').length;
      return `${svgs}|${cards}|${text}`;
    });
  }

  async clickRepresentativePathFlowCard(): Promise<boolean> {
    await this.openPathFlow();
    const candidates = this.locators.pathFlowWrapper
      .locator('[class*=card], [class*=node], text, tspan, .page-name, [data-page], div')
      .filter({ hasText: /[A-Za-z]{2,}/ });
    const count = await candidates.count();
    for (let i = 0; i < Math.min(count, 20); i++) {
      const el = candidates.nth(i);
      if (!(await el.isVisible().catch(() => false))) continue;
      const box = await el.boundingBox().catch(() => null);
      if (!box || box.width < 4 || box.height < 4) continue;
      await el.click({ timeout: 3000, force: true }).catch(() => undefined);
      await this.page.waitForTimeout(800);
      return true;
    }
    return false;
  }

  async openFilters(): Promise<void> {
    await this.locators.toggleFilters.click({ timeout: 10000 });
    await this.page.waitForTimeout(800);
  }

  async closeFilters(): Promise<void> {
    if (await this.locators.cancelFilters.isVisible().catch(() => false)) {
      await this.locators.cancelFilters.click({ timeout: 5000 }).catch(() => undefined);
    } else {
      await this.page.keyboard.press('Escape').catch(() => undefined);
    }
    await this.page.waitForTimeout(400);
  }

  async expectFiltersLabelsSample(): Promise<string[]> {
    await this.openFilters();
    const labels = (
      await this.page.locator('label, .control-label').allTextContents()
    )
      .map((t) => t.replace(/\s+/g, ' ').trim())
      .filter((t) => t && t.length < 90);
    const unique = [...new Set(labels)];
    const joined = unique.join(' | ');
    expect(joined).toMatch(/Time Period|Campaign|Landing Page|Focal Page|Bot Traffic|Real User Data Type/i);
    return unique.slice(0, 40);
  }

  async applyTimePeriod(label: string | RegExp): Promise<void> {
    await this.openFilters();
    const period = this.page
      .locator('#time-period, select[name*=time], .time-period, button, a, label, .radio, .checkbox')
      .filter({ hasText: label })
      .first();
    if (await period.isVisible().catch(() => false)) {
      await period.click({ timeout: 8000 });
    } else {
      // try select2 / badge quick filter
      await this.locators.timePeriodBadge.click({ timeout: 5000 }).catch(() => undefined);
      await this.page.waitForTimeout(400);
      const opt = this.page.locator('.select2-results__option, button, a, li').filter({ hasText: label }).first();
      await opt.click({ timeout: 8000 });
    }
    if (await this.locators.applyFilters.isVisible().catch(() => false)) {
      await this.locators.applyFilters.click({ timeout: 8000 });
    }
    await this.page.waitForTimeout(2500);
    await expect(this.locators.pageTitle).toBeVisible();
  }

  async applySampleCampaignOrLandingFilter(): Promise<string> {
    await this.openFilters();
    const campaign = this.page.locator('#campaign, #campaign-name, #select2-campaign-container').first();
    if (await campaign.isVisible().catch(() => false)) {
      await campaign.click({ timeout: 5000 }).catch(() => undefined);
      await this.page.waitForTimeout(400);
      const opt = this.page.locator('.select2-results__option').filter({ hasText: /.+/ }).nth(1);
      if (await opt.isVisible().catch(() => false)) {
        const text = ((await opt.innerText().catch(() => '')) || '').trim();
        await opt.click();
        if (await this.locators.applyFilters.isVisible().catch(() => false)) {
          await this.locators.applyFilters.click();
        }
        await this.page.waitForTimeout(2000);
        return text || 'campaign-option';
      }
    }
    // fallback: use campaign badge quick filter
    await this.closeFilters().catch(() => undefined);
    await this.locators.campaignBadge.click({ timeout: 5000 });
    await this.page.waitForTimeout(400);
    const badgeOpt = this.page.locator('.select2-results__option, .dropdown-menu a, li').filter({ hasText: /.+/ }).nth(1);
    const text = ((await badgeOpt.innerText().catch(() => '')) || '').trim();
    if (await badgeOpt.isVisible().catch(() => false)) await badgeOpt.click();
    await this.page.waitForTimeout(2000);
    return text || 'campaign-badge';
  }

  async sampleNativeIndicators(): Promise<{ count: number; sampleTitle: string }> {
    await this.openPathFlow();
    const indicators = this.page.locator(
      '[title*="Native" i], [data-original-title*="Native" i], [class*="native" i], [class*="webview" i]'
    );
    const count = await indicators.count();
    let sampleTitle = '';
    if (count > 0) {
      const first = indicators.first();
      sampleTitle =
        (await first.getAttribute('data-original-title').catch(() => null)) ||
        (await first.getAttribute('title').catch(() => null)) ||
        ((await first.innerText().catch(() => '')) || '');
      await first.hover({ timeout: 3000 }).catch(() => undefined);
    }
    return { count, sampleTitle: sampleTitle.replace(/\s+/g, ' ').trim().slice(0, 160) };
  }

  async restoreTab(tab: CustomerJourneyContext['activeTab']): Promise<void> {
    await this.selectTab(tab);
  }

  async expectNoBlockingOverlay(): Promise<void> {
    await expect(this.locators.pageTitle).toBeVisible();
    const blocking = this.page.locator('.modal-backdrop.in, .modal.in, .blockUI');
    const count = await blocking.count();
    for (let i = 0; i < count; i++) {
      const el = blocking.nth(i);
      if (await el.isVisible().catch(() => false)) {
        await this.page.keyboard.press('Escape').catch(() => undefined);
        await this.page.waitForTimeout(300);
      }
    }
  }
}
