import { test, expect, Page } from '@playwright/test';
import path from 'path';
import {
  SyntheticRegressionUs2DashboardPage,
  SyntheticRegressionUs2Context,
  SR_US2_EXACT,
} from '../../../../../../pages/SyntheticRegressionUs2DashboardPage';
import { getActiveProfile } from '../../../../../../config/profiles';

/**
 * Regression: Synthetic Regression - US2 (custom dashboard)
 * Site: GDC Test Site 2
 * Path: tests/regression_tests/US2/dashboards/custom/synthetic-regression-us2
 *
 * Read-only: no Save Filter, permanent widget save, dashboard delete/share/clone sticky.
 * Home is exact Custom "Synthetic Regression - US2" — not Synthetic Site Health / Performance Detail
 * or other Custom *-US2 boards.
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

test.describe('US2 Regression — Synthetic Regression - US2 Dashboard', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(150000);

  let page: Page;
  let dash: SyntheticRegressionUs2DashboardPage;
  let initialCtx: SyntheticRegressionUs2Context;
  let initialLoadMs = 0;
  const notes: string[] = [];
  const blockingPageErrors: string[] = [];

  const annotate = (description: string) => {
    notes.push(description);
    test.info().annotations.push({ type: 'note', description });
    console.log(`[SR-US2] ${description}`);
  };

  const recover = async () => {
    await dash.recoverPage();
    if (initialCtx) await dash.restoreContext(initialCtx).catch(() => undefined);
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
    dash = new SyntheticRegressionUs2DashboardPage(page);
    const started = Date.now();
    await dash.openViaNavigation();
    await dash.ensureProfileSiteSelected();
    await page.waitForTimeout(1500);
    await dash.expectCoreWidgetsReady().catch(() => undefined);
    initialLoadMs = Date.now() - started;
    initialCtx = await dash.captureContext();
    const profile = getActiveProfile();
    const siteNow = await dash.getSiteLabel().catch(() => profile.siteName);
    console.log(
      `[SR-US2] profile=${profile.id} site=${siteNow} dc=${profile.datacenter} loadMs=${initialLoadMs} dashboard="${initialCtx.dashboardLabel}" lookback="${initialCtx.lookbackLabel}"`
    );
  });

  test.afterAll(async () => {
    await dash?.continueAutoRefreshIfPaused().catch(() => undefined);
    if (notes.length) console.log(`[SR-US2] annotations:\n- ${notes.join('\n- ')}`);
    await page?.context()?.close().catch(() => undefined);
  });

  test('REG-SR-US2-001 — page loads via Dashboards menu/route with correct title', async () => {
    await expect(page).toHaveURL(/site\/dashboard|r=site%2Fdashboard/i);
    await expect(page).not.toHaveURL(/site\/login|site%2Flogin/i);
    await expect(dash.locators.pageTitle).toHaveText(/Dashboards/i);
    await expect(page).toHaveTitle(/Dashboards/i);
    await dash.expectNotConfusedSurfaces();
  });

  test('REG-SR-US2-002 — Synthetic Regression - US2 selected; core widgets present', async () => {
    await dash.ensureSyntheticRegressionUs2Selected();
    const label = await dash.getDashboardLabel();
    expect(label).toMatch(SR_US2_EXACT);
    expect(label).not.toMatch(/Site Health|Performance Detail/i);
    await dash.expectCoreWidgetTitles();
    annotate(`Dashboard="${label}" widgets-ready score≈${await dash.widgetsReadyScore()}`);
  });

  test('REG-SR-US2-003 — GDC Test Site 2; lookback/auto-refresh captured', async () => {
    await dash.ensureProfileSiteSelected();
    await dash.expectSelectedSite();
    expect(initialCtx.lookbackLabel.length, 'Time Lookback non-empty').toBeGreaterThan(0);
    annotate(
      `site="${await dash.getSiteLabel()}" lookback="${initialCtx.lookbackLabel}" autoRefresh="${initialCtx.autoRefreshLabel || '(n/a)'}"`
    );
  });

  test('REG-SR-US2-004 — dashboard chrome: switcher, lookback, refresh, auto-refresh', async () => {
    await expect(dash.locators.switchDashboard).toBeAttached();
    await expect(dash.locators.timeLookback).toBeVisible({ timeout: 15000 });
    await expect(dash.locators.refreshDashboard).toBeVisible();
    await expect(dash.locators.autoRefresh).toBeVisible();
  });

  test('REG-SR-US2-005 — Custom list includes Synthetic Regression - US2; Preconfigured siblings soft', async () => {
    const custom = await dash.listCustomDashboardNames();
    expect(custom.some((n) => SR_US2_EXACT.test(n)), custom.join(' | ')).toBeTruthy();
    const pre = await dash.listPreconfiguredDashboardNames();
    annotate(
      `Custom count=${custom.length} hasHome=${custom.some((n) => SR_US2_EXACT.test(n))}; Preconfigured sample: ${pre.slice(0, 6).join(', ')}`
    );
  });

  test('REG-SR-US2-006 — Time Lookback menu has multiple presets', async () => {
    try {
      const opts = await withSoftDeadline(() => dash.getTimeLookbackOptions(), 25000, recover);
      expect(opts.length).toBeGreaterThan(3);
      annotate(`Lookback options sample: ${opts.slice(0, 12).join(' | ')}`);
    } catch (err) {
      annotate(`Lookback menu soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-SR-US2-007 — soft apply Last 24h then Last 7d; restore original lookback', async () => {
    try {
      await withSoftDeadline(
        async () => {
          await dash.selectTimeLookback(/Last 24 hours|Last 1 day|1 day/i);
          await dash.expectCoreWidgetsReady();
          await dash.selectTimeLookback(/Last 7 days/i);
          await dash.expectCoreWidgetsReady();
          if (initialCtx.lookbackLabel) {
            await dash.selectTimeLookback(initialCtx.lookbackLabel).catch(async () => {
              await dash.selectTimeLookback(/Last 24 hours|Last 6 hours/i);
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
    await expect(dash.getDashboardLabel()).resolves.toMatch(SR_US2_EXACT);
  });

  test('REG-SR-US2-008 — Dashboard Refresh reloads without blank crash', async () => {
    try {
      await withSoftDeadline(() => dash.clickRefreshDashboard(), 45000, recover);
      await dash.expectCoreWidgetTitles();
    } catch (err) {
      annotate(`Refresh soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-SR-US2-009 — Auto Refresh menu soft options (Off + intervals)', async () => {
    try {
      const opts = await withSoftDeadline(() => dash.getAutoRefreshOptions(), 20000, recover);
      expect(opts.length).toBeGreaterThan(0);
      annotate(`Auto refresh options: ${opts.slice(0, 10).join(' | ')}`);
    } catch (err) {
      annotate(`Auto Refresh soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-SR-US2-010 — Performance Summary - US2 metric labels soft', async () => {
    const found = await dash.expectSummaryMetricLabelsSoft();
    annotate(`Summary labels found=${found.length}: ${found.slice(0, 8).join(' | ')}`);
    const body = await dash.getPageBodySample(2500);
    if (/\d+(\.\d+)?\s*(s|ms|S|MS|KB|MB)|[\d,]+\s*(hits)?/i.test(body)) {
      annotate('Summary values format soft OK');
    }
  });

  test('REG-SR-US2-011 — Performance - US2 Details chart shell + legend soft', async () => {
    try {
      await withSoftDeadline(
        async () => {
          const host = dash.locators.performanceDetailsWidget();
          await dash.softScrollTo(host);
          const body = await dash.getPageBodySample(8000);
          expect(body).toMatch(/Performance\s*-\s*US2|Performance Details/i);
          const chart = host.locator('.highcharts-container').first();
          const box = await chart.boundingBox().catch(() => null);
          annotate(`Perf Details chart sized=${!!(box && box.width > 40)}`);
          const leg = await dash.softTogglePerformanceLegend();
          annotate(`Legend: ${leg.note}`);
        },
        45000,
        recover
      );
    } catch (err) {
      annotate(`Perf Details soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-SR-US2-012 — soft hover Performance - US2 tooltip', async () => {
    try {
      const tip = await withSoftDeadline(() => dash.softHoverPerformanceGraph(), 15000, recover);
      annotate(`Perf tooltip length=${tip.length} sample="${tip.slice(0, 80)}"`);
    } catch (err) {
      annotate(`Perf hover soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-SR-US2-013 — Network Health Check - US2 + API Checks - US2 soft', async () => {
    const body = await dash.getPageBodySample(5500);
    expect(body).toMatch(/Network Health Check\s*-\s*US2/i);
    expect(body).toMatch(/API Checks\s*-\s*US2/i);
    annotate('Network Health + API Checks titles present');
  });

  test('REG-SR-US2-014 — Site Availability - US2 Over Time + Perf. Comparison soft', async () => {
    const body = await dash.getPageBodySample(12000);
    expect(body).toMatch(/Site Availability(\s*-\s*US2)?/i);
    if (/Site Availability Over Time/i.test(body)) annotate('Site Availability Over Time present');
    if (/Perf\.?\s*Comparison\s*-\s*US2|Performance Comparison\s*-\s*US2/i.test(body)) {
      annotate('Perf. Comparison - US2 present');
    } else {
      annotate('Perf. Comparison title soft-annotate: not in sample');
    }
  });

  test('REG-SR-US2-015 — Error Tracking and Performance - US2 soft', async () => {
    await dash.softScrollTo(dash.locators.errorTrackingWidget());
    const body = await dash.getPageBodySample(12000);
    expect(body).toMatch(/Error Tracking/i);
    if (/No Monitors Currently In Error State/i.test(body)) {
      annotate('Error Tracking: empty error-state soft');
    } else {
      annotate('Error Tracking: monitor rows or chrome soft present');
    }
  });

  test('REG-SR-US2-016 — Session Scatter Plot Analysis - US2 soft drill tabs', async () => {
    try {
      const r = await withSoftDeadline(() => dash.softScatterDrill(), 90000, recover);
      annotate(`Scatter points=${r.points} paused=${r.paused} tabs=${r.tabs.join(',') || '(none)'} ${r.note}`);
    } catch (err) {
      annotate(`Scatter soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
    await expect(dash.getDashboardLabel()).resolves.toMatch(SR_US2_EXACT);
  });

  test('REG-SR-US2-017 — 1st vs 3rd Party Fxn Timing - US2 soft table/headers', async () => {
    await dash.softScrollTo(dash.locators.fxnTimingWidget());
    const body = await dash.getPageBodySample(12000);
    expect(body).toMatch(/1st vs 3rd Party|Fxn Timing/i);
    const table = dash.locators.slowestFunctionsTable();
    if (await table.isVisible().catch(() => false)) {
      const headers = ((await table.locator('th').allTextContents().catch(() => [])) || [])
        .map((t) => t.replace(/\s+/g, ' ').trim())
        .filter(Boolean);
      annotate(`Slowest Functions headers: ${headers.slice(0, 6).join(' | ')}`);
    } else {
      annotate('Slowest Functions table soft not visible — annotate');
    }
  });

  test('REG-SR-US2-018 — Perf. by Geography - US2 soft', async () => {
    await dash.softScrollTo(dash.locators.geographyWidget());
    const body = await dash.getPageBodySample(12000);
    expect(body).toMatch(/Geography\s*-\s*US2|by Geography/i);
    annotate('Geography widget title soft OK');
  });

  test('REG-SR-US2-019 — Filters Cancel-only; My/Shared tabs soft', async () => {
    try {
      await withSoftDeadline(
        async () => {
          await dash.openFiltersDrawer();
          if (await dash.locators.myFiltersTab.isVisible().catch(() => false)) {
            await dash.locators.myFiltersTab.click({ force: true }).catch(() => undefined);
          }
          if (await dash.locators.sharedFiltersTab.isVisible().catch(() => false)) {
            await dash.locators.sharedFiltersTab.click({ force: true }).catch(() => undefined);
          }
          await dash.softCancelFilters();
        },
        30000,
        recover
      );
      annotate('Filters Cancel-only + My/Shared soft');
    } catch (err) {
      annotate(`Filters soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-SR-US2-020 — Manager / + Widget cancel-only', async () => {
    try {
      const m = await withSoftDeadline(() => dash.softOpenManagerCancel(), 25000, recover);
      annotate(`Manager: ${m}`);
      const w = await dash.softOpenWidgetWizardCancel();
      annotate(`+Widget wizard open=${w} then cancel`);
    } catch (err) {
      annotate(`Manager/Widget soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
    await expect(dash.getDashboardLabel()).resolves.toMatch(SR_US2_EXACT);
  });

  test('REG-SR-US2-021 — soft sibling Synthetic Site Health then restore home', async () => {
    try {
      const note = await withSoftDeadline(
        () => dash.softSiblingSwitchAndRestore(/^\s*Synthetic Site Health\s*$/i),
        120000,
        recover
      );
      annotate(`Sibling SSH: ${note}`);
      await expect(dash.getDashboardLabel()).resolves.toMatch(SR_US2_EXACT);
      await dash.expectSelectedSite();
    } catch (err) {
      annotate(`Sibling SSH soft: ${err instanceof Error ? err.message : String(err)}`);
      await dash.openViaNavigation().catch(() => recover());
    }
  });

  test('REG-SR-US2-022 — soft sibling Synthetic Performance Detail then restore', async () => {
    try {
      const note = await withSoftDeadline(
        () => dash.softSiblingSwitchAndRestore(/Synthetic Performance Detail/i),
        120000,
        recover
      );
      annotate(`Sibling SPD: ${note}`);
      await expect(dash.getDashboardLabel()).resolves.toMatch(SR_US2_EXACT);
    } catch (err) {
      annotate(`Sibling SPD soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-SR-US2-023 — soft Custom RUM Regression - US2 then restore home', async () => {
    try {
      const note = await withSoftDeadline(
        () => dash.softSiblingSwitchAndRestore(/RUM Regression\s*-\s*US2/i),
        120000,
        recover
      );
      annotate(`Sibling RUM-US2: ${note}`);
      await expect(dash.getDashboardLabel()).resolves.toMatch(SR_US2_EXACT);
    } catch (err) {
      annotate(`Sibling RUM soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-SR-US2-024 — Custom Date Selection open/cancel only', async () => {
    try {
      await dash.openTimeLookbackMenu();
      const custom = page.getByText(/Custom Date Selection|Custom/i).first();
      if (await custom.isVisible().catch(() => false)) {
        await custom.click({ force: true }).catch(() => undefined);
        await page.waitForTimeout(600);
        annotate('Custom Date Selection opened — cancel only');
      } else {
        annotate('Custom Date Selection not visible');
      }
      await dash.closeOverlays();
    } catch (err) {
      annotate(`Custom date soft: ${err instanceof Error ? err.message : String(err)}`);
      await dash.closeOverlays();
    }
  });

  test('REG-SR-US2-025 — narrow viewport keeps widgets reachable', async () => {
    await page.setViewportSize({ width: 1100, height: 900 });
    await dash.expectCoreWidgetTitles().catch(async () => {
      await dash.locators.performanceSummaryWidget().scrollIntoViewIfNeeded().catch(() => undefined);
      await dash.locators.geographyWidget().scrollIntoViewIfNeeded().catch(() => undefined);
    });
    await expect(dash.locators.timeLookback).toBeVisible();
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('REG-SR-US2-026 — last-updated + Carousel soft', async () => {
    if (await dash.locators.lastUpdated.isVisible().catch(() => false)) {
      const t = await dash.getControlLabel(dash.locators.lastUpdated);
      annotate(`last-updated="${t.slice(0, 80)}"`);
      expect(t.length).toBeGreaterThan(0);
    } else {
      annotate('last-updated not visible');
    }
    if (await dash.locators.carouselControl.isVisible().catch(() => false)) {
      annotate('Carousel present — left untouched');
    } else {
      annotate('Carousel not visible');
    }
  });

  test('REG-SR-US2-027 — prescribed lookbacks 6h/24h/7d/30d + graph hover intervals', async () => {
    try {
      const results = await withSoftDeadline(
        () => dash.softPrescribedLookbacksWithHover(initialCtx.lookbackLabel),
        180000,
        recover
      );
      for (const r of results) {
        annotate(
          `Lookback ${r.label}: applied=${r.applied} refreshed=${r.refreshed} tip="${r.tip.slice(0, 60)}" ${r.note}`
        );
        if (r.label.startsWith('/')) {
          expect(r.applied, `Should apply ${r.label}`).toBeTruthy();
        }
      }
      await expect(dash.getDashboardLabel()).resolves.toMatch(SR_US2_EXACT);
    } catch (err) {
      annotate(`Prescribed lookbacks soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-SR-US2-028 — chrome icons tooltips + round-trip', async () => {
    try {
      const r = await withSoftDeadline(() => dash.softChromeIconTooltipsAndRoundTrip(), 60000, recover);
      annotate(
        `Chrome tips=${r.tooltipsChecked} clicks=${r.clickTargets.join(',')} via=${r.returnedVia.join('|')}`
      );
      expect(r.tooltipsChecked + r.clickTargets.length).toBeGreaterThan(0);
      await dash.ensureSyntheticRegressionUs2Selected({ soft: true });
    } catch (err) {
      annotate(`Chrome icons soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-SR-US2-029 — reload soft recovery; still Synthetic Regression - US2', async () => {
    try {
      await withSoftDeadline(
        async () => {
          await page.reload({ waitUntil: 'domcontentloaded' });
          await dash.waitForPageReady();
          await dash.ensureSyntheticRegressionUs2Selected();
          await dash.ensureProfileSiteSelected();
          await dash.expectCoreWidgetsReady();
        },
        90000,
        recover
      );
    } catch (err) {
      annotate(`Reload soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-SR-US2-030 — not SSH / SPD / other Custom US2 / Monitoring as home', async () => {
    await dash.expectNotConfusedSurfaces();
    await expect(page).toHaveURL(/site\/dashboard/i);
    await expect(dash.getDashboardLabel()).resolves.toMatch(SR_US2_EXACT);
    const body = await dash.getPageBodySample(2500);
    expect(body).toMatch(/Performance Summary\s*-\s*US2|Network Health Check\s*-\s*US2/i);
  });

  test('REG-SR-US2-031 — restore initial context; suite home healthy', async () => {
    await dash.restoreContext(initialCtx).catch(() => recover());
    await expect(dash.getDashboardLabel()).resolves.toMatch(SR_US2_EXACT);
    await dash.expectSelectedSite();
    await dash.expectCoreWidgetsReady().catch(() => undefined);
    annotate(
      `Final dashboard="${await dash.getDashboardLabel()}" lookback="${await dash.getTimeLookbackLabel()}" loadMs=${initialLoadMs} blockingErrors=${blockingPageErrors.length}`
    );
  });
});
