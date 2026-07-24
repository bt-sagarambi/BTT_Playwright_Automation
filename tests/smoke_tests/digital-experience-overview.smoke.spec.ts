import { test, expect } from '@playwright/test';
import { TopNavPage } from '../../pages/TopNavPage';
import { DigitalExperienceOverviewPage } from '../../pages/DigitalExperienceOverviewPage';
import { LeftNavPage } from '../../pages/LeftNavPage';
import { ensurePortalSession } from '../../helpers/portalSession';
import { getActiveProfile } from '../../config/profiles';

const DXO_MENU = 'Digital Experience Overview';
const EXPECTED_PAGE_TITLE =
  /Advanced Reporting & Alerting \/ Executive \/ Digital Experience Overview|Digital Experience Overview/i;

const TIME_PERIOD_OPTIONS = [
  'Custom Date Selection',
  'Last 2 days',
  'Last 7 days',
  'Last 14 days',
  'Last 30 days',
  'Last 90 days',
  'Today so far',
  'This week so far',
  'This month so far',
  'Last 3 hours',
  'Last 6 hours',
  'Last 12 hours',
  'Last 24 hours',
];

const AUTO_REFRESH_OPTIONS = [
  'Off',
  '2 Minutes',
  '5 Minutes',
  '10 Minutes',
  '15 Minutes',
  '30 Minutes',
  '60 Minutes',
];

const RIGHT_NAV_TOOLTIPS = [
  'User menu',
  'Settings & Administration',
  'Help Center',
  'Blue Triangle Help Video',
  'Change theme',
  'Filters',
  'Feedback',
];

test('Smoke: Digital Experience Overview dashboard navigation and controls', async ({ page }) => {
  test.setTimeout(120000);
  const topNav = new TopNavPage(page);
  const leftNav = new LeftNavPage(page);
  const dxo = new DigitalExperienceOverviewPage(page);
  const profile = getActiveProfile();

  await ensurePortalSession(page);
  await topNav.ensureProfileSite();

  await leftNav.openSmokePage({
    id: 'rum.dxo',
    module: 'rum',
    menuLabel: DXO_MENU,
    route: 'overview-dashboard/overview',
    titleIncludes: EXPECTED_PAGE_TITLE,
  });

  await topNav.expectPageTitle(EXPECTED_PAGE_TITLE);

  await dxo.openTimePeriodFilter();
  await dxo.expectTimePeriodOptionsPresent(TIME_PERIOD_OPTIONS);
  expect((await dxo.getTimePeriodOptions()).length).toBeGreaterThan(1);

  await dxo.openAutoRefreshMenu();
  await dxo.expectAutoRefreshOptionsPresent(AUTO_REFRESH_OPTIONS);
  expect((await dxo.getAutoRefreshOptions()).length).toBeGreaterThan(1);

  const tooltips = await topNav.getRightNavTooltips();
  expect(tooltips.length).toBeGreaterThan(0);
  await topNav.verifyRightNavOptionsInteractive(RIGHT_NAV_TOOLTIPS);

  console.log(`[DXO smoke] profile=${profile.id} site=${profile.siteName}`);
});
