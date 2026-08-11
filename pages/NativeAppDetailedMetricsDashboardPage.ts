import { Page, expect, Locator } from '@playwright/test';
import { NativeAppDetailedMetricsDashboardLocators } from '../locators/NativeAppDetailedMetricsDashboardLocators';
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

export type DetailedMetricsOs = 'android' | 'ios';

export const NADM_ANDROID_EXACT = /^\s*Native App Detailed Metrics\s*-\s*Android\s*$/i;
export const NADM_IOS_EXACT = /^\s*Native App Detailed Metrics\s*-\s*iOS\s*$/i;
export const NADM_ANDROID_ALT =
  /^\s*Native App (Performance\s+)?Detailed Metrics\s*-\s*Android\s*$/i;
export const NADM_IOS_ALT = /^\s*Native App (Performance\s+)?Detailed Metrics\s*-\s*iOS\s*$/i;

export function isNativeAppDetailedMetricsLabel(text: string, os?: DetailedMetricsOs): boolean {
  const t = (text || '').replace(/\s+/g, ' ').trim();
  // Reject four-widget Performance Detail sibling
  if (/performance\s+detail(?!ed)/i.test(t) && !/detailed\s+metrics/i.test(t)) return false;
  if (/synthetic|\brum\b|site\s*health|traffic\s+source|site\s+overview|vital/i.test(t) && !/detailed\s+metrics/i.test(t))
    return false;
  if (os === 'android') return NADM_ANDROID_EXACT.test(t) || NADM_ANDROID_ALT.test(t);
  if (os === 'ios') return NADM_IOS_EXACT.test(t) || NADM_IOS_ALT.test(t);
  return (
    NADM_ANDROID_EXACT.test(t) ||
    NADM_IOS_EXACT.test(t) ||
    NADM_ANDROID_ALT.test(t) ||
    NADM_IOS_ALT.test(t)
  );
}

export type NativeAppDetailedMetricsDashboardContext = {
  dashboardLabel: string;
  lookbackLabel: string;
  autoRefreshLabel: string;
  siteLabel: string;
  os: DetailedMetricsOs;
  widgetSignature: string;
};

/**
 * Preconfigured Native App Detailed Metrics (Android default / soft iOS).
 * Read-only: no Save Filter / permanent widget save / dashboard delete.
 */
export class NativeAppDetailedMetricsDashboardPage {
  readonly locators: NativeAppDetailedMetricsDashboardLocators;

  constructor(private readonly page: Page) {
    this.locators = new NativeAppDetailedMetricsDashboardLocators(page);
  }

  homeOs(): DetailedMetricsOs {
    return 'android';
  }

  exactFor(os: DetailedMetricsOs): RegExp {
    return os === 'android' ? NADM_ANDROID_EXACT : NADM_IOS_EXACT;
  }

  async openViaNavigation(os: DetailedMetricsOs = 'android'): Promise<void> {
    await ensurePortalSession(this.page);
    await new SiteDropdownPage(this.page).ensureProfileSite().catch(() => undefined);
    await new LeftNavPage(this.page).openSmokePage(PAGE_DEF);
    await this.waitForPageReady();
    await this.ensureOsSelected(os);
    await this.ensureProfileSiteSelected();
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

  async recoverPage(os: DetailedMetricsOs = 'android'): Promise<void> {
    await this.closeOverlays();
    await this.page
      .goto('/btportal/web/index.php?r=site/dashboard', {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      })
      .catch(async () => {
        await this.openViaNavigation(os);
      });
    await this.waitForPageReady().catch(async () => {
      await this.openViaNavigation(os);
    });
    await this.ensureOsSelected(os, { soft: true });
    await this.ensureProfileSiteSelected();
    if (!isNativeAppDetailedMetricsLabel(await this.getDashboardLabel(), os)) {
      await this.openViaNavigation(os);
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
    if (re.test(await this.getSiteLabel())) return;

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

  async ensureOsSelected(os: DetailedMetricsOs, opts?: { soft?: boolean }): Promise<void> {
    const soft = opts?.soft === true;
    let label = await this.getDashboardLabel();
    if (isNativeAppDetailedMetricsLabel(label, os)) return;
    try {
      await this.selectDashboard(this.exactFor(os), os);
      await this.page.waitForTimeout(5000);
    } catch {
      await this.selectDashboard(
        os === 'android'
          ? /Native App Detailed Metrics\s*-\s*Android/i
          : /Native App Detailed Metrics\s*-\s*iOS/i,
        os
      ).catch(() => undefined);
      await this.page.waitForTimeout(4500);
    }
    label = await this.getDashboardLabel();
    if (isNativeAppDetailedMetricsLabel(label, os)) {
      await this.ensureProfileSiteSelected();
      return;
    }
    if (soft) return;
    await this.page.goto('/btportal/web/index.php?r=site/dashboard', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await this.waitForPageReady();
    await this.selectDashboard(this.exactFor(os), os).catch(() => undefined);
    await this.page.waitForTimeout(5000);
    await this.ensureProfileSiteSelected();
    label = await this.getDashboardLabel();
    expect(label, `Dashboard switcher should show Native App Detailed Metrics - ${os}`).toMatch(
      this.exactFor(os)
    );
  }

  async selectDashboard(name: string | RegExp, preferOs?: DetailedMetricsOs): Promise<void> {
    await this.closeOverlays();
    const re =
      typeof name === 'string'
        ? new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
        : name;
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
        if (preferOs && !isNativeAppDetailedMetricsLabel(text, preferOs)) continue;
        // When seeking Detailed Metrics, never land on Performance Detail
        if (/detailed\s+metrics/i.test(String(name)) && /performance\s+detail(?!ed)/i.test(text))
          continue;
        await options.nth(i).click({ force: true });
        clicked = true;
        break;
      }
      if (!clicked) {
        const opt = options.filter({ hasText: re }).first();
        if (await opt.isVisible({ timeout: 3000 }).catch(() => false)) {
          const t = ((await opt.textContent()) || '').replace(/\s+/g, ' ').trim();
          if (!(/performance\s+detail(?!ed)/i.test(t) && /detailed/i.test(String(name)))) {
            await opt.click({ force: true });
            clicked = true;
          }
        }
      }
      if (clicked) {
        await this.page.waitForTimeout(6000);
        await this.ensureProfileSiteSelected();
        return;
      }
      await this.page.keyboard.press('Escape').catch(() => undefined);
    }
    const native = this.locators.switchDashboard;
    const labels = await native.locator('option').allTextContents();
    const match =
      labels.find((t) => preferOs && isNativeAppDetailedMetricsLabel(t.replace(/\s+/g, ' ').trim(), preferOs)) ||
      labels.find((t) => re.test(t.replace(/\s+/g, ' ').trim())) ||
      labels.find((t) => isNativeAppDetailedMetricsLabel(t.replace(/\s+/g, ' ').trim()));
    if (!match) throw new Error(`Dashboard option not found: ${name}`);
    await native.selectOption({ label: match }).catch(async () => {
      const val = await native.locator('option').filter({ hasText: re }).first().getAttribute('value');
      if (val) await native.selectOption(val);
    });
    await this.page.waitForTimeout(6000);
    await this.ensureProfileSiteSelected();
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

  async getPageBodySample(max = 4000): Promise<string> {
    return ((await this.page.locator('#page-contents, body').first().innerText().catch(() => '')) || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, max);
  }

  async widgetsReadyScore(): Promise<number> {
    let score = 0;
    const body = await this.getPageBodySample(8000);
    if (/Native App Performance/i.test(body)) score += 1;
    if (/1st vs 3rd Party Activity/i.test(body)) score += 1;
    if (/Network Request Failures Over Time/i.test(body)) score += 1;
    if (/(Android|iOS)\s+(Friction Map|App Friction Map)/i.test(body)) score += 1;
    if (/Native App Crash Summary/i.test(body)) score += 1;
    if (/Native App HTTP Responses/i.test(body)) score += 1;
    if (/HTTP Responses\s+(By|by)\s+Error Count/i.test(body)) score += 1;
    if (/ANR|Out Of Memory|Out of Memory/i.test(body)) score += 1;
    if (/CPU and Memory Usage|Average CPU And Memory Usage/i.test(body)) score += 1;
    if ((await this.locators.highchartsContainers.count().catch(() => 0)) >= 1) score += 1;
    return score;
  }

  async expectCoreWidgetsReady(): Promise<void> {
    await expect
      .poll(async () => this.widgetsReadyScore(), { timeout: 90000 })
      .toBeGreaterThanOrEqual(6);
  }

  async expectCoreWidgetTitles(): Promise<void> {
    const body = await this.getPageBodySample(8000);
    expect(body, 'Native App Performance').toMatch(/Native App Performance/i);
    expect(body, '1st vs 3rd Party Activity').toMatch(/1st vs 3rd Party Activity/i);
    expect(body, 'Network Request Failures').toMatch(/Network Request Failures Over Time/i);
    expect(body, 'Crash Summary').toMatch(/Native App Crash Summary/i);
    expect(body, 'HTTP Responses').toMatch(/Native App HTTP Responses/i);
    expect(body, 'HTTP by Error Count').toMatch(/HTTP Responses\s+(By|by)\s+Error Count/i);
    expect(body, 'ANR/OOM').toMatch(/ANR|Out Of Memory|Out of Memory/i);
    expect(body, 'CPU and Memory').toMatch(/CPU and Memory Usage|Average CPU And Memory Usage/i);
    expect(body, 'Friction Map').toMatch(/(Android|iOS)\s+(Friction Map|App Friction Map)/i);
  }

  async widgetSignature(): Promise<string> {
    return this.page
      .evaluate(() => {
        const root = document.querySelector('#page-contents') || document.body;
        const text = (root?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 500);
        const charts = document.querySelectorAll('.highcharts-container, [data-highcharts-chart]').length;
        const items = document.querySelectorAll('.grid-stack-item').length;
        return `${items}|${charts}|${text}`;
      })
      .catch(() => 'missing');
  }

  async captureContext(os: DetailedMetricsOs = 'android'): Promise<NativeAppDetailedMetricsDashboardContext> {
    return {
      dashboardLabel: await this.getDashboardLabel(),
      lookbackLabel: await this.getTimeLookbackLabel(),
      autoRefreshLabel: await this.getAutoRefreshLabel(),
      siteLabel: await this.getSiteLabel(),
      os,
      widgetSignature: await this.widgetSignature(),
    };
  }

  async restoreContext(ctx: NativeAppDetailedMetricsDashboardContext): Promise<void> {
    await this.closeOverlays();
    await this.ensureOsSelected(ctx.os || 'android');
    await this.ensureProfileSiteSelected();
    if (ctx.lookbackLabel) {
      const currentLookback = await this.getTimeLookbackLabel();
      const same =
        currentLookback.toLowerCase() === ctx.lookbackLabel.toLowerCase() ||
        currentLookback.toLowerCase().includes(ctx.lookbackLabel.toLowerCase()) ||
        ctx.lookbackLabel.toLowerCase().includes(currentLookback.toLowerCase());
      if (!same) {
        await this.selectTimeLookback(ctx.lookbackLabel).catch(async () => {
          await this.selectTimeLookback(/Last 1 hour|Last 6 hours|Last 24 hours/i).catch(
            () => undefined
          );
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
    const apply = this.page
      .locator('#apply-filters, #filters-section button, .filters-section button, button')
      .filter({ hasText: /^Apply( Filters)?$/i })
      .filter({ visible: true })
      .first();
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
    return this.page
      .getByText(/DASHBOARD MANAGER|Dashboard Manager/i)
      .first()
      .isVisible()
      .catch(() => false);
  }

  async softOpenWidgetWizard(): Promise<boolean> {
    await this.closeOverlays();
    if (!(await this.locators.createWidget.isVisible().catch(() => false))) return false;
    await this.locators.createWidget.click({ force: true }).catch(() => undefined);
    await this.page.waitForTimeout(800);
    return this.page.getByText(/Add a Widget/i).first().isVisible().catch(() => false);
  }

  frictionTitleFor(os: DetailedMetricsOs): RegExp {
    return os === 'android'
      ? /Android\s+(Friction Map|App Friction Map)/i
      : /iOS\s+(Friction Map|App Friction Map)/i;
  }

  async softAssertFrictionOs(os: DetailedMetricsOs): Promise<{ ok: boolean; sample: string }> {
    const body = await this.getPageBodySample(4000);
    const sample = (body.match(/(Android|iOS)\s+(Friction Map|App Friction Map)[^|]{0,40}/i)?.[0] ||
      body.slice(0, 80));
    const ok = this.frictionTitleFor(os).test(body);
    return { ok, sample: String(sample) };
  }

  async softEmptyAnnotation(body?: string): Promise<string[]> {
    const b = body || (await this.getPageBodySample(6000));
    const notes: string[] = [];
    if (/Friction Map[\s\S]{0,40}No data to display|No data to display[\s\S]{0,40}Friction/i.test(b)) {
      notes.push('Friction Map controlled empty (No data to display)');
    }
    if (/Crash Summary[\s\S]{0,40}No data to display|No data to display[\s\S]{0,40}Crash/i.test(b)) {
      notes.push('Crash Summary controlled empty');
    }
    if (/ANR[\s\S]{0,60}No data to display|No data to display[\s\S]{0,60}Out Of Memory/i.test(b)) {
      notes.push('ANR/OOM controlled empty');
    }
    return notes;
  }

  async softPartyDomainsRequestsToggle(): Promise<{ note: string; toggled: boolean }> {
    const widget = this.locators.partyActivityWidget();
    await widget.scrollIntoViewIfNeeded().catch(() => undefined);
    const domains = widget.getByText(/^DOMAINS$/i).first();
    const requests = widget.getByText(/^NETWORK REQUESTS$/i).first();
    let toggled = false;
    if (await requests.isVisible().catch(() => false)) {
      await requests.click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(800);
      toggled = true;
    }
    if (await domains.isVisible().catch(() => false)) {
      await domains.click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(800);
      toggled = true;
    }
    return {
      toggled,
      note: toggled ? 'Party Domains/Network Requests soft toggled + restored Domains-leaning' : 'Party toggles not clickable',
    };
  }

  async softCpuGraphTableToggle(): Promise<{ note: string; toggled: boolean }> {
    const graphBtn = this.locators.cpuGraphBtn();
    const tableBtn = this.locators.cpuTableBtn();
    let toggled = false;
    if (await tableBtn.isVisible().catch(() => false)) {
      await tableBtn.click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(800);
      toggled = true;
    }
    if (await graphBtn.isVisible().catch(() => false)) {
      await graphBtn.click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(800);
      toggled = true;
    }
    return {
      toggled,
      note: toggled ? 'CPU graph/table soft toggled' : 'CPU graph/table buttons not visible',
    };
  }

  async softLegendToggleInWidget(widget: Locator): Promise<{ toggled: boolean; note: string }> {
    await widget.scrollIntoViewIfNeeded().catch(() => undefined);
    const legend = widget.locator(
      '.highcharts-legend-item, .highcharts-legend-item text, .highcharts-legend text'
    );
    const count = await legend.count().catch(() => 0);
    if (count < 1) {
      const byName = widget
        .getByText(/CPU Usage|Memory Usage|Network Request Failures|Performance Timing|Page Views/i)
        .first();
      if (await byName.isVisible().catch(() => false)) {
        await byName.click({ force: true }).catch(() => undefined);
        await this.page.waitForTimeout(500);
        await byName.click({ force: true }).catch(() => undefined);
        return { toggled: true, note: 'Legend text soft toggle' };
      }
      return { toggled: false, note: 'No legend items' };
    }
    const item = legend.first();
    await item.click({ force: true }).catch(() => undefined);
    await this.page.waitForTimeout(500);
    await item.click({ force: true }).catch(() => undefined);
    return { toggled: true, note: `Legend soft toggle items≈${count}` };
  }

  async softIosRoundTrip(): Promise<{ note: string; frictionIos: boolean; restored: boolean }> {
    await this.ensureOsSelected('ios');
    await this.expectCoreWidgetsReady().catch(() => undefined);
    const friction = await this.softAssertFrictionOs('ios');
    await this.ensureOsSelected('android');
    await this.ensureProfileSiteSelected();
    await this.expectCoreWidgetsReady().catch(() => undefined);
    const restored = isNativeAppDetailedMetricsLabel(await this.getDashboardLabel(), 'android');
    return {
      note: `iOS friction sample="${friction.sample}"; restoredAndroid=${restored}`,
      frictionIos: friction.ok,
      restored,
    };
  }

  async softPerformanceDetailSiblingDiscrimination(): Promise<{ note: string; restored: boolean }> {
    const names = await this.listPreconfiguredDashboardNames();
    const napd = names.find((n) => /^\s*Native App Performance Detail\s*$/i.test(n));
    if (!napd) return { note: 'Native App Performance Detail not in switcher', restored: true };
    await this.selectDashboard(/^\s*Native App Performance Detail\s*$/i);
    await this.page.waitForTimeout(3000);
    const after = await this.getDashboardLabel();
    await this.ensureOsSelected('android');
    await this.ensureProfileSiteSelected();
    const restored = isNativeAppDetailedMetricsLabel(await this.getDashboardLabel(), 'android');
    return {
      note: `Visited sibling="${after}"; restoredDetailedMetricsAndroid=${restored}`,
      restored,
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
      [/Last 6 hours|Last 1 hour/i, /Last 24 hours/i, /Last 7 days/i, /Last 30 days/i]
    );
    if (restoreLabel) {
      await this.selectTimeLookback(restoreLabel).catch(async () => {
        await this.selectTimeLookback(/Last 1 hour|Last 6 hours|Last 24 hours/i);
      });
    }
    return results;
  }

  async softSiteChangeAndLock() {
    const { softSiteChangeAndLock } = await import('../helpers/preconfiguredDashboardChrome');
    const r = await softSiteChangeAndLock(this.page);
    await this.ensureOsSelected('android', { soft: true });
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
    let r = await softPlusDashboardEyeSwitch(this.page, NADM_ANDROID_EXACT);
    if (!r.restoredHome) {
      await this.ensureOsSelected('android', { soft: true });
      r = {
        ...r,
        restoredHome: isNativeAppDetailedMetricsLabel(await this.getDashboardLabel(), 'android'),
      };
    }
    await this.ensureProfileSiteSelected();
    await this.expectCoreWidgetsReady().catch(() => undefined);
    return r;
  }

  async expectNotConfusedSurfaces(): Promise<void> {
    await expect(this.page).not.toHaveURL(/overview-dashboard\/marketing/i);
    await expect(this.page).not.toHaveURL(/overview-dashboard\/overview/i);
    await expect(this.page).not.toHaveURL(
      /performance-detail|real-user|realuser|rum\/performance|monitoring\/.*performance/i
    );
    await expect(this.locators.pageTitle).not.toHaveText(
      /Marketing Overview|Digital Experience Overview/i
    );
    await expect(this.page).toHaveURL(/site\/dashboard|r=site%2Fdashboard/i);
    const dash = await this.getDashboardLabel();
    expect(isNativeAppDetailedMetricsLabel(dash), `dash="${dash}"`).toBeTruthy();
    expect(dash).not.toMatch(/^\s*Native App Performance Detail\s*$/i);
    expect(dash).not.toMatch(/RUM Performance Detail/i);
    expect(dash).not.toMatch(/Synthetic Performance Detail/i);
  }
}
