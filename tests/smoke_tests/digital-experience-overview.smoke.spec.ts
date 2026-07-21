import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { TopNavPage } from '../../pages/TopNavPage';
import { DigitalExperienceOverviewPage } from '../../pages/DigitalExperienceOverviewPage';

const SITE_NAME = 'GDC Test Site2';
const DXO_MENU = 'Digital Experience Overview';
const EXPECTED_PAGE_TITLE =
  'Advanced Reporting & Alerting / Executive / Digital Experience Overview';

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
  const loginPage = new LoginPage(page);
  const topNav = new TopNavPage(page);
  const dxo = new DigitalExperienceOverviewPage(page);

  // 1) Login (same flow as tests/login.spec.ts)
  await loginPage.goto();
  await loginPage.loginAsStageUser();
  await loginPage.waitForLoginSuccess();
  await expect(page).not.toHaveURL(/site\/login|site%2Flogin/i);

  // 2) Select site from top-nav dropdown
  await topNav.selectSite(SITE_NAME);

  // 3) Open menu and open Digital Experience Overview
  await topNav.openMainMenu();
  await topNav.expectMenuOptionVisible(DXO_MENU);
  await topNav.clickMenuOption(DXO_MENU);

  // 4) Confirm breadcrumb / page title in top bar
  await topNav.expectPageTitle(EXPECTED_PAGE_TITLE);

  // 5) Time period filter options
  await dxo.openTimePeriodFilter();
  await dxo.expectTimePeriodOptionsPresent(TIME_PERIOD_OPTIONS);
  expect((await dxo.getTimePeriodOptions()).length).toBeGreaterThan(1);

  // 6) Auto refresh options
  await dxo.openAutoRefreshMenu();
  await dxo.expectAutoRefreshOptionsPresent(AUTO_REFRESH_OPTIONS);
  expect((await dxo.getAutoRefreshOptions()).length).toBeGreaterThan(1);

  // 7) Right-side top nav options: present, tooltips, clickable
  const tooltips = await topNav.getRightNavTooltips();
  expect(tooltips.length).toBeGreaterThan(0);
  await topNav.verifyRightNavOptionsInteractive(RIGHT_NAV_TOOLTIPS);
});
