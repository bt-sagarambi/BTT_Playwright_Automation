@echo off
setlocal
cd /d "%~dp0.."
set ALLURE_RESULTS_DIR=allure_reports/ras-uat-results
set SPEC=tests/regression_tests/US2/business-insights/improve-revenue/revenue-assurance/revenue.assurance.regression.spec.ts
set ARGS=--project=chromium-regression --headed --workers=1 --timeout=240000

for %%T in (027 028 029 030 031 032 033 034 035 036) do (
  echo ===== REG-RAS-%%T =====
  node scripts/run-playwright.js test %SPEC% %ARGS% --grep "REG-RAS-%%T"
  if errorlevel 1 exit /b 1
)
exit /b 0
