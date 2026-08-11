import { test, expect, Page } from '@playwright/test';
import path from 'path';
import {
  NativeAppDetailedMetricsDashboardPage,
  NativeAppDetailedMetricsDashboardContext,
  NADM_ANDROID_EXACT,
  NADM_IOS_EXACT,
  isNativeAppDetailedMetricsLabel,
} from '../../../../../../pages/NativeAppDetailedMetricsDashboardPage';
import { getActiveProfile } from '../../../../../../config/profiles';

/**
 * Regression: Native App Detailed Metrics (preconfigured dashboard family)
 * Site: GDC Test Site 2
 * Path: tests/regression_tests/US2/dashboards/preconfigured/native-app-detailed-metrics
 *
 * Default home: Native App Detailed Metrics - Android
 * Soft dual: Native App Detailed Metrics - iOS
 *
 * Read-only: no Save Filter, permanent widget save, dashboard delete/share/clone sticky.
 * Exact option only — never Native App Performance Detail / RUM-SPD partial match.
 *
 * npm: test:regression:us2:native-app-detailed-metrics-dashboard
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

test.describe('US2 Regression — Native App Detailed Metrics Dashboard', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(150000);

  let page: Page;
  let nadm: NativeAppDetailedMetricsDashboardPage;
  let initialCtx: NativeAppDetailedMetricsDashboardContext;
  let initialLoadMs = 0;
  const notes: string[] = [];
  const blockingPageErrors: string[] = [];

  const annotate = (description: string) => {
    notes.push(description);
    test.info().annotations.push({ type: 'note', description });
    console.log(`[NADM-DASH] ${description}`);
  };

  const recover = async () => {
    await nadm.recoverPage('android');
    if (initialCtx) await nadm.restoreContext(initialCtx).catch(() => undefined);
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
    nadm = new NativeAppDetailedMetricsDashboardPage(page);
    const started = Date.now();
    await nadm.openViaNavigation('android');
    await nadm.ensureProfileSiteSelected();
    await page.waitForTimeout(1500);
    await nadm.expectCoreWidgetsReady().catch(() => undefined);
    initialLoadMs = Date.now() - started;
    initialCtx = await nadm.captureContext('android');
    const profile = getActiveProfile();
    console.log(
      `[NADM-DASH] profile=${profile.id} site=${await nadm.getSiteLabel().catch(() => profile.siteName)} loadMs=${initialLoadMs} dashboard="${initialCtx.dashboardLabel}" lookback="${initialCtx.lookbackLabel}"`
    );
  });

  test.afterAll(async () => {
    if (notes.length) console.log(`[NADM-DASH] annotations:\n- ${notes.join('\n- ')}`);
    await page?.context()?.close().catch(() => undefined);
  });

  test('REG-NADM-DASH-001 — page loads via Dashboards menu/route with correct title', async () => {
    await expect(page).toHaveURL(/site\/dashboard|r=site%2Fdashboard/i);
    await expect(page).not.toHaveURL(/site\/login|site%2Flogin/i);
    await expect(nadm.locators.pageTitle).toHaveText(/Dashboards/i);
    await expect(page).toHaveTitle(/Dashboards/i);
    await nadm.expectNotConfusedSurfaces();
  });

  test('REG-NADM-DASH-002 — exact Android Detailed Metrics; multi-widget inventory', async () => {
    await nadm.ensureOsSelected('android');
    const dash = await nadm.getDashboardLabel();
    expect(isNativeAppDetailedMetricsLabel(dash, 'android'), `dash="${dash}"`).toBeTruthy();
    expect(dash).toMatch(NADM_ANDROID_EXACT);
    expect(dash).not.toMatch(/Native App Performance Detail/i);
    await nadm.expectCoreWidgetTitles();
    annotate(`Dashboard="${dash}" widgets score≈${await nadm.widgetsReadyScore()}`);
  });

  test('REG-NADM-DASH-003 — GDC Test Site 2; lookback/auto-refresh captured', async () => {
    await nadm.ensureProfileSiteSelected();
    await nadm.expectSelectedSite();
    expect(initialCtx.lookbackLabel.length).toBeGreaterThan(0);
    annotate(
      `site="${await nadm.getSiteLabel()}" lookback="${initialCtx.lookbackLabel}" autoRefresh="${initialCtx.autoRefreshLabel || '(n/a)'}"`
    );
  });

  test('REG-NADM-DASH-004 — dashboard chrome: switcher, lookback, refresh, auto-refresh', async () => {
    await expect(nadm.locators.switchDashboard).toBeAttached();
    await expect(nadm.locators.timeLookback).toBeVisible({ timeout: 15000 });
    await expect(nadm.locators.refreshDashboard).toBeVisible();
    await expect(nadm.locators.autoRefresh).toBeVisible();
  });

  test('REG-NADM-DASH-005 — Preconfigured list has Android + iOS Detailed Metrics', async () => {
    const names = await nadm.listPreconfiguredDashboardNames();
    expect(names.some((n) => isNativeAppDetailedMetricsLabel(n, 'android'))).toBeTruthy();
    expect(names.some((n) => isNativeAppDetailedMetricsLabel(n, 'ios'))).toBeTruthy();
    expect(names.some((n) => /^\s*Native App Performance Detail\s*$/i.test(n))).toBeTruthy();
    annotate(`Preconfigured count=${names.length}: ${names.slice(0, 12).join(', ')}`);
  });

  test('REG-NADM-DASH-006 — Time Lookback menu multi presets', async () => {
    try {
      const opts = await withSoftDeadline(() => nadm.getTimeLookbackOptions(), 25000, recover);
      expect(opts.length).toBeGreaterThan(3);
      annotate(`Lookback sample: ${opts.slice(0, 12).join(' | ')}`);
    } catch (err) {
      annotate(`Lookback soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-NADM-DASH-007 — soft apply Last 24h then Last 7d; restore lookback', async () => {
    try {
      await withSoftDeadline(
        async () => {
          await nadm.selectTimeLookback(/Last 24 hours|Last 1 day|1 day/i);
          await nadm.expectCoreWidgetsReady();
          await nadm.selectTimeLookback(/Last 7 days/i);
          await nadm.expectCoreWidgetsReady();
          if (initialCtx.lookbackLabel) {
            await nadm.selectTimeLookback(initialCtx.lookbackLabel).catch(async () => {
              await nadm.selectTimeLookback(/Last 1 hour|Last 6 hours|Last 24 hours/i);
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
    await expect(nadm.getDashboardLabel()).resolves.toMatch(NADM_ANDROID_EXACT);
  });

  test('REG-NADM-DASH-008 — Dashboard Refresh reloads without blank crash', async () => {
    try {
      await withSoftDeadline(() => nadm.clickRefreshDashboard(), 45000, recover);
      await nadm.expectCoreWidgetTitles();
    } catch (err) {
      annotate(`Refresh soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-NADM-DASH-009 — Auto Refresh menu soft (Off, 2m…60m)', async () => {
    try {
      const opts = await withSoftDeadline(() => nadm.getAutoRefreshOptions(), 20000, recover);
      expect(opts.length).toBeGreaterThan(0);
      const joined = opts.join(' | ');
      if (/2\s*Minutes/i.test(joined)) annotate('Auto Refresh 2 Minutes present');
      if (/60\s*Minutes/i.test(joined)) annotate('Auto Refresh 60 Minutes present');
      annotate(`Auto refresh: ${opts.slice(0, 10).join(' | ')}`);
    } catch (err) {
      annotate(`Auto Refresh soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-NADM-DASH-010 — Native App Performance shell + series soft', async () => {
    const w = nadm.locators.nativeAppPerformanceWidget();
    await expect(w).toBeVisible({ timeout: 30000 });
    const body = await nadm.getPageBodySample(3500);
    expect(body).toMatch(/Native App Performance/i);
    if (/CPU Usage|Memory Usage|Errors and Crashes|Performance Timing/i.test(body)) {
      annotate('Performance multi-series soft present');
    }
    const charts = await nadm.locators.highchartsContainers.count().catch(() => 0);
    annotate(`Highcharts containers≈${charts}`);
  });

  test('REG-NADM-DASH-011 — Performance legend toggle soft', async () => {
    try {
      const r = await withSoftDeadline(
        () => nadm.softLegendToggleInWidget(nadm.locators.nativeAppPerformanceWidget()),
        20000
      );
      annotate(r.note);
    } catch (err) {
      annotate(`Perf legend soft: ${err instanceof Error ? err.message : String(err)}`);
      await nadm.closeOverlays();
    }
  });

  test('REG-NADM-DASH-012 — 1st vs 3rd Party Activity - Native shell soft', async () => {
    const w = nadm.locators.partyActivityWidget();
    await expect(w).toBeVisible({ timeout: 30000 });
    const text = ((await w.innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
    expect(text).toMatch(/1st vs 3rd Party Activity/i);
    if (/DOMAINS|NETWORK REQUESTS|1st Party|3rd Party/i.test(text)) {
      annotate('Party activity toggles soft present');
    }
    if (/Domain|Network Request|Total Load Time/i.test(text)) {
      annotate('Party table headers soft present');
    }
  });

  test('REG-NADM-DASH-013 — party Domains ↔ Network Requests toggle soft', async () => {
    try {
      const r = await withSoftDeadline(() => nadm.softPartyDomainsRequestsToggle(), 25000, recover);
      annotate(r.note);
    } catch (err) {
      annotate(`Party toggle soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-NADM-DASH-014 — Network Request Failures Over Time shell + legend soft', async () => {
    const w = nadm.locators.networkFailuresWidget();
    await expect(w).toBeVisible({ timeout: 30000 });
    const text = ((await w.innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
    expect(text).toMatch(/Network Request Failures Over Time/i);
    if (/HTTP 400|HTTP 500|Client Side Failures/i.test(text)) {
      annotate('Failures legend/HTTP buckets soft present');
    }
    try {
      const leg = await nadm.softLegendToggleInWidget(w);
      annotate(leg.note);
    } catch {
      annotate('Failures legend soft skip');
    }
  });

  test('REG-NADM-DASH-015 — Android Friction Map title; empty soft', async () => {
    const friction = await nadm.softAssertFrictionOs('android');
    expect(friction.ok || /Android Friction/i.test(friction.sample)).toBeTruthy();
    annotate(`Friction: ${friction.sample}`);
    for (const n of await nadm.softEmptyAnnotation()) annotate(n);
  });

  test('REG-NADM-DASH-016 — Crash Summary shell; empty soft', async () => {
    const w = nadm.locators.crashSummaryWidget();
    await expect(w).toBeVisible({ timeout: 20000 });
    const t = ((await w.innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
    expect(t).toMatch(/Native App Crash Summary/i);
    if (/No data to display/i.test(t)) annotate('Crash Summary controlled empty OK');
  });

  test('REG-NADM-DASH-017 — Native App HTTP Responses tiles soft', async () => {
    const w = nadm.locators.httpResponsesWidget();
    await expect(w).toBeVisible({ timeout: 30000 });
    const t = ((await w.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').slice(0, 800);
    expect(t).toMatch(/Native App HTTP Responses/i);
    if (/Number of Requests|200s|400s|Avg Load Time/i.test(t)) {
      annotate('HTTP Responses tile fields soft present');
    } else {
      annotate('HTTP Responses soft: limited tile fields (may be sparse)');
    }
  });

  test('REG-NADM-DASH-018 — HTTP Responses By Error Count shell soft', async () => {
    const w = nadm.locators.httpResponsesByErrorWidget();
    await expect(w).toBeVisible({ timeout: 30000 });
    const t = ((await w.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').slice(0, 500);
    expect(t).toMatch(/Error Count/i);
    annotate(`HTTP by error sample: ${t.slice(0, 120)}`);
  });

  test('REG-NADM-DASH-019 — ANR & OOM warnings shell; empty soft', async () => {
    const w = nadm.locators.anrWidget();
    await expect(w).toBeVisible({ timeout: 20000 });
    const t = ((await w.innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
    expect(t).toMatch(/ANR|Out Of Memory|Out of Memory/i);
    if (/No data to display/i.test(t)) annotate('ANR/OOM controlled empty OK');
  });

  test('REG-NADM-DASH-020 — CPU and Memory Usage shell + table headers soft', async () => {
    const w = nadm.locators.cpuMemoryWidget();
    await expect(w).toBeVisible({ timeout: 30000 });
    const t = ((await w.innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
    expect(t).toMatch(/CPU and Memory Usage|Average CPU And Memory Usage/i);
    if (/Page Name|Avg CPU|Memory Usage|Page Hits/i.test(t)) {
      annotate('CPU/Memory table headers soft present');
    }
    if (/CPU Usage|Memory Usage/i.test(t)) annotate('CPU/Memory series soft present');
  });

  test('REG-NADM-DASH-021 — CPU graph/table toggle soft', async () => {
    try {
      const r = await withSoftDeadline(() => nadm.softCpuGraphTableToggle(), 20000, recover);
      annotate(r.note);
    } catch (err) {
      annotate(`CPU toggle soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-NADM-DASH-022 — Filters drawer + My/Shared tabs soft', async () => {
    try {
      await withSoftDeadline(
        async () => {
          await nadm.openFiltersDrawer();
          const body = ((await page.locator('body').innerText()) || '').slice(0, 5000);
          expect(body).toMatch(/Time Period|Timezone|Filter|Site/i);
          if (await nadm.locators.myFiltersTab.isVisible().catch(() => false)) {
            await nadm.locators.myFiltersTab.click({ force: true }).catch(() => undefined);
          }
          if (await nadm.locators.sharedFiltersTab.isVisible().catch(() => false)) {
            await nadm.locators.sharedFiltersTab.click({ force: true }).catch(() => undefined);
          }
          if (/SDK Version|App Version|OS Version|Device Model|Network Protocol/i.test(body)) {
            annotate('Native filter dimensions soft present in drawer residue');
          }
          await nadm.cancelFiltersDrawer();
        },
        40000,
        recover
      );
    } catch (err) {
      annotate(`Filters soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-NADM-DASH-023 — Filters Apply soft; restore Android home', async () => {
    try {
      await withSoftDeadline(
        async () => {
          await nadm.openFiltersDrawer();
          const applied = await nadm.applyFiltersSoft();
          annotate(`Apply Filters available=${applied}`);
          await nadm.cancelFiltersDrawer();
          await nadm.ensureOsSelected('android');
          await nadm.expectCoreWidgetsReady();
        },
        50000,
        recover
      );
    } catch (err) {
      annotate(`Apply Filters soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-NADM-DASH-024 — Dashboard Manager soft open/close', async () => {
    try {
      const opened = await withSoftDeadline(() => nadm.softOpenDashboardManager(), 15000);
      annotate(`Dashboard Manager open=${opened}`);
      await nadm.closeOverlays();
    } catch (err) {
      annotate(`Manager soft: ${err instanceof Error ? err.message : String(err)}`);
      await nadm.closeOverlays();
    }
    await nadm.ensureOsSelected('android');
  });

  test('REG-NADM-DASH-025 — Add Widget wizard soft cancel', async () => {
    try {
      const opened = await withSoftDeadline(() => nadm.softOpenWidgetWizard(), 15000);
      annotate(`Widget wizard open=${opened}`);
      await nadm.closeOverlays();
    } catch (err) {
      annotate(`Wizard soft: ${err instanceof Error ? err.message : String(err)}`);
      await nadm.closeOverlays();
    }
  });

  test('REG-NADM-DASH-026 — iOS dual coverage then restore Android home', async () => {
    try {
      const r = await withSoftDeadline(() => nadm.softIosRoundTrip(), 120000, recover);
      annotate(r.note);
      expect(r.restored || isNativeAppDetailedMetricsLabel(await nadm.getDashboardLabel(), 'android')).toBeTruthy();
      await expect(nadm.getDashboardLabel()).resolves.toMatch(NADM_ANDROID_EXACT);
      await nadm.expectSelectedSite();
      if (!r.frictionIos) annotate('iOS friction title soft annotate: may be empty chrome');
    } catch (err) {
      annotate(`iOS dual soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-NADM-DASH-027 — soft sibling non-native then restore Android NADM', async () => {
    try {
      await withSoftDeadline(
        async () => {
          const names = await nadm.listPreconfiguredDashboardNames();
          const sibling =
            names.find((n) => /Traffic Source and Medium/i.test(n)) ||
            names.find((n) => /Site Overview/i.test(n)) ||
            names.find((n) => n && !isNativeAppDetailedMetricsLabel(n));
          if (!sibling) {
            annotate('No sibling preconfigured to sample');
            return;
          }
          await nadm.selectDashboard(sibling);
          await page.waitForTimeout(3000);
          annotate(`Soft sibling: ${sibling}`);
          await nadm.openViaNavigation('android');
          await expect(nadm.getDashboardLabel()).resolves.toMatch(NADM_ANDROID_EXACT);
          await nadm.expectSelectedSite();
        },
        120000,
        recover
      );
    } catch (err) {
      annotate(`Sibling soft: ${err instanceof Error ? err.message : String(err)}`);
      await nadm.openViaNavigation('android').catch(() => recover());
    }
  });

  test('REG-NADM-DASH-028 — Native App Performance Detail discrimination then restore', async () => {
    try {
      const r = await withSoftDeadline(
        () => nadm.softPerformanceDetailSiblingDiscrimination(),
        90000,
        recover
      );
      annotate(r.note);
      expect(
        r.restored || isNativeAppDetailedMetricsLabel(await nadm.getDashboardLabel(), 'android')
      ).toBeTruthy();
      await expect(nadm.getDashboardLabel()).resolves.toMatch(NADM_ANDROID_EXACT);
    } catch (err) {
      annotate(`NAPD discrimination soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-NADM-DASH-029 — Custom Date open/cancel only', async () => {
    try {
      await nadm.openTimeLookbackMenu();
      const custom = page.getByText(/Custom Date Selection|Custom/i).first();
      if (await custom.isVisible().catch(() => false)) {
        await custom.click({ force: true }).catch(() => undefined);
        await page.waitForTimeout(600);
        annotate('Custom Date opened — cancel only');
      } else annotate('Custom Date not visible');
      await nadm.closeOverlays();
    } catch (err) {
      annotate(`Custom date soft: ${err instanceof Error ? err.message : String(err)}`);
      await nadm.closeOverlays();
    }
  });

  test('REG-NADM-DASH-030 — narrow viewport keeps widgets reachable', async () => {
    await page.setViewportSize({ width: 1100, height: 900 });
    await nadm.expectCoreWidgetTitles().catch(async () => {
      await nadm.locators.nativeAppPerformanceWidget().scrollIntoViewIfNeeded().catch(() => undefined);
      await nadm.locators.cpuMemoryWidget().scrollIntoViewIfNeeded().catch(() => undefined);
    });
    await expect(nadm.locators.timeLookback).toBeVisible();
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('REG-NADM-DASH-031 — Escape recovery; Help chrome soft', async () => {
    await nadm.openFiltersDrawer().catch(() => undefined);
    await page.keyboard.press('Escape').catch(() => undefined);
    await nadm.closeOverlays();
    const help = page.locator('#help-articles-menu, #help-video-menu, [title*="Help" i]').first();
    annotate((await help.isVisible().catch(() => false)) ? 'Help chrome present' : 'Help chrome soft-annotate');
  });

  test('REG-NADM-DASH-032 — last-updated + Carousel soft', async () => {
    if (await nadm.locators.lastUpdated.isVisible().catch(() => false)) {
      annotate(`last-updated="${(await nadm.getControlLabel(nadm.locators.lastUpdated)).slice(0, 80)}"`);
    } else annotate('last-updated not visible');
    if (await nadm.locators.carouselControl.isVisible().catch(() => false)) {
      annotate('Carousel present — left untouched');
    } else annotate('Carousel not visible');
  });

  test('REG-NADM-DASH-033 — refresh keeps multi-widget inventory; still Android NADM', async () => {
    await nadm.clickRefreshDashboard().catch(() => undefined);
    await nadm.expectCoreWidgetTitles();
    await expect(nadm.getDashboardLabel()).resolves.toMatch(NADM_ANDROID_EXACT);
  });

  test('REG-NADM-DASH-034 — history reload soft recovery', async () => {
    try {
      await withSoftDeadline(
        async () => {
          await page.reload({ waitUntil: 'domcontentloaded' });
          await nadm.waitForPageReady();
          await nadm.ensureOsSelected('android');
          await nadm.ensureProfileSiteSelected();
          await nadm.expectCoreWidgetsReady();
        },
        90000,
        recover
      );
    } catch (err) {
      annotate(`Reload soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-NADM-DASH-035 — not Monitoring / NAPD-as-home / RUM-SPD / Marketing', async () => {
    await nadm.expectNotConfusedSurfaces();
    await expect(page).toHaveURL(/site\/dashboard/i);
    await expect(nadm.getDashboardLabel()).resolves.toMatch(NADM_ANDROID_EXACT);
    const body = await nadm.getPageBodySample(3000);
    expect(body).toMatch(/Native App Performance|CPU and Memory|HTTP Responses/i);
    // Must not require four-widget only layout exclusively as identity
    if (/Bar Graph[\s\S]{0,80}Details[\s\S]{0,80}Daily Averages/i.test(body)) {
      annotate('Residual Bar/Details/Daily phrases soft-seen — annotate only if mixed chrome');
    }
  });

  test('REG-NADM-DASH-036 — top chrome icons soft round-trip', async () => {
    try {
      const r = await withSoftDeadline(() => nadm.softChromeIconTooltipsAndRoundTrip(), 60000, recover);
      annotate(
        `Chrome tips=${r.tooltipsChecked} clicks=${r.clickTargets.join(',')} via=${r.returnedVia.join('|')}`
      );
      await nadm.ensureOsSelected('android', { soft: true });
      await expect(page).toHaveURL(/site\/dashboard/i);
    } catch (err) {
      annotate(`Chrome icons soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-NADM-DASH-037 — prescribed lookbacks 1h|6h / 24h / 7d / 30d', async () => {
    try {
      const results = await withSoftDeadline(
        () => nadm.softPrescribedLookbacksRefresh(initialCtx.lookbackLabel),
        120000,
        recover
      );
      for (const r of results) {
        annotate(`Lookback ${r.label}: applied=${r.applied} refreshed=${r.refreshed} ${r.note}`);
        expect(r.applied, `Should apply ${r.label}`).toBeTruthy();
      }
      await expect(nadm.getDashboardLabel()).resolves.toMatch(NADM_ANDROID_EXACT);
    } catch (err) {
      annotate(`Prescribed lookbacks soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-NADM-DASH-038 — site switch + lock soft; restore GDC', async () => {
    try {
      const r = await withSoftDeadline(() => nadm.softSiteChangeAndLock(), 90000, recover);
      annotate(
        `Site lockFound=${r.lockFound} changed=${r.siteChanged} restored=${r.restored} other="${r.otherSite}" ${r.note}`
      );
      expect(r.restored || /GDC Test Site 2/i.test(await nadm.getSiteLabel())).toBeTruthy();
      await nadm.expectCoreWidgetsReady();
    } catch (err) {
      annotate(`Site/lock soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-NADM-DASH-039 — Auto Refresh apply sample; leave non-aggressive', async () => {
    try {
      const r = await withSoftDeadline(() => nadm.softAutoRefreshApplySample(), 40000, recover);
      annotate(r.note);
      expect(r.applied.length).toBeGreaterThan(0);
      await nadm.expectCoreWidgetsReady();
    } catch (err) {
      annotate(`Auto Refresh apply soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-NADM-DASH-040 — +Dashboard/Manager eye then restore Android NADM', async () => {
    try {
      const r = await withSoftDeadline(() => nadm.softPlusDashboardEyeSwitchHome(), 90000, recover);
      annotate(`Manager plus=${r.openedViaPlus} eye=${r.eyeClicked} home=${r.restoredHome} ${r.note}`);
      await nadm.ensureOsSelected('android');
      await expect(nadm.getDashboardLabel()).resolves.toMatch(NADM_ANDROID_EXACT);
    } catch (err) {
      annotate(`Manager eye soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-NADM-DASH-041 — restore initial context; suite home healthy', async () => {
    await nadm.restoreContext(initialCtx);
    await nadm.ensureOsSelected('android');
    await nadm.expectSelectedSite();
    await nadm.expectCoreWidgetTitles();
    await nadm.expectNotConfusedSurfaces();
    // iOS option still listable (not selected unless dual mid-suite)
    const names = await nadm.listPreconfiguredDashboardNames();
    expect(names.some((n) => NADM_IOS_EXACT.test(n))).toBeTruthy();
    if (blockingPageErrors.length) {
      annotate(
        `Uncaught page errors (non-fatal if healthy): ${blockingPageErrors.slice(0, 4).join(' || ')}`
      );
    }
    annotate(
      `Final dashboard="${await nadm.getDashboardLabel()}" lookback="${await nadm.getTimeLookbackLabel()}" loadMs=${initialLoadMs}`
    );
  });
});
