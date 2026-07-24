import { Page, expect } from '@playwright/test';
import { SideNavLocators } from '../locators/SideNavLocators';

export type SideNavLeaf = {
  text: string;
  href: string;
  routeKey: string;
};

export type SubMenuNavigationResult = {
  text: string;
  routeKey: string;
  ok: boolean;
  url: string;
  pageTitle: string;
  error?: string;
};

export class SideNavPage {
  readonly locators: SideNavLocators;

  constructor(private readonly page: Page) {
    this.locators = new SideNavLocators(page);
  }

  async openMenu(): Promise<void> {
    await expect(this.locators.menuToggle).toBeVisible({ timeout: 30000 });
    if (await this.isMenuPanelVisible()) return;
    await this.locators.menuToggle.click();
    await this.page.waitForTimeout(700);
    if (!(await this.isMenuPanelVisible())) {
      await this.locators.menuToggle.click();
      await this.page.waitForTimeout(700);
    }
  }

  async ensureMenuOpen(): Promise<void> {
    if (!(await this.isMenuPanelVisible())) {
      await this.openMenu();
    }
  }

  async expandMenuSection(sectionTitle: string | RegExp): Promise<void> {
    await this.ensureMenuOpen();
    const section = this.page
      .locator('span.site-nav-title, a.tooltip-always, li.sub-menu > a')
      .filter({ hasText: sectionTitle })
      .first();
    if ((await section.count()) === 0) return;
    await section.click({ force: true }).catch(() => undefined);
    await this.page.waitForTimeout(250);
  }

  async clickSubMenu(menuLabel: string): Promise<void> {
    await this.ensureMenuOpen();

    for (const section of [
      /Advanced Reporting/i,
      /^Executive$/i,
      /Automated Reporting/i,
      /^Alerting$/i,
      /Custom Reporting/i,
      /^Logs$/i,
    ]) {
      await this.expandMenuSection(section);
    }

    const link = this.page
      .locator('a')
      .filter({ has: this.page.locator('.site-nav-title', { hasText: menuLabel }) })
      .or(
        this.page
          .locator('a.tooltip-always, a[href*="index.php?r="]')
          .filter({ hasText: menuLabel })
      )
      .first();

    const href = await link.getAttribute('href').catch(() => null);
    if (!href) {
      throw new Error(`Submenu "${menuLabel}" not found in side navigation`);
    }

    // Prefer real click; fall back to href navigation if the leaf stays obscured
    try {
      await link.click({ force: true, timeout: 8000 });
      await this.page.waitForLoadState('domcontentloaded');
    } catch {
      const absolute = href.startsWith('http')
        ? href
        : href.startsWith('/')
          ? `https://portal.bluetriangle.com${href}`
          : `https://portal.bluetriangle.com/btportal/web/${href}`;
      await this.page.goto(absolute, { waitUntil: 'domcontentloaded' });
    }
  }

  async expectPageLoaded(): Promise<void> {
    await expect(this.page).not.toHaveURL(/site\/login|site%2Flogin/i, { timeout: 30000 });
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.locators.pageTitle).toBeVisible({ timeout: 45000 });
    const title = ((await this.locators.pageTitle.textContent()) || '').replace(/\s+/g, ' ').trim();
    expect(title.length, 'Page title should not be empty after load').toBeGreaterThan(0);
  }

  async navigateSubMenusByLabels(menuLabels: string[]): Promise<SubMenuNavigationResult[]> {
    const results: SubMenuNavigationResult[] = [];

    for (const label of menuLabels) {
      const result: SubMenuNavigationResult = {
        text: label,
        routeKey: label,
        ok: false,
        url: '',
        pageTitle: '',
      };

      try {
        await this.clickSubMenu(label);
        await this.expectPageLoaded();
        result.ok = true;
        result.url = this.page.url();
        result.pageTitle = ((await this.locators.pageTitle.textContent()) || '')
          .replace(/\s+/g, ' ')
          .trim();
        result.routeKey = this.toRouteKey(result.url) || label;
      } catch (err) {
        result.ok = false;
        result.url = this.page.url();
        result.error = err instanceof Error ? err.message : String(err);
        result.pageTitle = ((await this.locators.pageTitle.textContent().catch(() => '')) || '')
          .replace(/\s+/g, ' ')
          .trim();
      }

      results.push(result);
      console.log(
        `${result.ok ? 'PASS' : 'FAIL'} | ${label} | ${result.pageTitle || result.error || ''}`
      );
    }

    return results;
  }

  private async isMenuPanelVisible(): Promise<boolean> {
    // Portal left nav exposes product links once hamburger opens
    const count = await this.page
      .locator('a.tooltip-always[href*="index.php?r="]')
      .filter({ visible: true })
      .count();
    return count > 0;
  }

  private toRouteKey(href: string): string {
    try {
      const url = new URL(href, 'https://portal.bluetriangle.com/');
      const route = url.searchParams.get('r') || '';
      if (!route) return '';
      const extras = [...url.searchParams.entries()]
        .filter(([k]) => k !== 'r' && k !== 'sid')
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join('&');
      return extras ? `${route}?${extras}` : route;
    } catch {
      return href;
    }
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
