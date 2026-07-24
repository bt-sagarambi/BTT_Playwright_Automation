import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { SiteDropdownPage } from '../../pages/SiteDropdownPage';
import { LeftNavPage } from '../../pages/LeftNavPage';
import { TopNavPage } from '../../pages/TopNavPage';
import { getActiveProfile } from '../../config/profiles';
import { loginAndSelectProfileSite } from '../../helpers/portalSession';

/**
 * Shared chrome smokes (Wave A) — read-only.
 * These do not use storageState so login itself is exercised.
 */

test.describe('Smoke chrome: auth + nav', () => {
  test.describe.configure({ mode: 'serial' });

  test('auth.login — Login page → portal', async ({ page }) => {
    test.setTimeout(120000);
    // Exercise real login even when the smoke project injects storageState
    await page.context().clearCookies();
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    // If SSO/session cookie remnants skip form, force login route
    if (!(await loginPage.isLoginFormVisible())) {
      await page.goto('/btportal/web/index.php?r=site/login', { waitUntil: 'domcontentloaded' });
    }
    await expect(loginPage.locators.loginForm).toBeVisible({ timeout: 30000 });
    await loginPage.loginAsStageUser();
    await loginPage.waitForLoginSuccess();
    await expect(page).not.toHaveURL(/site\/login|site%2Flogin/i);

    const site = new SiteDropdownPage(page);
    await site.expectVisible();
  });

  test('nav.site-dropdown — ensure US profile site GDC Test Site 2', async ({ page }) => {
    test.setTimeout(120000);
    await loginAndSelectProfileSite(page);
    const profile = getActiveProfile();
    const site = new SiteDropdownPage(page);
    const selected = await site.getSelectedSite();
    expect(
      selected,
      `[nav.site-dropdown] Expected profile site "${profile.siteName}" (datacenter=${profile.datacenter}). Got "${selected}"`
    ).toMatch(new RegExp(profile.siteName.replace(/\s+/g, '\\s*'), 'i'));
  });

  test('nav.left-nav — menu opens and favorites present', async ({ page }) => {
    test.setTimeout(120000);
    await loginAndSelectProfileSite(page);
    const leftNav = new LeftNavPage(page);
    await leftNav.openMenu();
    await leftNav.expandCommonSections();
    const linkCount = await page.locator('a[href*="index.php?r="]').count();
    expect(linkCount, '[nav.left-nav] Expected portal nav links after open').toBeGreaterThan(5);
    await leftNav.expectFavoritesSection();
  });

  test('nav.top-nav-breadcrumb — right controls + page title on DXO', async ({ page }) => {
    test.setTimeout(120000);
    await loginAndSelectProfileSite(page);
    const leftNav = new LeftNavPage(page);
    const topNav = new TopNavPage(page);
    await leftNav.openSmokePage({
      id: 'rum.dxo',
      module: 'rum',
      menuLabel: 'Digital Experience Overview',
      route: 'overview-dashboard/overview',
      titleIncludes: /Digital Experience Overview/i,
    });
    await topNav.expectPageTitle(/Digital Experience Overview/i);
    const tips = await topNav.getRightNavTooltips();
    expect(tips.length, '[nav.top-nav] Expected right-nav tooltips').toBeGreaterThan(0);
  });
});
