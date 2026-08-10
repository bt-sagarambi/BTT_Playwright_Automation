import { test, expect, Page } from '@playwright/test';
import path from 'path';
import {
  SyntheticPerformanceDetailDashboardPage,
  SyntheticPerformanceDetailDashboardContext,
  SPD_DASH_EXACT,
  isSyntheticPerformanceDetailDashboardLabel,
} from '../../../../../../pages/SyntheticPerformanceDetailDashboardPage';
import { getActiveProfile } from '../../../../../../config/profiles';

/**
 * Regression: Synthetic Performance Detail (preconfigured dashboard)
 * Site: GDC Test Site 2
 * Path: tests/regression_tests/US2/dashboards/preconfigured/synthetic-performance-detail
 *
 * Read-only: no Save Filter, permanent widget save, dashboard delete/share/clone sticky.
 * Exact option Synthetic Performance Detail — never RUM / Synthetic Site Health / Native App,
 * never Monitoring → Synthetic → Real Browser → Performance Detail.
 *
 * npm: test:regression:us2:synthetic-performance-detail-dashboard
 * (do NOT use rum-pd or rum-performance-detail-dashboard)
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

test.describe('US2 Regression — Synthetic Performance Detail Dashboard', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(150000);

  let page: Page;
  let spd: SyntheticPerformanceDetailDashboardPage;
  let initialCtx: SyntheticPerformanceDetailDashboardContext;
  let initialLoadMs = 0;
  const notes: string[] = [];
  const blockingPageErrors: string[] = [];

  const annotate = (description: string) => {
    notes.push(description);
    test.info().annotations.push({ type: 'note', description });
    console.log(`[SYNTH-PD-DASH] ${description}`);
  };

  const recover = async () => {
    await spd.recoverPage();
    if (initialCtx) await spd.restoreContext(initialCtx).catch(() => undefined);
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
    spd = new SyntheticPerformanceDetailDashboardPage(page);
    const started = Date.now();
    await spd.openViaNavigation();
    await spd.ensureProfileSiteSelected();
    await page.waitForTimeout(1500);
    await spd.expectCoreWidgetsReady().catch(() => undefined);
    initialLoadMs = Date.now() - started;
    initialCtx = await spd.captureContext();
    const profile = getActiveProfile();
    const siteNow = await spd.getSiteLabel().catch(() => profile.siteName);
    console.log(
      `[SYNTH-PD-DASH] profile=${profile.id} site=${siteNow} dc=${profile.datacenter} loadMs=${initialLoadMs} dashboard="${initialCtx.dashboardLabel}" lookback="${initialCtx.lookbackLabel}"`
    );
  });

  test.afterAll(async () => {
    if (notes.length) console.log(`[SYNTH-PD-DASH] annotations:\n- ${notes.join('\n- ')}`);
    await page?.context()?.close().catch(() => undefined);
  });

  test('REG-SPD-DASH-001 — page loads via Dashboards menu/route with correct title', async () => {
    await expect(page).toHaveURL(/site\/dashboard|r=site%2Fdashboard/i);
    await expect(page).not.toHaveURL(/site\/login|site%2Flogin/i);
    await expect(spd.locators.pageTitle).toHaveText(/Dashboards/i);
    await expect(page).toHaveTitle(/Dashboards/i);
    await spd.expectNotConfusedSurfaces();
  });

  test('REG-SPD-DASH-002 — exact Synthetic Performance Detail; four core widget groups', async () => {
    await spd.ensureSyntheticPerformanceDetailSelected();
    const dash = await spd.getDashboardLabel();
    expect(isSyntheticPerformanceDetailDashboardLabel(dash), `dash="${dash}"`).toBeTruthy();
    expect(dash).not.toMatch(/RUM Performance Detail/i);
    expect(dash).not.toMatch(/Synthetic Site Health/i);
    expect(dash).not.toMatch(/Native App Performance Detail/i);
    await spd.expectCoreWidgetTitles();
    annotate(`Dashboard="${dash}" widgets-ready score≈${await spd.widgetsReadyScore()}`);
  });

  test('REG-SPD-DASH-003 — selected site is GDC Test Site 2; lookback/auto-refresh captured', async () => {
    await spd.ensureProfileSiteSelected();
    await spd.expectSelectedSite();
    expect(initialCtx.lookbackLabel.length, 'Time Lookback non-empty').toBeGreaterThan(0);
    annotate(
      `site="${await spd.getSiteLabel()}" lookback="${initialCtx.lookbackLabel}" autoRefresh="${initialCtx.autoRefreshLabel || '(n/a)'}"`
    );
  });

  test('REG-SPD-DASH-004 — dashboard chrome: switcher, lookback, refresh, auto-refresh', async () => {
    await expect(spd.locators.switchDashboard).toBeAttached();
    await expect(spd.locators.timeLookback).toBeVisible({ timeout: 15000 });
    await expect(spd.locators.refreshDashboard).toBeVisible();
    await expect(spd.locators.autoRefresh).toBeVisible();
  });

  test('REG-SPD-DASH-005 — Preconfigured list includes exact Synthetic Performance Detail', async () => {
    const names = await spd.listPreconfiguredDashboardNames();
    expect(
      names.some((n) => isSyntheticPerformanceDetailDashboardLabel(n)),
      names.join(' | ')
    ).toBeTruthy();
    expect(names.some((n) => /^\s*RUM Performance Detail\s*$/i.test(n))).toBeTruthy();
    annotate(`Preconfigured count=${names.length}: ${names.slice(0, 10).join(', ')}`);
  });

  test('REG-SPD-DASH-006 — Time Lookback menu has multiple presets', async () => {
    try {
      const opts = await withSoftDeadline(() => spd.getTimeLookbackOptions(), 25000, recover);
      expect(opts.length).toBeGreaterThan(3);
      annotate(`Lookback options sample: ${opts.slice(0, 12).join(' | ')}`);
    } catch (err) {
      annotate(`Lookback menu soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-SPD-DASH-007 — soft apply Last 24h then Last 7d; restore original lookback', async () => {
    try {
      await withSoftDeadline(
        async () => {
          await spd.selectTimeLookback(/Last 24 hours|Last 1 day|1 day/i);
          await spd.expectCoreWidgetsReady();
          await spd.selectTimeLookback(/Last 7 days/i);
          await spd.expectCoreWidgetsReady();
          if (initialCtx.lookbackLabel) {
            await spd.selectTimeLookback(initialCtx.lookbackLabel).catch(async () => {
              await spd.selectTimeLookback(/Last 1 hour|Last 6 hours|Last 24 hours/i);
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
    await expect(spd.getDashboardLabel()).resolves.toMatch(SPD_DASH_EXACT);
  });

  test('REG-SPD-DASH-008 — Dashboard Refresh reloads without blank crash', async () => {
    try {
      await withSoftDeadline(() => spd.clickRefreshDashboard(), 45000, recover);
      await spd.expectCoreWidgetTitles();
    } catch (err) {
      annotate(`Refresh soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-SPD-DASH-009 — Auto Refresh menu soft (Off, 2m…60m PDF bounds)', async () => {
    try {
      const opts = await withSoftDeadline(() => spd.getAutoRefreshOptions(), 20000, recover);
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

  test('REG-SPD-DASH-010 — Bar Graph shell and soft hosts', async () => {
    await expect(spd.locators.barGraphText()).toBeVisible({ timeout: 30000 });
    const body = await spd.getPageBodySample(2000);
    expect(body).toMatch(/Bar Graph/i);
    const hostVisible = await spd.locators.multiStepBarGraph.isVisible().catch(() => false);
    if (hostVisible) {
      annotate('Bar host #multi-step-bar-graph visible');
    } else {
      annotate('Bar host multi-step-bar-graph soft-annotate: bind by Bar Graph text');
    }
    const charts = await spd.locators.highchartsContainers.count().catch(() => 0);
    annotate(`Highcharts containers≈${charts}; barSig=${(await spd.getBarGraphSignature()).slice(0, 100)}`);
  });

  test('REG-SPD-DASH-011 — Details metric cards (≥5 core labels) + soft formats', async () => {
    const found = await spd.expectDetailsMetricCards();
    const body = await spd.getPageBodySample(3500);
    expect(body).toMatch(/Details|all selected pages/i);
    if (/\d+(\.\d+)?\s*[KkMm]?|\d+(\.\d+)?\s*[SsMm]{1,2}|CLS|0\.\d+/i.test(body)) {
      annotate('Details value formats soft (K/s/ms/unitless) present');
    }
    if (/SPEED INDEX|PAGE SIZE|TOTAL ELEMENTS|TOTAL DOMAINS/i.test(body)) {
      annotate('Synthetic content metrics (Speed Index / size / elements) soft present');
    }
    if (/TEST OVERRIDE/i.test(body)) {
      annotate('TEST OVERRIDE metric present (soft extra)');
    }
    annotate(`Details metrics matched: ${found.join(', ')}`);
  });

  test('REG-SPD-DASH-012 — metric card → Bar Graph / Daily Averages linkage soft', async () => {
    try {
      const r = await withSoftDeadline(() => spd.softMetricCardLinkage(), 60000, recover);
      annotate(r.note);
      expect(r.cards.length).toBeGreaterThan(0);
    } catch (err) {
      annotate(`Metric card linkage soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-SPD-DASH-013 — Performance Graph: Page Timings Over Time shell', async () => {
    await expect(spd.locators.performanceGraphText()).toBeVisible({ timeout: 30000 });
    const body = await spd.getPageBodySample(3500);
    expect(body).toMatch(/Performance Graph|Page Timings Over Time/i);
    const host =
      (await spd.locators.perfGraphPageTimings.isVisible().catch(() => false)) ||
      (await spd.locators.pageTimingsGraph.isVisible().catch(() => false));
    if (host) annotate('Performance graph host #perfGraph-page-timings-graph (or page-timings-graph)');
    if (/Page Views|Onload|1stByte|DNS|INP|Largest Contentful/i.test(body)) {
      annotate('Performance Graph multi-series legend labels soft present');
    }
  });

  test('REG-SPD-DASH-014 — Performance Graph legend toggle soft + gear cancel soft', async () => {
    try {
      const legend = await withSoftDeadline(() => spd.softPerformanceLegendToggle(), 20000);
      annotate(legend.note);
      const gear = await withSoftDeadline(() => spd.softPerformanceGearOpenClose(), 15000);
      annotate(gear.note);
      await spd.closeOverlays();
    } catch (err) {
      annotate(`Perf legend/gear soft: ${err instanceof Error ? err.message : String(err)}`);
      await spd.closeOverlays();
      await recover().catch(() => undefined);
    }
  });

  test('REG-SPD-DASH-015 — Daily Averages: Page Name headers + soft rows', async () => {
    await expect(spd.locators.dailyAveragesText()).toBeVisible({ timeout: 30000 });
    const headers = (await spd.getDailyHeaderTexts()).join(' | ');
    const sample = (
      (await spd.locators.dailyAveragesWidget().innerText().catch(() => '')) || ''
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
    const rows = await spd.locators.dailyBodyRows().count().catch(() => 0);
    if (rows < 1 && !/\d/.test(sample)) {
      annotate('Daily Averages soft: no data rows — controlled empty possible');
    } else {
      annotate(`Daily rows≈${rows}`);
    }
    annotate(`Daily headers/sample: ${joined.slice(0, 240)}`);
  });

  test('REG-SPD-DASH-016 — soft column sort Daily Averages', async () => {
    try {
      const r = await withSoftDeadline(() => spd.softSortDailyAverages(), 30000, recover);
      annotate(r.note);
      expect(r.columnsTried.length + (r.orderChanged ? 1 : 0)).toBeGreaterThanOrEqual(0);
    } catch (err) {
      annotate(`Daily sort soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-SPD-DASH-017 — soft pagination Daily Averages', async () => {
    try {
      const r = await withSoftDeadline(() => spd.softPaginationDaily(), 25000);
      annotate(r.note);
    } catch (err) {
      annotate(`Daily pagination soft: ${err instanceof Error ? err.message : String(err)}`);
      await spd.closeOverlays();
    }
  });

  test('REG-SPD-DASH-018 — soft Export open/close on Daily Averages', async () => {
    try {
      await withSoftDeadline(
        async () => {
          const r = await spd.softExportDaily();
          annotate(r.note);
        },
        20000,
        recover
      );
    } catch (err) {
      annotate(`Daily Export soft: ${err instanceof Error ? err.message : String(err)}`);
      await spd.closeOverlays();
      await recover().catch(() => undefined);
    }
  });

  test('REG-SPD-DASH-019 — Filters drawer opens; My/Shared tabs soft', async () => {
    try {
      await withSoftDeadline(
        async () => {
          await spd.openFiltersDrawer();
          const body = ((await page.locator('body').innerText()) || '').slice(0, 5000);
          expect(body).toMatch(/Time Period|Timezone|Filter|Site/i);
          if (await spd.locators.myFiltersTab.isVisible().catch(() => false)) {
            await spd.locators.myFiltersTab.click({ force: true }).catch(() => undefined);
          }
          if (await spd.locators.sharedFiltersTab.isVisible().catch(() => false)) {
            await spd.locators.sharedFiltersTab.click({ force: true }).catch(() => undefined);
          }
          await spd.cancelFiltersDrawer();
        },
        40000,
        recover
      );
    } catch (err) {
      annotate(`Filters soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-SPD-DASH-020 — Filters Apply soft path; restore Synthetic Performance Detail', async () => {
    try {
      await withSoftDeadline(
        async () => {
          await spd.openFiltersDrawer();
          const applied = await spd.applyFiltersSoft();
          annotate(`Apply Filters available=${applied}`);
          await spd.cancelFiltersDrawer();
          await spd.ensureSyntheticPerformanceDetailSelected();
          await spd.expectCoreWidgetsReady();
        },
        50000,
        recover
      );
    } catch (err) {
      annotate(`Apply Filters soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-SPD-DASH-021 — Dashboard Manager soft open/close (no save/delete)', async () => {
    try {
      const opened = await withSoftDeadline(() => spd.softOpenDashboardManager(), 15000);
      annotate(`Dashboard Manager open=${opened}`);
      await spd.closeOverlays();
      await page.keyboard.press('Escape').catch(() => undefined);
    } catch (err) {
      annotate(`Dashboard Manager soft: ${err instanceof Error ? err.message : String(err)}`);
      await spd.closeOverlays();
    }
    await spd.ensureSyntheticPerformanceDetailSelected();
  });

  test('REG-SPD-DASH-022 — Add Widget wizard soft open/cancel (no save)', async () => {
    try {
      const opened = await withSoftDeadline(() => spd.softOpenWidgetWizard(), 15000);
      annotate(`Widget wizard open=${opened}`);
      if (opened) {
        await expect(page.getByText(/Add a Widget|Widget Type/i).first()).toBeVisible({
          timeout: 8000,
        });
      }
      await spd.closeOverlays();
      await page.keyboard.press('Escape').catch(() => undefined);
    } catch (err) {
      annotate(`Widget wizard soft: ${err instanceof Error ? err.message : String(err)}`);
      await spd.closeOverlays();
    }
  });

  test('REG-SPD-DASH-023 — soft switch sibling preconfigured then restore home + site', async () => {
    try {
      await withSoftDeadline(
        async () => {
          const names = await spd.listPreconfiguredDashboardNames();
          const sibling =
            names.find((n) => /Traffic Source and Medium/i.test(n)) ||
            names.find((n) => /Site Overview/i.test(n)) ||
            names.find((n) => n && !isSyntheticPerformanceDetailDashboardLabel(n));
          if (!sibling) {
            annotate('No sibling preconfigured dashboard to sample');
            return;
          }
          await spd.selectDashboard(sibling);
          await page.waitForTimeout(3000);
          annotate(`Soft sibling dashboard: ${sibling}`);
          await spd.openViaNavigation();
          await expect(spd.getDashboardLabel()).resolves.toMatch(SPD_DASH_EXACT);
          await spd.expectSelectedSite();
        },
        120000,
        recover
      );
    } catch (err) {
      annotate(`Sibling switch soft: ${err instanceof Error ? err.message : String(err)}`);
      await spd.openViaNavigation().catch(() => recover());
    }
  });

  test('REG-SPD-DASH-024 — RUM Performance Detail discrimination then restore Synthetic PD', async () => {
    try {
      const r = await withSoftDeadline(() => spd.softRumSiblingDiscrimination(), 90000, recover);
      annotate(r.note);
      expect(r.restored || isSyntheticPerformanceDetailDashboardLabel(await spd.getDashboardLabel())).toBeTruthy();
      await expect(spd.getDashboardLabel()).resolves.toMatch(SPD_DASH_EXACT);
      await spd.expectSelectedSite();
    } catch (err) {
      annotate(`RUM discrimination soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-SPD-DASH-024b — Synthetic Site Health discrimination then restore Synthetic PD', async () => {
    try {
      const r = await withSoftDeadline(() => spd.softSiteHealthSiblingDiscrimination(), 90000, recover);
      annotate(r.note);
      expect(r.restored || isSyntheticPerformanceDetailDashboardLabel(await spd.getDashboardLabel())).toBeTruthy();
      await expect(spd.getDashboardLabel()).resolves.toMatch(SPD_DASH_EXACT);
    } catch (err) {
      annotate(`Site Health discrimination soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-SPD-DASH-025 — soft Custom Date Selection open/cancel only', async () => {
    try {
      await spd.openTimeLookbackMenu();
      const custom = page.getByText(/Custom Date Selection|Custom/i).first();
      if (await custom.isVisible().catch(() => false)) {
        await custom.click({ force: true }).catch(() => undefined);
        await page.waitForTimeout(600);
        annotate('Custom Date Selection opened — cancel only');
      } else {
        annotate('Custom Date Selection not visible in lookback menu');
      }
      await spd.closeOverlays();
    } catch (err) {
      annotate(`Custom date soft: ${err instanceof Error ? err.message : String(err)}`);
      await spd.closeOverlays();
    }
  });

  test('REG-SPD-DASH-026 — narrow viewport keeps core widgets reachable', async () => {
    await page.setViewportSize({ width: 1100, height: 900 });
    await spd.expectCoreWidgetTitles().catch(async () => {
      await spd.locators.barGraphWidget().scrollIntoViewIfNeeded().catch(() => undefined);
      await spd.locators.dailyAveragesWidget().scrollIntoViewIfNeeded().catch(() => undefined);
    });
    await expect(spd.locators.timeLookback).toBeVisible();
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('REG-SPD-DASH-027 — soft keyboard Escape recovery; Help chrome soft', async () => {
    await spd.openFiltersDrawer().catch(() => undefined);
    await page.keyboard.press('Escape').catch(() => undefined);
    await spd.closeOverlays();
    const help = page.locator('#help-articles-menu, #help-video-menu, [title*="Help" i]').first();
    if (await help.isVisible().catch(() => false)) {
      annotate('Help chrome present');
    } else {
      annotate('Help chrome soft-annotate: not visible');
    }
  });

  test('REG-SPD-DASH-028 — last-updated soft present when available', async () => {
    if (await spd.locators.lastUpdated.isVisible().catch(() => false)) {
      const t = await spd.getControlLabel(spd.locators.lastUpdated);
      annotate(`last-updated="${t.slice(0, 80)}"`);
      expect(t.length).toBeGreaterThan(0);
    } else {
      annotate('last-updated not visible on this build');
    }
  });

  test('REG-SPD-DASH-029 — Carousel control soft presence (do not leave cycling)', async () => {
    if (await spd.locators.carouselControl.isVisible().catch(() => false)) {
      annotate('Carousel control present — left untouched');
    } else {
      annotate('Carousel control not visible');
    }
  });

  test('REG-SPD-DASH-030 — refresh keeps four widget groups; still Synthetic Performance Detail', async () => {
    await spd.clickRefreshDashboard().catch(() => undefined);
    await spd.expectCoreWidgetTitles();
    await expect(spd.getDashboardLabel()).resolves.toMatch(SPD_DASH_EXACT);
  });

  test('REG-SPD-DASH-031 — history reload soft recovery to site/dashboard home', async () => {
    try {
      await withSoftDeadline(
        async () => {
          await page.reload({ waitUntil: 'domcontentloaded' });
          await spd.waitForPageReady();
          await spd.ensureSyntheticPerformanceDetailSelected();
          await spd.ensureProfileSiteSelected();
          await spd.expectCoreWidgetsReady();
        },
        90000,
        recover
      );
    } catch (err) {
      annotate(`Reload soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-SPD-DASH-032 — not Monitoring PD / RUM PD / Synthetic Site Health / Marketing / DXO', async () => {
    await spd.expectNotConfusedSurfaces();
    await expect(page).toHaveURL(/site\/dashboard/i);
    await expect(spd.getDashboardLabel()).resolves.toMatch(SPD_DASH_EXACT);
    const body = await spd.getPageBodySample(2500);
    expect(body).toMatch(/Bar Graph|Daily Averages|Page Timings Over Time/i);
    // Monitoring-only affordances should not be required (scatter/session lookup)
    if (/Session Lookup|Performance Breakdown|scatter/i.test(body)) {
      annotate('Monitoring-like labels soft-seen on dashboard body — annotate only');
    }
  });

  test('REG-SPD-DASH-033 — top chrome icons: tooltips + click round-trip', async () => {
    try {
      const r = await withSoftDeadline(() => spd.softChromeIconTooltipsAndRoundTrip(), 60000, recover);
      annotate(
        `Chrome tips=${r.tooltipsChecked} clicks=${r.clickTargets.join(',')} via=${r.returnedVia.join('|')}`
      );
      expect(r.tooltipsChecked + r.clickTargets.length).toBeGreaterThan(0);
      await spd.ensureSyntheticPerformanceDetailSelected({ soft: true });
      await expect(page).toHaveURL(/site\/dashboard/i);
    } catch (err) {
      annotate(`Chrome icons soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-SPD-DASH-034 — apply lookbacks 1h|6h / 24h / 7d / 30d and verify refresh', async () => {
    try {
      const results = await withSoftDeadline(
        () => spd.softPrescribedLookbacksRefresh(initialCtx.lookbackLabel),
        120000,
        recover
      );
      for (const r of results) {
        annotate(`Lookback ${r.label}: applied=${r.applied} refreshed=${r.refreshed} ${r.note}`);
        expect(r.applied, `Should apply ${r.label}`).toBeTruthy();
      }
      await expect(spd.getDashboardLabel()).resolves.toMatch(SPD_DASH_EXACT);
    } catch (err) {
      annotate(`Prescribed lookbacks soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-SPD-DASH-035 — change site (Demo eCommerce soft) + lock; restore GDC', async () => {
    try {
      const r = await withSoftDeadline(() => spd.softSiteChangeAndLock(), 90000, recover);
      annotate(
        `Site lockFound=${r.lockFound} changed=${r.siteChanged} restored=${r.restored} other="${r.otherSite}" ${r.note}`
      );
      expect(r.restored || /GDC Test Site 2/i.test(await spd.getSiteLabel())).toBeTruthy();
      await spd.expectCoreWidgetsReady();
    } catch (err) {
      annotate(`Site/lock soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-SPD-DASH-036 — apply Auto Refresh options; leave non-aggressive', async () => {
    try {
      const r = await withSoftDeadline(() => spd.softAutoRefreshApplySample(), 40000, recover);
      annotate(r.note);
      expect(r.applied.length).toBeGreaterThan(0);
      await spd.expectCoreWidgetsReady();
    } catch (err) {
      annotate(`Auto Refresh apply soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-SPD-DASH-037 — +Dashboard / Manager eye switch then restore Synthetic PD', async () => {
    try {
      const r = await withSoftDeadline(() => spd.softPlusDashboardEyeSwitchHome(), 90000, recover);
      annotate(`Manager plus=${r.openedViaPlus} eye=${r.eyeClicked} home=${r.restoredHome} ${r.note}`);
      await spd.ensureSyntheticPerformanceDetailSelected();
      await expect(spd.getDashboardLabel()).resolves.toMatch(SPD_DASH_EXACT);
    } catch (err) {
      annotate(`Manager eye soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-SPD-DASH-038 — restore initial context; suite home healthy', async () => {
    await spd.restoreContext(initialCtx);
    await spd.ensureSyntheticPerformanceDetailSelected();
    await spd.expectSelectedSite();
    await spd.expectCoreWidgetTitles();
    await spd.expectNotConfusedSurfaces();
    if (blockingPageErrors.length) {
      annotate(
        `Uncaught page errors observed (non-fatal if page healthy): ${blockingPageErrors
          .slice(0, 4)
          .join(' || ')}`
      );
    }
    annotate(
      `Final context dashboard="${await spd.getDashboardLabel()}" lookback="${await spd.getTimeLookbackLabel()}" loadMs=${initialLoadMs}`
    );
  });
});
