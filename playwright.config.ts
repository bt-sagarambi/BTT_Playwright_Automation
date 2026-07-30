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

const authFile = path.join(__dirname, 'playwright/.auth/user.json');
const allureResultsDir = process.env.ALLURE_RESULTS_DIR || 'allure_reports/allure-results';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  outputDir: './test-result',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Local: 2 parallel workers; CI stays single-worker for stability
  workers: process.env.CI ? 1 : 2,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['allure-playwright', { resultsDir: allureResultsDir }],
    ['./reporters/jiraFailureReporter.ts'],
  ],
  use: {
    baseURL: config.baseURL,
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'smoke-setup',
      testMatch: /smoke_tests\/auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium-smoke',
      testMatch: /smoke_tests\/.*\.spec\.ts/,
      dependencies: ['smoke-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: authFile,
      },
    },
    {
      name: 'chromium-regression',
      testMatch: /regression_tests\/.*\.spec\.ts/,
      dependencies: ['smoke-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: authFile,
      },
    },
    {
      name: 'chromium',
      testIgnore: /(smoke_tests\/|regression_tests\/)/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      testIgnore: /(smoke_tests\/|regression_tests\/)/,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testIgnore: /(smoke_tests\/|regression_tests\/)/,
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
