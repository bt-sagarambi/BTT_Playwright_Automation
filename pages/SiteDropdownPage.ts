import { Page, expect } from '@playwright/test';
import { TopNavLocators } from '../locators/TopNavLocators';
import { getActiveProfile } from '../config/profiles';
import { config } from '../config/env';

/**
 * Site dropdown — ensure the profile site is selected (read-only).
 */
export class SiteDropdownPage {
  readonly locators: TopNavLocators;

  constructor(private readonly page: Page) {
    this.locators = new TopNavLocators(page);
  }

  private portalWebBase(): string {
    return `${config.baseURL.replace(/\/$/, '')}/btportal/web`;
  }

  async expectVisible(): Promise<void> {
    await expect(
      this.locators.siteSelectContainer,
      'Site dropdown (#select2-site-id-container) should be visible after login'
    ).toBeVisible({ timeout: 30000 });
  }

  async getSelectedSite(): Promise<string> {
    await this.expectVisible();
    return ((await this.locators.siteSelectContainer.textContent()) || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async listSites(): Promise<string[]> {
    return (await this.locators.siteSelect.locator('option').allTextContents()).map((t) =>
      t.replace(/\s+/g, ' ').trim()
    );
  }

  private findMatch(siteName: string, available: string[]): string | undefined {
    return available.find(
      (name) =>
        name.toLowerCase() === siteName.toLowerCase() ||
        name.replace(/\s+/g, '').toLowerCase() === siteName.replace(/\s+/g, '').toLowerCase()
    );
  }

  /** Select site by name; throws with available sites if missing. */
  async selectSite(siteName: string): Promise<void> {
    await this.expectVisible();
    await this.waitForSiteOption(siteName, 10000);
    let available = await this.listSites();
    let match = this.findMatch(siteName, available);

    const current = await this.getSelectedSite();
    if (this.findMatch(siteName, [current])) return;

    await this.locators.siteSelectContainer.click();
    await expect(this.locators.select2Options.first()).toBeVisible({ timeout: 10000 });
    const search = this.page.locator('.select2-search__field, input.select2-search__field').first();
    const searchText = match || siteName;
    if (await search.isVisible().catch(() => false)) {
      await search.fill('').catch(() => undefined);
      await search.fill(searchText).catch(() => undefined);
      await this.page.waitForTimeout(500);
    }
    const re = new RegExp(siteName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    let opt = this.locators.select2Options.filter({ hasText: match || re }).first();
    if (!(await opt.isVisible({ timeout: 5000 }).catch(() => false))) {
      const token = siteName.split(/\s+/).find((p) => /GDC|Test/i.test(p)) || siteName.slice(0, 12);
      if (await search.isVisible().catch(() => false)) {
        await search.fill(token).catch(() => undefined);
        await this.page.waitForTimeout(500);
      }
      opt = this.locators.select2Options.filter({ hasText: re }).first();
    }
    if (!(await opt.isVisible({ timeout: 5000 }).catch(() => false))) {
      await this.page.keyboard.press('Escape').catch(() => undefined);
      available = await this.listSites();
      throw new Error(
        `[SiteDropdown] Site "${siteName}" not found. Available: ${available.join(', ') || '(none)'}`
      );
    }
    await opt.click();
    const expectText = match || siteName;
    await expect(this.locators.siteSelectContainer).toContainText(expectText, { timeout: 15000 });
  }

  /** Wait until the native <select> includes the target site (async portal loads). */
  private async waitForSiteOption(siteName: string, timeoutMs = 20000): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const available = await this.listSites();
      if (this.findMatch(siteName, available)) return true;
      await this.page.waitForTimeout(500);
    }
    return false;
  }

  /**
   * Ensure active profile site is selected. Switch if needed; fail if still wrong.
   * Auto-heals transient dropdown states (incomplete option lists on some pages).
   */
  async ensureProfileSite(): Promise<void> {
    const profile = getActiveProfile();
    await this.expectVisible();

    // Already on the correct site — do not require a full options list
    let current = await this.getSelectedSite();
    if (this.findMatch(profile.siteName, [current])) {
      return;
    }

    let found = await this.waitForSiteOption(profile.siteName, 15000);
    if (!found) {
      // Recover: leave pages that shrink the site list, then retry
      await this.page
        .goto(`${this.portalWebBase()}/index.php?r=overview-dashboard/overview`, {
          waitUntil: 'domcontentloaded',
        })
        .catch(() => undefined);
      await this.expectVisible();
      current = await this.getSelectedSite();
      if (this.findMatch(profile.siteName, [current])) return;
      found = await this.waitForSiteOption(profile.siteName, 20000);
    }

    let available = await this.listSites();
    let match = this.findMatch(profile.siteName, available);
    if (!match) {
      // Select2 typeahead may still resolve the site even when native options are incomplete
      try {
        await this.locators.siteSelectContainer.click();
        const search = this.page.locator('.select2-search__field, input.select2-search__field').first();
        if (await search.isVisible().catch(() => false)) {
          await search.fill(profile.siteName).catch(() => undefined);
          await this.page.waitForTimeout(700);
          const typedOpt = this.locators.select2Options
            .filter({ hasText: new RegExp(profile.siteName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') })
            .first();
          if (await typedOpt.isVisible({ timeout: 5000 }).catch(() => false)) {
            await typedOpt.click();
            await this.page.waitForTimeout(1500);
            current = await this.getSelectedSite();
            if (this.findMatch(profile.siteName, [current])) return;
          }
        }
        await this.page.keyboard.press('Escape').catch(() => undefined);
      } catch {
        await this.page.keyboard.press('Escape').catch(() => undefined);
      }
      available = await this.listSites();
      match = this.findMatch(profile.siteName, available);
    }
    if (!match) {
      // Last chance: selected label may still be correct after navigation
      current = await this.getSelectedSite();
      if (this.findMatch(profile.siteName, [current])) return;

      throw new Error(
        `[SiteDropdown] Profile site "${profile.siteName}" (datacenter=${profile.datacenter}, profile=${profile.id}) ` +
          `not found in dropdown. Available: ${available.join(', ') || '(none)'}. ` +
          `Selected="${current}". URL=${this.page.url()}`
      );
    }

    current = await this.getSelectedSite();
    if (!this.findMatch(profile.siteName, [current])) {
      await this.selectSite(profile.siteName);
      current = await this.getSelectedSite();
    }

    if (!this.findMatch(profile.siteName, [current])) {
      throw new Error(
        `[SiteDropdown] Failed to switch to "${profile.siteName}" (datacenter=${profile.datacenter}). ` +
          `Still on "${current}". URL=${this.page.url()}`
      );
    }
  }
}
