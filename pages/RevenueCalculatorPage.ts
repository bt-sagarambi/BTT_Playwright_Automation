import { Page, expect, Locator } from '@playwright/test';
import { RevenueCalculatorLocators } from '../locators/RevenueCalculatorLocators';
import { LeftNavPage } from './LeftNavPage';
import { SiteDropdownPage } from './SiteDropdownPage';
import { ensurePortalSession } from '../helpers/portalSession';
import { getActiveProfile } from '../config/profiles';

const PAGE_DEF = {
  id: 'biz.revenue-calculator',
  module: 'biz',
  menuLabel: 'Revenue Calculator',
  route: 'business-analytics/revenue-calculator',
  hrefIncludes: ['conversion-type=sales', 'revenue-calculator'],
  titleIncludes: /(?:Revenue|Numbers)\s+Calculator/i,
};

const BRAND_PAGE_DEF = {
  id: 'biz.brand-calculator',
  module: 'biz',
  menuLabel: 'Brand Calculator',
  route: 'business-analytics/revenue-calculator',
  hrefIncludes: ['conversion-type=brand', 'revenue-calculator'],
  titleIncludes: /Brand Calculator|Calculator/i,
};

export type RevenueCalculatorContext = {
  siteLabel: string;
  timePeriod: string;
  pageName: string;
  performanceMetric: string;
  crcMode: 'graph' | 'table' | 'unknown';
  overTimeMode: 'graph' | 'table' | 'unknown';
  whatIfMode: 'by' | 'to' | 'unknown';
  piesOpen: boolean;
};

/**
 * Revenue Calculator (conversion-type=sales) — read-only.
 * No Save Filter / Clear Cache / Save Calibration / Submit Impact Rules.
 */
export class RevenueCalculatorPage {
  readonly locators: RevenueCalculatorLocators;

  constructor(private readonly page: Page) {
    this.locators = new RevenueCalculatorLocators(page);
  }

  async openViaNavigation(): Promise<void> {
    await ensurePortalSession(this.page);
    await new SiteDropdownPage(this.page).ensureProfileSite().catch(() => undefined);
    await new LeftNavPage(this.page).openSmokePage(PAGE_DEF);
    await this.waitForPageReady();
    await this.ensureSalesConversionType();
    await this.ensureProfileSiteSelected();
  }

  async waitForPageReady(): Promise<{ loadMs: number }> {
    const started = Date.now();
    await expect(this.page).not.toHaveURL(/site\/login|site%2Flogin/i);
    await expect(this.page).toHaveURL(/business-analytics\/revenue-calculator|revenue-calculator/i);
    await expect(this.locators.pageTitle).toBeVisible({ timeout: 60000 });
    // Live title may insert extra spaces: "Improve Conversion / Revenue  Calculator"
    await expect
      .poll(async () => (await this.getPageTitleText()).replace(/\s+/g, ' '), { timeout: 15000 })
      .toMatch(
        /Business Insights\s*\/\s*Improve Conversion\s*\/\s*(?:Revenue|Numbers)\s+Calculator|(?:Revenue|Numbers)\s+Calculator/i
      );
    await this.page.waitForLoadState('domcontentloaded');
    await this.dismissCoaches();
    await this.expectCoreReady();
    return { loadMs: Date.now() - started };
  }

  async dismissCoaches(): Promise<void> {
    for (let i = 0; i < 4; i++) {
      const open = this.page.locator('.jconfirm.jconfirm-open, .modal.in, .blockUI, .get-started');
      if (!(await open.first().isVisible().catch(() => false))) break;
      const btn = this.page
        .locator('.jconfirm.jconfirm-open button, .modal.in button, .get-started button')
        .filter({ hasText: /ok|close|yes|got it|don't show|dismiss|continue|agree/i })
        .first();
      if (await btn.isVisible().catch(() => false)) {
        await btn.click({ force: true }).catch(() => undefined);
      } else {
        await this.page.keyboard.press('Escape').catch(() => undefined);
      }
      await this.page.waitForTimeout(400);
    }
  }

  async closeOverlays(): Promise<void> {
    await this.page.keyboard.press('Escape').catch(() => undefined);
    await this.page.waitForTimeout(200);
    await this.locators.cancelFilters.click({ force: true }).catch(() => undefined);
    await this.page
      .locator('button, a.btn')
      .filter({ hasText: /^Close$|^Cancel$/i })
      .first()
      .click({ force: true })
      .catch(() => undefined);
    await this.dismissCoaches();
  }

  async ensureSalesConversionType(): Promise<void> {
    const url = this.page.url();
    if (
      /conversion-type=sales/i.test(url) &&
      /(?:Revenue|Numbers)\s+Calculator/i.test(await this.getPageTitleText())
    ) {
      return;
    }
    if (/conversion-type=brand/i.test(url) || /Brand Calculator/i.test(await this.getPageTitleText())) {
      await new LeftNavPage(this.page).openSmokePage(PAGE_DEF);
      await this.waitForPageReady();
    }
    await expect(this.page).toHaveURL(/conversion-type=sales/i);
  }

  async ensureProfileSiteSelected(): Promise<void> {
    await new SiteDropdownPage(this.page).ensureProfileSite().catch(() => undefined);
  }

  async getPageTitleText(): Promise<string> {
    return ((await this.locators.pageTitle.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
  }

  async getSiteLabel(): Promise<string> {
    const quick = this.page.locator('#select2-quick-site-id-container');
    if (await quick.isVisible().catch(() => false)) {
      return ((await quick.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
    }
    return ((await this.locators.siteSelectContainer.innerText().catch(() => '')) || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async getBadgeText(loc: Locator): Promise<string> {
    return ((await loc.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
  }

  async getTimePeriodLabel(): Promise<string> {
    return this.getBadgeText(this.locators.timePeriodView);
  }

  async getPageNameLabel(): Promise<string> {
    return this.getBadgeText(this.locators.pageNameView);
  }

  async getBodySample(max = 5000): Promise<string> {
    return ((await this.page.locator('body').innerText().catch(() => '')) || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, max);
  }

  async widgetsReadyScore(): Promise<number> {
    const body = await this.getBodySample(6000);
    let score = 0;
    if (/Total Sessions|TOTAL SESSIONS/i.test(body)) score += 1;
    if (/Revenue Opportunity|REVENUE OPPORTUNITY/i.test(body)) score += 1;
    if (/Conversion Rate/i.test(body)) score += 1;
    if (await this.locators.conversionRateCurveGraph.isVisible().catch(() => false)) score += 2;
    else if (await this.locators.conversionRateCurveTable.isVisible().catch(() => false)) score += 2;
    if (
      (await this.locators.spedUpByGraph.isVisible().catch(() => false)) ||
      (await this.locators.spedUpToGraph.isVisible().catch(() => false))
    )
      score += 2;
    if (
      (await this.locators.conversionOverTimeGraph.isVisible().catch(() => false)) ||
      (await this.locators.conversionOverTimeTable.isVisible().catch(() => false))
    )
      score += 2;
    if ((await this.locators.highchartsContainers.count().catch(() => 0)) > 0) score += 1;
    return score;
  }

  async expectCoreReady(): Promise<void> {
    await expect
      .poll(async () => this.widgetsReadyScore(), { timeout: 90000 })
      .toBeGreaterThanOrEqual(4);
  }

  async expectSelectedSite(): Promise<void> {
    const profile = getActiveProfile();
    const label = await this.getSiteLabel();
    expect(label, `site="${label}"`).toMatch(new RegExp(profile.siteName.replace(/\s+/g, '\\s+'), 'i'));
  }

  async expectNotConfusedSurfaces(): Promise<void> {
    await expect(this.page).not.toHaveURL(/overview-dashboard\/marketing/i);
    await expect(this.page).not.toHaveURL(/performance-detail|real-user-monitoring/i);
    await expect(this.page).toHaveURL(/revenue-calculator/i);
    await expect(this.page).toHaveURL(/conversion-type=sales/i);
    const title = await this.getPageTitleText();
    expect(title).toMatch(/(?:Revenue|Numbers)\s+Calculator/i);
    expect(title).not.toMatch(/Brand Calculator/i);
    expect(title).not.toMatch(/(?:Revenue|Numbers)\s+Opportunity/i);
  }

  async captureContext(): Promise<RevenueCalculatorContext> {
    const crcGraph = await this.locators.conversionRateCurveGraph.isVisible().catch(() => false);
    const crcTable = await this.locators.conversionRateCurveTable.isVisible().catch(() => false);
    const otGraph = await this.locators.conversionOverTimeGraph.isVisible().catch(() => false);
    const otTable = await this.locators.conversionOverTimeTable.isVisible().catch(() => false);
    const by = await this.locators.spedUpByGraph.isVisible().catch(() => false);
    const to = await this.locators.spedUpToGraph.isVisible().catch(() => false);
    const piesOpen = await this.locators.pieChartRow.isVisible().catch(() => false);
    return {
      siteLabel: await this.getSiteLabel(),
      timePeriod: await this.getTimePeriodLabel(),
      pageName: await this.getPageNameLabel(),
      performanceMetric: await this.getBadgeText(this.locators.performanceMetricView),
      crcMode: crcGraph ? 'graph' : crcTable ? 'table' : 'unknown',
      overTimeMode: otGraph ? 'graph' : otTable ? 'table' : 'unknown',
      whatIfMode: by ? 'by' : to ? 'to' : 'unknown',
      piesOpen: !!piesOpen,
    };
  }

  async restoreContext(ctx: RevenueCalculatorContext): Promise<void> {
    await this.ensureSalesConversionType();
    await this.ensureProfileSiteSelected();
    await this.closeOverlays();
    if (ctx.crcMode === 'graph') await this.locators.graphConvCurveBtn.click({ force: true }).catch(() => undefined);
    if (ctx.crcMode === 'table') await this.locators.tableConvCurveBtn.click({ force: true }).catch(() => undefined);
    if (ctx.overTimeMode === 'graph')
      await this.locators.graphConversionTimeBtn.click({ force: true }).catch(() => undefined);
    if (ctx.overTimeMode === 'table')
      await this.locators.tableConversionTimeBtn.click({ force: true }).catch(() => undefined);
    if (ctx.whatIfMode === 'by')
      await this.locators.whatIfSpedUpByToggle.click({ force: true }).catch(() => undefined);
    if (ctx.whatIfMode === 'to')
      await this.locators.whatIfPageSpeedWasToggle.click({ force: true }).catch(() => undefined);
    const piesNow = await this.locators.pieChartRow.isVisible().catch(() => false);
    if (ctx.piesOpen !== piesNow) {
      await this.locators.togglePieCharts.click({ force: true }).catch(() => undefined);
    }
    await this.page.waitForTimeout(500);
    await this.expectCoreReady().catch(() => undefined);
  }

  async recoverPage(): Promise<void> {
    await this.closeOverlays();
    try {
      await this.ensureSalesConversionType();
      await this.ensureProfileSiteSelected();
      await this.expectCoreReady();
    } catch {
      await this.openViaNavigation();
    }
  }

  async openFiltersDrawer(): Promise<void> {
    await this.closeOverlays();
    if (await this.locators.applyFilters.isVisible().catch(() => false)) return;
    const toggle = (await this.locators.toggleFilters.isVisible().catch(() => false))
      ? this.locators.toggleFilters
      : this.locators.mobileFiltersBtn;
    await toggle.click({ force: true });
    await this.page.waitForTimeout(800);
    await expect(this.locators.applyFilters).toBeVisible({ timeout: 15000 });
  }

  async cancelFiltersDrawer(): Promise<void> {
    if (await this.locators.cancelFilters.isVisible().catch(() => false)) {
      await this.locators.cancelFilters.click({ force: true }).catch(() => undefined);
    } else {
      await this.page.keyboard.press('Escape').catch(() => undefined);
    }
    await this.page.waitForTimeout(400);
  }

  async applyFiltersSoft(): Promise<boolean> {
    if (!(await this.locators.applyFilters.isVisible().catch(() => false))) return false;
    await this.locators.applyFilters.click({ force: true });
    await this.page.waitForTimeout(2000);
    await this.expectCoreReady().catch(() => undefined);
    return true;
  }

  async softToggleCrcTableGraph(): Promise<{ note: string; toggled: boolean }> {
    let toggled = false;
    if (await this.locators.tableConvCurveBtn.isVisible().catch(() => false)) {
      await this.locators.tableConvCurveBtn.click({ force: true });
      await this.page.waitForTimeout(700);
      toggled = true;
    }
    if (await this.locators.graphConvCurveBtn.isVisible().catch(() => false)) {
      await this.locators.graphConvCurveBtn.click({ force: true });
      await this.page.waitForTimeout(700);
      toggled = true;
    }
    return { toggled, note: toggled ? 'CRC graph/table soft toggled' : 'CRC toggles not visible' };
  }

  async softToggleOverTimeTableGraph(): Promise<{ note: string; toggled: boolean }> {
    let toggled = false;
    if (await this.locators.tableConversionTimeBtn.isVisible().catch(() => false)) {
      await this.locators.tableConversionTimeBtn.click({ force: true });
      await this.page.waitForTimeout(700);
      toggled = true;
    }
    if (await this.locators.graphConversionTimeBtn.isVisible().catch(() => false)) {
      await this.locators.graphConversionTimeBtn.click({ force: true });
      await this.page.waitForTimeout(700);
      toggled = true;
    }
    return { toggled, note: toggled ? 'Over-time graph/table soft toggled' : 'Over-time toggles not visible' };
  }

  async softToggleWhatIfByTo(): Promise<{ note: string; toggled: boolean }> {
    let toggled = false;
    if (await this.locators.whatIfPageSpeedWasToggle.isVisible().catch(() => false)) {
      await this.locators.whatIfPageSpeedWasToggle.click({ force: true });
      await this.page.waitForTimeout(800);
      toggled = true;
    }
    if (await this.locators.whatIfSpedUpByToggle.isVisible().catch(() => false)) {
      await this.locators.whatIfSpedUpByToggle.click({ force: true });
      await this.page.waitForTimeout(800);
      toggled = true;
    }
    return { toggled, note: toggled ? 'What-If By/To soft toggled' : 'What-If toggles not visible' };
  }

  async softTogglePieCharts(): Promise<{ note: string; open: boolean }> {
    await this.locators.togglePieCharts.click({ force: true }).catch(() => undefined);
    await this.page.waitForTimeout(700);
    const open = await this.locators.pieChartRow.isVisible().catch(() => false);
    await this.locators.togglePieCharts.click({ force: true }).catch(() => undefined);
    await this.page.waitForTimeout(500);
    return { open: !!open, note: `Pie toggle sampled; rowVisibleOnce=${!!open}` };
  }

  async softLegendToggleIn(host: Locator): Promise<{ toggled: boolean; note: string }> {
    await host.scrollIntoViewIfNeeded().catch(() => undefined);
    const legend = host.locator('.highcharts-legend-item, .highcharts-legend-item text');
    const count = await legend.count().catch(() => 0);
    if (count < 1) {
      const byName = host.getByText(/Sessions|Conversion Rate|Avg Order Value|Bounce Rate|Revenue Opportunity|Onload/i).first();
      if (await byName.isVisible().catch(() => false)) {
        await byName.click({ force: true }).catch(() => undefined);
        await this.page.waitForTimeout(400);
        await byName.click({ force: true }).catch(() => undefined);
        return { toggled: true, note: 'Legend text soft toggle' };
      }
      return { toggled: false, note: 'No legend items' };
    }
    const item = legend.first();
    await item.click({ force: true }).catch(() => undefined);
    await this.page.waitForTimeout(400);
    await item.click({ force: true }).catch(() => undefined);
    return { toggled: true, note: `Legend soft toggle items≈${count}` };
  }

  async softOpenAddComparison(): Promise<boolean> {
    await this.closeOverlays();
    if (!(await this.locators.addComparison.isVisible().catch(() => false))) return false;
    await this.locators.addComparison.click({ force: true });
    await this.page.waitForTimeout(1000);
    const body = await this.getBodySample(2500);
    return /Add Comparison|Series Configuration|Comparison Legend/i.test(body);
  }

  async softOpenCalibration(): Promise<boolean> {
    await this.closeOverlays();
    if (!(await this.locators.toggleCalibration.isVisible().catch(() => false))) return false;
    await this.locators.toggleCalibration.click({ force: true });
    await this.page.waitForTimeout(700);
    return this.locators.calibrationSlider.isVisible().catch(() => false);
  }

  async softBrandCalculatorRoundTrip(): Promise<{ note: string; restored: boolean }> {
    await new LeftNavPage(this.page).openSmokePage(BRAND_PAGE_DEF);
    await this.page.waitForTimeout(2500);
    await this.dismissCoaches();
    const brandTitle = await this.getPageTitleText();
    await new LeftNavPage(this.page).openSmokePage(PAGE_DEF);
    await this.waitForPageReady();
    await this.ensureProfileSiteSelected();
    const restored =
      /(?:Revenue|Numbers)\s+Calculator/i.test(await this.getPageTitleText()) &&
      /conversion-type=sales/i.test(this.page.url());
    return {
      note: `Visited brand title="${brandTitle}"; restoredSales=${restored}`,
      restored,
    };
  }

  async softRevenueOpportunityRoundTrip(): Promise<{ note: string; restored: boolean }> {
    await new LeftNavPage(this.page).openSmokePage({
      id: 'biz.revenue-opportunity',
      module: 'biz',
      menuLabel: 'Revenue Opportunity',
      route: 'business-analytics/revenue-opportunity',
      titleIncludes: /Revenue Opportunity/i,
    });
    await this.page.waitForTimeout(2500);
    await this.dismissCoaches();
    const mid = await this.getPageTitleText();
    await this.openViaNavigation();
    const restored = /(?:Revenue|Numbers)\s+Calculator/i.test(await this.getPageTitleText());
    return { note: `Visited="${mid}"; restored=${restored}`, restored };
  }

  async softAttributionRoundTrip(): Promise<{ note: string; restored: boolean }> {
    if (!(await this.locators.revenueAttribution.isVisible().catch(() => false))) {
      return { note: 'Revenue Attribution button not visible', restored: true };
    }
    await this.locators.revenueAttribution.click({ force: true });
    await this.page.waitForTimeout(2500);
    const midUrl = this.page.url();
    await this.page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await this.page.waitForTimeout(1500);
    if (!/revenue-calculator/i.test(this.page.url()) || /conversion-type=brand/i.test(this.page.url())) {
      await this.openViaNavigation();
    } else {
      await this.waitForPageReady().catch(async () => this.openViaNavigation());
    }
    const restored =
      /(?:Revenue|Numbers)\s+Calculator/i.test(await this.getPageTitleText()) &&
      /conversion-type=sales/i.test(this.page.url());
    return { note: `Attribution midUrl has attribution=${/attribution/i.test(midUrl)}; restored=${restored}`, restored };
  }

  async softApplyTimePeriodPreset(label: RegExp): Promise<boolean> {
    await this.openFiltersDrawer();
    const period = this.page.locator('#time-period, #time-period-view, input[name="time-period"]').first();
    // Prefer clicking badge / select2 for common presets via filter UI text
    const preset = this.page.getByText(label).first();
    if (await preset.isVisible().catch(() => false)) {
      await preset.click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(400);
      await this.applyFiltersSoft();
      await this.cancelFiltersDrawer().catch(() => undefined);
      return true;
    }
    // Try select2 time period container
    const s2 = this.page.locator('#select2-time-period-container, #time-period-view').first();
    if (await s2.isVisible().catch(() => false)) {
      await s2.click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(500);
      const opt = this.page.locator('.select2-results__option, .dropdown-menu a, li').filter({ hasText: label }).first();
      if (await opt.isVisible().catch(() => false)) {
        await opt.click({ force: true });
        await this.applyFiltersSoft();
        await this.cancelFiltersDrawer().catch(() => undefined);
        return true;
      }
      await this.page.keyboard.press('Escape').catch(() => undefined);
    }
    await this.cancelFiltersDrawer().catch(() => undefined);
    void period;
    return false;
  }

  async clearTableSearches(): Promise<void> {
    const searches = this.page.locator('input.tablesorter-filter, input[id*="table-search"]');
    const n = await searches.count().catch(() => 0);
    for (let i = 0; i < Math.min(n, 6); i++) {
      const el = searches.nth(i);
      if (await el.isVisible().catch(() => false)) {
        await el.fill('').catch(() => undefined);
      }
    }
  }
}
