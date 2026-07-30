import { Page, expect, Locator } from '@playwright/test';
import { RumSessionLookupLocators } from '../locators/RumSessionLookupLocators';
import { LeftNavPage } from './LeftNavPage';
import { SiteDropdownPage } from './SiteDropdownPage';
import { ensurePortalSession, currentSiteId, portalBase } from '../helpers/portalSession';

const PAGE_DEF = {
  id: 'rum.session-lookup',
  module: 'rum',
  menuLabel: 'Session Lookup',
  route: 'real-user-monitoring/session-lookup-performance-detail',
  titleIncludes: /Session Lookup/i,
};

const PD_PAGE_DEF = {
  id: 'rum.performance-detail',
  module: 'rum',
  menuLabel: 'Performance Detail',
  route: 'real-user-monitoring/performance-detail',
  titleIncludes: /Performance Detail/i,
};

/**
 * Session Lookup (RUM Browser) — read-only interactions.
 * Does not Save Filter, clear cache, create segments, or mutate portal config.
 * Do not hard-code session IDs/GUIDs/URLs — derive at runtime when needed.
 */
export class RumSessionLookupPage {
  readonly locators: RumSessionLookupLocators;

  /** Runtime-derived lookup values shared across the serial suite. */
  runtimeLookupUrl = '';
  runtimePageName = '';
  runtimeSessionId = '';
  runtimeGuid = '';
  runtimeCustomerSessionId = '';
  runtimeUserAgent = '';
  runtimeIpAddress = '';
  hasPositiveLookup = false;

  constructor(private readonly page: Page) {
    this.locators = new RumSessionLookupLocators(page);
  }

  async openViaNavigation(): Promise<void> {
    await ensurePortalSession(this.page);
    await new SiteDropdownPage(this.page).ensureProfileSite();
    await new LeftNavPage(this.page).openSmokePage(PAGE_DEF);
    await this.waitForPageReady();
  }

  async openPerformanceDetail(): Promise<void> {
    await ensurePortalSession(this.page);
    await new SiteDropdownPage(this.page).ensureProfileSite();
    await new LeftNavPage(this.page).openSmokePage(PD_PAGE_DEF);
    await expect(this.page).toHaveURL(/performance-detail/i);
    await expect(this.page.locator('#page-title')).toHaveText(/Performance Detail/i, {
      timeout: 60000,
    });
    await this.page.waitForTimeout(8000);
  }

  async waitForPageReady(): Promise<void> {
    await expect(this.page).not.toHaveURL(/site\/login|site%2Flogin/i);
    await expect(this.page).toHaveURL(/session-lookup-performance-detail/i);
    await expect(this.locators.pageTitle).toBeVisible({ timeout: 60000 });
    await expect(this.locators.pageTitle).toHaveText(/Session Lookup/i);
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.locators.lookupDropdown).toBeVisible({ timeout: 45000 });
    await expect(this.locators.lookupInput).toBeVisible({ timeout: 15000 });
  }

  async expectDefaultEmptyOrReadyState(): Promise<void> {
    await expect(this.locators.lookupDropdown).toBeEnabled();
    await expect(this.locators.lookupInput).toBeEnabled();
    await expect(this.locators.displayedMetricSelect).toBeVisible({ timeout: 20000 });
    await expect(this.locators.allPageViewsHeading()).toBeVisible({ timeout: 20000 });
    await expect(this.locators.sessionLookupGraphToggle).toBeVisible();
    await expect(this.locators.sessionLookupTableToggle).toBeVisible();
  }

  async expectChromeControls(): Promise<void> {
    await expect(this.locators.performanceDetailButton).toBeVisible({ timeout: 15000 });
    await expect(this.locators.viewFiltersButton).toBeVisible();
    await expect(this.locators.filtersToggle).toBeVisible();
    for (const control of [
      this.locators.themeToggle,
      this.locators.helpToggle,
      this.locators.settingsToggle,
      this.locators.userToggle,
    ]) {
      await expect(control).toBeVisible({ timeout: 10000 });
    }
  }

  async toggleViewFiltersBanner(): Promise<'shown' | 'hidden'> {
    const btn = this.locators.viewFiltersButton;
    await expect(btn).toBeVisible({ timeout: 15000 });
    const wasVisible = await this.locators.viewFiltersBanner.isVisible().catch(() => false);
    await btn.click({ force: true });
    await this.page.waitForTimeout(700);
    const isVisible = await this.locators.viewFiltersBanner.isVisible().catch(() => false);
    const label = ((await btn.textContent()) || '').replace(/\s+/g, ' ').trim();
    if (isVisible && !wasVisible) {
      expect(label).toMatch(/Hide Filters/i);
      return 'shown';
    }
    if (!isVisible && wasVisible) {
      expect(label).toMatch(/View Filters/i);
      return 'hidden';
    }
    return /Hide Filters/i.test(label) ? 'shown' : 'hidden';
  }

  async getLookupOptions(): Promise<string[]> {
    const options = await this.locators.lookupDropdown.locator('option').allTextContents();
    return options.map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean);
  }

  async expectStableLookupOptions(): Promise<{ hasIp: boolean; options: string[] }> {
    const options = await this.getLookupOptions();
    for (const required of [
      /BTT Session ID/i,
      /BTT GUID/i,
      /Customer Session ID/i,
      /^URL$/i,
      /User Agent String/i,
    ]) {
      expect(
        options.some((o) => required.test(o)),
        `Expected lookup option matching ${required}`
      ).toBeTruthy();
    }
    const hasIp = options.some((o) => /IP Address/i.test(o));
    const blanks = options.filter((o) => !o.trim());
    expect(blanks.length, 'Lookup options should not be blank').toBe(0);
    return { hasIp, options };
  }

  async selectLookupType(label: string | RegExp): Promise<void> {
    await expect(this.locators.lookupDropdown).toBeVisible({ timeout: 15000 });
    const options = await this.getLookupOptions();
    const match =
      typeof label === 'string'
        ? options.find((o) => o.toLowerCase() === label.toLowerCase()) ||
          options.find((o) => o.toLowerCase().includes(label.toLowerCase()))
        : options.find((o) => label.test(o));
    expect(match, `Lookup type ${label}`).toBeTruthy();
    await this.locators.lookupDropdown.selectOption({ label: match! });
    await this.page.waitForTimeout(300);
  }

  async performLookup(type: string | RegExp, value: string): Promise<void> {
    await this.selectLookupType(type);
    await this.locators.lookupInput.fill(value);
    // The live Session Lookup chevron is an <i> element and does not
    // consistently submit. Enter is the reliable supported form action.
    await this.locators.lookupInput.press('Enter');
    await this.page.waitForTimeout(6000);
  }

  async expectLookupControlsEnabled(): Promise<void> {
    await expect(this.locators.lookupDropdown).toBeEnabled();
    await expect(this.locators.lookupInput).toBeEnabled();
  }

  /**
   * Derive a non-sensitive URL from Performance Detail Page Views → Measurement Details.
   * Stores runtime values on the page object for subsequent Session Lookup tests.
   */
  async deriveRuntimeLookupFromPerformanceDetail(): Promise<{
    url: string;
    pageName: string;
    sessionId: string;
    guid: string;
    customerSessionId: string;
    userAgent: string;
    ipAddress: string;
  }> {
    await this.openPerformanceDetail();

    const pageViewsHost = this.page.locator('.highcharts-container').filter({
      has: this.page.locator('.highcharts-title', { hasText: /^Page Views$/i }),
    });
    let points = pageViewsHost.first().locator('.highcharts-point');
    if ((await points.count()) === 0) {
      points = this.page.locator(
        '#page-views-scatter-plot-graph .highcharts-point, #page-volume-graph .highcharts-point'
      );
    }
    const count = await points.count();
    if (count === 0) {
      return {
        url: '',
        pageName: '',
        sessionId: '',
        guid: '',
        customerSessionId: '',
        userAgent: '',
        ipAddress: '',
      };
    }
    await points.first().click({ force: true });
    await this.page.waitForTimeout(5000);

    const details = this.page.locator('#table-for-performance-breakdown-table').first();
    await expect(details).toBeVisible({ timeout: 30000 });

    const bodyText = ((await details.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
    const urlMatch =
      bodyText.match(/https?:\/\/[^\s]+/i) ||
      (
        await this.page
          .locator('#table-for-performance-breakdown-table a[href^="http"]')
          .first()
          .getAttribute('href')
          .catch(() => null)
      );
    const url =
      typeof urlMatch === 'string'
        ? urlMatch
        : Array.isArray(urlMatch)
          ? urlMatch[0]
          : ((await this.page.locator('#url, #url_link_top a, a[href^="http"]').first().textContent()) ||
              '')
              .replace(/\s+/g, ' ')
              .trim();

    const pageNameMatch = bodyText.match(/Page Name\s+([A-Za-z0-9_./-]{1,80}?)(?:\s+Data Originated|\s+Browser|\s+Country|\s+BTT|\s*$)/i);
    const pageName = (pageNameMatch?.[1] || '').trim();

    const sessionId = await this.readMeasurementDetailValue(/BTT Session ID/i);
    const guid = await this.readMeasurementDetailValue(/BTT GUID/i);
    const customerSessionId = await this.readMeasurementDetailValue(/Customer Session ID/i);
    const userAgent = await this.readMeasurementDetailValue(/User Agent String|UserAgent/i);
    const ipAddress = await this.readMeasurementDetailValue(/IP Address/i);

    this.runtimeLookupUrl = (url || '').split(/\s/)[0].replace(/[,;.]+$/, '');
    this.runtimePageName = pageName;
    this.runtimeSessionId = sessionId;
    this.runtimeGuid = guid;
    this.runtimeCustomerSessionId = customerSessionId;
    this.runtimeUserAgent = userAgent;
    this.runtimeIpAddress = ipAddress;
    return {
      url: this.runtimeLookupUrl,
      pageName: this.runtimePageName,
      sessionId: this.runtimeSessionId,
      guid: this.runtimeGuid,
      customerSessionId: this.runtimeCustomerSessionId,
      userAgent: this.runtimeUserAgent,
      ipAddress: this.runtimeIpAddress,
    };
  }

  private async readMeasurementDetailValue(label: RegExp): Promise<string> {
    const details = this.locators.performanceMeasurementDetailsTable;
    if (!(await details.isVisible().catch(() => false))) return '';

    const rows = details.locator('tbody tr');
    const rowCount = await rows.count();
    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);
      const rowText = ((await row.innerText().catch(() => '')) || '')
        .replace(/\s+/g, ' ')
        .trim();
      if (!label.test(rowText)) continue;

      const cells = row.locator('td');
      const cellCount = await cells.count();
      const values: string[] = [];
      for (let c = 0; c < cellCount; c++) {
        const value = ((await cells.nth(c).innerText().catch(() => '')) || '')
          .replace(/\s+/g, ' ')
          .trim();
        if (value) values.push(value);
      }
      const labelIndex = values.findIndex((value) => label.test(value));
      if (labelIndex >= 0 && values[labelIndex + 1]) return values[labelIndex + 1];

      const withoutLabel = rowText.replace(label, '').replace(/^[\s:|\\-]+/, '').trim();
      if (withoutLabel && withoutLabel !== rowText) return withoutLabel;
    }
    return '';
  }

  /**
   * Demo eCommerce Global exposes usable identifiers after a URL lookup.
   * Read the Session ID from the Sessions table and GUID/other values from
   * Performance Measurement Details, then reuse them in positive lookups.
   */
  async captureRuntimeIdentifiersFromLookupResults(): Promise<void> {
    if (!(await this.locators.performanceMeasurementDetailsTable.isVisible().catch(() => false))) {
      const points = this.locators.pageViewsSessionChart.locator('.highcharts-point');
      if ((await points.count()) > 0) {
        await points.first().click({ force: true });
        await this.page.waitForTimeout(2500);
      }
    }

    let sessionId = await this.readMeasurementDetailValue(/BTT Session ID/i);
    const guid = await this.readMeasurementDetailValue(/BTT GUID/i);
    const customerSessionId = await this.readMeasurementDetailValue(/Customer Session ID/i);
    const userAgent = await this.readMeasurementDetailValue(/User Agent String|UserAgent/i);
    const ipAddress = await this.readMeasurementDetailValue(/IP Address/i);

    if (await this.locators.allSessionsTable.isVisible().catch(() => false)) {
      const headers = (await this.locators.allSessionsTable.locator('thead th').allTextContents()).map(
        (text) => text.replace(/\s+/g, ' ').trim()
      );
      const idIndex = headers.findIndex((header) => /BT+ Session ID/i.test(header));
      const firstRow = this.locators.allSessionsTable.locator('tbody tr').first();
      if (idIndex >= 0 && (await firstRow.isVisible().catch(() => false))) {
        const tableSessionId = ((await firstRow.locator('td').nth(idIndex).innerText().catch(() => '')) || '')
          .replace(/\s+/g, ' ')
          .trim();
        if (tableSessionId) sessionId = tableSessionId;
      }
      if (!sessionId && (await firstRow.isVisible().catch(() => false))) {
        const candidates = (await firstRow.locator('td, a').allTextContents())
          .map((text) => text.replace(/\s+/g, ' ').trim())
          .filter((text) => /^[A-Za-z0-9_-]{8,}$/.test(text) && !/^(PDP|PLP|Home)$/i.test(text));
        if (candidates.length) sessionId = candidates[0];
      }
    }

    this.runtimeSessionId = sessionId || this.runtimeSessionId;
    this.runtimeGuid = guid || this.runtimeGuid;
    this.runtimeCustomerSessionId = customerSessionId || this.runtimeCustomerSessionId;
    this.runtimeUserAgent = userAgent || this.runtimeUserAgent;
    this.runtimeIpAddress = ipAddress || this.runtimeIpAddress;
  }

  async ensurePositiveLookup(): Promise<boolean> {
    if (this.hasPositiveLookup) return true;
    if (!this.runtimeLookupUrl) {
      await this.deriveRuntimeLookupFromPerformanceDetail();
      await this.openViaNavigation();
    }
    if (!this.runtimeLookupUrl) return false;
    await this.performLookup(/^URL$/i, this.runtimeLookupUrl);
    const ready = await this.waitForLookupResults(45000);
    this.hasPositiveLookup = ready;
    return ready;
  }

  async waitForLookupResults(timeoutMs = 45000): Promise<boolean> {
    try {
      await expect
        .poll(
          async () => {
            const sessions = await this.locators.allSessionsTable.isVisible().catch(() => false);
            const points = await this.locators.pageViewsSessionChart
              .locator('.highcharts-point')
              .count()
              .catch(() => 0);
            const details = await this.locators.performanceMeasurementDetailsTable
              .isVisible()
              .catch(() => false);
            const heading = await this.locators
              .allPageViewsHeading()
              .isVisible()
              .catch(() => false);
            const noData = await this.locators.noDataMessage.isVisible().catch(() => false);
            // A valid identifier may return a Sessions row while the selected
            // Displayed Metric has no chart point for that one-page session.
            if (sessions) return true;
            if (noData) return false;
            if (points > 0 || details) return true;
            if (heading && points > 0) return true;
            return false;
          },
          { timeout: timeoutMs }
        )
        .toBeTruthy();
      return true;
    } catch {
      return false;
    }
  }

  async expectPositiveLookupResults(): Promise<void> {
    const ok = await this.waitForLookupResults(30000);
    expect(ok, 'Expected Sessions / All Page Views / Measurement Details after positive lookup').toBeTruthy();
    await expect(this.locators.allPageViewsHeading()).toBeVisible({ timeout: 15000 });
  }

  async setDisplayedMetric(metric: string | RegExp): Promise<void> {
    await expect(this.locators.displayedMetricSelect).toBeVisible({ timeout: 15000 });
    const options = (await this.locators.displayedMetricSelect.locator('option').allTextContents()).map(
      (t) => t.replace(/\s+/g, ' ').trim()
    );
    const match =
      typeof metric === 'string'
        ? options.find((o) => o.toLowerCase() === metric.toLowerCase()) ||
          options.find((o) => o.toLowerCase().includes(metric.toLowerCase()))
        : options.find((o) => metric.test(o));
    expect(match, `Displayed Metric ${metric}`).toBeTruthy();
    await this.locators.displayedMetricSelect.selectOption({ label: match! });
    await this.page.waitForTimeout(2500);
  }

  async getDisplayedMetricOptions(): Promise<string[]> {
    return (await this.locators.displayedMetricSelect.locator('option').allTextContents()).map((t) =>
      t.replace(/\s+/g, ' ').trim()
    );
  }

  async toggleSessionGraphTable(mode: 'graph' | 'table'): Promise<void> {
    if (mode === 'table') {
      await expect(this.locators.sessionLookupTableToggle).toBeVisible({ timeout: 15000 });
      await this.locators.sessionLookupTableToggle.click({ force: true });
      await this.page.waitForTimeout(1500);
      await expect(this.locators.pageViewsSessionTableContainer.or(this.locators.pageViewsSessionTable)).toBeVisible({
        timeout: 20000,
      });
    } else {
      await expect(this.locators.sessionLookupGraphToggle).toBeVisible({ timeout: 15000 });
      await this.locators.sessionLookupGraphToggle.click({ force: true });
      await this.page.waitForTimeout(1500);
      await expect(this.locators.pageViewsSessionChart).toBeVisible({ timeout: 20000 });
    }
  }

  async expectPageViewsTableHeaders(): Promise<void> {
    await this.toggleSessionGraphTable('table');
    const table = this.locators.pageViewsSessionTable;
    await expect(table).toBeVisible({ timeout: 20000 });
    const headers = (await table.locator('thead th').allTextContents()).map((t) =>
      t.replace(/\s+/g, ' ').trim()
    );
    for (const required of [/Time/i, /Page Name/i, /BT Session ID|BTT Session ID/i]) {
      expect(
        headers.some((h) => required.test(h)),
        `Expected page-views table header ${required}; got ${headers.join(', ')}`
      ).toBeTruthy();
    }
    const rows = await table.locator('tbody tr').count();
    expect(rows, 'Expected ≥1 page-view row after positive lookup').toBeGreaterThan(0);
  }

  async expectSessionsTable(): Promise<void> {
    if (await this.locators.sessionsHeading.isVisible().catch(() => false)) {
      await expect(this.locators.sessionsHeading).toBeVisible();
    }
    await expect(this.locators.allSessionsTable).toBeVisible({ timeout: 20000 });
    const headers = (await this.locators.allSessionsTable.locator('thead th').allTextContents()).map(
      (t) => t.replace(/\s+/g, ' ').trim()
    );
    for (const required of [
      /BT Session ID|BTT Session ID/i,
      /Time Start/i,
      /Page Views?/i,
      /Starting Page Name/i,
      /Traffic Segment/i,
    ]) {
      expect(
        headers.some((h) => required.test(h)),
        `Expected Sessions header ${required}; got ${headers.join(', ')}`
      ).toBeTruthy();
    }
    const rows = await this.locators.allSessionsTable.locator('tbody tr').count();
    expect(rows).toBeGreaterThan(0);
  }

  async expectMaskedOrPresentSessionIds(): Promise<void> {
    const cell = this.locators.allSessionsTable.locator('tbody tr td').first();
    const text = ((await cell.textContent()) || '').replace(/\s+/g, ' ').trim();
    expect(text.length, 'BT Session ID cell should not be empty').toBeGreaterThan(0);
  }

  async clickSessionPageViewPoint(index = 0): Promise<void> {
    const points = this.locators.pageViewsSessionChart.locator('.highcharts-point');
    const count = await points.count();
    expect(count, 'Expected clickable All Page Views points').toBeGreaterThan(0);
    await points.nth(Math.min(index, count - 1)).click({ force: true });
    await this.page.waitForTimeout(3000);
  }

  async hoverSessionPageViewPoint(index = 0): Promise<boolean> {
    const points = this.locators.pageViewsSessionChart.locator('.highcharts-point');
    const count = await points.count();
    if (count === 0) return false;
    await points.nth(Math.min(index, count - 1)).hover({ force: true });
    await this.page.waitForTimeout(800);
    const tipVisible = await this.locators.highchartsTooltip.first().isVisible().catch(() => false);
    if (tipVisible) return true;
    const title = await this.page.locator('title, .highcharts-tooltip text').first().textContent().catch(() => '');
    return !!(title && title.trim());
  }

  async expectPerformanceMeasurementDetails(): Promise<void> {
    await expect(this.locators.performanceMeasurementDetailsHeading()).toBeVisible({
      timeout: 30000,
    });
    await expect(this.locators.performanceMeasurementDetailsTable).toBeVisible({ timeout: 20000 });
    const text = ((await this.locators.performanceMeasurementDetailsTable.innerText()) || '')
      .replace(/\s+/g, ' ')
      .trim();
    expect(text.length).toBeGreaterThan(20);
    for (const label of [/URL/i, /Time Of Measurement/i, /Page Name/i]) {
      expect(label.test(text), `Expected detail label ${label}`).toBeTruthy();
    }
  }

  async getMeasurementDetailsSnapshot(): Promise<string> {
    return ((await this.locators.performanceMeasurementDetailsTable.innerText().catch(() => '')) || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 800);
  }

  async sampleLegendToggle(): Promise<void> {
    const items = this.locators.pageViewsSessionChart.locator('.highcharts-legend-item');
    const count = await items.count();
    if (count === 0) {
      const fallback = this.locators.highchartsLegendItems;
      if ((await fallback.count()) === 0) return;
      await fallback.first().click({ force: true });
      await this.page.waitForTimeout(500);
      await fallback.first().click({ force: true });
      return;
    }
    await items.first().click({ force: true });
    await this.page.waitForTimeout(500);
    await items.first().click({ force: true });
  }

  async expectBreakdownOrWaterfallSoft(): Promise<'breakdown' | 'waterfall' | 'none'> {
    if (await this.locators.performanceBreakdownGraph.isVisible().catch(() => false)) {
      return 'breakdown';
    }
    const any =
      (await this.locators.domainLevelActivityGraph.isVisible().catch(() => false)) ||
      (await this.locators.objectLevelDetailGraph.isVisible().catch(() => false)) ||
      (await this.locators.resourceTimingsOverTimeGraph.isVisible().catch(() => false));
    if (any) return 'waterfall';
    return 'none';
  }

  async sampleDomainObjectTabs(): Promise<string[]> {
    const clicked: string[] = [];
    for (const [label, btn] of [
      ['Domain Level Activity', this.locators.domainLevelActivityBtn],
      ['Object Level Detail', this.locators.objectLevelDetailBtn],
      ['Object Activity By Domain', this.locators.objectActivityByDomainBtn],
    ] as Array<[string, Locator]>) {
      if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btn.click({ force: true });
        await this.page.waitForTimeout(1500);
        clicked.push(label);
      }
    }
    if (await this.locators.domainObjectTableToggle.isVisible().catch(() => false)) {
      await this.locators.domainObjectTableToggle.click({ force: true });
      await this.page.waitForTimeout(1000);
      if (await this.locators.domainObjectGraphToggle.isVisible().catch(() => false)) {
        await this.locators.domainObjectGraphToggle.click({ force: true });
        await this.page.waitForTimeout(1000);
      }
    }
    return clicked;
  }

  async sampleReplayOrUrlLink(): Promise<'url' | 'replay' | 'none'> {
    if (await this.locators.contentsquareReplayLabel.isVisible().catch(() => false)) {
      return 'replay';
    }
    for (const link of [this.locators.replayUrl, this.locators.clicktaleReplayUrl, this.locators.urlLinkTop]) {
      if (await link.isVisible({ timeout: 1500 }).catch(() => false)) {
        const href =
          (await link.getAttribute('href').catch(() => null)) ||
          (await link.locator('a').first().getAttribute('href').catch(() => null));
        if (href && /^https?:\/\//i.test(href)) {
          return /replay|clicktale|contentsquare/i.test(href) ? 'replay' : 'url';
        }
        const text = ((await link.textContent()) || '').trim();
        if (/^https?:\/\//i.test(text)) return 'url';
      }
    }
    return 'none';
  }

  async openDeepLinkWithUrl(url: string): Promise<void> {
    const sid = currentSiteId(this.page) || '0';
    const encoded = Buffer.from(url).toString('base64');
    const target = `${portalBase()}/index.php?r=real-user-monitoring/session-lookup-performance-detail&sid=${encodeURIComponent(sid)}&url=${encodeURIComponent(encoded)}`;
    await this.page.goto(target, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await this.waitForPageReady();
    await this.page.waitForTimeout(8000);
  }

  async openMalformedDeepLink(): Promise<void> {
    const sid = currentSiteId(this.page) || '0';
    const target = `${portalBase()}/index.php?r=real-user-monitoring/session-lookup-performance-detail&sid=${encodeURIComponent(sid)}&url=not-valid-base64!!!`;
    await this.page.goto(target, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await expect(this.page).not.toHaveURL(/site\/login/i);
    await expect(this.locators.pageTitle).toBeVisible({ timeout: 60000 });
  }

  async navigateToPerformanceDetailViaButton(): Promise<void> {
    await expect(this.locators.performanceDetailButton).toBeVisible({ timeout: 15000 });
    await this.locators.performanceDetailButton.click({ force: true });
    await this.page.waitForTimeout(3000);
    await expect(this.page).toHaveURL(/performance-detail/i, { timeout: 60000 });
    await expect(this.page.locator('#page-title')).toHaveText(/Performance Detail/i, {
      timeout: 60000,
    });
  }

  async openRightNavFilters(): Promise<void> {
    const apply = this.page
      .locator('#apply-filters, button:has-text("Apply Filters")')
      .filter({ visible: true })
      .first();
    if (await apply.isVisible().catch(() => false)) return;
    await expect(this.locators.filtersToggle).toBeVisible({ timeout: 15000 });
    await this.locators.filtersToggle.click({ force: true });
    await this.page.waitForTimeout(1000);
    if (!(await apply.isVisible().catch(() => false))) {
      await this.locators.filtersToggle.click({ force: true });
      await this.page.waitForTimeout(1000);
    }
    await expect(apply).toBeVisible({ timeout: 20000 });
  }

  async selectTimePeriodPreset(label: string): Promise<void> {
    await this.openRightNavFilters();
    const tpBox = this.page.locator('#time-period').first();
    await expect(tpBox).toBeVisible({ timeout: 20000 });
    await tpBox.click({ force: true });
    await this.page.waitForTimeout(800);
    const aliases = timePeriodAliases(label);
    let clicked = false;
    for (const alias of aliases) {
      const preset = this.page
        .locator('.daterangepicker li, .ranges li')
        .filter({ hasText: new RegExp(escapeRegExp(alias), 'i') })
        .first();
      if (await preset.isVisible().catch(() => false)) {
        await preset.click({ force: true });
        clicked = true;
        break;
      }
    }
    expect(clicked, `Time Period "${label}"`).toBeTruthy();
    await this.page.keyboard.press('Escape').catch(() => undefined);
  }

  async clickApplyFilters(): Promise<void> {
    const apply = this.page
      .locator('#apply-filters, button:has-text("Apply Filters")')
      .filter({ visible: true })
      .first();
    await apply.click({ force: true });
    await this.page.waitForTimeout(4000);
  }

  async clickCancelFilters(): Promise<void> {
    const cancel = this.page
      .locator('#cancel-filters, button:has-text("Cancel")')
      .filter({ visible: true })
      .first();
    if (await cancel.isVisible().catch(() => false)) {
      await cancel.click({ force: true });
      await this.page.waitForTimeout(800);
    }
  }

  async applySampleRightNavFilters(timePeriod?: string): Promise<void> {
    await this.openRightNavFilters();
    if (timePeriod) await this.selectTimePeriodPreset(timePeriod);
    const bot = this.page.locator('#exclude-bots').first();
    if (await bot.isVisible({ timeout: 2000 }).catch(() => false)) {
      await bot.check({ force: true }).catch(() => undefined);
    }
    await this.clickApplyFilters();
    await this.expectLookupControlsEnabled();
  }

  async sampleInfoTooltip(): Promise<string> {
    const icon = this.locators.infoIcons.first();
    if (await icon.isVisible({ timeout: 3000 }).catch(() => false)) {
      return (
        (await icon.getAttribute('data-original-title').catch(() => null)) ||
        (await icon.getAttribute('title').catch(() => null)) ||
        'info-icon-present'
      );
    }
    return '';
  }

  async sampleTableSearch(scope: Locator, query: string): Promise<void> {
    const search = scope
      .locator('#table-search, input[placeholder*="Search" i], input[type="search"]')
      .first();
    if (await search.isVisible({ timeout: 3000 }).catch(() => false)) {
      await search.fill(query);
      await this.page.waitForTimeout(800);
      await search.fill('');
      await this.page.waitForTimeout(500);
    }
  }

  async sampleKeyboardFocus(): Promise<void> {
    await this.locators.lookupDropdown.focus();
    await expect(this.locators.lookupDropdown).toBeFocused();
    await this.locators.lookupInput.focus();
    await expect(this.locators.lookupInput).toBeFocused();
    await this.locators.displayedMetricSelect.focus();
    await expect(this.locators.displayedMetricSelect).toBeFocused();
  }

  async sampleResponsiveViewport(): Promise<void> {
    await this.page.setViewportSize({ width: 1280, height: 900 });
    await expect(this.locators.lookupInput).toBeVisible();
    await this.page.setViewportSize({ width: 1024, height: 800 });
    await expect(this.locators.lookupInput).toBeVisible();
    await this.page.setViewportSize({ width: 1600, height: 1000 });
  }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function timePeriodAliases(label: string): string[] {
  const lower = label.toLowerCase();
  if (/6\s*h|6\s*hour/i.test(lower)) return ['Last 6 Hours', 'Last 6 Hour', '6 Hours', '6 Hour'];
  if (/24\s*h|1\s*day|24\s*hour/i.test(lower))
    return ['Last 24 Hours', 'Last 24 Hour', '1 Day', 'Last 1 Day', '24 Hours'];
  if (/7\s*d|7\s*day/i.test(lower)) return ['Last 7 Days', 'Last 7 Day', '7 Days'];
  if (/30\s*d|30\s*day/i.test(lower)) return ['Last 30 Days', 'Last 30 Day', '30 Days'];
  return [label];
}
