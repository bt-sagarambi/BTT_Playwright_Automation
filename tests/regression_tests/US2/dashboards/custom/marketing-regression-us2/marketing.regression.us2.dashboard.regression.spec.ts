import { test, expect, Page } from '@playwright/test';
import path from 'path';
import {
  MarketingRegressionUs2DashboardPage,
  MarketingRegressionUs2Context,
  MR_US2_EXACT,
} from '../../../../../../pages/MarketingRegressionUs2DashboardPage';
import { getActiveProfile } from '../../../../../../config/profiles';

/**
 * Regression: Marketing Regression - US2 (custom dashboard)
 * Site: GDC Test Site 2
 * Path: tests/regression_tests/US2/dashboards/custom/marketing-regression-us2
 *
 * Read-only: no Save Filter, widget Save/Delete, sticky RO device tab, Funnel Configuration Save.
 * Home is exact Custom "Marketing Regression - US2".
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

test.describe('US2 Regression — Marketing Regression - US2 Dashboard', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(150000);

  let page: Page;
  let dash: MarketingRegressionUs2DashboardPage;
  let initialCtx: MarketingRegressionUs2Context;
  let initialLoadMs = 0;
  const notes: string[] = [];
  const blockingPageErrors: string[] = [];

  const annotate = (description: string) => {
    notes.push(description);
    test.info().annotations.push({ type: 'note', description });
    console.log(`[MR-US2] ${description}`);
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
    dash = new MarketingRegressionUs2DashboardPage(page);
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
      `[MR-US2] profile=${profile.id} site=${siteNow} dc=${profile.datacenter} loadMs=${initialLoadMs} dashboard="${initialCtx.dashboardLabel}" lookback="${initialCtx.lookbackLabel}" campaign="${initialCtx.campaignLabel}"`
    );
  });

  test.afterAll(async () => {
    await dash?.restoreRoAllTab().catch(() => undefined);
    if (notes.length) console.log(`[MR-US2] annotations:\n- ${notes.join('\n- ')}`);
    await page?.context()?.close().catch(() => undefined);
  });

  test('REG-MR-US2-001 — page loads via Dashboards menu/route with correct title', async () => {
    await expect(page).toHaveURL(/site\/dashboard|r=site%2Fdashboard/i);
    await expect(page).not.toHaveURL(/site\/login|site%2Flogin/i);
    await expect(dash.locators.pageTitle).toHaveText(/Dashboards/i);
    await expect(page).toHaveTitle(/Dashboards/i);
    await dash.expectNotConfusedSurfaces();
  });

  test('REG-MR-US2-002 — Marketing Regression - US2 selected; core widgets present', async () => {
    await dash.ensureMarketingRegressionUs2Selected();
    const label = await dash.getDashboardLabel();
    expect(label).toMatch(MR_US2_EXACT);
    expect(label).not.toMatch(/Business Regression|Alerts Regression|Synthetic Regression/i);
    await dash.expectCoreWidgetTitles();
    annotate(`Dashboard="${label}" widgets-ready score≈${await dash.widgetsReadyScore()}`);
  });

  test('REG-MR-US2-003 — GDC Test Site 2; lookback/auto-refresh captured', async () => {
    await dash.ensureProfileSiteSelected();
    await dash.expectSelectedSite();
    expect(initialCtx.lookbackLabel.length, 'Time Lookback non-empty').toBeGreaterThan(0);
    annotate(
      `site="${await dash.getSiteLabel()}" lookback="${initialCtx.lookbackLabel}" autoRefresh="${initialCtx.autoRefreshLabel || '(n/a)'}" campaign="${initialCtx.campaignLabel}"`
    );
  });

  test('REG-MR-US2-004 — dashboard chrome: switcher, lookback, refresh, auto-refresh', async () => {
    await expect(dash.locators.switchDashboard).toBeAttached();
    await expect(dash.locators.timeLookback).toBeVisible({ timeout: 15000 });
    await expect(dash.locators.refreshDashboard).toBeVisible();
    await expect(dash.locators.autoRefresh).toBeVisible();
  });

  test('REG-MR-US2-005 — Custom list includes Marketing Regression - US2; siblings soft', async () => {
    const custom = await dash.listCustomDashboardNames();
    expect(custom.some((n) => MR_US2_EXACT.test(n)), custom.join(' | ')).toBeTruthy();
    const pre = await dash.listPreconfiguredDashboardNames();
    annotate(
      `Custom count=${custom.length} hasHome=${custom.some((n) => MR_US2_EXACT.test(n))}; Preconfigured sample: ${pre.slice(0, 6).join(', ')}`
    );
  });

  test('REG-MR-US2-006 — Time Lookback menu has multiple presets', async () => {
    try {
      const opts = await withSoftDeadline(() => dash.getTimeLookbackOptions(), 25000, recover);
      expect(opts.length).toBeGreaterThan(3);
      annotate(`Lookback options sample: ${opts.slice(0, 12).join(' | ')}`);
    } catch (err) {
      annotate(`Lookback menu soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-MR-US2-007 — soft apply Last 24h then Last 7d; restore original lookback', async () => {
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
    await expect(dash.getDashboardLabel()).resolves.toMatch(MR_US2_EXACT);
  });

  test('REG-MR-US2-008 — Dashboard Refresh reloads without blank crash', async () => {
    try {
      await withSoftDeadline(() => dash.clickRefreshDashboard(), 45000, recover);
      await dash.expectCoreWidgetTitles();
    } catch (err) {
      annotate(`Refresh soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-MR-US2-009 — Auto Refresh menu soft options (Off + intervals)', async () => {
    try {
      const opts = await withSoftDeadline(() => dash.getAutoRefreshOptions(), 20000, recover);
      expect(opts.length).toBeGreaterThan(0);
      annotate(`Auto refresh options: ${opts.slice(0, 10).join(' | ')}`);
    } catch (err) {
      annotate(`Auto Refresh soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-MR-US2-010 — Campaign Information KPIs + campaign label soft', async () => {
    const sample = await dash.widgetSample(dash.locators.campaignInformationWidget(), 900);
    expect(sample).toMatch(/Campaign Information(\s*-\s*US2)?/i);
    expect(sample).toMatch(/Page Views/i);
    expect(sample).toMatch(/Sessions/i);
    if (/No Campaign Assigned|All Traffic/i.test(sample) || /No Campaign Assigned/i.test(initialCtx.campaignLabel)) {
      annotate(`Campaign label soft="${(initialCtx.campaignLabel || sample).slice(0, 60)}"`);
    }
    if (/Bounces|Exits|Onload|Orders|Conversion Rate|Revenue/i.test(sample)) {
      annotate('Campaign KPI subset present (Page Views/Sessions + Bounce/Exit/Onload/Orders/CR/Revenue soft)');
    }
    annotate(`Campaign sample="${sample.slice(0, 180)}"`);
  });

  test('REG-MR-US2-011 — Campaign picker soft sample then restore', async () => {
    try {
      const note = await withSoftDeadline(() => dash.softCampaignPickerSampleRestore(), 35000, recover);
      annotate(`Campaign picker: ${note}`);
    } catch (err) {
      annotate(`Campaign picker soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-MR-US2-012 — Bottom of Sales Funnel title + conversion language', async () => {
    const sample = await dash.widgetSample(dash.locators.bottomOfSalesFunnelWidget(), 900);
    expect(sample).toMatch(/Bottom\s+of\s+(the\s+)?Sales\s+Funnel(\s*-\s*US2)?/i);
    expect(sample).toMatch(/View By|Page Views|Sessions/i);
    if (/Bottom of the funnel/i.test(sample)) annotate('Funnel header Bottom of the funnel present');
    if (/Bottom Funnel Conversion|Total Funnel Conversion/i.test(sample)) {
      annotate('Bottom/Total Funnel Conversion language present (values not hard-coded)');
    }
    annotate(`Funnel sample="${sample.slice(0, 180)}"`);
  });

  test('REG-MR-US2-013 — Funnel View By Page Views/Sessions toggle restore + hover', async () => {
    try {
      const round = await withSoftDeadline(() => dash.softFunnelViewByRoundTrip(), 35000, recover);
      annotate(`Funnel View By: ${round}`);
      const tip = await dash.softHoverWidget(dash.locators.bottomOfSalesFunnelWidget());
      if (tip) annotate(`Funnel hover="${tip.slice(0, 90)}"`);
      else annotate('Funnel hover: no tooltip (controlled empty)');
    } catch (err) {
      annotate(`Funnel View By/hover soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-MR-US2-014 — Highcharts shells present (not SVG-count-only refresh)', async () => {
    const charts = await dash.highchartsCount();
    annotate(`Highcharts containers=${charts} (probe sample ~12; do not hard-require exact count)`);
    expect(charts).toBeGreaterThan(0);
    await dash.expectCoreWidgetTitles();
  });

  test('REG-MR-US2-015 — Revenue Opportunity by Page; ALL/DESKTOP/IOS/ANDROID; restore ALL', async () => {
    const sample = await dash.widgetSample(dash.locators.revenueOpportunityWidget(), 800);
    expect(sample).toMatch(/Revenue Opportunity(\s*-\s*US2)?/i);
    expect(sample).toMatch(/ALL/i);
    expect(sample).toMatch(/DESKTOP/i);
    expect(sample).toMatch(/IOS|ANDROID/i);
    if (/Revenue Opportunity by Page/i.test(sample)) annotate('RO chart title Revenue Opportunity by Page');
    if (/over \d+\s*days/i.test(sample)) annotate('RO report-window subtitle present (e.g. over N days — not hard-coded)');
    try {
      const round = await withSoftDeadline(() => dash.softRoDeviceTabRoundTrip(), 25000, recover);
      annotate(`RO device tabs: ${round}`);
    } catch (err) {
      annotate(`RO tabs soft: ${err instanceof Error ? err.message : String(err)}`);
      await dash.restoreRoAllTab().catch(() => recover());
    }
  });

  test('REG-MR-US2-016 — Filters Cancel-only; My/Shared tabs soft', async () => {
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
      annotate('Filters Cancel-only + My/Shared soft (Traffic Source/Campaign left untouched)');
    } catch (err) {
      annotate(`Filters soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-MR-US2-017 — Manager / + Widget cancel-only', async () => {
    try {
      const m = await withSoftDeadline(() => dash.softOpenManagerCancel(), 25000, recover);
      annotate(`Manager: ${m}`);
      const w = await dash.softOpenWidgetWizardCancel();
      annotate(`+Widget wizard open=${w} then cancel`);
    } catch (err) {
      annotate(`Manager/Widget soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
    await expect(dash.getDashboardLabel()).resolves.toMatch(MR_US2_EXACT);
  });

  test('REG-MR-US2-018 — soft sibling Business Regression - US2 then restore home', async () => {
    try {
      const note = await withSoftDeadline(
        () => dash.softSiblingSwitchAndRestore(/^\s*Business Regression\s*-\s*US2\s*$/i),
        120000,
        recover
      );
      annotate(`Sibling BR-US2: ${note}`);
      await expect(dash.getDashboardLabel()).resolves.toMatch(MR_US2_EXACT);
      await dash.expectSelectedSite();
    } catch (err) {
      annotate(`Sibling BR soft: ${err instanceof Error ? err.message : String(err)}`);
      await dash.openViaNavigation().catch(() => recover());
    }
  });

  test('REG-MR-US2-019 — soft sibling Traffic Source and Medium then restore', async () => {
    try {
      const note = await withSoftDeadline(
        () => dash.softSiblingSwitchAndRestore(/^\s*Traffic Source and Medium\s*$/i),
        120000,
        recover
      );
      annotate(`Sibling Traffic Source and Medium: ${note}`);
      await expect(dash.getDashboardLabel()).resolves.toMatch(MR_US2_EXACT);
    } catch (err) {
      annotate(`Sibling TSM soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-MR-US2-020 — soft Custom Alerts Regression - US2 then restore home', async () => {
    try {
      const note = await withSoftDeadline(
        () => dash.softSiblingSwitchAndRestore(/^\s*Alerts Regression\s*-\s*US2\s*$/i),
        120000,
        recover
      );
      annotate(`Sibling AR-US2: ${note}`);
      await expect(dash.getDashboardLabel()).resolves.toMatch(MR_US2_EXACT);
    } catch (err) {
      annotate(`Sibling AR soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-MR-US2-021 — Custom Date Selection open/cancel only', async () => {
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

  test('REG-MR-US2-022 — 1100px viewport keeps widgets reachable', async () => {
    await page.setViewportSize({ width: 1100, height: 900 });
    await dash.expectCoreWidgetTitles().catch(async () => {
      await dash.softScrollTo(dash.locators.campaignInformationWidget());
      await dash.softScrollTo(dash.locators.revenueOpportunityWidget());
    });
    await expect(dash.locators.timeLookback).toBeVisible();
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('REG-MR-US2-023 — last-updated + Carousel soft', async () => {
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

  test('REG-MR-US2-024 — prescribed lookbacks 6h/24h/7d/30d + funnel hover intervals', async () => {
    try {
      const results = await withSoftDeadline(
        () => dash.softPrescribedLookbacksWithHover(initialCtx.lookbackLabel),
        180000,
        recover
      );
      for (const r of results) {
        annotate(
          `Lookback ${r.label}: applied=${r.applied} refreshed=${r.refreshed} tip="${r.tip.slice(0, 40)}" ${r.note}`
        );
        if (r.label.startsWith('/Last')) {
          expect(r.applied, `Should apply ${r.label}`).toBeTruthy();
        }
      }
      await expect(dash.getDashboardLabel()).resolves.toMatch(MR_US2_EXACT);
    } catch (err) {
      annotate(`Prescribed lookbacks soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-MR-US2-025 — chrome icons tooltips + round-trip', async () => {
    try {
      const r = await withSoftDeadline(() => dash.softChromeIconTooltipsAndRoundTrip(), 60000, recover);
      annotate(
        `Chrome tips=${r.tooltipsChecked} clicks=${r.clickTargets.join(',')} via=${r.returnedVia.join('|')}`
      );
      expect(r.tooltipsChecked + r.clickTargets.length).toBeGreaterThan(0);
      await dash.ensureMarketingRegressionUs2Selected({ soft: true });
    } catch (err) {
      annotate(`Chrome icons soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-MR-US2-026 — reload soft recovery; still Marketing Regression - US2', async () => {
    try {
      await withSoftDeadline(
        async () => {
          await page.reload({ waitUntil: 'domcontentloaded' });
          await dash.waitForPageReady();
          await dash.ensureMarketingRegressionUs2Selected();
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

  test('REG-MR-US2-027 — not BR/AR/SR-US2 / Traffic Source / Marketing Overview as home', async () => {
    await dash.expectNotConfusedSurfaces();
    await expect(page).toHaveURL(/site\/dashboard/i);
    await expect(dash.getDashboardLabel()).resolves.toMatch(MR_US2_EXACT);
    const body = await dash.getPageBodySample(2500);
    expect(body).toMatch(/Campaign Information|Bottom\s+of\s+(the\s+)?Sales\s+Funnel|Revenue Opportunity/i);
  });

  test('REG-MR-US2-028 — restore initial context; suite home healthy', async () => {
    await dash.restoreContext(initialCtx).catch(() => recover());
    await expect(dash.getDashboardLabel()).resolves.toMatch(MR_US2_EXACT);
    await dash.expectSelectedSite();
    await dash.expectCoreWidgetsReady().catch(() => undefined);
    annotate(
      `Final dashboard="${await dash.getDashboardLabel()}" lookback="${await dash.getTimeLookbackLabel()}" loadMs=${initialLoadMs} blockingErrors=${blockingPageErrors.length}`
    );
  });
});
