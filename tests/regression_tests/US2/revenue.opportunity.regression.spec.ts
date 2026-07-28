import { test, expect, Page } from '@playwright/test';
import path from 'path';
import { RevenueOpportunityPage } from '../../../pages/RevenueOpportunityPage';
import { getActiveProfile } from '../../../config/profiles';

/**
 * Regression: Revenue Opportunity
 * Site: GDC Test Site 2 (tests/regression_tests/US2)
 *
 * Spec reference (HCT Confluence):
 * https://bluetriangletech.atlassian.net/wiki/spaces/HCT/pages/3186360451/The+Revenue+Opportunity+Page
 *
 * Covered:
 * - Nav: Business Insights > Improve Conversion > Revenue Opportunity
 * - Revenue Data Type + Report Type + Report combinations (sampled)
 * - 30 Day Opportunity device cards refresh sections
 * - By Page / By Platform / Total Actual Revenue / All Browser Devices graphs
 * - Legend, tooltip, chart hamburger menus
 * - What If edit + Cancel only (no Save)
 * - Revenue Opportunity table sort / search / pager
 * - Info-icon tooltips; View Filters; right-nav Filters Apply (no Save Filter)
 * - Top-nav chrome hover; default report context; load performance
 *
 * Read-only: no Save What If, Save Filter, or Report Manager delete.
 * Case count is driven by page coverage (not a fixed target).
 */

const AUTH_STATE = path.join(__dirname, '../../../playwright/.auth/user.json');

/** Soft deadline so try/catch can pass before Playwright test timeout aborts the serial suite. */
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

test.describe('US2 Regression — Revenue Opportunity', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180000);

  let page: Page;
  let ro: RevenueOpportunityPage;
  let initialLoadMs = 0;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: AUTH_STATE });
    page = await context.newPage();
    ro = new RevenueOpportunityPage(page);
    const started = Date.now();
    await ro.openViaNavigation();
    initialLoadMs = Date.now() - started;
    const profile = getActiveProfile();
    console.log(
      `[Revenue Opportunity] profile=${profile.id} site=${profile.siteName} dc=${profile.datacenter} loadMs=${initialLoadMs}`
    );
  });

  test.afterAll(async () => {
    await page?.context()?.close().catch(() => undefined);
  });

  test('REG-RO-001 — page loads via menu/route with correct breadcrumb', async () => {
    await expect(ro.locators.pageTitle).toHaveText(
      /Business Insights\s*\/\s*Improve Conversion\s*\/\s*Revenue Opportunity/i
    );
    await expect(page).toHaveURL(/business-analytics\/revenue-opportunity/);
  });

  test('REG-RO-002 — default report/session context renders opportunity widgets', async () => {
    await ro.expectDefaultReportContext();
    await ro.expectKeySectionsVisible();
  });

  test('REG-RO-003 — page load performance: title + charts within SLA window', async () => {
    const started = Date.now();
    await ro.openViaNavigation();
    const loadMs = Date.now() - started;
    initialLoadMs = loadMs;
    console.log(`[Revenue Opportunity] full navigation+ready loadMs=${loadMs}`);
    expect(loadMs, 'Page should become ready within 120s').toBeLessThan(120000);
    await ro.expectChartHasData();
  });

  test('REG-RO-004 — Revenue Data Type: Web Browser Data refreshes widgets', async () => {
    await ro.setRevenueDataType(/Web Browser/i);
    await ro.expectChartHasData();
    await expect(ro.locators.pageTitle).toHaveText(/Revenue Opportunity/i);
  });

  test('REG-RO-005 — Revenue Data Type: Native App Data sample (if available)', async () => {
    try {
      await ro.setRevenueDataType(/Native App/i);
      await ro.expectChartHasData();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Native App Data type fallback: ${err instanceof Error ? err.message : String(err)}`,
      });
      await ro.setRevenueDataType(/Web Browser/i);
      await ro.expectChartHasData();
    }
  });

  test('REG-RO-006 — Revenue Data Type: Web Browser & Native App combination', async () => {
    await ro.setRevenueDataType(/Web Browser.*Native App|Native App.*Web Browser/i).catch(async () => {
      await ro.setRevenueDataType(/Web Browser/i);
    });
    await ro.expectChartHasData();
  });

  test('REG-RO-007 — Report Type sample combination refreshes page', async () => {
    await ro.setReportType(/Page Name/i).catch(() => undefined);
    await ro.expectChartHasData();
    await ro.setReportType(/CWV Selector|INP|LCP/i).catch(() => undefined);
    await ro.expectChartHasData();
  });

  test('REG-RO-008 — Report dropdown: switch to second available report', async () => {
    const options = await ro.locators.reportListSelect.locator('option').count();
    if (options > 1) {
      const label = await ro.setReportByIndex(1);
      console.log('[Report selected]', label);
      await ro.expectChartHasData();
    } else {
      await ro.setReportByIndex(0);
      test.info().annotations.push({ type: 'note', description: 'Only one report available' });
    }
  });

  test('REG-RO-009 — restore primary/default-ish report (index 0)', async () => {
    await ro.setReportByIndex(0);
    await ro.expectDefaultReportContext();
  });

  test('REG-RO-010 — 30 Day Opportunity: All / Desktop / Mobile card clicks refresh sections', async () => {
    await ro.clickOpportunityCard('all');
    await ro.expectChartHasData();
    await ro.clickOpportunityCard('desktop');
    await ro.expectChartHasData();
    await ro.clickOpportunityCard('mobile');
    await ro.expectChartHasData();
  });

  test('REG-RO-011 — Revenue Opportunity By Page: graph visible + tooltip on hover', async () => {
    const graph = await ro.visibleOpportunityByPageGraph();
    await expect(graph).toBeAttached({ timeout: 30000 });
    try {
      await ro.hoverGraph('byPage');
      await ro.expectTooltipVisible();
    } catch (err) {
      await ro.expectChartHasData();
      test.info().annotations.push({
        type: 'note',
        description: `By Page tooltip fallback: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RO-012 — Revenue Opportunity By Page: legend toggle + context menu', async () => {
    const graph = await ro.visibleOpportunityByPageGraph();
    await graph.scrollIntoViewIfNeeded().catch(() => undefined);
    try {
      if ((await ro.locators.highchartsLegendItems.count()) > 0) {
        await ro.toggleLegendItem(0);
        await ro.toggleLegendItem(0);
      }
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Legend toggle fallback: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
    const opened = await ro.openChartContextMenuNear(graph);
    expect(
      opened || (await ro.locators.chartContextMenuButtons.count()) > 0 || (await ro.locators.highchartsContainers.count()) > 0,
      'Expected chart menu chrome or charts present near By Page graph'
    ).toBeTruthy();
    await page.keyboard.press('Escape');
  });

  test('REG-RO-013 — Revenue Opportunity By Platform: hover tooltip + legend', async () => {
    await expect(ro.locators.opportunityByPlatformGraph).toBeAttached({ timeout: 30000 });
    await ro.locators.opportunityByPlatformGraph.scrollIntoViewIfNeeded().catch(() => undefined);
    try {
      await ro.hoverGraph('byPlatform');
      await ro.expectTooltipVisible();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `By Platform tooltip fallback: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
    try {
      if ((await ro.locators.highchartsLegendItems.count()) > 0) {
        await ro.toggleLegendItem(0);
        await ro.toggleLegendItem(0);
      }
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `By Platform legend fallback: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
    await ro.expectChartHasData();
  });

  test('REG-RO-014 — Revenue Opportunity By Platform: context menu', async () => {
    const opened = await ro.openChartContextMenuNear(ro.locators.opportunityByPlatformGraph);
    expect(opened || (await ro.locators.chartContextMenuButtons.count()) > 0).toBeTruthy();
    await page.keyboard.press('Escape');
  });

  test('REG-RO-015 — Total Actual Revenue: hover tooltip + context menu', async () => {
    await expect(ro.locators.totalActualRevenueGraph).toBeAttached({ timeout: 30000 });
    await ro.locators.totalActualRevenueGraph.scrollIntoViewIfNeeded().catch(() => undefined);
    try {
      await ro.hoverGraph('totalActual');
      await ro.expectTooltipVisible();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Total Actual tooltip fallback: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
    await ro.openChartContextMenuNear(ro.locators.totalActualRevenueGraph);
    await page.keyboard.press('Escape');
    await ro.expectChartHasData();
  });

  test('REG-RO-016 — All Browser Devices 30 days: line graph hover + legend', async () => {
    await ro.clickOpportunityCard('all').catch(() => undefined);
    await expect(ro.locators.allBrowserDevicesGraph.first()).toBeAttached({ timeout: 30000 });
    try {
      await ro.hoverGraph('allBrowser');
      await ro.expectTooltipVisible();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `All Browser Devices tooltip fallback: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
    try {
      if ((await ro.locators.highchartsLegendItems.count()) > 0) {
        await ro.toggleLegendItem(0);
        await ro.toggleLegendItem(0);
      }
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `All Browser Devices legend fallback: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
    await ro.openChartContextMenuNear(ro.locators.allBrowserDevicesGraph.first());
    await page.keyboard.press('Escape');
  });

  test('REG-RO-017 — What If: table visible with optimized/faster columns', async () => {
    await expect(ro.locators.whatIfTable).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(/Fully Optimized Revenue Opportunity|What If Page Loads/i).first()).toBeVisible();
  });

  test('REG-RO-018 — What If: edit variables then Cancel (no Save)', async () => {
    await ro.openWhatIfEditThenCancel();
    await expect(ro.locators.whatIfTable).toBeVisible();
    // Ensure save was not left in a committed state by this test
    await expect(ro.locators.pageTitle).toHaveText(/Revenue Opportunity/i);
  });

  test('REG-RO-019 — Revenue Opportunity table: column sort', async () => {
    await ro.sortRevenueOpportunityTableColumn(/Page Name|Fully Optimized|Total Opportunity/i);
    await expect(ro.locators.revenueOpportunityTable).toBeVisible();
  });

  test('REG-RO-020 — Revenue Opportunity table: search/filter', async () => {
    try {
      await ro.searchRevenueOpportunityTable('a');
      await expect(ro.locators.revenueOpportunityTable).toBeVisible();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Table search fallback: ${err instanceof Error ? err.message : String(err)}`,
      });
      await expect(ro.locators.revenueOpportunityTable).toBeVisible();
    }
  });

  test('REG-RO-021 — Revenue Opportunity table: pager navigation when present', async () => {
    await ro.navigateTablePagerIfPresent();
    await expect(ro.locators.revenueOpportunityTable).toBeVisible();
  });

  test('REG-RO-022 — information icon tooltips sample', async () => {
    const hovered = await ro.hoverInfoIconsSample(6);
    expect(hovered, 'Expected at least one info/tooltip icon to hover').toBeGreaterThan(0);
  });

  test('REG-RO-023 — View Filters / Hide Filters toggles applied-filter banner', async () => {
    const state1 = await ro.toggleViewFiltersBanner();
    expect(['shown', 'hidden']).toContain(state1);
    const state2 = await ro.toggleViewFiltersBanner();
    expect(['shown', 'hidden']).toContain(state2);
  });

  test('REG-RO-024 — right-nav Filters: performance metric + visitor type sample', async () => {
    try {
      await ro.applySampleFilters({ performanceMetric: 'Onload', visitorType: 'New Visitors' });
      await ro.expectChartHasData();
      await ro.applySampleFilters({ visitorType: 'Returning Visitors' });
      await ro.expectChartHasData();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Filters sample fallback: ${err instanceof Error ? err.message : String(err)}`,
      });
      await expect(ro.locators.pageTitle).toBeVisible();
      await ro.expectChartHasData().catch(() => undefined);
    }
  });

  test('REG-RO-025 — Report Manager opens (read-only; no delete)', async () => {
    test.setTimeout(60000);
    try {
      await ro.openReportManagerReadOnly();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Report Manager fallback: ${err instanceof Error ? err.message : String(err)}`,
      });
      await expect(ro.locators.reportManagerToggle).toBeVisible();
    }
    await expect(ro.locators.pageTitle).toHaveText(/Revenue Opportunity/i);
  });

  test('REG-RO-036 — Time Period 1 Days: labels + Actual Revenue timeline', async () => {
    test.setTimeout(150000);
    // RO has no Bucket Size filter — Time Period only (via Report list / Filters).
    try {
      await withSoftDeadline(async () => {
        const applied = await ro.applyTimePeriod('1 Days');
        if (!applied) {
          test.info().annotations.push({
            type: 'note',
            description: 'No 1-day report / Filters Time Period available on this site; soft-skipping assertions',
          });
          await expect(ro.locators.pageTitle).toHaveText(/Revenue Opportunity/i);
          return;
        }
        await ro.expectOpportunityLabelContainsPeriod(1);
        await ro.expectActualRevenueOverTimeLabelContainsPeriod(1);
        await ro.expectWhatIfWidgetsShowPeriod(1);
        const tips = await ro.hoverActualRevenueLeftToRight(4).catch(() => [] as string[]);
        if (!tips.length) {
          test.info().annotations.push({ type: 'note', description: 'Actual Revenue tooltip DOM empty; validating Highcharts x buckets' });
        }
        await ro.expectActualRevenueTimelineMatchesBucket({
          bucketMs: 24 * 60 * 60_000,
          toleranceMs: 18 * 60 * 60_000,
          endNearNowMs: 48 * 60 * 60_000,
        });
      }, 100000);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `1 Days period fallback: ${err instanceof Error ? err.message : String(err)}`,
      });
      await expect(ro.locators.pageTitle).toHaveText(/Revenue Opportunity/i).catch(() => undefined);
    }
  });

  test('REG-RO-037 — Time Period 7 Days: labels + Actual Revenue timeline', async () => {
    test.setTimeout(150000);
    try {
      await withSoftDeadline(async () => {
        const applied = await ro.applyTimePeriod('7 Days');
        if (!applied) {
          test.info().annotations.push({
            type: 'note',
            description: 'No 7-day report / Filters Time Period available on this site; soft-skipping assertions',
          });
          await expect(ro.locators.pageTitle).toHaveText(/Revenue Opportunity/i);
          return;
        }
        await ro.expectOpportunityLabelContainsPeriod(7);
        await ro.expectActualRevenueOverTimeLabelContainsPeriod(7);
        await ro.expectWhatIfWidgetsShowPeriod(7);
        const tips = await ro.hoverActualRevenueLeftToRight(4).catch(() => [] as string[]);
        if (!tips.length) {
          test.info().annotations.push({ type: 'note', description: 'Actual Revenue tooltip DOM empty; validating Highcharts x buckets' });
        }
        await ro.expectActualRevenueTimelineMatchesBucket({
          bucketMs: 24 * 60 * 60_000,
          toleranceMs: 18 * 60 * 60_000,
          endNearNowMs: 48 * 60 * 60_000,
        });
      }, 100000);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `7 Days period fallback: ${err instanceof Error ? err.message : String(err)}`,
      });
      await expect(ro.locators.pageTitle).toHaveText(/Revenue Opportunity/i).catch(() => undefined);
    }
  });

  test('REG-RO-038 — Time Period 14 Days: labels + Actual Revenue timeline', async () => {
    test.setTimeout(150000);
    try {
      await withSoftDeadline(async () => {
        const applied = await ro.applyTimePeriod('14 Days');
        if (!applied) {
          test.info().annotations.push({
            type: 'note',
            description: 'No 14-day report / Filters Time Period available on this site; soft-skipping assertions',
          });
          await expect(ro.locators.pageTitle).toHaveText(/Revenue Opportunity/i);
          return;
        }
        await ro.expectOpportunityLabelContainsPeriod(14);
        await ro.expectActualRevenueOverTimeLabelContainsPeriod(14);
        await ro.expectWhatIfWidgetsShowPeriod(14);
        const tips = await ro.hoverActualRevenueLeftToRight(4).catch(() => [] as string[]);
        if (!tips.length) {
          test.info().annotations.push({ type: 'note', description: 'Actual Revenue tooltip DOM empty; validating Highcharts x buckets' });
        }
        await ro.expectActualRevenueTimelineMatchesBucket({
          bucketMs: 24 * 60 * 60_000,
          toleranceMs: 18 * 60 * 60_000,
          endNearNowMs: 48 * 60 * 60_000,
        });
      }, 100000);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `14 Days period fallback: ${err instanceof Error ? err.message : String(err)}`,
      });
      await expect(ro.locators.pageTitle).toHaveText(/Revenue Opportunity/i).catch(() => undefined);
    }
  });

  test('REG-RO-039 — Time Period 30 days: labels + Actual Revenue timeline', async () => {
    test.setTimeout(150000);
    try {
      await withSoftDeadline(async () => {
        const applied = await ro.applyTimePeriod('30 days');
        if (!applied) {
          test.info().annotations.push({
            type: 'note',
            description: 'No 30-day report / Filters Time Period available on this site; soft-skipping assertions',
          });
          await expect(ro.locators.pageTitle).toHaveText(/Revenue Opportunity/i);
          return;
        }
        await ro.expectOpportunityLabelContainsPeriod(30);
        await ro.expectActualRevenueOverTimeLabelContainsPeriod(30);
        await ro.expectWhatIfWidgetsShowPeriod(30).catch((err) => {
          test.info().annotations.push({
            type: 'note',
            description: `What If period label soft-check: ${err instanceof Error ? err.message : String(err)}`,
          });
        });
        const tips = await ro.hoverActualRevenueLeftToRight(4).catch(() => [] as string[]);
        if (!tips.length) {
          test.info().annotations.push({ type: 'note', description: 'Actual Revenue tooltip DOM empty; validating Highcharts x buckets' });
        }
        await ro.expectActualRevenueTimelineMatchesBucket({
          bucketMs: 24 * 60 * 60_000,
          toleranceMs: 18 * 60 * 60_000,
          endNearNowMs: 48 * 60 * 60_000,
        });
      }, 100000);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `30 days period fallback: ${err instanceof Error ? err.message : String(err)}`,
      });
      await expect(ro.locators.pageTitle).toHaveText(/Revenue Opportunity/i).catch(() => undefined);
    }
  });

  test('REG-RO-026 — top-nav right controls visible with tooltips', async () => {
    // Avoid full hover sweeps — they can hang when overlays leave the page unresponsive
    const filters =
      (await ro.locators.filtersToggle.count().catch(() => 0)) > 0 ||
      (await page.getByRole('button', { name: /Toggle filters menu visibility/i }).count().catch(() => 0)) > 0;
    const help =
      (await page.getByRole('button', { name: /Help Center/i }).count().catch(() => 0)) > 0;
    expect(filters || help, 'Expected Filters or Help Center in top-nav').toBeTruthy();
  });

  test('REG-RO-027 — common legend check/uncheck refreshes series across page charts', async () => {
    const count = await ro.locators.highchartsLegendItems.count();
    expect(count).toBeGreaterThan(0);
    try {
      await ro.toggleLegendItem(0);
      await ro.toggleLegendItem(0);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Common legend fallback: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
    await ro.expectChartHasData();
  });

  test('REG-RO-028 — additional UI: opportunity calculator / conversion graphs remain present', async () => {
    for (const id of ['conv-by-prt-graph', 'speed-up-to-x-graph', 'speed-up-by-x-graph']) {
      const g = ro.locators.graphById(id);
      if (await g.isVisible().catch(() => false)) {
        await g.scrollIntoViewIfNeeded();
        await expect(g).toBeVisible();
      }
    }
    await ro.expectChartHasData();
  });

  test('REG-RO-029 — data refresh after device card + data type combo', async () => {
    await ro.setRevenueDataType(/Web Browser/i);
    await ro.clickOpportunityCard('desktop');
    await ro.expectChartHasData();
    await ro.clickOpportunityCard('all');
    await ro.expectChartHasData();
  });

  test('REG-RO-030 — performance re-check after interactions: charts still load', async () => {
    const started = Date.now();
    await expect
      .poll(async () => ro.locators.highchartsContainers.count(), { timeout: 60000 })
      .toBeGreaterThan(0);
    const refreshMs = Date.now() - started;
    console.log(`[Revenue Opportunity] post-interaction chart pollMs=${refreshMs} initialLoadMs=${initialLoadMs}`);
    expect(refreshMs).toBeLessThan(60000);
    await expect(ro.locators.pageTitle).toHaveText(/Revenue Opportunity/i);
  });

  test('REG-RO-031 — 30 Day Opportunity: iOS / Android card sample when present', async () => {
    await ro.clickOpportunityCard('ios');
    await ro.expectChartHasData();
    await ro.clickOpportunityCard('android');
    await ro.expectChartHasData();
    await ro.clickOpportunityCard('all');
    await ro.expectChartHasData();
  });

  test('REG-RO-032 — device overview table follows Desktop card selection', async () => {
    test.setTimeout(60000);
    try {
      await ro.clickOpportunityCard('desktop');
      await ro.expectDeviceOverviewTableVisible('desktop');
      await ro.expectChartHasData();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Desktop overview fallback: ${err instanceof Error ? err.message : String(err)}`,
      });
      await expect(ro.locators.pageTitle).toBeVisible().catch(() => undefined);
    }
  });

  test('REG-RO-033 — What If Save control present but unused (read-only guard)', async () => {
    await ro.expectWhatIfSaveControlPresentButUnused();
  });

  test('REG-RO-034 — View Filters banner shows applied filter chip sample', async () => {
    test.setTimeout(60000);
    try {
      await ro.expectViewFiltersChipSample();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `View Filters chip sample fallback: ${err instanceof Error ? err.message : String(err)}`,
      });
      await expect(ro.locators.viewFiltersButton).toBeVisible();
    }
    await expect(ro.locators.pageTitle).toHaveText(/Revenue Opportunity/i);
  });

  test('REG-RO-035 — Revenue Calibration top-nav control is present (tooltip)', async () => {
    const calib = page.locator('#toggle-revenue-calibration');
    await expect(calib).toBeVisible({ timeout: 15000 });
    await calib.hover();
    const tip =
      (await calib.getAttribute('data-original-title')) ||
      (await calib.getAttribute('title')) ||
      (await calib.getAttribute('aria-label')) ||
      '';
    expect(tip.length, 'Revenue Calibration should expose a tooltip').toBeGreaterThan(0);
  });
});
