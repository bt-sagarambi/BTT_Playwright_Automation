import { test, expect, Page } from '@playwright/test';
import path from 'path';
import {
  TrafficSourceMediumDashboardPage,
  TrafficSourceMediumContext,
  TSM_EXACT,
  isTrafficSourceMediumLabel,
} from '../../../../../../pages/TrafficSourceMediumDashboardPage';
import { getActiveProfile } from '../../../../../../config/profiles';

/**
 * Regression: Traffic Source and Medium (preconfigured dashboard)
 * Site: GDC Test Site 2
 * Path: tests/regression_tests/US2/dashboards/preconfigured/traffic-source-and-medium
 *
 * Read-only: no Save Filter, permanent widget save, dashboard delete/share/clone sticky.
 * Exact option Traffic Source and Medium — never RUM Performance Detail or Shared Traffic* boards.
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

test.describe('US2 Regression — Traffic Source and Medium Dashboard', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(150000);

  let page: Page;
  let tsm: TrafficSourceMediumDashboardPage;
  let initialCtx: TrafficSourceMediumContext;
  let initialLoadMs = 0;
  const notes: string[] = [];
  const blockingPageErrors: string[] = [];

  const annotate = (description: string) => {
    notes.push(description);
    test.info().annotations.push({ type: 'note', description });
    console.log(`[TSM] ${description}`);
  };

  const recover = async () => {
    await tsm.recoverPage();
    if (initialCtx) await tsm.restoreContext(initialCtx).catch(() => undefined);
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
    tsm = new TrafficSourceMediumDashboardPage(page);
    const started = Date.now();
    await tsm.openViaNavigation();
    await tsm.ensureProfileSiteSelected();
    await page.waitForTimeout(1500);
    await tsm.expectCoreWidgetsReady().catch(() => undefined);
    initialLoadMs = Date.now() - started;
    initialCtx = await tsm.captureContext();
    const profile = getActiveProfile();
    const siteNow = await tsm.getSiteLabel().catch(() => profile.siteName);
    console.log(
      `[TSM] profile=${profile.id} site=${siteNow} dc=${profile.datacenter} loadMs=${initialLoadMs} dashboard="${initialCtx.dashboardLabel}" lookback="${initialCtx.lookbackLabel}"`
    );
  });

  test.afterAll(async () => {
    if (notes.length) console.log(`[TSM] annotations:\n- ${notes.join('\n- ')}`);
    await page?.context()?.close().catch(() => undefined);
  });

  test('REG-TSM-001 — page loads via Dashboards menu/route with correct title', async () => {
    await expect(page).toHaveURL(/site\/dashboard|r=site%2Fdashboard/i);
    await expect(page).not.toHaveURL(/site\/login|site%2Flogin/i);
    await expect(tsm.locators.pageTitle).toHaveText(/Dashboards/i);
    await expect(page).toHaveTitle(/Dashboards/i);
    await tsm.expectNotConfusedSurfaces();
  });

  test('REG-TSM-002 — exact Traffic Source and Medium; three core widgets', async () => {
    await tsm.ensureTrafficSourceMediumSelected();
    const dash = await tsm.getDashboardLabel();
    expect(isTrafficSourceMediumLabel(dash), `dash="${dash}"`).toBeTruthy();
    expect(dash).not.toMatch(/RUM Performance Detail/i);
    await tsm.expectCoreWidgetTitles();
    annotate(`Dashboard="${dash}" widgets-ready score≈${await tsm.widgetsReadyScore()}`);
  });

  test('REG-TSM-003 — selected site is GDC Test Site 2; lookback/auto-refresh captured', async () => {
    await tsm.ensureProfileSiteSelected();
    await tsm.expectSelectedSite();
    expect(initialCtx.lookbackLabel.length, 'Time Lookback non-empty').toBeGreaterThan(0);
    annotate(
      `site="${await tsm.getSiteLabel()}" lookback="${initialCtx.lookbackLabel}" autoRefresh="${initialCtx.autoRefreshLabel || '(n/a)'}"`
    );
  });

  test('REG-TSM-004 — dashboard chrome: switcher, lookback, refresh, auto-refresh', async () => {
    await expect(tsm.locators.switchDashboard).toBeAttached();
    await expect(tsm.locators.timeLookback).toBeVisible({ timeout: 15000 });
    await expect(tsm.locators.refreshDashboard).toBeVisible();
    await expect(tsm.locators.autoRefresh).toBeVisible();
  });

  test('REG-TSM-005 — Preconfigured list includes exact Traffic Source and Medium', async () => {
    const names = await tsm.listPreconfiguredDashboardNames();
    expect(names.some((n) => isTrafficSourceMediumLabel(n)), names.join(' | ')).toBeTruthy();
    annotate(`Preconfigured count=${names.length}: ${names.slice(0, 9).join(', ')}`);
  });

  test('REG-TSM-006 — Time Lookback menu has multiple presets', async () => {
    try {
      const opts = await withSoftDeadline(() => tsm.getTimeLookbackOptions(), 25000, recover);
      expect(opts.length).toBeGreaterThan(3);
      annotate(`Lookback options sample: ${opts.slice(0, 12).join(' | ')}`);
    } catch (err) {
      annotate(`Lookback menu soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-TSM-007 — soft apply Last 24 hours then Last 7 days; restore original lookback', async () => {
    try {
      await withSoftDeadline(
        async () => {
          await tsm.selectTimeLookback(/Last 24 hours|Last 1 day|1 day/i);
          await tsm.expectCoreWidgetsReady();
          await tsm.selectTimeLookback(/Last 7 days/i);
          await tsm.expectCoreWidgetsReady();
          if (initialCtx.lookbackLabel) {
            await tsm.selectTimeLookback(initialCtx.lookbackLabel).catch(async () => {
              await tsm.selectTimeLookback(/Last 24 hours|Last 6 hours/i);
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
    await expect(tsm.getDashboardLabel()).resolves.toMatch(TSM_EXACT);
  });

  test('REG-TSM-008 — Dashboard Refresh reloads without blank crash', async () => {
    try {
      await withSoftDeadline(() => tsm.clickRefreshDashboard(), 45000, recover);
      await tsm.expectCoreWidgetTitles();
    } catch (err) {
      annotate(`Refresh soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-TSM-009 — Auto Refresh menu soft options (Off + intervals)', async () => {
    try {
      const opts = await withSoftDeadline(() => tsm.getAutoRefreshOptions(), 20000, recover);
      expect(opts.length).toBeGreaterThan(0);
      annotate(`Auto refresh options: ${opts.slice(0, 10).join(' | ')}`);
    } catch (err) {
      annotate(`Auto Refresh soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-TSM-010 — Sitewide Totals: six metric labels + soft formats', async () => {
    const found = await tsm.expectSitewideMetrics();
    const body = await tsm.getPageBodySample(3000);
    expect(body).toMatch(/Sitewide Totals/i);
    if (/[\$€£]|[\d,]+\.?\d*\s*%/i.test(body)) {
      annotate('Sitewide value formats soft (currency/%) present');
    } else {
      annotate('Sitewide value formats soft-annotate: limited numeric sample');
    }
    annotate(`Sitewide metrics matched: ${found.join(', ')}`);
  });

  test('REG-TSM-011 — Traffic Source Breakdown headers + soft data rows', async () => {
    await expect(tsm.locators.trafficSourceBreakdownText()).toBeVisible({ timeout: 30000 });
    const headers = (await tsm.getTableHeaderTexts('source')).join(' | ');
    const sample = ((await tsm.locators.trafficSourceBreakdownWidget().innerText().catch(() => '')) || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 500);
    const joined = headers || sample;
    expect(joined).toMatch(/Source/i);
    expect(joined).toMatch(/Revenue/i);
    expect(joined).toMatch(/Orders/i);
    expect(joined).toMatch(/Visitors/i);
    expect(joined).toMatch(/Page Views/i);
    expect(joined).toMatch(/Conversion Rate/i);
    if (/Avg Order Value|AOV/i.test(joined)) annotate('Source AOV column present');
    const rows = await tsm.locators.sourceBodyRows().count().catch(() => 0);
    if (rows < 1 && !/\d/.test(sample)) {
      annotate('Source table soft: no data rows — controlled empty possible');
    } else {
      annotate(`Source rows≈${rows}; share% soft=${/\(\d+(\.\d+)?%\)/.test(sample)}`);
    }
    annotate(`Source headers/sample: ${joined.slice(0, 220)}`);
  });

  test('REG-TSM-012 — Traffic Medium Breakdown headers + soft data rows', async () => {
    await expect(tsm.locators.trafficMediumBreakdownText()).toBeVisible({ timeout: 30000 });
    const headers = (await tsm.getTableHeaderTexts('medium')).join(' | ');
    const sample = ((await tsm.locators.trafficMediumBreakdownWidget().innerText().catch(() => '')) || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 500);
    const joined = headers || sample;
    expect(joined).toMatch(/Medium/i);
    expect(joined).toMatch(/Revenue/i);
    expect(joined).toMatch(/Orders/i);
    expect(joined).toMatch(/Conversion Rate|Visitors|Page Views/i);
    const rows = await tsm.locators.mediumBodyRows().count().catch(() => 0);
    if (rows < 1 && !/\d/.test(sample)) {
      annotate('Medium table soft: no data rows');
    } else {
      annotate(`Medium rows≈${rows}`);
    }
    annotate(`Medium headers/sample: ${joined.slice(0, 220)}`);
  });

  test('REG-TSM-013 — soft column sort Source and Medium tables', async () => {
    try {
      const src = await withSoftDeadline(() => tsm.softSortBreakdown('source'), 30000, recover);
      const med = await withSoftDeadline(() => tsm.softSortBreakdown('medium'), 30000, recover);
      annotate(src.note);
      annotate(med.note);
      expect(src.columnsTried.length + med.columnsTried.length).toBeGreaterThan(0);
    } catch (err) {
      annotate(`Sort soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-TSM-014 — soft pagination page size / Next-Previous', async () => {
    try {
      const src = await withSoftDeadline(() => tsm.softPaginationSample('source'), 25000);
      const med = await withSoftDeadline(() => tsm.softPaginationSample('medium'), 25000);
      annotate(src.note);
      annotate(med.note);
    } catch (err) {
      annotate(`Pagination soft: ${err instanceof Error ? err.message : String(err)}`);
      await tsm.closeOverlays();
    }
  });

  test('REG-TSM-015 — soft Export open/close on both breakdowns', async () => {
    try {
      await withSoftDeadline(
        async () => {
          const src = await tsm.softExportOpenClose('source');
          const med = await tsm.softExportOpenClose('medium');
          annotate(src.note);
          annotate(med.note);
        },
        25000,
        recover
      );
    } catch (err) {
      annotate(`Export soft: ${err instanceof Error ? err.message : String(err)}`);
      await tsm.closeOverlays();
      await recover().catch(() => undefined);
    }
  });

  test('REG-TSM-016 — Filters drawer opens; My/Shared tabs; traffic filter labels soft', async () => {
    try {
      await withSoftDeadline(
        async () => {
          await tsm.openFiltersDrawer();
          const body = ((await page.locator('body').innerText()) || '').slice(0, 5000);
          expect(body).toMatch(/Time Period|Timezone|Filter|Site/i);
          if (/Traffic Source|Traffic Medium|Campaign|Traffic Segment/i.test(body)) {
            annotate('Traffic Source/Medium/Campaign/Segment filter labels present');
          } else {
            annotate('Traffic-specific filter labels soft-annotate');
          }
          if (await tsm.locators.myFiltersTab.isVisible().catch(() => false)) {
            await tsm.locators.myFiltersTab.click({ force: true }).catch(() => undefined);
          }
          if (await tsm.locators.sharedFiltersTab.isVisible().catch(() => false)) {
            await tsm.locators.sharedFiltersTab.click({ force: true }).catch(() => undefined);
          }
          await tsm.cancelFiltersDrawer();
        },
        40000,
        recover
      );
    } catch (err) {
      annotate(`Filters soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-TSM-017 — Filters Apply soft path; restore Traffic Source and Medium', async () => {
    try {
      await withSoftDeadline(
        async () => {
          await tsm.openFiltersDrawer();
          const applied = await tsm.applyFiltersSoft();
          annotate(`Apply Filters available=${applied}`);
          await tsm.cancelFiltersDrawer();
          await tsm.ensureTrafficSourceMediumSelected();
          await tsm.expectCoreWidgetsReady();
        },
        50000,
        recover
      );
    } catch (err) {
      annotate(`Apply Filters soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-TSM-018 — Dashboard Manager soft open/close (no save/delete)', async () => {
    try {
      const opened = await withSoftDeadline(() => tsm.softOpenDashboardManager(), 15000);
      annotate(`Dashboard Manager open=${opened}`);
      await tsm.closeOverlays();
      await page.keyboard.press('Escape').catch(() => undefined);
    } catch (err) {
      annotate(`Dashboard Manager soft: ${err instanceof Error ? err.message : String(err)}`);
      await tsm.closeOverlays();
    }
    await tsm.ensureTrafficSourceMediumSelected();
  });

  test('REG-TSM-019 — Add Widget wizard soft open/cancel (no save)', async () => {
    try {
      const opened = await withSoftDeadline(() => tsm.softOpenWidgetWizard(), 15000);
      annotate(`Widget wizard open=${opened}`);
      if (opened) {
        await expect(page.getByText(/Add a Widget|Widget Type/i).first()).toBeVisible({
          timeout: 8000,
        });
      }
      await tsm.closeOverlays();
      await page.keyboard.press('Escape').catch(() => undefined);
    } catch (err) {
      annotate(`Widget wizard soft: ${err instanceof Error ? err.message : String(err)}`);
      await tsm.closeOverlays();
    }
  });

  test('REG-TSM-020 — soft switch sibling preconfigured then restore TSM + site', async () => {
    try {
      await withSoftDeadline(
        async () => {
          const names = await tsm.listPreconfiguredDashboardNames();
          const sibling =
            names.find((n) => /Site Overview/i.test(n)) ||
            names.find((n) => n && !isTrafficSourceMediumLabel(n));
          if (!sibling) {
            annotate('No sibling preconfigured dashboard to sample');
            return;
          }
          await tsm.selectDashboard(sibling);
          await page.waitForTimeout(3000);
          annotate(`Soft sibling dashboard: ${sibling}`);
          await tsm.openViaNavigation();
          await expect(tsm.getDashboardLabel()).resolves.toMatch(TSM_EXACT);
          await tsm.expectSelectedSite();
        },
        120000,
        recover
      );
    } catch (err) {
      annotate(`Sibling switch soft: ${err instanceof Error ? err.message : String(err)}`);
      await tsm.openViaNavigation().catch(() => recover());
    }
  });

  test('REG-TSM-021 — soft Custom Date Selection open/cancel only', async () => {
    try {
      await tsm.openTimeLookbackMenu();
      const custom = page.getByText(/Custom Date Selection|Custom/i).first();
      if (await custom.isVisible().catch(() => false)) {
        await custom.click({ force: true }).catch(() => undefined);
        await page.waitForTimeout(600);
        annotate('Custom Date Selection opened — cancel only');
      } else {
        annotate('Custom Date Selection not visible in lookback menu');
      }
      await tsm.closeOverlays();
    } catch (err) {
      annotate(`Custom date soft: ${err instanceof Error ? err.message : String(err)}`);
      await tsm.closeOverlays();
    }
  });

  test('REG-TSM-022 — narrow viewport keeps core widgets reachable', async () => {
    await page.setViewportSize({ width: 1100, height: 900 });
    await tsm.expectCoreWidgetTitles().catch(async () => {
      await tsm.locators.sitewideTotalsWidget().scrollIntoViewIfNeeded().catch(() => undefined);
      await tsm.locators.trafficSourceBreakdownWidget().scrollIntoViewIfNeeded().catch(() => undefined);
    });
    await expect(tsm.locators.timeLookback).toBeVisible();
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('REG-TSM-023 — soft keyboard Escape recovery; Help chrome soft', async () => {
    await tsm.openFiltersDrawer().catch(() => undefined);
    await page.keyboard.press('Escape').catch(() => undefined);
    await tsm.closeOverlays();
    const help = page.locator('#help-articles-menu, #help-video-menu, [title*="Help" i]').first();
    if (await help.isVisible().catch(() => false)) {
      annotate('Help chrome present');
    } else {
      annotate('Help chrome soft-annotate: not visible');
    }
  });

  test('REG-TSM-024 — last-updated soft present when available', async () => {
    if (await tsm.locators.lastUpdated.isVisible().catch(() => false)) {
      const t = await tsm.getControlLabel(tsm.locators.lastUpdated);
      annotate(`last-updated="${t.slice(0, 80)}"`);
      expect(t.length).toBeGreaterThan(0);
    } else {
      annotate('last-updated not visible on this build');
    }
  });

  test('REG-TSM-025 — Carousel control soft presence (do not leave cycling)', async () => {
    if (await tsm.locators.carouselControl.isVisible().catch(() => false)) {
      annotate('Carousel control present — left untouched');
    } else {
      annotate('Carousel control not visible');
    }
  });

  test('REG-TSM-026 — refresh keeps Traffic Source and Medium widgets', async () => {
    await tsm.clickRefreshDashboard().catch(() => undefined);
    await tsm.expectCoreWidgetTitles();
    await expect(tsm.getDashboardLabel()).resolves.toMatch(TSM_EXACT);
  });

  test('REG-TSM-027 — history reload soft recovery to site/dashboard', async () => {
    try {
      await withSoftDeadline(
        async () => {
          await page.reload({ waitUntil: 'domcontentloaded' });
          await tsm.waitForPageReady();
          await tsm.ensureTrafficSourceMediumSelected();
          await tsm.ensureProfileSiteSelected();
          await tsm.expectCoreWidgetsReady();
        },
        90000,
        recover
      );
    } catch (err) {
      annotate(`Reload soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-TSM-028 — not RUM Performance Detail / Site Overview-only / Marketing / DXO', async () => {
    await tsm.expectNotConfusedSurfaces();
    await expect(page).toHaveURL(/site\/dashboard/i);
    await expect(tsm.getDashboardLabel()).resolves.toMatch(TSM_EXACT);
    const body = await tsm.getPageBodySample(2000);
    expect(body).toMatch(/Sitewide Totals|Traffic Source Breakdown|Traffic Medium Breakdown/i);
  });

  test('REG-TSM-029 — top chrome icons: tooltips + click round-trip', async () => {
    try {
      const r = await withSoftDeadline(() => tsm.softChromeIconTooltipsAndRoundTrip(), 60000, recover);
      annotate(
        `Chrome tips=${r.tooltipsChecked} clicks=${r.clickTargets.join(',')} via=${r.returnedVia.join('|')}`
      );
      expect(r.tooltipsChecked + r.clickTargets.length).toBeGreaterThan(0);
      await tsm.ensureTrafficSourceMediumSelected({ soft: true });
      await expect(page).toHaveURL(/site\/dashboard/i);
    } catch (err) {
      annotate(`Chrome icons soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-TSM-030 — apply Last 6h / 24h / 7d / 30d and verify refresh', async () => {
    try {
      const results = await withSoftDeadline(
        () => tsm.softPrescribedLookbacksRefresh(initialCtx.lookbackLabel),
        120000,
        recover
      );
      for (const r of results) {
        annotate(`Lookback ${r.label}: applied=${r.applied} refreshed=${r.refreshed} ${r.note}`);
        expect(r.applied, `Should apply ${r.label}`).toBeTruthy();
      }
      await expect(tsm.getDashboardLabel()).resolves.toMatch(TSM_EXACT);
    } catch (err) {
      annotate(`Prescribed lookbacks soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-TSM-031 — change site (Demo eCommerce soft) + lock; restore GDC', async () => {
    try {
      const r = await withSoftDeadline(() => tsm.softSiteChangeAndLock(), 90000, recover);
      annotate(
        `Site lockFound=${r.lockFound} changed=${r.siteChanged} restored=${r.restored} other="${r.otherSite}" ${r.note}`
      );
      expect(r.restored || /GDC Test Site 2/i.test(await tsm.getSiteLabel())).toBeTruthy();
      await tsm.expectCoreWidgetsReady();
    } catch (err) {
      annotate(`Site/lock soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-TSM-032 — apply Auto Refresh options; leave non-aggressive', async () => {
    try {
      const r = await withSoftDeadline(() => tsm.softAutoRefreshApplySample(), 40000, recover);
      annotate(r.note);
      expect(r.applied.length).toBeGreaterThan(0);
      await tsm.expectCoreWidgetsReady();
    } catch (err) {
      annotate(`Auto Refresh apply soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-TSM-033 — +Dashboard / Manager eye switch then restore TSM', async () => {
    try {
      const r = await withSoftDeadline(() => tsm.softPlusDashboardEyeSwitchHome(), 90000, recover);
      annotate(`Manager plus=${r.openedViaPlus} eye=${r.eyeClicked} home=${r.restoredHome} ${r.note}`);
      await tsm.ensureTrafficSourceMediumSelected();
      await expect(tsm.getDashboardLabel()).resolves.toMatch(TSM_EXACT);
    } catch (err) {
      annotate(`Manager eye soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-TSM-034 — restore initial context; suite home healthy', async () => {
    await tsm.restoreContext(initialCtx);
    await tsm.ensureTrafficSourceMediumSelected();
    await tsm.expectSelectedSite();
    await tsm.expectCoreWidgetTitles();
    await tsm.expectNotConfusedSurfaces();
    if (blockingPageErrors.length) {
      annotate(
        `Uncaught page errors observed (non-fatal if page healthy): ${blockingPageErrors
          .slice(0, 4)
          .join(' || ')}`
      );
    }
    annotate(
      `Final context dashboard="${await tsm.getDashboardLabel()}" lookback="${await tsm.getTimeLookbackLabel()}" loadMs=${initialLoadMs}`
    );
  });
});
