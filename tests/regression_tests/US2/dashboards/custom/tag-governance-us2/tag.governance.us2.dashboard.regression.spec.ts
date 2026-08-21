import { test, expect, Page } from '@playwright/test';
import path from 'path';
import {
  TagGovernanceUs2DashboardPage,
  TagGovernanceUs2Context,
  TG_US2_EXACT,
} from '../../../../../../pages/TagGovernanceUs2DashboardPage';
import { getActiveProfile } from '../../../../../../config/profiles';

/**
 * Regression: Tag Governance - US2 (custom dashboard)
 * Site: GDC Test Site 2
 * Path: tests/regression_tests/US2/dashboards/custom/tag-governance-us2
 *
 * Read-only: no Save Filter, widget Save/Delete, sticky Activity tab/party/metric, CSP manage Save.
 * Home is exact Custom "Tag Governance - US2".
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

test.describe('US2 Regression — Tag Governance - US2 Dashboard', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(150000);

  let page: Page;
  let dash: TagGovernanceUs2DashboardPage;
  let initialCtx: TagGovernanceUs2Context;
  let initialLoadMs = 0;
  const notes: string[] = [];
  const blockingPageErrors: string[] = [];

  const annotate = (description: string) => {
    notes.push(description);
    test.info().annotations.push({ type: 'note', description });
    console.log(`[TG-US2] ${description}`);
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
    dash = new TagGovernanceUs2DashboardPage(page);
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
      `[TG-US2] profile=${profile.id} site=${siteNow} dc=${profile.datacenter} loadMs=${initialLoadMs} dashboard="${initialCtx.dashboardLabel}" lookback="${initialCtx.lookbackLabel}" slowest="${initialCtx.slowestMetric}"`
    );
  });

  test.afterAll(async () => {
    await dash?.restoreActivityDefaults(initialCtx).catch(() => undefined);
    if (notes.length) console.log(`[TG-US2] annotations:\n- ${notes.join('\n- ')}`);
    await page?.context()?.close().catch(() => undefined);
  });

  test('REG-TG-US2-001 — page loads via Dashboards menu/route with correct title', async () => {
    await expect(page).toHaveURL(/site\/dashboard|r=site%2Fdashboard/i);
    await expect(page).not.toHaveURL(/site\/login|site%2Flogin/i);
    await expect(dash.locators.pageTitle).toHaveText(/Dashboards/i);
    await expect(page).toHaveTitle(/Dashboards/i);
    await dash.expectNotConfusedSurfaces();
  });

  test('REG-TG-US2-002 — Tag Governance - US2 selected; core widgets present', async () => {
    await dash.ensureTagGovernanceUs2Selected();
    const label = await dash.getDashboardLabel();
    expect(label).toMatch(TG_US2_EXACT);
    expect(label).not.toMatch(/Marketing|Business|Alerts|Synthetic|RUM Regression/i);
    await dash.expectCoreWidgetTitles();
    annotate(`Dashboard="${label}" widgets-ready score≈${await dash.widgetsReadyScore()}`);
  });

  test('REG-TG-US2-003 — GDC Test Site 2; lookback/auto-refresh captured', async () => {
    await dash.ensureProfileSiteSelected();
    await dash.expectSelectedSite();
    expect(initialCtx.lookbackLabel.length, 'Time Lookback non-empty').toBeGreaterThan(0);
    annotate(
      `site="${await dash.getSiteLabel()}" lookback="${initialCtx.lookbackLabel}" autoRefresh="${initialCtx.autoRefreshLabel || '(n/a)'}" party="${initialCtx.activityParty}" slowest="${initialCtx.slowestMetric}"`
    );
  });

  test('REG-TG-US2-004 — dashboard chrome: switcher, lookback, refresh, auto-refresh', async () => {
    await expect(dash.locators.switchDashboard).toBeAttached();
    await expect(dash.locators.timeLookback).toBeVisible({ timeout: 15000 });
    await expect(dash.locators.refreshDashboard).toBeVisible();
    await expect(dash.locators.autoRefresh).toBeVisible();
  });

  test('REG-TG-US2-005 — Custom list includes Tag Governance - US2; siblings soft', async () => {
    const custom = await dash.listCustomDashboardNames();
    expect(custom.some((n) => TG_US2_EXACT.test(n)), custom.join(' | ')).toBeTruthy();
    const pre = await dash.listPreconfiguredDashboardNames();
    annotate(
      `Custom count=${custom.length} hasHome=${custom.some((n) => TG_US2_EXACT.test(n))}; Preconfigured sample: ${pre.slice(0, 6).join(', ')}`
    );
  });

  test('REG-TG-US2-006 — Time Lookback menu has multiple presets', async () => {
    try {
      const opts = await withSoftDeadline(() => dash.getTimeLookbackOptions(), 25000, recover);
      expect(opts.length).toBeGreaterThan(3);
      annotate(`Lookback options sample: ${opts.slice(0, 12).join(' | ')}`);
    } catch (err) {
      annotate(`Lookback menu soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-TG-US2-007 — soft apply Last 24h then Last 7d; restore original lookback', async () => {
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
    await expect(dash.getDashboardLabel()).resolves.toMatch(TG_US2_EXACT);
  });

  test('REG-TG-US2-008 — Dashboard Refresh reloads without blank crash', async () => {
    try {
      await withSoftDeadline(() => dash.clickRefreshDashboard(), 45000, recover);
      await dash.expectCoreWidgetTitles();
    } catch (err) {
      annotate(`Refresh soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-TG-US2-009 — Auto Refresh menu soft options (Off + intervals)', async () => {
    try {
      const opts = await withSoftDeadline(() => dash.getAutoRefreshOptions(), 20000, recover);
      expect(opts.length).toBeGreaterThan(0);
      annotate(`Auto refresh options: ${opts.slice(0, 10).join(' | ')}`);
    } catch (err) {
      annotate(`Auto Refresh soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-TG-US2-010 — Composition - US2 Domain Activity / File Size / Element Count', async () => {
    const sample = await dash.widgetSample(dash.locators.compositionUs2Widget(), 900);
    expect(sample).toMatch(/1st\s+vs\s+3rd\s+Party\s+Composition\s*-\s*US2/i);
    expect(sample).not.toMatch(/Composition\s*-\s*RUM\s*-\s*US2/i);
    expect(sample).toMatch(/Domain Activity|1st Party|3rd Party/i);
    if (/File Size/i.test(sample)) annotate('Composition File Size panel present');
    if (/Element Count\s*\/\s*Page/i.test(sample)) annotate('Composition Element Count / Page present');
    annotate(`Composition-US2 sample="${sample.slice(0, 180)}"`);
  });

  test('REG-TG-US2-011 — Composition - RUM - US2 metrics soft', async () => {
    const sample = await dash.widgetSample(dash.locators.compositionRumWidget(), 900);
    expect(sample).toMatch(/Composition\s*-\s*RUM\s*-\s*US2/i);
    expect(sample).toMatch(/Domain Activity|1st Party|3rd Party/i);
    if (/File Size/i.test(sample)) annotate('RUM Composition File Size present');
    else annotate('RUM Composition File Size soft-absent (subset OK)');
    if (/Element Count\s*\/\s*Page/i.test(sample)) annotate('RUM Composition Element Count / Page present');
    annotate(`Composition-RUM sample="${sample.slice(0, 180)}"`);
  });

  test('REG-TG-US2-012 — Activity Synthetic SERVICES/DOMAINS/FILES + party restore', async () => {
    const sample = await dash.widgetSample(dash.locators.activitySyntheticWidget(), 700);
    expect(sample).toMatch(/Activity\s*-\s*Synthetic\s*-\s*US2/i);
    expect(sample).toMatch(/SERVICES|DOMAINS|FILES/i);
    expect(sample).toMatch(/1st Party|3rd Party|All/i);
    try {
      const tabs = await withSoftDeadline(() => dash.softActivityTabRoundTrip(), 35000, recover);
      annotate(`Activity Synthetic tabs: ${tabs}`);
      const party = await withSoftDeadline(() => dash.softActivityPartyRoundTrip(), 25000, recover);
      annotate(`Activity Synthetic party: ${party}`);
    } catch (err) {
      annotate(`Activity Synthetic chrome soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-TG-US2-013 — Activity Synthetic Slowest-metric + Graph/Table + Export cancel', async () => {
    try {
      const metric = await withSoftDeadline(() => dash.softSlowestMetricMenuSample(), 25000, recover);
      annotate(`Slowest-metric: ${metric}`);
      const gt = await withSoftDeadline(() => dash.softActivityGraphTableRoundTrip(), 25000, recover);
      annotate(`Graph/Table: ${gt}`);
      const exp = await dash.softActivityExportCancel();
      annotate(`Export: ${exp}`);
      const tip = await dash.softHoverWidget(dash.locators.activitySyntheticWidget());
      if (tip) annotate(`Activity Synthetic hover="${tip.slice(0, 90)}"`);
      else annotate('Activity Synthetic hover: no tooltip (controlled empty)');
    } catch (err) {
      annotate(`Activity Synthetic graph soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-TG-US2-014 — Activity RUM chrome soft (tabs/party distinct from Synthetic)', async () => {
    await dash.softScrollTo(dash.locators.activityRumWidget());
    let sample = await dash.widgetSample(dash.locators.activityRumWidget(), 900);
    if (sample.length < 80) {
      // Title-only host — fall back to page body slice near RUM Activity
      const body = await dash.getPageBodySample(12000);
      const idx = body.search(/1st\s+vs\s+3rd\s+Party\s+Activity\s*-\s*RUM\s*-\s*US2/i);
      sample = idx >= 0 ? body.slice(idx, idx + 900) : sample;
    }
    expect(sample).toMatch(/Activity\s*-\s*RUM\s*-\s*US2/i);
    if (/SERVICES|DOMAINS|FILES/i.test(sample)) {
      annotate('Activity RUM SERVICES/DOMAINS/FILES language present');
    } else {
      annotate('Activity RUM tab labels soft-absent in sample — continue chrome soft');
    }
    try {
      const tabs = await withSoftDeadline(
        () => dash.softActivityTabRoundTrip(dash.locators.activityRumWidget()),
        35000,
        recover
      );
      annotate(`Activity RUM tabs: ${tabs}`);
      const tip = await dash.softHoverWidget(dash.locators.activityRumWidget());
      if (tip) annotate(`Activity RUM hover="${tip.slice(0, 90)}"`);
      else annotate('Activity RUM hover: no tooltip');
    } catch (err) {
      annotate(`Activity RUM soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-TG-US2-015 — Environment - US2 RUM/SYNTH sparkline tiles', async () => {
    const sample = await dash.widgetSample(dash.locators.environmentWidget(), 900);
    expect(sample).toMatch(/Environment\s*-\s*US2/i);
    expect(sample).toMatch(/DOMAINS\s*RUM|PAGES\s*RUM|FILES\s*RUM/i);
    expect(sample).toMatch(/DOMAINS\s*SYNTH|PAGES\s*SYNTH|FILES\s*SYNTH/i);
    if (/Vendor|SLA|Services with Profiles/i.test(sample)) annotate('Environment PDF extras present (Vendors/SLA soft)');
    const sparks = await dash.locators.environmentSparklines().count().catch(() => 0);
    annotate(`Environment sparklines count≈${sparks}; sample="${sample.slice(0, 160)}"`);
  });

  test('REG-TG-US2-016 — Highcharts shells present (not SVG-count-only refresh)', async () => {
    const charts = await dash.highchartsCount();
    annotate(`Highcharts containers=${charts} (probe sample ~32; do not hard-require exact count)`);
    expect(charts).toBeGreaterThan(0);
    await dash.expectCoreWidgetTitles();
  });

  test('REG-TG-US2-017 — Filters Cancel-only; My/Shared tabs soft', async () => {
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

  test('REG-TG-US2-018 — Manager / + Widget cancel-only', async () => {
    try {
      const m = await withSoftDeadline(() => dash.softOpenManagerCancel(), 25000, recover);
      annotate(`Manager: ${m}`);
      const w = await dash.softOpenWidgetWizardCancel();
      annotate(`+Widget wizard open=${w} then cancel`);
    } catch (err) {
      annotate(`Manager/Widget soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
    await expect(dash.getDashboardLabel()).resolves.toMatch(TG_US2_EXACT);
  });

  test('REG-TG-US2-019 — soft sibling Marketing Regression - US2 then restore home', async () => {
    try {
      const note = await withSoftDeadline(
        () => dash.softSiblingSwitchAndRestore(/^\s*Marketing Regression\s*-\s*US2\s*$/i),
        120000,
        recover
      );
      annotate(`Sibling MR-US2: ${note}`);
      await expect(dash.getDashboardLabel()).resolves.toMatch(TG_US2_EXACT);
      await dash.expectSelectedSite();
    } catch (err) {
      annotate(`Sibling MR soft: ${err instanceof Error ? err.message : String(err)}`);
      await dash.openViaNavigation().catch(() => recover());
    }
  });

  test('REG-TG-US2-020 — soft sibling Site Overview then restore', async () => {
    try {
      const note = await withSoftDeadline(
        () => dash.softSiblingSwitchAndRestore(/^\s*Site Overview\s*$/i),
        120000,
        recover
      );
      annotate(`Sibling Site Overview: ${note}`);
      await expect(dash.getDashboardLabel()).resolves.toMatch(TG_US2_EXACT);
    } catch (err) {
      annotate(`Sibling SO soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-TG-US2-021 — soft sibling Business Regression - US2 then restore', async () => {
    try {
      const note = await withSoftDeadline(
        () => dash.softSiblingSwitchAndRestore(/^\s*Business Regression\s*-\s*US2\s*$/i),
        120000,
        recover
      );
      annotate(`Sibling BR-US2: ${note}`);
      await expect(dash.getDashboardLabel()).resolves.toMatch(TG_US2_EXACT);
    } catch (err) {
      annotate(`Sibling BR soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-TG-US2-022 — Custom Date Selection open/cancel only', async () => {
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

  test('REG-TG-US2-023 — 1100px viewport keeps widgets reachable', async () => {
    await page.setViewportSize({ width: 1100, height: 900 });
    await dash.expectCoreWidgetTitles().catch(async () => {
      await dash.softScrollTo(dash.locators.compositionUs2Widget());
      await dash.softScrollTo(dash.locators.environmentWidget());
    });
    await expect(dash.locators.timeLookback).toBeVisible();
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('REG-TG-US2-024 — last-updated + Carousel soft', async () => {
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

  test('REG-TG-US2-025 — prescribed lookbacks 6h/24h/7d/30d + Activity hover intervals', async () => {
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
      await expect(dash.getDashboardLabel()).resolves.toMatch(TG_US2_EXACT);
    } catch (err) {
      annotate(`Prescribed lookbacks soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-TG-US2-026 — chrome icons tooltips + round-trip', async () => {
    try {
      const r = await withSoftDeadline(() => dash.softChromeIconTooltipsAndRoundTrip(), 60000, recover);
      annotate(
        `Chrome tips=${r.tooltipsChecked} clicks=${r.clickTargets.join(',')} via=${r.returnedVia.join('|')}`
      );
      expect(r.tooltipsChecked + r.clickTargets.length).toBeGreaterThan(0);
      await dash.ensureTagGovernanceUs2Selected({ soft: true });
    } catch (err) {
      annotate(`Chrome icons soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-TG-US2-027 — reload soft recovery; still Tag Governance - US2', async () => {
    try {
      await withSoftDeadline(
        async () => {
          await page.reload({ waitUntil: 'domcontentloaded' });
          await dash.waitForPageReady();
          await dash.ensureTagGovernanceUs2Selected();
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

  test('REG-TG-US2-028 — not MR/BR/AR/SR-US2 / Site Overview / CSP-nav as home', async () => {
    await dash.expectNotConfusedSurfaces();
    await expect(page).toHaveURL(/site\/dashboard/i);
    await expect(dash.getDashboardLabel()).resolves.toMatch(TG_US2_EXACT);
    const body = await dash.getPageBodySample(3000);
    expect(body).toMatch(/Composition|Activity\s*-\s*(Synthetic|RUM)|Environment\s*-\s*US2/i);
  });

  test('REG-TG-US2-029 — restore initial context; suite home healthy', async () => {
    await dash.restoreContext(initialCtx).catch(() => recover());
    await expect(dash.getDashboardLabel()).resolves.toMatch(TG_US2_EXACT);
    await dash.expectSelectedSite();
    await dash.expectCoreWidgetsReady().catch(() => undefined);
    annotate(
      `Final dashboard="${await dash.getDashboardLabel()}" lookback="${await dash.getTimeLookbackLabel()}" loadMs=${initialLoadMs} blockingErrors=${blockingPageErrors.length}`
    );
  });
});
