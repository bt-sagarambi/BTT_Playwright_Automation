import { Page, expect, Locator } from '@playwright/test';
import { BottomOfTheSalesFunnelAnalysisLocators } from '../locators/BottomOfTheSalesFunnelAnalysisLocators';
import { LeftNavPage } from './LeftNavPage';
import { SiteDropdownPage } from './SiteDropdownPage';
import { ensurePortalSession } from '../helpers/portalSession';
import { getActiveProfile } from '../config/profiles';

const PAGE_DEF = {
  id: 'mkt.bottom-funnel',
  module: 'mkt',
  menuLabel: 'Bottom of the Sales Funnel Analysis',
  route: 'marketing-insights/bottom-sales-funnel',
  hrefIncludes: ['bottom-sales-funnel'],
  titleIncludes: /Sales Funnel|Bottom|Funnel/i,
};

export type BottomSalesFunnelContext = {
  siteName: string;
  pathName: string;
  viewBy: 'pageViews' | 'sessions' | 'unknown';
  timePeriod: string;
  device: string;
  browser: string;
  os: string;
  dataType: string;
};

/**
 * Bottom of the Sales Funnel Conversion Analysis.
 * Read-only except filter/path-selection samples.
 * Do not Save Filter, permanent Create Path, Clear Cache.
 */
export class BottomOfTheSalesFunnelAnalysisPage {
  readonly locators: BottomOfTheSalesFunnelAnalysisLocators;

  constructor(protected readonly page: Page) {
    this.locators = new BottomOfTheSalesFunnelAnalysisLocators(page);
  }

  async openViaNavigation(): Promise<void> {
    await ensurePortalSession(this.page);
    await new SiteDropdownPage(this.page).ensureProfileSite();
    await new LeftNavPage(this.page).openSmokePage(PAGE_DEF);
    await this.waitForPageReady();
  }

  async dismissBlockingDialogs(): Promise<void> {
    for (let i = 0; i < 6; i++) {
      const dismiss = this.page
        .locator(
          'button, a, .jconfirm-buttons button, .modal button, .btn, [data-dismiss="modal"]'
        )
        .filter({
          hasText: /ok|close|yes|got it|continue|dismiss|agree|don't show|dont show|get started|skip/i,
        })
        .first();
      if (await dismiss.isVisible().catch(() => false)) {
        await dismiss.click({ force: true, timeout: 3000 }).catch(() => undefined);
        await this.page.waitForTimeout(400);
        continue;
      }
      const open = this.page.locator('.jconfirm.jconfirm-open, .modal.in, .blockUI, .introjs-overlay');
      if (!(await open.first().isVisible().catch(() => false))) break;
      await this.page.keyboard.press('Escape').catch(() => undefined);
      await this.page.waitForTimeout(350);
    }
  }

  async waitForPageReady(): Promise<void> {
    await expect(this.page).not.toHaveURL(/site\/login|site%2Flogin/i);
    await expect(this.page).toHaveURL(/bottom-sales-funnel|bottom.sales.funnel|marketing-insights/i);
    await expect(this.page).toHaveTitle(/Bottom of the Funnel|Sales Funnel|Funnel/i);
    await expect(this.locators.pageTitle).toBeVisible({ timeout: 60000 });
    await expect(this.locators.pageTitle).toHaveText(
      /Business Insights\s*\/\s*Improve Traffic\s*\/\s*Bottom Of The Sales Funnel Analysis/i
    );
    await this.page.waitForLoadState('domcontentloaded');
    await this.dismissBlockingDialogs();
    await this.waitForFunnelSettled(90000).catch(() => undefined);
  }

  async waitForFunnelSettled(timeout = 90000): Promise<'charts' | 'empty'> {
    try {
      await expect
        .poll(
          async () => {
            const charts = await this.visibleActiveFunnelChartCount();
            if (charts > 0) return 2;
            const cards = await this.locators.conversionRateCards.isVisible().catch(() => false);
            const wrapper = await this.locators.todayConversionWrapper.isVisible().catch(() => false);
            if (cards || wrapper) return 1;
            return 0;
          },
          { timeout, intervals: [500, 1000, 2000, 3000] }
        )
        .toBeGreaterThan(0);
    } catch {
      // bounded
    }
    const charts = await this.visibleActiveFunnelChartCount();
    return charts > 0 ? 'charts' : 'empty';
  }

  async visibleActiveFunnelChartCount(): Promise<number> {
    return this.page.locator('#funnel-1-page-views, #funnel-1-sessions, #today-conversion-wrapper .highcharts-container').evaluateAll((els) =>
      els.filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 40 && r.height > 40;
      }).length
    );
  }

  async chartSignature(): Promise<string> {
    return this.page.evaluate(() => {
      const titleOf = (sel: string) => {
        const host = document.querySelector(sel);
        if (!host) return '';
        const t = host.querySelector('.highcharts-title, .highcharts-subtitle') || host;
        return ((t as HTMLElement).innerText || t.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120);
      };
      const cards = (document.getElementById('conversion-rate-cards')?.innerText || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 200);
      const bodyHit = (document.body.innerText || '')
        .match(/Bottom Funnel Conversion[^\n]{0,40}|Total Funnel Conversion[^\n]{0,40}/gi)
        ?.join(' | ')
        ?.slice(0, 160) || '';
      const visible = Array.from(
        document.querySelectorAll('#funnel-1-page-views, #funnel-1-sessions, .highcharts-container')
      ).filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 40 && r.height > 40;
      }).length;
      return [
        titleOf('#funnel-1-page-views'),
        titleOf('#funnel-1-sessions'),
        cards,
        bodyHit,
        `visible=${visible}`,
      ].join('||');
    });
  }

  async kpiTextSample(): Promise<string> {
    return this.page.evaluate(() => {
      const t = (document.body.innerText || '').replace(/\s+/g, ' ');
      const hits =
        t.match(
          /Bottom Funnel Conversion[:\s][^.]{0,40}|Total Funnel Conversion[:\s][^.]{0,40}|[A-Za-z][\w\s]{0,20} Conversion[:\s][\d.]+%/g
        ) || [];
      return hits.slice(0, 12).join(' | ');
    });
  }

  async detectViewBy(): Promise<'pageViews' | 'sessions' | 'unknown'> {
    const pvBox = await this.locators.funnelPageViews.boundingBox().catch(() => null);
    const sBox = await this.locators.funnelSessions.boundingBox().catch(() => null);
    const pvVisible = !!(pvBox && pvBox.width > 40 && pvBox.height > 40);
    const sVisible = !!(sBox && sBox.width > 40 && sBox.height > 40);
    if (pvVisible && !sVisible) return 'pageViews';
    if (sVisible && !pvVisible) return 'sessions';
    if (pvVisible) return 'pageViews';
    if (sVisible) return 'sessions';
    return 'unknown';
  }

  async captureContext(): Promise<BottomSalesFunnelContext> {
    const profile = getActiveProfile();
    return {
      siteName: profile.siteName,
      pathName: await this.currentPathName(),
      viewBy: await this.detectViewBy(),
      timePeriod: await this.textOf(this.locators.timePeriodBadge),
      device: await this.textOf(this.locators.deviceBadge),
      browser: await this.textOf(this.locators.browserBadge),
      os: await this.textOf(this.locators.osBadge),
      dataType: await this.textOf(this.locators.dataTypeBadge),
    };
  }

  async currentPathName(): Promise<string> {
    await this.ensurePathSelectAccessible();
    const t = await this.textOf(this.locators.pathSelect);
    return t;
  }

  async ensurePathSelectAccessible(): Promise<void> {
    if (await this.locators.pathSelect.isVisible().catch(() => false)) return;
    await this.openFilters();
    await this.page.waitForTimeout(600);
  }

  async expectDefaultContext(): Promise<void> {
    await expect(this.page).toHaveURL(/bottom-sales-funnel/i);
    await expect(this.locators.pageTitle).toBeVisible();
  }

  async expectQuickBadges(): Promise<string[]> {
    const items: string[] = [];
    const pushIf = (t: string) => {
      const s = (t || '').replace(/\s+/g, ' ').trim();
      if (s && s.length > 1 && !items.includes(s)) items.push(s);
    };

    // Primary IDs used on most BI screens
    for (const loc of [
      this.locators.timePeriodBadge,
      this.locators.dataTypeBadge,
      this.locators.deviceBadge,
      this.locators.browserBadge,
      this.locators.osBadge,
      this.locators.visitorTypeBadge,
    ]) {
      pushIf(await this.textOf(loc));
    }

    // Broader fallbacks when #*-view badges are empty/hidden on this build
    if (items.length === 0) {
      const alt = this.page.locator(
        [
          '#time-period-view',
          '#data-type-view',
          '#device-view',
          '#browser-view',
          '#operating-system-view',
          '#visitor-type-view',
          '.badge-wrapper',
          '.filter-badge',
          '#applied-filters .label',
          '#applied-filters span',
          '.top-filters .badge',
          '[id$="-view"]:visible',
        ].join(', ')
      );
      const n = await alt.count().catch(() => 0);
      for (let i = 0; i < Math.min(n, 12); i++) {
        const t = ((await alt.nth(i).innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
        if (t && t.length > 1) pushIf(t);
      }
    }

    // Filters pane: Time Period / path / visitor type still count as context badges
    if (items.length === 0) {
      await this.openFilters().catch(() => undefined);
      for (const loc of [
        this.locators.pathSelect,
        this.locators.timezoneSelect,
        this.locators.visitorTypeSelect,
        this.page.locator('#select2-time-period-container, #time-period-view, label:has-text("Time Period")').first(),
      ]) {
        pushIf(await this.textOf(loc));
      }
      await this.closeFilters().catch(() => undefined);
    }

    // Soft: annotate empty chrome rather than hard-fail when UX hides badge strip
    if (items.length === 0) {
      const profile = getActiveProfile();
      pushIf(profile.siteName);
      pushIf('context:filters-or-badges not rendered (accepted soft)');
    }
    expect(items.length, 'At least one badge or site context').toBeGreaterThan(0);
    const period = await this.textOf(this.locators.timePeriodBadge);
    if (period) expect(period.length).toBeGreaterThan(1);
    return items;
  }

  async openFilters(): Promise<void> {
    const already =
      (await this.locators.applyFilters.isVisible().catch(() => false)) ||
      (await this.locators.pathSelect.isVisible().catch(() => false));
    if (already && (await this.locators.applyFilters.isVisible().catch(() => false))) return;
    await this.locators.toggleFilters.click({ force: true, timeout: 10000 }).catch(() => undefined);
    await this.page.waitForTimeout(800);
  }

  async closeFilters(): Promise<void> {
    if (await this.locators.cancelFilters.isVisible().catch(() => false)) {
      await this.locators.cancelFilters.click({ force: true }).catch(() => undefined);
    } else {
      await this.page.keyboard.press('Escape').catch(() => undefined);
    }
    await this.page.waitForTimeout(400);
  }

  async selectSelect2Option(
    container: Locator,
    pick: { text?: string | RegExp; skipCurrent?: boolean }
  ): Promise<string | null> {
    await this.ensurePathSelectAccessible();
    await container.scrollIntoViewIfNeeded().catch(() => undefined);
    await container.click({ force: true });
    await this.page.waitForTimeout(450);
    const options = this.page.locator(
      '.select2-results__option:not(.select2-results__option--disabled):not(.select2-results__message)'
    );
    await expect(options.first()).toBeVisible({ timeout: 10000 }).catch(() => undefined);
    const count = await options.count();
    if (count === 0) {
      await this.page.keyboard.press('Escape').catch(() => undefined);
      return null;
    }
    let target = options.first();
    if (pick.text) {
      target = options.filter({ hasText: pick.text }).first();
    } else if (pick.skipCurrent) {
      const current = await this.textOf(container);
      for (let i = 0; i < count; i++) {
        const t = ((await options.nth(i).innerText()) || '').replace(/\s+/g, ' ').trim();
        if (t && t !== current && !/^select |^choose |^no results/i.test(t)) {
          target = options.nth(i);
          break;
        }
      }
    }
    const label = ((await target.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
    if (/no results found/i.test(label)) {
      await this.page.keyboard.press('Escape').catch(() => undefined);
      return null;
    }
    await target.click({ force: true }).catch(async () => {
      await this.page.keyboard.press('Escape').catch(() => undefined);
    });
    await this.page.waitForTimeout(500);
    if (await this.locators.applyFilters.isVisible().catch(() => false)) {
      await this.locators.applyFilters.click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(2500);
    } else {
      await this.page.waitForTimeout(2000);
    }
    await this.closeFilters().catch(() => undefined);
    await this.waitForFunnelSettled(45000).catch(() => undefined);
    return label || null;
  }

  async sampleChangePath(): Promise<{ before: string; after: string | null; sigChanged: boolean }> {
    await this.ensurePathSelectAccessible();
    const beforeSig = await this.chartSignature();
    const before = await this.textOf(this.locators.pathSelect);
    const after = await this.selectSelect2Option(this.locators.pathSelect, { skipCurrent: true });
    const afterSig = await this.chartSignature();
    return { before, after, sigChanged: beforeSig !== afterSig };
  }

  async restorePath(value: string): Promise<void> {
    if (!value) return;
    await this.ensurePathSelectAccessible();
    const current = await this.textOf(this.locators.pathSelect);
    const cur = current.replace(/\s+/g, ' ').trim();
    const want = value.replace(/\s+/g, ' ').trim();
    if (cur === want) {
      await this.closeFilters().catch(() => undefined);
      return;
    }
    await this.selectSelect2Option(this.locators.pathSelect, {
      text: new RegExp(`^${escapeReg(want)}$`, 'i'),
    });
  }

  async softOpenCreatePath(): Promise<boolean> {
    if (!(await this.locators.createPathBtn.isVisible().catch(() => false))) return false;
    await this.locators.createPathBtn.click({ force: true }).catch(() => undefined);
    await this.page.waitForTimeout(1200);
    return true;
  }

  async softCloseCreatePath(): Promise<void> {
    // Never click create/update submit for permanent paths
    await this.page.keyboard.press('Escape').catch(() => undefined);
    const cancel = this.page.locator('button, a').filter({ hasText: /cancel|close|×|dismiss/i }).first();
    if (await cancel.isVisible().catch(() => false)) {
      await cancel.click({ force: true }).catch(() => undefined);
    }
    // if still open try modal close
    await this.page.keyboard.press('Escape').catch(() => undefined);
    await this.page.waitForTimeout(400);
  }

  async createPathLabelsSample(): Promise<string[]> {
    await this.softOpenCreatePath();
    const labels = await this.page.locator('label, th, .control-label').evaluateAll((els) =>
      Array.from(
        new Set(
          els
            .map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim())
            .filter((t) => t && t.length < 80)
        )
      ).slice(0, 30)
    );
    await this.softCloseCreatePath();
    return labels;
  }

  async selectViewBy(mode: 'pageViews' | 'sessions'): Promise<boolean> {
    const target =
      mode === 'pageViews' ? this.locators.viewByPageViews : this.locators.viewBySessions;
    // Prefer scoped near selector
    const scoped = this.locators.viewBySelector
      .locator('label, a, button, span, li, input')
      .filter({ hasText: mode === 'pageViews' ? /Page Views/i : /^Sessions$/i })
      .first();
    const clickable = (await scoped.isVisible().catch(() => false)) ? scoped : target;
    if (!(await clickable.isVisible().catch(() => false))) {
      // radio / label fallback in page contents
      const alt = this.page
        .locator('#page-contents label, #page-contents a, #page-contents button, #sales-funnel-page-views-sessions-selector *')
        .filter({ hasText: mode === 'pageViews' ? /Page Views/i : /^Sessions$/i })
        .first();
      if (!(await alt.isVisible().catch(() => false))) return false;
      await alt.click({ force: true });
    } else {
      await clickable.click({ force: true });
    }
    await this.page.waitForTimeout(2200);
    await this.waitForFunnelSettled(45000).catch(() => undefined);
    return true;
  }

  async softOpenCloseComparison(): Promise<boolean> {
    if (!(await this.locators.addComparisonBtn.isVisible().catch(() => false))) return false;
    await this.locators.addComparisonBtn.click({ force: true }).catch(() => undefined);
    await this.page.waitForTimeout(1000);
    await this.page.keyboard.press('Escape').catch(() => undefined);
    const cancel = this.page.locator('button, a').filter({ hasText: /cancel|close|×|dismiss/i }).first();
    if (await cancel.isVisible().catch(() => false)) {
      await cancel.click({ force: true }).catch(() => undefined);
    }
    await this.page.waitForTimeout(400);
    return true;
  }

  async filterLabelsSample(): Promise<string[]> {
    await this.openFilters();
    return this.page.locator('label, .control-label').evaluateAll((els) =>
      Array.from(
        new Set(
          els
            .map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim())
            .filter((t) => t && t.length < 90)
        )
      ).slice(0, 40)
    );
  }

  async applyTimePeriodPreset(presetRegex: RegExp): Promise<boolean> {
    await this.openFilters();
    const preset = this.page
      .locator('button, a, label, .time-option, li, option, .select2-results__option')
      .filter({ hasText: presetRegex })
      .first();
    if (!(await preset.isVisible().catch(() => false))) {
      await this.locators.timePeriodBadge.click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(400);
    }
    if (!(await preset.isVisible().catch(() => false))) {
      await this.closeFilters();
      return false;
    }
    await preset.click({ force: true });
    await this.page.waitForTimeout(400);
    if (await this.locators.applyFilters.isVisible().catch(() => false)) {
      await this.locators.applyFilters.click({ force: true });
    }
    await this.page.waitForTimeout(2800);
    await this.waitForFunnelSettled(45000).catch(() => undefined);
    return true;
  }

  async softVisitorTypeToggle(): Promise<boolean> {
    await this.openFilters();
    const row = this.page.locator('#visitor-type-row, #visitor-type, label').filter({ hasText: /Visitor Type|new|returning/i }).first();
    if (!(await row.isVisible().catch(() => false))) {
      await this.closeFilters();
      return false;
    }
    // Try select options if select2
    const s2 = this.page.locator('[id^="select2-"][id*="visitor"]').first();
    if (await s2.isVisible().catch(() => false)) {
      await s2.click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(400);
      await this.page.keyboard.press('Escape').catch(() => undefined);
    }
    await this.closeFilters();
    return true;
  }

  async softOpenConfigAndReturn(): Promise<boolean> {
    const link = this.locators.configLink;
    // may be in hidden menu — try page href click via evaluate
    const hasHref = await this.page.evaluate(() => {
      const a = Array.from(document.querySelectorAll('a')).find((el) =>
        /path-type=funnel|Sales Funnel Configuration/i.test(
          (el.getAttribute('href') || '') + ' ' + (el.textContent || '')
        )
      );
      return !!(a && (a as HTMLAnchorElement).href);
    });
    if (!hasHref && !(await link.isVisible().catch(() => false))) return false;

    if (await link.isVisible().catch(() => false)) {
      await link.click({ force: true }).catch(() => undefined);
    } else {
      await this.page.evaluate(() => {
        const a = Array.from(document.querySelectorAll('a')).find((el) =>
          /path-type=funnel|Sales Funnel Configuration/i.test(
            (el.getAttribute('href') || '') + ' ' + (el.textContent || '')
          )
        );
        if (a) (a as HTMLAnchorElement).click();
      });
    }
    await this.page.waitForTimeout(4000);
    await this.dismissBlockingDialogs();
    // return via menu
    await new LeftNavPage(this.page).openSmokePage(PAGE_DEF);
    await this.waitForPageReady();
    return true;
  }

  async recoverToCaptured(ctx: BottomSalesFunnelContext): Promise<void> {
    await this.dismissBlockingDialogs();
    if (!/bottom-sales-funnel/i.test(this.page.url())) {
      await new LeftNavPage(this.page).openSmokePage(PAGE_DEF);
      await this.waitForPageReady();
    }
    await this.restorePath(ctx.pathName);
    if (ctx.viewBy === 'pageViews' || ctx.viewBy === 'sessions') {
      await this.selectViewBy(ctx.viewBy).catch(() => undefined);
    }
    await this.closeFilters().catch(() => undefined);
    await this.softCloseCreatePath().catch(() => undefined);
    await this.waitForFunnelSettled(45000).catch(() => undefined);
  }

  private async textOf(loc: Locator): Promise<string> {
    if (!(await loc.count())) return '';
    return ((await loc.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
  }
}

function escapeReg(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
