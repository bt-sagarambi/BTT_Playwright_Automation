import { test as setup, expect } from '@playwright/test';
import { loginAndSelectProfileSite, AUTH_PATH } from '../../helpers/portalSession';
import { getActiveProfile } from '../../config/profiles';
import { SiteDropdownPage } from '../../pages/SiteDropdownPage';
import fs from 'fs';
import path from 'path';

setup('authenticate and select profile site', async ({ page }) => {
  setup.setTimeout(120000);
  await loginAndSelectProfileSite(page);

  const site = new SiteDropdownPage(page);
  const profile = getActiveProfile();
  await expect(await site.getSelectedSite()).toMatch(new RegExp(profile.siteName.replace(/\s+/g, '\\s*'), 'i'));

  const authDir = path.dirname(AUTH_PATH);
  fs.mkdirSync(authDir, { recursive: true });
  await page.context().storageState({ path: AUTH_PATH });
});
