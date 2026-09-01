@echo off
setlocal
cd /d "%~dp0.."
set ALLURE_RESULTS_DIR=allure_reports/ras-uat-results
set SPEC=tests/regression_tests/US2/business-insights/improve-revenue/revenue-assurance/revenue.assurance.regression.spec.ts
node scripts/run-playwright.js test %SPEC% --project=chromium-regression --headed --workers=1 --timeout=240000 --grep "REG-RAS-026"
exit /b %ERRORLEVEL%
