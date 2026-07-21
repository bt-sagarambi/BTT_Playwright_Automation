# BlueTriangle Automation

Playwright framework layout (canonical order):

```
BlueTriangle_Automation/
├── 1.  .github/
├── 2.  node_modules/
├── 3.  playwright-report/
├── 4.  agents/
├── 5.  config/
├── 6.  pages/
├── 7.  locators/
├── 8.  tests/
│       ├── api_tests/
│       ├── db_tests/
│       ├── regression_tests/
│       ├── smoke_tests/
│       ├── example.spec.ts
│       └── login.spec.ts
├── 9.  test-result/
│       ├── api_tests/
│       ├── db_tests/
│       ├── regression_tests/
│       └── smoke_tests/
├── 10. allure_reports/
├── .gitignore
├── package.json
├── package-lock.json
└── playwright.config.ts
```

| # | Folder | Purpose |
|---|--------|---------|
| 1 | `.github` | CI workflows |
| 2 | `node_modules` | npm dependencies |
| 3 | `playwright-report` | Playwright HTML report |
| 4 | `agents` | AI agent configs / prompts |
| 5 | `config` | Environment URLs and credentials |
| 6 | `pages` | Page Object classes |
| 7 | `locators` | Page locator classes |
| 8 | `tests` | Test specs |
|   | `tests/smoke_tests` | Smoke test specs |
|   | `tests/api_tests` | API test specs |
|   | `tests/db_tests` | Database test specs |
|   | `tests/regression_tests` | Regression test specs |
| 9 | `test-result` | Playwright test artifacts |
|   | `test-result/smoke_tests` | Smoke test artifacts |
|   | `test-result/api_tests` | API test artifacts |
|   | `test-result/db_tests` | DB test artifacts |
|   | `test-result/regression_tests` | Regression test artifacts |
| 10 | `allure_reports` | Allure results and generated report |

## Commands

```bash
npm run playwright:install   # one-time (also runs on npm install)
npm run test:login
npm run test:smoke
npm run allure:generate
npm run allure:open
```

Browsers are stored under `%USERPROFILE%\AppData\Local\ms-playwright` so Cursor sandboxes do not re-download Chromium every run.

Switch environment in `config/env.ts` (`activeEnvironment`).
