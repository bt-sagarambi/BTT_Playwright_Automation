import { Page, expect, Locator } from '@playwright/test';
import { SyntheticSiteHealthDashboardLocators } from '../locators/SyntheticSiteHealthDashboardLocators';
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

/** Exact preconfigured option — never matches Synthetic Performance Detail. */
export const SSH_EXACT = /^\s*Synthetic Site Health\s*$/i;

export type SyntheticSiteHealthContext = {
  dashboardLabel: string;
  lookbackLabel: string;
  autoRefreshLabel: string;
  siteLabel: string;
  widgetSignature: string;
};

/**
 * Preconfigured Synthetic Site Health dashboard (site/dashboard).
 * Read-only regression: no Save Filter / permanent widget save / dashboard delete.
 */
export class SyntheticSiteHealthDashboardPage {
  readonly locators: SyntheticSiteHealthDashboardLocators;

  constructor(private readonly page: Page) {
    this.locators = new SyntheticSiteHealthDashboardLocators(page);
  }

  async openViaNavigation(): Promise<void> {
    await ensurePortalSession(this.page);
    await new SiteDropdownPage(this.page).ensureProfileSite().catch(() => undefined);
    await new LeftNavPage(this.page).openSmokePage(PAGE_DEF);
    await this.waitForPageReady();
    await this.ensureSyntheticSiteHealthSelected();
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

  /**
   * Clear pause banner from scatter drill so suite does not leave auto-refresh paused.
   */
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
    // Close extra tabs if Performance Detail left them open
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
    await this.ensureSyntheticSiteHealthSelected({ soft: true });
    await this.ensureProfileSiteSelected();
    if (!SSH_EXACT.test(await this.getDashboardLabel())) {
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
            quick?.getAttribute('title') ||
            global?.getAttribute('title') ||
            '';
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

  async ensureSyntheticSiteHealthSelected(opts?: { soft?: boolean }): Promise<void> {
    const soft = opts?.soft === true;
    let label = await this.getDashboardLabel();
    if (SSH_EXACT.test(label)) return;
    try {
      await this.selectDashboard(SSH_EXACT);
      await this.page.waitForTimeout(5000);
    } catch {
      await this.selectDashboard(/Synthetic Site Health/i).catch(() => undefined);
      await this.page.waitForTimeout(4500);
    }
    label = await this.getDashboardLabel();
    if (SSH_EXACT.test(label)) return;
    if (soft) return;
    await this.page.goto('/btportal/web/index.php?r=site/dashboard', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await this.waitForPageReady();
    await this.selectDashboard(SSH_EXACT).catch(() => undefined);
    await this.page.waitForTimeout(5000);
    label = await this.getDashboardLabel();
    expect(label, 'Dashboard switcher should show exact Synthetic Site Health').toMatch(SSH_EXACT);
  }

  async selectDashboard(name: string | RegExp): Promise<void> {
    await this.closeOverlays();
    const re = typeof name === 'string' ? new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : name;
    const preferExactSsh = /Synthetic Site Health/i.test(String(name));
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
        if (preferExactSsh && !SSH_EXACT.test(text)) continue;
        if (/Synthetic Performance Detail/i.test(text) && preferExactSsh) continue;
        await options.nth(i).click({ force: true });
        clicked = true;
        break;
      }
      if (!clicked) {
        const opt = options.filter({ hasText: re }).first();
        if (await opt.isVisible({ timeout: 3000 }).catch(() => false)) {
          const t = ((await opt.textContent()) || '').replace(/\s+/g, ' ').trim();
          if (!preferExactSsh || SSH_EXACT.test(t)) {
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
      labels.find((t) => SSH_EXACT.test(t.replace(/\s+/g, ' ').trim()) && preferExactSsh) ||
      labels.find(
        (t) =>
          re.test(t.replace(/\s+/g, ' ').trim()) &&
          !(preferExactSsh && /Performance Detail/i.test(t))
      );
    if (!match) throw new Error(`Dashboard option not found: ${name}`);
    await native.selectOption({ label: match }).catch(async () => {
      const val = await native.locator('option').filter({ hasText: re }).first().getAttribute('value');
      if (val) await native.selectOption(val);
    });
    await this.page.waitForTimeout(5000);
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
    return ((await this.page.locator('#page-contents, body').first().innerText().catch(() => '')) || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, max);
  }

  async expectCoreWidgetTitles(): Promise<void> {
    const body = await this.getPageBodySample(4500);
    expect(body, 'High Level Metrics should be present').toMatch(/High Level Metrics/i);
    expect(body, 'Site Availability should be present').toMatch(/Site Availability/i);
    expect(body, 'Screenshot should be present').toMatch(/Screenshot/i);
    expect(body, 'Session/Page Scatterplot should be present').toMatch(
      /Session And Page Scatterplot|Session and Page Scatterplot|Synthetic Script Timing/i
    );
  }

  async widgetsReadyScore(): Promise<number> {
    let score = 0;
    const body = await this.getPageBodySample(5000);
    if (/High Level Metrics/i.test(body)) score += 1;
    if (/Availability/i.test(body) && /Average Onload/i.test(body)) score += 1;
    if (/Site Availability/i.test(body)) score += 1;
    if (/Site Availability Over Time/i.test(body)) score += 1;
    if (/Screenshot/i.test(body)) score += 1;
    if (/Session And Page Scatterplot|Session and Page Scatterplot|Synthetic Script Timing/i.test(body))
      score += 1;
    if (/Displayed Metric/i.test(body)) score += 1;
    const charts = await this.locators.highchartsContainers.count().catch(() => 0);
    if (charts > 0) score += 1;
    if (await this.locators.pageScatterHost().count()) score += 1;
    if (await this.locators.sessionScatterHost().count()) score += 1;
    return score;
  }

  async expectCoreWidgetsReady(): Promise<void> {
    await expect
      .poll(async () => this.widgetsReadyScore(), { timeout: 90000 })
      .toBeGreaterThanOrEqual(4);
  }

  async getHighLevelMetricsSignature(): Promise<string> {
    const host = this.locators.highLevelMetricsWidget();
    if (await host.count()) {
      return host
        .evaluate((el) => {
          const text = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 220);
          const charts = el.querySelectorAll('.highcharts-container, svg').length;
          const box = el.getBoundingClientRect();
          return `${charts}|${Math.round(box.width)}x${Math.round(box.height)}|${text}`;
        })
        .catch(async () => this.getPageBodySample(200));
    }
    return this.getPageBodySample(200);
  }

  async getSiteAvailabilitySignature(): Promise<string> {
    const host = this.locators.siteAvailabilityWidget();
    if (await host.count()) {
      return host
        .evaluate((el) => {
          const text = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 220);
          const charts = el.querySelectorAll('.highcharts-container, svg').length;
          return `${charts}|${text}`;
        })
        .catch(() => 'missing');
    }
    return /Site Availability Over Time/i.test(await this.getPageBodySample(400))
      ? 'title-only'
      : 'missing';
  }

  async getScatterSignature(): Promise<string> {
    const host = this.locators.scatterplotWidget();
    if (await host.count()) {
      return host
        .evaluate((el) => {
          const text = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 240);
          const charts = el.querySelectorAll('.highcharts-container, svg').length;
          const points = el.querySelectorAll('.highcharts-point').length;
          return `${charts}|${points}|${text}`;
        })
        .catch(() => 'missing');
    }
    return 'missing';
  }

  async captureContext(): Promise<SyntheticSiteHealthContext> {
    return {
      dashboardLabel: await this.getDashboardLabel(),
      lookbackLabel: await this.getTimeLookbackLabel(),
      autoRefreshLabel: await this.getAutoRefreshLabel(),
      siteLabel: await this.getSiteLabel(),
      widgetSignature: [
        await this.getHighLevelMetricsSignature(),
        await this.getSiteAvailabilitySignature(),
        await this.getScatterSignature(),
      ].join('||'),
    };
  }

  async restoreContext(ctx: SyntheticSiteHealthContext): Promise<void> {
    await this.continueAutoRefreshIfPaused().catch(() => undefined);
    await this.hideDetailsIfOpen().catch(() => undefined);
    await this.closeOverlays();
    await this.ensureSyntheticSiteHealthSelected();
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
    await this.closeOverlays();
    await expect(this.locators.refreshDashboard).toBeVisible({ timeout: 10000 });
    await this.locators.refreshDashboard.click({ force: true });
    await this.page.waitForTimeout(3000);
    await this.expectCoreWidgetsReady().catch(() => undefined);
  }

  async openFiltersDrawer(): Promise<void> {
    await this.closeOverlays();
    await expect(this.locators.toggleFilters).toBeVisible({ timeout: 15000 });
    await this.locators.toggleFilters.click({ force: true });
    await this.page.waitForTimeout(900);
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
    const applyCandidates = this.page
      .locator('#apply-filters, #filters-section button, .filters-section button, button')
      .filter({ hasText: /^Apply( Filters)?$/i });
    const apply = applyCandidates.filter({ visible: true }).first();
    if (!(await apply.isVisible({ timeout: 4000 }).catch(() => false))) return false;
    await apply.click({ force: true });
    await this.page.waitForTimeout(3500);
    await this.expectCoreWidgetsReady().catch(() => undefined);
    return true;
  }

  async softOpenDashboardManager(): Promise<boolean> {
    await this.closeOverlays();
    const toggle = this.locators.dashboardSettingsToggle;
    if (await toggle.isVisible().catch(() => false)) {
      await toggle.click({ force: true }).catch(() => undefined);
    } else if (await this.locators.dashboardManager.isVisible().catch(() => false)) {
      await this.locators.dashboardManager.click({ force: true }).catch(() => undefined);
    } else {
      const wrench = this.page.locator('.fa-wrench, [class*="wrench"], [title*="Dashboard" i]').first();
      if (!(await wrench.isVisible().catch(() => false))) return false;
      await wrench.click({ force: true }).catch(() => undefined);
    }
    await this.page.waitForTimeout(800);
    return this.page.getByText(/DASHBOARD MANAGER|Dashboard Manager/i).first().isVisible().catch(() => false);
  }

  async softOpenWidgetWizard(): Promise<boolean> {
    await this.closeOverlays();
    if (!(await this.locators.createWidget.isVisible().catch(() => false))) return false;
    await this.locators.createWidget.click({ force: true }).catch(() => undefined);
    await this.page.waitForTimeout(800);
    return this.page.getByText(/Add a Widget/i).first().isVisible().catch(() => false);
  }

  async expectHighLevelMetricHeaders(): Promise<string[]> {
    const body = await this.getPageBodySample(3000);
    const expected = [
      /Availability/i,
      /Average Onload/i,
      /Average\s*#?\s*of Resources|Average # of Resources/i,
      /Average First Paint/i,
      /Average Image Size/i,
      /Average JS Errors|JS Errors \(Sampled\)/i,
    ];
    const found: string[] = [];
    for (const re of expected) {
      if (re.test(body)) found.push(re.source);
    }
    expect(found.length, `High Level Metrics headers; body sample: ${body.slice(0, 200)}`).toBeGreaterThanOrEqual(
      5
    );
    return found;
  }

  async expectSiteAvailabilityChart(soft = false): Promise<void> {
    const body = await this.getPageBodySample(4000);
    const hasTitle = /Site Availability Over Time/i.test(body);
    const chart = this.locators.siteAvailabilityWidget().locator('.highcharts-container').first();
    const box = await chart.boundingBox().catch(() => null);
    const sized = !!(box && box.width > 40 && box.height > 40);
    if (soft) {
      expect(hasTitle || sized).toBeTruthy();
      return;
    }
    expect(hasTitle || sized, 'Site Availability Over Time chart shell').toBeTruthy();
  }

  async softToggleAvailabilityLegend(): Promise<{ toggled: boolean; note: string }> {
    const items = this.locators.siteAvailabilityLegendItems();
    const n = await items.count().catch(() => 0);
    if (n < 1) {
      // Fallback: any highcharts-legend in page under availability
      const any = this.page.locator('.highcharts-legend-item').first();
      if (!(await any.isVisible().catch(() => false))) {
        return { toggled: false, note: 'No legend items' };
      }
      await any.click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(400);
      await any.click({ force: true }).catch(() => undefined);
      return { toggled: true, note: 'toggled first page legend item (restore click)' };
    }
    const item = items.first();
    await item.click({ force: true }).catch(() => undefined);
    await this.page.waitForTimeout(400);
    await item.click({ force: true }).catch(() => undefined);
    return { toggled: true, note: `legend items≈${n}; toggled first (restore)` };
  }

  async softHoverSiteAvailability(): Promise<string> {
    const host = this.locators.siteAvailabilityWidget();
    await host.scrollIntoViewIfNeeded().catch(() => undefined);
    const chart = host.locator('.highcharts-container, svg.highcharts-root').first();
    const box = (await chart.boundingBox().catch(() => null)) || (await host.boundingBox());
    if (!box) return '';
    await this.page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.55);
    await this.page.waitForTimeout(400);
    const tip = this.locators.highchartsTooltip.filter({ visible: true }).first();
    return ((await tip.innerText({ timeout: 1500 }).catch(() => '')) || '').replace(/\s+/g, ' ').trim();
  }

  async softScreenshotNavigate(): Promise<{ previous: boolean; next: boolean; hasImage: boolean; note: string }> {
    const w = this.locators.screenshotWidget();
    await w.scrollIntoViewIfNeeded().catch(() => undefined);
    const previous = await this.locators.screenshotPrevious().isVisible().catch(() => false);
    const next = await this.locators.screenshotNext().isVisible().catch(() => false);
    if (next) {
      await this.locators.screenshotNext().click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(600);
    }
    if (previous) {
      await this.locators.screenshotPrevious().click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(600);
    }
    const img = w.locator('img').first();
    let hasImage = false;
    if (await img.isVisible().catch(() => false)) {
      const box = await img.boundingBox().catch(() => null);
      hasImage = !!(box && box.width > 20 && box.height > 20);
    }
    return {
      previous,
      next,
      hasImage,
      note: hasImage ? 'screenshot image present' : 'screenshot chrome present; image empty/soft',
    };
  }

  async softSampleDisplayedMetricOptions(): Promise<string[]> {
    const body = await this.getPageBodySample(5000);
    const known = [
      'Onload',
      'Redirect',
      'First Byte',
      'DNS',
      'TCP',
      'SSL',
      'DOM Duration',
      'Base Page',
      'First Paint',
      'Page Size',
      'Largest Contentful Paint',
      'Cumulative Layout Shift',
      'Fully Loaded Time',
    ];
    return known.filter((k) => new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(body));
  }

  /**
   * Soft scatter point click (left/session then page pane). Clear pause after.
   */
  async softScatterDrill(): Promise<{
    points: number;
    paused: boolean;
    detailOpen: boolean;
    tabs: string[];
    note: string;
  }> {
    await this.continueAutoRefreshIfPaused().catch(() => undefined);
    await this.hideDetailsIfOpen().catch(() => undefined);

    const host = this.locators.scatterplotWidget();
    await host.scrollIntoViewIfNeeded().catch(() => undefined);
    await this.page.waitForTimeout(500);

    let points = await this.locators.scatterPoints().count().catch(() => 0);
    if (points < 1) {
      // broaden lookback once
      await this.selectTimeLookback(/Last 24 hours/i).catch(() => undefined);
      await this.page.waitForTimeout(2000);
      points = await this.locators.scatterPoints().count().catch(() => 0);
    }
    if (points < 1) {
      await this.selectTimeLookback(/Last 7 days/i).catch(() => undefined);
      await this.page.waitForTimeout(2000);
      points = await this.locators.scatterPoints().count().catch(() => 0);
    }

    if (points < 1) {
      return {
        points: 0,
        paused: false,
        detailOpen: false,
        tabs: [],
        note: 'no scatter points after lookback broaden',
      };
    }

    // Prefer session (left) then page (right) — probes used page-scatter + session-scatter
    const sessionPts = this.locators
      .sessionScatterHost()
      .locator('.highcharts-point, .highcharts-markers .highcharts-point');
    const pagePts = this.locators
      .pageScatterHost()
      .locator('.highcharts-point, .highcharts-markers .highcharts-point');

    const tryClick = async (pts: Locator) => {
      const n = await pts.count().catch(() => 0);
      for (let i = 0; i < Math.min(n, 5); i++) {
        const p = pts.nth(i);
        if (!(await p.isVisible().catch(() => false))) continue;
        await p.click({ force: true, timeout: 2500 }).catch(() => undefined);
        await this.page.waitForTimeout(1200);
        return true;
      }
      return false;
    };

    await tryClick(sessionPts);
    await this.page.waitForTimeout(800);
    await tryClick(pagePts);

    // Also click any remaining scatter points if needed
    if (!(await this.locators.pauseBanner.isVisible().catch(() => false))) {
      await tryClick(this.locators.scatterPoints());
    }

    const paused = await this.locators.pauseBanner.isVisible().catch(() => false);
    const waterfallVisible = await this.locators.pageWaterfallHost().isVisible().catch(() => false);
    const hideDetails = await this.locators.hideDetails.isVisible().catch(() => false);
    const detailOpen = waterfallVisible || hideDetails;

    const tabs: string[] = [];
    for (const [name, loc] of [
      ['Waterfall', this.locators.detailTabWaterfall],
      ['Film Strip', this.locators.detailTabFilmStrip],
      ['Har File', this.locators.detailTabHarFile],
      ['Test Event Log', this.locators.detailTabTestEventLog],
    ] as const) {
      if (await loc.isVisible().catch(() => false)) {
        tabs.push(name);
        await loc.click({ force: true }).catch(() => undefined);
        await this.page.waitForTimeout(500);
      }
    }

    return {
      points,
      paused,
      detailOpen,
      tabs,
      note: `points≈${points} paused=${paused} detail=${detailOpen} tabs=${tabs.join(',')}`,
    };
  }

  async softDrillIntoPerformanceDetail(): Promise<{
    handled: boolean;
    newTab: boolean;
    note: string;
  }> {
    if (!(await this.locators.drillIntoPerformanceDetail.isVisible().catch(() => false))) {
      return { handled: false, newTab: false, note: 'Drill Into Performance Detail not visible' };
    }
    const beforePages = this.page.context().pages().length;
    const [popup] = await Promise.all([
      this.page.context().waitForEvent('page', { timeout: 8000 }).catch(() => null),
      this.locators.drillIntoPerformanceDetail.click({ force: true }).catch(() => undefined),
    ]);
    await this.page.waitForTimeout(1500);
    if (popup && !popup.isClosed()) {
      const url = popup.url();
      await popup.close().catch(() => undefined);
      return {
        handled: true,
        newTab: true,
        note: `new tab url sample=${url.slice(0, 120)}`,
      };
    }
    const afterPages = this.page.context().pages().length;
    if (afterPages > beforePages) {
      for (const p of this.page.context().pages()) {
        if (p !== this.page) await p.close().catch(() => undefined);
      }
      return { handled: true, newTab: true, note: 'extra page closed' };
    }
    // same-tab navigation
    if (!/site\/dashboard/i.test(this.page.url())) {
      const url = this.page.url();
      await this.page.goBack({ waitUntil: 'domcontentloaded' }).catch(async () => {
        await this.page.goto('/btportal/web/index.php?r=site/dashboard', {
          waitUntil: 'domcontentloaded',
          timeout: 45000,
        });
      });
      await this.ensureSyntheticSiteHealthSelected({ soft: true });
      return { handled: true, newTab: false, note: `same-tab nav url=${url.slice(0, 100)}; restored` };
    }
    return { handled: true, newTab: false, note: 'click handled; stayed on dashboard' };
  }

  async softChromeIconTooltipsAndRoundTrip() {
    const { softChromeIconTooltipsAndRoundTrip } = await import(
      '../helpers/preconfiguredDashboardChrome'
    );
    return softChromeIconTooltipsAndRoundTrip(this.page);
  }

  async softPrescribedLookbacksRefresh(restoreLabel?: string) {
    const { assertLookbackAppliedRefreshed } = await import(
      '../helpers/preconfiguredDashboardChrome'
    );
    const results = await assertLookbackAppliedRefreshed(
      this.page,
      (l) => this.selectTimeLookback(l),
      () => this.getTimeLookbackLabel(),
      () => this.expectCoreWidgetsReady(),
      [/Last 6 hours/i, /Last 24 hours/i, /Last 7 days/i, /Last 30 days/i]
    );
    if (restoreLabel) {
      await this.selectTimeLookback(restoreLabel).catch(async () => {
        await this.selectTimeLookback(/Last 1 hour|Last 6 hours/i);
      });
    }
    return results;
  }

  async softSiteChangeAndLock() {
    const { softSiteChangeAndLock } = await import('../helpers/preconfiguredDashboardChrome');
    const r = await softSiteChangeAndLock(this.page);
    await this.ensureSyntheticSiteHealthSelected({ soft: true });
    await this.ensureProfileSiteSelected();
    await this.expectCoreWidgetsReady().catch(() => undefined);
    return r;
  }

  async softAutoRefreshApplySample() {
    const { softAutoRefreshApplySample } = await import('../helpers/preconfiguredDashboardChrome');
    const r = await softAutoRefreshApplySample(this.page);
    await this.expectCoreWidgetsReady().catch(() => undefined);
    return r;
  }

  async softPlusDashboardEyeSwitchHome() {
    const { softPlusDashboardEyeSwitch } = await import('../helpers/preconfiguredDashboardChrome');
    let r = await softPlusDashboardEyeSwitch(this.page, SSH_EXACT);
    if (!r.restoredHome) {
      await this.ensureSyntheticSiteHealthSelected({ soft: true });
      r = { ...r, restoredHome: SSH_EXACT.test(await this.getDashboardLabel()) };
    }
    await this.ensureProfileSiteSelected();
    await this.expectCoreWidgetsReady().catch(() => undefined);
    return r;
  }

  async expectNotConfusedSurfaces(): Promise<void> {
    await expect(this.page).not.toHaveURL(/overview-dashboard\/marketing/i);
    await expect(this.page).not.toHaveURL(/overview-dashboard\/overview/i);
    await expect(this.locators.pageTitle).not.toHaveText(
      /Marketing Overview|Digital Experience Overview/i
    );
    await expect(this.page).toHaveURL(/site\/dashboard|r=site%2Fdashboard/i);
    const dash = await this.getDashboardLabel();
    expect(dash).toMatch(SSH_EXACT);
    expect(dash).not.toMatch(/Synthetic Performance Detail/i);
  }
}
