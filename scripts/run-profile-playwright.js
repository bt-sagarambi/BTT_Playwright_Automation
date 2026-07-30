/**
 * Run Playwright with a named BTT profile without changing the global default.
 * Usage: node scripts/run-profile-playwright.js <profile-id> <playwright-args...>
 */
const path = require('path');
const { spawnSync } = require('child_process');

const [profile, ...args] = process.argv.slice(2);
if (!profile || !args.length) {
  console.error(
    'Usage: node scripts/run-profile-playwright.js <profile-id> <playwright-args...>'
  );
  process.exit(1);
}

const result = spawnSync(process.execPath, [path.join(__dirname, 'run-playwright.js'), ...args], {
  stdio: 'inherit',
  env: { ...process.env, BTT_PROFILE: profile },
});

process.exit(result.status ?? 1);
