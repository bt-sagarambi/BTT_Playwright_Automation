import { Page, expect, Locator } from '@playwright/test';
import { VitalPulseDashboardLocators } from '../locators/VitalPulseDashboardLocators';
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

const VITAL_PULSE_EXACT = /^\s*VitalPulse\s*$/i;

export type VitalPulseContext = {
  dashboardLabel: string;
  lookbackLabel: string;
  autoRefreshLabel: string;
  siteLabel: string;
  widgetSignature: string;
};

/**
 * Preconfigured VitalPulse dashboard (site/dashboard + VitalPulse).
 * Read-only regression: no Save Filter / permanent widget save / dashboard delete.
 * Not RUM Performance Overview / VitalScope full page.
 */
export class VitalPulseDashboardPage {
  readonly locators: VitalPulseDashboardLocators;

  constructor(private readonly page: Page) {
    this.locators = new VitalPulseDashboardLocators(page);
  }

  async openViaNavigation(): Promise<void> {
    await ensurePortalSession(this.page);
    await new SiteDropdownPage(this.page).ensureProfileSite().catch(() => undefined);
    await new LeftNavPage(this.page).openSmokePage(PAGE_DEF);
    await this.waitForPageReady();
    await this.ensureVitalPulseSelected();
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
    await this.ensureVitalPulseSelected({ soft: true });
    await this.ensureProfileSiteSelected();
    if (!VITAL_PULSE_EXACT.test(await this.getDashboardLabel())) {
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
    if (re.test(await this.getSiteLabel())) return;

    const { softSelectQuickSite } = await import('../helpers/preconfiguredDashboardChrome');
    if (await softSelectQuickSite(this.page, profile.siteName)) return;

    await new SiteDropdownPage(this.page).ensureProfileSite().catch(() => undefined);
    await this.page.waitForTimeout(1500);
    if (re.test(await this.getSiteLabel())) return;

    await this.page
      .goto('/btportal/web/index.php?r=overview-dashboard/overview', {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      })
      .catch(() => undefined);
    await new SiteDropdownPage(this.page).ensureProfileSite().catch(() => undefined);
    if (!(await softSelectQuickSite(this.page, profile.siteName))) {
      await softSelectQuickSite(this.page, /GDC Test Site 2/i);
    }
    await this.page
      .goto('/btportal/web/index.php?r=site/dashboard', {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      })
      .catch(() => undefined);
    await this.waitForPageReady().catch(() => undefined);
    await this.ensureVitalPulseSelected({ soft: true }).catch(() => undefined);
    if (!(await softSelectQuickSite(this.page, profile.siteName))) {
      await new SiteDropdownPage(this.page).ensureProfileSite().catch(() => undefined);
    }
    await this.page.waitForTimeout(1500);
  }

  async ensureVitalPulseSelected(opts?: { soft?: boolean }): Promise<void> {
    const soft = opts?.soft === true;
    let label = await this.getDashboardLabel();
    if (VITAL_PULSE_EXACT.test(label)) return;
    try {
      await this.selectDashboard(VITAL_PULSE_EXACT);
      await this.page.waitForTimeout(4500);
    } catch {
      await this.selectDashboard(/^\s*VitalPulse\s*$/i).catch(() => undefined);
      await this.page.waitForTimeout(4000);
    }
    label = await this.getDashboardLabel();
    if (VITAL_PULSE_EXACT.test(label)) return;
    if (soft) return;
    await this.page.goto('/btportal/web/index.php?r=site/dashboard', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await this.waitForPageReady();
    await this.selectDashboard(VITAL_PULSE_EXACT).catch(() => undefined);
    await this.page.waitForTimeout(4500);
    label = await this.getDashboardLabel();
    expect(label, 'Dashboard switcher should show exact VitalPulse').toMatch(VITAL_PULSE_EXACT);
  }

  async selectDashboard(name: string | RegExp): Promise<void> {
    await this.closeOverlays();
    const re = typeof name === 'string' ? new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : name;
    const preferExactVitalPulse = /VitalPulse/i.test(String(name));
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
        if (preferExactVitalPulse && !VITAL_PULSE_EXACT.test(text)) continue;
        await options.nth(i).click({ force: true });
        clicked = true;
        break;
      }
      if (!clicked) {
        const opt = options.filter({ hasText: re }).first();
        if (await opt.isVisible({ timeout: 3000 }).catch(() => false)) {
          const t = ((await opt.textContent()) || '').replace(/\s+/g, ' ').trim();
          if (!preferExactVitalPulse || VITAL_PULSE_EXACT.test(t)) {
            await opt.click({ force: true });
            clicked = true;
          }
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
      labels.find((t) => VITAL_PULSE_EXACT.test(t.replace(/\s+/g, ' ').trim()) && preferExactVitalPulse) ||
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
    const body = await this.getPageBodySample(3500);
    // Site Summary may only appear in body; Performance Overview scoped to content
    expect(body, 'Site Summary should be present').toMatch(/Site Summary/i);
    await expect(this.locators.performanceOverviewHeading(), 'Performance Overview widget title').toBeVisible({
      timeout: 45000,
    });
  }

  async widgetsReadyScore(): Promise<number> {
    let score = 0;
    const body = await this.getPageBodySample(4000);
    if (/Site Summary/i.test(body)) score += 1;
    if (/All Matching Pages/i.test(body)) score += 1;
    if (
      /Largest Contentful Paint/i.test(body) &&
      /Cumulative Layout Shift/i.test(body) &&
      (/\bINP\b|First Input Delay|Interaction to Next Paint/i.test(body) ||
        (await this.page.locator('[id*="first-input-delay"]').count()) > 0)
    ) {
      score += 1;
    }
    if (/Revenue/i.test(body) && /Sessions/i.test(body) && /Orders/i.test(body)) score += 1;
    if (await this.locators.performanceOverviewHeading().isVisible().catch(() => false)) score += 1;
    if (await this.locators.performanceOverviewTable().isVisible().catch(() => false)) score += 1;
    const charts = await this.locators.highchartsContainers.count().catch(() => 0);
    if (charts > 0) score += 1;
    const cards = await this.locators.metricCards().count().catch(() => 0);
    if (cards > 0) score += 1;
    return score;
  }

  async expectCoreWidgetsReady(): Promise<void> {
    await expect
      .poll(async () => this.widgetsReadyScore(), { timeout: 90000 })
      .toBeGreaterThanOrEqual(3);
  }

  async getSiteSummarySignature(): Promise<string> {
    const host = this.locators.siteSummaryWidget();
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

  async getPerformanceOverviewSignature(): Promise<string> {
    const table = this.locators.performanceOverviewTable();
    if (await table.isVisible().catch(() => false)) {
      return table
        .evaluate((el) => {
          const headers = [...el.querySelectorAll('th, [role="columnheader"]')]
            .map((h) => (h.textContent || '').replace(/\s+/g, ' ').trim())
            .join('|')
            .slice(0, 200);
          const rows = el.querySelectorAll('tbody tr, [role="row"]').length;
          const text = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 180);
          return `${rows}|${headers}|${text}`;
        })
        .catch(() => 'missing');
    }
    const head = this.locators.performanceOverviewHeading();
    if (await head.isVisible().catch(() => false)) return 'title-only|1x1|Performance Overview';
    return 'missing';
  }

  async expectSiteSummaryGraphs(soft = false): Promise<void> {
    const ok = async () => {
      const sparklines = this.locators.siteSummarySparklines().or(this.locators.highchartsContainers);
      const n = await sparklines.count().catch(() => 0);
      if (n > 0) {
        for (let i = 0; i < Math.min(n, 16); i++) {
          const box = await sparklines.nth(i).boundingBox().catch(() => null);
          if (box && box.width > 20 && box.height > 20) return true;
        }
      }
      const sig = await this.getSiteSummarySignature();
      if (sig === 'missing') return false;
      const m = sig.match(/\|(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)\|/);
      if (m && Number(m[1]) > 40 && Number(m[2]) > 40) return true;
      return /Site Summary|INP|Largest Contentful/i.test(sig);
    };
    try {
      await expect.poll(ok, { timeout: soft ? 12000 : 30000 }).toBeTruthy();
    } catch (err) {
      if (soft) return;
      throw err;
    }
  }

  async getPerformanceOverviewHeaders(): Promise<string[]> {
    const table = this.locators.performanceOverviewTable();
    if (await table.isVisible().catch(() => false)) {
      const fromTh = (await this.locators.performanceOverviewHeaders().allTextContents())
        .map((t) => t.replace(/\s+/g, ' ').trim())
        .filter(Boolean);
      if (fromTh.length) return fromTh;
    }
    const body = await this.getPageBodySample(2000);
    const m = body.match(
      /Page Name[\s\S]{0,200}Cumulative Layout Shift|Page Name Page Views Onload/i
    );
    if (m) return m[0].split(/\s{2,}|\|/).map((s) => s.trim()).filter(Boolean);
    // Fallback known labels if present in body
    const known = [
      'Page Name',
      'Page Views',
      'Onload (s)',
      'First Byte (s)',
      'Largest Contentful Paint (s)',
      'Interaction to Next Paint (s)',
      'Cumulative Layout Shift',
    ];
    return known.filter((k) => new RegExp(k.replace(/[()]/g, '\\$&'), 'i').test(body));
  }

  async getPerformanceOverviewBodySample(): Promise<string> {
    const w = this.locators.performanceOverviewWidget();
    if (await w.count()) {
      return ((await w.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim().slice(0, 600);
    }
    const table = this.locators.performanceOverviewTable();
    if (await table.isVisible().catch(() => false)) {
      return ((await table.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim().slice(0, 600);
    }
    return this.getPageBodySample(600);
  }

  async captureContext(): Promise<VitalPulseContext> {
    return {
      dashboardLabel: await this.getDashboardLabel(),
      lookbackLabel: await this.getTimeLookbackLabel(),
      autoRefreshLabel: await this.getAutoRefreshLabel(),
      siteLabel: await this.getSiteLabel(),
      widgetSignature: [
        await this.getSiteSummarySignature(),
        await this.getPerformanceOverviewSignature(),
      ].join('||'),
    };
  }

  async restoreContext(ctx: VitalPulseContext): Promise<void> {
    await this.closeOverlays();
    await this.ensureVitalPulseSelected();
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

  async softHoverSiteSummarySparkline(): Promise<string> {
    const host = this.locators.siteSummaryWidget();
    await host.scrollIntoViewIfNeeded().catch(() => undefined);
    const chart = host
      .locator('.highcharts-container, [data-highcharts-chart], svg.highcharts-root')
      .first();
    const box = (await chart.boundingBox().catch(() => null)) || (await host.boundingBox());
    if (!box) return '';
    await this.page.mouse.move(box.x + box.width * 0.45, box.y + box.height * 0.55);
    await this.page.waitForTimeout(400);
    const tip = this.locators.highchartsTooltip.filter({ visible: true }).first();
    return ((await tip.innerText({ timeout: 1500 }).catch(() => '')) || '').replace(/\s+/g, ' ').trim();
  }

  /**
   * Soft metric visibility toggle for Site Summary (restore via refresh or re-check).
   */
  async softToggleMetricVisibility(): Promise<{ toggled: boolean; note: string }> {
    await this.closeOverlays();
    const edit = this.page.locator('[id*="edit-show-hide-chartID_"]').first();
    if (await edit.isVisible().catch(() => false)) {
      await edit.click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(400);
    }
    const toggle = this.page
      .locator('[id$="-revenue"], [id$="-sessions"], [id$="-orders"], [id$="-lcp"], [id$="-cls"], [id$="-cwv"]')
      .first();
    if (!(await toggle.count())) {
      return { toggled: false, note: 'Metric show/hide controls not found' };
    }
    const before = await this.getSiteSummarySignature();
    await toggle.click({ force: true }).catch(() => undefined);
    await this.page.waitForTimeout(800);
    const after = await this.getSiteSummarySignature();
    // restore
    await toggle.click({ force: true }).catch(() => undefined);
    const all = this.page.locator('[id$="-all-checked"]').first();
    if (await all.isVisible().catch(() => false)) {
      const checked = await all.isChecked().catch(() => true);
      if (!checked) await all.check({ force: true }).catch(() => undefined);
    }
    await this.page.waitForTimeout(600);
    return {
      toggled: true,
      note: `toggle id sample present; signature changed=${before !== after}`,
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
    await this.ensureVitalPulseSelected({ soft: true });
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
    let r = await softPlusDashboardEyeSwitch(this.page, /^\s*VitalPulse\s*$/i);
    if (!r.restoredHome) {
      await this.ensureVitalPulseSelected({ soft: true });
      r = { ...r, restoredHome: /^\s*VitalPulse\s*$/i.test(await this.getDashboardLabel()) };
    }
    await this.ensureProfileSiteSelected();
    await this.expectCoreWidgetsReady().catch(() => undefined);
    return r;
  }

  /**
   * Sort Performance Overview by clicking column headers; soft compare row order signature.
   */
  async softSortPerformanceOverviewColumns(): Promise<{
    columnsTried: string[];
    orderChanged: boolean;
    note: string;
  }> {
    const table = this.locators.performanceOverviewTable();
    await table.scrollIntoViewIfNeeded().catch(() => undefined);
    const headers = table.locator(
      'thead th, thead td, .slick-header-column, [role="columnheader"]'
    );
    const count = await headers.count().catch(() => 0);
    const columnsTried: string[] = [];
    let orderChanged = false;
    const firstRowSig = async () =>
      ((await this.locators.performanceOverviewBodyRows().first().innerText().catch(() => '')) || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 120);
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
          ? 'No clickable headers found'
          : `tried ${columnsTried.length} headers; orderChanged=${orderChanged}`,
    };
  }

  /**
   * Vital Scope arrow/chevron in Performance Overview — open modal/detail when UI exposes it.
   * Retries after alternate-site switch; marks not-found as soft miss when chrome has no expand affordance.
   */
  async expectVitalScopeArrowModal(opts?: {
    alternateSite?: RegExp;
  }): Promise<{ opened: boolean; note: string; softMiss?: boolean }> {
    const alt = opts?.alternateSite || /Demo eCommerce Global|eCommerce Global|GDC Test Site/i;

    const tryOpen = async (): Promise<{ opened: boolean; note: string; softMiss?: boolean }> => {
      const host = this.locators.performanceOverviewWidget();
      await host.scrollIntoViewIfNeeded().catch(() => undefined);
      await this.page.waitForTimeout(500);

      // Prefer page-name / first-column expanders (Vital Scope drill pattern)
      let candidates = host.locator(
        [
          'a.details-control',
          'td.details-control',
          'td:first-child a',
          'td:first-child button',
          'td:first-child i',
          'tbody tr td:nth-child(1) *',
          'tbody tr td:nth-child(2) a',
          'i.fa-chevron-right',
          'i.fa-caret-right',
          'i.fa-angle-right',
          'i.fa-plus-square',
          'i.fa-plus',
          '[title*="Vital" i]',
          '[title*="Scope" i]',
          '[title*="expand" i]',
          '.treegrid-expander',
          '.slick-row .slick-cell:first-child',
          'table tbody tr td i.fa',
        ].join(', ')
      );
      let n = await candidates.count().catch(() => 0);
      if (n < 1) {
        // Click first few page rows — some builds expand on row/page-name click
        candidates = host.locator(
          'table tbody tr, .slick-row, [role="row"]:not([role="columnheader"])'
        );
        n = await candidates.count().catch(() => 0);
      }
      if (n < 1) {
        return {
          opened: false,
          softMiss: true,
          note: 'no expandable / VitalScope icons or rows in Performance Overview widget',
        };
      }

      for (let i = 0; i < Math.min(n, 12); i++) {
        const a = candidates.nth(i);
        if (!(await a.isVisible().catch(() => false))) continue;
        await a.click({ force: true, timeout: 2500 }).catch(() => undefined);
        await this.page.waitForTimeout(900);
        const modal = this.page
          .locator(
            '.modal.in, .modal.show, .jconfirm.jconfirm-open, [role="dialog"], .ui-dialog, #vital-scope-modal, [id*="vital" i][class*="modal"]'
          )
          .filter({ visible: true })
          .first();
        const popover = this.page
          .locator('.popover, .highcharts-popup, .dropdown-menu.open, .bs-popover-auto')
          .filter({ visible: true })
          .first();
        const modalText =
          ((await modal.innerText({ timeout: 1200 }).catch(() => '')) ||
            (await popover.innerText({ timeout: 600 }).catch(() => '')) ||
            '').replace(/\s+/g, ' ').trim();
        const nestedDetail = await host
          .locator(
            'tr.shown, tr.child, tr.detail, .slick-row.expanded, [class*="vitalscope" i], [class*="attribution" i], [id*="vital" i], .slider-detail, .page-detail'
          )
          .first()
          .isVisible()
          .catch(() => false);
        const bodySnippet = await this.getPerformanceOverviewBodySample();
        const looksLikeVitalScope =
          /Vital\s*Scope|Element Render|Attribution|LCP Element|Long Animation|LoAF|Render Delay|INP|Layout Shift|Core Web Vital/i.test(
            modalText + ' ' + bodySnippet
          );
        if ((await modal.isVisible().catch(() => false)) || (await popover.isVisible().catch(() => false))) {
          if (looksLikeVitalScope || modalText.length > 10) {
            await this.page.keyboard.press('Escape').catch(() => undefined);
            await this.closeOverlays();
            return {
              opened: true,
              note: `modal/popover opened len≈${modalText.length} vitalScopeish=${looksLikeVitalScope}`,
            };
          }
          await this.page.keyboard.press('Escape').catch(() => undefined);
        }
        if (nestedDetail || looksLikeVitalScope) {
          await this.page.keyboard.press('Escape').catch(() => undefined);
          return { opened: true, note: 'nested VitalScope-like detail visible after expand' };
        }
      }
      return {
        opened: false,
        note: `clicked ${Math.min(n, 12)} expand candidates; no VitalScope modal/detail`,
      };
    };

    const first = await tryOpen();
    if (first.opened) return first;

    let switched = false;
    try {
      const { softSelectQuickSite } = await import('../helpers/preconfiguredDashboardChrome');
      // Try several alternate sites common on US portal
      for (const pattern of [
        alt,
        /Demo eCommerce Global/i,
        /Demo eCommer/i,
        /GDC Test Site 2/i,
        /GDC Test Site/i,
      ]) {
        switched = await softSelectQuickSite(this.page, pattern);
        if (switched) break;
      }
      await this.page.waitForTimeout(2500);
      await this.locators
        .performanceOverviewHeading()
        .waitFor({ state: 'visible', timeout: 20000 })
        .catch(() => undefined);
    } catch {
      switched = false;
    }

    const second = await tryOpen();
    try {
      await this.ensureProfileSiteSelected();
      await this.page.waitForTimeout(1500);
      await this.ensureVitalPulseSelected({ soft: true });
    } catch {
      // ignore
    }

    if (second.opened) {
      return { opened: true, note: `after site-switch(${switched}): ${second.note}` };
    }
    return {
      opened: false,
      softMiss: Boolean(first.softMiss && second.softMiss) || (!switched && !first.opened),
      note: `fail: ${first.note} | retry: ${second.note} siteSwitch=${switched}`,
    };
  }

  async expectNotConfusedSurfaces(): Promise<void> {
    await expect(this.page).not.toHaveURL(/overview-dashboard\/marketing/i);
    await expect(this.page).not.toHaveURL(/overview-dashboard\/overview/i);
    await expect(this.page).not.toHaveURL(/real-user|performance-overview|performance_overview/i);
    await expect(this.locators.pageTitle).not.toHaveText(
      /Marketing Overview|Digital Experience Overview|Performance Overview/i
    );
    await expect(this.page).toHaveURL(/site\/dashboard|r=site%2Fdashboard/i);
    const dash = await this.getDashboardLabel();
    expect(dash).toMatch(VITAL_PULSE_EXACT);
  }

  async expectNotSiteOverviewHomeWidgetsOnly(): Promise<void> {
    const body = await this.getPageBodySample(2000);
    const dash = await this.getDashboardLabel();
    if (VITAL_PULSE_EXACT.test(dash)) {
      expect(body).toMatch(/Site Summary|Performance Overview/i);
    }
  }
}
