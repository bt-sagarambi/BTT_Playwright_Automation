import { Page, expect } from '@playwright/test';
import { SideNavLocators } from '../locators/SideNavLocators';
import type { SmokePageDef } from '../config/smokeCatalog';
import { currentSiteId, portalBase } from '../helpers/portalSession';

/**
 * Left navigation — open menu, favorites probe, open read-only pages by route.
 * Never follows create/edit write entry points.
 */
export class LeftNavPage {
  readonly locators: SideNavLocators;

  constructor(private readonly page: Page) {
    this.locators = new SideNavLocators(page);
  }

  async openMenu(): Promise<void> {
    await expect(this.locators.menuToggle).toBeVisible({ timeout: 30000 });
    if (await this.isMenuPanelVisible()) return;
    await this.locators.menuToggle.click();
    await this.page.waitForTimeout(500);
    if (!(await this.isMenuPanelVisible())) {
      await this.locators.menuToggle.click();
      await this.page.waitForTimeout(500);
    }
  }

  async ensureMenuOpen(): Promise<void> {
    if (!(await this.isMenuPanelVisible())) {
      await this.openMenu();
    }
  }

  async expandCommonSections(): Promise<void> {
    await this.ensureMenuOpen();
    const sections = [
      /Advanced Reporting/i,
      /^Executive$/i,
      /Automated Reporting/i,
      /^Alerting$/i,
      /Custom Reporting/i,
      /^Logs$/i,
      /Real User Monitoring|RUM/i,
      /Synthetic/i,
      /Tag|Content Governance/i,
      /Business|Analytics|Marketing/i,
      /Native/i,
      /Account|Settings/i,
    ];
    for (const section of sections) {
      const el = this.page
        .locator('span.site-nav-title, a.tooltip-always, li.sub-menu > a')
        .filter({ hasText: section })
        .first();
      if ((await el.count()) === 0) continue;
      await el.click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(80);
    }
  }

  async hasFavoritesSection(): Promise<boolean> {
    await this.ensureMenuOpen();
    const favorites = this.page
      .locator('[class*="favorite" i], [id*="favorite" i], span.site-nav-title, a, li, button')
      .filter({ hasText: /favorite/i });
    const stars = this.page.locator(
      '.fa-star, .glyphicon-star, .icon-star, [class*="star" i][class*="fav" i], i.star'
    );
    return (await favorites.count()) + (await stars.count()) > 0;
  }

  async expectFavoritesSection(): Promise<void> {
    const present = await this.hasFavoritesSection();
    if (!present) {
      console.warn(
        `[LeftNav] Favorites UI not found for this user/site (non-fatal). URL=${this.page.url()}`
      );
    }
  }

  async resolveHref(def: SmokePageDef): Promise<string | null> {
    return this.page.evaluate(
      ({ route, hrefIncludes, hrefExcludes }) => {
        const anchors = [...document.querySelectorAll('a[href]')] as HTMLAnchorElement[];
        const encoded = encodeURIComponent(route);
        const matches = anchors.filter((a) => {
          const href = a.getAttribute('href') || '';
          if (!href.includes(route) && !href.includes(encoded)) return false;
          if (/create=true|profile-update/i.test(href)) return false;
          if (hrefExcludes?.length && hrefExcludes.some((f) => href.includes(f))) return false;
          if (hrefIncludes?.length) {
            return hrefIncludes.every((f) => href.includes(f));
          }
          return true;
        });
        const preferred =
          matches.find((a) => {
            const href = a.getAttribute('href') || '';
            return href.includes(`r=${route}`) || href.includes(`r=${encoded}`);
          }) || matches[0];
        return preferred?.getAttribute('href') || null;
      },
      {
        route: def.route,
        hrefIncludes: def.hrefIncludes || [],
        hrefExcludes: def.hrefExcludes || [],
      }
    );
  }

  /** Build a read-only GET URL for a catalog page. */
  buildPageUrl(def: SmokePageDef): string {
    const params = new URLSearchParams();
    params.set('r', def.route);
    const sid = currentSiteId(this.page);
    if (sid) params.set('sid', sid);

    for (const fragment of def.hrefIncludes || []) {
      if (fragment.includes('=') && !fragment.startsWith('r=') && !fragment.includes('site/dashboard')) {
        const [k, v] = fragment.split('=');
        if (k && v && !params.has(k)) params.set(k, v);
      }
    }

    // marketing campaign dashboard
    if (def.id === 'mkt.my-campaign') {
      params.set('marketing', 'yes');
    }

    return `${portalBase()}/index.php?${params.toString()}`;
  }

  /**
   * Open a catalog smoke page (GET only) via constructed route URL.
   * Menu href resolve is optional fallback when construction is insufficient.
   */
  async openSmokePage(def: SmokePageDef): Promise<void> {
    let target = this.buildPageUrl(def);

    // If we have no sid yet, try menu href (needs nav DOM)
    if (!currentSiteId(this.page)) {
      await this.ensureMenuOpen().catch(() => undefined);
      const menuHref = await this.resolveHref(def).catch(() => null);
      if (menuHref) target = this.toAbsolute(menuHref);
    }

    if (/create=true|profile-update/i.test(target)) {
      throw new Error(`[LeftNav] Refusing write-capable URL for "${def.id}": ${target}`);
    }

    await this.page.goto(target, { waitUntil: 'domcontentloaded' });
  }

  private toAbsolute(href: string): string {
    if (href.startsWith('http')) return href;
    if (href.startsWith('/')) {
      const origin = new URL(this.page.url()).origin;
      return `${origin}${href}`;
    }
    return `${portalBase()}/${href}`;
  }

  private async isMenuPanelVisible(): Promise<boolean> {
    const count = await this.page
      .locator('a.tooltip-always[href*="index.php?r="], a[href*="index.php?r="]')
      .filter({ visible: true })
      .count();
    return count > 0;
  }
}
