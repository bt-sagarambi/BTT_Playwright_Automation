/**
 * Forces Playwright browsers into a stable user cache so Cursor sandboxes
 * (cursor-sandbox-cache) do not re-download Chromium on every run.
 */
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const stableBrowsersPath = path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright');
const current = process.env.PLAYWRIGHT_BROWSERS_PATH || '';

if (!current || /cursor-sandbox-cache/i.test(current)) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = stableBrowsersPath;
}

const args = process.argv.slice(2);
if (!args.length) {
  console.error('Usage: node scripts/run-playwright.js <playwright-args...>');
  console.error(`PLAYWRIGHT_BROWSERS_PATH=${process.env.PLAYWRIGHT_BROWSERS_PATH}`);
  process.exit(1);
}

console.log(`Using Playwright browsers at: ${process.env.PLAYWRIGHT_BROWSERS_PATH}`);

const result = spawnSync('npx', ['playwright', ...args], {
  stdio: 'inherit',
  env: process.env,
  shell: true,
});

process.exit(result.status ?? 1);
