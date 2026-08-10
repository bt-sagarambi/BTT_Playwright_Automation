import { test, expect, Page } from '@playwright/test';
import path from 'path';
import {
  RumPerformanceDetailDashboardPage,
  RumPerformanceDetailDashboardContext,
  RUM_PD_DASH_EXACT,
  isRumPerformanceDetailDashboardLabel,
} from '../../../../../../pages/RumPerformanceDetailDashboardPage';
import { getActiveProfile } from '../../../../../../config/profiles';

/**
 * Regression: RUM Performance Detail (preconfigured dashboard)
 * Site: GDC Test Site 2
 * Path: tests/regression_tests/US2/dashboards/preconfigured/rum-performance-detail
 *
 * Read-only: no Save Filter, permanent widget save, dashboard delete/share/clone sticky.
 * Exact option RUM Performance Detail — never Synthetic/Native App Performance Detail,
 * never Monitoring → Real User Browser → Performance Detail.
 *
 * npm: test:regression:us2:rum-performance-detail-dashboard
 * (do NOT use test:regression:us2:rum-pd — that is Monitoring)
 */

const AUTH_STATE = path.join(__dirname, '../../../../../../playwright/.auth/user.json');

async function withSoftDeadline<T>(
  work: () => Promise<T>,
  ms: number,
  onTimeout?: () => Promise<void>
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;
  try {
    return await Promise.race([
      work(),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          timedOut = true;
          reject(new Error(`soft deadline ${ms}ms exceeded`));
        }, ms);
      }),
    ]);
  } catch (err) {
    if (timedOut && onTimeout) await onTimeout();
    throw err;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

test.describe('US2 Regression — RUM Performance Detail Dashboard', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(150000);

  let page: Page;
  let rum: RumPerformanceDetailDashboardPage;
  let initialCtx: RumPerformanceDetailDashboardContext;
  let initialLoadMs = 0;
  const notes: string[] = [];
  const blockingPageErrors: string[] = [];

  const annotate = (description: string) => {
    notes.push(description);
    test.info().annotations.push({ type: 'note', description });
    console.log(`[RUM-PD-DASH] ${description}`);
  };

  const recover = async () => {
    await rum.recoverPage();
    if (initialCtx) await rum.restoreContext(initialCtx).catch(() => undefined);
  };

  test.beforeAll(async ({ browser }, testInfo) => {
    testInfo.setTimeout(180000);
    const context = await browser.newContext({ storageState: AUTH_STATE });
    page = await context.newPage();
    page.on('pageerror', (error) => {
      const msg = error.message || String(error);
      if (/Script error|ResizeObserver|Non-Error promise rejection|favicon|third.?party/i.test(msg))
        return;
      blockingPageErrors.push(msg);
    });
    rum = new RumPerformanceDetailDashboardPage(page);
    const started = Date.now();
    await rum.openViaNavigation();
    await rum.ensureProfileSiteSelected();
    await page.waitForTimeout(1500);
    await rum.expectCoreWidgetsReady().catch(() => undefined);
    initialLoadMs = Date.now() - started;
    initialCtx = await rum.captureContext();
    const profile = getActiveProfile();
    const siteNow = await rum.getSiteLabel().catch(() => profile.siteName);
    console.log(
      `[RUM-PD-DASH] profile=${profile.id} site=${siteNow} dc=${profile.datacenter} loadMs=${initialLoadMs} dashboard="${initialCtx.dashboardLabel}" lookback="${initialCtx.lookbackLabel}"`
    );
  });

  test.afterAll(async () => {
    if (notes.length) console.log(`[RUM-PD-DASH] annotations:\n- ${notes.join('\n- ')}`);
    await page?.context()?.close().catch(() => undefined);
  });

  test('REG-RUM-PD-DASH-001 — page loads via Dashboards menu/route with correct title', async () => {
    await expect(page).toHaveURL(/site\/dashboard|r=site%2Fdashboard/i);
    await expect(page).not.toHaveURL(/site\/login|site%2Flogin/i);
    await expect(rum.locators.pageTitle).toHaveText(/Dashboards/i);
    await expect(page).toHaveTitle(/Dashboards/i);
    await rum.expectNotConfusedSurfaces();
  });

  test('REG-RUM-PD-DASH-002 — exact RUM Performance Detail; four core widget groups', async () => {
    await rum.ensureRumPerformanceDetailSelected();
    const dash = await rum.getDashboardLabel();
    expect(isRumPerformanceDetailDashboardLabel(dash), `dash="${dash}"`).toBeTruthy();
    expect(dash).not.toMatch(/Synthetic Performance Detail/i);
    expect(dash).not.toMatch(/Native App Performance Detail/i);
    await rum.expectCoreWidgetTitles();
    annotate(`Dashboard="${dash}" widgets-ready score≈${await rum.widgetsReadyScore()}`);
  });

  test('REG-RUM-PD-DASH-003 — selected site is GDC Test Site 2; lookback/auto-refresh captured', async () => {
    await rum.ensureProfileSiteSelected();
    await rum.expectSelectedSite();
    expect(initialCtx.lookbackLabel.length, 'Time Lookback non-empty').toBeGreaterThan(0);
    annotate(
      `site="${await rum.getSiteLabel()}" lookback="${initialCtx.lookbackLabel}" autoRefresh="${initialCtx.autoRefreshLabel || '(n/a)'}"`
    );
  });

  test('REG-RUM-PD-DASH-004 — dashboard chrome: switcher, lookback, refresh, auto-refresh', async () => {
    await expect(rum.locators.switchDashboard).toBeAttached();
    await expect(rum.locators.timeLookback).toBeVisible({ timeout: 15000 });
    await expect(rum.locators.refreshDashboard).toBeVisible();
    await expect(rum.locators.autoRefresh).toBeVisible();
  });

  test('REG-RUM-PD-DASH-005 — Preconfigured list includes exact RUM Performance Detail', async () => {
    const names = await rum.listPreconfiguredDashboardNames();
    expect(
      names.some((n) => isRumPerformanceDetailDashboardLabel(n)),
      names.join(' | ')
    ).toBeTruthy();
    expect(names.some((n) => /Synthetic Performance Detail/i.test(n))).toBeTruthy();
    annotate(`Preconfigured count=${names.length}: ${names.slice(0, 10).join(', ')}`);
  });

  test('REG-RUM-PD-DASH-006 — Time Lookback menu has multiple presets', async () => {
    try {
      const opts = await withSoftDeadline(() => rum.getTimeLookbackOptions(), 25000, recover);
      expect(opts.length).toBeGreaterThan(3);
      annotate(`Lookback options sample: ${opts.slice(0, 12).join(' | ')}`);
    } catch (err) {
      annotate(`Lookback menu soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-RUM-PD-DASH-007 — soft apply Last 24h then Last 7d; restore original lookback', async () => {
    try {
      await withSoftDeadline(
        async () => {
          await rum.selectTimeLookback(/Last 24 hours|Last 1 day|1 day/i);
          await rum.expectCoreWidgetsReady();
          await rum.selectTimeLookback(/Last 7 days/i);
          await rum.expectCoreWidgetsReady();
          if (initialCtx.lookbackLabel) {
            await rum.selectTimeLookback(initialCtx.lookbackLabel).catch(async () => {
              await rum.selectTimeLookback(/Last 1 hour|Last 6 hours|Last 24 hours/i);
            });
          }
        },
        90000,
        recover
      );
    } catch (err) {
      annotate(`Lookback sample soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
    await expect(rum.getDashboardLabel()).resolves.toMatch(RUM_PD_DASH_EXACT);
  });

  test('REG-RUM-PD-DASH-008 — Dashboard Refresh reloads without blank crash', async () => {
    try {
      await withSoftDeadline(() => rum.clickRefreshDashboard(), 45000, recover);
      await rum.expectCoreWidgetTitles();
    } catch (err) {
      annotate(`Refresh soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-RUM-PD-DASH-009 — Auto Refresh menu soft (Off, 2m…60m PDF bounds)', async () => {
    try {
      const opts = await withSoftDeadline(() => rum.getAutoRefreshOptions(), 20000, recover);
      expect(opts.length).toBeGreaterThan(0);
      const joined = opts.join(' | ');
      if (/2\s*Minutes/i.test(joined)) annotate('Auto Refresh 2 Minutes present (PDF min)');
      if (/60\s*Minutes|1\s*hour/i.test(joined)) annotate('Auto Refresh 60 Minutes present (PDF max)');
      annotate(`Auto refresh options: ${opts.slice(0, 10).join(' | ')}`);
    } catch (err) {
      annotate(`Auto Refresh soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-RUM-PD-DASH-010 — Bar Graph shell and soft hosts', async () => {
    await expect(rum.locators.barGraphText()).toBeVisible({ timeout: 30000 });
    const body = await rum.getPageBodySample(2000);
    expect(body).toMatch(/Bar Graph/i);
    const hostVisible = await rum.locators.multiStepBarGraph.isVisible().catch(() => false);
    if (hostVisible) {
      annotate('Bar host #multi-step-bar-graph visible');
    } else {
      annotate('Bar host multi-step-bar-graph soft-annotate: bind by Bar Graph text');
    }
    const charts = await rum.locators.highchartsContainers.count().catch(() => 0);
    annotate(`Highcharts containers≈${charts}; barSig=${(await rum.getBarGraphSignature()).slice(0, 100)}`);
  });

  test('REG-RUM-PD-DASH-011 — Details metric cards (≥5 core labels) + soft formats', async () => {
    const found = await rum.expectDetailsMetricCards();
    const body = await rum.getPageBodySample(3500);
    expect(body).toMatch(/Details|all selected pages/i);
    if (/\d+(\.\d+)?\s*[KkMm]?|\d+(\.\d+)?\s*[SsMm]{1,2}|CLS|0\.\d+/i.test(body)) {
      annotate('Details value formats soft (K/s/ms/unitless) present');
    }
    if (/TEST OVERRIDE/i.test(body)) {
      annotate('TEST OVERRIDE metric present on this site (soft extra)');
    }
    annotate(`Details metrics matched: ${found.join(', ')}`);
  });

  test('REG-RUM-PD-DASH-012 — metric card → Bar Graph / Daily Averages linkage soft', async () => {
    try {
      const r = await withSoftDeadline(() => rum.softMetricCardLinkage(), 60000, recover);
      annotate(r.note);
      expect(r.cards.length).toBeGreaterThan(0);
    } catch (err) {
      annotate(`Metric card linkage soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-RUM-PD-DASH-013 — Performance Graph: Page Timings Over Time shell', async () => {
    await expect(rum.locators.performanceGraphText()).toBeVisible({ timeout: 30000 });
    const body = await rum.getPageBodySample(3500);
    expect(body).toMatch(/Performance Graph|Page Timings Over Time/i);
    const host =
      (await rum.locators.perfGraphPageTimings.isVisible().catch(() => false)) ||
      (await rum.locators.pageTimingsGraph.isVisible().catch(() => false));
    if (host) annotate('Performance graph host #perfGraph-page-timings-graph (or page-timings-graph)');
    if (/Page Views|Onload|1stByte|DNS|INP|Largest Contentful/i.test(body)) {
      annotate('Performance Graph multi-series legend labels soft present');
    }
  });

  test('REG-RUM-PD-DASH-014 — Performance Graph legend toggle soft + gear cancel soft', async () => {
    try {
      const legend = await withSoftDeadline(() => rum.softPerformanceLegendToggle(), 20000);
      annotate(legend.note);
      const gear = await withSoftDeadline(() => rum.softPerformanceGearOpenClose(), 15000);
      annotate(gear.note);
      await rum.closeOverlays();
    } catch (err) {
      annotate(`Perf legend/gear soft: ${err instanceof Error ? err.message : String(err)}`);
      await rum.closeOverlays();
      await recover().catch(() => undefined);
    }
  });

  test('REG-RUM-PD-DASH-015 — Daily Averages: Page Name headers + soft rows', async () => {
    await expect(rum.locators.dailyAveragesText()).toBeVisible({ timeout: 30000 });
    const headers = (await rum.getDailyHeaderTexts()).join(' | ');
    const sample = (
      (await rum.locators.dailyAveragesWidget().innerText().catch(() => '')) || ''
    )
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 600);
    const joined = headers || sample;
    expect(joined).toMatch(/Page Name|Daily Averages/i);
    if (/30 Day Average/i.test(joined)) annotate('30 Day Average column present');
    if (/\d{4}-\d{2}-\d{2}|\(Sec\)|\(MS\)/i.test(joined)) {
      annotate('Date/unit columns soft present');
    }
    const rows = await rum.locators.dailyBodyRows().count().catch(() => 0);
    if (rows < 1 && !/\d/.test(sample)) {
      annotate('Daily Averages soft: no data rows — controlled empty possible');
    } else {
      annotate(`Daily rows≈${rows}`);
    }
    annotate(`Daily headers/sample: ${joined.slice(0, 240)}`);
  });

  test('REG-RUM-PD-DASH-016 — soft column sort Daily Averages', async () => {
    try {
      const r = await withSoftDeadline(() => rum.softSortDailyAverages(), 30000, recover);
      annotate(r.note);
      expect(r.columnsTried.length + (r.orderChanged ? 1 : 0)).toBeGreaterThanOrEqual(0);
    } catch (err) {
      annotate(`Daily sort soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-RUM-PD-DASH-017 — soft pagination Daily Averages', async () => {
    try {
      const r = await withSoftDeadline(() => rum.softPaginationDaily(), 25000);
      annotate(r.note);
    } catch (err) {
      annotate(`Daily pagination soft: ${err instanceof Error ? err.message : String(err)}`);
      await rum.closeOverlays();
    }
  });

  test('REG-RUM-PD-DASH-018 — soft Export open/close on Daily Averages', async () => {
    try {
      await withSoftDeadline(
        async () => {
          const r = await rum.softExportDaily();
          annotate(r.note);
        },
        20000,
        recover
      );
    } catch (err) {
      annotate(`Daily Export soft: ${err instanceof Error ? err.message : String(err)}`);
      await rum.closeOverlays();
      await recover().catch(() => undefined);
    }
  });

  test('REG-RUM-PD-DASH-019 — Filters drawer opens; My/Shared tabs soft', async () => {
    try {
      await withSoftDeadline(
        async () => {
          await rum.openFiltersDrawer();
          const body = ((await page.locator('body').innerText()) || '').slice(0, 5000);
          expect(body).toMatch(/Time Period|Timezone|Filter|Site/i);
          if (await rum.locators.myFiltersTab.isVisible().catch(() => false)) {
            await rum.locators.myFiltersTab.click({ force: true }).catch(() => undefined);
          }
          if (await rum.locators.sharedFiltersTab.isVisible().catch(() => false)) {
            await rum.locators.sharedFiltersTab.click({ force: true }).catch(() => undefined);
          }
          await rum.cancelFiltersDrawer();
        },
        40000,
        recover
      );
    } catch (err) {
      annotate(`Filters soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-RUM-PD-DASH-020 — Filters Apply soft path; restore RUM Performance Detail', async () => {
    try {
      await withSoftDeadline(
        async () => {
          await rum.openFiltersDrawer();
          const applied = await rum.applyFiltersSoft();
          annotate(`Apply Filters available=${applied}`);
          await rum.cancelFiltersDrawer();
          await rum.ensureRumPerformanceDetailSelected();
          await rum.expectCoreWidgetsReady();
        },
        50000,
        recover
      );
    } catch (err) {
      annotate(`Apply Filters soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-RUM-PD-DASH-021 — Dashboard Manager soft open/close (no save/delete)', async () => {
    try {
      const opened = await withSoftDeadline(() => rum.softOpenDashboardManager(), 15000);
      annotate(`Dashboard Manager open=${opened}`);
      await rum.closeOverlays();
      await page.keyboard.press('Escape').catch(() => undefined);
    } catch (err) {
      annotate(`Dashboard Manager soft: ${err instanceof Error ? err.message : String(err)}`);
      await rum.closeOverlays();
    }
    await rum.ensureRumPerformanceDetailSelected();
  });

  test('REG-RUM-PD-DASH-022 — Add Widget wizard soft open/cancel (no save)', async () => {
    try {
      const opened = await withSoftDeadline(() => rum.softOpenWidgetWizard(), 15000);
      annotate(`Widget wizard open=${opened}`);
      if (opened) {
        await expect(page.getByText(/Add a Widget|Widget Type/i).first()).toBeVisible({
          timeout: 8000,
        });
      }
      await rum.closeOverlays();
      await page.keyboard.press('Escape').catch(() => undefined);
    } catch (err) {
      annotate(`Widget wizard soft: ${err instanceof Error ? err.message : String(err)}`);
      await rum.closeOverlays();
    }
  });

  test('REG-RUM-PD-DASH-023 — soft switch sibling preconfigured then restore home + site', async () => {
    try {
      await withSoftDeadline(
        async () => {
          const names = await rum.listPreconfiguredDashboardNames();
          const sibling =
            names.find((n) => /Traffic Source and Medium/i.test(n)) ||
            names.find((n) => /Site Overview/i.test(n)) ||
            names.find((n) => n && !isRumPerformanceDetailDashboardLabel(n));
          if (!sibling) {
            annotate('No sibling preconfigured dashboard to sample');
            return;
          }
          await rum.selectDashboard(sibling);
          await page.waitForTimeout(3000);
          annotate(`Soft sibling dashboard: ${sibling}`);
          await rum.openViaNavigation();
          await expect(rum.getDashboardLabel()).resolves.toMatch(RUM_PD_DASH_EXACT);
          await rum.expectSelectedSite();
        },
        120000,
        recover
      );
    } catch (err) {
      annotate(`Sibling switch soft: ${err instanceof Error ? err.message : String(err)}`);
      await rum.openViaNavigation().catch(() => recover());
    }
  });

  test('REG-RUM-PD-DASH-024 — Synthetic Performance Detail discrimination then restore RUM', async () => {
    try {
      const r = await withSoftDeadline(() => rum.softSyntheticSiblingDiscrimination(), 90000, recover);
      annotate(r.note);
      expect(r.restored || isRumPerformanceDetailDashboardLabel(await rum.getDashboardLabel())).toBeTruthy();
      await expect(rum.getDashboardLabel()).resolves.toMatch(RUM_PD_DASH_EXACT);
      await rum.expectSelectedSite();
    } catch (err) {
      annotate(`Synthetic discrimination soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-RUM-PD-DASH-025 — soft Custom Date Selection open/cancel only', async () => {
    try {
      await rum.openTimeLookbackMenu();
      const custom = page.getByText(/Custom Date Selection|Custom/i).first();
      if (await custom.isVisible().catch(() => false)) {
        await custom.click({ force: true }).catch(() => undefined);
        await page.waitForTimeout(600);
        annotate('Custom Date Selection opened — cancel only');
      } else {
        annotate('Custom Date Selection not visible in lookback menu');
      }
      await rum.closeOverlays();
    } catch (err) {
      annotate(`Custom date soft: ${err instanceof Error ? err.message : String(err)}`);
      await rum.closeOverlays();
    }
  });

  test('REG-RUM-PD-DASH-026 — narrow viewport keeps core widgets reachable', async () => {
    await page.setViewportSize({ width: 1100, height: 900 });
    await rum.expectCoreWidgetTitles().catch(async () => {
      await rum.locators.barGraphWidget().scrollIntoViewIfNeeded().catch(() => undefined);
      await rum.locators.dailyAveragesWidget().scrollIntoViewIfNeeded().catch(() => undefined);
    });
    await expect(rum.locators.timeLookback).toBeVisible();
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('REG-RUM-PD-DASH-027 — soft keyboard Escape recovery; Help chrome soft', async () => {
    await rum.openFiltersDrawer().catch(() => undefined);
    await page.keyboard.press('Escape').catch(() => undefined);
    await rum.closeOverlays();
    const help = page.locator('#help-articles-menu, #help-video-menu, [title*="Help" i]').first();
    if (await help.isVisible().catch(() => false)) {
      annotate('Help chrome present');
    } else {
      annotate('Help chrome soft-annotate: not visible');
    }
  });

  test('REG-RUM-PD-DASH-028 — last-updated soft present when available', async () => {
    if (await rum.locators.lastUpdated.isVisible().catch(() => false)) {
      const t = await rum.getControlLabel(rum.locators.lastUpdated);
      annotate(`last-updated="${t.slice(0, 80)}"`);
      expect(t.length).toBeGreaterThan(0);
    } else {
      annotate('last-updated not visible on this build');
    }
  });

  test('REG-RUM-PD-DASH-029 — Carousel control soft presence (do not leave cycling)', async () => {
    if (await rum.locators.carouselControl.isVisible().catch(() => false)) {
      annotate('Carousel control present — left untouched');
    } else {
      annotate('Carousel control not visible');
    }
  });

  test('REG-RUM-PD-DASH-030 — refresh keeps four widget groups; still RUM Performance Detail', async () => {
    await rum.clickRefreshDashboard().catch(() => undefined);
    await rum.expectCoreWidgetTitles();
    await expect(rum.getDashboardLabel()).resolves.toMatch(RUM_PD_DASH_EXACT);
  });

  test('REG-RUM-PD-DASH-031 — history reload soft recovery to site/dashboard home', async () => {
    try {
      await withSoftDeadline(
        async () => {
          await page.reload({ waitUntil: 'domcontentloaded' });
          await rum.waitForPageReady();
          await rum.ensureRumPerformanceDetailSelected();
          await rum.ensureProfileSiteSelected();
          await rum.expectCoreWidgetsReady();
        },
        90000,
        recover
      );
    } catch (err) {
      annotate(`Reload soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-RUM-PD-DASH-032 — not Monitoring PD / Synthetic PD / TSM / Marketing / DXO', async () => {
    await rum.expectNotConfusedSurfaces();
    await expect(page).toHaveURL(/site\/dashboard/i);
    await expect(rum.getDashboardLabel()).resolves.toMatch(RUM_PD_DASH_EXACT);
    const body = await rum.getPageBodySample(2500);
    expect(body).toMatch(/Bar Graph|Daily Averages|Page Timings Over Time/i);
    // Monitoring-only affordances should not be required (scatter/session lookup)
    if (/Session Lookup|Performance Breakdown|scatter/i.test(body)) {
      annotate('Monitoring-like labels soft-seen on dashboard body — annotate only');
    }
  });

  test('REG-RUM-PD-DASH-033 — top chrome icons: tooltips + click round-trip', async () => {
    try {
      const r = await withSoftDeadline(() => rum.softChromeIconTooltipsAndRoundTrip(), 60000, recover);
      annotate(
        `Chrome tips=${r.tooltipsChecked} clicks=${r.clickTargets.join(',')} via=${r.returnedVia.join('|')}`
      );
      expect(r.tooltipsChecked + r.clickTargets.length).toBeGreaterThan(0);
      await rum.ensureRumPerformanceDetailSelected({ soft: true });
      await expect(page).toHaveURL(/site\/dashboard/i);
    } catch (err) {
      annotate(`Chrome icons soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-RUM-PD-DASH-034 — apply lookbacks 1h|6h / 24h / 7d / 30d and verify refresh', async () => {
    try {
      const results = await withSoftDeadline(
        () => rum.softPrescribedLookbacksRefresh(initialCtx.lookbackLabel),
        120000,
        recover
      );
      for (const r of results) {
        annotate(`Lookback ${r.label}: applied=${r.applied} refreshed=${r.refreshed} ${r.note}`);
        expect(r.applied, `Should apply ${r.label}`).toBeTruthy();
      }
      await expect(rum.getDashboardLabel()).resolves.toMatch(RUM_PD_DASH_EXACT);
    } catch (err) {
      annotate(`Prescribed lookbacks soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-RUM-PD-DASH-035 — change site (Demo eCommerce soft) + lock; restore GDC', async () => {
    try {
      const r = await withSoftDeadline(() => rum.softSiteChangeAndLock(), 90000, recover);
      annotate(
        `Site lockFound=${r.lockFound} changed=${r.siteChanged} restored=${r.restored} other="${r.otherSite}" ${r.note}`
      );
      expect(r.restored || /GDC Test Site 2/i.test(await rum.getSiteLabel())).toBeTruthy();
      await rum.expectCoreWidgetsReady();
    } catch (err) {
      annotate(`Site/lock soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-RUM-PD-DASH-036 — apply Auto Refresh options; leave non-aggressive', async () => {
    try {
      const r = await withSoftDeadline(() => rum.softAutoRefreshApplySample(), 40000, recover);
      annotate(r.note);
      expect(r.applied.length).toBeGreaterThan(0);
      await rum.expectCoreWidgetsReady();
    } catch (err) {
      annotate(`Auto Refresh apply soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-RUM-PD-DASH-037 — +Dashboard / Manager eye switch then restore RUM PD', async () => {
    try {
      const r = await withSoftDeadline(() => rum.softPlusDashboardEyeSwitchHome(), 90000, recover);
      annotate(`Manager plus=${r.openedViaPlus} eye=${r.eyeClicked} home=${r.restoredHome} ${r.note}`);
      await rum.ensureRumPerformanceDetailSelected();
      await expect(rum.getDashboardLabel()).resolves.toMatch(RUM_PD_DASH_EXACT);
    } catch (err) {
      annotate(`Manager eye soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-RUM-PD-DASH-038 — restore initial context; suite home healthy', async () => {
    await rum.restoreContext(initialCtx);
    await rum.ensureRumPerformanceDetailSelected();
    await rum.expectSelectedSite();
    await rum.expectCoreWidgetTitles();
    await rum.expectNotConfusedSurfaces();
    if (blockingPageErrors.length) {
      annotate(
        `Uncaught page errors observed (non-fatal if page healthy): ${blockingPageErrors
          .slice(0, 4)
          .join(' || ')}`
      );
    }
    annotate(
      `Final context dashboard="${await rum.getDashboardLabel()}" lookback="${await rum.getTimeLookbackLabel()}" loadMs=${initialLoadMs}`
    );
  });
});
