import { test, expect } from '@playwright/test';
import { LeftNavPage } from '../../pages/LeftNavPage';
import { SiteDropdownPage } from '../../pages/SiteDropdownPage';
import { ensurePortalSession } from '../../helpers/portalSession';
import { assertPageLoaded } from '../../helpers/assertPageLoaded';
import { smokePages } from '../../config/smokeCatalog';

/** Read-only Advanced Reporting / Logs subset from the shared catalog (no create pages). */
const ADVANCED_REPORTING_IDS = [
  'rum.dxo',
  'rum.executive-kpi',
  'rum.crux',
  'rum.automated-reports',
  'rum.alerts',
  'rum.data-science',
  'logs.alerts-log',
  'logs.reports-log',
  'logs.domain-violation-audit',
  'logs.synthetic-monitors',
  'logs.instant-measurement',
  'logs.consultant-access',
  'logs.site-variables',
];

test('Smoke: open menu and verify Advanced Reporting submenu pages load (read-only)', async ({
  page,
}) => {
  test.setTimeout(20 * 60 * 1000);

  await ensurePortalSession(page);
  await new SiteDropdownPage(page).ensureProfileSite();

  const leftNav = new LeftNavPage(page);
  await leftNav.openMenu();

  const subset = smokePages.filter((p) => ADVANCED_REPORTING_IDS.includes(p.id));
  const failures: string[] = [];

  for (const def of subset) {
    try {
      await leftNav.openSmokePage(def);
      await assertPageLoaded(page, def);
      console.log(`PASS | ${def.id} | ${def.menuLabel}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      failures.push(`${def.id}: ${message}`);
      console.log(`FAIL | ${def.id} | ${message}`);
    }
  }

  expect(failures, `Failures:\n${failures.join('\n')}`).toEqual([]);
});
