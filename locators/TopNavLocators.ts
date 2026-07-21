import { Page, Locator } from '@playwright/test';

export class TopNavLocators {
  readonly siteSelect: Locator;
  readonly siteSelectContainer: Locator;
  readonly select2Options: Locator;
  readonly menuToggle: Locator;
  readonly pageTitle: Locator;
  readonly rightNavControls: Locator;

  constructor(private readonly page: Page) {
    this.siteSelect = page.locator('#site-id');
    this.siteSelectContainer = page.locator('#select2-site-id-container');
    this.select2Options = page.locator('.select2-results__option');
    this.menuToggle = page.locator('#toggle-navigation');
    this.pageTitle = page.locator('#page-title');
    this.rightNavControls = page.locator(
      'button.ctrl.pull-right, a.ctrl.pull-right'
    );
  }

  menuLink(name: string | RegExp): Locator {
    return this.page.getByRole('link', { name }).or(
      this.page.locator('a.tooltip-always, a', { hasText: name })
    );
  }

  rightNavIcon(tooltip: string): Locator {
    return this.page
      .locator(
        `button.ctrl.pull-right[data-original-title="${tooltip}"], a.ctrl.pull-right[data-original-title="${tooltip}"], button.ctrl.pull-right[aria-label="${tooltip}"], a.ctrl.pull-right[aria-label="${tooltip}"]`
      )
      .first();
  }
}
