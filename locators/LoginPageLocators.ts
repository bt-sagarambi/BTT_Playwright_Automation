import { Page, Locator } from '@playwright/test';

export class LoginPageLocators {
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;
  readonly loginForm: Locator;
  readonly forgotPasswordLink: Locator;

  constructor(page: Page) {
    this.loginForm = page.locator('#login-form');
    this.usernameInput = page.locator('#loginform-username');
    this.passwordInput = page.locator('#loginform-password');
    this.signInButton = page.getByRole('button', { name: 'Sign In' });
    this.forgotPasswordLink = page.getByRole('link', { name: /forgot password/i });
  }
}
