import { Page, expect } from '@playwright/test';
import { DigitalExperienceOverviewLocators } from '../locators/DigitalExperienceOverviewLocators';

export class DigitalExperienceOverviewPage {
  readonly locators: DigitalExperienceOverviewLocators;

  constructor(private readonly page: Page) {
    this.locators = new DigitalExperienceOverviewLocators(page);
  }

  async openTimePeriodFilter(): Promise<void> {
    await expect(this.locators.timePeriodToggle).toBeVisible({ timeout: 20000 });
    await this.locators.timePeriodToggle.click();
    await expect(this.locators.timePeriodOptions.first()).toBeVisible({ timeout: 10000 });
  }

  async getTimePeriodOptions(): Promise<string[]> {
    return (await this.locators.timePeriodOptions.allTextContents())
      .map((t) => t.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
  }

  async expectTimePeriodOptionsPresent(expected: string[]): Promise<void> {
    const actual = await this.getTimePeriodOptions();
    for (const option of expected) {
      expect(actual, `Missing time period option: ${option}`).toContain(option);
    }
  }

  async closeOpenDropdowns(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(300);
  }

  async openAutoRefreshMenu(): Promise<void> {
    await this.closeOpenDropdowns();
    await expect(this.locators.autoRefreshButton).toBeVisible({ timeout: 20000 });
    await this.locators.autoRefreshButton.click();

    // Parent btn-group/dropdown should gain .open; fall back to JS if markup differs
    const opened = await this.page
      .locator('.btn-group.open:has(#auto-refresh), .dropdown.open:has(#auto-refresh)')
      .count();
    if (!opened) {
      await this.locators.autoRefreshButton.click({ force: true });
    }

    await expect
      .poll(async () => (await this.getAutoRefreshOptions()).length, { timeout: 10000 })
      .toBeGreaterThan(0);
  }

  async getAutoRefreshOptions(): Promise<string[]> {
    const fromLocator = (await this.locators.autoRefreshMenuItems.allTextContents())
      .map((t) => t.replace(/\s+/g, ' ').trim())
      .filter(Boolean);

    if (fromLocator.length) {
      return [...new Set(fromLocator)];
    }

    // Fallback: read menu under the auto-refresh control
    const viaDom = await this.page.evaluate(() => {
      const btn = document.querySelector('#auto-refresh');
      const menu = btn?.closest('.dropdown, .btn-group')?.querySelector('.dropdown-menu');
      if (!menu) return [] as string[];
      return [...menu.querySelectorAll('a, button, li')]
        .map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim())
        .filter(Boolean);
    });
    return [...new Set(viaDom)];
  }

  async expectAutoRefreshOptionsPresent(expected: string[]): Promise<void> {
    const actual = await this.getAutoRefreshOptions();
    for (const option of expected) {
      expect(actual, `Missing auto refresh option: ${option}`).toContain(option);
    }
  }
}
