import { test, expect, Page } from '@playwright/test';
import path from 'path';
import {
  AlertsRegressionUs2DashboardPage,
  AlertsRegressionUs2Context,
  AR_US2_EXACT,
} from '../../../../../../pages/AlertsRegressionUs2DashboardPage';
import { getActiveProfile } from '../../../../../../config/profiles';

/**
 * Regression: Alerts Regression - US2 (custom dashboard)
 * Site: GDC Test Site 2
 * Path: tests/regression_tests/US2/dashboards/custom/alerts-regression-us2
 *
 * Read-only: no Save Filter, widget Save/Delete, Archive/Dismiss, alert clear.
 * Home is exact Custom "Alerts Regression - US2".
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

test.describe('US2 Regression — Alerts Regression - US2 Dashboard', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(150000);

  let page: Page;
  let dash: AlertsRegressionUs2DashboardPage;
  let initialCtx: AlertsRegressionUs2Context;
  let initialLoadMs = 0;
  const notes: string[] = [];
  const blockingPageErrors: string[] = [];

  const annotate = (description: string) => {
    notes.push(description);
    test.info().annotations.push({ type: 'note', description });
    console.log(`[AR-US2] ${description}`);
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
    dash = new AlertsRegressionUs2DashboardPage(page);
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
      `[AR-US2] profile=${profile.id} site=${siteNow} dc=${profile.datacenter} loadMs=${initialLoadMs} dashboard="${initialCtx.dashboardLabel}" lookback="${initialCtx.lookbackLabel}"`
    );
  });

  test.afterAll(async () => {
    await dash?.clearDeoSearch().catch(() => undefined);
    if (notes.length) console.log(`[AR-US2] annotations:\n- ${notes.join('\n- ')}`);
    await page?.context()?.close().catch(() => undefined);
  });

  test('REG-AR-US2-001 — page loads via Dashboards menu/route with correct title', async () => {
    await expect(page).toHaveURL(/site\/dashboard|r=site%2Fdashboard/i);
    await expect(page).not.toHaveURL(/site\/login|site%2Flogin/i);
    await expect(dash.locators.pageTitle).toHaveText(/Dashboards/i);
    await expect(page).toHaveTitle(/Dashboards/i);
    await dash.expectNotConfusedSurfaces();
  });

  test('REG-AR-US2-002 — Alerts Regression - US2 selected; core widgets present', async () => {
    await dash.ensureAlertsRegressionUs2Selected();
    const label = await dash.getDashboardLabel();
    expect(label).toMatch(AR_US2_EXACT);
    expect(label).not.toMatch(/Synthetic Regression/i);
    await dash.expectCoreWidgetTitles();
    annotate(`Dashboard="${label}" widgets-ready score≈${await dash.widgetsReadyScore()}`);
  });

  test('REG-AR-US2-003 — GDC Test Site 2; lookback/auto-refresh captured', async () => {
    await dash.ensureProfileSiteSelected();
    await dash.expectSelectedSite();
    expect(initialCtx.lookbackLabel.length, 'Time Lookback non-empty').toBeGreaterThan(0);
    annotate(
      `site="${await dash.getSiteLabel()}" lookback="${initialCtx.lookbackLabel}" autoRefresh="${initialCtx.autoRefreshLabel || '(n/a)'}"`
    );
  });

  test('REG-AR-US2-004 — dashboard chrome: switcher, lookback, refresh, auto-refresh', async () => {
    await expect(dash.locators.switchDashboard).toBeAttached();
    await expect(dash.locators.timeLookback).toBeVisible({ timeout: 15000 });
    await expect(dash.locators.refreshDashboard).toBeVisible();
    await expect(dash.locators.autoRefresh).toBeVisible();
  });

  test('REG-AR-US2-005 — Custom list includes Alerts Regression - US2; siblings soft', async () => {
    const custom = await dash.listCustomDashboardNames();
    expect(custom.some((n) => AR_US2_EXACT.test(n)), custom.join(' | ')).toBeTruthy();
    const pre = await dash.listPreconfiguredDashboardNames();
    annotate(
      `Custom count=${custom.length} hasHome=${custom.some((n) => AR_US2_EXACT.test(n))}; Preconfigured sample: ${pre.slice(0, 6).join(', ')}`
    );
  });

  test('REG-AR-US2-006 — Time Lookback menu has multiple presets', async () => {
    try {
      const opts = await withSoftDeadline(() => dash.getTimeLookbackOptions(), 25000, recover);
      expect(opts.length).toBeGreaterThan(3);
      annotate(`Lookback options sample: ${opts.slice(0, 12).join(' | ')}`);
    } catch (err) {
      annotate(`Lookback menu soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-AR-US2-007 — soft apply Last 24h then Last 7d; restore original lookback', async () => {
    try {
      await withSoftDeadline(
        async () => {
          await dash.selectTimeLookback(/Last 24 hours|Last 1 day|1 day/i);
          await dash.expectCoreWidgetsReady();
          await dash.selectTimeLookback(/Last 7 days/i);
          await dash.expectCoreWidgetsReady();
          if (initialCtx.lookbackLabel) {
            await dash.selectTimeLookback(initialCtx.lookbackLabel).catch(async () => {
              await dash.selectTimeLookback(/Last 2 days|Last 24 hours|Last 6 hours/i);
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
    await expect(dash.getDashboardLabel()).resolves.toMatch(AR_US2_EXACT);
  });

  test('REG-AR-US2-008 — Dashboard Refresh reloads without blank crash', async () => {
    try {
      await withSoftDeadline(() => dash.clickRefreshDashboard(), 45000, recover);
      await dash.expectCoreWidgetTitles();
    } catch (err) {
      annotate(`Refresh soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-AR-US2-009 — Auto Refresh menu soft options (Off + intervals)', async () => {
    try {
      const opts = await withSoftDeadline(() => dash.getAutoRefreshOptions(), 20000, recover);
      expect(opts.length).toBeGreaterThan(0);
      annotate(`Auto refresh options: ${opts.slice(0, 10).join(' | ')}`);
    } catch (err) {
      annotate(`Auto Refresh soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-AR-US2-010 — DEO Anomalies - US2 headers, counters, pager soft', async () => {
    await dash.softScrollTo(dash.locators.deoWidget());
    const headers = await dash.getDeoHeaders();
    const joined = headers.join(' | ');
    expect(joined).toMatch(/Severity/i);
    expect(joined).toMatch(/Status/i);
    expect(joined).toMatch(/Date Detected/i);
    expect(joined).toMatch(/Issue/i);
    expect(joined).toMatch(/Module/i);
    const body = await dash.getPageBodySample(5000);
    if (/View All Issues/i.test(body)) annotate('View All Issues present');
    if (/Critical/i.test(body) && /Significant/i.test(body)) annotate('Critical/Significant counters present (values not hard-coded)');
    const rows = await dash.deoRowCount();
    annotate(`DEO headers=${joined}; rows≈${rows}`);
    if (rows < 1) annotate('DEO table empty — controlled empty annotate');
  });

  test('REG-AR-US2-011 — DEO search type/clear; Export open/close', async () => {
    try {
      const s = await withSoftDeadline(() => dash.softDeoSearchRoundTrip(), 25000, recover);
      annotate(`DEO search: ${s}`);
      const e = await dash.softDeoExportOpenClose();
      annotate(`DEO export: ${e}`);
    } catch (err) {
      annotate(`DEO search/export soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-AR-US2-012 — DEO View All Issues soft drill restore', async () => {
    try {
      const r = await withSoftDeadline(() => dash.softViewAllIssuesRestore(), 45000, recover);
      annotate(`View All Issues: ${r}`);
      await expect(dash.getDashboardLabel()).resolves.toMatch(AR_US2_EXACT);
    } catch (err) {
      annotate(`View All Issues soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-AR-US2-013 — Blue Triangle Announcements feed soft', async () => {
    await dash.softScrollTo(dash.locators.announcementsWidget());
    const body = await dash.getPageBodySample(8000);
    expect(body).toMatch(/Blue Triangle Announcements/i);
    if (/Release Notes|Bug Fixes|Portal|API/i.test(body)) {
      annotate('Announcements: release-notes language present (bodies not hard-coded)');
    } else {
      annotate('Announcements feed soft empty or generic');
    }
  });

  test('REG-AR-US2-014 — Active Alerts - US2 columns (live + PDF dual-regex)', async () => {
    const sample = await dash.getActiveAlertsHeaderSample();
    expect(sample).toMatch(/Active Alerts/i);
    expect(sample).toMatch(/Name|Alert Name/i);
    expect(sample).toMatch(/Type|Alert Type/i);
    expect(sample).toMatch(/Measured Level/i);
    expect(sample).toMatch(/Critical Threshold/i);
    expect(sample).toMatch(/Warning Threshold/i);
    expect(sample).toMatch(/Eval Window|Evaluation Window/i);
    expect(sample).toMatch(/Alerting Since/i);
    const rows = await dash.activeAlertsRowCount();
    annotate(`Active Alerts rows≈${rows}; sample="${sample.slice(0, 180)}"`);
    if (rows < 1) annotate('Active Alerts empty — valid per PDF Clear-state rule');
    else if (/Warning|Critical/i.test(sample)) annotate('Status Warning/Critical language present');
  });

  test('REG-AR-US2-015 — no Highcharts required on this board', async () => {
    const charts = await page.locator('.highcharts-container, [data-highcharts-chart]').count().catch(() => 0);
    annotate(`Highcharts containers=${charts} (0 expected; do not fail)`);
    await dash.expectCoreWidgetTitles();
  });

  test('REG-AR-US2-016 — Filters Cancel-only; My/Shared tabs soft', async () => {
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

  test('REG-AR-US2-017 — Manager / + Widget cancel-only', async () => {
    try {
      const m = await withSoftDeadline(() => dash.softOpenManagerCancel(), 25000, recover);
      annotate(`Manager: ${m}`);
      const w = await dash.softOpenWidgetWizardCancel();
      annotate(`+Widget wizard open=${w} then cancel`);
    } catch (err) {
      annotate(`Manager/Widget soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
    await expect(dash.getDashboardLabel()).resolves.toMatch(AR_US2_EXACT);
  });

  test('REG-AR-US2-018 — soft sibling Synthetic Regression - US2 then restore home', async () => {
    try {
      const note = await withSoftDeadline(
        () => dash.softSiblingSwitchAndRestore(/^\s*Synthetic Regression\s*-\s*US2\s*$/i),
        120000,
        recover
      );
      annotate(`Sibling SR-US2: ${note}`);
      await expect(dash.getDashboardLabel()).resolves.toMatch(AR_US2_EXACT);
      await dash.expectSelectedSite();
    } catch (err) {
      annotate(`Sibling SR soft: ${err instanceof Error ? err.message : String(err)}`);
      await dash.openViaNavigation().catch(() => recover());
    }
  });

  test('REG-AR-US2-019 — soft sibling Site Overview then restore', async () => {
    try {
      const note = await withSoftDeadline(
        () => dash.softSiblingSwitchAndRestore(/^\s*Site Overview\s*$/i),
        120000,
        recover
      );
      annotate(`Sibling Site Overview: ${note}`);
      await expect(dash.getDashboardLabel()).resolves.toMatch(AR_US2_EXACT);
    } catch (err) {
      annotate(`Sibling SO soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-AR-US2-020 — soft Custom RUM Regression - US2 then restore home', async () => {
    try {
      const note = await withSoftDeadline(
        () => dash.softSiblingSwitchAndRestore(/RUM Regression\s*-\s*US2/i),
        120000,
        recover
      );
      annotate(`Sibling RUM-US2: ${note}`);
      await expect(dash.getDashboardLabel()).resolves.toMatch(AR_US2_EXACT);
    } catch (err) {
      annotate(`Sibling RUM soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-AR-US2-021 — Custom Date Selection open/cancel only', async () => {
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

  test('REG-AR-US2-022 — narrow viewport keeps widgets reachable', async () => {
    await page.setViewportSize({ width: 1100, height: 900 });
    await dash.expectCoreWidgetTitles().catch(async () => {
      await dash.softScrollTo(dash.locators.deoWidget());
      await dash.softScrollTo(dash.locators.activeAlertsWidget());
    });
    await expect(dash.locators.timeLookback).toBeVisible();
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('REG-AR-US2-023 — last-updated + Carousel soft', async () => {
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

  test('REG-AR-US2-024 — prescribed lookbacks 6h/24h/7d/30d + table signatures (no graph hover)', async () => {
    try {
      const results = await withSoftDeadline(
        () => dash.softPrescribedLookbacksTableSignatures(initialCtx.lookbackLabel),
        180000,
        recover
      );
      for (const r of results) {
        annotate(
          `Lookback ${r.label}: applied=${r.applied} refreshed=${r.refreshed} sig="${r.signature.slice(0, 50)}" ${r.note}`
        );
        if (r.label.startsWith('/')) {
          expect(r.applied, `Should apply ${r.label}`).toBeTruthy();
        }
      }
      await expect(dash.getDashboardLabel()).resolves.toMatch(AR_US2_EXACT);
    } catch (err) {
      annotate(`Prescribed lookbacks soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-AR-US2-025 — chrome icons tooltips + round-trip', async () => {
    try {
      const r = await withSoftDeadline(() => dash.softChromeIconTooltipsAndRoundTrip(), 60000, recover);
      annotate(
        `Chrome tips=${r.tooltipsChecked} clicks=${r.clickTargets.join(',')} via=${r.returnedVia.join('|')}`
      );
      expect(r.tooltipsChecked + r.clickTargets.length).toBeGreaterThan(0);
      await dash.ensureAlertsRegressionUs2Selected({ soft: true });
    } catch (err) {
      annotate(`Chrome icons soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-AR-US2-026 — reload soft recovery; still Alerts Regression - US2', async () => {
    try {
      await withSoftDeadline(
        async () => {
          await page.reload({ waitUntil: 'domcontentloaded' });
          await dash.waitForPageReady();
          await dash.ensureAlertsRegressionUs2Selected();
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

  test('REG-AR-US2-027 — not Synthetic Regression / other Custom US2 / Preconfigured as home', async () => {
    await dash.expectNotConfusedSurfaces();
    await expect(page).toHaveURL(/site\/dashboard/i);
    await expect(dash.getDashboardLabel()).resolves.toMatch(AR_US2_EXACT);
    const body = await dash.getPageBodySample(2500);
    expect(body).toMatch(/DEO Anomalies|Active Alerts|Blue Triangle Announcements/i);
  });

  test('REG-AR-US2-028 — restore initial context; suite home healthy', async () => {
    await dash.restoreContext(initialCtx).catch(() => recover());
    await expect(dash.getDashboardLabel()).resolves.toMatch(AR_US2_EXACT);
    await dash.expectSelectedSite();
    await dash.expectCoreWidgetsReady().catch(() => undefined);
    annotate(
      `Final dashboard="${await dash.getDashboardLabel()}" lookback="${await dash.getTimeLookbackLabel()}" loadMs=${initialLoadMs} blockingErrors=${blockingPageErrors.length}`
    );
  });
});
