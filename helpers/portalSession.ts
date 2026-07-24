import { Page, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { SiteDropdownPage } from '../pages/SiteDropdownPage';
import { getActiveProfile } from '../config/profiles';
import { config } from '../config/env';

export const AUTH_PATH = 'playwright/.auth/user.json';

/** Full login + profile site selection (read-only). */
export async function loginAndSelectProfileSite(page: Page): Promise<void> {
  const loginPage = new LoginPage(page);
  const siteDropdown = new SiteDropdownPage(page);
  const profile = getActiveProfile();

  let loggedIn = false;
  for (let attempt = 1; attempt <= 2 && !loggedIn; attempt++) {
    await loginPage.goto();
    const onLoginUrl = /site\/login|site%2Flogin/i.test(page.url());
    const userBox = await loginPage.locators.usernameInput.isVisible().catch(() => false);
    const formVisible = await loginPage.isLoginFormVisible();

    if (onLoginUrl || userBox || formVisible) {
      await loginPage.loginAsStageUser();
      try {
        await loginPage.waitForLoginSuccess();
        loggedIn = true;
      } catch (err) {
        console.warn(`[PortalSession] login attempt ${attempt} failed: ${err}`);
        if (attempt === 2) throw err;
        await page.waitForTimeout(1500);
      }
    } else {
      loggedIn = true;
    }
  }

  await expect(page).not.toHaveURL(/site\/login|site%2Flogin/i, { timeout: 30000 });
  await siteDropdown.ensureProfileSite();

  console.log(
    `[PortalSession] profile=${profile.id} | datacenter=${profile.datacenter} | site=${profile.siteName}`
  );
}

/**
 * Ensure we are in the portal on the profile site.
 * Prefer storage-state session; avoid unnecessary baseURL navigations.
 */
export async function ensurePortalSession(page: Page): Promise<void> {
  const siteDropdown = new SiteDropdownPage(page);

  if (page.url() === 'about:blank' || page.url() === 'about:blank#') {
    await page
      .goto('/btportal/web/index.php?r=overview-dashboard/overview', {
        waitUntil: 'domcontentloaded',
      })
      .catch(() => undefined);
  }

  const onLogin =
    /site\/login|site%2Flogin/i.test(page.url()) ||
    (await page.locator('#login-form, form#login-form, input[name="LoginForm[username]"], #loginform-username').count()) >
      0;

  if (onLogin) {
    await loginAndSelectProfileSite(page);
    return;
  }

  try {
    await siteDropdown.expectVisible();
    await siteDropdown.ensureProfileSite();
  } catch (firstErr) {
    console.warn(
      `[PortalSession] ensureProfileSite failed (${firstErr instanceof Error ? firstErr.message : firstErr}); recovering…`
    );
    await page
      .goto('/btportal/web/index.php?r=overview-dashboard/overview', { waitUntil: 'domcontentloaded' })
      .catch(() => undefined);
    try {
      await siteDropdown.ensureProfileSite();
    } catch {
      await loginAndSelectProfileSite(page);
    }
  }
}

/** Current site id from URL (sid=), if present. */
export function currentSiteId(page: Page): string | null {
  try {
    return new URL(page.url()).searchParams.get('sid');
  } catch {
    return null;
  }
}

export function portalBase(): string {
  const base = config.baseURL.replace(/\/$/, '');
  return `${base}/btportal/web`;
}
