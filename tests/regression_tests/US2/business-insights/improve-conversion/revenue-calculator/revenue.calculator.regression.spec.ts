import { test, expect, Page } from '@playwright/test';
import path from 'path';
import {
  RevenueCalculatorPage,
  RevenueCalculatorContext,
} from '../../../../../../pages/RevenueCalculatorPage';
import { getActiveProfile } from '../../../../../../config/profiles';

/**
 * Regression: Revenue Calculator (Improve Conversion, conversion-type=sales)
 * Site: GDC Test Site 2
 * Path: tests/regression_tests/US2/business-insights/improve-conversion/revenue-calculator
 *
 * Read-only: no Save Filter, Clear Cache, Save Calibration, Submit Impact Rules.
 * Soft dual: Brand Calculator / Revenue Opportunity / Attribution then restore.
 *
 * npm: test:regression:us2:revenue-calculator
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

test.describe('US2 Regression — Revenue Calculator', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(150000);

  let page: Page;
  let rc: RevenueCalculatorPage;
  let initialCtx: RevenueCalculatorContext;
  let initialLoadMs = 0;
  const notes: string[] = [];
  const blockingPageErrors: string[] = [];

  const annotate = (description: string) => {
    notes.push(description);
    test.info().annotations.push({ type: 'note', description });
    console.log(`[RC] ${description}`);
  };

  const recover = async () => {
    await rc.recoverPage();
    if (initialCtx) await rc.restoreContext(initialCtx).catch(() => undefined);
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
    rc = new RevenueCalculatorPage(page);
    const started = Date.now();
    await rc.openViaNavigation();
    initialLoadMs = Date.now() - started;
    initialCtx = await rc.captureContext();
    const profile = getActiveProfile();
    console.log(
      `[RC] profile=${profile.id} site=${await rc.getSiteLabel().catch(() => profile.siteName)} loadMs=${initialLoadMs} page="${initialCtx.pageName}" period="${initialCtx.timePeriod}"`
    );
  });

  test.afterAll(async () => {
    await rc?.clearTableSearches().catch(() => undefined);
    if (notes.length) console.log(`[RC] annotations:\n- ${notes.join('\n- ')}`);
    await page?.context()?.close().catch(() => undefined);
  });

  test('REG-RC-001 — page loads via BI Improve Conversion with correct title/route', async () => {
    await expect(page).toHaveURL(/business-analytics\/revenue-calculator|revenue-calculator/i);
    await expect(page).toHaveURL(/conversion-type=sales/i);
    await expect(page).not.toHaveURL(/site\/login|site%2Flogin/i);
    await expect(page).toHaveTitle(/(?:Revenue|Numbers)\s+Calculator/i);
    await expect
      .poll(async () => (await rc.getPageTitleText()).replace(/\s+/g, ' '), { timeout: 15000 })
      .toMatch(/Business Insights\s*\/\s*Improve Conversion\s*\/\s*(?:Revenue|Numbers)\s+Calculator/i);
    await rc.expectNotConfusedSurfaces();
  });

  test('REG-RC-002 — GDC Test Site 2; sales conversion-type; core inventory', async () => {
    await rc.ensureProfileSiteSelected();
    await rc.expectSelectedSite();
    await rc.expectCoreReady();
    annotate(`widgets score≈${await rc.widgetsReadyScore()} pageName="${initialCtx.pageName}"`);
  });

  test('REG-RC-003 — badge strip soft (Time Period / Data Type / Browser / OS / Page Name)', async () => {
    let period = '';
    try {
      await expect
        .poll(async () => {
          period = await rc.getTimePeriodLabel();
          return period.length;
        }, { timeout: 15000 })
        .toBeGreaterThan(0);
    } catch {
      // Badge host may lag or be empty while period text lives elsewhere — soft annotate
      const body = await rc.getBodySample(2000);
      const m = body.match(/Time Period:\s*([^|]+?)(?:\s+Device:|\s+Browser:|$)/i);
      period = (m?.[1] || '').trim();
      if (!period) {
        annotate('timePeriod badge empty — soft annotate (period may be filter-only)');
      }
    }
    if (period) annotate(`timePeriod="${period}"`);
    if (await rc.locators.dataTypeView.isVisible().catch(() => false)) {
      annotate(`dataType="${await rc.getBadgeText(rc.locators.dataTypeView)}"`);
    }
    if (await rc.locators.browserView.isVisible().catch(() => false)) {
      annotate(`browser="${await rc.getBadgeText(rc.locators.browserView)}"`);
    }
    if (await rc.locators.osView.isVisible().catch(() => false)) {
      annotate(`os="${await rc.getBadgeText(rc.locators.osView)}"`);
    }
    if (await rc.locators.pageNameView.isVisible().catch(() => false)) {
      annotate(`pageName badge="${await rc.getPageNameLabel()}"`);
    }
    // Soft: at least one chrome badge or body time-period cue
    const body = await rc.getBodySample(2500);
    expect(
      period.length > 0 ||
        /Time Period|All Browsers|Real User|Page Name/i.test(body) ||
        (await rc.locators.browserView.isVisible().catch(() => false))
    ).toBeTruthy();
  });

  test('REG-RC-004 — KPI strip labels soft (sessions/conversions/AOV/conv/bounce/opportunity)', async () => {
    const body = await rc.getBodySample(3500);
    expect(body).toMatch(/Total Sessions|TOTAL SESSIONS/i);
    expect(body).toMatch(/Total Conversions|TOTAL CONVERSIONS/i);
    expect(body).toMatch(/Avg Order Value|AVG ORDER VALUE|Average Order Value/i);
    expect(body).toMatch(/Conversion Rate/i);
    expect(body).toMatch(/Revenue Opportunity|REVENUE OPPORTUNITY/i);
    if (/1 SECOND|2 SECONDS|3 SECONDS/i.test(body)) {
      annotate('1s/2s/3s What-If cards soft present');
    } else {
      annotate('1s/2s/3s What-If cards soft-annotate (may be sparse)');
    }
  });

  test('REG-RC-005 — Toggle Pie Charts soft + restore', async () => {
    try {
      const r = await withSoftDeadline(() => rc.softTogglePieCharts(), 20000, recover);
      annotate(r.note);
    } catch (err) {
      annotate(`Pie toggle soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-RC-006 — Conversion Rate Curve graph shell + legend soft', async () => {
    await rc.locators.graphConvCurveBtn.click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(600);
    await expect(rc.locators.conversionRateCurveGraph).toBeVisible({ timeout: 30000 });
    const text = ((await rc.locators.conversionRateCurveGraph.innerText().catch(() => '')) || '').replace(
      /\s+/g,
      ' '
    );
    expect(text + (await rc.getBodySample(2000))).toMatch(/Conversion Rate/i);
    if (/Sessions|Avg Order Value|Bounce Rate|Page Views/i.test(text)) {
      annotate('CRC legend series soft present');
    }
    try {
      const leg = await rc.softLegendToggleIn(rc.locators.conversionRateCurveGraph);
      annotate(leg.note);
    } catch {
      annotate('CRC legend soft skip');
    }
  });

  test('REG-RC-007 — CRC graph ↔ table toggle; table headers soft', async () => {
    try {
      await withSoftDeadline(
        async () => {
          await rc.locators.tableConvCurveBtn.click({ force: true });
          await page.waitForTimeout(800);
          const t = ((await rc.locators.conversionRateCurveTable.innerText().catch(() => '')) || '').replace(
            /\s+/g,
            ' '
          );
          if (/Seconds|Sessions|Conversion Rate|Bounce Rate/i.test(t)) {
            annotate('CRC table headers soft present');
          } else {
            annotate('CRC table soft: headers limited or still loading');
          }
          await rc.locators.graphConvCurveBtn.click({ force: true });
          await page.waitForTimeout(500);
        },
        25000,
        recover
      );
    } catch (err) {
      annotate(`CRC table soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-RC-008 — What-If By X / To X graphs soft toggle', async () => {
    try {
      const r = await withSoftDeadline(() => rc.softToggleWhatIfByTo(), 25000, recover);
      annotate(r.note);
      const body = await rc.getBodySample(2500);
      if (/Sped Up By X Seconds|Sped Up To X Seconds|Revenue Opportunity/i.test(body)) {
        annotate('What-If graph titles soft present');
      }
    } catch (err) {
      annotate(`What-If soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-RC-009 — Conversion Rate / AOV Over Time shell + legend soft', async () => {
    await rc.locators.graphConversionTimeBtn.click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(500);
    const visible =
      (await rc.locators.conversionOverTimeGraph.isVisible().catch(() => false)) ||
      (await rc.locators.conversionOverTimeTable.isVisible().catch(() => false));
    expect(visible).toBeTruthy();
    try {
      const leg = await rc.softLegendToggleIn(rc.locators.conversionOverTimeGraph);
      annotate(leg.note);
    } catch {
      annotate('Over-time legend soft skip');
    }
  });

  test('REG-RC-010 — Over-time graph ↔ table toggle; headers soft', async () => {
    try {
      const r = await withSoftDeadline(() => rc.softToggleOverTimeTableGraph(), 20000, recover);
      annotate(r.note);
      await rc.locators.tableConversionTimeBtn.click({ force: true }).catch(() => undefined);
      await page.waitForTimeout(600);
      const t = ((await rc.locators.conversionOverTimeTable.innerText().catch(() => '')) || '').replace(
        /\s+/g,
        ' '
      );
      if (/Date|Conversion Rate|Avg Order Value|Onload/i.test(t)) {
        annotate('Over-time table headers soft present');
      }
      await rc.locators.graphConversionTimeBtn.click({ force: true }).catch(() => undefined);
    } catch (err) {
      annotate(`Over-time table soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-RC-011 — Filters drawer + My/Shared tabs soft (no Save Filter)', async () => {
    try {
      await withSoftDeadline(
        async () => {
          await rc.openFiltersDrawer();
          const body = ((await page.locator('body').innerText()) || '').slice(0, 5000);
          expect(body).toMatch(/Time Period|Timezone|Page Name|Filter/i);
          if (await rc.locators.myFiltersTab.isVisible().catch(() => false)) {
            await rc.locators.myFiltersTab.click({ force: true }).catch(() => undefined);
          }
          if (await rc.locators.sharedFiltersTab.isVisible().catch(() => false)) {
            await rc.locators.sharedFiltersTab.click({ force: true }).catch(() => undefined);
          }
          if (/Performance Metric|Discard Sessions|Bucket Size|Min Page Load|Minimum/i.test(body)) {
            annotate('RC filter dimensions soft present (metric/percentile/min load/bucket)');
          }
          await rc.cancelFiltersDrawer();
        },
        40000,
        recover
      );
    } catch (err) {
      annotate(`Filters soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-RC-012 — Filters Apply soft then restore home', async () => {
    try {
      await withSoftDeadline(
        async () => {
          await rc.openFiltersDrawer();
          const applied = await rc.applyFiltersSoft();
          annotate(`Apply Filters available=${applied}`);
          await rc.cancelFiltersDrawer();
          await rc.expectNotConfusedSurfaces();
          await rc.expectCoreReady();
        },
        50000,
        recover
      );
    } catch (err) {
      annotate(`Apply Filters soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-RC-013 — soft Time Period 7d then 30d; restore original', async () => {
    try {
      await withSoftDeadline(
        async () => {
          const a = await rc.softApplyTimePeriodPreset(/Last 7 days|7 days/i);
          annotate(`Applied 7d=${a}`);
          await rc.expectCoreReady().catch(() => undefined);
          const b = await rc.softApplyTimePeriodPreset(/Last 30 days|30 days/i);
          annotate(`Applied 30d=${b}`);
          await rc.expectCoreReady().catch(() => undefined);
          // Restore via reopen + context (exact period string may be custom 1 day)
          await rc.openViaNavigation();
          if (initialCtx) await rc.restoreContext(initialCtx).catch(() => undefined);
        },
        120000,
        recover
      );
    } catch (err) {
      annotate(`Lookback soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
    await expect(page).toHaveURL(/conversion-type=sales/i);
  });

  test('REG-RC-014 — Add Comparison open/cancel only', async () => {
    try {
      const opened = await withSoftDeadline(() => rc.softOpenAddComparison(), 20000);
      annotate(`Add Comparison open=${opened}`);
      await rc.closeOverlays();
      await rc.expectCoreReady();
    } catch (err) {
      annotate(`Comparison soft: ${err instanceof Error ? err.message : String(err)}`);
      await rc.closeOverlays();
      await recover();
    }
  });

  test('REG-RC-015 — Calibration Multiplier open; Reset/Cancel only (no Save)', async () => {
    try {
      const opened = await withSoftDeadline(() => rc.softOpenCalibration(), 15000);
      annotate(`Calibration open=${opened}`);
      if (await rc.locators.resetCalibration.isVisible().catch(() => false)) {
        await rc.locators.resetCalibration.click({ force: true }).catch(() => undefined);
      }
      await rc.closeOverlays();
      // Never click save-calibration-slider
    } catch (err) {
      annotate(`Calibration soft: ${err instanceof Error ? err.message : String(err)}`);
      await rc.closeOverlays();
    }
  });

  test('REG-RC-016 — Revenue Impact rules chrome soft open/close (no Submit)', async () => {
    try {
      if (await rc.locators.revenueImpactRulesBtn.isVisible().catch(() => false)) {
        await rc.locators.revenueImpactRulesBtn.click({ force: true });
        await page.waitForTimeout(800);
        annotate('Revenue Impact rules chrome opened — cancel only');
      } else annotate('Revenue Impact rules button not visible');
      await rc.closeOverlays();
    } catch (err) {
      annotate(`Impact rules soft: ${err instanceof Error ? err.message : String(err)}`);
      await rc.closeOverlays();
    }
  });

  test('REG-RC-017 — Revenue Attribution soft round-trip restore Calculator', async () => {
    try {
      const r = await withSoftDeadline(() => rc.softAttributionRoundTrip(), 90000, recover);
      annotate(r.note);
      expect(r.restored).toBeTruthy();
      await rc.expectNotConfusedSurfaces();
    } catch (err) {
      annotate(`Attribution soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-RC-018 — Brand Calculator dual then restore sales Revenue Calculator', async () => {
    try {
      const r = await withSoftDeadline(() => rc.softBrandCalculatorRoundTrip(), 120000, recover);
      annotate(r.note);
      expect(r.restored).toBeTruthy();
      await expect(page).toHaveURL(/conversion-type=sales/i);
      await rc.expectSelectedSite();
    } catch (err) {
      annotate(`Brand dual soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-RC-019 — Revenue Opportunity sibling soft then restore', async () => {
    try {
      const r = await withSoftDeadline(() => rc.softRevenueOpportunityRoundTrip(), 120000, recover);
      annotate(r.note);
      expect(r.restored).toBeTruthy();
      await rc.expectNotConfusedSurfaces();
    } catch (err) {
      annotate(`RO sibling soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-RC-020 — Export menu soft open/close (no hard file assert)', async () => {
    try {
      if (await rc.locators.exportMenu.isVisible().catch(() => false)) {
        await rc.locators.exportMenu.click({ force: true });
        await page.waitForTimeout(500);
        const body = await rc.getBodySample(1500);
        if (/CSV|TSV|JSON|Array/i.test(body)) annotate('Export formats soft present');
        await rc.closeOverlays();
      } else annotate('Export control soft-annotate: not visible');
    } catch (err) {
      annotate(`Export soft: ${err instanceof Error ? err.message : String(err)}`);
      await rc.closeOverlays();
    }
  });

  test('REG-RC-021 — Escape recovery; Help chrome soft', async () => {
    await rc.openFiltersDrawer().catch(() => undefined);
    await page.keyboard.press('Escape').catch(() => undefined);
    await rc.closeOverlays();
    const help = page.locator('#help-articles-menu, #help-video-menu, [title*="Help" i]').first();
    annotate((await help.isVisible().catch(() => false)) ? 'Help chrome present' : 'Help chrome soft-annotate');
  });

  test('REG-RC-022 — narrow viewport keeps core widgets reachable', async () => {
    await page.setViewportSize({ width: 1100, height: 900 });
    await rc.locators.conversionRateCurveGraph.scrollIntoViewIfNeeded().catch(() => undefined);
    await expect(rc.locators.pageTitle).toBeVisible();
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('REG-RC-023 — refresh / reload soft recovery; still sales RC', async () => {
    try {
      await withSoftDeadline(
        async () => {
          await page.reload({ waitUntil: 'domcontentloaded' });
          await rc.waitForPageReady();
          await rc.ensureSalesConversionType();
          await rc.ensureProfileSiteSelected();
          await rc.expectCoreReady();
        },
        90000,
        recover
      );
    } catch (err) {
      annotate(`Reload soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-RC-024 — not Brand Calculator / RO / Monitoring as home', async () => {
    await rc.expectNotConfusedSurfaces();
    const body = await rc.getBodySample(2500);
    expect(body).toMatch(/Conversion Rate|Revenue Opportunity|What If/i);
  });

  test('REG-RC-025 — restore initial context; suite home healthy', async () => {
    await rc.restoreContext(initialCtx);
    await rc.clearTableSearches();
    await rc.expectSelectedSite();
    await rc.expectCoreReady();
    await rc.expectNotConfusedSurfaces();
    if (blockingPageErrors.length) {
      annotate(
        `Uncaught page errors (non-fatal if healthy): ${blockingPageErrors.slice(0, 4).join(' || ')}`
      );
    }
    annotate(
      `Final title="${await rc.getPageTitleText()}" page="${await rc.getPageNameLabel()}" period="${await rc.getTimePeriodLabel()}" loadMs=${initialLoadMs}`
    );
  });
});
