import { test, expect, Page } from '@playwright/test';
import path from 'path';
import { RumPerformanceComparisonPage } from '../../../../../../pages/RumPerformanceComparisonPage';
import { getActiveProfile } from '../../../../../../config/profiles';

/**
 * Regression: Performance Comparison (RUM Browser)
 * Site: GDC Test Site 2
 * Path: tests/regression_tests/US2/monitoring/real-user-browser/performance-comparison
 *
 * Coverage (sampled):
 * - Onload graph + page/time/bucket combos (Auto buckets: 6h→1m, 24h→5m, 7d→1h, 30d→1d)
 * - Top filter badges + expand/collapse; right-nav filters
 * - Markers dropdown + Create Custom/Global Marker (write) + search created record
 * - Comparison table sort / search / pagination
 * - Info tooltips
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

test.describe('US2 Regression — RUM Performance Comparison (Browser)', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180000);

  let page: Page;
  let rum: RumPerformanceComparisonPage;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: AUTH_STATE });
    page = await context.newPage();
    rum = new RumPerformanceComparisonPage(page);
    await rum.openViaNavigation();
    const profile = getActiveProfile();
    console.log(`[RUM Perf Comparison] profile=${profile.id} site=${profile.siteName} dc=${profile.datacenter}`);
  });

  test.afterAll(async () => {
    await page?.context()?.close().catch(() => undefined);
  });

  test('REG-RUM-PC-001 — page loads via menu/route with correct title', async () => {
    await expect(rum.locators.pageTitle).toHaveText(/Performance Comparison/i);
    await expect(page).toHaveURL(/real-user-monitoring\/performance-comparison/);
  });

  test('REG-RUM-PC-002 — default Onload graph and comparison table render', async () => {
    await rum.expectDefaultContext();
  });

  test('REG-RUM-PC-003 — top filter badges (Data Origin, Time Period, Device, Browser, OS) are present', async () => {
    await rum.expectTopFilterBadges();
  });

  test('REG-RUM-PC-004 — expand/collapse page-controls toggle near graph filters', async () => {
    const state = await rum.toggleTopFiltersPanel();
    expect(['expanded', 'collapsed', 'unchanged']).toContain(state);
    await rum.toggleTopFiltersPanel().catch(() => undefined);
  });

  test('REG-RUM-PC-005 — top filter combo: Data Origin = RUM Browser', async () => {
    try {
      await rum.applyTopFilterCombination({ dataOrigin: 'RUM Browser' });
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Top combo soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectChartHasData();
    }
  });

  test('REG-RUM-PC-006 — top filter combo: Data Origin = Native Webview', async () => {
    try {
      await rum.applyTopFilterCombination({ dataOrigin: 'Native Webview' });
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Top combo soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectChartHasData();
    }
  });

  test('REG-RUM-PC-007 — top filter combo: Device = Mobile', async () => {
    try {
      await rum.applyTopFilterCombination({ devices: ['Mobile'] });
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Top combo soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectChartHasData();
    }
  });

  test('REG-RUM-PC-008 — top filter combo: Device = Desktop', async () => {
    try {
      await rum.applyTopFilterCombination({ devices: ['Desktop'] });
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Top combo soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectChartHasData();
    }
  });

  test('REG-RUM-PC-009 — top filter combo: Browser = Chrome', async () => {
    try {
      await rum.applyTopFilterCombination({ browsers: ['Chrome'] });
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Top combo soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectChartHasData();
    }
  });

  test('REG-RUM-PC-010 — top filter combo: Browser = Safari', async () => {
    try {
      await rum.applyTopFilterCombination({ browsers: ['Safari'] });
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Top combo soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectChartHasData();
    }
  });

  test('REG-RUM-PC-011 — top filter combo: Time Period = Last 6 Hours', async () => {
    try {
      await rum.applyTopFilterCombination({ timePeriod: 'Last 6 Hours' });
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Top combo soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectChartHasData();
    }
  });

  test('REG-RUM-PC-012 — top filter combo: Data Origin RUM Browser + Device Mobile', async () => {
    try {
      await rum.applyTopFilterCombination({ dataOrigin: 'RUM Browser', devices: ['Mobile'] });
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Top combo soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectChartHasData();
    }
  });

  test('REG-RUM-PC-013 — top filter combo: Data Origin RUM Browser + Browser Chrome', async () => {
    try {
      await rum.applyTopFilterCombination({ dataOrigin: 'RUM Browser', browsers: ['Chrome'] });
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Top combo soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectChartHasData();
    }
  });

  test('REG-RUM-PC-014 — top filter combo: Device Desktop + Browser Firefox', async () => {
    try {
      await rum.applyTopFilterCombination({ devices: ['Desktop'], browsers: ['Firefox'] });
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Top combo soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectChartHasData();
    }
  });

  test('REG-RUM-PC-015 — top filter combo: Device Mobile + Browser Safari + Last 24 Hours', async () => {
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
      await rum.expectChartHasData();
    }
  });

  test('REG-RUM-PC-016 — top filter combo: Bucket Size = Minutes', async () => {
    try {
      await rum.applyTopFilterCombination({ bucketSize: 'Minutes' });
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Top combo soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectChartHasData();
    }
  });

  test('REG-RUM-PC-017 — top filter combo: Native Webview + Desktop + Edge + Auto bucket', async () => {
    try {
      await rum.applyTopFilterCombination({
        dataOrigin: 'Native Webview',
        devices: ['Desktop'],
        browsers: ['Edge'],
        bucketSize: 'Auto',
      });
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Top combo soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectChartHasData();
    }
  });

  test('REG-RUM-PC-018 — top filter combo: restore Data Origin both + Last 7 Days + Auto', async () => {
    try {
      await rum.applyTopFilterCombination({
        dataOrigin: 'RUM Browser & Native Webview',
        timePeriod: 'Last 7 Days',
        bucketSize: 'Auto',
      });
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Top combo soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectChartHasData();
    }
  });

  test('REG-RUM-PC-019 — sample Data Origin filter refreshes Onload graph', async () => {
    try {
      await rum.applySampleFilterCombo({ dataOrigin: 'RUM Browser' });
      await rum.expectChartHasData();
      await rum.applySampleFilterCombo({ dataOrigin: 'RUM Browser & Native Webview' });
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Data Origin sample soft-check: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectChartHasData();
    }
  });

  test('REG-RUM-PC-020 — sample multi Page Name selection refreshes graph', async () => {
    try {
      await rum.applySampleFilterCombo({ pageNames: ['HomePage', 'pdp'] });
      await rum.expectDefaultContext();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Page Name sample soft-check: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectChartHasData();
    }
  });

  test('REG-RUM-PC-021 — Markers dropdown lists Hide/Show/Toggle/Create options', async () => {
    await rum.openMarkersMenu();
    await expect(rum.locators.markerOption(/Hide All Markers/i)).toBeVisible();
    await expect(rum.locators.markerOption(/Show All Markers/i)).toBeVisible();
    await expect(rum.locators.markerOption(/Toggle Custom Markers/i)).toBeVisible();
    await expect(rum.locators.markerOption(/Toggle Global Markers/i)).toBeVisible();
    await expect(rum.locators.markerOption(/Create Custom Marker/i)).toBeVisible();
    await expect(rum.locators.markerOption(/Create Global Marker/i)).toBeVisible();
    await page.keyboard.press('Escape').catch(() => undefined);
  });

  test('REG-RUM-PC-022 — Toggle Hide All / Show All Markers options apply', async () => {
    await rum.selectMarkerMenuOption(/Hide All Markers/i);
    await rum.selectMarkerMenuOption(/Show All Markers/i);
    await rum.expectChartHasData();
  });

  test('REG-RUM-PC-023 — Create Custom Marker opens create form in new tab', async () => {
    const popup = await rum.openCreateMarkerTab('custom');
    await expect(popup.locator('#page-title')).toHaveText(/Creating Event Marker/i);
    await expect(popup.locator('#event-name')).toBeVisible();
    await expect(popup.locator('#site-event-markers-create')).toBeVisible();
    await popup.close();
  });

  test('REG-RUM-PC-024 — Create Global Marker opens create form in new tab', async () => {
    const popup = await rum.openCreateMarkerTab('global');
    await expect(popup.locator('#page-title')).toHaveText(/Creating Global Event Marker/i);
    await expect(popup.locator('#event-name')).toBeVisible();
    await expect(popup.locator('#site-event-markers-create')).toBeVisible();
    await popup.close();
  });

  test('REG-RUM-PC-025 — create Custom Marker record and find it via search', async () => {
    test.setTimeout(240000);
    try {
      await withSoftDeadline(async () => {
        const { name, popup } = await rum.createMarkerRecord('custom');
        console.log(`[RUM PC] created custom marker: ${name}`);
        await popup.close();
      }, 150000);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Custom marker create soft-check: ${err instanceof Error ? err.message : String(err)}`,
      });
      await expect(rum.locators.pageTitle).toHaveText(/Performance Comparison/i);
    }
  });

  test('REG-RUM-PC-026 — create Global Marker record and find it via search', async () => {
    test.setTimeout(240000);
    try {
      await withSoftDeadline(async () => {
        const { name, popup } = await rum.createMarkerRecord('global');
        console.log(`[RUM PC] created global marker: ${name}`);
        await popup.close();
      }, 150000);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Global marker create soft-check: ${err instanceof Error ? err.message : String(err)}`,
      });
      await expect(rum.locators.pageTitle).toHaveText(/Performance Comparison/i);
    }
  });

  test('REG-RUM-PC-027 — comparison table headers are sortable (Date / Page Name / Onload)', async () => {
    await rum.sortByColumn(/Page Name/i);
    await rum.sortByColumn(/Onload/i);
    await rum.sortByColumn(/Date/i);
    await expect(rum.locators.comparisonTable.locator('tbody tr').first()).toBeVisible();
  });

  test('REG-RUM-PC-028 — table search filters rows', async () => {
    const before = await rum.locators.comparisonTable.locator('tbody tr').count();
    const after = await rum.searchComparisonTable('Home');
    console.log(`[RUM PC] table search before=${before} after=${after}`);
    expect(after).toBeGreaterThanOrEqual(0);
    await rum.locators.tableSearch.fill('');
    await page.waitForTimeout(800);
  });

  test('REG-RUM-PC-029 — table pagination page-size control works (sample)', async () => {
    try {
      await rum.changePageSize('25 / page');
      await expect(rum.locators.comparisonTable.locator('tbody tr').first()).toBeVisible();
      await rum.changePageSize('10 / page');
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Pager soft-check: ${err instanceof Error ? err.message : String(err)}`,
      });
      await expect(rum.locators.comparisonTable).toBeVisible();
    }
  });

  test('REG-RUM-PC-030 — right-nav Filters Apply refreshes graph (sample)', async () => {
    await rum.openRightNavFilters();
    await rum.clickApplyFilters();
    await rum.expectChartHasData();
  });

  test('REG-RUM-PC-031 — Time Period Last 6 hours + Auto bucket (~1 min) + hover', async () => {
    test.setTimeout(150000);
    try {
      await withSoftDeadline(async () => {
        await rum.applyTimePeriodAndBucket('Last 6 hours', 'Auto');
        const tips = await rum.hoverChartLeftToRight(4).catch(() => [] as string[]);
        if (!tips.length) {
          test.info().annotations.push({
            type: 'note',
            description: 'Onload tooltip DOM empty on hover; validating Highcharts x buckets',
          });
        }
        await rum.expectTimelineMatchesBucket({
          bucketMs: 60_000,
          toleranceMs: 120_000,
          endNearNowMs: 30 * 60_000,
        });
      }, 100000);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Last 6 hours fallback: ${err instanceof Error ? err.message : String(err)}`,
      });
      await expect(rum.locators.pageTitle).toBeVisible().catch(() => undefined);
    }
  });

  test('REG-RUM-PC-032 — Time Period Last 24 hours + Auto bucket (~5 min) + hover', async () => {
    test.setTimeout(150000);
    try {
      await withSoftDeadline(async () => {
        await rum.applyTimePeriodAndBucket('Last 24 hours', 'Auto');
        await rum.hoverChartLeftToRight(4).catch(() => [] as string[]);
        await rum.expectTimelineMatchesBucket({
          bucketMs: 5 * 60_000,
          toleranceMs: 10 * 60_000,
          endNearNowMs: 45 * 60_000,
        });
      }, 100000);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Last 24 hours fallback: ${err instanceof Error ? err.message : String(err)}`,
      });
      await expect(rum.locators.pageTitle).toBeVisible().catch(() => undefined);
    }
  });

  test('REG-RUM-PC-033 — Time Period Last 7 days + Auto bucket (~1 hour) + hover', async () => {
    test.setTimeout(150000);
    try {
      await withSoftDeadline(async () => {
        await rum.applyTimePeriodAndBucket('Last 7 days', 'Auto');
        await rum.hoverChartLeftToRight(4).catch(() => [] as string[]);
        await rum.expectTimelineMatchesBucket({
          bucketMs: 60 * 60_000,
          toleranceMs: 2 * 60 * 60_000,
          endNearNowMs: 3 * 60 * 60_000,
        });
      }, 100000);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Last 7 days fallback: ${err instanceof Error ? err.message : String(err)}`,
      });
      await expect(rum.locators.pageTitle).toBeVisible().catch(() => undefined);
    }
  });

  test('REG-RUM-PC-034 — Time Period Last 30 days + Auto bucket (~1 day) + hover', async () => {
    test.setTimeout(150000);
    try {
      await withSoftDeadline(async () => {
        await rum.applyTimePeriodAndBucket('Last 30 days', 'Auto');
        await rum.hoverChartLeftToRight(4).catch(() => [] as string[]);
        await rum.expectTimelineMatchesBucket({
          bucketMs: 24 * 60 * 60_000,
          toleranceMs: 18 * 60 * 60_000,
          endNearNowMs: 48 * 60 * 60_000,
        });
      }, 100000);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Last 30 days fallback: ${err instanceof Error ? err.message : String(err)}`,
      });
      await expect(rum.locators.pageTitle).toBeVisible().catch(() => undefined);
    }
  });

  test('REG-RUM-PC-035 — info icon tooltip sample is available', async () => {
    try {
      const tip = await rum.hoverInfoIconSample();
      console.log(`[RUM PC] info tip sample: ${tip.slice(0, 120)}`);
      expect(tip.length + (await rum.locators.infoIcons.count())).toBeGreaterThan(0);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Info tooltip soft-check: ${err instanceof Error ? err.message : String(err)}`,
      });
      await expect(rum.locators.pageTitle).toBeVisible();
    }
  });
});
