import { Page, expect } from '@playwright/test';
import { config, environments } from '../config/env';
import { LoginPageLocators } from '../locators/LoginPageLocators';

export class LoginPage {
  readonly locators: LoginPageLocators;

  constructor(private readonly page: Page) {
    this.locators = new LoginPageLocators(page);
  }

  async goto(): Promise<void> {
    await this.page.goto(config.baseURL, { waitUntil: 'domcontentloaded' });
    await expect(this.locators.loginForm).toBeVisible({ timeout: 30000 });
  }

  async enterUsername(username: string): Promise<void> {
    await expect(this.locators.usernameInput).toBeVisible();
    await this.locators.usernameInput.fill(username);
  }

  async enterPassword(password: string): Promise<void> {
    await expect(this.locators.passwordInput).toBeVisible();
    await this.locators.passwordInput.fill(password);
  }

  async clickSignIn(): Promise<void> {
    await expect(this.locators.signInButton).toBeVisible();
    await this.locators.signInButton.click();
  }

  async login(username: string, password: string): Promise<void> {
    await this.enterUsername(username);
    await this.enterPassword(password);
    await this.clickSignIn();
  }

  /** Uses stage username/password from config/env.ts */
  async loginAsStageUser(): Promise<void> {
    const { username, password } = environments.stage;
    await this.login(username, password);
  }

  async waitForLoginSuccess(): Promise<void> {
    await this.page.waitForURL(
      (url) => !url.toString().includes('site%2Flogin') && !url.toString().includes('site/login'),
      { timeout: 30000 }
    );
    await this.page.waitForLoadState('domcontentloaded');
  }

  async isLoginFormVisible(): Promise<boolean> {
    return (await this.locators.loginForm.count()) > 0;
  }
}
