import { Page, expect, Locator } from '@playwright/test';
import { RevenueAttributionLocators } from '../locators/RevenueAttributionLocators';
import { LeftNavPage } from './LeftNavPage';
import { SiteDropdownPage } from './SiteDropdownPage';
import { ensurePortalSession } from '../helpers/portalSession';
import { getActiveProfile } from '../config/profiles';

const PAGE_DEF = {
  id: 'biz.revenue-attribution',
  module: 'biz',
  menuLabel: 'Revenue Attribution',
  route: 'business-analytics/revenue-attribution',
  titleIncludes: /(?:Revenue|Numbers)\s+Attribution/i,
};

const BRAND_ATTR_DEF = {
  id: 'biz.brand-attribution',
  module: 'biz',
  menuLabel: 'Brand Attribution',
  route: 'business-analytics/brand-attribution',
  titleIncludes: /Brand Attribution/i,
};

const CALCULATOR_DEF = {
  id: 'biz.revenue-calculator',
  module: 'biz',
  menuLabel: 'Revenue Calculator',
  route: 'business-analytics/revenue-calculator',
  hrefIncludes: ['conversion-type=sales', 'revenue-calculator'],
  titleIncludes: /(?:Revenue|Numbers)\s+Calculator/i,
};

const OPPORTUNITY_DEF = {
  id: 'biz.revenue-opportunity',
  module: 'biz',
  menuLabel: 'Revenue Opportunity',
  route: 'business-analytics/revenue-opportunity',
  titleIncludes: /Revenue Opportunity/i,
};

export type RevenueAttributionContext = {
  siteLabel: string;
  reportLabel: string;
  weekRange: string;
  deviceToggleClasses: Record<string, string>;
  activeTableTab: string;
};

/**
 * Revenue Attribution — read-only.
 * No Save Filter / Clear Cache / Save & Run Report / permanent Ad-Hoc / Impact Rules submit.
 */
export class RevenueAttributionPage {
  readonly locators: RevenueAttributionLocators;

  constructor(private readonly page: Page) {
    this.locators = new RevenueAttributionLocators(page);
  }

  async openViaNavigation(): Promise<void> {
    await ensurePortalSession(this.page);
    await new SiteDropdownPage(this.page).ensureProfileSite().catch(() => undefined);
    await new LeftNavPage(this.page).openSmokePage(PAGE_DEF);
    await this.waitForPageReady();
    await this.ensureProfileSiteSelected();
  }

  async waitForPageReady(): Promise<{ loadMs: number }> {
    const started = Date.now();
    await expect(this.page).not.toHaveURL(/site\/login|site%2Flogin/i);
    await expect(this.page).toHaveURL(/business-analytics\/revenue-attribution|revenue-attribution/i);
    await expect(this.locators.pageTitle).toBeVisible({ timeout: 60000 });
    await expect
      .poll(async () => (await this.getPageTitleText()).replace(/\s+/g, ' '), { timeout: 20000 })
      .toMatch(
        /Business Insights\s*\/\s*Improve Conversion\s*\/\s*(?:Revenue|Numbers)\s+Attribution|(?:Revenue|Numbers)\s+Attribution/i
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

  async getBodySample(max = 5000): Promise<string> {
    // Prefer page contents / cards — #report-list can dominate body.innerText with hundreds of Ad-Hoc rows.
    const preferred = this.page.locator(
      '#page-contents, #total-attribution-card-container, #rev-attr-values-all_devices, #page-wrapper'
    );
    let text = '';
    const n = await preferred.count().catch(() => 0);
    for (let i = 0; i < Math.min(n, 4); i++) {
      const chunk = ((await preferred.nth(i).innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
      if (chunk.length > text.length) text = chunk;
    }
    if (text.length < 200) {
      text = ((await this.page.locator('body').innerText().catch(() => '')) || '')
        .replace(/\s+/g, ' ')
        .trim();
    }
    return text.slice(0, max);
  }

  async getWeekRangeText(): Promise<string> {
    return ((await this.locators.reportTimePeriod.innerText().catch(() => '')) || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async getReportLabel(): Promise<string> {
    const list = this.locators.reportList;
    if (await list.isVisible().catch(() => false)) {
      const t = ((await list.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
      // First line / selected option often includes Ad-Hoc + Date of Performance Change
      return t.split(/\n/)[0]?.slice(0, 220) || t.slice(0, 220);
    }
    const body = await this.getBodySample(1200);
    const m = body.match(/\[[\d-]+\][^\[]{0,120}Date of Performance Change:\s*[\d-]+/i);
    return (m?.[0] || '').slice(0, 220);
  }

  async widgetsReadyScore(): Promise<number> {
    const body = await this.getBodySample(7000);
    let score = 0;
    if (/Revenue Attributed|Revenue Change|Experience Influences|Marketing Influences/i.test(body)) score += 2;
    if (/Performance|Stability/i.test(body)) score += 1;
    if (/Traffic|Intent|Average Order Value/i.test(body)) score += 1;
    if (/KPI Change|Sessions|Conversion Rate/i.test(body)) score += 1;
    if (await this.locators.totalAttributionCardContainer.isVisible().catch(() => false)) score += 2;
    else if (await this.locators.deviceCard('all_devices').isVisible().catch(() => false)) score += 2;
    if (
      (await this.locators.allDevicesPlatformGraph.isVisible().catch(() => false)) ||
      (await this.locators.desktopPlatformGraph.isVisible().catch(() => false)) ||
      (await this.locators.totalAttributionGraphContainer.isVisible().catch(() => false))
    )
      score += 2;
    if (
      (await this.locators.tableAllDevices.isVisible().catch(() => false)) ||
      (await this.locators.tableDesktop.isVisible().catch(() => false)) ||
      (await this.locators.desktopPageTable.isVisible().catch(() => false))
    )
      score += 1;
    if ((await this.locators.highchartsContainers.count().catch(() => 0)) > 0) score += 1;
    if (await this.locators.reportList.isVisible().catch(() => false)) score += 1;
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
    await expect(this.page).not.toHaveURL(/brand-attribution/i);
    await expect(this.page).toHaveURL(/revenue-attribution/i);
    const title = await this.getPageTitleText();
    expect(title).toMatch(/(?:Revenue|Numbers)\s+Attribution/i);
    expect(title).not.toMatch(/Brand Attribution/i);
    expect(title).not.toMatch(/(?:Revenue|Numbers)\s+Calculator/i);
    expect(title).not.toMatch(/(?:Revenue|Numbers)\s+Opportunity/i);
  }

  async captureDeviceToggleClasses(): Promise<Record<string, string>> {
    const map: Record<string, string> = {};
    const pairs: Array<[string, Locator]> = [
      ['all_devices', this.locators.deviceToggleAll],
      ['desktop', this.locators.deviceToggleDesktop],
      ['mobile', this.locators.deviceToggleMobile],
      ['ios', this.locators.deviceToggleIos],
      ['android', this.locators.deviceToggleAndroid],
    ];
    for (const [key, loc] of pairs) {
      if (await loc.isVisible().catch(() => false)) {
        map[key] = (await loc.getAttribute('class').catch(() => '')) || '';
      }
    }
    return map;
  }

  async getActiveTableTab(): Promise<string> {
    const tabs: Array<[string, Locator]> = [
      ['desktop', this.locators.desktopTableSectionTab],
      ['mobile', this.locators.mobileTableSectionTab],
      ['ios', this.locators.iosTableSectionTab],
      ['android', this.locators.androidTableSectionTab],
    ];
    for (const [name, loc] of tabs) {
      const cls = (await loc.getAttribute('class').catch(() => '')) || '';
      if (/active/i.test(cls)) return name;
    }
    return 'unknown';
  }

  async captureContext(): Promise<RevenueAttributionContext> {
    return {
      siteLabel: await this.getSiteLabel(),
      reportLabel: await this.getReportLabel(),
      weekRange: await this.getWeekRangeText(),
      deviceToggleClasses: await this.captureDeviceToggleClasses(),
      activeTableTab: await this.getActiveTableTab(),
    };
  }

  async restoreContext(ctx: RevenueAttributionContext): Promise<void> {
    await this.ensureProfileSiteSelected();
    await this.closeOverlays();
    // Restore table tab
    if (ctx.activeTableTab === 'desktop')
      await this.locators.desktopTableSectionTab.click({ force: true }).catch(() => undefined);
    if (ctx.activeTableTab === 'mobile')
      await this.locators.mobileTableSectionTab.click({ force: true }).catch(() => undefined);
    if (ctx.activeTableTab === 'ios')
      await this.locators.iosTableSectionTab.click({ force: true }).catch(() => undefined);
    if (ctx.activeTableTab === 'android')
      await this.locators.androidTableSectionTab.click({ force: true }).catch(() => undefined);
    // Best-effort restore device toggles toward original grayed/primary state
    for (const [key, cls] of Object.entries(ctx.deviceToggleClasses || {})) {
      const loc =
        key === 'all_devices'
          ? this.locators.deviceToggleAll
          : key === 'desktop'
            ? this.locators.deviceToggleDesktop
            : key === 'mobile'
              ? this.locators.deviceToggleMobile
              : key === 'ios'
                ? this.locators.deviceToggleIos
                : key === 'android'
                  ? this.locators.deviceToggleAndroid
                  : null;
      if (!loc || !(await loc.isVisible().catch(() => false))) continue;
      const now = (await loc.getAttribute('class').catch(() => '')) || '';
      const wasGrayed = /grayed/i.test(cls);
      const isGrayed = /grayed/i.test(now);
      if (wasGrayed !== isGrayed) {
        await loc.click({ force: true }).catch(() => undefined);
        await this.page.waitForTimeout(400);
      }
    }
    await this.page.waitForTimeout(500);
  }

  async recoverPage(): Promise<void> {
    await this.closeOverlays();
    try {
      if (!/revenue-attribution/i.test(this.page.url())) {
        await this.openViaNavigation();
        return;
      }
      await this.ensureProfileSiteSelected();
      // Soft settle — avoid long poll if already on home with title
      const titleOk = /(?:Revenue|Numbers)\s+Attribution/i.test(await this.getPageTitleText());
      if (titleOk) {
        await this.page.waitForTimeout(800);
        return;
      }
      await this.expectCoreReady();
    } catch {
      await this.openViaNavigation();
    }
  }

  /** Prefer DOM text from attribution value hosts (labels may live in siblings). */
  async getCardsSample(max = 6000): Promise<string> {
    const evaluated = await this.page
      .evaluate(`(() => {
        const ids = [
          'total-attribution-card-container',
          'all-devices-card',
          'rev-attr-values-all_devices',
          'rev-attr-values-desktop',
          'rev-attr-values-ios',
          'rev-attr-values-android',
          'page-contents'
        ];
        const chunks = [];
        for (const id of ids) {
          const el = document.getElementById(id);
          if (el) chunks.push((el.innerText || el.textContent || '').replace(/\\s+/g, ' ').trim());
        }
        if (!chunks.some((c) => /Experience Influences|Marketing Influences|KPI Change/i.test(c))) {
          const body = (document.body && (document.body.innerText || document.body.textContent)) || '';
          chunks.push(body.replace(/\\s+/g, ' ').trim().slice(0, 12000));
        }
        return chunks.filter(Boolean).join(' | ');
      })()`)
      .catch(() => '');
    return String(evaluated || '').slice(0, max);
  }

  async openFiltersDrawer(): Promise<void> {
    await this.closeOverlays();
    if (
      (await this.locators.cancelFilters.isVisible().catch(() => false)) ||
      (await this.locators.applyFilters.isVisible().catch(() => false))
    ) {
      return;
    }
    const toggle = (await this.locators.toggleFilters.isVisible().catch(() => false))
      ? this.locators.toggleFilters
      : this.locators.mobileFiltersBtn;
    await toggle.click({ force: true });
    await this.page.waitForTimeout(1200);
    const opened =
      (await this.locators.cancelFilters.isVisible().catch(() => false)) ||
      (await this.locators.applyFilters.isVisible().catch(() => false)) ||
      (await this.page.getByText(/Date of Performance Change|Save\s*&\s*Run Report/i).first().isVisible().catch(() => false));
    if (!opened) {
      await this.page.locator('#toggle-filters, #mobile-controls-filters-btn, #filter-config').first().click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(1000);
    }
  }

  async cancelFiltersDrawer(): Promise<void> {
    if (await this.locators.cancelFilters.isVisible().catch(() => false)) {
      await this.locators.cancelFilters.click({ force: true }).catch(() => undefined);
    } else {
      await this.page.keyboard.press('Escape').catch(() => undefined);
    }
    await this.page.waitForTimeout(400);
  }

  /** Soft sample report options without creating a new report. */
  async softSampleReportList(): Promise<{ count: number; sample: string[]; note: string }> {
    await this.closeOverlays();
    if (!(await this.locators.reportList.isVisible().catch(() => false))) {
      return { count: 0, sample: [], note: 'report-list not visible' };
    }
    await this.locators.reportList.click({ force: true }).catch(() => undefined);
    await this.page.waitForTimeout(700);
    const opts = this.page.locator(
      '#report-list option, #report-list li, .select2-results__option, .dropdown-menu li, [role="option"]'
    );
    const n = await opts.count().catch(() => 0);
    const sample: string[] = [];
    for (let i = 0; i < Math.min(n, 8); i++) {
      const t = ((await opts.nth(i).innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
      if (t) sample.push(t.slice(0, 160));
    }
    // Also parse body lines if options empty (custom list UI)
    if (!sample.length) {
      const body = await this.getBodySample(3500);
      const matches = body.match(/\[[\d-]+\][^\[]{0,100}Date of Performance Change:\s*[\d-]+/gi) || [];
      sample.push(...matches.slice(0, 6).map((s) => s.slice(0, 160)));
    }
    await this.page.keyboard.press('Escape').catch(() => undefined);
    await this.page.waitForTimeout(300);
    return {
      count: Math.max(n, sample.length),
      sample,
      note: `report options≈${Math.max(n, sample.length)}; sample0="${sample[0] || ''}"`,
    };
  }

  async softSwitchExistingReport(): Promise<{ switched: boolean; note: string }> {
    const before = await this.getReportLabel();
    const select = this.locators.reportList;
    if (!(await select.isVisible().catch(() => false))) {
      return { switched: false, note: 'report-list not visible' };
    }

    // Native <select> path
    const tag = await select.evaluate((el) => el.tagName.toLowerCase()).catch(() => '');
    if (tag === 'select') {
      const options = await select.locator('option').allTextContents().catch(() => [] as string[]);
      const currentVal = await select.inputValue().catch(() => '');
      const alt = options.find((o, i) => {
        const v = o.trim();
        return v && i > 0 && v.slice(0, 40) !== before.slice(0, 40);
      });
      if (alt) {
        await select.selectOption({ label: alt }).catch(async () => {
          const opts = select.locator('option');
          const n = await opts.count();
          if (n > 1) await select.selectOption({ index: 1 }).catch(() => undefined);
        });
        await this.page.waitForTimeout(2500);
        await this.dismissCoaches();
        await this.expectCoreReady().catch(() => undefined);
        const after = await this.getReportLabel();
        return {
          switched: true,
          note: `select reportSwitch before="${before.slice(0, 60)}" after="${after.slice(0, 60)}" valWas=${currentVal.slice(0, 40)}`,
        };
      }
    }

    await select.click({ force: true }).catch(() => undefined);
    await this.page.waitForTimeout(700);
    const opts = this.page.locator(
      '#report-list option, .select2-results__option, .dropdown-menu li a, [role="option"], #report-list li'
    );
    const n = await opts.count().catch(() => 0);
    let switched = false;
    for (let i = 0; i < Math.min(n, 20); i++) {
      const el = opts.nth(i);
      const t = ((await el.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
      if (!t || t.slice(0, 40) === before.slice(0, 40)) continue;
      if (/Date of Performance Change|Ad-Hoc|\[[\d-]+\]/i.test(t)) {
        await el.click({ force: true }).catch(() => undefined);
        switched = true;
        break;
      }
    }
    if (!switched && n > 1) {
      await opts.nth(Math.min(2, n - 1)).click({ force: true }).catch(() => undefined);
      switched = true;
    }
    await this.page.waitForTimeout(2500);
    await this.dismissCoaches();
    await this.expectCoreReady().catch(() => undefined);
    const after = await this.getReportLabel();
    await this.page.keyboard.press('Escape').catch(() => undefined);
    return {
      switched,
      note: `reportSwitch beforeLen=${before.length} afterLen=${after.length} changed=${before.slice(0, 80) !== after.slice(0, 80)}`,
    };
  }

  async softToggleDevice(device: 'all_devices' | 'desktop' | 'mobile' | 'ios' | 'android'): Promise<{
    note: string;
    toggled: boolean;
  }> {
    const loc =
      device === 'all_devices'
        ? this.locators.deviceToggleAll
        : device === 'desktop'
          ? this.locators.deviceToggleDesktop
          : device === 'mobile'
            ? this.locators.deviceToggleMobile
            : device === 'ios'
              ? this.locators.deviceToggleIos
              : this.locators.deviceToggleAndroid;
    if (!(await loc.isVisible().catch(() => false))) {
      return { toggled: false, note: `device toggle ${device} not visible` };
    }
    const before = (await loc.getAttribute('class').catch(() => '')) || '';
    const wasGrayed = /grayed/i.test(before);
    await loc.click({ force: true });
    await this.page.waitForTimeout(900);
    const mid = (await loc.getAttribute('class').catch(() => '')) || '';
    // Restore original grayed/primary state
    const midGrayed = /grayed/i.test(mid);
    if (midGrayed !== wasGrayed) {
      await loc.click({ force: true });
      await this.page.waitForTimeout(700);
    }
    const after = (await loc.getAttribute('class').catch(() => '')) || '';
    // Force restore if still mismatched
    if (/grayed/i.test(after) !== wasGrayed) {
      await loc.click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(500);
    }
    return {
      toggled: true,
      note: `device=${device} grayedBefore=${wasGrayed} mid=${midGrayed} restoredGrayed=${/grayed/i.test((await loc.getAttribute('class').catch(() => '')) || '')}`,
    };
  }

  async softSwitchTableTab(tab: 'desktop' | 'mobile' | 'ios' | 'android'): Promise<{ note: string; ok: boolean }> {
    const loc =
      tab === 'desktop'
        ? this.locators.desktopTableSectionTab
        : tab === 'mobile'
          ? this.locators.mobileTableSectionTab
          : tab === 'ios'
            ? this.locators.iosTableSectionTab
            : this.locators.androidTableSectionTab;
    if (!(await loc.isVisible().catch(() => false))) {
      return { ok: false, note: `table tab ${tab} not visible` };
    }
    await loc.click({ force: true });
    await this.page.waitForTimeout(1000);
    const table =
      tab === 'desktop'
        ? this.locators.tableDesktop.or(this.locators.desktopPageTable)
        : tab === 'mobile'
          ? this.locators.tableMobile.or(this.locators.mobilePageTable)
          : tab === 'ios'
            ? this.locators.tableIos.or(this.locators.iosPageTable)
            : this.locators.tableAndroid.or(this.locators.androidPageTable);
    const graph =
      tab === 'desktop'
        ? this.locators.desktopPageGraph
        : tab === 'mobile'
          ? this.locators.mobilePageGraph
          : tab === 'ios'
            ? this.locators.iosPageGraph
            : this.locators.androidPageGraph;
    const tableVis = await table.first().isVisible().catch(() => false);
    const graphVis = await graph.isVisible().catch(() => false);
    const headers = ((await table.first().innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
    return {
      ok: true,
      note: `tab=${tab} tableVis=${tableVis} graphVis=${graphVis} headersSoft=${/Page Name|Performance|Traffic|Onload/i.test(headers)}`,
    };
  }

  async softOpenAddComparison(): Promise<boolean> {
    await this.closeOverlays();
    if (!(await this.locators.addComparison.isVisible().catch(() => false))) return false;
    await this.locators.addComparison.click({ force: true });
    await this.page.waitForTimeout(1000);
    const body = await this.getBodySample(2500);
    return /Add Comparison|Series Configuration|Comparison/i.test(body);
  }

  async softBrandAttributionRoundTrip(): Promise<{ note: string; restored: boolean }> {
    await new LeftNavPage(this.page).openSmokePage(BRAND_ATTR_DEF);
    await this.page.waitForTimeout(2500);
    await this.dismissCoaches();
    const mid = await this.getPageTitleText();
    await this.openViaNavigation();
    const restored = /(?:Revenue|Numbers)\s+Attribution/i.test(await this.getPageTitleText());
    return { note: `Visited Brand Attribution title="${mid}"; restored=${restored}`, restored };
  }

  async softCalculatorRoundTrip(): Promise<{ note: string; restored: boolean }> {
    const viaBtn = this.locators.revenueCalculatorBtnContainer.locator('a, button').first();
    if (await viaBtn.isVisible().catch(() => false)) {
      await viaBtn.click({ force: true }).catch(() => undefined);
    } else {
      await new LeftNavPage(this.page).openSmokePage(CALCULATOR_DEF);
    }
    await this.page.waitForTimeout(2500);
    await this.dismissCoaches();
    const mid = await this.getPageTitleText();
    await this.page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await this.page.waitForTimeout(1500);
    if (!/revenue-attribution/i.test(this.page.url())) {
      await this.openViaNavigation();
    } else {
      await this.waitForPageReady().catch(async () => this.openViaNavigation());
    }
    const restored = /(?:Revenue|Numbers)\s+Attribution/i.test(await this.getPageTitleText());
    return { note: `Visited Calculator title="${mid}"; restored=${restored}`, restored };
  }

  async softOpportunityRoundTrip(): Promise<{ note: string; restored: boolean }> {
    await new LeftNavPage(this.page).openSmokePage(OPPORTUNITY_DEF);
    await this.page.waitForTimeout(2500);
    await this.dismissCoaches();
    const mid = await this.getPageTitleText();
    await this.openViaNavigation();
    const restored = /(?:Revenue|Numbers)\s+Attribution/i.test(await this.getPageTitleText());
    return { note: `Visited="${mid}"; restored=${restored}`, restored };
  }

  async softLegendOrHoverPlatform(): Promise<{ note: string }> {
    const host = this.locators.allDevicesPlatformGraph.or(this.locators.desktopPlatformGraph).first();
    if (!(await host.isVisible().catch(() => false))) {
      return { note: 'Platform graph host soft-annotate not visible' };
    }
    await host.scrollIntoViewIfNeeded().catch(() => undefined);
    const box = await host.boundingBox().catch(() => null);
    if (box) {
      await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2).catch(() => undefined);
      await this.page.waitForTimeout(400);
    }
    const legend = host.locator('.highcharts-legend-item').first();
    if (await legend.isVisible().catch(() => false)) {
      await legend.click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(300);
      await legend.click({ force: true }).catch(() => undefined);
      return { note: 'Platform legend soft toggled' };
    }
    return { note: 'Platform hover soft sampled' };
  }

  async clearTableSearches(): Promise<void> {
    const searches = this.page.locator('input.tablesorter-filter, input[id*="table-search"]');
    const n = await searches.count().catch(() => 0);
    for (let i = 0; i < Math.min(n, 8); i++) {
      const el = searches.nth(i);
      if (await el.isVisible().catch(() => false)) {
        await el.fill('').catch(() => undefined);
      }
    }
  }
}
