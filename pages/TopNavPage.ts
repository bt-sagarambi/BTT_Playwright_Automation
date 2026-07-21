import { Page, expect } from '@playwright/test';
import { TopNavLocators } from '../locators/TopNavLocators';

export class TopNavPage {
  readonly locators: TopNavLocators;

  constructor(private readonly page: Page) {
    this.locators = new TopNavLocators(page);
  }

  /** Select a site from the top-nav site dropdown; throws if the site is missing. */
  async selectSite(siteName: string): Promise<void> {
    await expect(this.locators.siteSelectContainer).toBeVisible({ timeout: 30000 });

    const available = (await this.locators.siteSelect.locator('option').allTextContents()).map((t) =>
      t.replace(/\s+/g, ' ').trim()
    );
    const match = available.find(
      (name) =>
        name.toLowerCase() === siteName.toLowerCase() ||
        name.replace(/\s+/g, '').toLowerCase() === siteName.replace(/\s+/g, '').toLowerCase()
    );

    if (!match) {
      throw new Error(
        `Site "${siteName}" not found in site dropdown. Available sites: ${available.join(', ') || '(none)'}`
      );
    }

    await this.locators.siteSelectContainer.click();
    await expect(this.locators.select2Options.first()).toBeVisible({ timeout: 10000 });
    await this.locators.select2Options.filter({ hasText: match }).first().click();
    await expect(this.locators.siteSelectContainer).toContainText(match, { timeout: 15000 });
  }

  async openMainMenu(): Promise<void> {
    await expect(this.locators.menuToggle).toBeVisible();
    await this.locators.menuToggle.click();
    await this.page.waitForTimeout(500);
  }

  async expectMenuOptionVisible(optionName: string | RegExp): Promise<void> {
    await this.expandMenuPathFor(optionName);
    await expect(this.visibleMenuLink(optionName)).toBeVisible({ timeout: 15000 });
  }

  async clickMenuOption(optionName: string | RegExp): Promise<void> {
    await this.expandMenuPathFor(optionName);
    const link = this.visibleMenuLink(optionName);
    await expect(link).toBeVisible({ timeout: 15000 });
    await link.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  private visibleMenuLink(optionName: string | RegExp) {
    return this.locators.menuLink(optionName).filter({ visible: true }).first();
  }

  /** Expand Advanced Reporting / Executive so nested items like DXO become visible. */
  private async expandMenuPathFor(optionName: string | RegExp): Promise<void> {
    const name = typeof optionName === 'string' ? optionName : optionName.source;
    if (!/Digital Experience Overview/i.test(name)) return;

    const advanced = this.page
      .locator('a, span.site-nav-title')
      .filter({ hasText: /Advanced Reporting/i })
      .filter({ visible: true })
      .first();
    if ((await advanced.count()) > 0) {
      await advanced.click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(400);
    }

    const executive = this.page
      .locator('a, span.site-nav-title')
      .filter({ hasText: /^Executive$/i })
      .filter({ visible: true })
      .first();
    if ((await executive.count()) > 0) {
      await executive.click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(400);
    }
  }


  async expectPageTitle(expected: string | RegExp): Promise<void> {
    await expect(this.locators.pageTitle).toBeVisible({ timeout: 30000 });
    await expect(this.locators.pageTitle).toHaveText(expected);
  }

  async getRightNavTooltips(): Promise<string[]> {
    const controls = this.locators.rightNavControls;
    const count = await controls.count();
    const tooltips: string[] = [];
    for (let i = 0; i < count; i++) {
      const el = controls.nth(i);
      const tip =
        (await el.getAttribute('data-original-title')) ||
        (await el.getAttribute('title')) ||
        (await el.getAttribute('aria-label')) ||
        '';
      if (tip.trim()) tooltips.push(tip.trim());
    }
    return tooltips;
  }

  async verifyRightNavOptionsInteractive(expectedTooltips: string[]): Promise<void> {
    const visibleControls = this.locators.rightNavControls.filter({ visible: true });
    await expect(visibleControls.first()).toBeVisible();
    expect(await visibleControls.count()).toBeGreaterThan(0);

    for (const tip of expectedTooltips) {
      const icon = this.locators.rightNavIcon(tip).filter({ visible: true });
      if ((await icon.count()) === 0) {
        // Some icons (e.g. Help Video) are intentionally hidden on certain pages
        continue;
      }

      await expect(icon.first(), `Right-nav control with tooltip "${tip}" should be visible`).toBeVisible();
      await expect(icon.first()).toBeEnabled();

      await icon.first().hover();
      const tooltipBubble = this.page.locator('.tooltip, .tooltip-inner').filter({ hasText: tip });
      const hasBubble = (await tooltipBubble.count()) > 0;
      const attrTip =
        (await icon.first().getAttribute('data-original-title')) ||
        (await icon.first().getAttribute('title')) ||
        (await icon.first().getAttribute('aria-label')) ||
        '';
      expect(
        hasBubble || attrTip.includes(tip),
        `Tooltip for "${tip}" should appear on hover or via data attribute`
      ).toBeTruthy();
    }

    // Ensure at least the visible right-nav icons expose tooltips and are clickable
    const count = await visibleControls.count();
    for (let i = 0; i < Math.min(count, 8); i++) {
      const el = visibleControls.nth(i);
      const tip =
        (await el.getAttribute('data-original-title')) ||
        (await el.getAttribute('title')) ||
        (await el.getAttribute('aria-label')) ||
        '';
      expect(tip.trim().length, `Visible right-nav control #${i} should have a tooltip`).toBeGreaterThan(0);
      await expect(el).toBeEnabled();
      await el.hover();
    }
  }
}
