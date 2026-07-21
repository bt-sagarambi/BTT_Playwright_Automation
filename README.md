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

Browsers are cached under `%USERPROFILE%\AppData\Local\ms-playwright`.

Switch environment defaults in `config/env.ts`; put credentials only in `config/env.local.ts`.
