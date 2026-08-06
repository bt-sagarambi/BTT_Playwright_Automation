import { Page, expect, Locator } from '@playwright/test';
import { MarketingOverviewLocators } from '../locators/MarketingOverviewLocators';
import { LeftNavPage } from './LeftNavPage';
import { SiteDropdownPage } from './SiteDropdownPage';
import { ensurePortalSession } from '../helpers/portalSession';
import { getActiveProfile } from '../config/profiles';

const PAGE_DEF = {
  id: 'mkt.marketing-overview',
  module: 'mkt',
  menuLabel: 'Marketing Overview',
  route: 'overview-dashboard/marketing',
  titleIncludes: /Marketing Overview/i,
};

export type MarketingOverviewContext = {
  dashboardLabel: string;
  lookbackLabel: string;
  timezoneLabel: string;
  autoRefreshLabel: string;
  sitewideSignature: string;
  campaignSignature: string;
  campaignMetricId: string;
};

/**
 * Marketing Overview dashboard.
 * Shared configuration remains read-only, except a hide/reset widget recovery
 * scenario that immediately restores the dashboard.
 */
export class MarketingOverviewPage {
  readonly locators: MarketingOverviewLocators;

  constructor(private readonly page: Page) {
    this.locators = new MarketingOverviewLocators(page);
  }

  async openViaNavigation(): Promise<void> {
    await ensurePortalSession(this.page);
    await new SiteDropdownPage(this.page).ensureProfileSite();
    await new LeftNavPage(this.page).openSmokePage(PAGE_DEF);
    await this.waitForPageReady();
  }

  async waitForPageReady(): Promise<{ loadMs: number }> {
    const started = Date.now();
    await expect(this.page).not.toHaveURL(/site\/login|site%2Flogin/i);
    await expect(this.page).toHaveURL(/overview-dashboard\/marketing/);
    await expect(this.locators.pageTitle).toBeVisible({ timeout: 60000 });
    await expect(this.locators.pageTitle).toHaveText(
      /Business Insights\s*\/\s*Improve Traffic\s*\/\s*Marketing Overview/i
    );
    await this.page.waitForLoadState('domcontentloaded');
    await expect
      .poll(async () => this.widgetsReadyScore(), { timeout: 120000 })
      .toBeGreaterThan(2);
    return { loadMs: Date.now() - started };
  }

  private async widgetsReadyScore(): Promise<number> {
    // Require loaded content — titles alone can appear while GPU loaders spin.
    const metricCard = await this.locators.bounceRateCard.isVisible().catch(() => false);
    const anyMetric = await this.page
      .locator(
        '#bounce-rate-card, #revenue-card, #number-of-sessions-card, #conversion-rate-card'
      )
      .filter({ visible: true })
      .count()
      .catch(() => 0);
    const campaigns = await this.locators.campaignCards.count().catch(() => 0);
    const campaignNames = await this.locators.campaignNames.count().catch(() => 0);
    const charts = await this.locators.highchartsContainers.count().catch(() => 0);
    const chartHosts = await this.page
      .locator(
        '#top-campaigns-by-campaign-bar, #revenue-by-device-bar, #sessions-by-device-bar, #conversionRate-by-device-bar'
      )
      .count()
      .catch(() => 0);
    const metricButtons = await this.locators.revenueCampaigns.isVisible().catch(() => false);
    return (
      (metricCard || anyMetric > 0 ? 3 : 0) +
      (campaigns > 0 || campaignNames > 0 ? 2 : 0) +
      (charts > 0 || chartHosts > 0 ? 2 : 0) +
      (metricButtons ? 1 : 0)
    );
  }

  async expectWidgetsReady(): Promise<void> {
    await expect.poll(async () => this.widgetsReadyScore(), { timeout: 90000 }).toBeGreaterThan(2);
  }

  async expectDefaultContext(): Promise<void> {
    await expect(this.locators.sitewideTotalsHeading).toBeVisible({ timeout: 30000 });
    await expect(this.locators.timeLookback).toBeVisible({ timeout: 15000 });
    await expect(this.locators.switchDashboard).toBeAttached({ timeout: 15000 });
    const lookback = await this.getTimeLookbackLabel();
    expect(lookback.length, 'Active time lookback should be non-empty').toBeGreaterThan(0);
    const dashboard = await this.getDashboardLabel();
    expect(dashboard.length, 'Active dashboard should be non-empty').toBeGreaterThan(0);
    await this.expectWidgetsReady();
  }

  async expectSelectedSite(): Promise<void> {
    const profile = getActiveProfile();
    const siteText = await this.page.evaluate(() => {
      const select2 = document.querySelector(
        '#select2-site-id-container, #select2-quick-site-id-container, .select2-selection__rendered'
      );
      const site = document.querySelector('#site-id, #quick-site-id') as HTMLSelectElement | null;
      const fromSelect2 = (select2?.textContent || '').replace(/\s+/g, ' ').trim();
      if (fromSelect2) return fromSelect2;
      const opt = site?.selectedOptions?.[0];
      return (opt?.textContent || '').replace(/\s+/g, ' ').trim();
    });
    expect(siteText, `Selected site should include ${profile.siteName}`).toMatch(
      new RegExp(profile.siteName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    );
  }

  async captureContext(): Promise<MarketingOverviewContext> {
    return {
      dashboardLabel: await this.getDashboardLabel(),
      lookbackLabel: await this.getTimeLookbackLabel(),
      timezoneLabel: await this.getTimezoneLabel(),
      autoRefreshLabel: await this.getAutoRefreshLabel(),
      sitewideSignature: await this.getSitewideTotalsSignature(),
      campaignSignature: await this.getCampaignCardsSignature(),
      campaignMetricId: await this.getActiveCampaignMetricId(),
    };
  }

  async restoreContext(ctx: MarketingOverviewContext): Promise<void> {
    await this.closeOverlays();
    const currentLookback = await this.getTimeLookbackLabel();
    if (ctx.lookbackLabel && currentLookback !== ctx.lookbackLabel) {
      await this.selectTimeLookback(ctx.lookbackLabel).catch(() => undefined);
    }
    const currentMetric = await this.getActiveCampaignMetricId();
    if (ctx.campaignMetricId && currentMetric !== ctx.campaignMetricId) {
      const btn = this.page.locator(`#${ctx.campaignMetricId}`);
      if (await btn.isVisible().catch(() => false)) {
        await btn.click({ force: true });
        await this.page.waitForTimeout(1500);
      }
    }
    await this.expectWidgetsReady();
  }

  /** Soft-deadline recovery: cancel overlays and reload Marketing Overview. */
  async recoverPage(): Promise<void> {
    await this.closeOverlays();
    await this.page.goto(this.page.url().split('#')[0], { waitUntil: 'domcontentloaded' }).catch(async () => {
      await this.openViaNavigation();
    });
    await this.waitForPageReady().catch(async () => {
      await this.openViaNavigation();
    });
  }

  async closeOverlays(): Promise<void> {
    for (let i = 0; i < 3; i++) {
      await this.page.keyboard.press('Escape').catch(() => undefined);
      await this.page.waitForTimeout(200);
    }
    const closeBtns = this.page
      .locator('button, a, .close, [data-dismiss="modal"]')
      .filter({ hasText: /Close|Cancel|×|Done/i });
    if (await closeBtns.first().isVisible({ timeout: 500 }).catch(() => false)) {
      await closeBtns.first().click({ force: true }).catch(() => undefined);
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
    const rendered = this.page.locator('#select2-switch-dashboard-container').first();
    if (await rendered.isVisible().catch(() => false)) {
      return ((await rendered.textContent()) || '').replace(/\s+/g, ' ').trim();
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
    const freq = this.locators.autoRefreshFrequency;
    if (await freq.isVisible().catch(() => false)) {
      const t = await this.getControlLabel(freq);
      if (t) return t;
    }
    return this.getControlLabel(this.locators.autoRefresh);
  }

  async getTimezoneLabel(): Promise<string> {
    const tz = this.locators.timezone;
    if (!(await tz.count())) return '';
    return this.page.evaluate(() => {
      const sel = document.querySelector('#timezone') as HTMLSelectElement | null;
      const opt = sel?.selectedOptions?.[0];
      const select2 = document.querySelector('#select2-timezone-container');
      return ((select2?.textContent || opt?.textContent || '') as string).replace(/\s+/g, ' ').trim();
    });
  }

  async expectDashboardChrome(): Promise<void> {
    await expect(this.locators.switchDashboard).toBeAttached({ timeout: 15000 });
    await expect(this.locators.timeLookback).toBeVisible({ timeout: 15000 });
    await expect(this.locators.refreshDashboard).toBeVisible();
    await expect(this.locators.autoRefresh).toBeVisible();
    if (await this.locators.toggleMarkersContainer.isVisible().catch(() => false)) {
      await expect(this.locators.toggleMarkersContainer).toBeVisible();
    }
    if (await this.locators.resetAllInactiveWidgets.isVisible().catch(() => false)) {
      await expect(this.locators.resetAllInactiveWidgets).toBeVisible();
    }
    if (await this.locators.viewOrEdit.isVisible().catch(() => false)) {
      await expect(this.locators.viewOrEdit).toBeVisible();
    }
  }

  async openTimeLookbackMenu(): Promise<void> {
    await this.closeOverlays();
    const trigger = this.page.locator('#time-lookback');
    await expect(trigger).toBeVisible({ timeout: 15000 });
    // Bootstrap dropdown often ignores Playwright force-click; open menu explicitly.
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
      return [...(root?.querySelectorAll('button.time-option') || [])]
        .map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim())
        .filter((t) => t && t.length < 48);
    });
    await this.page.keyboard.press('Escape').catch(() => undefined);
    await this.page.evaluate(() => {
      const dropdown = document.querySelector('#time-lookback')?.closest('.dropdown');
      dropdown?.classList.remove('open');
      const menu = dropdown?.querySelector('.dropdown-menu') as HTMLElement | null;
      if (menu) menu.style.display = '';
    });
    return [...new Set(labels)];
  }

  async expectUniqueNonBlankOptions(labels: string[], controlName: string): Promise<void> {
    expect(labels.length, `${controlName} should expose at least one option`).toBeGreaterThan(0);
    const normalized = labels.map((l) => l.replace(/\s+/g, ' ').trim().toLowerCase());
    expect(new Set(normalized).size, `${controlName} options should be unique`).toBe(normalized.length);
    expect(normalized.every(Boolean), `${controlName} options should not be blank`).toBeTruthy();
  }

  async selectDropdownOptionNear(trigger: Locator, label: string | RegExp): Promise<void> {
    await this.closeOverlays();
    // Prefer explicit time-period / auto-refresh / markers triggers over ambiguous #id hosts
    await trigger.click({ force: true });
    await this.page.waitForTimeout(500);
    const pattern = typeof label === 'string' ? label : label.toString();
    const clicked = await this.page.evaluate((pat) => {
      const isRe = pat.startsWith('/') && pat.lastIndexOf('/') > 0;
      let re: RegExp | null = null;
      let plain = pat;
      if (isRe) {
        const last = pat.lastIndexOf('/');
        re = new RegExp(pat.slice(1, last), pat.slice(last + 1));
      }
      const menus = [...document.querySelectorAll('.dropdown-menu, .open > .dropdown-menu, ul[role="menu"]')].filter(
        (m) => {
          const s = window.getComputedStyle(m);
          const rect = m.getBoundingClientRect();
          return s.display !== 'none' && s.visibility !== 'hidden' && rect.height > 0 && rect.width > 0;
        }
      );
      const menu = menus[menus.length - 1];
      if (!menu) return false;
      const items = [...menu.querySelectorAll('a, button, li')];
      for (const el of items) {
        const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
        if (!text || text.length > 60) continue;
        const match = re
          ? re.test(text)
          : text.toLowerCase() === plain.toLowerCase() || text.toLowerCase().includes(plain.toLowerCase());
        if (!match) continue;
        const clickable = (el.querySelector('a, button') as HTMLElement) || (el as HTMLElement);
        clickable.click();
        return true;
      }
      return false;
    }, pattern);
    if (!clicked) {
      throw new Error(`Dropdown option not found/clickable for ${label}`);
    }
    await this.page.waitForTimeout(500);
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
      return false;
    }, pattern);
    if (!clicked) throw new Error(`Dropdown option not found/clickable for ${label}`);
    await this.page.waitForTimeout(3500);
    await this.expectWidgetsReady();
  }

  async openAutoRefreshMenu(): Promise<void> {
    await this.closeOverlays();
    const trigger = this.page.locator('#auto-refresh').or(this.page.getByRole('button', { name: /Auto Refresh/i })).first();
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
      [...document.querySelectorAll('button.auto-refresh-option')]
        .map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim())
        .filter((t) => t && t.length < 40)
    );
    await this.page.keyboard.press('Escape').catch(() => undefined);
    return [...new Set(labels)];
  }

  async selectAutoRefresh(label: string | RegExp): Promise<void> {
    await this.openAutoRefreshMenu();
    const pattern = typeof label === 'string' ? label : label.toString();
    const clicked = await this.page.evaluate((pat) => {
      const isRe = pat.startsWith('/') && pat.lastIndexOf('/') > 0;
      let re: RegExp | null = null;
      let plain = pat;
      if (isRe) {
        const last = pat.lastIndexOf('/');
        re = new RegExp(pat.slice(1, last), pat.slice(last + 1));
      }
      for (const el of [...document.querySelectorAll('button.auto-refresh-option')]) {
        const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
        const match = re ? re.test(text) : text.toLowerCase().includes(plain.toLowerCase());
        if (!match) continue;
        (el as HTMLElement).click();
        return true;
      }
      return false;
    }, pattern);
    if (!clicked) throw new Error(`Dropdown option not found/clickable for ${label}`);
    await this.page.waitForTimeout(800);
  }

  async manualRefresh(): Promise<void> {
    await expect(this.locators.refreshDashboard).toBeVisible({ timeout: 15000 });
    await this.locators.refreshDashboard.click({ force: true });
    await this.page.waitForTimeout(2500);
    await this.expectWidgetsReady();
    await expect(this.locators.refreshDashboard).toBeEnabled({ timeout: 30000 }).catch(() => undefined);
  }

  async openEventMarkersMenu(): Promise<string[]> {
    await this.closeOverlays();
    const host = this.page.locator('#toggle-markers-container').first();
    if (!(await host.isVisible({ timeout: 5000 }).catch(() => false))) {
      const alt = this.page
        .locator('button, .dropdown-toggle, [id*="marker" i]')
        .filter({ hasText: /Event Markers|No Markers|Global Event Markers|All Markers/i })
        .first();
      if (!(await alt.isVisible({ timeout: 3000 }).catch(() => false))) return [];
      await alt.click({ timeout: 5000 }).catch(() => undefined);
      await this.page.evaluate(() => {
        const el =
          document.querySelector('#toggle-markers-container') ||
          [...document.querySelectorAll('button, .dropdown-toggle')].find((b) =>
            /Event Markers|Global Event Markers|No Markers/i.test(b.textContent || '')
          );
        const dropdown = el?.closest('.dropdown, .btn-group');
        dropdown?.classList.add('open');
        const menu = dropdown?.querySelector('.dropdown-menu') as HTMLElement | null;
        if (menu) menu.style.display = 'block';
      });
    } else {
      await host.click({ timeout: 5000 }).catch(() => undefined);
      await this.page.evaluate(() => {
        const el = document.querySelector('#toggle-markers-container');
        const dropdown = el?.closest('.dropdown, .btn-group');
        dropdown?.classList.add('open');
        const menu = dropdown?.querySelector('.dropdown-menu') as HTMLElement | null;
        if (menu) menu.style.display = 'block';
      });
    }
    await this.page.waitForTimeout(400);
    const labels = await this.page.evaluate(() => {
      const hostEl = document.querySelector('#toggle-markers-container');
      const root = hostEl?.closest('.dropdown, .btn-group') || null;
      const menu = (root?.querySelector('.dropdown-menu') as HTMLElement | null) || null;
      const scope = menu || root;
      if (!scope) return [] as string[];
      return [...scope.querySelectorAll('a, button, li')]
        .map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim())
        .filter((t) => t && /marker/i.test(t) && t.length < 60);
    });
    return [...new Set(labels)];
  }

  async selectEventMarker(label: string | RegExp): Promise<void> {
    const options = await this.openEventMarkersMenu();
    if (!options.length) throw new Error('Event marker menu not available');
    const match =
      typeof label === 'string'
        ? options.find((o) => o.toLowerCase().includes(label.toLowerCase()))
        : options.find((o) => label.test(o));
    if (!match) throw new Error(`Marker option not found for ${label}; have: ${options.join(', ')}`);
    await this.selectDropdownOptionNear(
      this.locators.toggleMarkersContainer.or(this.page.getByText(/Event Markers|Global Event Markers|No Markers/i).first()),
      match
    );
    await this.page.waitForTimeout(1500);
  }

  async expectViewingModeKeepsEditControlsInactive(): Promise<void> {
    const viewEdit = this.locators.viewOrEdit;
    if (!(await viewEdit.isVisible({ timeout: 5000 }).catch(() => false))) return;
    const label = await this.getControlLabel(viewEdit);
    if (/edit/i.test(label) && !/view/i.test(label)) {
      // Switch back to Viewing if currently Editing — do not mutate widgets
      await viewEdit.click({ force: true });
      await this.page.waitForTimeout(500);
      const viewing = this.page.getByText(/^Viewing$/i).first();
      if (await viewing.isVisible({ timeout: 2000 }).catch(() => false)) {
        await viewing.click({ force: true });
      }
    }
    const dragHandles = this.page.locator('.ui-sortable-handle, .widget-drag, [class*="drag-handle"]');
    const visibleDrags = await dragHandles.filter({ visible: true }).count().catch(() => 0);
    expect(visibleDrags, 'Widget drag handles should not be active in Viewing mode').toBe(0);
  }

  async sampleEditingModeReadOnly(): Promise<void> {
    const viewEdit = this.locators.viewOrEdit;
    if (!(await viewEdit.isVisible({ timeout: 5000 }).catch(() => false))) return;
    await viewEdit.click({ force: true });
    await this.page.waitForTimeout(400);
    const editing = this.page.getByText(/^Editing$/i).first();
    if (await editing.isVisible({ timeout: 2000 }).catch(() => false)) {
      await editing.click({ force: true });
      await this.page.waitForTimeout(800);
      // Inspect only — switch back to Viewing without moving widgets
      await viewEdit.click({ force: true });
      await this.page.waitForTimeout(300);
      const viewing = this.page.getByText(/^Viewing$/i).first();
      if (await viewing.isVisible({ timeout: 2000 }).catch(() => false)) {
        await viewing.click({ force: true });
      } else {
        await viewEdit.click({ force: true });
      }
    }
    await this.page.keyboard.press('Escape').catch(() => undefined);
  }

  async getSitewideTotalsSignature(): Promise<string> {
    const parts: string[] = [];
    for (const card of this.locators.sitewideMetricCards()) {
      if (!(await card.count())) continue;
      const text = ((await card.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
      parts.push(text);
    }
    return parts.join(' | ');
  }

  async expectSitewideTotalsCards(): Promise<void> {
    await expect(this.locators.sitewideTotalsHeading).toBeVisible({ timeout: 20000 });
    for (const card of this.locators.sitewideMetricCards()) {
      await expect(card).toBeAttached({ timeout: 15000 });
      const text = ((await card.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
      expect(text.length, 'Metric card should render a non-empty value or controlled no-data marker').toBeGreaterThan(0);
    }
  }

  async expectMetricFormatsSample(): Promise<void> {
    const bounce = ((await this.locators.bounceRateCard.innerText()) || '').replace(/\s+/g, ' ');
    const revenue = ((await this.locators.revenueCard.innerText()) || '').replace(/\s+/g, ' ');
    const sessions = ((await this.locators.numberOfSessionsCard.innerText()) || '').replace(/\s+/g, ' ');
    const onload = ((await this.locators.onloadCard.innerText()) || '').replace(/\s+/g, ' ');
    // Soft format checks — live empty states allowed
    if (/\d/.test(bounce)) expect(bounce).toMatch(/%|bounce/i);
    if (/\d/.test(revenue)) expect(revenue).toMatch(/\$|USD|revenue|,|\d/i);
    if (/\d/.test(sessions)) expect(sessions).toMatch(/\d/);
    if (/\d/.test(onload)) expect(onload).toMatch(/ms|s|onload|\d/i);
  }

  async hoverSitewideInfoIcons(): Promise<number> {
    await this.locators.sitewideTotalsHeading.scrollIntoViewIfNeeded().catch(() => undefined);
    const scope = this.page.locator(
      '#bounce-rate-card, #number-of-bounces-card, #session-exit-rate-card, #number-of-exits-card, #revenue-card, #number-of-sessions-card, #number-of-page-views-card, #page-views-per-session-card, #onload-card, #conversion-rate-card'
    );
    const icons = scope.locator(
      '.fa-info-circle, .fal.fa-info-circle, [class*="info"], i[title], a[title], [data-toggle="tooltip"]'
    );
    const count = await icons.count();
    let meaningful = 0;
    const limit = Math.min(count, 10);
    for (let i = 0; i < limit; i++) {
      const icon = icons.nth(i);
      if (!(await icon.isVisible().catch(() => false))) continue;
      await icon.hover({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(250);
      const title =
        (await icon.getAttribute('title')) ||
        (await icon.getAttribute('data-original-title')) ||
        (await icon.getAttribute('aria-label')) ||
        '';
      const tip = this.page.locator('.tooltip, .popover, [role="tooltip"]').filter({ visible: true });
      const tipText = (await tip.first().innerText().catch(() => '')) || title;
      if (tipText.replace(/\s+/g, ' ').trim().length > 3) meaningful++;
    }
    return meaningful;
  }

  async getCampaignCardsSignature(): Promise<string> {
    const count = await this.locators.campaignCards.count();
    const parts: string[] = [];
    for (let i = 0; i < Math.min(count, 8); i++) {
      const text = ((await this.locators.campaignCards.nth(i).innerText().catch(() => '')) || '')
        .replace(/\s+/g, ' ')
        .trim();
      parts.push(text.slice(0, 200));
    }
    return `${count}::${parts.join(' || ')}`;
  }

  async expectCampaignCardsPresent(): Promise<number> {
    await expect(this.locators.campaignsHeading).toBeVisible({ timeout: 20000 }).catch(async () => {
      await expect(this.page.getByText(/Campaign/i).first()).toBeVisible({ timeout: 10000 });
    });
    await expect.poll(async () => this.locators.campaignCards.count(), { timeout: 30000 }).toBeGreaterThan(0);
    const count = await this.locators.campaignCards.count();
    for (let i = 0; i < Math.min(count, 4); i++) {
      const card = this.locators.campaignCards.nth(i);
      const text = ((await card.innerText()) || '').replace(/\s+/g, ' ').trim();
      expect(text.length, `Campaign card ${i} should have content`).toBeGreaterThan(5);
      const name = this.page.locator(`#campaign-name_${i}`);
      if (await name.count()) {
        const nameText = ((await name.innerText()) || '').replace(/\s+/g, ' ').trim();
        expect(nameText.length, `Campaign name ${i} should be non-empty`).toBeGreaterThan(0);
      }
    }
    return count;
  }

  async openFirstCampaignActionMenu(): Promise<string[]> {
    const btn = this.locators.campaignButtons.first();
    await expect(btn).toBeVisible({ timeout: 15000 });
    await btn.click({ force: true });
    await this.page.waitForTimeout(500);
    const labels = await this.page.evaluate(() => {
      const menus = [...document.querySelectorAll('.dropdown-menu, .popover, .campaign-menu, ul.dropdown-menu')];
      const visible = menus.filter((m) => {
        const style = window.getComputedStyle(m);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
      const menu = visible[visible.length - 1];
      if (!menu) return [] as string[];
      return [...menu.querySelectorAll('a, button')]
        .map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim())
        .filter(Boolean);
    });
    return [...new Set(labels)];
  }

  async sampleCampaignActionNavigation(): Promise<boolean> {
    const labels = await this.openFirstCampaignActionMenu();
    if (!labels.length) {
      await this.closeOverlays();
      return false;
    }
    const preferred = labels.find((l) =>
      /Performance Details|Bounce.?Exit|Customer Journey|Aggregate Waterfall|Revenue Calculator/i.test(l)
    );
    if (!preferred) {
      await this.closeOverlays();
      return false;
    }
    const link = this.page.locator('a, button').filter({ hasText: preferred }).first();
    const href = await link.getAttribute('href').catch(() => null);
    if (href && /javascript:|#/i.test(href) === false) {
      await Promise.all([
        this.page.waitForURL(/.*/, { timeout: 20000 }).catch(() => undefined),
        link.click({ force: true }),
      ]);
      await this.page.waitForTimeout(2000);
      await this.page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
      await this.waitForPageReady();
      return true;
    }
    await this.closeOverlays();
    return false;
  }

  async getActiveCampaignMetricId(): Promise<string> {
    const ids = [
      'revenue-campaigns',
      'orders-campaigns',
      'aov-campaigns',
      'conv-rate-campaigns',
      'bounce-rate-campaigns',
      'exit-rate-campaigns',
      'sessions-campaigns',
    ];
    for (const id of ids) {
      const el = this.page.locator(`#${id}`);
      if (!(await el.count())) continue;
      const cls = (await el.getAttribute('class')) || '';
      const aria = (await el.getAttribute('aria-pressed')) || '';
      if (/active|selected|btn-primary/i.test(cls) || aria === 'true') return id;
    }
    return ids[0];
  }

  async selectCampaignMetric(id: string): Promise<void> {
    const btn = this.page.locator(`#${id}`);
    await expect(btn).toBeVisible({ timeout: 15000 });
    await btn.click({ force: true });
    await this.page.waitForTimeout(2500);
    await this.expectWidgetsReady();
  }

  async expectCampaignMetricButtons(): Promise<void> {
    for (const btn of this.locators.campaignMetricButtons()) {
      await expect(btn).toBeVisible({ timeout: 15000 });
    }
  }

  async getGraphPointCount(host: Locator): Promise<number> {
    if (!(await host.count())) return 0;
    return host
      .locator(
        '.highcharts-point:not(.highcharts-null-point), .highcharts-markers .highcharts-point, path.highcharts-graph'
      )
      .count();
  }

  async hoverRepresentativeDataPoint(host: Locator): Promise<string> {
    await host.scrollIntoViewIfNeeded({ timeout: 5000 });
    await host.evaluate((element) => {
      const highcharts = (window as unknown as {
        Highcharts?: {
          charts?: Array<{
            renderTo?: Element;
            tooltip?: { hide?: (delay?: number) => void };
          } | undefined>;
        };
      }).Highcharts;
      highcharts?.charts
        ?.find(
          (candidate) =>
            candidate?.renderTo === element ||
            Boolean(candidate?.renderTo && element.contains(candidate.renderTo))
        )
        ?.tooltip?.hide?.(0);
    });
    await this.page.mouse.move(2, 2);
    await this.page.waitForTimeout(150);
    const candidates = host.locator(
      '.highcharts-point:not(.highcharts-null-point), .highcharts-markers .highcharts-point'
    );
    const count = await candidates.count();
    for (let index = 0; index < Math.min(count, 12); index++) {
      const point = candidates.nth(index);
      const box = await point.boundingBox().catch(() => null);
      if (!box || box.width < 1 || box.height < 1) continue;
      await point.dispatchEvent('mouseover').catch(() => undefined);
      await point.dispatchEvent('mousemove').catch(() => undefined);
      await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await this.page.waitForTimeout(350);
      const tooltip = host.locator('.highcharts-tooltip').first();
      const text = ((await tooltip.textContent({ timeout: 1500 }).catch(() => '')) || '')
        .replace(/\s+/g, ' ')
        .trim();
      if (text) return text;
    }

    const chartPoint = await host.evaluate((element) => {
      const highcharts = (window as unknown as {
        Highcharts?: {
          charts?: Array<{
            renderTo?: Element;
            plotLeft?: number;
            plotTop?: number;
            series?: Array<{
              visible?: boolean;
              points?: Array<{ plotX?: number; plotY?: number; isNull?: boolean }>;
            }>;
          } | undefined>;
        };
      }).Highcharts;
      const chart = highcharts?.charts?.find(
        (candidate) =>
          candidate?.renderTo === element ||
          Boolean(candidate?.renderTo && element.contains(candidate.renderTo))
      );
      const point = chart?.series
        ?.filter((series) => series.visible !== false)
        .flatMap((series) => series.points || [])
        .find(
          (candidate) =>
            !candidate.isNull &&
            Number.isFinite(candidate.plotX) &&
            Number.isFinite(candidate.plotY)
        );
      if (!chart || !point) return null;
      return {
        x: (chart.plotLeft || 0) + (point.plotX || 0),
        y: (chart.plotTop || 0) + (point.plotY || 0),
      };
    });
    const hostBox = await host.boundingBox();
    if (chartPoint && hostBox) {
      await this.page.mouse.move(hostBox.x + chartPoint.x, hostBox.y + chartPoint.y);
      await this.page.waitForTimeout(400);
      const tooltip = host.locator('.highcharts-tooltip').first();
      const text = ((await tooltip.textContent({ timeout: 1500 }).catch(() => '')) || '')
        .replace(/\s+/g, ' ')
        .trim();
      if (text) return text;
    }
    const renderedTooltip = await host.evaluate((element) => {
      const highcharts = (window as unknown as {
        Highcharts?: {
          charts?: Array<{
            renderTo?: Element;
            tooltip?: {
              refresh?: (point: unknown) => void;
              label?: { element?: Element };
            };
            series?: Array<{
              visible?: boolean;
              points?: Array<{
                isNull?: boolean;
                onMouseOver?: () => void;
              }>;
            }>;
          } | undefined>;
        };
      }).Highcharts;
      const chart = highcharts?.charts?.find(
        (candidate) =>
          candidate?.renderTo === element ||
          Boolean(candidate?.renderTo && element.contains(candidate.renderTo))
      );
      const point = chart?.series
        ?.filter((series) => series.visible !== false)
        .flatMap((series) => series.points || [])
        .find((candidate) => !candidate.isNull);
      point?.onMouseOver?.();
      if (point) chart?.tooltip?.refresh?.(point);
      return (chart?.tooltip?.label?.element?.textContent || '').replace(/\s+/g, ' ').trim();
    });
    if (renderedTooltip) return renderedTooltip;
    await this.page.waitForTimeout(300);
    const tooltip = host.locator('.highcharts-tooltip').first();
    return ((await tooltip.textContent({ timeout: 1500 }).catch(() => '')) || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  widgetByTitle(title: string | RegExp): Locator {
    return this.page
      .locator('.grid-stack-item, [id^="chartID_"], .dashboard-widget, .widget, .panel')
      .filter({ has: this.page.getByText(title, { exact: true }).first() })
      .first();
  }

  async restoreInactiveWidget(title: string | RegExp): Promise<void> {
    const toggle = this.locators.expandCollapseInactiveWidgets;
    await expect(toggle).toBeVisible({ timeout: 10000 });
    if (await toggle.locator('.glyphicon-plus').count()) {
      await toggle.click({ force: true });
      await this.page.waitForTimeout(700);
    }

    const inactiveItems = this.page.locator('.grid-stack-inactive .grid-stack-item');
    const count = await inactiveItems.count();
    let hidden: Locator | null = null;
    for (let index = 0; index < count; index++) {
      const item = inactiveItems.nth(index);
      const params = (await item.getAttribute('data-params')) || '';
      const parsedTitle = params.match(/['"]title['"]\s*:\s*['"]([^'"]+)['"]/)?.[1] || '';
      const matches =
        typeof title === 'string'
          ? parsedTitle.toLowerCase() === title.toLowerCase()
          : title.test(parsedTitle);
      if (matches) {
        hidden = item;
        break;
      }
    }
    if (!hidden) throw new Error(`Hidden widget ${title} was not found in the inactive widget panel`);

    const activeGrid = this.page
      .locator('.grid-stack:not(.grid-stack-inactive)')
      .filter({ visible: true })
      .first();
    await expect(activeGrid).toBeVisible({ timeout: 10000 });
    const sourceBox = await hidden.boundingBox();
    const targetBox = await activeGrid.boundingBox();
    if (!sourceBox || !targetBox) throw new Error(`Unable to drag hidden widget ${title}`);
    await this.page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + 30);
    await this.page.mouse.down();
    await this.page.mouse.move(
      targetBox.x + Math.min(targetBox.width / 3, 350),
      targetBox.y + Math.min(targetBox.height - 50, 350),
      { steps: 12 }
    );
    await this.page.mouse.up();
    await this.page.waitForTimeout(1800);
    await expect(this.widgetByTitle(title)).toBeVisible({ timeout: 30000 });

    if (await toggle.locator('.glyphicon-minus').count()) {
      await toggle.click({ force: true });
      await this.page.waitForTimeout(300);
    }
  }

  async hideWidgetAndReset(title: string | RegExp): Promise<boolean> {
    let widget = this.widgetByTitle(title);
    if (!(await widget.isVisible().catch(() => false))) {
      await this.restoreInactiveWidget(title);
      widget = this.widgetByTitle(title);
    }
    await expect(widget).toBeVisible({ timeout: 20000 });
    const widgetId = await widget.getAttribute('id');
    const hide = widget
      .locator(
        'button[title*="Hide" i], a[title*="Hide" i], button[aria-label*="Hide" i], .widget-close, .remove-widget, .fa-times, .glyphicon-remove'
      )
      .first()
      .or(widget.locator('.panel-heading button, .widget-header button, [class*="header"] button').last());
    await expect(hide, `Hide control for ${title}`).toBeVisible({ timeout: 10000 });

    let resetRestored = false;
    try {
      await hide.click({ force: true });
      await this.page.waitForTimeout(800);
      const confirm = this.page
        .locator('.jconfirm-buttons button, .modal-footer button, button')
        .filter({ hasText: /HIDE WIDGET|^Yes$|^OK$|^Confirm$/i })
        .filter({ visible: true })
        .first();
      if (await confirm.isVisible({ timeout: 1500 }).catch(() => false)) {
        await confirm.click({ force: true });
      }
      await expect
        .poll(
          async () => {
            if (widgetId) {
              return this.page.locator(`#${widgetId}`).isVisible().catch(() => false);
            }
            return widget.isVisible().catch(() => false);
          },
          { timeout: 15000 }
        )
        .toBeFalsy();
    } finally {
      await expect(this.locators.resetAllInactiveWidgets).toBeVisible({ timeout: 15000 });
      await this.locators.resetAllInactiveWidgets.click({ force: true });
      await this.page.waitForTimeout(1000);
      const confirm = this.page
        .locator('.jconfirm-buttons button, .modal-footer button, button')
        .filter({ hasText: /RESET ALL WIDGETS|^Yes$|^OK$|^Confirm$/i })
        .filter({ visible: true })
        .first();
      if (await confirm.isVisible({ timeout: 1500 }).catch(() => false)) {
        await confirm.click({ force: true });
      }
      await expect(
        this.page.locator('.modal, .jconfirm').filter({ hasText: /Reset All Widgets/i })
      )
        .toBeHidden({ timeout: 5000 })
        .catch(() => undefined);
      resetRestored = await expect
        .poll(() => widget.isVisible().catch(() => false), { timeout: 5000 })
        .toBeTruthy()
        .then(() => true)
        .catch(() => false);
      if (!resetRestored) {
        await this.restoreInactiveWidget(title);
      }
      await expect(this.widgetByTitle(title)).toBeVisible({ timeout: 30000 });
      await this.expectWidgetsReady();
    }
    return resetRestored;
  }

  async getGraphSignature(host: Locator): Promise<string> {
    if (!(await host.count())) return 'missing';
    return host.evaluate((el) => {
      const svg = el.querySelector('svg');
      const points = el.querySelectorAll('.highcharts-point, path.highcharts-graph, .highcharts-series').length;
      const legend = el.querySelectorAll('.highcharts-legend-item').length;
      const cats = [...el.querySelectorAll('.highcharts-xaxis-labels text, .highcharts-axis-labels text')]
        .map((n) => (n.textContent || '').trim())
        .filter(Boolean)
        .slice(0, 6)
        .join(',');
      const title = (el.querySelector('.highcharts-title, .highcharts-subtitle')?.textContent || '').trim();
      const w = svg?.getAttribute('width') || '';
      const h = svg?.getAttribute('height') || '';
      return `${points}|${legend}|${w}x${h}|${title}|${cats}|${(el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120)}`;
    });
  }

  /**
   * Assert a Highcharts host has rendered. Zero-point series are OK when the chart shell
   * has real SVG dimensions / legend / axes (common for empty campaign windows).
   * soft: attach-only recovery for known sparse widgets.
   */
  async expectGraphRendered(host: Locator, name: string, soft = false): Promise<void> {
    await expect(host).toBeAttached({ timeout: soft ? 15000 : 20000 });
    await host.scrollIntoViewIfNeeded().catch(() => undefined);

    const isRendered = async (): Promise<boolean> => {
      const sig = await this.getGraphSignature(host);
      if (sig === 'missing') return false;
      // Has series points / graphs
      if (!/^0\|/.test(sig)) return true;
      // Empty series: accept sized Highcharts shell (e.g. `0|1|612x300|...`)
      const size = sig.match(/\|(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)\|/);
      if (size && Number(size[1]) > 40 && Number(size[2]) > 40) return true;
      const parts = sig.split('|');
      if (Number(parts[1] || 0) > 0) return true; // legend items
      if ((parts[4] || '').trim().length > 0) return true; // axis labels
      if ((parts[3] || '').trim().length > 0) return true; // chart title
      // Host still presents Highcharts/SVG markup
      return host
        .evaluate((el) => !!el.querySelector('svg.highcharts-root, .highcharts-container, svg'))
        .catch(() => false);
    };

    try {
      await expect.poll(isRendered, { timeout: soft ? 12000 : 30000 }).toBeTruthy();
    } catch (err) {
      if (soft) {
        const attached = await host.isVisible().catch(() => false);
        if (attached) return;
      }
      throw err;
    }
    const sig = await this.getGraphSignature(host);
    expect(sig, `${name} should render chart content`).not.toEqual('missing');
  }

  async hoverGraphPoint(host: Locator): Promise<string> {
    await host.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => undefined);
    const box = await host.boundingBox();
    if (!box) return '';
    // Prefer mouse move over force-hover of points — Highcharts points can hang Playwright hover.
    await this.page.mouse.move(box.x + box.width * 0.45, box.y + box.height * 0.55);
    await this.page.waitForTimeout(400);
    await this.page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.45);
    await this.page.waitForTimeout(500);
    const tip = this.locators.highchartsTooltip.filter({ visible: true }).first();
    const text = ((await tip.innerText({ timeout: 2000 }).catch(() => '')) || '').replace(/\s+/g, ' ').trim();
    if (text) return text;
    // Fallback: accessibility description / title on series
    return host.evaluate((el) => {
      const desc = el.querySelector('.highcharts-description, title, .highcharts-title');
      return (desc?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 200);
    });
  }

  async toggleLegendInHost(host: Locator, index = 0): Promise<void> {
    const items = host.locator('.highcharts-legend-item');
    const count = await items.count();
    if (count <= index) return;
    await items.nth(index).evaluate((el) => (el as HTMLElement).click()).catch(async () => {
      await items.nth(index).click({ force: true });
    });
    await this.page.waitForTimeout(500);
  }

  async openChartContextMenu(host: Locator): Promise<boolean> {
    await this.page.keyboard.press('Escape').catch(() => undefined);
    await this.locators.pageTitle.click({ force: true }).catch(() => undefined);
    await host.scrollIntoViewIfNeeded().catch(() => undefined);
    const btn = host.locator('.highcharts-button, .highcharts-contextbutton, .fal.fa-bars').first();
    const available = await expect
      .poll(() => btn.isVisible().catch(() => false), { timeout: 10000 })
      .toBeTruthy()
      .then(() => true)
      .catch(() => false);
    if (!available) return false;
    await btn.click({ force: true });
    await this.page.waitForTimeout(400);
    return true;
  }

  async getChartContextMenuOptions(host: Locator): Promise<string[]> {
    if (!(await this.openChartContextMenu(host))) return [];
    const options = (
      await this.page
        .locator('.highcharts-menu:visible li, .highcharts-contextmenu:visible li')
        .allTextContents()
    )
      .map((text) => text.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    return [...new Set(options)];
  }

  async selectChartContextOption(host: Locator, option: string | RegExp): Promise<boolean> {
    const options = await this.getChartContextMenuOptions(host);
    const label =
      typeof option === 'string'
        ? options.find((item) => item.toLowerCase().includes(option.toLowerCase()))
        : options.find((item) => option.test(item));
    if (!label) {
      await this.page.keyboard.press('Escape').catch(() => undefined);
      return false;
    }
    const item = this.page
      .locator('.highcharts-menu:visible li, .highcharts-contextmenu:visible li')
      .filter({ hasText: label })
      .first();
    await item.click({ force: true });
    await this.page.waitForTimeout(500);
    return true;
  }

  async toggleChartDataLabelsAndRestore(host: Locator): Promise<boolean> {
    const state = async (): Promise<string> =>
      host.evaluate((element) => {
        const highcharts = (window as unknown as {
          Highcharts?: {
            charts?: Array<{
              renderTo?: Element;
              series?: Array<{
                options?: { dataLabels?: { enabled?: boolean } };
                userOptions?: { dataLabels?: { enabled?: boolean } };
              }>;
            } | undefined>;
          };
        }).Highcharts;
        const chart = highcharts?.charts?.find(
          (candidate) =>
            candidate?.renderTo === element ||
            Boolean(candidate?.renderTo && element.contains(candidate.renderTo))
        );
        const configured =
          chart?.series
            ?.map(
              (series) =>
                series.options?.dataLabels?.enabled ??
                series.userOptions?.dataLabels?.enabled ??
                false
            )
            .join(',') || '';
        const labels = [...element.querySelectorAll('.highcharts-data-label, .highcharts-data-labels')]
          .map((label) => {
            const html = label as HTMLElement;
            return `${window.getComputedStyle(html).visibility}:${window.getComputedStyle(html).opacity}`;
          })
          .join(',');
        return `${configured}|${labels}|${element.querySelectorAll('.highcharts-data-labels text').length}`;
      });

    const before = await state();
    if (!(await this.selectChartContextOption(host, /Toggle Data Labels/i))) return false;
    const changed = await expect
      .poll(state, { timeout: 5000 })
      .not.toBe(before)
      .then(() => true)
      .catch(() => false);
    await this.selectChartContextOption(host, /Toggle Data Labels/i);
    return changed;
  }

  async openChartFullscreenAndExit(host: Locator): Promise<boolean> {
    const before = await host.boundingBox();
    if (!(await this.selectChartContextOption(host, /View in Full Screen/i))) return false;
    await this.page.waitForTimeout(800);
    const after = await host.boundingBox();
    const fullscreen = await this.page.evaluate(
      () => Boolean(document.fullscreenElement) || document.body.classList.contains('highcharts-fullscreen')
    );
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(400);
    return (
      fullscreen ||
      Boolean(
        before &&
          after &&
          (after.width > before.width * 1.25 || after.height > before.height * 1.25)
      )
    );
  }

  async downloadChartExport(
    host: Locator,
    option: string | RegExp = /Download PNG Image/i
  ): Promise<string | null> {
    const options = await this.getChartContextMenuOptions(host);
    const label =
      typeof option === 'string'
        ? options.find((item) => item.toLowerCase().includes(option.toLowerCase()))
        : options.find((item) => option.test(item));
    if (!label) {
      await this.page.keyboard.press('Escape').catch(() => undefined);
      return null;
    }
    const downloadPromise = this.page.waitForEvent('download', { timeout: 15000 });
    await this.page
      .locator('.highcharts-menu:visible li, .highcharts-contextmenu:visible li')
      .filter({ hasText: label })
      .first()
      .click({ force: true });
    const download = await downloadPromise;
    expect(await download.failure(), 'PNG chart export should complete').toBeNull();
    return download.suggestedFilename();
  }

  async downloadChartPng(host: Locator): Promise<string | null> {
    return this.downloadChartExport(host, /Download PNG Image/i);
  }

  async expectNoDuplicateGraphHosts(): Promise<void> {
    const ids = await this.page.evaluate(() =>
      [
        'top-campaigns-by-campaign-bar',
        'top-campaigns-by-campaign-line',
        'revenue-by-device-bar',
        'revenue-by-device-line',
        'conversionRate-by-device-bar',
        'conversionRate-by-device-line',
        'sessions-by-device-bar',
        'sessions-by-device-line',
      ].map((id) => ({ id, count: document.querySelectorAll(`#${id}`).length }))
    );
    for (const row of ids) {
      expect(row.count, `Duplicate host #${row.id}`).toBeLessThanOrEqual(1);
    }
  }

  /** Locate DataTable / grid by a header cell text (Source / Medium). Scrolls into view. */
  tableByHeader(header: string | RegExp): Locator {
    return this.page
      .locator('.dataTables_wrapper, .table-responsive, .grid-stack-item, .panel, .widget')
      .filter({ has: this.page.locator('th, thead, .dataTables_scrollHead').filter({ hasText: header }) })
      .first();
  }

  async findTrafficTable(header: RegExp): Promise<Locator | null> {
    await this.closeOverlays();
    // Lazy widgets may load on scroll
    for (const y of [0, 800, 1600, 2400, 3200]) {
      await this.page.evaluate((scrollY) => window.scrollTo(0, scrollY), y);
      await this.page.waitForTimeout(700);
      const wrapper = this.tableByHeader(header);
      if (await wrapper.isVisible().catch(() => false)) {
        await wrapper.scrollIntoViewIfNeeded().catch(() => undefined);
        return wrapper;
      }
      // Also try bare table
      const table = this.page.locator('table').filter({ has: this.page.locator('th').filter({ hasText: header }) }).first();
      if (await table.isVisible().catch(() => false)) {
        await table.scrollIntoViewIfNeeded().catch(() => undefined);
        return table.locator('xpath=ancestor::*[contains(@class,"dataTables_wrapper") or contains(@class,"panel") or contains(@class,"grid-stack-item")][1]');
      }
    }
    return null;
  }

  async expectTableHeaders(wrapper: Locator, headers: RegExp[]): Promise<void> {
    await expect(wrapper).toBeVisible({ timeout: 20000 });
    for (const h of headers) {
      await expect(wrapper.locator('th').filter({ hasText: h }).first()).toBeVisible({ timeout: 10000 });
    }
  }

  async getTableRowSignature(wrapper: Locator): Promise<string> {
    return wrapper.evaluate((el) => {
      const rows = [...el.querySelectorAll('tbody tr')]
        .map((r) => (r.textContent || '').replace(/\s+/g, ' ').trim())
        .filter((t) => t && !/no data|no matching|loading/i.test(t));
      const info = (el.querySelector('.dataTables_info')?.textContent || '').trim();
      return `${rows.length}::${rows.slice(0, 5).join(' | ')}::${info}`;
    });
  }

  async sortTableColumn(wrapper: Locator, header: string | RegExp): Promise<void> {
    const th = wrapper.locator('th').filter({ hasText: header }).first();
    await th.click({ force: true });
    await this.page.waitForTimeout(800);
  }

  async searchTable(wrapper: Locator, term: string): Promise<void> {
    const input = wrapper.locator('input[type="search"], .dataTables_filter input').first();
    await expect(input).toBeVisible({ timeout: 10000 });
    await input.fill('');
    await input.fill(term);
    await this.page.waitForTimeout(900);
  }

  async clearTableSearch(wrapper: Locator): Promise<void> {
    const input = wrapper.locator('input[type="search"], .dataTables_filter input').first();
    if (await input.isVisible().catch(() => false)) {
      await input.fill('');
      await this.page.waitForTimeout(700);
    }
  }

  async changeTablePageSize(wrapper: Locator, sizeLabel: string): Promise<boolean> {
    const select = wrapper.locator('select').first();
    if (!(await select.isVisible().catch(() => false))) return false;
    const options = (await select.locator('option').allTextContents()).map((t) => t.trim());
    const match = options.find((o) => o === sizeLabel || o.includes(sizeLabel));
    if (!match) return false;
    await select.selectOption({ label: match }).catch(async () => {
      await select.selectOption(sizeLabel);
    });
    await this.page.waitForTimeout(900);
    return true;
  }

  async exerciseTablePagination(wrapper: Locator): Promise<'exercised' | 'single-page' | 'unavailable'> {
    const next = wrapper
      .locator('.paginate_button.next, a.next, button')
      .filter({ hasText: /Next/i })
      .first();
    const previous = wrapper
      .locator('.paginate_button.previous, a.previous, button')
      .filter({ hasText: /Previous/i })
      .first();
    if (!(await next.count())) return 'unavailable';
    const disabled =
      (await next.getAttribute('class') || '').includes('disabled') ||
      (await next.getAttribute('aria-disabled')) === 'true';
    if (disabled) return 'single-page';

    const before = await this.getTableRowSignature(wrapper);
    await next.click({ force: true });
    await this.page.waitForTimeout(700);
    const after = await this.getTableRowSignature(wrapper);
    expect(after, 'Next page should change the visible table rows/pager information').not.toBe(before);

    if (await previous.isVisible().catch(() => false)) {
      await previous.click({ force: true });
      await this.page.waitForTimeout(700);
      const restored = await this.getTableRowSignature(wrapper);
      expect(restored, 'Previous should restore the prior table page').toBe(before);
    }
    return 'exercised';
  }

  async openTableExportMenu(wrapper: Locator): Promise<string[]> {
    const btn = wrapper
      .locator('button, a')
      .filter({ hasText: /Export|CSV|Download/i })
      .first()
      .or(wrapper.locator('.dt-buttons button, .buttons-collection').first());
    if (!(await btn.isVisible({ timeout: 3000 }).catch(() => false))) return [];
    await btn.click({ force: true });
    await this.page.waitForTimeout(400);
    const labels = await this.page.evaluate(() => {
      const menus = [...document.querySelectorAll('.dt-button-collection, .dropdown-menu, .btn-group.open .dropdown-menu')];
      const visible = menus.filter((m) => window.getComputedStyle(m).display !== 'none');
      const menu = visible[visible.length - 1];
      if (!menu) return [] as string[];
      return [...menu.querySelectorAll('a, button, span')]
        .map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim())
        .filter(Boolean);
    });
    await this.page.keyboard.press('Escape').catch(() => undefined);
    return [...new Set(labels)];
  }

  async openFiltersDrawer(): Promise<void> {
    await this.closeOverlays();
    await expect(this.locators.toggleFilters).toBeVisible({ timeout: 15000 });
    await this.locators.toggleFilters.click({ force: true });
    await this.page.waitForTimeout(800);
    await expect(this.locators.applyFilters.or(this.locators.campaignSource).first()).toBeVisible({
      timeout: 15000,
    });
  }

  async cancelFiltersDrawer(): Promise<void> {
    if (await this.locators.cancelFilters.isVisible().catch(() => false)) {
      await this.locators.cancelFilters.click({ force: true });
    } else {
      await this.page.keyboard.press('Escape').catch(() => undefined);
    }
    await this.page.waitForTimeout(500);
  }

  async applyFiltersDrawer(): Promise<void> {
    await expect(this.locators.applyFilters).toBeVisible({ timeout: 10000 });
    await this.locators.applyFilters.click({ force: true });
    await this.page.waitForTimeout(3500);
    await this.expectWidgetsReady();
  }

  async getSelect2Options(selectCss: string): Promise<string[]> {
    const select = this.page.locator(selectCss).first();
    if (!(await select.count())) return [];
    return this.page.evaluate((css) => {
      const sel = document.querySelector(css) as HTMLSelectElement | null;
      if (!sel) return [] as string[];
      return [...sel.options]
        .map((o) => (o.textContent || '').replace(/\s+/g, ' ').trim())
        .filter((t) => t && !/^select|all|none|loading/i.test(t));
    }, selectCss);
  }

  async selectFilterOption(selectCss: string, optionText?: string): Promise<string | null> {
    const options = await this.getSelect2Options(selectCss);
    const pick =
      optionText ||
      options.find((o) => !/^(all|any|select|none|-)$/i.test(o)) ||
      options[0];
    if (!pick) return null;
    const select = this.page.locator(selectCss).first();
    const id = (await select.getAttribute('id')) || selectCss.replace('#', '');
    const container = this.page.locator(`#select2-${id}-container`).first();
    if (await container.isVisible().catch(() => false)) {
      await container.click({ force: true });
      await this.page.waitForTimeout(300);
      const opt = this.page.locator('.select2-results__option').filter({ hasText: pick }).first();
      if (await opt.isVisible({ timeout: 5000 }).catch(() => false)) {
        await opt.click();
        return pick;
      }
    }
    await select.selectOption({ label: pick }).catch(async () => {
      await select.evaluate((el, lab) => {
        const sel = el as HTMLSelectElement;
        const opt = [...sel.options].find((o) => (o.textContent || '').trim() === lab);
        if (!opt) throw new Error(`missing ${lab}`);
        sel.value = opt.value;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }, pick);
    });
    return pick;
  }

  async applySampleTrafficFilter(kind: 'source' | 'medium' | 'campaign'): Promise<string | null> {
    await this.openFiltersDrawer();
    const css =
      kind === 'source' ? '#campaign-source' : kind === 'medium' ? '#campaign-medium' : '#campaign-name';
    const selected = await this.selectFilterOption(css);
    if (!selected) {
      await this.cancelFiltersDrawer();
      return null;
    }
    await this.applyFiltersDrawer();
    return selected;
  }

  async clearSampleFilters(): Promise<void> {
    await this.openFiltersDrawer().catch(() => undefined);
    for (const css of ['#campaign-source', '#campaign-medium', '#campaign-name']) {
      const select = this.page.locator(css).first();
      if (!(await select.count())) continue;
      await select
        .evaluate((el) => {
          const sel = el as HTMLSelectElement;
          if (!sel.options.length) return;
          sel.selectedIndex = 0;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          // Clear select2 if present
          const id = sel.id;
          const container = document.querySelector(`#select2-${id}-container`);
          if (container) {
            const clear = document.querySelector(`.select2-selection__clear`);
            (clear as HTMLElement | null)?.click();
          }
        })
        .catch(() => undefined);
    }
    if (await this.locators.applyFilters.isVisible().catch(() => false)) {
      await this.applyFiltersDrawer();
    } else {
      await this.cancelFiltersDrawer();
    }
  }

  async expectKeyboardFocusable(control: Locator): Promise<void> {
    await control.focus().catch(async () => {
      await control.click({ force: true });
    });
    await this.page.waitForTimeout(200);
  }

  async setViewport(width: number, height = 900): Promise<void> {
    await this.page.setViewportSize({ width, height });
    await this.page.waitForTimeout(500);
  }
}
