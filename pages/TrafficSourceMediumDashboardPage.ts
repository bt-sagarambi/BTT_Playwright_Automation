import { Page, expect, Locator } from '@playwright/test';
import { TrafficSourceMediumDashboardLocators } from '../locators/TrafficSourceMediumDashboardLocators';
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

/** Exact preconfigured option — never partial “Traffic*” Shared/RUM matches. */
export const TSM_EXACT = /^\s*Traffic Source and Medium\s*$/i;
export const TSM_ALT = /^\s*Traffic Source\s*&\s*Medium\s*$/i;

export function isTrafficSourceMediumLabel(text: string): boolean {
  const t = (text || '').replace(/\s+/g, ' ').trim();
  return TSM_EXACT.test(t) || TSM_ALT.test(t);
}

export type TrafficSourceMediumContext = {
  dashboardLabel: string;
  lookbackLabel: string;
  autoRefreshLabel: string;
  siteLabel: string;
  widgetSignature: string;
};

/**
 * Preconfigured Traffic Source and Medium dashboard (site/dashboard).
 * Read-only regression: no Save Filter / permanent widget save / dashboard delete.
 */
export class TrafficSourceMediumDashboardPage {
  readonly locators: TrafficSourceMediumDashboardLocators;

  constructor(private readonly page: Page) {
    this.locators = new TrafficSourceMediumDashboardLocators(page);
  }

  async openViaNavigation(): Promise<void> {
    await ensurePortalSession(this.page);
    await new SiteDropdownPage(this.page).ensureProfileSite().catch(() => undefined);
    await new LeftNavPage(this.page).openSmokePage(PAGE_DEF);
    await this.waitForPageReady();
    await this.ensureTrafficSourceMediumSelected();
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

  async recoverPage(): Promise<void> {
    await this.closeOverlays();
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
    await this.ensureTrafficSourceMediumSelected({ soft: true });
    await this.ensureProfileSiteSelected();
    if (!isTrafficSourceMediumLabel(await this.getDashboardLabel())) {
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
      return ((await this.locators.switchDashboardContainer.textContent()) || '')
        .replace(/\s+/g, ' ')
        .trim();
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

  async ensureTrafficSourceMediumSelected(opts?: { soft?: boolean }): Promise<void> {
    const soft = opts?.soft === true;
    let label = await this.getDashboardLabel();
    if (isTrafficSourceMediumLabel(label)) return;
    try {
      await this.selectDashboard(TSM_EXACT);
      await this.page.waitForTimeout(5000);
    } catch {
      await this.selectDashboard(/Traffic Source and Medium/i).catch(() => undefined);
      await this.page.waitForTimeout(4500);
    }
    label = await this.getDashboardLabel();
    if (isTrafficSourceMediumLabel(label)) return;
    if (soft) return;
    await this.page.goto('/btportal/web/index.php?r=site/dashboard', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await this.waitForPageReady();
    await this.selectDashboard(TSM_EXACT).catch(() => undefined);
    await this.page.waitForTimeout(5000);
    label = await this.getDashboardLabel();
    expect(label, 'Dashboard switcher should show exact Traffic Source and Medium').toMatch(
      TSM_EXACT
    );
  }

  async selectDashboard(name: string | RegExp): Promise<void> {
    await this.closeOverlays();
    const re = typeof name === 'string' ? new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : name;
    const preferExactTsm = /Traffic Source/i.test(String(name));
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
        if (preferExactTsm && !isTrafficSourceMediumLabel(text)) continue;
        await options.nth(i).click({ force: true });
        clicked = true;
        break;
      }
      if (!clicked && !preferExactTsm) {
        const opt = options.filter({ hasText: re }).first();
        if (await opt.isVisible({ timeout: 3000 }).catch(() => false)) {
          await opt.click({ force: true });
          clicked = true;
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
      labels.find((t) => isTrafficSourceMediumLabel(t.replace(/\s+/g, ' ').trim()) && preferExactTsm) ||
      labels.find((t) => re.test(t.replace(/\s+/g, ' ').trim()) && !preferExactTsm) ||
      labels.find((t) => isTrafficSourceMediumLabel(t.replace(/\s+/g, ' ').trim()));
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
    expect(body, 'Sitewide Totals should be present').toMatch(/Sitewide Totals/i);
    expect(body, 'Traffic Source Breakdown should be present').toMatch(/Traffic Source Breakdown/i);
    expect(body, 'Traffic Medium Breakdown should be present').toMatch(/Traffic Medium Breakdown/i);
  }

  async widgetsReadyScore(): Promise<number> {
    let score = 0;
    const body = await this.getPageBodySample(5000);
    if (/Sitewide Totals/i.test(body)) score += 1;
    if (/REVENUE|Revenue/i.test(body) && /ORDERS|Orders/i.test(body)) score += 1;
    if (/VISITORS|Visitors/i.test(body) && /PAGE VIEWS|Page Views/i.test(body)) score += 1;
    if (/CONVERSION RATE|Conversion Rate/i.test(body)) score += 1;
    if (/Traffic Source Breakdown/i.test(body)) score += 1;
    if (/Traffic Medium Breakdown/i.test(body)) score += 1;
    if (/\bSource\b/i.test(body) && /\bMedium\b/i.test(body)) score += 1;
    if (await this.locators.trafficSourceBreakdownWidget().isVisible().catch(() => false)) score += 1;
    if (await this.locators.trafficMediumBreakdownWidget().isVisible().catch(() => false)) score += 1;
    return score;
  }

  async expectCoreWidgetsReady(): Promise<void> {
    await expect
      .poll(async () => this.widgetsReadyScore(), { timeout: 90000 })
      .toBeGreaterThanOrEqual(4);
  }

  async getSitewideSignature(): Promise<string> {
    const host = this.locators.sitewideTotalsWidget();
    if (await host.count()) {
      return host
        .evaluate((el) => {
          const text = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 260);
          const charts = el.querySelectorAll('.highcharts-container, svg').length;
          const box = el.getBoundingClientRect();
          return `${charts}|${Math.round(box.width)}x${Math.round(box.height)}|${text}`;
        })
        .catch(async () => this.getPageBodySample(200));
    }
    return this.getPageBodySample(200);
  }

  async getBreakdownSignature(kind: 'source' | 'medium'): Promise<string> {
    const host =
      kind === 'source'
        ? this.locators.trafficSourceBreakdownWidget()
        : this.locators.trafficMediumBreakdownWidget();
    if (await host.count()) {
      return host
        .evaluate((el) => {
          const text = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 280);
          const rows = el.querySelectorAll('tbody tr, .slick-row').length;
          return `${rows}|${text}`;
        })
        .catch(() => 'missing');
    }
    return 'missing';
  }

  async captureContext(): Promise<TrafficSourceMediumContext> {
    return {
      dashboardLabel: await this.getDashboardLabel(),
      lookbackLabel: await this.getTimeLookbackLabel(),
      autoRefreshLabel: await this.getAutoRefreshLabel(),
      siteLabel: await this.getSiteLabel(),
      widgetSignature: [
        await this.getSitewideSignature(),
        await this.getBreakdownSignature('source'),
        await this.getBreakdownSignature('medium'),
      ].join('||'),
    };
  }

  async restoreContext(ctx: TrafficSourceMediumContext): Promise<void> {
    await this.closeOverlays();
    await this.ensureTrafficSourceMediumSelected();
    await this.ensureProfileSiteSelected();
    if (ctx.lookbackLabel) {
      const currentLookback = await this.getTimeLookbackLabel();
      const same =
        currentLookback.toLowerCase() === ctx.lookbackLabel.toLowerCase() ||
        currentLookback.toLowerCase().includes(ctx.lookbackLabel.toLowerCase()) ||
        ctx.lookbackLabel.toLowerCase().includes(currentLookback.toLowerCase());
      if (!same) {
        await this.selectTimeLookback(ctx.lookbackLabel).catch(async () => {
          // Prefer common short windows if capture label is noisy
          await this.selectTimeLookback(/Last 24 hours/i).catch(async () => {
            await this.selectTimeLookback(/Last 6 hours|Last 1 hour/i).catch(() => undefined);
          });
        });
      }
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

  async expectSitewideMetrics(): Promise<string[]> {
    const body = await this.getPageBodySample(3500);
    const expected: Array<{ name: string; re: RegExp }> = [
      { name: 'Revenue', re: /REVENUE|Revenue/i },
      { name: 'Orders', re: /ORDERS|\bOrders\b/i },
      { name: 'Average Order Value', re: /AVERAGE ORDER VALUE|Average Order Value|\bAOV\b/i },
      { name: 'Visitors', re: /VISITORS|Visitors/i },
      { name: 'Page Views', re: /PAGE VIEWS|Page Views/i },
      { name: 'Conversion Rate', re: /CONVERSION RATE|Conversion Rate/i },
    ];
    const found: string[] = [];
    for (const e of expected) {
      if (e.re.test(body)) found.push(e.name);
    }
    expect(found.length, `Sitewide metrics; body: ${body.slice(0, 220)}`).toBeGreaterThanOrEqual(5);
    return found;
  }

  async getTableHeaderTexts(kind: 'source' | 'medium'): Promise<string[]> {
    const headers =
      kind === 'source' ? this.locators.sourceHeaders() : this.locators.mediumHeaders();
    const fromDom = (await headers.allTextContents())
      .map((t) => t.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    if (fromDom.length) return fromDom;
    const body =
      kind === 'source'
        ? ((await this.locators.trafficSourceBreakdownWidget().innerText().catch(() => '')) || '')
        : ((await this.locators.trafficMediumBreakdownWidget().innerText().catch(() => '')) || '');
    return body.replace(/\s+/g, ' ').trim().slice(0, 400).split(/\s{2,}|\|/).filter(Boolean);
  }

  async softSortBreakdown(kind: 'source' | 'medium'): Promise<{
    columnsTried: string[];
    orderChanged: boolean;
    note: string;
  }> {
    const widget =
      kind === 'source'
        ? this.locators.trafficSourceBreakdownWidget()
        : this.locators.trafficMediumBreakdownWidget();
    await widget.scrollIntoViewIfNeeded().catch(() => undefined);
    const headers = widget.locator('th, .slick-header-column, [role="columnheader"]');
    const count = await headers.count().catch(() => 0);
    const columnsTried: string[] = [];
    let orderChanged = false;
    const rows =
      kind === 'source' ? this.locators.sourceBodyRows() : this.locators.mediumBodyRows();
    const firstRowSig = async () =>
      ((await rows.first().innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim().slice(0, 120);
    const before = await firstRowSig();
    for (let i = 0; i < Math.min(count, 7); i++) {
      const h = headers.nth(i);
      if (!(await h.isVisible().catch(() => false))) continue;
      const name = ((await h.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
      if (!name || /action|select/i.test(name)) continue;
      columnsTried.push(name);
      await h.click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(900);
      const after = await firstRowSig();
      if (after && before && after !== before) orderChanged = true;
    }
    return {
      columnsTried,
      orderChanged,
      note:
        columnsTried.length === 0
          ? `No clickable headers on ${kind}`
          : `${kind}: tried ${columnsTried.length}; orderChanged=${orderChanged}`,
    };
  }

  async softPaginationSample(kind: 'source' | 'medium'): Promise<{ note: string; changed: boolean }> {
    const widget =
      kind === 'source'
        ? this.locators.trafficSourceBreakdownWidget()
        : this.locators.trafficMediumBreakdownWidget();
    await widget.scrollIntoViewIfNeeded().catch(() => undefined);
    const before = await this.getBreakdownSignature(kind);
    const sizeBtn = widget
      .locator('a, button, select, .btn')
      .filter({ hasText: /10\s*\/\s*page|25\s*\/\s*page|5\s*\/\s*page/i })
      .first();
    if (await sizeBtn.isVisible().catch(() => false)) {
      await sizeBtn.click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(400);
      const alt = this.page
        .locator('a, button, li')
        .filter({ hasText: /25\s*\/\s*page|10\s*\/\s*page/i })
        .first();
      if (await alt.isVisible().catch(() => false)) {
        await alt.click({ force: true }).catch(() => undefined);
        await this.page.waitForTimeout(1200);
      }
    }
    const next = widget.locator('a, button').filter({ hasText: /Next|>>/i }).first();
    if (await next.isVisible().catch(() => false)) {
      const disabled =
        (await next.getAttribute('disabled').catch(() => null)) != null ||
        /disabled|inactive/i.test((await next.getAttribute('class').catch(() => '')) || '');
      if (!disabled) {
        await next.click({ force: true }).catch(() => undefined);
        await this.page.waitForTimeout(1000);
        const prev = widget.locator('a, button').filter({ hasText: /Previous|<</i }).first();
        if (await prev.isVisible().catch(() => false)) {
          await prev.click({ force: true }).catch(() => undefined);
          await this.page.waitForTimeout(800);
        }
      }
    }
    const after = await this.getBreakdownSignature(kind);
    // Prefer restore 10/page if visible
    const ten = widget.locator('a, button').filter({ hasText: /10\s*\/\s*page/i }).first();
    if (await ten.isVisible().catch(() => false)) {
      await ten.click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(800);
    }
    return {
      changed: before !== after,
      note: `${kind} pagination soft; sigChanged=${before !== after}`,
    };
  }

  async softExportOpenClose(kind: 'source' | 'medium'): Promise<{ opened: boolean; note: string }> {
    const widget =
      kind === 'source'
        ? this.locators.trafficSourceBreakdownWidget()
        : this.locators.trafficMediumBreakdownWidget();
    await widget.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => undefined);
    // Prefer in-widget Export control; avoid matching left-nav or wizard Export-like text.
    const exportBtn = widget
      .locator('button, a, .btn, [role="button"]')
      .filter({ hasText: /^Export$/i })
      .first();
    if (!(await exportBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
      return { opened: false, note: `${kind}: Export not visible` };
    }
    // Force click with short timeout — product Export may open dropdown, native download, or hang.
    await exportBtn.click({ force: true, timeout: 4000, noWaitAfter: true }).catch(() => undefined);
    await this.page.waitForTimeout(400);
    const menu = this.page
      .locator('.dropdown-menu:visible, .export-menu:visible, [role="menu"]:visible, .highcharts-menu:visible')
      .first();
    const opened = await menu.isVisible({ timeout: 1500 }).catch(() => false);
    await this.page.keyboard.press('Escape').catch(() => undefined);
    await this.page.waitForTimeout(200);
    await this.page.keyboard.press('Escape').catch(() => undefined);
    return { opened, note: `${kind}: Export click; menuVisible=${opened}` };
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
        await this.selectTimeLookback(/Last 24 hours|Last 6 hours/i);
      });
    }
    return results;
  }

  async softSiteChangeAndLock() {
    const { softSiteChangeAndLock } = await import('../helpers/preconfiguredDashboardChrome');
    const r = await softSiteChangeAndLock(this.page);
    await this.ensureTrafficSourceMediumSelected({ soft: true });
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
    let r = await softPlusDashboardEyeSwitch(this.page, TSM_EXACT);
    if (!r.restoredHome) {
      await this.ensureTrafficSourceMediumSelected({ soft: true });
      r = {
        ...r,
        restoredHome: isTrafficSourceMediumLabel(await this.getDashboardLabel()),
      };
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
    expect(isTrafficSourceMediumLabel(dash), `dash="${dash}"`).toBeTruthy();
    expect(dash).not.toMatch(/RUM Performance Detail/i);
    expect(dash).not.toMatch(/Traffic Breakdown Errors/i);
  }
}
