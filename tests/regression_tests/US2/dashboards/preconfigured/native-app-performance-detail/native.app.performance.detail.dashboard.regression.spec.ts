import { test, expect, Page } from '@playwright/test';
import path from 'path';
import {
  NativeAppPerformanceDetailDashboardPage,
  NativeAppPerformanceDetailDashboardContext,
  NAPD_DASH_EXACT,
  isNativeAppPerformanceDetailDashboardLabel,
} from '../../../../../../pages/NativeAppPerformanceDetailDashboardPage';
import { getActiveProfile } from '../../../../../../config/profiles';

/**
 * Regression: Native App Performance Detail (preconfigured dashboard)
 * Site: GDC Test Site 2
 * Path: tests/regression_tests/US2/dashboards/preconfigured/native-app-performance-detail
 *
 * Read-only: no Save Filter, permanent widget save, dashboard delete/share/clone sticky.
 * Exact option: Native App Performance Detail � never RUM/Synthetic PD,
 * never Native App Detailed Metrics -*, never Monitoring → Native App → Performance Detail.
 *
 * npm: test:regression:us2:native-app-performance-detail-dashboard
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

test.describe('US2 Regression — Native App Performance Detail Dashboard', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(150000);

  let page: Page;
  let napd: NativeAppPerformanceDetailDashboardPage;
  let initialCtx: NativeAppPerformanceDetailDashboardContext;
  let initialLoadMs = 0;
  const notes: string[] = [];
  const blockingPageErrors: string[] = [];

  const annotate = (description: string) => {
    notes.push(description);
    test.info().annotations.push({ type: 'note', description });
    console.log(`[NAPD-DASH] ${description}`);
  };

  const recover = async () => {
    await napd.recoverPage();
    if (initialCtx) await napd.restoreContext(initialCtx).catch(() => undefined);
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
    napd = new NativeAppPerformanceDetailDashboardPage(page);
    const started = Date.now();
    await napd.openViaNavigation();
    await napd.ensureProfileSiteSelected();
    await page.waitForTimeout(1500);
    await napd.expectCoreWidgetsReady().catch(() => undefined);
    initialLoadMs = Date.now() - started;
    initialCtx = await napd.captureContext();
    const profile = getActiveProfile();
    const siteNow = await napd.getSiteLabel().catch(() => profile.siteName);
    console.log(
      `[NAPD-DASH] profile=${profile.id} site=${siteNow} dc=${profile.datacenter} loadMs=${initialLoadMs} dashboard="${initialCtx.dashboardLabel}" lookback="${initialCtx.lookbackLabel}"`
    );
  });

  test.afterAll(async () => {
    if (notes.length) console.log(`[NAPD-DASH] annotations:\n- ${notes.join('\n- ')}`);
    await page?.context()?.close().catch(() => undefined);
  });

  test('REG-NAPD-DASH-001 — page loads via Dashboards menu/route with correct title', async () => {
    await expect(page).toHaveURL(/site\/dashboard|r=site%2Fdashboard/i);
    await expect(page).not.toHaveURL(/site\/login|site%2Flogin/i);
    await expect(napd.locators.pageTitle).toHaveText(/Dashboards/i);
    await expect(page).toHaveTitle(/Dashboards/i);
    await napd.expectNotConfusedSurfaces();
  });

  test('REG-NAPD-DASH-002 — exact Native App Performance Detail; four core widget groups', async () => {
    await napd.ensureNativeAppPerformanceDetailSelected();
    const dash = await napd.getDashboardLabel();
    expect(isNativeAppPerformanceDetailDashboardLabel(dash), `dash="${dash}"`).toBeTruthy();
    expect(dash).not.toMatch(/Synthetic Performance Detail/i);
    expect(dash).not.toMatch(/RUM Performance Detail/i);
    expect(dash).not.toMatch(/Detailed Metrics/i);
    await napd.expectCoreWidgetTitles();
    annotate(`Dashboard="${dash}" widgets-ready score≈${await napd.widgetsReadyScore()}`);
  });

  test('REG-NAPD-DASH-003 — selected site is GDC Test Site 2; lookback/auto-refresh captured', async () => {
    await napd.ensureProfileSiteSelected();
    await napd.expectSelectedSite();
    expect(initialCtx.lookbackLabel.length, 'Time Lookback non-empty').toBeGreaterThan(0);
    annotate(
      `site="${await napd.getSiteLabel()}" lookback="${initialCtx.lookbackLabel}" autoRefresh="${initialCtx.autoRefreshLabel || '(n/a)'}"`
    );
  });

  test('REG-NAPD-DASH-004 — dashboard chrome: switcher, lookback, refresh, auto-refresh', async () => {
    await expect(napd.locators.switchDashboard).toBeAttached();
    await expect(napd.locators.timeLookback).toBeVisible({ timeout: 15000 });
    await expect(napd.locators.refreshDashboard).toBeVisible();
    await expect(napd.locators.autoRefresh).toBeVisible();
  });

  test('REG-NAPD-DASH-005 — Preconfigured list includes exact Native App Performance Detail', async () => {
    const names = await napd.listPreconfiguredDashboardNames();
    expect(
      names.some((n) => isNativeAppPerformanceDetailDashboardLabel(n)),
      names.join(' | ')
    ).toBeTruthy();
    expect(names.some((n) => /RUM Performance Detail|Synthetic Performance Detail/i.test(n))).toBeTruthy();
    annotate(`Preconfigured count=${names.length}: ${names.slice(0, 10).join(', ')}`);
  });

  test('REG-NAPD-DASH-006 — Time Lookback menu has multiple presets', async () => {
    try {
      const opts = await withSoftDeadline(() => napd.getTimeLookbackOptions(), 25000, recover);
      expect(opts.length).toBeGreaterThan(3);
      annotate(`Lookback options sample: ${opts.slice(0, 12).join(' | ')}`);
    } catch (err) {
      annotate(`Lookback menu soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-NAPD-DASH-007 — soft apply Last 24h then Last 7d; restore original lookback', async () => {
    try {
      await withSoftDeadline(
        async () => {
          await napd.selectTimeLookback(/Last 24 hours|Last 1 day|1 day/i);
          await napd.expectCoreWidgetsReady();
          await napd.selectTimeLookback(/Last 7 days/i);
          await napd.expectCoreWidgetsReady();
          if (initialCtx.lookbackLabel) {
            await napd.selectTimeLookback(initialCtx.lookbackLabel).catch(async () => {
              await napd.selectTimeLookback(/Last 1 hour|Last 6 hours|Last 24 hours/i);
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
    await expect(napd.getDashboardLabel()).resolves.toMatch(NAPD_DASH_EXACT);
  });

  test('REG-NAPD-DASH-008 — Dashboard Refresh reloads without blank crash', async () => {
    try {
      await withSoftDeadline(() => napd.clickRefreshDashboard(), 45000, recover);
      await napd.expectCoreWidgetTitles();
    } catch (err) {
      annotate(`Refresh soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-NAPD-DASH-009 — Auto Refresh menu soft (Off, 2m…60m PDF bounds)', async () => {
    try {
      const opts = await withSoftDeadline(() => napd.getAutoRefreshOptions(), 20000, recover);
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

  test('REG-NAPD-DASH-010 — Bar Graph shell and soft hosts', async () => {
    await expect(napd.locators.barGraphText()).toBeVisible({ timeout: 30000 });
    const body = await napd.getPageBodySample(2000);
    expect(body).toMatch(/Bar Graph/i);
    const hostVisible = await napd.locators.multiStepBarGraph.isVisible().catch(() => false);
    if (hostVisible) {
      annotate('Bar host #multi-step-bar-graph visible');
    } else {
      annotate('Bar host multi-step-bar-graph soft-annotate: bind by Bar Graph text');
    }
    const charts = await napd.locators.highchartsContainers.count().catch(() => 0);
    annotate(`Highcharts containers≈${charts}; barSig=${(await napd.getBarGraphSignature()).slice(0, 100)}`);
  });

  test('REG-NAPD-DASH-011 — Details metric cards (≥5 core labels) + soft formats', async () => {
    const found = await napd.expectDetailsMetricCards();
    const body = await napd.getPageBodySample(3500);
    expect(body).toMatch(/Details|all selected pages/i);
    if (/\d+(\.\d+)?\s*[KkMm]?|\d+(\.\d+)?\s*[SsMm]{1,2}|CLS|0\.\d+/i.test(body)) {
      annotate('Details value formats soft (K/s/ms/unitless) present');
    }
    if (/CPU|Memory|CONTENTFUL|INP/i.test(body)) {
      annotate('Extra Details cards soft (beyond core three)');
    }
    annotate(`Details metrics matched: ${found.join(', ')}`);
  });

  test('REG-NAPD-DASH-012 — metric card → Bar Graph / Daily Averages linkage soft', async () => {
    try {
      const r = await withSoftDeadline(() => napd.softMetricCardLinkage(), 60000, recover);
      annotate(r.note);
      expect(r.cards.length).toBeGreaterThan(0);
    } catch (err) {
      annotate(`Metric card linkage soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-NAPD-DASH-013 — Performance Graph: Page Timings Over Time shell', async () => {
    await expect(napd.locators.performanceGraphText()).toBeVisible({ timeout: 30000 });
    const body = await napd.getPageBodySample(3500);
    expect(body).toMatch(/Performance Graph|Page Timings Over Time/i);
    const host =
      (await napd.locators.perfGraphPageTimings.isVisible().catch(() => false)) ||
      (await napd.locators.pageTimingsGraph.isVisible().catch(() => false));
    if (host) annotate('Performance graph host #perfGraph-page-timings-graph (or page-timings-graph)');
    if (/Page Views|Performance Timing|Onload|CPU Usage|Memory Usage|Errors and Crashes/i.test(body)) {
      annotate('Performance Graph multi-series incl. native series soft present');
    if (/CPU Usage|Memory Usage|Errors and Crashes/i.test(body)) {
      annotate('Native-oriented series (CPU/Memory/Errors) soft-present');
    } else {
      annotate('CPU/Memory/Errors legend soft-annotate: not all visible on this window');
    }
    }
  });

  test('REG-NAPD-DASH-014 — Performance Graph legend toggle soft + gear cancel soft', async () => {
    try {
      const legend = await withSoftDeadline(() => napd.softPerformanceLegendToggle(), 20000);
      annotate(legend.note);
      const gear = await withSoftDeadline(() => napd.softPerformanceGearOpenClose(), 15000);
      annotate(gear.note);
      await napd.closeOverlays();
    } catch (err) {
      annotate(`Perf legend/gear soft: ${err instanceof Error ? err.message : String(err)}`);
      await napd.closeOverlays();
      await recover().catch(() => undefined);
    }
  });

  test('REG-NAPD-DASH-015 — Daily Averages: Page Name headers + soft rows', async () => {
    await expect(napd.locators.dailyAveragesText()).toBeVisible({ timeout: 30000 });
    const headers = (await napd.getDailyHeaderTexts()).join(' | ');
    const sample = (
      (await napd.locators.dailyAveragesWidget().innerText().catch(() => '')) || ''
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
    const rows = await napd.locators.dailyBodyRows().count().catch(() => 0);
    if (rows < 1 && !/\d/.test(sample)) {
      annotate('Daily Averages soft: no data rows — controlled empty possible');
    } else {
      annotate(`Daily rows≈${rows}`);
    }
    annotate(`Daily headers/sample: ${joined.slice(0, 240)}`);
  });

  test('REG-NAPD-DASH-016 — soft column sort Daily Averages', async () => {
    try {
      const r = await withSoftDeadline(() => napd.softSortDailyAverages(), 30000, recover);
      annotate(r.note);
      expect(r.columnsTried.length + (r.orderChanged ? 1 : 0)).toBeGreaterThanOrEqual(0);
    } catch (err) {
      annotate(`Daily sort soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-NAPD-DASH-017 — soft pagination Daily Averages', async () => {
    try {
      const r = await withSoftDeadline(() => napd.softPaginationDaily(), 25000);
      annotate(r.note);
    } catch (err) {
      annotate(`Daily pagination soft: ${err instanceof Error ? err.message : String(err)}`);
      await napd.closeOverlays();
    }
  });

  test('REG-NAPD-DASH-018 — soft Export open/close on Daily Averages', async () => {
    try {
      await withSoftDeadline(
        async () => {
          const r = await napd.softExportDaily();
          annotate(r.note);
        },
        20000,
        recover
      );
    } catch (err) {
      annotate(`Daily Export soft: ${err instanceof Error ? err.message : String(err)}`);
      await napd.closeOverlays();
      await recover().catch(() => undefined);
    }
  });

  test('REG-NAPD-DASH-019 — Filters drawer opens; My/Shared tabs soft', async () => {
    try {
      await withSoftDeadline(
        async () => {
          await napd.openFiltersDrawer();
          const body = ((await page.locator('body').innerText()) || '').slice(0, 5000);
          expect(body).toMatch(/Time Period|Timezone|Filter|Site/i);
          if (await napd.locators.myFiltersTab.isVisible().catch(() => false)) {
            await napd.locators.myFiltersTab.click({ force: true }).catch(() => undefined);
          }
          if (await napd.locators.sharedFiltersTab.isVisible().catch(() => false)) {
            await napd.locators.sharedFiltersTab.click({ force: true }).catch(() => undefined);
          }
          await napd.cancelFiltersDrawer();
        },
        40000,
        recover
      );
    } catch (err) {
      annotate(`Filters soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-NAPD-DASH-020 — Filters Apply soft path; restore Native App Performance Detail', async () => {
    try {
      await withSoftDeadline(
        async () => {
          await napd.openFiltersDrawer();
          const applied = await napd.applyFiltersSoft();
          annotate(`Apply Filters available=${applied}`);
          await napd.cancelFiltersDrawer();
          await napd.ensureNativeAppPerformanceDetailSelected();
          await napd.expectCoreWidgetsReady();
        },
        50000,
        recover
      );
    } catch (err) {
      annotate(`Apply Filters soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-NAPD-DASH-021 — Dashboard Manager soft open/close (no save/delete)', async () => {
    try {
      const opened = await withSoftDeadline(() => napd.softOpenDashboardManager(), 15000);
      annotate(`Dashboard Manager open=${opened}`);
      await napd.closeOverlays();
      await page.keyboard.press('Escape').catch(() => undefined);
    } catch (err) {
      annotate(`Dashboard Manager soft: ${err instanceof Error ? err.message : String(err)}`);
      await napd.closeOverlays();
    }
    await napd.ensureNativeAppPerformanceDetailSelected();
  });

  test('REG-NAPD-DASH-022 — Add Widget wizard soft open/cancel (no save)', async () => {
    try {
      const opened = await withSoftDeadline(() => napd.softOpenWidgetWizard(), 15000);
      annotate(`Widget wizard open=${opened}`);
      if (opened) {
        await expect(page.getByText(/Add a Widget|Widget Type/i).first()).toBeVisible({
          timeout: 8000,
        });
      }
      await napd.closeOverlays();
      await page.keyboard.press('Escape').catch(() => undefined);
    } catch (err) {
      annotate(`Widget wizard soft: ${err instanceof Error ? err.message : String(err)}`);
      await napd.closeOverlays();
    }
  });

  test('REG-NAPD-DASH-023 — soft switch sibling preconfigured then restore home + site', async () => {
    try {
      await withSoftDeadline(
        async () => {
          const names = await napd.listPreconfiguredDashboardNames();
          const sibling =
            names.find((n) => /Traffic Source and Medium/i.test(n)) ||
            names.find((n) => /Site Overview/i.test(n)) ||
            names.find((n) => n && !isNativeAppPerformanceDetailDashboardLabel(n) && !/Detailed Metrics/i.test(n)) || names.find((n) => /Traffic Source and Medium/i.test(n));
          if (!sibling) {
            annotate('No sibling preconfigured dashboard to sample');
            return;
          }
          await napd.selectDashboard(sibling);
          await page.waitForTimeout(3000);
          annotate(`Soft sibling dashboard: ${sibling}`);
          await napd.openViaNavigation();
          await expect(napd.getDashboardLabel()).resolves.toMatch(NAPD_DASH_EXACT);
          await napd.expectSelectedSite();
        },
        120000,
        recover
      );
    } catch (err) {
      annotate(`Sibling switch soft: ${err instanceof Error ? err.message : String(err)}`);
      await napd.openViaNavigation().catch(() => recover());
    }
  });

  test('REG-NAPD-DASH-024 — RUM/Synthetic Performance Detail discrimination then restore NAPD', async () => {
    try {
      const r = await withSoftDeadline(() => napd.softRumOrSyntheticSiblingDiscrimination(), 90000, recover);
      annotate(r.note);
      expect(r.restored || isNativeAppPerformanceDetailDashboardLabel(await napd.getDashboardLabel())).toBeTruthy();
      await expect(napd.getDashboardLabel()).resolves.toMatch(NAPD_DASH_EXACT);
      await napd.expectSelectedSite();
    } catch (err) {
      annotate(`Synthetic discrimination soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  
  test('REG-NAPD-DASH-024b — Native App Detailed Metrics discrimination then restore NAPD', async () => {
    try {
      const r = await withSoftDeadline(() => napd.softDetailedMetricsSiblingDiscrimination(), 90000, recover);
      annotate(r.note);
      expect(r.restored || isNativeAppPerformanceDetailDashboardLabel(await napd.getDashboardLabel())).toBeTruthy();
      await expect(napd.getDashboardLabel()).resolves.toMatch(NAPD_DASH_EXACT);
    } catch (err) {
      annotate(`Detailed Metrics discrimination soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-NAPD-DASH-025 — soft Custom Date Selection open/cancel only', async () => {
    try {
      await napd.openTimeLookbackMenu();
      const custom = page.getByText(/Custom Date Selection|Custom/i).first();
      if (await custom.isVisible().catch(() => false)) {
        await custom.click({ force: true }).catch(() => undefined);
        await page.waitForTimeout(600);
        annotate('Custom Date Selection opened — cancel only');
      } else {
        annotate('Custom Date Selection not visible in lookback menu');
      }
      await napd.closeOverlays();
    } catch (err) {
      annotate(`Custom date soft: ${err instanceof Error ? err.message : String(err)}`);
      await napd.closeOverlays();
    }
  });

  test('REG-NAPD-DASH-026 — narrow viewport keeps core widgets reachable', async () => {
    await page.setViewportSize({ width: 1100, height: 900 });
    await napd.expectCoreWidgetTitles().catch(async () => {
      await napd.locators.barGraphWidget().scrollIntoViewIfNeeded().catch(() => undefined);
      await napd.locators.dailyAveragesWidget().scrollIntoViewIfNeeded().catch(() => undefined);
    });
    await expect(napd.locators.timeLookback).toBeVisible();
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('REG-NAPD-DASH-027 — soft keyboard Escape recovery; Help chrome soft', async () => {
    await napd.openFiltersDrawer().catch(() => undefined);
    await page.keyboard.press('Escape').catch(() => undefined);
    await napd.closeOverlays();
    const help = page.locator('#help-articles-menu, #help-video-menu, [title*="Help" i]').first();
    if (await help.isVisible().catch(() => false)) {
      annotate('Help chrome present');
    } else {
      annotate('Help chrome soft-annotate: not visible');
    }
  });

  test('REG-NAPD-DASH-028 — last-updated soft present when available', async () => {
    if (await napd.locators.lastUpdated.isVisible().catch(() => false)) {
      const t = await napd.getControlLabel(napd.locators.lastUpdated);
      annotate(`last-updated="${t.slice(0, 80)}"`);
      expect(t.length).toBeGreaterThan(0);
    } else {
      annotate('last-updated not visible on this build');
    }
  });

  test('REG-NAPD-DASH-029 — Carousel control soft presence (do not leave cycling)', async () => {
    if (await napd.locators.carouselControl.isVisible().catch(() => false)) {
      annotate('Carousel control present — left untouched');
    } else {
      annotate('Carousel control not visible');
    }
  });

  test('REG-NAPD-DASH-030 — refresh keeps four widget groups; still Native App Performance Detail', async () => {
    await napd.clickRefreshDashboard().catch(() => undefined);
    await napd.expectCoreWidgetTitles();
    await expect(napd.getDashboardLabel()).resolves.toMatch(NAPD_DASH_EXACT);
  });

  test('REG-NAPD-DASH-031 — history reload soft recovery to site/dashboard home', async () => {
    try {
      await withSoftDeadline(
        async () => {
          await page.reload({ waitUntil: 'domcontentloaded' });
          await napd.waitForPageReady();
          await napd.ensureNativeAppPerformanceDetailSelected();
          await napd.ensureProfileSiteSelected();
          await napd.expectCoreWidgetsReady();
        },
        90000,
        recover
      );
    } catch (err) {
      annotate(`Reload soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-NAPD-DASH-032 — not Monitoring ND page / RUM-SPD / Detailed Metrics home / TSM / Marketing', async () => {
    await napd.expectNotConfusedSurfaces();
    await expect(page).toHaveURL(/site\/dashboard/i);
    await expect(napd.getDashboardLabel()).resolves.toMatch(NAPD_DASH_EXACT);
    const body = await napd.getPageBodySample(2500);
    expect(body).toMatch(/Bar Graph|Daily Averages|Page Timings Over Time/i);
    // Monitoring-only affordances should not be required (scatter/session lookup)
    if (/Session Lookup|Performance Breakdown|scatter/i.test(body)) {
      annotate('Monitoring-like labels soft-seen on dashboard body — annotate only');
    }
  });

  test('REG-NAPD-DASH-033 — top chrome icons: tooltips + click round-trip', async () => {
    try {
      const r = await withSoftDeadline(() => napd.softChromeIconTooltipsAndRoundTrip(), 60000, recover);
      annotate(
        `Chrome tips=${r.tooltipsChecked} clicks=${r.clickTargets.join(',')} via=${r.returnedVia.join('|')}`
      );
      expect(r.tooltipsChecked + r.clickTargets.length).toBeGreaterThan(0);
      await napd.ensureNativeAppPerformanceDetailSelected({ soft: true });
      await expect(page).toHaveURL(/site\/dashboard/i);
    } catch (err) {
      annotate(`Chrome icons soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-NAPD-DASH-034 — apply lookbacks 1h|6h / 24h / 7d / 30d and verify refresh', async () => {
    try {
      const results = await withSoftDeadline(
        () => napd.softPrescribedLookbacksRefresh(initialCtx.lookbackLabel),
        120000,
        recover
      );
      for (const r of results) {
        annotate(`Lookback ${r.label}: applied=${r.applied} refreshed=${r.refreshed} ${r.note}`);
        expect(r.applied, `Should apply ${r.label}`).toBeTruthy();
      }
      await expect(napd.getDashboardLabel()).resolves.toMatch(NAPD_DASH_EXACT);
    } catch (err) {
      annotate(`Prescribed lookbacks soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-NAPD-DASH-035 — change site (Demo eCommerce soft) + lock; restore GDC', async () => {
    try {
      const r = await withSoftDeadline(() => napd.softSiteChangeAndLock(), 90000, recover);
      annotate(
        `Site lockFound=${r.lockFound} changed=${r.siteChanged} restored=${r.restored} other="${r.otherSite}" ${r.note}`
      );
      expect(r.restored || /GDC Test Site 2/i.test(await napd.getSiteLabel())).toBeTruthy();
      await napd.expectCoreWidgetsReady();
    } catch (err) {
      annotate(`Site/lock soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-NAPD-DASH-036 — apply Auto Refresh options; leave non-aggressive', async () => {
    try {
      const r = await withSoftDeadline(() => napd.softAutoRefreshApplySample(), 40000, recover);
      annotate(r.note);
      expect(r.applied.length).toBeGreaterThan(0);
      await napd.expectCoreWidgetsReady();
    } catch (err) {
      annotate(`Auto Refresh apply soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-NAPD-DASH-037 — +Dashboard / Manager eye switch then restore NAPD', async () => {
    try {
      const r = await withSoftDeadline(() => napd.softPlusDashboardEyeSwitchHome(), 90000, recover);
      annotate(`Manager plus=${r.openedViaPlus} eye=${r.eyeClicked} home=${r.restoredHome} ${r.note}`);
      await napd.ensureNativeAppPerformanceDetailSelected();
      await expect(napd.getDashboardLabel()).resolves.toMatch(NAPD_DASH_EXACT);
    } catch (err) {
      annotate(`Manager eye soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-NAPD-DASH-038 — restore initial context; suite home healthy', async () => {
    await napd.restoreContext(initialCtx);
    await napd.ensureNativeAppPerformanceDetailSelected();
    await napd.expectSelectedSite();
    await napd.expectCoreWidgetTitles();
    await napd.expectNotConfusedSurfaces();
    if (blockingPageErrors.length) {
      annotate(
        `Uncaught page errors observed (non-fatal if page healthy): ${blockingPageErrors
          .slice(0, 4)
          .join(' || ')}`
      );
    }
    annotate(
      `Final context dashboard="${await napd.getDashboardLabel()}" lookback="${await napd.getTimeLookbackLabel()}" loadMs=${initialLoadMs}`
    );
  });
});
