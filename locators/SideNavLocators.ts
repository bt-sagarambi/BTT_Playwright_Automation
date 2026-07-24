import { Page, Locator } from '@playwright/test';

export class SideNavLocators {
  readonly menuToggle: Locator;
  readonly pageTitle: Locator;
  readonly navLinks: Locator;

  constructor(page: Page) {
    this.menuToggle = page.locator('#toggle-navigation');
    this.pageTitle = page.locator('#page-title');
    this.navLinks = page.locator('a.tooltip-always[href*="index.php"], a[href*="index.php?r="]');
  }

  linkByText(text: string): Locator {
    return this.navLinks.filter({ hasText: new RegExp(`^\\s*${escapeRegex(text)}\\s*$`) });
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
