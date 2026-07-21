import { Page, Locator } from '@playwright/test';

export class DigitalExperienceOverviewLocators {
  readonly timePeriodToggle: Locator;
  readonly timePeriodOptions: Locator;
  readonly autoRefreshButton: Locator;
  readonly autoRefreshMenu: Locator;
  readonly autoRefreshMenuItems: Locator;

  constructor(page: Page) {
    this.timePeriodToggle = page
      .locator('#page-controls-og button.dropdown-toggle')
      .filter({ hasText: /Last|Today|Custom|week|month|hours|days/i })
      .first();
    this.timePeriodOptions = page.locator('button.time-option');
    this.autoRefreshButton = page.locator('#auto-refresh');
    this.autoRefreshMenu = page.locator(
      '.btn-group:has(#auto-refresh) .dropdown-menu, .dropdown:has(#auto-refresh) .dropdown-menu'
    );
    this.autoRefreshMenuItems = this.autoRefreshMenu.locator('a, button, li');
  }
}
