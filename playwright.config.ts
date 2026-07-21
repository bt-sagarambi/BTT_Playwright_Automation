import path from 'path';
import os from 'os';
import { defineConfig, devices } from '@playwright/test';
import { config } from './config/env';

/**
 * Keep browsers in a stable user cache. Cursor agent shells otherwise point
 * PLAYWRIGHT_BROWSERS_PATH at a temp sandbox folder and force re-downloads.
 */
const stableBrowsersPath = path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright');
const currentBrowsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH || '';
if (!currentBrowsersPath || /cursor-sandbox-cache/i.test(currentBrowsersPath)) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = stableBrowsersPath;
}

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  outputDir: './test-result',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['allure-playwright', { resultsDir: 'allure_reports/allure-results' }],
  ],
  use: {
    baseURL: config.baseURL,
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
