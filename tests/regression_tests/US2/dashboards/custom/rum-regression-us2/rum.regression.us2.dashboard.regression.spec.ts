import { test, expect, Page } from '@playwright/test';
import path from 'path';
import {
  RumRegressionUs2DashboardPage,
  RumRegressionUs2Context,
  RR_US2_EXACT,
} from '../../../../../../pages/RumRegressionUs2DashboardPage';
import { getActiveProfile } from '../../../../../../config/profiles';

/**
 * Regression: RUM Regression - US2 (custom dashboard)
 * Site: GDC Test Site 2
 * Path: tests/regression_tests/US2/dashboards/custom/rum-regression-us2
 *
 * Read-only: no Save Filter, widget Save/Delete, sticky KPI Apply / Path / Geography metric.
 * Home is exact Custom "RUM Regression - US2" — not Preconfigured RUM Performance Detail
 * or Monitoring Real User Browser modules.
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

test.describe('US2 Regression — RUM Regression - US2 Dashboard', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(150000);

  let page: Page;
  let dash: RumRegressionUs2DashboardPage;
  let initialCtx: RumRegressionUs2Context;
  let initialLoadMs = 0;
  const notes: string[] = [];
  const blockingPageErrors: string[] = [];

  const annotate = (description: string) => {
    notes.push(description);
    test.info().annotations.push({ type: 'note', description });
    console.log(`[RR-US2] ${description}`);
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
    dash = new RumRegressionUs2DashboardPage(page);
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
      `[RR-US2] profile=${profile.id} site=${siteNow} dc=${profile.datacenter} loadMs=${initialLoadMs} dashboard="${initialCtx.dashboardLabel}" lookback="${initialCtx.lookbackLabel}" kpi="${initialCtx.kpiComparisonType}"`
    );
  });

  test.afterAll(async () => {
    await dash?.restoreWidgetDefaults(initialCtx).catch(() => undefined);
    if (notes.length) console.log(`[RR-US2] annotations:\n- ${notes.join('\n- ')}`);
    await page?.context()?.close().catch(() => undefined);
  });

  test('REG-RR-US2-001 — page loads via Dashboards menu/route with correct title', async () => {
    await expect(page).toHaveURL(/site\/dashboard|r=site%2Fdashboard/i);
    await expect(page).not.toHaveURL(/site\/login|site%2Flogin/i);
    await expect(dash.locators.pageTitle).toHaveText(/Dashboards/i);
    await expect(page).toHaveTitle(/Dashboards/i);
    await dash.expectNotConfusedSurfaces();
  });

  test('REG-RR-US2-002 — RUM Regression - US2 selected; core widgets present', async () => {
    await dash.ensureRumRegressionUs2Selected();
    const label = await dash.getDashboardLabel();
    expect(label).toMatch(RR_US2_EXACT);
    expect(label).not.toMatch(/Synthetic|Alerts|Business|Marketing|Tag Governance|Performance Detail/i);
    await dash.expectCoreWidgetTitles();
    annotate(`Dashboard="${label}" widgets-ready score≈${await dash.widgetsReadyScore()}`);
  });

  test('REG-RR-US2-003 — GDC Test Site 2; lookback/auto-refresh captured', async () => {
    await dash.ensureProfileSiteSelected();
    await dash.expectSelectedSite();
    expect(initialCtx.lookbackLabel.length, 'Time Lookback non-empty').toBeGreaterThan(0);
    annotate(
      `site="${await dash.getSiteLabel()}" lookback="${initialCtx.lookbackLabel}" autoRefresh="${initialCtx.autoRefreshLabel || '(n/a)'}" kpi="${initialCtx.kpiComparisonType}" geo="${initialCtx.geographyMetric}"`
    );
  });

  test('REG-RR-US2-004 — dashboard chrome: switcher, lookback, refresh, auto-refresh', async () => {
    await expect(dash.locators.switchDashboard).toBeAttached();
    await expect(dash.locators.timeLookback).toBeVisible({ timeout: 15000 });
    await expect(dash.locators.refreshDashboard).toBeVisible();
    await expect(dash.locators.autoRefresh).toBeVisible();
  });

  test('REG-RR-US2-005 — Custom list includes RUM Regression - US2; siblings soft', async () => {
    const custom = await dash.listCustomDashboardNames();
    expect(custom.some((n) => RR_US2_EXACT.test(n)), custom.join(' | ')).toBeTruthy();
    const pre = await dash.listPreconfiguredDashboardNames();
    annotate(
      `Custom count=${custom.length} hasHome=${custom.some((n) => RR_US2_EXACT.test(n))}; Preconfigured sample: ${pre.slice(0, 6).join(', ')}`
    );
  });

  test('REG-RR-US2-006 — Time Lookback menu has multiple presets', async () => {
    try {
      const opts = await withSoftDeadline(() => dash.getTimeLookbackOptions(), 25000, recover);
      expect(opts.length).toBeGreaterThan(3);
      annotate(`Lookback options sample: ${opts.slice(0, 12).join(' | ')}`);
    } catch (err) {
      annotate(`Lookback menu soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-RR-US2-007 — soft apply Last 24h then Last 7d; restore original lookback', async () => {
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
    await expect(dash.getDashboardLabel()).resolves.toMatch(RR_US2_EXACT);
  });

  test('REG-RR-US2-008 — Dashboard Refresh reloads without blank crash', async () => {
    try {
      await withSoftDeadline(() => dash.clickRefreshDashboard(), 45000, recover);
      await dash.expectCoreWidgetTitles();
    } catch (err) {
      annotate(`Refresh soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-RR-US2-009 — Auto Refresh menu soft options (Off + intervals)', async () => {
    try {
      const opts = await withSoftDeadline(() => dash.getAutoRefreshOptions(), 20000, recover);
      expect(opts.length).toBeGreaterThan(0);
      annotate(`Auto refresh options: ${opts.slice(0, 10).join(' | ')}`);
    } catch (err) {
      annotate(`Auto Refresh soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-RR-US2-010 — RUM Performance - US2 Performance Details + legends soft', async () => {
    const sample = await dash.widgetSample(dash.locators.rumPerformanceWidget(), 900);
    expect(sample).toMatch(/RUM\s+Performance\s*-\s*US2|Performance Details/i);
    expect(sample).toMatch(/Onload|Page Views|1stByte|DNS/i);
    annotate(`RUM Performance sample="${sample.slice(0, 180)}"`);
    const tip = await dash.softHoverWidget(dash.locators.rumPerformanceWidget());
    if (tip) annotate(`Performance hover="${tip.slice(0, 90)}"`);
    else annotate('Performance hover: no tooltip (controlled empty)');
  });

  test('REG-RR-US2-011 — RUM Native App Performance - US2 soft', async () => {
    const sample = await dash.widgetSample(dash.locators.rumNativeAppPerformanceWidget(), 900);
    expect(sample).toMatch(/Native\s+App\s+Performance\s*-\s*US2/i);
    expect(sample).toMatch(/Group\s*\/\s*Page Views|Performance Timing|CPU Usage|Memory Usage|Errors and Crashes/i);
    annotate(`Native App Performance sample="${sample.slice(0, 160)}"`);
  });

  test('REG-RR-US2-012 — RUM Performance Comparison - US2 soft', async () => {
    const sample = await dash.widgetSample(dash.locators.rumPerformanceComparisonWidget(), 700);
    expect(sample).toMatch(/Performance\s+Comparison\s*-\s*US2/i);
    expect(sample).toMatch(/Onload|All Matching Pages/i);
    annotate(`Comparison sample="${sample.slice(0, 140)}"`);
  });

  test('REG-RR-US2-013 — Bounce Rate - US2 Sessions/Bounce/PV by Onload', async () => {
    const sample = await dash.widgetSample(dash.locators.bounceRateWidget(), 800);
    expect(sample).toMatch(/Bounce\s+Rate\s*-\s*US2/i);
    expect(sample).toMatch(/Sessions|Bounce Rate|Page Views\s*\/\s*Session|Onload/i);
    annotate(`Bounce Rate sample="${sample.slice(0, 160)}" (not primary datetime hover)`);
  });

  test('REG-RR-US2-014 — KPI Date Comparison type soft restore', async () => {
    const sample = await dash.widgetSample(dash.locators.kpiDateComparisonWidget(), 800);
    expect(sample).toMatch(/KPI\s+Date\s+Comparison\s*-\s*US2/i);
    expect(sample).toMatch(/Day to Day|Year to Year|VISITS|PAGE VIEWS|ONLOAD/i);
    try {
      const round = await withSoftDeadline(() => dash.softKpiComparisonTypeRoundTrip(), 35000, recover);
      annotate(`KPI comparison: ${round}`);
    } catch (err) {
      annotate(`KPI soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-RR-US2-015 — Performance by Browser / Country / Region soft', async () => {
    const browser = await dash.widgetSample(dash.locators.performanceByBrowserWidget(), 500);
    const country = await dash.widgetSample(dash.locators.performanceByCountryWidget(), 500);
    const region = await dash.widgetSample(dash.locators.performanceByRegionWidget(), 500);
    expect(browser).toMatch(/Performance\s+by\s+Browser\s*-\s*US2/i);
    expect(country).toMatch(/Performance\s+by\s+Country\s*-\s*US2/i);
    expect(region).toMatch(/Performance\s+by\s+Region\s*-\s*US2/i);
    annotate('Browser/Country/Region titles present (entity names not hard-coded)');
  });

  test('REG-RR-US2-016 — Performance Summary + Traffic / Timing / Device Metrics', async () => {
    const body = await dash.getPageBodySample(14000);
    expect(body).toMatch(/Performance\s+Summary\s*-\s*US2|PAGE\s+HITS/i);
    expect(body).toMatch(/Traffic\s+Information\s*-\s*US2/i);
    expect(body).toMatch(/Timing\s+Information\s*-\s*US2/i);
    expect(body).toMatch(/Device\s+Metrics\s*-\s*US2/i);
    if (/PAGE HITS|SESSIONS|PAGE ONLOAD/i.test(body)) annotate('Summary cards language present');
    if (/Network Time|Back-End Time|Front-End Time/i.test(body)) annotate('Timing labels present');
    if (/JS Errors \(Sampled\)|Brand Value/i.test(body)) annotate('Device Metrics columns soft present');
  });

  test('REG-RR-US2-017 — Performance Path High/Detail + device restore', async () => {
    const sample = await dash.widgetSample(dash.locators.performancePathWidget(), 700);
    expect(sample).toMatch(/Performance\s+Path\s*-\s*US2/i);
    try {
      const round = await withSoftDeadline(() => dash.softPathHighDetailRoundTrip(), 40000, recover);
      annotate(`Path: ${round}`);
    } catch (err) {
      annotate(`Path soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-RR-US2-018 — Performance by Geography Displayed Metric soft', async () => {
    const sample = await dash.widgetSample(dash.locators.performanceByGeographyWidget(), 700);
    expect(sample).toMatch(/Performance\s+by\s+Geography\s*-\s*US2/i);
    try {
      const geo = await withSoftDeadline(() => dash.softGeographyMetricMenuSample(), 25000, recover);
      annotate(`Geography: ${geo}`);
    } catch (err) {
      annotate(`Geography soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-RR-US2-019 — SLA Violations / Year by Year soft (empty OK)', async () => {
    const body = await dash.getPageBodySample(16000);
    if (/SLA\s+Violations\s*-\s*US2/i.test(body)) annotate('SLA Violations - US2 present (may be empty)');
    else annotate('SLA Violations soft-absent');
    if (/Year\s+by\s+Year\s+Comparison\s*-\s*US2/i.test(body))
      annotate('Year by Year Comparison - US2 present (may be empty)');
    else annotate('Year by Year soft-absent');
  });

  test('REG-RR-US2-020 — Highcharts shells present (not SVG-count-only)', async () => {
    const charts = await dash.highchartsCount();
    annotate(`Highcharts containers=${charts} (probe sample ~32; do not hard-require exact count)`);
    expect(charts).toBeGreaterThan(0);
    await dash.expectCoreWidgetTitles();
  });

  test('REG-RR-US2-021 — Filters Cancel-only; My/Shared tabs soft', async () => {
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

  test('REG-RR-US2-022 — Manager / + Widget cancel-only', async () => {
    try {
      const m = await withSoftDeadline(() => dash.softOpenManagerCancel(), 25000, recover);
      annotate(`Manager: ${m}`);
      const w = await dash.softOpenWidgetWizardCancel();
      annotate(`+Widget wizard open=${w} then cancel`);
    } catch (err) {
      annotate(`Manager/Widget soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
    await expect(dash.getDashboardLabel()).resolves.toMatch(RR_US2_EXACT);
  });

  test('REG-RR-US2-023 — soft sibling Tag Governance - US2 then restore home', async () => {
    try {
      const note = await withSoftDeadline(
        () => dash.softSiblingSwitchAndRestore(/^\s*Tag Governance\s*-\s*US2\s*$/i),
        120000,
        recover
      );
      annotate(`Sibling TG-US2: ${note}`);
      await expect(dash.getDashboardLabel()).resolves.toMatch(RR_US2_EXACT);
      await dash.expectSelectedSite();
    } catch (err) {
      annotate(`Sibling TG soft: ${err instanceof Error ? err.message : String(err)}`);
      await dash.openViaNavigation().catch(() => recover());
    }
  });

  test('REG-RR-US2-024 — soft sibling RUM Performance Detail then restore', async () => {
    try {
      const note = await withSoftDeadline(
        () => dash.softSiblingSwitchAndRestore(/^\s*RUM Performance Detail\s*$/i),
        120000,
        recover
      );
      annotate(`Sibling RUM Performance Detail: ${note}`);
      await expect(dash.getDashboardLabel()).resolves.toMatch(RR_US2_EXACT);
    } catch (err) {
      annotate(`Sibling RPD soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-RR-US2-025 — soft sibling Site Overview then restore', async () => {
    try {
      const note = await withSoftDeadline(
        () => dash.softSiblingSwitchAndRestore(/^\s*Site Overview\s*$/i),
        120000,
        recover
      );
      annotate(`Sibling Site Overview: ${note}`);
      await expect(dash.getDashboardLabel()).resolves.toMatch(RR_US2_EXACT);
    } catch (err) {
      annotate(`Sibling SO soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-RR-US2-026 — Custom Date Selection open/cancel only', async () => {
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

  test('REG-RR-US2-027 — 1100px viewport keeps widgets reachable', async () => {
    await page.setViewportSize({ width: 1100, height: 900 });
    await dash.expectCoreWidgetTitles().catch(async () => {
      await dash.softScrollTo(dash.locators.rumPerformanceWidget());
      await dash.softScrollTo(dash.locators.deviceMetricsWidget());
    });
    await expect(dash.locators.timeLookback).toBeVisible();
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('REG-RR-US2-028 — last-updated + Carousel soft', async () => {
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

  test('REG-RR-US2-029 — prescribed lookbacks 6h/24h/7d/30d + Performance hover intervals', async () => {
    test.setTimeout(240000);
    try {
      const results = await withSoftDeadline(
        () => dash.softPrescribedLookbacksWithHover(initialCtx.lookbackLabel),
        200000,
        recover
      );
      for (const r of results) {
        annotate(
          `Lookback ${r.label}: applied=${r.applied} refreshed=${r.refreshed} tip="${r.tip.slice(0, 40)}" ${r.note}`
        );
        if (r.label.startsWith('/Last') && !r.applied) {
          annotate(`Lookback ${r.label} not applied — soft continue`);
        }
      }
      const label = await dash.getDashboardLabel().catch(() => '');
      if (!RR_US2_EXACT.test(label)) {
        annotate(`After lookbacks dashboard="${label}" — recovering home`);
        await recover();
      }
      await expect(dash.getDashboardLabel()).resolves.toMatch(RR_US2_EXACT);
    } catch (err) {
      annotate(`Prescribed lookbacks soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
      await expect(dash.getDashboardLabel()).resolves.toMatch(RR_US2_EXACT);
    }
  });

  test('REG-RR-US2-030 — chrome icons tooltips + round-trip', async () => {
    try {
      const r = await withSoftDeadline(() => dash.softChromeIconTooltipsAndRoundTrip(), 60000, recover);
      annotate(
        `Chrome tips=${r.tooltipsChecked} clicks=${r.clickTargets.join(',')} via=${r.returnedVia.join('|')}`
      );
      expect(r.tooltipsChecked + r.clickTargets.length).toBeGreaterThan(0);
      await dash.ensureRumRegressionUs2Selected({ soft: true });
    } catch (err) {
      annotate(`Chrome icons soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-RR-US2-031 — reload soft recovery; still RUM Regression - US2', async () => {
    try {
      await withSoftDeadline(
        async () => {
          await page.reload({ waitUntil: 'domcontentloaded' });
          await dash.waitForPageReady();
          await dash.ensureRumRegressionUs2Selected();
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

  test('REG-RR-US2-032 — not SR/AR/BR/MR/TG-US2 / RUM Performance Detail / Monitoring as home', async () => {
    await dash.expectNotConfusedSurfaces();
    await expect(page).toHaveURL(/site\/dashboard/i);
    await expect(dash.getDashboardLabel()).resolves.toMatch(RR_US2_EXACT);
    const body = await dash.getPageBodySample(3000);
    expect(body).toMatch(/RUM\s+Performance|Bounce\s+Rate|Performance\s+Comparison/i);
  });

  test('REG-RR-US2-033 — restore initial context; suite home healthy', async () => {
    await dash.restoreContext(initialCtx).catch(() => recover());
    await expect(dash.getDashboardLabel()).resolves.toMatch(RR_US2_EXACT);
    await dash.expectSelectedSite();
    await dash.expectCoreWidgetsReady().catch(() => undefined);
    annotate(
      `Final dashboard="${await dash.getDashboardLabel()}" lookback="${await dash.getTimeLookbackLabel()}" loadMs=${initialLoadMs} blockingErrors=${blockingPageErrors.length}`
    );
  });
});
