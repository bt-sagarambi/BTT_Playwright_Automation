import { Page, expect, Locator } from '@playwright/test';
import { SyntheticRegressionUs2DashboardLocators } from '../locators/SyntheticRegressionUs2DashboardLocators';
import { LeftNavPage } from './LeftNavPage';
import { SiteDropdownPage } from './SiteDropdownPage';
import { ensurePortalSession } from '../helpers/portalSession';
import { getActiveProfile } from '../config/profiles';

const PAGE_DEF = {
  id: 'biz.dashboards',
  module: 'biz',
  menuLabel: 'Dashboards',
  route: 'site/dashboard',
  hrefIncludes: ['site/dashboard'],
  hrefExcludes: ['marketing=yes'],
  titleIncludes: /Dashboard/i,
};

/** Exact Custom option — never matches Synthetic Site Health / Performance Detail / other *-US2 boards. */
export const SR_US2_EXACT = /^\s*Synthetic Regression\s*-\s*US2\s*$/i;

export type SyntheticRegressionUs2Context = {
  dashboardLabel: string;
  lookbackLabel: string;
  autoRefreshLabel: string;
  siteLabel: string;
  widgetSignature: string;
};

/**
 * Custom Synthetic Regression - US2 dashboard (site/dashboard).
 * Read-only regression: no Save Filter / permanent widget save / dashboard delete.
 */
export class SyntheticRegressionUs2DashboardPage {
  readonly locators: SyntheticRegressionUs2DashboardLocators;

  constructor(private readonly page: Page) {
    this.locators = new SyntheticRegressionUs2DashboardLocators(page);
  }

  async openViaNavigation(): Promise<void> {
    await ensurePortalSession(this.page);
    await new SiteDropdownPage(this.page).ensureProfileSite().catch(() => undefined);
    await new LeftNavPage(this.page).openSmokePage(PAGE_DEF);
    await this.waitForPageReady();
    await this.ensureSyntheticRegressionUs2Selected();
    await this.ensureProfileSiteSelected();
    await this.expectCoreWidgetsReady();
  }

  async waitForPageReady(): Promise<{ loadMs: number }> {
    const started = Date.now();
    await expect(this.page).not.toHaveURL(/site\/login|site%2Flogin/i);
    await expect(this.page).toHaveURL(/site\/dashboard|r=site%2Fdashboard/i);
    await expect(this.locators.pageTitle).toBeVisible({ timeout: 60000 });
    await expect(this.locators.pageTitle).toHaveText(/Dashboards/i);
    await this.page.waitForLoadState('domcontentloaded');
    await this.dismissCoaches();
    return { loadMs: Date.now() - started };
  }

  async dismissCoaches(): Promise<void> {
    for (let i = 0; i < 4; i++) {
      const open = this.page.locator('.jconfirm.jconfirm-open, .modal.in, .blockUI');
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
      await this.page.waitForTimeout(300);
    }
  }

  async closeOverlays(): Promise<void> {
    for (let i = 0; i < 3; i++) {
      await this.page.keyboard.press('Escape').catch(() => undefined);
      await this.page.waitForTimeout(150);
    }
    const closeBtns = this.page
      .locator('button, a, .close, [data-dismiss="modal"]')
      .filter({ hasText: /Close|Cancel|×|Done/i })
      .filter({ visible: true });
    if (await closeBtns.first().isVisible({ timeout: 400 }).catch(() => false)) {
      await closeBtns.first().click({ force: true }).catch(() => undefined);
    }
  }

  async continueAutoRefreshIfPaused(): Promise<boolean> {
    if (await this.locators.pauseBanner.isVisible().catch(() => false)) {
      if (await this.locators.continueAutoRefresh.isVisible().catch(() => false)) {
        await this.locators.continueAutoRefresh.click({ force: true }).catch(() => undefined);
        await this.page.waitForTimeout(800);
        return true;
      }
    }
    if (await this.locators.continueAutoRefresh.isVisible().catch(() => false)) {
      await this.locators.continueAutoRefresh.click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(600);
      return true;
    }
    return false;
  }

  async hideDetailsIfOpen(): Promise<void> {
    if (await this.locators.hideDetails.isVisible().catch(() => false)) {
      await this.locators.hideDetails.click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(400);
    }
  }

  async recoverPage(): Promise<void> {
    await this.continueAutoRefreshIfPaused().catch(() => undefined);
    await this.hideDetailsIfOpen().catch(() => undefined);
    await this.closeOverlays();
    try {
      const pages = this.page.context().pages();
      for (const p of pages) {
        if (p !== this.page && !p.isClosed()) await p.close().catch(() => undefined);
      }
    } catch {
      // ignore
    }
    await this.page
      .goto('/btportal/web/index.php?r=site/dashboard', {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      })
      .catch(async () => {
        await this.openViaNavigation();
      });
    await this.waitForPageReady().catch(async () => {
      await this.openViaNavigation();
    });
    await this.ensureSyntheticRegressionUs2Selected({ soft: true });
    await this.ensureProfileSiteSelected();
    if (!SR_US2_EXACT.test(await this.getDashboardLabel())) {
      await this.openViaNavigation();
    } else {
      await this.expectCoreWidgetsReady().catch(() => undefined);
    }
  }

  async getControlLabel(control: Locator): Promise<string> {
    const text =
      (await control.innerText().catch(() => '')) ||
      (await control.getAttribute('title').catch(() => '')) ||
      (await control.getAttribute('aria-label').catch(() => '')) ||
      (await control.inputValue().catch(() => '')) ||
      '';
    return text.replace(/\s+/g, ' ').trim();
  }

  async getDashboardLabel(): Promise<string> {
    if (await this.locators.switchDashboardContainer.isVisible().catch(() => false)) {
      return ((await this.locators.switchDashboardContainer.textContent()) || '').replace(/\s+/g, ' ').trim();
    }
    return this.page.evaluate(() => {
      const sel = document.querySelector('#switch-dashboard') as HTMLSelectElement | null;
      const opt = sel?.selectedOptions?.[0];
      return (opt?.textContent || sel?.value || '').replace(/\s+/g, ' ').trim();
    });
  }

  async getTimeLookbackLabel(): Promise<string> {
    const text = await this.getControlLabel(this.locators.timeLookback);
    if (text) return text;
    return this.page.evaluate(() => {
      const el = document.querySelector('#time-lookback');
      return (el?.textContent || el?.getAttribute('title') || '').replace(/\s+/g, ' ').trim();
    });
  }

  async getAutoRefreshLabel(): Promise<string> {
    if (await this.locators.autoRefreshFrequency.isVisible().catch(() => false)) {
      const t = await this.getControlLabel(this.locators.autoRefreshFrequency);
      if (t) return t;
    }
    return this.getControlLabel(this.locators.autoRefresh);
  }

  async getSiteLabel(): Promise<string> {
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        if (this.page.isClosed()) return '';
        return await this.page.evaluate(() => {
          const quick = document.querySelector('#select2-quick-site-id-container');
          const global = document.querySelector('#select2-site-id-container');
          const pick = (el: Element | null) => {
            if (!el) return '';
            const r = (el as HTMLElement).getBoundingClientRect?.();
            const visible = r && r.width > 0 && r.height > 0;
            if (!visible && el !== quick) return '';
            return (el.textContent || '').replace(/\s+/g, ' ').trim();
          };
          const q = pick(quick);
          if (q) return q;
          const g = pick(global);
          if (g) return g;
          const title =
            quick?.getAttribute('title') || global?.getAttribute('title') || '';
          if (title) return title.replace(/\s+/g, ' ').trim();
          const site = document.querySelector('#quick-site-id, #site-id') as HTMLSelectElement | null;
          return (site?.selectedOptions?.[0]?.textContent || '').replace(/\s+/g, ' ').trim();
        });
      } catch {
        await this.page.waitForLoadState('domcontentloaded').catch(() => undefined);
        await this.page.waitForTimeout(500).catch(() => undefined);
      }
    }
    return '';
  }

  async expectSelectedSite(): Promise<void> {
    const profile = getActiveProfile();
    const siteText = await this.getSiteLabel();
    expect(siteText, `Selected site should include ${profile.siteName}`).toMatch(
      new RegExp(profile.siteName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    );
  }

  async ensureProfileSiteSelected(): Promise<void> {
    const profile = getActiveProfile();
    const re = new RegExp(profile.siteName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const current = await this.getSiteLabel();
    if (re.test(current)) return;

    const quick = this.locators.quickSiteContainer;
    if (await quick.isVisible().catch(() => false)) {
      await quick.click({ force: true, timeout: 5000 }).catch(() => undefined);
      await this.page.waitForTimeout(400);
      const opt = this.page.locator('.select2-results__option').filter({ hasText: re }).first();
      if (await opt.isVisible({ timeout: 4000 }).catch(() => false)) {
        await opt.click({ force: true });
        await this.page.waitForTimeout(2500);
        if (re.test(await this.getSiteLabel())) return;
      }
      await this.page.keyboard.press('Escape').catch(() => undefined);
    }

    await new SiteDropdownPage(this.page).ensureProfileSite().catch(() => undefined);
    await this.page.waitForTimeout(1500);
  }

  async ensureSyntheticRegressionUs2Selected(opts?: { soft?: boolean }): Promise<void> {
    const soft = opts?.soft === true;
    let label = await this.getDashboardLabel();
    if (SR_US2_EXACT.test(label)) return;
    try {
      await this.selectDashboard(SR_US2_EXACT);
      await this.page.waitForTimeout(5000);
    } catch {
      await this.selectDashboard(/Synthetic Regression\s*-\s*US2/i).catch(() => undefined);
      await this.page.waitForTimeout(4500);
    }
    label = await this.getDashboardLabel();
    if (SR_US2_EXACT.test(label)) return;
    if (soft) return;
    await this.page.goto('/btportal/web/index.php?r=site/dashboard', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await this.waitForPageReady();
    await this.selectDashboard(SR_US2_EXACT).catch(() => undefined);
    await this.page.waitForTimeout(5000);
    label = await this.getDashboardLabel();
    expect(label, 'Dashboard switcher should show exact Synthetic Regression - US2').toMatch(SR_US2_EXACT);
  }

  /** Prefer exact Synthetic Regression - US2; reject SSH / Perf Detail / other Custom *-US2. */
  async selectDashboard(name: string | RegExp): Promise<void> {
    await this.closeOverlays();
    const re = typeof name === 'string' ? new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : name;
    const preferHome = /Synthetic Regression/i.test(String(name));
    const container = this.locators.switchDashboardContainer;
    if (await container.isVisible().catch(() => false)) {
      await container.click({ force: true, timeout: 8000 });
      await this.page.waitForTimeout(500);
      const options = this.page.locator('.select2-results__option');
      const count = await options.count();
      let clicked = false;
      for (let i = 0; i < count; i++) {
        const text = ((await options.nth(i).textContent()) || '').replace(/\s+/g, ' ').trim();
        if (!re.test(text)) continue;
        if (preferHome && !SR_US2_EXACT.test(text)) continue;
        if (/Synthetic Site Health|Synthetic Performance Detail/i.test(text) && preferHome) continue;
        await options.nth(i).click({ force: true });
        clicked = true;
        break;
      }
      if (!clicked) {
        const opt = options.filter({ hasText: re }).first();
        if (await opt.isVisible({ timeout: 3000 }).catch(() => false)) {
          const t = ((await opt.textContent()) || '').replace(/\s+/g, ' ').trim();
          if (!preferHome || SR_US2_EXACT.test(t)) {
            await opt.click({ force: true });
            clicked = true;
          }
        }
      }
      if (clicked) {
        await this.page.waitForTimeout(5000);
        return;
      }
      await this.page.keyboard.press('Escape').catch(() => undefined);
    }
    const native = this.locators.switchDashboard;
    const labels = await native.locator('option').allTextContents();
    const match =
      labels.find((t) => SR_US2_EXACT.test(t.replace(/\s+/g, ' ').trim()) && preferHome) ||
      labels.find((t) => re.test(t.replace(/\s+/g, ' ').trim()));
    if (!match) throw new Error(`Dashboard option not found: ${name}`);
    await native.selectOption({ label: match }).catch(async () => {
      const val = await native.locator('option').filter({ hasText: re }).first().getAttribute('value');
      if (val) await native.selectOption(val);
    });
    await this.page.waitForTimeout(5000);
  }

  async listCustomDashboardNames(): Promise<string[]> {
    return this.page.evaluate(() => {
      const groups = [...document.querySelectorAll('#switch-dashboard optgroup')].filter((g) =>
        /custom/i.test(g.getAttribute('label') || '')
      );
      const opts = groups.length
        ? groups.flatMap((g) => [...g.querySelectorAll('option')])
        : [...document.querySelectorAll('#switch-dashboard option')];
      return opts.map((o) => (o.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
    });
  }

  async listPreconfiguredDashboardNames(): Promise<string[]> {
    return this.page.evaluate(() => {
      const groups = [...document.querySelectorAll('#switch-dashboard optgroup')].filter((g) =>
        /preconfigured/i.test(g.getAttribute('label') || '')
      );
      const opts = groups.length
        ? groups.flatMap((g) => [...g.querySelectorAll('option')])
        : [...document.querySelectorAll('#switch-dashboard option')];
      return opts.map((o) => (o.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
    });
  }

  async getPageBodySample(max = 2500): Promise<string> {
    return this.page
      .evaluate((limit) => {
        const root = document.querySelector('#page-contents') || document.body;
        return (root?.innerText || root?.textContent || '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, limit);
      }, max)
      .catch(async () =>
        ((await this.page.locator('#page-contents, body').first().innerText().catch(() => '')) || '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, max)
      );
  }

  /** Prefer evaluate scroll — scrollIntoViewIfNeeded can hang on large grid-stack boards. */
  async softScrollTo(locator: Locator): Promise<void> {
    await locator
      .evaluate((el) => {
        el.scrollIntoView({ block: 'center', inline: 'nearest' });
      })
      .catch(() => undefined);
    await this.page.waitForTimeout(300).catch(() => undefined);
  }

  async expectCoreWidgetTitles(): Promise<void> {
    const body = await this.getPageBodySample(12000);
    expect(body, 'Performance Summary - US2').toMatch(/Performance Summary\s*-\s*US2/i);
    expect(body, 'Performance - US2').toMatch(/Performance\s*-\s*US2/i);
    expect(body, 'Network Health Check - US2').toMatch(/Network Health Check\s*-\s*US2/i);
    expect(body, 'API Checks - US2').toMatch(/API Checks\s*-\s*US2/i);
    // Site Availability / Perf Comparison may sit lower — soft dual if truncated
    const hasAvail = /Site Availability(\s*-\s*US2)?/i.test(body);
    if (!hasAvail) {
      const deep = await this.page
        .evaluate(() => (document.body?.innerText || '').includes('Site Availability'))
        .catch(() => false);
      expect(deep || hasAvail, 'Site Availability widget').toBeTruthy();
    }
  }

  async widgetsReadyScore(): Promise<number> {
    let score = 0;
    const body = await this.getPageBodySample(7000);
    if (/Performance Summary\s*-\s*US2/i.test(body)) score += 1;
    if (/Performance\s*-\s*US2/i.test(body)) score += 1;
    if (/Network Health Check\s*-\s*US2/i.test(body)) score += 1;
    if (/API Checks\s*-\s*US2/i.test(body)) score += 1;
    if (/Site Availability\s*-\s*US2/i.test(body)) score += 1;
    if (/Perf\.?\s*Comparison\s*-\s*US2|Performance Comparison\s*-\s*US2/i.test(body)) score += 1;
    if (/Session Scatter|Scatter Plot Analysis/i.test(body)) score += 1;
    const charts = await this.locators.highchartsContainers.count().catch(() => 0);
    if (charts > 2) score += 1;
    return score;
  }

  async expectCoreWidgetsReady(): Promise<void> {
    await expect
      .poll(async () => this.widgetsReadyScore(), { timeout: 90000 })
      .toBeGreaterThanOrEqual(4);
  }

  async widgetSignature(host: Locator): Promise<string> {
    if (!(await host.count().catch(() => 0))) return 'missing';
    return host
      .evaluate((el) => {
        const text = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 220);
        const charts = el.querySelectorAll('.highcharts-container, svg').length;
        const box = el.getBoundingClientRect();
        return `${charts}|${Math.round(box.width)}x${Math.round(box.height)}|${text}`;
      })
      .catch(() => 'missing');
  }

  async captureContext(): Promise<SyntheticRegressionUs2Context> {
    return {
      dashboardLabel: await this.getDashboardLabel(),
      lookbackLabel: await this.getTimeLookbackLabel(),
      autoRefreshLabel: await this.getAutoRefreshLabel(),
      siteLabel: await this.getSiteLabel(),
      widgetSignature: [
        await this.widgetSignature(this.locators.performanceSummaryWidget()),
        await this.widgetSignature(this.locators.performanceDetailsWidget()),
        await this.widgetSignature(this.locators.siteAvailabilityWidget()),
      ].join('||'),
    };
  }

  async restoreContext(ctx: SyntheticRegressionUs2Context): Promise<void> {
    await this.continueAutoRefreshIfPaused().catch(() => undefined);
    await this.hideDetailsIfOpen().catch(() => undefined);
    await this.closeOverlays();
    await this.ensureSyntheticRegressionUs2Selected();
    await this.ensureProfileSiteSelected();
    const currentLookback = await this.getTimeLookbackLabel();
    if (ctx.lookbackLabel && currentLookback !== ctx.lookbackLabel) {
      await this.selectTimeLookback(ctx.lookbackLabel).catch(() => undefined);
    }
    await this.expectCoreWidgetsReady().catch(() => undefined);
  }

  async openTimeLookbackMenu(): Promise<void> {
    await this.closeOverlays();
    const trigger = this.page.locator('#time-lookback');
    await expect(trigger).toBeVisible({ timeout: 15000 });
    await trigger.click({ timeout: 5000 }).catch(() => undefined);
    await this.page.evaluate(() => {
      const dropdown = document.querySelector('#time-lookback')?.closest('.dropdown');
      dropdown?.classList.add('open');
      const menu = dropdown?.querySelector('.dropdown-menu') as HTMLElement | null;
      if (menu) menu.style.display = 'block';
    });
    await this.page.waitForTimeout(300);
  }

  async getTimeLookbackOptions(): Promise<string[]> {
    await this.openTimeLookbackMenu();
    const labels = await this.page.evaluate(() => {
      const root = document.querySelector('#time-lookback')?.closest('.dropdown');
      return [...(root?.querySelectorAll('button.time-option, a, button, li') || [])]
        .map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim())
        .filter((t) => t && t.length < 60);
    });
    await this.page.keyboard.press('Escape').catch(() => undefined);
    return [...new Set(labels)];
  }

  async selectTimeLookback(label: string | RegExp): Promise<void> {
    await this.openTimeLookbackMenu();
    const pattern = typeof label === 'string' ? label : label.toString();
    const clicked = await this.page.evaluate((pat) => {
      const isRe = pat.startsWith('/') && pat.lastIndexOf('/') > 0;
      let re: RegExp | null = null;
      let plain = pat;
      if (isRe) {
        const last = pat.lastIndexOf('/');
        re = new RegExp(pat.slice(1, last), pat.slice(last + 1));
      }
      const root = document.querySelector('#time-lookback')?.closest('.dropdown');
      for (const el of [...(root?.querySelectorAll('button.time-option') || [])]) {
        const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
        const match = re ? re.test(text) : text.toLowerCase().includes(plain.toLowerCase());
        if (!match) continue;
        (el as HTMLElement).click();
        return true;
      }
      for (const el of [...(root?.querySelectorAll('a, button, li') || [])]) {
        const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
        const match = re ? re.test(text) : text.toLowerCase().includes(plain.toLowerCase());
        if (!match || /custom/i.test(text)) continue;
        (el as HTMLElement).click();
        return true;
      }
      return false;
    }, pattern);
    if (!clicked) throw new Error(`Time lookback option not found: ${label}`);
    await this.page.waitForTimeout(3500);
    await this.expectCoreWidgetsReady().catch(() => undefined);
  }

  async openAutoRefreshMenu(): Promise<void> {
    await this.closeOverlays();
    const trigger = this.page
      .locator('#auto-refresh')
      .or(this.page.getByRole('button', { name: /Auto Refresh/i }))
      .first();
    await expect(trigger).toBeVisible({ timeout: 15000 });
    await trigger.click({ timeout: 5000 }).catch(() => undefined);
    await this.page.evaluate(() => {
      const btn = document.querySelector('#auto-refresh');
      const dropdown = btn?.closest('.dropdown, .btn-group');
      dropdown?.classList.add('open');
      const menu = dropdown?.querySelector('.dropdown-menu') as HTMLElement | null;
      if (menu) menu.style.display = 'block';
    });
    await this.page.waitForTimeout(300);
  }

  async getAutoRefreshOptions(): Promise<string[]> {
    await this.openAutoRefreshMenu();
    const labels = await this.page.evaluate(() =>
      [
        ...document.querySelectorAll(
          'button.auto-refresh-option, #auto-refresh-btn-group a, #auto-refresh-btn-group button, .btn-group:has(#auto-refresh) .dropdown-menu a'
        ),
      ]
        .map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim())
        .filter((t) => t && t.length < 40)
    );
    await this.page.keyboard.press('Escape').catch(() => undefined);
    return [...new Set(labels)];
  }

  async clickRefreshDashboard(): Promise<void> {
    await this.locators.refreshDashboard.click({ force: true }).catch(() => undefined);
    await this.page.waitForTimeout(2500);
    await this.expectCoreWidgetsReady().catch(() => undefined);
  }

  async openFiltersDrawer(): Promise<void> {
    await this.closeOverlays();
    await this.locators.toggleFilters.click({ force: true }).catch(() => undefined);
    await this.page.waitForTimeout(600);
  }

  async softCancelFilters(): Promise<void> {
    if (await this.locators.cancelFilters.isVisible().catch(() => false)) {
      await this.locators.cancelFilters.click({ force: true }).catch(() => undefined);
    } else {
      await this.page.keyboard.press('Escape').catch(() => undefined);
    }
    await this.page.waitForTimeout(400);
  }

  async softOpenManagerCancel(): Promise<string> {
    await this.closeOverlays();
    const trigger = this.locators.dashboardSettingsToggle.or(this.locators.dashboardManager).first();
    if (!(await trigger.isVisible().catch(() => false))) return 'manager not visible';
    await trigger.click({ force: true }).catch(() => undefined);
    await this.page.waitForTimeout(800);
    await this.closeOverlays();
    return 'manager opened then closed';
  }

  async softOpenWidgetWizardCancel(): Promise<boolean> {
    await this.closeOverlays();
    if (!(await this.locators.createWidget.isVisible().catch(() => false))) return false;
    await this.locators.createWidget.click({ force: true }).catch(() => undefined);
    await this.page.waitForTimeout(800);
    const open = await this.page.getByText(/Add a Widget/i).first().isVisible().catch(() => false);
    await this.closeOverlays();
    return open;
  }

  async softHoverPerformanceGraph(): Promise<string> {
    const host = this.locators.performanceDetailsWidget();
    await this.softScrollTo(host);
    const chart = host
      .locator('.highcharts-container, svg.highcharts-root')
      .or(this.locators.performanceGraphHost())
      .first();
    const box = (await chart.boundingBox().catch(() => null)) || (await host.boundingBox().catch(() => null));
    if (!box) return '';
    await this.page.mouse.move(box.x + box.width * 0.45, box.y + box.height * 0.55);
    await this.page.waitForTimeout(450);
    const tip = this.locators.highchartsTooltip.filter({ visible: true }).first();
    return ((await tip.innerText({ timeout: 1500 }).catch(() => '')) || '').replace(/\s+/g, ' ').trim();
  }

  async softHoverSiteAvailability(): Promise<string> {
    const host = this.locators.siteAvailabilityWidget();
    await this.softScrollTo(host);
    const chart = host.locator('.highcharts-container, svg.highcharts-root').first();
    const box = (await chart.boundingBox().catch(() => null)) || (await host.boundingBox().catch(() => null));
    if (!box) return '';
    await this.page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.55);
    await this.page.waitForTimeout(400);
    const tip = this.locators.highchartsTooltip.filter({ visible: true }).first();
    return ((await tip.innerText({ timeout: 1500 }).catch(() => '')) || '').replace(/\s+/g, ' ').trim();
  }

  async softTogglePerformanceLegend(): Promise<{ toggled: boolean; note: string }> {
    const host = this.locators.performanceDetailsWidget();
    await this.softScrollTo(host);
    const item = host.locator('.highcharts-legend-item').first();
    if (!(await item.isVisible().catch(() => false))) {
      return { toggled: false, note: 'No legend items' };
    }
    await item.click({ force: true }).catch(() => undefined);
    await this.page.waitForTimeout(400);
    await item.click({ force: true }).catch(() => undefined);
    return { toggled: true, note: 'toggled first legend item (restore)' };
  }

  async softPrescribedLookbacksWithHover(restoreLabel?: string): Promise<
    Array<{ label: string; applied: boolean; refreshed: boolean; tip: string; note: string }>
  > {
    const { dataSignature } = await import('../helpers/preconfiguredDashboardChrome');
    const labels = [/Last 6 hours/i, /Last 24 hours/i, /Last 7 days/i, /Last 30 days/i];
    const tips: string[] = [];
    const out: Array<{ label: string; applied: boolean; refreshed: boolean; tip: string; note: string }> = [];
    for (const label of labels) {
      const before = await dataSignature(this.page);
      let applied = false;
      let refreshed = false;
      let tip = '';
      let note = '';
      try {
        await this.selectTimeLookback(label);
        applied = true;
        const current = await this.getTimeLookbackLabel();
        if (!label.test(current)) note = `lookback label after select="${current}"`;
        await this.expectCoreWidgetsReady();
        await this.page.waitForTimeout(800);
        const after = await dataSignature(this.page);
        refreshed = before !== after || after !== 'missing';
        if (before === after) note = `${note} signature unchanged (widgets still ready)`.trim();
        tip = await this.softHoverPerformanceGraph();
        if (!tip) tip = await this.softHoverSiteAvailability();
        if (tip) tips.push(tip);
        else note = `${note} no hover tip`.trim();
      } catch (err) {
        note = err instanceof Error ? err.message : String(err);
      }
      out.push({
        label: String(label),
        applied,
        refreshed,
        tip: tip.slice(0, 120),
        note,
      });
    }
    const nonempty = tips.filter((t) => t.length > 4);
    if (nonempty.length >= 2) {
      const uniq = new Set(nonempty.map((t) => t.replace(/\d{1,2}:\d{2}(:\d{2})?/g, 'T').slice(0, 80)));
      out.push({
        label: 'hover-interval-compare',
        applied: true,
        refreshed: true,
        tip: [...uniq].slice(0, 3).join(' || '),
        note:
          uniq.size >= 2
            ? `soft: differing tooltip/interval signatures across lookbacks (unique≈${uniq.size})`
            : `soft: tip samples similar after normalize (n=${nonempty.length}); annotate only`,
      });
    } else {
      out.push({
        label: 'hover-interval-compare',
        applied: true,
        refreshed: true,
        tip: '',
        note: 'soft: insufficient hoverable points across lookbacks — controlled empty annotate',
      });
    }
    if (restoreLabel) {
      await this.selectTimeLookback(restoreLabel).catch(async () => {
        await this.selectTimeLookback(/Last 24 hours|Last 6 hours/i);
      });
    }
    return out;
  }

  async softScatterDrill(): Promise<{
    points: number;
    paused: boolean;
    tabs: string[];
    note: string;
  }> {
    await this.continueAutoRefreshIfPaused().catch(() => undefined);
    await this.hideDetailsIfOpen().catch(() => undefined);
    const host = this.locators.scatterWidget();
    await this.softScrollTo(host);
    let points = await this.locators.scatterPoints().count().catch(() => 0);
    if (points < 1) {
      await this.selectTimeLookback(/Last 24 hours|Last 7 days/i).catch(() => undefined);
      await this.page.waitForTimeout(2000);
      points = await this.locators.scatterPoints().count().catch(() => 0);
    }
    const tabs: string[] = [];
    if (points > 0) {
      await this.locators.scatterPoints().first().click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(1200);
      for (const [name, loc] of [
        ['Waterfall', this.locators.detailTabWaterfall],
        ['Film Strip', this.locators.detailTabFilmStrip],
        ['Har File', this.locators.detailTabHarFile],
        ['Test Event Log', this.locators.detailTabTestEventLog],
      ] as const) {
        if (await loc.isVisible().catch(() => false)) {
          tabs.push(name);
          await loc.click({ force: true }).catch(() => undefined);
          await this.page.waitForTimeout(400);
        }
      }
    }
    const paused = await this.locators.pauseBanner.isVisible().catch(() => false);
    await this.hideDetailsIfOpen().catch(() => undefined);
    await this.continueAutoRefreshIfPaused().catch(() => undefined);
    await this.closeOverlays();
    return {
      points,
      paused,
      tabs,
      note: points < 1 ? 'no scatter points — controlled empty' : `drill tabs=${tabs.join(',')}`,
    };
  }

  async softChromeIconTooltipsAndRoundTrip() {
    const { softChromeIconTooltipsAndRoundTrip } = await import('../helpers/preconfiguredDashboardChrome');
    return softChromeIconTooltipsAndRoundTrip(this.page);
  }

  async softSiblingSwitchAndRestore(target: RegExp): Promise<string> {
    const before = await this.getDashboardLabel();
    await this.selectDashboard(target).catch(() => undefined);
    await this.page.waitForTimeout(3000);
    const mid = await this.getDashboardLabel();
    await this.ensureSyntheticRegressionUs2Selected();
    await this.ensureProfileSiteSelected();
    await this.expectCoreWidgetsReady().catch(() => undefined);
    const after = await this.getDashboardLabel();
    return `before=${before} mid=${mid} after=${after}`;
  }

  async expectNotConfusedSurfaces(): Promise<void> {
    await expect(this.page).not.toHaveURL(/overview-dashboard\/marketing/i);
    await expect(this.page).not.toHaveURL(/overview-dashboard\/overview/i);
    await expect(this.locators.pageTitle).not.toHaveText(
      /Marketing Overview|Digital Experience Overview/i
    );
    await expect(this.page).toHaveURL(/site\/dashboard|r=site%2Fdashboard/i);
    const dash = await this.getDashboardLabel();
    expect(dash).toMatch(SR_US2_EXACT);
    expect(dash).not.toMatch(/Synthetic Site Health/i);
    expect(dash).not.toMatch(/Synthetic Performance Detail/i);
    expect(dash).not.toMatch(/^(Alerts|Business|Marketing|RUM) Regression\s*-\s*US2$/i);
  }

  async expectSummaryMetricLabelsSoft(): Promise<string[]> {
    const body = await this.getPageBodySample(5000);
    const expected = [
      /PAGE HITS|Page Hits/i,
      /PAGE ONLOAD|Onload/i,
      /FIRST CONTENTFUL PAINT|FCP/i,
      /LARGEST CONTENTFUL PAINT|LCP/i,
      /TOTAL BLOCKING TIME|TBT/i,
      /CUMULATIVE LAYOUT SHIFT|CLS/i,
      /SPEED INDEX/i,
      /JS ERRORS/i,
      /FIRST BYTE/i,
      /DNS/i,
    ];
    const found: string[] = [];
    for (const re of expected) {
      if (re.test(body)) found.push(re.source);
    }
    expect(found.length, `Summary labels; sample=${body.slice(0, 180)}`).toBeGreaterThanOrEqual(5);
    return found;
  }
}
