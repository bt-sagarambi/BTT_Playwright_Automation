import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

test('Blue Triangle portal login with stage credentials', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await loginPage.goto();
  await loginPage.loginAsStageUser();
  await loginPage.waitForLoginSuccess();

  await expect(page).not.toHaveURL(/site\/login|site%2Flogin/i);
  expect(await loginPage.isLoginFormVisible()).toBe(false);
});
