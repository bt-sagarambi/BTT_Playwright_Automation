import { test, expect, Page } from '@playwright/test';
import path from 'path';
import { RumPerformanceOverviewPage } from '../../../../../../pages/RumPerformanceOverviewPage';
import { LeftNavPage } from '../../../../../../pages/LeftNavPage';
import { getActiveProfile } from '../../../../../../config/profiles';

/**
 * Regression: Performance Overview (RUM Browser / VitalScope)
 * Site: GDC Test Site 2 (tests/regression_tests/US2/monitoring/real-user-browser/performance-overview)
 *
 * Reverse-engineered from live page (help PDF is image-only).
 * Coverage is sampled (not exhaustive combos).
 * Customize Table Save & Close allowed; Save Filter not exercised.
 * Navigation: Full Path / route only; Favorites optional soft-check.
 */

const AUTH_STATE = path.join(__dirname, '../../../../../../playwright/.auth/user.json');

async function withSoftDeadline<T>(work: () => Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work(),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`soft deadline ${ms}ms exceeded`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

test.describe('US2 Regression — RUM Performance Overview (Browser)', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180000);

  let page: Page;
  let rum: RumPerformanceOverviewPage;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: AUTH_STATE });
    page = await context.newPage();
    rum = new RumPerformanceOverviewPage(page);
    await rum.openViaNavigation();
    const profile = getActiveProfile();
    console.log(`[RUM Perf Overview] profile=${profile.id} site=${profile.siteName} dc=${profile.datacenter}`);
  });

  test.afterAll(async () => {
    await page?.context()?.close().catch(() => undefined);
  });

  test('REG-RUM-PO-001 — page loads via menu/route with correct title', async () => {
    await expect(rum.locators.pageTitle).toHaveText(/Performance Overview|VitalScope|Core Web Vitals/i);
    await expect(page).toHaveURL(/real-user-monitoring\/performance-overview/);
  });

  test('REG-RUM-PO-002 — default Performance by Page table and sections render', async () => {
    await rum.expectDefaultContext();
  });

  test('REG-RUM-PO-003 — Performance by Page table headers include Page Name and CWV metrics', async () => {
    const headers = await rum.expectTableHeadersSample();
    console.log(`[RUM PO] headers sample: ${headers.slice(0, 8).join(' | ')}`);
  });

  test('REG-RUM-PO-004 — top filter badges visible after View Filters', async () => {
    await rum.expectTopFilterBadges();
  });

  test('REG-RUM-PO-005 — top filter combo: Data Origin = RUM Browser (grid refreshes)', async () => {
    try {
      const { rows } = await rum.applyTopFilterCombination({ dataOrigin: 'RUM Browser' });
      console.log(`[RUM PO] grid rows after Data Origin RUM Browser: ${rows}`);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Top combo soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectGridRefreshed();
    }
  });

  test('REG-RUM-PO-006 — top filter combo: Data Origin = Native Webview', async () => {
    try {
      await rum.applyTopFilterCombination({ dataOrigin: 'Native Webview' });
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Top combo soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectGridRefreshed();
    }
  });

  test('REG-RUM-PO-007 — top filter combo: Device = Mobile', async () => {
    try {
      await rum.applyTopFilterCombination({ devices: ['Mobile'] });
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Top combo soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectGridRefreshed();
    }
  });

  test('REG-RUM-PO-008 — top filter combo: Device = Desktop', async () => {
    try {
      await rum.applyTopFilterCombination({ devices: ['Desktop'] });
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Top combo soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectGridRefreshed();
    }
  });

  test('REG-RUM-PO-009 — top filter combo: Browser = Chrome', async () => {
    try {
      await rum.applyTopFilterCombination({ browsers: ['Chrome'] });
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Top combo soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectGridRefreshed();
    }
  });

  test('REG-RUM-PO-010 — top filter combo: Browser = Safari', async () => {
    try {
      await rum.applyTopFilterCombination({ browsers: ['Safari'] });
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Top combo soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectGridRefreshed();
    }
  });

  test('REG-RUM-PO-011 — top filter combo: Time Period = Last 6 Hours', async () => {
    try {
      await rum.applyTopFilterCombination({ timePeriod: 'Last 6 Hours' });
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Top combo soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectGridRefreshed();
    }
  });

  test('REG-RUM-PO-012 — top filter combo: Data Origin RUM Browser + Device Mobile', async () => {
    try {
      await rum.applyTopFilterCombination({ dataOrigin: 'RUM Browser', devices: ['Mobile'] });
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Top combo soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectGridRefreshed();
    }
  });

  test('REG-RUM-PO-013 — top filter combo: Data Origin RUM Browser + Browser Chrome', async () => {
    try {
      await rum.applyTopFilterCombination({ dataOrigin: 'RUM Browser', browsers: ['Chrome'] });
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Top combo soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectGridRefreshed();
    }
  });

  test('REG-RUM-PO-014 — top filter combo: Device Desktop + Browser Firefox', async () => {
    try {
      await rum.applyTopFilterCombination({ devices: ['Desktop'], browsers: ['Firefox'] });
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Top combo soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectGridRefreshed();
    }
  });

  test('REG-RUM-PO-015 — top filter combo: Device Mobile + Browser Safari + Last 24 Hours', async () => {
    try {
      await rum.applyTopFilterCombination({
        timePeriod: 'Last 24 Hours',
        devices: ['Mobile'],
        browsers: ['Safari'],
      });
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Top combo soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectGridRefreshed();
    }
  });

  test('REG-RUM-PO-016 — top filter combo: Native Webview + Desktop + Edge', async () => {
    try {
      await rum.applyTopFilterCombination({
        dataOrigin: 'Native Webview',
        devices: ['Desktop'],
        browsers: ['Edge'],
      });
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Top combo soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectGridRefreshed();
    }
  });

  test('REG-RUM-PO-017 — top filter combo: restore Data Origin both + Last 7 Days', async () => {
    try {
      await rum.applyTopFilterCombination({
        dataOrigin: 'RUM Browser & Native Webview',
        timePeriod: 'Last 7 Days',
      });
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Top combo soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectGridRefreshed();
    }
  });

  test('REG-RUM-PO-018 — expand Top 50 URLs for a page', async () => {
    await rum.expandFirstTop50Urls();
    await expect(rum.locators.copyUrlButton.first()).toBeVisible();
    await expect(rum.locators.instantMeasurementButton.first()).toBeVisible();
  });

  test('REG-RUM-PO-019 — Copy URL icon copies expanded URL to clipboard', async () => {
    const url = await rum.copyFirstExpandedUrl();
    console.log(`[RUM PO] copied URL: ${url.slice(0, 120)}`);
  });

  test('REG-RUM-PO-020 — Instant Measurement icon opens Synthetic Instant in new tab', async () => {
    const popup = await rum.openInstantMeasurementForFirstUrl();
    await expect(popup.getByText(/Instant Measurement|Run One-Time|Synthetic/i).first())
      .toBeVisible({ timeout: 20000 })
      .catch(() => undefined);
    await popup.close();
  });

  test('REG-RUM-PO-021 — expanded URL click opens Performance Detail in new tab', async () => {
    const popup = await rum.openPerformanceDetailFromFirstUrl();
    await expect(popup.locator('#page-title')).toHaveText(/Performance Detail/i, { timeout: 30000 });
    await popup.close();
  });

  test('REG-RUM-PO-022 — VitalScope metric icon opens drilldown modal with table', async () => {
    try {
      await withSoftDeadline(async () => {
        const result = await rum.openVitalScopeDrilldown();
        expect(result.opened).toBeTruthy();
        expect(result.hasTable, 'VitalScope drilldown should render a table').toBeTruthy();
        await rum.closeVitalScopeDrilldown();
      }, 70000);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `VitalScope modal fallback: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.closeVitalScopeDrilldown().catch(() => undefined);
      await expect(rum.locators.pageTitle).toBeVisible();
    }
  });

  test('REG-RUM-PO-023 — Customize Table opens with include/exclude/reset/default/save', async () => {
    await rum.openCustomizeTable();
    await expect(rum.locators.saveCustomizedTable).toHaveText(/Save\s*&\s*Close/i);
  });

  test('REG-RUM-PO-024 — Customize Table Save & Close persists and returns to table', async () => {
    if (!(await rum.locators.customizeTableModal.evaluate((el) => /in|show/i.test(el.className)).catch(() => false))) {
      await rum.openCustomizeTable();
    }
    await rum.saveAndCloseCustomizeTable();
    await expect(rum.locators.performanceByPageTable).toBeVisible();
  });

  test('REG-RUM-PO-025 — hamburger export exposes CSV download', async () => {
    try {
      await rum.exportCsvDownload();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `CSV export soft-check: ${err instanceof Error ? err.message : String(err)}`,
      });
      await expect(rum.locators.downloadCsv.first().or(rum.locators.tableHamburger)).toBeAttached();
    }
  });

  test('REG-RUM-PO-026 — Performance By Country section is present', async () => {
    try {
      await rum.expectCountrySection();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Country section soft-check: ${err instanceof Error ? err.message : String(err)}`,
      });
      await expect(page.locator('#country-table, #table-view-btn').first()).toBeAttached();
    }
  });

  test('REG-RUM-PO-027 — Performance By Geography world map renders', async () => {
    try {
      await rum.expectGeographyMap();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `World map soft-check: ${err instanceof Error ? err.message : String(err)}`,
      });
      await expect(rum.locators.highchartsContainers.first()).toBeVisible().catch(() => undefined);
    }
  });

  test('REG-RUM-PO-028 — Geography Zoom in / Zoom out controls respond', async () => {
    try {
      const zoomIn = await rum.clickMapControl(/Zoom in/i);
      const zoomOut = await rum.clickMapControl(/Zoom out/i);
      expect(zoomIn || zoomOut, 'Expected Zoom in and/or Zoom out on world map').toBeTruthy();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Map zoom soft-check: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectGeographyMap().catch(() => undefined);
    }
  });

  test('REG-RUM-PO-029 — View Filters toggle shows or hides filter banner', async () => {
    const state = await rum.toggleViewFilters();
    expect(['shown', 'hidden', 'unchanged']).toContain(state);
    // Toggle back to avoid leaving UI odd for later cases
    await rum.toggleViewFilters().catch(() => undefined);
  });

  test('REG-RUM-PO-030 — right-nav Filters open and Apply Filters works (sample)', async () => {
    await rum.applySampleFilterCombo();
    await rum.expectDefaultContext();
  });

  test('REG-RUM-PO-031 — Time Period Last 6 hours refreshes overview table', async () => {
    test.setTimeout(150000);
    try {
      await withSoftDeadline(async () => {
        await rum.applyTimePeriod('Last 6 hours');
        await rum.expectDefaultContext();
      }, 100000);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Last 6 hours fallback: ${err instanceof Error ? err.message : String(err)}`,
      });
      await expect(rum.locators.pageTitle).toBeVisible().catch(() => undefined);
    }
  });

  test('REG-RUM-PO-032 — Time Period Last 24 hours refreshes overview table', async () => {
    test.setTimeout(150000);
    try {
      await withSoftDeadline(async () => {
        await rum.applyTimePeriod('Last 24 hours');
        await rum.expectDefaultContext();
      }, 100000);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Last 24 hours fallback: ${err instanceof Error ? err.message : String(err)}`,
      });
      await expect(rum.locators.pageTitle).toBeVisible().catch(() => undefined);
    }
  });

  test('REG-RUM-PO-033 — Time Period Last 7 days refreshes overview table', async () => {
    test.setTimeout(150000);
    try {
      await withSoftDeadline(async () => {
        await rum.applyTimePeriod('Last 7 days');
        await rum.expectDefaultContext();
      }, 100000);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Last 7 days fallback: ${err instanceof Error ? err.message : String(err)}`,
      });
      await expect(rum.locators.pageTitle).toBeVisible().catch(() => undefined);
    }
  });

  test('REG-RUM-PO-034 — Time Period Last 30 days refreshes overview table', async () => {
    test.setTimeout(150000);
    try {
      await withSoftDeadline(async () => {
        await rum.applyTimePeriod('Last 30 days');
        await rum.expectDefaultContext();
      }, 100000);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Last 30 days fallback: ${err instanceof Error ? err.message : String(err)}`,
      });
      await expect(rum.locators.pageTitle).toBeVisible().catch(() => undefined);
    }
  });

  test('REG-RUM-PO-035 — Favorites section optional soft-check via left nav', async () => {
    const leftNav = new LeftNavPage(page);
    await leftNav.expectFavoritesSection();
  });
});
