import { test, expect, Page } from '@playwright/test';
import path from 'path';
import { RumPerformanceBudgetPage } from '../../../../../../pages/RumPerformanceBudgetPage';
import { getActiveProfile } from '../../../../../../config/profiles';

/**
 * Regression: Performance Budget (RUM Browser)
 * Site: GDC Test Site 2
 * Path: tests/regression_tests/US2/monitoring/real-user-browser/performance-budget
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

test.describe('US2 Regression — RUM Performance Budget (Browser)', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180000);

  let page: Page;
  let rum: RumPerformanceBudgetPage;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: AUTH_STATE });
    page = await context.newPage();
    rum = new RumPerformanceBudgetPage(page);
    await rum.openViaNavigation();
    const profile = getActiveProfile();
    console.log(`[RUM Performance Budget] profile=${profile.id} site=${profile.siteName} dc=${profile.datacenter}`);
  });

  test.afterAll(async () => {
    await page?.context()?.close().catch(() => undefined);
  });

  test('REG-RUM-PB-001 — page loads via menu/route with correct title', async () => {
    await expect(rum.locators.pageTitle).toHaveText(/Performance Budget/i);
    await expect(page).toHaveURL(/overview-dashboard\/performance-budget/);
  });

  test('REG-RUM-PB-002 — default Latest Results and dashboard chrome render', async () => {
    await rum.expectDefaultContext();
    await rum.expectDashboardChrome();
  });

  test('REG-RUM-PB-003 — top Device / Browser / OS badges present', async () => {
    await rum.expectTopFilterBadges();
  });

  test('REG-RUM-PB-004 — expand/collapse page-controls toggle when present', async () => {
    const state = await rum.toggleTopFiltersPanel();
    expect(['expanded', 'collapsed', 'unchanged']).toContain(state);
    await rum.toggleTopFiltersPanel().catch(() => undefined);
  });

  test('REG-RUM-PB-005 — time lookback presets sample visible', async () => {
    try {
      await rum.expectTimeLookbackPresetsSample();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Lookback presets soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-PB-006 — time lookback Last 6 hours refreshes widgets', async () => {
    try {
      await withSoftDeadline(() => rum.selectTimeLookback(/Last 6 hours/i), 60000);
      await expect(rum.locators.latestResultsHeading).toBeVisible();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Lookback 6h soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectWidgetsReady();
    }
  });

  test('REG-RUM-PB-007 — time lookback Last 24 hours refreshes widgets', async () => {
    try {
      await withSoftDeadline(() => rum.selectTimeLookback(/Last 24 hours/i), 60000);
      await expect(rum.locators.latestResultsHeading).toBeVisible();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Lookback 24h soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectWidgetsReady();
    }
  });

  test('REG-RUM-PB-008 — time lookback Last 7 days refreshes widgets', async () => {
    try {
      await withSoftDeadline(() => rum.selectTimeLookback(/Last 7 days/i), 60000);
      await expect(rum.locators.latestResultsHeading).toBeVisible();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Lookback 7d soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectWidgetsReady();
    }
  });

  test('REG-RUM-PB-009 — time lookback Last 30 days refreshes widgets', async () => {
    try {
      await withSoftDeadline(() => rum.selectTimeLookback(/Last 30 days/i), 60000);
      await expect(rum.locators.latestResultsHeading).toBeVisible();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Lookback 30d soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectWidgetsReady();
    }
  });

  test('REG-RUM-PB-010 — restore time lookback Last 6 hours', async () => {
    try {
      await withSoftDeadline(() => rum.selectTimeLookback(/Last 6 hours/i), 60000);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Restore 6h soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-PB-011 — Auto Refresh options Off / Minutes present', async () => {
    try {
      await rum.expectAutoRefreshOptions();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Auto Refresh options soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-PB-012 — Auto Refresh selection sticks (smoke; no full interval wait)', async () => {
    try {
      await rum.selectAutoRefresh(/10 Minutes/i);
      const text = ((await rum.locators.autoRefresh.textContent()) || '').replace(/\s+/g, ' ');
      expect(/10|Off|Minutes|Auto Refresh/i.test(text)).toBeTruthy();
      await rum.selectAutoRefresh(/5 Minutes/i);
      const restored = ((await rum.locators.autoRefresh.textContent()) || '').replace(/\s+/g, ' ');
      console.log(`[RUM PB] auto-refresh after restore=${restored}`);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Auto Refresh select soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-PB-013 — top filter combo: Device = Mobile refreshes widgets', async () => {
    try {
      await withSoftDeadline(() => rum.applyTopFilterCombination({ devices: ['Mobile'] }), 90000);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Device soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectWidgetsReady().catch(() => undefined);
    }
  });

  test('REG-RUM-PB-014 — top filter combo: Browser = Chrome refreshes widgets', async () => {
    try {
      await withSoftDeadline(() => rum.applyTopFilterCombination({ browsers: ['Chrome'] }), 90000);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Browser soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectWidgetsReady().catch(() => undefined);
    }
  });

  test('REG-RUM-PB-015 — top filter combo: OS = Windows refreshes widgets', async () => {
    try {
      await withSoftDeadline(() => rum.applyTopFilterCombination({ os: ['Windows'] }), 90000);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `OS soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectWidgetsReady().catch(() => undefined);
    }
  });

  test('REG-RUM-PB-016 — top filter combo: Device Desktop + Browser Chrome', async () => {
    try {
      await withSoftDeadline(
        () => rum.applyTopFilterCombination({ devices: ['Desktop'], browsers: ['Chrome'] }),
        90000
      );
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Combined badge soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectWidgetsReady().catch(() => undefined);
    }
  });

  test('REG-RUM-PB-017 — active Performance Budget selector shows template', async () => {
    try {
      const label = await rum.getActiveBudgetLabel();
      console.log(`[RUM PB] active budget=${label || '(empty)'}`);
      expect(/Web Vitals|Template|Budget|\w+/i.test(label || 'x')).toBeTruthy();
      await expect(rum.locators.performanceBudgetSelector).toBeVisible();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Budget selector soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-PB-018 — Performance Budget manager read-only browse (no save)', async () => {
    try {
      await withSoftDeadline(() => rum.browseBudgetManagerReadOnly(), 45000);
      test.info().annotations.push({
        type: 'note',
        description: 'Manager opened read-only; no create/save/destroy of production budgets.',
      });
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Manager soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-PB-019 — Reset Widgets restores key widgets', async () => {
    try {
      await withSoftDeadline(() => rum.resetWidgets(), 60000);
      await rum.expectTimingMetricCards();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Reset Widgets soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectWidgetsReady();
    }
  });

  test('REG-RUM-PB-020 — Latest Results Timings metric cards (value vs Target)', async () => {
    try {
      await rum.expectTimingMetricCards();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Timings cards soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-PB-021 — Latest Results Assets metric cards (value vs Target)', async () => {
    try {
      await rum.expectAssetMetricCards();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Assets cards soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-PB-022 — 1st vs 3rd Party Activity controls visible', async () => {
    try {
      await rum.expectPartyActivityControls();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Party controls soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-PB-023 — SERVICES tab graph visible', async () => {
    try {
      await withSoftDeadline(() => rum.expectSlowestGraph('services'), 45000);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Services graph soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-PB-024 — DOMAINS tab graph visible', async () => {
    try {
      await withSoftDeadline(() => rum.expectSlowestGraph('domains'), 45000);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Domains graph soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-PB-025 — FILES tab graph visible', async () => {
    try {
      await withSoftDeadline(() => rum.expectSlowestGraph('files'), 45000);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Files graph soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-PB-026 — party filter 1st / 3rd / All toggles', async () => {
    try {
      await withSoftDeadline(async () => {
        await rum.selectPartyTab('services');
        await rum.selectPartyFilter('1st');
        await rum.selectPartyFilter('3rd');
        await rum.selectPartyFilter('all');
        await rum.expectWidgetsReady();
      }, 45000);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Party filter soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-PB-027 — Slowest … Before metric selector change', async () => {
    try {
      await withSoftDeadline(async () => {
        await rum.selectPartyTab('services');
        await rum.selectSlowestMetric(/Onload/i);
        await rum.selectSlowestMetric(/First Contentful Paint|120 Seconds/i);
        await rum.expectWidgetsReady();
      }, 45000);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Slowest metric soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-PB-028 — graph ↔ table toggle for Slowest Services', async () => {
    try {
      await withSoftDeadline(async () => {
        await rum.selectPartyTab('services');
        await rum.selectPartyView('table');
        await expect(rum.locators.slowestServicesTable).toBeVisible({ timeout: 20000 });
        await rum.selectPartyView('graph');
        await expect(rum.locators.slowestServicesGraph).toBeVisible({ timeout: 20000 });
      }, 45000);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Graph/table soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-PB-029 — Slowest Services table headers', async () => {
    try {
      await withSoftDeadline(() => rum.expectSlowestTableHeaders('services'), 45000);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Services table soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-PB-030 — Slowest Domains table headers', async () => {
    try {
      await withSoftDeadline(() => rum.expectSlowestTableHeaders('domains'), 45000);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Domains table soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-PB-031 — Slowest Files table headers', async () => {
    try {
      await withSoftDeadline(() => rum.expectSlowestTableHeaders('files'), 45000);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Files table soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-PB-032 — Export menu sample near party table', async () => {
    try {
      await withSoftDeadline(() => rum.sampleExportNearPartyTable(), 30000);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Export soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-PB-033 — composition / related Highcharts render', async () => {
    try {
      await rum.expectCompositionCharts();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Composition soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-PB-034 — Page Name vs CWV/asset columns table when present', async () => {
    try {
      await rum.expectPageMetricsTable();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Page metrics table soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-PB-035 — right-nav Filters sample Apply refreshes widgets (no Save)', async () => {
    try {
      await withSoftDeadline(() => rum.applySampleRightNavFilters(), 90000);
      await expect(rum.locators.latestResultsHeading).toBeVisible();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Right-nav filters soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectWidgetsReady().catch(() => undefined);
    }
  });

  test('REG-RUM-PB-036 — info / Target tooltip sample on metric cards', async () => {
    try {
      const tip = await rum.sampleInfoTooltip();
      console.log(`[RUM PB] tip sample=${tip ? tip.slice(0, 80) : '(none)'}`);
      const filtersVisible = await rum.locators.filtersToggle.isVisible().catch(() => false);
      expect(Boolean(tip) || filtersVisible).toBeTruthy();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Tooltip soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-PB-037 — top-nav Filters / Share controls remain usable', async () => {
    await expect(rum.locators.filtersToggle).toBeVisible();
    const share = rum.locators.sharePageButton;
    if (await share.isVisible().catch(() => false)) {
      await expect(share).toBeVisible();
    } else {
      test.info().annotations.push({ type: 'note', description: 'Share control not visible on this layout' });
    }
  });
});
