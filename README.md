# BTT Playwright Automation

Blue Triangle portal Playwright automation framework (POM + Allure).

## Layout

```
BTT_Playwright_Automation/
├── .github/
├── agents/
├── config/                 # env URLs; secrets in env.local.ts (gitignored)
├── pages/
├── locators/
├── tests/
│   ├── api_tests/
│   ├── db_tests/
│   ├── regression_tests/
│   ├── smoke_tests/
│   └── login.spec.ts
├── test-result/
├── allure_reports/
├── scripts/
├── package.json
└── playwright.config.ts
```

## Setup

```bash
npm install
npm run playwright:install
copy config\env.local.example.ts config\env.local.ts
# edit config/env.local.ts with your credentials
```

## Commands

```bash
npm run test:login
npm run test:smoke
npm run allure:generate
npm run allure:open
```

## Profiles (datacenter → site)

Default smoke profile is **US / GDC Test Site 2** (`config/profiles.ts`).

Override with env: `BTT_PROFILE=eu-testsiteeu1`

## Smoke suite (76 TCs)

- 4 chrome: `tests/smoke_tests/nav.chrome.smoke.spec.ts`
- 72 pages: `config/smokeCatalog.ts` → `tests/smoke_tests/portal-pages.smoke.spec.ts`

```bash
npm run test:smoke
npm run test:smoke:pages
```

**Read-only:** never create/edit/save; create-alert / create-report links are blocked.
