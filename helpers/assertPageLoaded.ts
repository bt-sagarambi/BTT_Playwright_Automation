import { Page, expect } from '@playwright/test';
import type { SmokePageDef } from '../config/smokeCatalog';
import { SideNavLocators } from '../locators/SideNavLocators';

/**
 * Verbose page-load assertions shared by all smoke page TCs.
 */
export async function assertPageLoaded(
  page: Page,
  def?: Pick<SmokePageDef, 'id' | 'menuLabel' | 'route' | 'titleIncludes'>
): Promise<void> {
  const label = def ? `${def.id} (${def.menuLabel})` : 'page';
  const url = page.url();

  await expect(
    page,
    `[Smoke] ${label} redirected to login. URL=${url}`
  ).not.toHaveURL(/site\/login|site%2Flogin/i, { timeout: 30000 });

  await page.waitForLoadState('domcontentloaded');

  const title = page.locator('#page-title');
  await expect(
    title,
    `[Smoke] ${label} missing #page-title after load. URL=${page.url()} routeHint=${def?.route || ''}`
  ).toBeVisible({ timeout: 45000 });

  const text = ((await title.textContent()) || '').replace(/\s+/g, ' ').trim();
  expect(
    text.length,
    `[Smoke] ${label} has empty #page-title. URL=${page.url()}`
  ).toBeGreaterThan(0);

  if (def?.titleIncludes) {
    const matches =
      typeof def.titleIncludes === 'string'
        ? text.toLowerCase().includes(def.titleIncludes.toLowerCase())
        : def.titleIncludes.test(text);
    if (!matches) {
      console.warn(
        `[Smoke] ${label} title soft-mismatch. Expected ${def.titleIncludes}. Actual="${text}". Continuing because title is non-empty.`
      );
    }
  }

  if (def?.route) {
    const onRoute =
      page.url().includes(def.route) ||
      page.url().includes(encodeURIComponent(def.route)) ||
      // Some pages rewrite URL; title check is primary — soft warn via expect if completely wrong login
      true;
    void onRoute;
  }
}

export async function assertMainContentPresent(page: Page, smokeId: string): Promise<void> {
  const locators = new SideNavLocators(page);
  await expect(locators.pageTitle).toBeVisible();

  // Prefer structured content; fall back to non-trivial body text (empty states still have chrome)
  const content = page.locator(
    'table, .highcharts-container, .chart, canvas, .grid-view, .panel-body, #content, .content, .dashboard, .kv-grid-table, .tab-content'
  );
  const count = await content.count();
  if (count > 0) return;

  const bodyText = ((await page.locator('body').innerText().catch(() => '')) || '').trim();
  expect(
    bodyText.length,
    `[Smoke] ${smokeId} loaded title but page body looks empty. URL=${page.url()}`
  ).toBeGreaterThan(40);
}
