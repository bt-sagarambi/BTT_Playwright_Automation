import { Page, expect, Locator } from '@playwright/test';
import { SiteOverviewDashboardLocators } from '../locators/SiteOverviewDashboardLocators';
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

export type SiteOverviewContext = {
  dashboardLabel: string;
  lookbackLabel: string;
  autoRefreshLabel: string;
  siteLabel: string;
  widgetSignature: string;
};

/**
 * Preconfigured Site Overview dashboard (site/dashboard + Site Overview).
 * Read-only regression: no Save Filter / permanent widget save / dashboard delete.
 */
export class SiteOverviewDashboardPage {
  readonly locators: SiteOverviewDashboardLocators;

  constructor(private readonly page: Page) {
    this.locators = new SiteOverviewDashboardLocators(page);
  }

  async openViaNavigation(): Promise<void> {
    await ensurePortalSession(this.page);
    // Global #site-id Select2 is often hidden on site/dashboard; don't hard-wait it here.
    // Anchor profile site after the dashboard shell is up via ensureProfileSiteSelected().
    await new SiteDropdownPage(this.page).ensureProfileSite().catch(() => undefined);
    await new LeftNavPage(this.page).openSmokePage(PAGE_DEF);
    await this.waitForPageReady();
    await this.ensureSiteOverviewSelected();
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

  private pageIsAlive(): boolean {
    return !this.page.isClosed();
  }

  async closeOverlays(): Promise<void> {
    if (!this.pageIsAlive()) return;
    for (let i = 0; i < 3; i++) {
      if (!this.pageIsAlive()) return;
      await this.page.keyboard.press('Escape').catch(() => undefined);
      await this.page.waitForTimeout(150).catch(() => undefined);
    }
    if (!this.pageIsAlive()) return;
    const closeBtns = this.page
      .locator('button, a, .close, [data-dismiss="modal"]')
      .filter({ hasText: /Close|Cancel|×|Done/i })
      .filter({ visible: true });
    if (await closeBtns.first().isVisible({ timeout: 400 }).catch(() => false)) {
      await closeBtns.first().click({ force: true }).catch(() => undefined);
    }
  }

  /**
   * Prefer switcher + quick-site restore when already on site/dashboard (faster, avoids
   * ensureProfileSite hard-wait on hidden global site control). Full re-nav as fallback.
   */
  async restoreSuiteHome(opts?: { soft?: boolean }): Promise<void> {
    if (!this.pageIsAlive()) return;
    await this.closeOverlays();
    const onDash = /site\/dashboard|r=site%2Fdashboard/i.test(this.page.url());
    if (onDash) {
      await this.ensureSiteOverviewSelected({ soft: true }).catch(() => undefined);
      await this.ensureProfileSiteSelected().catch(() => undefined);
      if (/Site Overview/i.test(await this.getDashboardLabel().catch(() => ''))) {
        await this.expectCoreWidgetsReady().catch(() => undefined);
        return;
      }
    }
    if (opts?.soft) {
      await this.openViaNavigation().catch(() => undefined);
      return;
    }
    await this.openViaNavigation();
  }

  async recoverPage(): Promise<void> {
    if (!this.pageIsAlive()) return;
    await this.closeOverlays();
    await this.page
      .goto('/btportal/web/index.php?r=site/dashboard', {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      })
      .catch(() => undefined);
    if (!this.pageIsAlive()) return;
    await this.waitForPageReady().catch(() => undefined);
    await this.ensureSiteOverviewSelected({ soft: true }).catch(() => undefined);
    await this.ensureProfileSiteSelected().catch(() => undefined);
    if (!this.pageIsAlive()) return;
    if (!/Site Overview/i.test(await this.getDashboardLabel().catch(() => ''))) {
      await this.openViaNavigation().catch(() => undefined);
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
          // Prefer the visible control only (both can exist in DOM with stale text)
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

    // Prefer dashboard quick site when global #site-id select2 is hidden on this shell.
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

  async ensureSiteOverviewSelected(opts?: { soft?: boolean }): Promise<void> {
    const soft = opts?.soft === true;
    let label = await this.getDashboardLabel();
    if (/Site Overview/i.test(label)) return;
    try {
      await this.selectDashboard(/^\s*Site Overview\s*$/i);
      await this.page.waitForTimeout(4000);
    } catch {
      await this.selectDashboard(/Site Overview/i).catch(() => undefined);
      await this.page.waitForTimeout(3500);
    }
    label = await this.getDashboardLabel();
    if (/Site Overview/i.test(label)) return;
    if (soft) return;
    // Hard re-nav as last resort
    await this.page.goto('/btportal/web/index.php?r=site/dashboard', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await this.waitForPageReady();
    await this.selectDashboard(/Site Overview/i).catch(() => undefined);
    await this.page.waitForTimeout(4000);
    label = await this.getDashboardLabel();
    expect(label, 'Dashboard switcher should show Site Overview').toMatch(/Site Overview/i);
  }

  async selectDashboard(name: string | RegExp): Promise<void> {
    await this.closeOverlays();
    const re = typeof name === 'string' ? new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : name;
    const container = this.locators.switchDashboardContainer;
    if (await container.isVisible().catch(() => false)) {
      await container.click({ force: true, timeout: 8000 });
      await this.page.waitForTimeout(500);
      // Prefer exact option match first (avoid "RUM Performance Detail" vs vague patterns)
      const options = this.page.locator('.select2-results__option');
      const count = await options.count();
      let clicked = false;
      for (let i = 0; i < count; i++) {
        const text = ((await options.nth(i).textContent()) || '').replace(/\s+/g, ' ').trim();
        if (!re.test(text)) continue;
        // For plain Site Overview, require equality-ish
        if (/Site Overview/i.test(String(name)) && !/^Site Overview$/i.test(text)) continue;
        await options.nth(i).click({ force: true });
        clicked = true;
        break;
      }
      if (!clicked) {
        const opt = options.filter({ hasText: re }).first();
        if (await opt.isVisible({ timeout: 3000 }).catch(() => false)) {
          await opt.click({ force: true });
          clicked = true;
        }
      }
      if (clicked) {
        await this.page.waitForTimeout(4500);
        return;
      }
      await this.page.keyboard.press('Escape').catch(() => undefined);
    }
    const native = this.locators.switchDashboard;
    const labels = await native.locator('option').allTextContents();
    const match =
      labels.find((t) => /^Site Overview$/i.test(t.replace(/\s+/g, ' ').trim()) && /Site Overview/i.test(String(name))) ||
      labels.find((t) => re.test(t.replace(/\s+/g, ' ').trim()));
    if (!match) throw new Error(`Dashboard option not found: ${name}`);
    await native.selectOption({ label: match }).catch(async () => {
      const val = await native.locator('option').filter({ hasText: re }).first().getAttribute('value');
      if (val) await native.selectOption(val);
    });
    await this.page.waitForTimeout(4500);
  }

  async listPreconfiguredDashboardNames(): Promise<string[]> {
    return this.page.evaluate(() => {
      const groups = [...document.querySelectorAll('#switch-dashboard optgroup')].filter(
        (g) => /preconfigured/i.test(g.getAttribute('label') || '')
      );
      const opts = groups.length
        ? groups.flatMap((g) => [...g.querySelectorAll('option')])
        : [...document.querySelectorAll('#switch-dashboard option')];
      return opts
        .map((o) => (o.textContent || '').replace(/\s+/g, ' ').trim())
        .filter(Boolean);
    });
  }

  async expectFourWidgetTitles(): Promise<void> {
    for (const t of ['Performance', 'Device Metrics', 'Revenue Over Time', 'Geography'] as const) {
      // Geography chrome may be "Geography Displayed Metric" — use partial for that one
      const titleNode =
        t === 'Geography'
          ? this.page.getByText(/Geography/i).filter({ visible: true }).first()
          : this.locators.widgetTitleText(t);
      await expect(titleNode, `${t} widget title`).toBeVisible({ timeout: 30000 });
    }
  }

  async widgetsReadyScore(): Promise<number> {
    const checks: Array<() => Promise<boolean>> = [
      () => this.locators.widgetTitleText('Performance').isVisible().catch(() => false),
      () => this.locators.widgetTitleText('Device Metrics').isVisible().catch(() => false),
      () => this.locators.widgetTitleText('Revenue Over Time').isVisible().catch(() => false),
      () =>
        this.page
          .getByText(/Geography/i)
          .filter({ visible: true })
          .first()
          .isVisible()
          .catch(() => false),
    ];
    let score = 0;
    for (const c of checks) {
      if (await c()) score += 1;
    }
    const charts = await this.locators.highchartsContainers.count().catch(() => 0);
    if (charts > 0) score += 1;
    const dmTable = await this.locators.deviceMetricsTable().isVisible().catch(() => false);
    if (dmTable) score += 1;
    return score;
  }

  async expectCoreWidgetsReady(): Promise<void> {
    await expect
      .poll(async () => this.widgetsReadyScore(), { timeout: 90000 })
      .toBeGreaterThanOrEqual(3);
  }

  async getWidgetSignature(title: string | RegExp): Promise<string> {
    const host = this.locators.widgetByTitle(title);
    // Prefer nearest chart/table under same grid area; fall back to body page sample scoped near title.
    const scoped = host.locator('.highcharts-container, svg, table, [id^="chartID_"]').first();
    if (await scoped.count()) {
      return scoped
        .evaluate((el) => {
          const root = el.closest('.grid-stack-item') || el;
          const svg = root.querySelector('svg');
          const points = root.querySelectorAll(
            '.highcharts-point, path.highcharts-graph, .highcharts-series'
          ).length;
          const box = (svg || el).getBoundingClientRect();
          const w = svg?.getAttribute('width') || String(Math.round(box.width || 0));
          const h = svg?.getAttribute('height') || String(Math.round(box.height || 0));
          const text = (root.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 180);
          const alt = root.querySelector('img')?.getAttribute('alt') || '';
          return `${points}|${w}x${h}|${alt}|${text}`;
        })
        .catch(() => 'missing');
    }
    if (!(await host.count())) return 'missing';
    return host
      .evaluate((el) => {
        const svg = el.querySelector?.('svg') || null;
        const box = el.getBoundingClientRect?.() || { width: 0, height: 0 };
        const text = (el.textContent || el.getAttribute?.('alt') || '').replace(/\s+/g, ' ').trim().slice(0, 180);
        return `0|${Math.round(box.width)}x${Math.round(box.height)}|${text}`;
      })
      .catch(async () => {
        const vis = await this.locators.widgetTitleText(title).isVisible().catch(() => false);
        return vis ? 'title-only|1x1|' : 'missing';
      });
  }

  async expectGraphLikeInWidget(title: string | RegExp, soft = false): Promise<void> {
    await expect(this.locators.widgetTitleText(title)).toBeVisible({ timeout: soft ? 12000 : 30000 });
    const ok = async () => {
      const chartsNear = this.page.locator('.highcharts-container, [data-highcharts-chart], svg.highcharts-root');
      const n = await chartsNear.count().catch(() => 0);
      if (n > 0) {
        for (let i = 0; i < Math.min(n, 12); i++) {
          const box = await chartsNear.nth(i).boundingBox().catch(() => null);
          if (box && box.width > 40 && box.height > 40) return true;
        }
      }
      const sig = await this.getWidgetSignature(title);
      if (sig === 'missing') return false;
      if (sig.startsWith('title-only')) return soft;
      const m = sig.match(/\|(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)\|/);
      if (m && Number(m[1]) > 40 && Number(m[2]) > 40) return true;
      return !/^0\|0x0/.test(sig);
    };
    try {
      await expect.poll(ok, { timeout: soft ? 12000 : 30000 }).toBeTruthy();
    } catch (err) {
      if (soft) return;
      throw err;
    }
  }

  async captureContext(): Promise<SiteOverviewContext> {
    return {
      dashboardLabel: await this.getDashboardLabel(),
      lookbackLabel: await this.getTimeLookbackLabel(),
      autoRefreshLabel: await this.getAutoRefreshLabel(),
      siteLabel: await this.getSiteLabel(),
      widgetSignature: [
        await this.getWidgetSignature('Performance'),
        await this.getWidgetSignature('Device Metrics'),
        await this.getWidgetSignature('Revenue Over Time'),
        await this.getWidgetSignature('Geography'),
      ].join('||'),
    };
  }

  async restoreContext(ctx: SiteOverviewContext): Promise<void> {
    await this.closeOverlays();
    await this.ensureSiteOverviewSelected();
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
      [...document.querySelectorAll('button.auto-refresh-option, #auto-refresh-btn-group a, #auto-refresh-btn-group button, .btn-group:has(#auto-refresh) .dropdown-menu a')]
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
    const apply = this.locators.applyFilters;
    if (!(await apply.isVisible({ timeout: 4000 }).catch(() => false))) return false;
    await apply.click({ force: true });
    await this.page.waitForTimeout(3500);
    await this.expectCoreWidgetsReady().catch(() => undefined);
    return true;
  }

  async getDeviceMetricsHeaders(): Promise<string[]> {
    const table = this.locators.deviceMetricsTable();
    if (!(await table.isVisible().catch(() => false))) {
      // Fallback from panel text labels
      const text = ((await this.locators.deviceMetricsWidget().innerText().catch(() => '')) || '').replace(
        /\s+/g,
        ' '
      );
      return text.split(/\s{2,}|\n/).filter(Boolean).slice(0, 20);
    }
    return (await this.locators.deviceMetricsHeaders().allTextContents())
      .map((t) => t.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
  }

  async getDeviceMetricsBodySample(): Promise<string> {
    return ((await this.locators.deviceMetricsWidget().innerText().catch(() => '')) || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 500);
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
    const manager = this.page.getByText(/DASHBOARD MANAGER|Dashboard Manager/i).first();
    return manager.isVisible().catch(() => false);
  }

  async softOpenWidgetWizard(): Promise<boolean> {
    await this.closeOverlays();
    if (!(await this.locators.createWidget.isVisible().catch(() => false))) return false;
    await this.locators.createWidget.click({ force: true }).catch(() => undefined);
    await this.page.waitForTimeout(800);
    return this.page.getByText(/Add a Widget/i).first().isVisible().catch(() => false);
  }

  async softHoverWidgetChart(title: string | RegExp): Promise<string> {
    const widget = this.locators.widgetByTitle(title);
    await widget.scrollIntoViewIfNeeded().catch(() => undefined);
    const box = await widget.boundingBox();
    if (!box) return '';
    await this.page.mouse.move(box.x + box.width * 0.45, box.y + box.height * 0.55);
    await this.page.waitForTimeout(400);
    const tip = this.locators.highchartsTooltip.filter({ visible: true }).first();
    return ((await tip.innerText({ timeout: 1500 }).catch(() => '')) || '').replace(/\s+/g, ' ').trim();
  }

  async softGeographyDrill(): Promise<{ drilled: boolean; restored: boolean }> {
    const geo = this.locators.geographyWidget();
    await geo.scrollIntoViewIfNeeded().catch(() => undefined);
    // Prefer a country-like named point (e.g. China) via title/aria/highcharts name
    const named = geo.locator(
      'path.highcharts-point[aria-label*="China" i], .highcharts-point[aria-label*="China" i], path[aria-label*="China" i]'
    );
    let point = named.first();
    if (!(await named.count())) {
      point = geo.locator('.highcharts-point, .highcharts-map-series path, path.highcharts-point').first();
    }
    if (!(await point.count())) return { drilled: false, restored: false };
    await point.click({ force: true, timeout: 5000 }).catch(() => undefined);
    await this.page.waitForTimeout(1500);
    const back = this.page
      .getByText(/Back To World Map|Back to World|World Map/i)
      .or(geo.getByText(/Back/i))
      .first();
    const drilled = await back.isVisible().catch(() => false);
    if (drilled) {
      await back.click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(800);
    }
    return { drilled, restored: drilled ? !(await back.isVisible().catch(() => false)) : false };
  }

  /**
   * Geography country drill + soft assert linked Performance & Revenue Over Time shells still healthy.
   */
  async softGeographyCountryWithLinkedRefresh(): Promise<{
    drilled: boolean;
    restored: boolean;
    perfReady: boolean;
    rotReady: boolean;
    note: string;
  }> {
    const beforePerf = await this.getWidgetSignature(/Performance/i);
    const beforeRot = await this.getWidgetSignature(/Revenue Over Time/i);
    const geo = this.locators.geographyWidget();
    await geo.scrollIntoViewIfNeeded().catch(() => undefined);

    // Try click map point that might be China via tooltip after hover of several points
    const points = geo.locator('.highcharts-point, .highcharts-map-series path, path.highcharts-point');
    const n = await points.count().catch(() => 0);
    let chinaHit = false;
    for (let i = 0; i < Math.min(n, 40) && !chinaHit; i++) {
      const p = points.nth(i);
      const aria = (await p.getAttribute('aria-label').catch(() => '')) || '';
      if (/China/i.test(aria)) {
        await p.click({ force: true, timeout: 3000 }).catch(() => undefined);
        chinaHit = true;
        break;
      }
    }
    if (!chinaHit && n > 0) {
      // Soft sample: click a mid point then look for country chrome
      await points.nth(Math.min(3, n - 1)).click({ force: true, timeout: 3000 }).catch(() => undefined);
    }
    await this.page.waitForTimeout(1800);
    const back = this.page.getByText(/Back To World Map|Back to World Map|Back to World/i).first();
    const drilled = await back.isVisible({ timeout: 4000 }).catch(() => false);
    // Linked widgets should remain / re-render
    await this.expectCoreWidgetsReady().catch(() => undefined);
    const afterPerf = await this.getWidgetSignature(/Performance/i);
    const afterRot = await this.getWidgetSignature(/Revenue Over Time/i);
    const perfReady = afterPerf !== 'missing';
    const rotReady = afterRot !== 'missing';
    let restored = false;
    if (drilled) {
      await back.click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(1000);
      restored = !(await back.isVisible().catch(() => false));
    }
    return {
      drilled: drilled || chinaHit,
      restored,
      perfReady,
      rotReady,
      note: `chinaAria=${chinaHit} perfSigΔ=${beforePerf !== afterPerf} rotSigΔ=${beforeRot !== afterRot}`,
    };
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
        await this.selectTimeLookback(/Last 6 hours/i);
      });
    }
    return results;
  }

  async softSiteChangeAndLock() {
    const { softSiteChangeAndLock } = await import('../helpers/preconfiguredDashboardChrome');
    const r = await softSiteChangeAndLock(this.page);
    await this.ensureSiteOverviewSelected({ soft: true });
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
    let r = await softPlusDashboardEyeSwitch(this.page, /Site Overview/i);
    if (!r.restoredHome) {
      await this.ensureSiteOverviewSelected({ soft: true });
      r = { ...r, restoredHome: /Site Overview/i.test(await this.getDashboardLabel()) };
    }
    await this.ensureProfileSiteSelected();
    await this.expectCoreWidgetsReady().catch(() => undefined);
    return r;
  }

  async expectNotDxoOrMarketing(): Promise<void> {
    await expect(this.page).not.toHaveURL(/overview-dashboard\/marketing/i);
    await expect(this.page).not.toHaveURL(/overview-dashboard\/overview/i);
    await expect(this.locators.pageTitle).not.toHaveText(/Marketing Overview|Digital Experience Overview/i);
  }
}
