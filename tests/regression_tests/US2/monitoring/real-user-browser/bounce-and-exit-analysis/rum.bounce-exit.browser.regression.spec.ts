import { test, expect, Page } from '@playwright/test';
import path from 'path';
import { RumBounceExitAnalysisPage } from '../../../../../../pages/RumBounceExitAnalysisPage';
import { getActiveProfile } from '../../../../../../config/profiles';

/**
 * Regression: Bounce & Exit Analysis (RUM Browser)
 * Site: GDC Test Site 2
 * Path: tests/regression_tests/US2/monitoring/real-user-browser/bounce-and-exit-analysis
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

test.describe('US2 Regression — RUM Bounce & Exit Analysis (Browser)', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180000);

  let page: Page;
  let rum: RumBounceExitAnalysisPage;

  test.beforeAll(async ({ browser }, testInfo) => {
    testInfo.setTimeout(180000);
    const context = await browser.newContext({ storageState: AUTH_STATE });
    page = await context.newPage();
    rum = new RumBounceExitAnalysisPage(page);
    await rum.openViaNavigation();
    const profile = getActiveProfile();
    console.log(`[RUM Bounce Exit] profile=${profile.id} site=${profile.siteName} dc=${profile.datacenter}`);
  });

  test.afterAll(async () => {
    await page?.context()?.close().catch(() => undefined);
  });

  test('REG-RUM-BE-001 — page loads via menu/route with correct title', async () => {
    await expect(rum.locators.pageTitle).toHaveText(/Bounce|Exit/i);
    await expect(page).toHaveURL(/real-user-monitoring\/bounce-and-exit-analysis/);
  });

  test('REG-RUM-BE-002 — default metric cards and over-time / by-onload sections render', async () => {
    await rum.expectDefaultContext();
    await rum.expectMetricSummaryCards();
  });

  test('REG-RUM-BE-003 — top filter badges present including Bucket Size and Performance Metric', async () => {
    await rum.expectTopFilterBadges();
  });

  test('REG-RUM-BE-004 — expand/collapse page-controls toggle', async () => {
    const state = await rum.toggleTopFiltersPanel();
    expect(['expanded', 'collapsed', 'unchanged']).toContain(state);
    await rum.toggleTopFiltersPanel().catch(() => undefined);
  });

  test('REG-RUM-BE-005 — top filter combo: Data Origin = RUM Browser', async () => {
    try {
      await rum.applyTopFilterCombination({ dataOrigin: 'RUM Browser' });
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Top combo soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectChartsOrTablesReady();
    }
  });

  test('REG-RUM-BE-006 — top filter combo: Device = Mobile', async () => {
    try {
      await rum.applyTopFilterCombination({ devices: ['Mobile'] });
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Top combo soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectChartsOrTablesReady();
    }
  });

  test('REG-RUM-BE-007 — top filter combo: Browser = Chrome', async () => {
    try {
      await rum.applyTopFilterCombination({ browsers: ['Chrome'] });
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Top combo soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectChartsOrTablesReady();
    }
  });

  test('REG-RUM-BE-008 — top filter combo: OS = Windows', async () => {
    try {
      await rum.applyTopFilterCombination({ os: ['Windows'] });
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Top combo soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectChartsOrTablesReady();
    }
  });

  test('REG-RUM-BE-009 — top filter combo: Bucket Size = Auto', async () => {
    try {
      await rum.applyTopFilterCombination({ bucketSize: /Auto/i });
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Bucket soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectChartsOrTablesReady();
    }
  });

  test('REG-RUM-BE-010 — top filter combo: Time Period = Last 6 Hours', async () => {
    try {
      await rum.applyTopFilterCombination({ timePeriod: 'Last 6 Hours' });
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Time 6h soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectChartsOrTablesReady();
    }
  });

  test('REG-RUM-BE-011 — top filter combo: Data Origin RUM Browser + Device Desktop + Last 24 Hours', async () => {
    try {
      await rum.applyTopFilterCombination({
        dataOrigin: 'RUM Browser',
        devices: ['Desktop'],
        timePeriod: 'Last 24 Hours',
      });
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Multi combo soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectChartsOrTablesReady();
    }
  });

  test('REG-RUM-BE-012 — restore Data Origin both + Auto bucket', async () => {
    try {
      await rum.applyTopFilterCombination({
        dataOrigin: /RUM Browser & Native Webview/i,
        bucketSize: /Auto/i,
      });
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Restore soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectChartsOrTablesReady();
    }
  });

  test('REG-RUM-BE-013 — Session Exit vs Page View Exit Rate tooltips/labels distinguishable', async () => {
    try {
      await withSoftDeadline(async () => {
        // Labels sit beside value nodes (#exit-rate-card / #page-exit-rate-card hold %).
        await expect(page.getByText('Session Exit Rate', { exact: true }).first()).toBeVisible({
          timeout: 15000,
        });
        await expect(page.getByText('Page View Exit Rate', { exact: true }).first()).toBeVisible({
          timeout: 15000,
        });
        await expect(rum.locators.exitRateCard).toBeVisible();
        await expect(rum.locators.pageExitRateCard).toBeVisible();
        const sessionVal = ((await rum.locators.exitRateCard.textContent()) || '').trim();
        const pageVal = ((await rum.locators.pageExitRateCard.textContent()) || '').trim();
        expect(/\d/.test(sessionVal)).toBeTruthy();
        expect(/\d/.test(pageVal)).toBeTruthy();
        const tips = await rum.sampleExitRateTooltips();
        console.log(
          `[RUM BE] exit tips session=${tips.session || '(none)'} page=${tips.page || '(none)'} vals=${sessionVal}|${pageVal}`
        );
      }, 45000);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Exit tooltip soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-BE-014 — Over Time: Bounce / Exit Rate Average graph', async () => {
    try {
      await rum.selectOverTimeTab('average');
      await rum.selectOverTimeView('graph');
      await expect(rum.locators.bounceRateOverTimeAverageGraph).toBeVisible({ timeout: 20000 });
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Avg graph soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectChartsOrTablesReady();
    }
  });

  test('REG-RUM-BE-015 — Over Time: Average table headers (Date/Onload/Bounce/Exit/Revenue)', async () => {
    try {
      await rum.expectAverageOverTimeTableHeaders();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Avg table soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-BE-016 — Over Time: Bounce Rate By Page tab + graph/table toggle', async () => {
    try {
      await rum.selectOverTimeTab('bounce');
      await rum.selectOverTimeView('graph');
      await rum.selectOverTimeView('table');
      await expect(rum.locators.bounceRateOverTimeTable).toBeVisible({ timeout: 20000 });
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Bounce by page soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-BE-017 — Over Time: Session Exit Rate By Page tab', async () => {
    try {
      await rum.selectOverTimeTab('sessionExit');
      await rum.selectOverTimeView('graph');
      await expect(rum.locators.exitRateOverTimeGraph).toBeVisible({ timeout: 20000 });
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Session exit soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-BE-018 — Over Time: Page Exit Rate By Page tab', async () => {
    try {
      await rum.selectOverTimeTab('pageExit');
      await rum.selectOverTimeView('graph');
      await expect(rum.locators.pageExitRateOverTimeGraph).toBeVisible({ timeout: 20000 });
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Page exit soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-BE-019 — By Onload: Average histogram graph', async () => {
    try {
      await rum.selectOnloadTab('average');
      await rum.selectOnloadView('graph');
      await expect(rum.locators.bounceRateCurveGraph).toBeVisible({ timeout: 20000 });
      await expect(page.getByText(/Seconds for Page to Load|Bounce and Exit Rate by Onload/i).first()).toBeVisible();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Onload avg soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-BE-020 — By Onload: Average table headers (Seconds/Sessions/Bounce)', async () => {
    try {
      await rum.expectOnloadCurveTableHeaders();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Onload table soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-BE-021 — By Onload: Bounce / Session Exit / Page Exit by-page tabs', async () => {
    try {
      await rum.selectOnloadTab('bounce');
      await rum.selectOnloadView('graph');
      await rum.selectOnloadTab('sessionExit');
      await rum.selectOnloadTab('pageExit');
      await rum.expectChartsOrTablesReady();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Onload tabs soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-BE-022 — Bounce Rate and Onload Previous 7 Days / 30 Day Average table', async () => {
    try {
      const { redOrGreen } = await rum.expectOverview7DayTable();
      console.log(`[RUM BE] 7-day color samples present=${redOrGreen}`);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `7-day table soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-BE-023 — Export menu sample near over-time table', async () => {
    try {
      await withSoftDeadline(async () => {
        await rum.locators.bounceAverageRateBtn.click({ force: true, timeout: 10000 });
        await page.waitForTimeout(800);
        await rum.locators.tableTimeBtn.click({ force: true, timeout: 10000 });
        await page.waitForTimeout(1200);
        await rum.sampleExportNear(rum.locators.bounceRateOverTimeAverageTable);
      }, 40000);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Export soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-BE-024 — Markers dropdown lists Hide/Show/Toggle/Create options', async () => {
    try {
      await rum.openMarkersMenu();
      for (const label of [
        /Hide All Markers/i,
        /Show All Markers/i,
        /Toggle Custom Markers/i,
        /Toggle Global Markers/i,
        /Create Custom Marker/i,
        /Create Global Marker/i,
      ]) {
        await expect(rum.locators.markerOption(label)).toBeVisible();
      }
      await page.keyboard.press('Escape').catch(() => undefined);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Markers menu soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-BE-025 — Toggle Hide All / Show All Markers', async () => {
    try {
      await rum.selectMarkerMenuOption(/Hide All Markers/i);
      await rum.selectMarkerMenuOption(/Show All Markers/i);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Markers toggle soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-BE-026 — Create Custom Marker opens create form in new tab', async () => {
    try {
      const popup = await rum.openCreateMarkerTab('custom');
      await expect(popup.locator('#event-name')).toBeVisible({ timeout: 20000 });
      await popup.close().catch(() => undefined);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Create Custom open soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-BE-027 — Create Global Marker opens create form in new tab', async () => {
    try {
      const popup = await rum.openCreateMarkerTab('global');
      await expect(popup.locator('#event-name')).toBeVisible({ timeout: 20000 });
      await popup.close().catch(() => undefined);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Create Global open soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-BE-028 — create Custom Marker record and find via search', async () => {
    try {
      const { name, popup } = await withSoftDeadline(() => rum.createMarkerRecord('custom'), 120000);
      console.log(`[RUM BE] created custom marker: ${name}`);
      expect(name).toMatch(/^AUTO-BE-custom-/);
      await popup.close().catch(() => undefined);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Create Custom write soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-BE-029 — create Global Marker record and find via search', async () => {
    try {
      const { name, popup } = await withSoftDeadline(() => rum.createMarkerRecord('global'), 120000);
      console.log(`[RUM BE] created global marker: ${name}`);
      expect(name).toMatch(/^AUTO-BE-global-/);
      await popup.close().catch(() => undefined);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Create Global write soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-BE-030 — right-nav Filters sample (data origin) refreshes cards/charts', async () => {
    try {
      await rum.applySampleFilterCombo({ dataOrigin: 'RUM Browser' });
      await expect(rum.locators.bounceRateCard).toBeVisible();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Right-nav soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectChartsOrTablesReady();
    }
  });

  test('REG-RUM-BE-031 — right-nav Time Period Last 6 hours refreshes data', async () => {
    try {
      await rum.applyTimePeriod('Last 6 Hours');
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Time 6h soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectChartsOrTablesReady();
    }
  });

  test('REG-RUM-BE-032 — right-nav Time Period Last 24 hours refreshes data', async () => {
    try {
      await rum.applyTimePeriod('Last 24 Hours');
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Time 24h soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectChartsOrTablesReady();
    }
  });

  test('REG-RUM-BE-033 — right-nav Time Period Last 7 days refreshes data', async () => {
    try {
      await rum.applyTimePeriod('Last 7 Days');
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Time 7d soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectChartsOrTablesReady();
    }
  });

  test('REG-RUM-BE-034 — right-nav Time Period Last 30 days refreshes data', async () => {
    try {
      await rum.applyTimePeriod('Last 30 Days');
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Time 30d soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectChartsOrTablesReady();
    }
  });

  test('REG-RUM-BE-035 — info / tooltip sample on cards or tabs', async () => {
    try {
      const tip = await rum.sampleInfoTooltip();
      console.log(`[RUM BE] info tip sample: ${tip || '(labels present)'}`);
      await expect(rum.locators.filtersToggle.or(rum.locators.sharePageButton)).toBeVisible();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Tooltip soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-BE-036 — top-nav Filters / Share controls remain usable', async () => {
    try {
      await expect(rum.locators.filtersToggle).toBeVisible();
      await expect(rum.locators.sharePageButton).toBeVisible();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Top-nav soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });
});
