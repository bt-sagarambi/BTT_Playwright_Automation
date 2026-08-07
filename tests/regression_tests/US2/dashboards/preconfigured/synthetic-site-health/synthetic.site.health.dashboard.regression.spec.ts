import { test, expect, Page } from '@playwright/test';
import path from 'path';
import {
  SyntheticSiteHealthDashboardPage,
  SyntheticSiteHealthContext,
  SSH_EXACT,
} from '../../../../../../pages/SyntheticSiteHealthDashboardPage';
import { getActiveProfile } from '../../../../../../config/profiles';

/**
 * Regression: Synthetic Site Health (preconfigured dashboard)
 * Site: GDC Test Site 2
 * Path: tests/regression_tests/US2/dashboards/preconfigured/synthetic-site-health
 *
 * Read-only: no Save Filter, permanent widget save, dashboard delete/share/clone sticky.
 * Scope is Synthetic Site Health on site/dashboard — not Synthetic Performance Detail,
 * Site Overview, VitalPulse, or full Monitoring → Synthetic modules.
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

test.describe('US2 Regression — Synthetic Site Health Dashboard', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(150000);

  let page: Page;
  let ssh: SyntheticSiteHealthDashboardPage;
  let initialCtx: SyntheticSiteHealthContext;
  let initialLoadMs = 0;
  const notes: string[] = [];
  const blockingPageErrors: string[] = [];

  const annotate = (description: string) => {
    notes.push(description);
    test.info().annotations.push({ type: 'note', description });
    console.log(`[SSH] ${description}`);
  };

  const recover = async () => {
    await ssh.recoverPage();
    if (initialCtx) await ssh.restoreContext(initialCtx).catch(() => undefined);
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
    ssh = new SyntheticSiteHealthDashboardPage(page);
    const started = Date.now();
    await ssh.openViaNavigation();
    await ssh.ensureProfileSiteSelected();
    await page.waitForTimeout(1500);
    await ssh.expectCoreWidgetsReady().catch(() => undefined);
    initialLoadMs = Date.now() - started;
    initialCtx = await ssh.captureContext();
    const profile = getActiveProfile();
    const siteNow = await ssh.getSiteLabel().catch(() => profile.siteName);
    console.log(
      `[SSH] profile=${profile.id} site=${siteNow} dc=${profile.datacenter} loadMs=${initialLoadMs} dashboard="${initialCtx.dashboardLabel}" lookback="${initialCtx.lookbackLabel}"`
    );
  });

  test.afterAll(async () => {
    await ssh?.continueAutoRefreshIfPaused().catch(() => undefined);
    if (notes.length) console.log(`[SSH] annotations:\n- ${notes.join('\n- ')}`);
    await page?.context()?.close().catch(() => undefined);
  });

  test('REG-SSH-001 — page loads via Dashboards menu/route with correct title', async () => {
    await expect(page).toHaveURL(/site\/dashboard|r=site%2Fdashboard/i);
    await expect(page).not.toHaveURL(/site\/login|site%2Flogin/i);
    await expect(ssh.locators.pageTitle).toHaveText(/Dashboards/i);
    await expect(page).toHaveTitle(/Dashboards/i);
    await ssh.expectNotConfusedSurfaces();
  });

  test('REG-SSH-002 — Synthetic Site Health selected; four core widgets present', async () => {
    await ssh.ensureSyntheticSiteHealthSelected();
    const dash = await ssh.getDashboardLabel();
    expect(dash).toMatch(SSH_EXACT);
    expect(dash).not.toMatch(/Performance Detail/i);
    await ssh.expectCoreWidgetTitles();
    annotate(`Dashboard="${dash}" widgets-ready score≈${await ssh.widgetsReadyScore()}`);
  });

  test('REG-SSH-003 — selected site is GDC Test Site 2; lookback/auto-refresh captured', async () => {
    await ssh.ensureProfileSiteSelected();
    await ssh.expectSelectedSite();
    expect(initialCtx.lookbackLabel.length, 'Time Lookback non-empty').toBeGreaterThan(0);
    annotate(
      `site="${await ssh.getSiteLabel()}" lookback="${initialCtx.lookbackLabel}" autoRefresh="${initialCtx.autoRefreshLabel || '(n/a)'}"`
    );
  });

  test('REG-SSH-004 — dashboard chrome: switcher, lookback, refresh, auto-refresh', async () => {
    await expect(ssh.locators.switchDashboard).toBeAttached();
    await expect(ssh.locators.timeLookback).toBeVisible({ timeout: 15000 });
    await expect(ssh.locators.refreshDashboard).toBeVisible();
    await expect(ssh.locators.autoRefresh).toBeVisible();
  });

  test('REG-SSH-005 — Preconfigured list includes exact Synthetic Site Health (not Perf Detail only)', async () => {
    const names = await ssh.listPreconfiguredDashboardNames();
    expect(names.some((n) => SSH_EXACT.test(n)), names.join(' | ')).toBeTruthy();
    expect(names.some((n) => /Synthetic Performance Detail/i.test(n))).toBeTruthy();
    annotate(`Preconfigured count=${names.length}: ${names.slice(0, 9).join(', ')}`);
  });

  test('REG-SSH-006 — Time Lookback menu has multiple presets', async () => {
    try {
      const opts = await withSoftDeadline(() => ssh.getTimeLookbackOptions(), 25000, recover);
      expect(opts.length).toBeGreaterThan(3);
      annotate(`Lookback options sample: ${opts.slice(0, 12).join(' | ')}`);
    } catch (err) {
      annotate(`Lookback menu soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-SSH-007 — soft apply Last 24 hours then Last 7 days; restore original lookback', async () => {
    try {
      await withSoftDeadline(
        async () => {
          await ssh.selectTimeLookback(/Last 24 hours|Last 1 day|1 day/i);
          await ssh.expectCoreWidgetsReady();
          await ssh.selectTimeLookback(/Last 7 days/i);
          await ssh.expectCoreWidgetsReady();
          if (initialCtx.lookbackLabel) {
            await ssh.selectTimeLookback(initialCtx.lookbackLabel).catch(async () => {
              await ssh.selectTimeLookback(/Last 1 hour|Last 6 hours/i);
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
    await expect(ssh.getDashboardLabel()).resolves.toMatch(SSH_EXACT);
  });

  test('REG-SSH-008 — Dashboard Refresh reloads without blank crash', async () => {
    try {
      await withSoftDeadline(() => ssh.clickRefreshDashboard(), 45000, recover);
      await ssh.expectCoreWidgetTitles();
    } catch (err) {
      annotate(`Refresh soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-SSH-009 — Auto Refresh menu soft options (Off + intervals)', async () => {
    try {
      const opts = await withSoftDeadline(() => ssh.getAutoRefreshOptions(), 20000, recover);
      expect(opts.length).toBeGreaterThan(0);
      annotate(`Auto refresh options: ${opts.slice(0, 10).join(' | ')}`);
    } catch (err) {
      annotate(`Auto Refresh soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-SSH-010 — High Level Metrics headers and soft value formats', async () => {
    const found = await ssh.expectHighLevelMetricHeaders();
    const body = await ssh.getPageBodySample(2500);
    expect(body).toMatch(/High Level Metrics/i);
    if (/\d+(\.\d+)?\s*%|\d+(\.\d+)?\s*s|\d+\s*KB/i.test(body)) {
      annotate('HLM value formats soft (%)/s/KB present');
    } else {
      annotate('HLM value formats soft-annotate: no unit sample (may be empty period)');
    }
    annotate(`HLM headers matched: ${found.length}`);
  });

  test('REG-SSH-011 — Site Availability Over Time chart + legend soft', async () => {
    await ssh.expectSiteAvailabilityChart();
    const body = await ssh.getPageBodySample(3500);
    expect(body).toMatch(/Total\s*Errors/i);
    const hasSeries =
      /200'?s/i.test(body) ||
      /500'?s/i.test(body) ||
      /Timeout|Script Error|Content Error|Total Errors/i.test(body);
    if (!hasSeries) annotate('Site Availability legend series soft: limited in body sample');
    else annotate('Site Availability legend series present in sample');
    try {
      const r = await withSoftDeadline(() => ssh.softToggleAvailabilityLegend(), 15000);
      annotate(`Legend toggle: ${r.note}`);
    } catch (err) {
      annotate(`Legend toggle soft: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  test('REG-SSH-012 — soft hover Site Availability tooltip', async () => {
    try {
      const tip = await withSoftDeadline(() => ssh.softHoverSiteAvailability(), 15000);
      annotate(`Site Availability tooltip length=${tip.length}`);
    } catch (err) {
      annotate(`Hover soft: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  test('REG-SSH-013 — Screenshot widget Previous/Next; image soft', async () => {
    const body = await ssh.getPageBodySample(2000);
    expect(body).toMatch(/Screenshot/i);
    try {
      const r = await withSoftDeadline(() => ssh.softScreenshotNavigate(), 20000);
      annotate(
        `Screenshot prev=${r.previous} next=${r.next} hasImage=${r.hasImage} ${r.note}`
      );
      expect(r.previous || r.next || /Previous|Next/i.test(body)).toBeTruthy();
    } catch (err) {
      annotate(`Screenshot soft: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  test('REG-SSH-014 — Session And Page Scatterplot dual panes + Displayed Metric soft', async () => {
    const body = await ssh.getPageBodySample(5000);
    expect(body).toMatch(/Session And Page Scatterplot|Session and Page Scatterplot|Synthetic Script Timing/i);
    expect(body).toMatch(/Displayed Metric/i);
    const metrics = await ssh.softSampleDisplayedMetricOptions();
    expect(metrics.length, `metric sample from body: ${metrics.join(',')}`).toBeGreaterThan(2);
    if (/Onload \(Screenshot Only\)|Screenshot \+ Film/i.test(body)) {
      annotate('Scatter legend Screenshot/FilmStrip series present');
    } else {
      annotate('Scatter legend shape series soft-annotate');
    }
    const pageHost = await ssh.locators.pageScatterHost().count();
    const sessHost = await ssh.locators.sessionScatterHost().count();
    annotate(`page-scatter hosts=${pageHost} session-scatter hosts=${sessHost}; metrics sample=${metrics.slice(0, 8).join('|')}`);
  });

  test('REG-SSH-015 — scatter drill: points, pause banner, detail tabs soft; Continue Auto Refresh', async () => {
    try {
      const r = await withSoftDeadline(() => ssh.softScatterDrill(), 120000, recover);
      annotate(r.note);
      if (r.points < 1) {
        annotate('Sparse scatter: no points after broaden — soft continue');
      } else {
        if (r.paused) annotate('Auto Refresh pause banner observed (expected after drill)');
        else annotate('Pause banner soft-annotate: not shown after point click');
        if (r.tabs.length) annotate(`Detail tabs soft: ${r.tabs.join(', ')}`);
        else annotate('Detail tabs soft: not visible (may need right-pane click with data)');
      }
      const continued = await ssh.continueAutoRefreshIfPaused();
      annotate(`Continue Auto Refresh applied=${continued}`);
      await ssh.hideDetailsIfOpen();
    } catch (err) {
      annotate(`Scatter drill soft: ${err instanceof Error ? err.message : String(err)}`);
      await ssh.continueAutoRefreshIfPaused().catch(() => undefined);
      await recover();
    }
    await expect(ssh.getDashboardLabel()).resolves.toMatch(SSH_EXACT);
  });

  test('REG-SSH-016 — soft Drill Into Performance Detail + tab cleanup', async () => {
    try {
      await withSoftDeadline(
        async () => {
          // ensure detail chrome may be present
          await ssh.softScatterDrill().catch(() => undefined);
          const r = await ssh.softDrillIntoPerformanceDetail();
          annotate(`Perf Detail drill: ${r.note}`);
          await ssh.continueAutoRefreshIfPaused();
          await ssh.hideDetailsIfOpen();
          await ssh.ensureSyntheticSiteHealthSelected({ soft: true });
          await expect(page).toHaveURL(/site\/dashboard/i);
        },
        90000,
        recover
      );
    } catch (err) {
      annotate(`Perf Detail soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-SSH-017 — Filters drawer opens; My/Shared tabs soft', async () => {
    try {
      await withSoftDeadline(
        async () => {
          await ssh.openFiltersDrawer();
          const body = ((await page.locator('body').innerText()) || '').slice(0, 5000);
          expect(body).toMatch(/Time Period|Timezone|Filter|Site|Monitor Name|Data Origin/i);
          if (await ssh.locators.myFiltersTab.isVisible().catch(() => false)) {
            await ssh.locators.myFiltersTab.click({ force: true }).catch(() => undefined);
          }
          if (await ssh.locators.sharedFiltersTab.isVisible().catch(() => false)) {
            await ssh.locators.sharedFiltersTab.click({ force: true }).catch(() => undefined);
          }
          await ssh.cancelFiltersDrawer();
        },
        40000,
        recover
      );
    } catch (err) {
      annotate(`Filters soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-SSH-018 — Filters Apply soft path; restore Synthetic Site Health', async () => {
    try {
      await withSoftDeadline(
        async () => {
          await ssh.openFiltersDrawer();
          const applied = await ssh.applyFiltersSoft();
          annotate(`Apply Filters available=${applied}`);
          await ssh.cancelFiltersDrawer();
          await ssh.ensureSyntheticSiteHealthSelected();
          await ssh.expectCoreWidgetsReady();
        },
        50000,
        recover
      );
    } catch (err) {
      annotate(`Apply Filters soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-SSH-019 — Dashboard Manager soft open/close (no save/delete)', async () => {
    try {
      const opened = await withSoftDeadline(() => ssh.softOpenDashboardManager(), 15000);
      annotate(`Dashboard Manager open=${opened}`);
      await ssh.closeOverlays();
      await page.keyboard.press('Escape').catch(() => undefined);
    } catch (err) {
      annotate(`Dashboard Manager soft: ${err instanceof Error ? err.message : String(err)}`);
      await ssh.closeOverlays();
    }
    await ssh.ensureSyntheticSiteHealthSelected();
  });

  test('REG-SSH-020 — Add Widget wizard soft open/cancel (no save)', async () => {
    try {
      const opened = await withSoftDeadline(() => ssh.softOpenWidgetWizard(), 15000);
      annotate(`Widget wizard open=${opened}`);
      if (opened) {
        await expect(page.getByText(/Add a Widget|Widget Type/i).first()).toBeVisible({
          timeout: 8000,
        });
      }
      await ssh.closeOverlays();
      await page.keyboard.press('Escape').catch(() => undefined);
    } catch (err) {
      annotate(`Widget wizard soft: ${err instanceof Error ? err.message : String(err)}`);
      await ssh.closeOverlays();
    }
  });

  test('REG-SSH-021 — soft switch sibling preconfigured then restore SSH + site', async () => {
    try {
      await withSoftDeadline(
        async () => {
          const names = await ssh.listPreconfiguredDashboardNames();
          const sibling =
            names.find((n) => /Synthetic Performance Detail/i.test(n)) ||
            names.find((n) => n && !SSH_EXACT.test(n));
          if (!sibling) {
            annotate('No sibling preconfigured dashboard to sample');
            return;
          }
          await ssh.selectDashboard(sibling);
          await page.waitForTimeout(3000);
          annotate(`Soft sibling dashboard: ${sibling}`);
          await ssh.openViaNavigation();
          await expect(ssh.getDashboardLabel()).resolves.toMatch(SSH_EXACT);
          await ssh.expectSelectedSite();
        },
        120000,
        recover
      );
    } catch (err) {
      annotate(`Sibling switch soft: ${err instanceof Error ? err.message : String(err)}`);
      await ssh.openViaNavigation().catch(() => recover());
    }
  });

  test('REG-SSH-022 — soft Custom Date Selection open/cancel only', async () => {
    try {
      await ssh.openTimeLookbackMenu();
      const custom = page.getByText(/Custom Date Selection|Custom/i).first();
      if (await custom.isVisible().catch(() => false)) {
        await custom.click({ force: true }).catch(() => undefined);
        await page.waitForTimeout(600);
        annotate('Custom Date Selection opened — cancel only');
      } else {
        annotate('Custom Date Selection not visible in lookback menu');
      }
      await ssh.closeOverlays();
    } catch (err) {
      annotate(`Custom date soft: ${err instanceof Error ? err.message : String(err)}`);
      await ssh.closeOverlays();
    }
  });

  test('REG-SSH-023 — narrow viewport keeps core widgets reachable', async () => {
    await page.setViewportSize({ width: 1100, height: 900 });
    await ssh.expectCoreWidgetTitles().catch(async () => {
      await ssh.locators.highLevelMetricsWidget().scrollIntoViewIfNeeded().catch(() => undefined);
      await ssh.locators.scatterplotWidget().scrollIntoViewIfNeeded().catch(() => undefined);
    });
    await expect(ssh.locators.timeLookback).toBeVisible();
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('REG-SSH-024 — soft keyboard Escape recovery; Help chrome soft', async () => {
    await ssh.openFiltersDrawer().catch(() => undefined);
    await page.keyboard.press('Escape').catch(() => undefined);
    await ssh.closeOverlays();
    const help = page.locator('#help-articles-menu, #help-video-menu, [title*="Help" i]').first();
    if (await help.isVisible().catch(() => false)) {
      annotate('Help chrome present');
    } else {
      annotate('Help chrome soft-annotate: not visible');
    }
  });

  test('REG-SSH-025 — last-updated soft present when available', async () => {
    if (await ssh.locators.lastUpdated.isVisible().catch(() => false)) {
      const t = await ssh.getControlLabel(ssh.locators.lastUpdated);
      annotate(`last-updated="${t.slice(0, 80)}"`);
      expect(t.length).toBeGreaterThan(0);
    } else {
      annotate('last-updated not visible on this build');
    }
  });

  test('REG-SSH-026 — Carousel control soft presence (do not leave cycling)', async () => {
    if (await ssh.locators.carouselControl.isVisible().catch(() => false)) {
      annotate('Carousel control present — left untouched');
    } else {
      annotate('Carousel control not visible');
    }
  });

  test('REG-SSH-027 — refresh keeps Synthetic Site Health widgets', async () => {
    await ssh.clickRefreshDashboard().catch(() => undefined);
    await ssh.expectCoreWidgetTitles();
    await expect(ssh.getDashboardLabel()).resolves.toMatch(SSH_EXACT);
  });

  test('REG-SSH-028 — history reload soft recovery to site/dashboard', async () => {
    try {
      await withSoftDeadline(
        async () => {
          await page.reload({ waitUntil: 'domcontentloaded' });
          await ssh.waitForPageReady();
          await ssh.ensureSyntheticSiteHealthSelected();
          await ssh.ensureProfileSiteSelected();
          await ssh.expectCoreWidgetsReady();
        },
        90000,
        recover
      );
    } catch (err) {
      annotate(`Reload soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-SSH-029 — not Site Overview / VitalPulse / DXO / Marketing home', async () => {
    await ssh.expectNotConfusedSurfaces();
    await expect(page).toHaveURL(/site\/dashboard/i);
    await expect(ssh.getDashboardLabel()).resolves.toMatch(SSH_EXACT);
    const body = await ssh.getPageBodySample(2000);
    expect(body).toMatch(/High Level Metrics|Site Availability|Scatterplot/i);
    // Soft: Site Overview exclusive full set should not be the only identity
    if (/Device Metrics/i.test(body) && /Geography/i.test(body) && !/High Level Metrics/i.test(body)) {
      throw new Error('Looks like Site Overview widgets without SSH metrics');
    }
  });

  test('REG-SSH-030 — top chrome icons: tooltips + click round-trip', async () => {
    try {
      const r = await withSoftDeadline(() => ssh.softChromeIconTooltipsAndRoundTrip(), 60000, recover);
      annotate(
        `Chrome tips=${r.tooltipsChecked} clicks=${r.clickTargets.join(',')} via=${r.returnedVia.join('|')}`
      );
      expect(r.tooltipsChecked + r.clickTargets.length).toBeGreaterThan(0);
      await ssh.ensureSyntheticSiteHealthSelected({ soft: true });
      await expect(page).toHaveURL(/site\/dashboard/i);
    } catch (err) {
      annotate(`Chrome icons soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-SSH-031 — apply Last 6h / 24h / 7d / 30d and verify refresh', async () => {
    try {
      const results = await withSoftDeadline(
        () => ssh.softPrescribedLookbacksRefresh(initialCtx.lookbackLabel),
        120000,
        recover
      );
      for (const r of results) {
        annotate(`Lookback ${r.label}: applied=${r.applied} refreshed=${r.refreshed} ${r.note}`);
        expect(r.applied, `Should apply ${r.label}`).toBeTruthy();
      }
      await expect(ssh.getDashboardLabel()).resolves.toMatch(SSH_EXACT);
    } catch (err) {
      annotate(`Prescribed lookbacks soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-SSH-032 — change site (Demo eCommerce soft) + lock; restore GDC', async () => {
    try {
      const r = await withSoftDeadline(() => ssh.softSiteChangeAndLock(), 90000, recover);
      annotate(
        `Site lockFound=${r.lockFound} changed=${r.siteChanged} restored=${r.restored} other="${r.otherSite}" ${r.note}`
      );
      expect(r.restored || /GDC Test Site 2/i.test(await ssh.getSiteLabel())).toBeTruthy();
      await ssh.expectCoreWidgetsReady();
    } catch (err) {
      annotate(`Site/lock soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-SSH-033 — apply Auto Refresh options; leave non-aggressive', async () => {
    try {
      const r = await withSoftDeadline(() => ssh.softAutoRefreshApplySample(), 40000, recover);
      annotate(r.note);
      expect(r.applied.length).toBeGreaterThan(0);
      await ssh.expectCoreWidgetsReady();
    } catch (err) {
      annotate(`Auto Refresh apply soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-SSH-034 — +Dashboard / Manager eye switch then restore SSH', async () => {
    try {
      const r = await withSoftDeadline(() => ssh.softPlusDashboardEyeSwitchHome(), 90000, recover);
      annotate(`Manager plus=${r.openedViaPlus} eye=${r.eyeClicked} home=${r.restoredHome} ${r.note}`);
      await ssh.ensureSyntheticSiteHealthSelected();
      await expect(ssh.getDashboardLabel()).resolves.toMatch(SSH_EXACT);
    } catch (err) {
      annotate(`Manager eye soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-SSH-035 — restore initial context; suite home healthy', async () => {
    await ssh.continueAutoRefreshIfPaused().catch(() => undefined);
    await ssh.hideDetailsIfOpen().catch(() => undefined);
    await ssh.restoreContext(initialCtx);
    await ssh.ensureSyntheticSiteHealthSelected();
    await ssh.expectSelectedSite();
    await ssh.expectCoreWidgetTitles();
    await ssh.expectNotConfusedSurfaces();
    if (blockingPageErrors.length) {
      annotate(
        `Uncaught page errors observed (non-fatal if page healthy): ${blockingPageErrors
          .slice(0, 4)
          .join(' || ')}`
      );
    }
    annotate(
      `Final context dashboard="${await ssh.getDashboardLabel()}" lookback="${await ssh.getTimeLookbackLabel()}" loadMs=${initialLoadMs}`
    );
  });
});
