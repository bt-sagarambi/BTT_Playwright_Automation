import { test, expect } from '@playwright/test';
import { smokePages } from '../../config/smokeCatalog';
import { LeftNavPage } from '../../pages/LeftNavPage';
import { SiteDropdownPage } from '../../pages/SiteDropdownPage';
import { assertPageLoaded, assertMainContentPresent } from '../../helpers/assertPageLoaded';
import { ensurePortalSession } from '../../helpers/portalSession';

/**
 * One smoke TC per catalog page (read-only).
 * Naming: {module}.{page} — change routes/labels in config/smokeCatalog.ts only.
 *
 * Safety: never opens create/edit/write URLs (guarded in LeftNavPage).
 */

test.describe('Smoke: portal page loads (catalog)', () => {
  // Independent TCs so one page failure does not skip the rest
  test.describe.configure({ mode: 'default' });
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    await ensurePortalSession(page);
    await new SiteDropdownPage(page).ensureProfileSite();
  });

  for (const def of smokePages) {
    test(`${def.id} — ${def.menuLabel} loads`, async ({ page }) => {
      const leftNav = new LeftNavPage(page);
      try {
        await leftNav.openSmokePage(def);
        await assertPageLoaded(page, def);
        await assertMainContentPresent(page, def.id);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(
          `[VERBOSE FAIL] smoke=${def.id} module=${def.module} label="${def.menuLabel}" ` +
            `route="${def.route}" url="${page.url()}"\n${message}`
        );
      }
    });
  }
});

test('smoke catalog integrity — expected page count', async () => {
  // 72 page smokes + 4 chrome specs elsewhere = 76 total planned TCs
  expect(smokePages.length, 'Update this assertion if catalog intentionally changes').toBe(72);
});
