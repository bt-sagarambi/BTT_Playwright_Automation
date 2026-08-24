import { Page, expect, Locator } from '@playwright/test';
import { RumRegressionUs2DashboardLocators } from '../locators/RumRegressionUs2DashboardLocators';
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

/** Exact Custom option — never matches Alerts/Synthetic Regression - US2 or other *-US2 boards. */
export const RR_US2_EXACT = /^\s*RUM Regression\s*-\s*US2\s*$/i;

export type RumRegressionUs2Context = {
  dashboardLabel: string;
  lookbackLabel: string;
  autoRefreshLabel: string;
  siteLabel: string;
  widgetSignature: string;
  kpiComparisonType: string;
  pathLevel: string;
  pathDevice: string;
  geographyMetric: string;
};

/**
 * Custom RUM Regression - US2 dashboard (site/dashboard).
 * Read-only: no Save Filter / widget Save / Delete / sticky KPI Apply / Path / Geography metric.
 */
export class RumRegressionUs2DashboardPage {
  readonly locators: RumRegressionUs2DashboardLocators;

  constructor(private readonly page: Page) {
    this.locators = new RumRegressionUs2DashboardLocators(page);
  }

  async openViaNavigation(): Promise<void> {
    await ensurePortalSession(this.page);
    await new SiteDropdownPage(this.page).ensureProfileSite().catch(() => undefined);
    await new LeftNavPage(this.page).openSmokePage(PAGE_DEF);
    await this.waitForPageReady();
    await this.ensureRumRegressionUs2Selected();
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
    await this.ensureRumRegressionUs2Selected({ soft: true });
    await this.ensureProfileSiteSelected();
    if (!RR_US2_EXACT.test(await this.getDashboardLabel())) {
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
          const title = quick?.getAttribute('title') || global?.getAttribute('title') || '';
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

  async ensureRumRegressionUs2Selected(opts?: { soft?: boolean }): Promise<void> {
    const soft = opts?.soft === true;
    let label = await this.getDashboardLabel();
    if (RR_US2_EXACT.test(label)) return;
    try {
      await this.selectDashboard(RR_US2_EXACT);
      await this.page.waitForTimeout(5000);
    } catch {
      await this.selectDashboard(/RUM Regression\s*-\s*US2/i).catch(() => undefined);
      await this.page.waitForTimeout(4500);
    }
    label = await this.getDashboardLabel();
    if (RR_US2_EXACT.test(label)) return;
    if (soft) return;
    await this.page.goto('/btportal/web/index.php?r=site/dashboard', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await this.waitForPageReady();
    await this.selectDashboard(RR_US2_EXACT).catch(() => undefined);
    await this.page.waitForTimeout(5000);
    label = await this.getDashboardLabel();
    expect(label, 'Dashboard switcher should show exact RUM Regression - US2').toMatch(RR_US2_EXACT);
  }

  async selectDashboard(name: string | RegExp): Promise<void> {
    await this.closeOverlays();
    const re = typeof name === 'string' ? new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : name;
    const preferHome = /RUM Regression/i.test(String(name));
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
        if (preferHome && !RR_US2_EXACT.test(text)) continue;
        await options.nth(i).click({ force: true });
        clicked = true;
        break;
      }
      if (!clicked) {
        const opt = options.filter({ hasText: re }).first();
        if (await opt.isVisible({ timeout: 3000 }).catch(() => false)) {
          const t = ((await opt.textContent()) || '').replace(/\s+/g, ' ').trim();
          if (!preferHome || RR_US2_EXACT.test(t)) {
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
      labels.find((t) => RR_US2_EXACT.test(t.replace(/\s+/g, ' ').trim()) && preferHome) ||
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

  async softScrollTo(locator: Locator): Promise<void> {
    await locator
      .evaluate((el) => {
        el.scrollIntoView({ block: 'center', inline: 'nearest' });
      })
      .catch(() => undefined);
    await this.page.waitForTimeout(300).catch(() => undefined);
  }

  async expectCoreWidgetTitles(): Promise<void> {
    const body = await this.getPageBodySample(16000);
    expect(body, 'RUM Performance - US2').toMatch(/RUM\s+Performance\s*-\s*US2|Performance Details/i);
    expect(body, 'RUM Native App Performance - US2').toMatch(/RUM\s+Native\s+App\s+Performance\s*-\s*US2/i);
    expect(body, 'RUM Performance Comparison - US2').toMatch(/RUM\s+Performance\s+Comparison\s*-\s*US2/i);
    expect(body, 'Bounce Rate - US2').toMatch(/Bounce\s+Rate\s*-\s*US2/i);
  }

  async widgetsReadyScore(): Promise<number> {
    let score = 0;
    const body = await this.getPageBodySample(14000);
    if (/RUM\s+Performance\s*-\s*US2|Performance Details/i.test(body)) score += 1;
    if (/Native\s+App\s+Performance\s*-\s*US2/i.test(body)) score += 1;
    if (/Performance\s+Comparison\s*-\s*US2/i.test(body)) score += 1;
    if (/Bounce\s+Rate\s*-\s*US2/i.test(body)) score += 1;
    if (/KPI\s+Date\s+Comparison|Performance\s+Summary|Traffic\s+Information|Device\s+Metrics/i.test(body))
      score += 1;
    if (/Performance\s+by\s+Browser|Performance\s+by\s+Country|Performance\s+by\s+Geography/i.test(body))
      score += 1;
    const charts = await this.locators.highchartsContainers.count().catch(() => 0);
    if (charts >= 1) score += 1;
    return score;
  }

  async expectCoreWidgetsReady(): Promise<void> {
    await expect
      .poll(async () => this.widgetsReadyScore(), { timeout: 90000 })
      .toBeGreaterThanOrEqual(5);
  }

  async widgetSignature(host: Locator): Promise<string> {
    if (!(await host.count().catch(() => 0))) return 'missing';
    return host
      .evaluate((el) => {
        const text = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 220);
        const rows = el.querySelectorAll('tbody tr, tr').length;
        return `${rows}|${text}`;
      })
      .catch(() => 'missing');
  }

  async captureGraphLookbackSignature(): Promise<string> {
    return this.page.evaluate(() => {
      const txt = (el: Element | null) => ((el && (el as HTMLElement).innerText) || '').replace(/\s+/g, ' ').trim();
      const items = [...document.querySelectorAll('.grid-stack-item')];
      const find = (re: RegExp) => items.find((el) => re.test(txt(el))) || null;
      const perf = find(/RUM\s+Performance\s*-\s*US2|Performance Details/i);
      const compare = find(/Performance\s+Comparison\s*-\s*US2/i);
      const bounce = find(/Bounce\s+Rate\s*-\s*US2/i);
      const kpi = find(/KPI\s+Date\s+Comparison/i);
      const charts = document.querySelectorAll('.highcharts-container, [data-highcharts-chart]').length;
      return [
        `hc=${charts}`,
        txt(perf).slice(0, 160),
        txt(compare).slice(0, 140),
        txt(bounce).slice(0, 120),
        txt(kpi).slice(0, 120),
      ].join('||');
    });
  }

  async getKpiComparisonType(): Promise<string> {
    const host = this.locators.kpiDateComparisonWidget();
    const sample = await this.widgetSample(host, 400);
    if (/Year to Year/i.test(sample) && /active.*Year|Year to Year.*active|selected.*Year/i.test(sample))
      return 'Year to Year';
    if (/Custom/i.test(sample) && /Type of Comparison.*Custom|Custom.*active/i.test(sample)) return 'Custom';
    if (/Day to Day/i.test(sample)) return 'Day to Day';
    return 'Day to Day';
  }

  async getPathLevel(): Promise<string> {
    const host = this.locators.performancePathWidget();
    const sample = await this.widgetSample(host, 350);
    if (/Detail Level/i.test(sample) && /Detail Level.*active|active.*Detail/i.test(sample)) return 'Detail Level';
    return 'High Level';
  }

  async getPathDevice(): Promise<string> {
    const host = this.locators.performancePathWidget();
    const sample = await this.widgetSample(host, 280);
    if (/Desktop/i.test(sample) && /desktop.*active|active.*Desktop/i.test(sample)) return 'Desktop';
    if (/Mobile/i.test(sample) && /mobile.*active|active.*Mobile/i.test(sample)) return 'Mobile';
    return 'All';
  }

  async getGeographyMetricLabel(): Promise<string> {
    const host = this.locators.performanceByGeographyWidget();
    const metric = this.locators.geographyMetric(host);
    if (await metric.isVisible().catch(() => false)) {
      const t = ((await metric.textContent().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
      if (t && t.length < 60) return t;
    }
    const sample = await this.widgetSample(host, 300);
    const m = sample.match(/Displayed Metric:\s*([A-Za-z0-9 /]+)/i);
    return (m?.[1] || 'Onload').trim().slice(0, 40);
  }

  async softKpiComparisonTypeRoundTrip(): Promise<string> {
    const host = this.locators.kpiDateComparisonWidget();
    await this.softScrollTo(host);
    const start = await this.getKpiComparisonType();
    const notes: string[] = [`start=${start}`];
    const yty = this.locators.kpiYearToYear(host);
    const dtd = this.locators.kpiDayToDay(host);
    if (await yty.isVisible().catch(() => false)) {
      await yty.click({ force: true, timeout: 4000 }).catch(() => undefined);
      await this.page.waitForTimeout(600);
      notes.push('clicked Year to Year');
    }
    if (await dtd.isVisible().catch(() => false)) {
      await dtd.click({ force: true, timeout: 4000 }).catch(() => undefined);
      await this.page.waitForTimeout(500);
      notes.push('restored Day to Day');
    }
    notes.push(`end=${await this.getKpiComparisonType()}`);
    return notes.join('; ');
  }

  async softPathHighDetailRoundTrip(): Promise<string> {
    const host = this.locators.performancePathWidget();
    await this.softScrollTo(host);
    const notes: string[] = [];
    const detail = this.locators.pathDetailLevel(host);
    const high = this.locators.pathHighLevel(host);
    if (await detail.isVisible().catch(() => false)) {
      await detail.click({ force: true, timeout: 4000 }).catch(() => undefined);
      await this.page.waitForTimeout(500);
      notes.push('Detail Level');
    }
    if (await high.isVisible().catch(() => false)) {
      await high.click({ force: true, timeout: 4000 }).catch(() => undefined);
      await this.page.waitForTimeout(400);
      notes.push('High Level restored');
    }
    const desktop = this.locators.pathDesktop(host);
    const all = this.locators.pathAllDevices(host);
    if (await desktop.isVisible().catch(() => false)) {
      await desktop.click({ force: true, timeout: 3000 }).catch(() => undefined);
      await this.page.waitForTimeout(400);
      notes.push('Desktop sample');
    }
    if (await all.isVisible().catch(() => false)) {
      await all.click({ force: true, timeout: 3000 }).catch(() => undefined);
      notes.push('All devices restored');
    }
    return notes.join('; ') || 'path chrome soft n/a';
  }

  async softGeographyMetricMenuSample(): Promise<string> {
    const host = this.locators.performanceByGeographyWidget();
    await this.softScrollTo(host);
    const before = await this.getGeographyMetricLabel();
    const metric = this.locators.geographyMetric(host);
    if (!(await metric.isVisible().catch(() => false))) {
      return `geography metric not visible; before="${before}"`;
    }
    await metric.click({ force: true, timeout: 4000 }).catch(() => undefined);
    await this.page.waitForTimeout(400);
    const opts = await this.page
      .locator('.select2-results__option, .dropdown-menu li, button, a')
      .filter({ hasText: /Onload|LCP|FCP|INP|DOM|TEST OVERRIDE/i })
      .allTextContents()
      .catch(() => [] as string[]);
    const sample = opts
      .map((t) => t.replace(/\s+/g, ' ').trim())
      .filter((t) => t && t.length < 50)
      .slice(0, 8);
    await this.page.keyboard.press('Escape').catch(() => undefined);
    await this.closeOverlays();
    const after = await this.getGeographyMetricLabel();
    return `before="${before}" after="${after}" options=${sample.join('|') || '(none)'}`;
  }

  async restoreWidgetDefaults(ctx?: RumRegressionUs2Context): Promise<string> {
    const notes: string[] = [];
    try {
      await this.closeOverlays();
      const host = this.locators.performancePathWidget();
      if (await host.count().catch(() => 0)) {
        await this.softScrollTo(host).catch(() => undefined);
        const high = this.locators.pathHighLevel(host);
        if (await high.isVisible({ timeout: 1500 }).catch(() => false)) {
          await high.click({ force: true, timeout: 2000 }).catch(() => undefined);
          notes.push('High Level');
        }
        const all = this.locators.pathAllDevices(host);
        if (await all.isVisible({ timeout: 1500 }).catch(() => false)) {
          await all.click({ force: true, timeout: 2000 }).catch(() => undefined);
          notes.push('All devices');
        }
      }
      const kpi = this.locators.kpiDateComparisonWidget();
      if (await kpi.count().catch(() => 0)) {
        const dtd = this.locators.kpiDayToDay(kpi);
        if (
          /Day to Day/i.test(ctx?.kpiComparisonType || '') &&
          (await dtd.isVisible({ timeout: 1500 }).catch(() => false))
        ) {
          await dtd.click({ force: true, timeout: 2000 }).catch(() => undefined);
          notes.push('KPI Day to Day');
        }
      }
    } catch {
      // soft
    }
    return notes.join('; ') || 'widget defaults soft';
  }

  async captureContext(): Promise<RumRegressionUs2Context> {
    return {
      dashboardLabel: await this.getDashboardLabel(),
      lookbackLabel: await this.getTimeLookbackLabel(),
      autoRefreshLabel: await this.getAutoRefreshLabel(),
      siteLabel: await this.getSiteLabel(),
      widgetSignature: await this.captureGraphLookbackSignature(),
      kpiComparisonType: await this.getKpiComparisonType().catch(() => 'Day to Day'),
      pathLevel: await this.getPathLevel().catch(() => 'High Level'),
      pathDevice: await this.getPathDevice().catch(() => 'All'),
      geographyMetric: await this.getGeographyMetricLabel().catch(() => 'Onload'),
    };
  }

  async restoreContext(ctx: RumRegressionUs2Context): Promise<void> {
    await this.closeOverlays();
    await this.restoreWidgetDefaults(ctx).catch(() => undefined);
    await this.ensureRumRegressionUs2Selected();
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

  async widgetSample(host: Locator, max = 500): Promise<string> {
    await this.softScrollTo(host);
    return (
      (await host
        .evaluate((el, limit) => (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, limit), max)
        .catch(() => '')) || ''
    );
  }

  async highchartsCount(): Promise<number> {
    return this.locators.highchartsContainers.count().catch(() => 0);
  }

  async softHoverWidget(host: Locator): Promise<string> {
    await this.softScrollTo(host);
    const chart = host.locator('.highcharts-container, svg.highcharts-root').first();
    const box = (await chart.boundingBox().catch(() => null)) || (await host.boundingBox().catch(() => null));
    if (!box) return '';
    await this.page.mouse.move(box.x + box.width * 0.48, box.y + box.height * 0.55);
    await this.page.waitForTimeout(450);
    const tip = this.locators.highchartsTooltip.filter({ visible: true }).first();
    return ((await tip.innerText({ timeout: 1500 }).catch(() => '')) || '').replace(/\s+/g, ' ').trim();
  }

  async softToggleLegend(host: Locator): Promise<{ toggled: boolean; note: string }> {
    await this.softScrollTo(host);
    const item = host.locator('.highcharts-legend-item').first();
    if (!(await item.isVisible().catch(() => false))) {
      return { toggled: false, note: 'No legend items' };
    }
    await item.click({ force: true }).catch(() => undefined);
    await this.page.waitForTimeout(350);
    await item.click({ force: true }).catch(() => undefined);
    return { toggled: true, note: 'toggled first legend item (restore)' };
  }

  async softPrescribedLookbacksWithHover(restoreLabel?: string): Promise<
    Array<{ label: string; applied: boolean; refreshed: boolean; tip: string; signature: string; note: string }>
  > {
    const { dataSignature } = await import('../helpers/preconfiguredDashboardChrome');
    const labels = [/Last 6 hours/i, /Last 24 hours/i, /Last 7 days/i, /Last 30 days/i];
    const tips: string[] = [];
    const sigs: string[] = [];
    const out: Array<{
      label: string;
      applied: boolean;
      refreshed: boolean;
      tip: string;
      signature: string;
      note: string;
    }> = [];
    for (const label of labels) {
      const before = await dataSignature(this.page);
      let applied = false;
      let refreshed = false;
      let tip = '';
      let note = '';
      let signature = '';
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
        signature = await this.captureGraphLookbackSignature();
        sigs.push(signature);
        tip = await this.softHoverWidget(this.locators.rumPerformanceWidget());
        if (!tip) {
          const graph = this.locators.perfGraphHost(this.locators.rumPerformanceWidget());
          if (await graph.count().catch(() => 0)) tip = await this.softHoverWidget(graph);
        }
        if (!tip) tip = await this.softHoverWidget(this.locators.rumPerformanceComparisonWidget());
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
        signature: signature.slice(0, 140),
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
        signature: '',
        note:
          uniq.size >= 2
            ? `soft: differing Performance tooltip/interval signatures across lookbacks (unique≈${uniq.size})`
            : `soft: tip samples similar after normalize (n=${nonempty.length}); annotate only`,
      });
    } else {
      out.push({
        label: 'hover-interval-compare',
        applied: true,
        refreshed: true,
        tip: '',
        signature: '',
        note: 'soft: insufficient hoverable Performance points across lookbacks — controlled empty annotate',
      });
    }
    const uniqSig = new Set(sigs.map((s) => s.replace(/\d{1,2}:\d{2}/g, 'T').slice(0, 120)));
    out.push({
      label: 'graph-signature-compare',
      applied: true,
      refreshed: true,
      tip: '',
      signature: [...uniqSig].slice(0, 2).join(' || '),
      note:
        uniqSig.size >= 2
          ? `soft: differing graph signatures across lookbacks (unique≈${uniqSig.size})`
          : `soft: graph signatures similar across lookbacks (n=${sigs.length})`,
    });
    if (restoreLabel) {
      await this.selectTimeLookback(restoreLabel).catch(async () => {
        await this.selectTimeLookback(/Last 24 hours|Last 6 hours/i);
      });
    }
    await this.restoreWidgetDefaults().catch(() => undefined);
    return out;
  }

  async softSiblingSwitchAndRestore(target: RegExp): Promise<string> {
    const before = await this.getDashboardLabel();
    await this.selectDashboard(target).catch(() => undefined);
    await this.page.waitForTimeout(3000);
    const mid = await this.getDashboardLabel();
    await this.ensureRumRegressionUs2Selected();
    await this.ensureProfileSiteSelected();
    await this.expectCoreWidgetsReady().catch(() => undefined);
    const after = await this.getDashboardLabel();
    return `before=${before} mid=${mid} after=${after}`;
  }

  async softChromeIconTooltipsAndRoundTrip() {
    const { softChromeIconTooltipsAndRoundTrip } = await import('../helpers/preconfiguredDashboardChrome');
    return softChromeIconTooltipsAndRoundTrip(this.page);
  }

  async expectNotConfusedSurfaces(): Promise<void> {
    await expect(this.page).not.toHaveURL(/overview-dashboard\/marketing/i);
    await expect(this.page).not.toHaveURL(/marketing-insights\/marketing-overview|marketing=yes/i);
    await expect(this.page).not.toHaveURL(/real-user-browser\/performance-detail|path-type=performance/i);
    await expect(this.page).toHaveURL(/site\/dashboard|r=site%2Fdashboard/i);
    const dash = await this.getDashboardLabel();
    expect(dash).toMatch(RR_US2_EXACT);
    expect(dash).not.toMatch(/Synthetic Regression/i);
    expect(dash).not.toMatch(/Alerts Regression/i);
    expect(dash).not.toMatch(/Business Regression/i);
    expect(dash).not.toMatch(/Marketing Regression/i);
    expect(dash).not.toMatch(/Tag Governance/i);
    expect(dash).not.toMatch(/^\s*RUM Performance Detail\s*$/i);
    expect(dash).not.toMatch(/Synthetic Site Health|Site Overview|VitalPulse|Traffic Source and Medium/i);
    expect(dash).not.toMatch(/Business Metrics with Performance/i);
  }
}
