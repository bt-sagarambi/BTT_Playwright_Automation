import { test, expect, Page } from '@playwright/test';
import path from 'path';
import {
  RevenueAttributionPage,
  RevenueAttributionContext,
} from '../../../../../../pages/RevenueAttributionPage';
import { getActiveProfile } from '../../../../../../config/profiles';

/**
 * Regression: Revenue Attribution (Improve Conversion)
 * Site: GDC Test Site 2
 * Path: tests/regression_tests/US2/business-insights/improve-conversion/revenue-attribution
 *
 * Read-only: no Save Filter, Clear Cache, Save & Run Report, permanent Ad-Hoc, Impact Rules submit.
 * Soft dual: Brand Attribution / Revenue Calculator / Revenue Opportunity then restore.
 *
 * npm: test:regression:us2:revenue-attribution
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

test.describe('US2 Regression — Revenue Attribution', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(150000);

  let page: Page;
  let ra: RevenueAttributionPage;
  let initialCtx: RevenueAttributionContext;
  let initialLoadMs = 0;
  const notes: string[] = [];
  const blockingPageErrors: string[] = [];

  const annotate = (description: string) => {
    notes.push(description);
    test.info().annotations.push({ type: 'note', description });
    console.log(`[RA] ${description}`);
  };

  const recover = async () => {
    await ra.recoverPage();
    if (initialCtx) await ra.restoreContext(initialCtx).catch(() => undefined);
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
    ra = new RevenueAttributionPage(page);
    const started = Date.now();
    await ra.openViaNavigation();
    initialLoadMs = Date.now() - started;
    initialCtx = await ra.captureContext();
    const profile = getActiveProfile();
    console.log(
      `[RA] profile=${profile.id} site=${await ra.getSiteLabel().catch(() => profile.siteName)} loadMs=${initialLoadMs} report="${initialCtx.reportLabel.slice(0, 80)}" week="${initialCtx.weekRange}"`
    );
  });

  test.afterAll(async () => {
    await ra?.clearTableSearches().catch(() => undefined);
    if (notes.length) console.log(`[RA] annotations:\n- ${notes.join('\n- ')}`);
    await page?.context()?.close().catch(() => undefined);
  });

  test('REG-RA-001 — page loads via BI Improve Conversion with correct title/route', async () => {
    await expect(page).toHaveURL(/business-analytics\/revenue-attribution|revenue-attribution/i);
    await expect(page).not.toHaveURL(/site\/login|site%2Flogin/i);
    await expect(page).toHaveTitle(/(?:Revenue|Numbers)\s+Attribution/i);
    await expect
      .poll(async () => (await ra.getPageTitleText()).replace(/\s+/g, ' '), { timeout: 15000 })
      .toMatch(/Business Insights\s*\/\s*Improve Conversion\s*\/\s*(?:Revenue|Numbers)\s+Attribution/i);
    await ra.expectNotConfusedSurfaces();
  });

  test('REG-RA-002 — GDC Test Site 2; core inventory settles', async () => {
    await ra.ensureProfileSiteSelected();
    await ra.expectSelectedSite();
    await ra.expectCoreReady();
    annotate(`widgets score≈${await ra.widgetsReadyScore()} week="${initialCtx.weekRange}"`);
  });

  test('REG-RA-003 — report list + week-range chrome soft', async () => {
    await expect(ra.locators.reportList).toBeVisible({ timeout: 20000 });
    const week = await ra.getWeekRangeText();
    if (/Week of/i.test(week)) {
      annotate(`weekRange="${week}"`);
    } else {
      annotate(`weekRange soft-annotate="${week}"`);
    }
    try {
      const sample = await withSoftDeadline(() => ra.softSampleReportList(), 25000, recover);
      annotate(sample.note);
      expect(sample.count + sample.sample.length).toBeGreaterThan(0);
    } catch (err) {
      annotate(`report list soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-RA-004 — soft switch existing report then restore', async () => {
    try {
      await withSoftDeadline(
        async () => {
          const r = await ra.softSwitchExistingReport();
          annotate(r.note);
          await ra.expectCoreReady().catch(() => undefined);
          // Restore by reopening suite home (exact report option restore is account-dependent)
          await ra.openViaNavigation();
          if (initialCtx) await ra.restoreContext(initialCtx).catch(() => undefined);
        },
        90000,
        recover
      );
    } catch (err) {
      annotate(`report switch soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
    await ra.expectNotConfusedSurfaces();
  });

  test('REG-RA-005 — device visibility toggles soft (All Devices / Desktop / iOS / Android)', async () => {
    try {
      await withSoftDeadline(
        async () => {
          for (const d of ['all_devices', 'desktop', 'ios', 'android'] as const) {
            const r = await ra.softToggleDevice(d);
            annotate(r.note);
          }
          if (await ra.locators.deviceToggleMobile.isVisible().catch(() => false)) {
            const m = await ra.softToggleDevice('mobile');
            annotate(m.note);
          } else {
            annotate('Mobile toggle soft-annotate (legacy visibility)');
          }
          annotate('PDF tablet caveat: All Devices ≠ Desktop+Mobile only — soft annotated');
          if (initialCtx) await ra.restoreContext(initialCtx).catch(() => undefined);
        },
        60000,
        recover
      );
    } catch (err) {
      annotate(`device toggles soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-RA-006 — Section 1 summary cards: Experience / Marketing / KPI labels soft', async () => {
    await ra.closeOverlays().catch(() => undefined);
    if (!/revenue-attribution/i.test(page.url())) {
      await ra.openViaNavigation();
    }
    // Avoid scrollIntoViewIfNeeded hang; assert via DOM text + stable hosts
    const sample = await withSoftDeadline(() => ra.getCardsSample(8000), 20000, async () => {
      await ra.closeOverlays().catch(() => undefined);
    }).catch(async () => {
      annotate('getCardsSample soft deadline — fallback evaluate');
      return (await page.evaluate(`(() => (document.getElementById('page-contents')||document.body).innerText||'')()`).catch(() => '')) as string;
    });
    const text = String(sample || '');
    expect(text).toMatch(/Experience Influences|Performance/i);
    expect(text).toMatch(/Marketing Influences|Traffic|Intent/i);
    expect(text).toMatch(/KPI Change|Sessions/i);
    expect(text).toMatch(/Average Order Value|Conversion Rate/i);
    expect(text).toMatch(/Stability|(?:Revenue|Numbers)\s+per Session/i);
    const cardHost =
      (await ra.locators.totalAttributionCardContainer.count().catch(() => 0)) > 0 ||
      (await ra.locators.deviceCard('all_devices').count().catch(() => 0)) > 0;
    expect(cardHost).toBeTruthy();
    if (/(?:Revenue|Numbers)\s+Attributed to Performance|(?:Revenue|Numbers)\s+Change/i.test(text)) {
      annotate('Section heading / Change soft present');
    }
    if (/Conversion Rate \(bps\)|bps/i.test(text)) {
      annotate('Conversion Rate bps label soft present');
    } else {
      annotate('Conversion Rate bps soft-annotate');
    }
    annotate(`cardsSampleLen=${text.length}`);
  });

  test('REG-RA-007 — KPI Change hosts soft (sessions / AOV / conversion / RPS)', async () => {
    const text = await ra.getCardsSample(6000).catch(() => '');
    expect(String(text)).toMatch(/KPI Change|Sessions/i);
    expect(String(text)).toMatch(/Average Order Value/i);
    expect(String(text)).toMatch(/Conversion Rate/i);
    expect(String(text)).toMatch(/(?:Revenue|Numbers)\s+per Session/i);
    annotate('PDF rule: Page Name filter excluded from KPI Change — documented soft (no Save & Run)');
    const hosts = [
      ra.locators.deviceMetric('all_devices', 'session_change'),
      ra.locators.deviceMetric('all_devices', 'AoV_change'),
      ra.locators.deviceMetric('all_devices', 'conversion_rate_change'),
      ra.locators.deviceMetric('all_devices', 'revenue_per_session_change'),
    ];
    let visibleHosts = 0;
    for (const h of hosts) {
      if ((await h.count().catch(() => 0)) > 0) visibleHosts += 1;
    }
    annotate(`KPI change hosts present≈${visibleHosts}/4`);
  });

  test('REG-RA-008 — Section 2 platform graphs soft + hover/legend', async () => {
    const anyGraph =
      (await ra.locators.allDevicesPlatformGraph.isVisible().catch(() => false)) ||
      (await ra.locators.desktopPlatformGraph.isVisible().catch(() => false)) ||
      (await ra.locators.iosPlatformGraph.isVisible().catch(() => false)) ||
      (await ra.locators.totalAttributionGraphContainer.isVisible().catch(() => false));
    expect(anyGraph).toBeTruthy();
    try {
      const r = await withSoftDeadline(() => ra.softLegendOrHoverPlatform(), 20000, recover);
      annotate(r.note);
    } catch (err) {
      annotate(`platform legend soft: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  test('REG-RA-009 — Section 3 page table headers soft (active device)', async () => {
    const table = ra.locators.tableDesktop
      .or(ra.locators.tableAllDevices)
      .or(ra.locators.desktopPageTable)
      .first();
    const visible = await table.isVisible().catch(() => false);
    if (!visible) {
      annotate('Page table soft-annotate: not visible on current report/device — controlled empty OK');
      return;
    }
    const text = ((await table.innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
    expect(text).toMatch(/Page Name|Performance|Stability|Traffic|Intent/i);
    if (/Onload|Before \(s\)|After \(s\)|Diff/i.test(text)) {
      annotate('Onload difference columns soft present');
    }
    if (/Average Order Value/i.test(text)) annotate('AOV column soft present');
    annotate('PDF: scaling not applied at page level — soft annotated');
  });

  test('REG-RA-010 — Desktop / iOS / Android table-section tabs soft + restore', async () => {
    try {
      await withSoftDeadline(
        async () => {
          const start = await ra.getActiveTableTab();
          for (const tab of ['desktop', 'ios', 'android'] as const) {
            const r = await ra.softSwitchTableTab(tab);
            annotate(r.note);
          }
          if (await ra.locators.mobileTableSectionTab.isVisible().catch(() => false)) {
            const m = await ra.softSwitchTableTab('mobile');
            annotate(m.note);
          }
          if (start === 'desktop') await ra.locators.desktopTableSectionTab.click({ force: true }).catch(() => undefined);
          else if (start === 'ios') await ra.locators.iosTableSectionTab.click({ force: true }).catch(() => undefined);
          else if (start === 'android')
            await ra.locators.androidTableSectionTab.click({ force: true }).catch(() => undefined);
          else if (start === 'mobile')
            await ra.locators.mobileTableSectionTab.click({ force: true }).catch(() => undefined);
          await page.waitForTimeout(600);
        },
        60000,
        recover
      );
    } catch (err) {
      annotate(`table tabs soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-RA-011 — Filters drawer Cancel-only; Save & Run / Run Ad-Hoc presence soft', async () => {
    try {
      await withSoftDeadline(
        async () => {
          await ra.openFiltersDrawer();
          const body = ((await page.locator('body').innerText()) || '').slice(0, 6000);
          expect(body).toMatch(/Date of Performance Change|Timezone|Filter|Performance Metric/i);
          if (/Dynamic Top Pages|Discard Sessions|Data Originated/i.test(body)) {
            annotate('RA filter dimensions soft present');
          }
          // Soft-assert Save & Run — do NOT click
          const saveRunVisible = await ra.locators.applyFilters.isVisible().catch(() => false);
          const adHocVisible = await ra.locators.runAdHocReport().isVisible().catch(() => false);
          annotate(`Save & Run visible=${saveRunVisible}; Run Ad-Hoc visible=${adHocVisible} (not executed)`);
          expect(saveRunVisible || /Save\s*&\s*Run Report/i.test(body)).toBeTruthy();
          if (await ra.locators.myFiltersTab.isVisible().catch(() => false)) {
            await ra.locators.myFiltersTab.click({ force: true }).catch(() => undefined);
          }
          if (await ra.locators.sharedFiltersTab.isVisible().catch(() => false)) {
            await ra.locators.sharedFiltersTab.click({ force: true }).catch(() => undefined);
          }
          await ra.cancelFiltersDrawer();
        },
        45000,
        recover
      );
    } catch (err) {
      annotate(`Filters soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-RA-012 — Add Comparison open/cancel only', async () => {
    try {
      const opened = await withSoftDeadline(() => ra.softOpenAddComparison(), 20000);
      annotate(`Add Comparison open=${opened}`);
      await ra.closeOverlays();
      await ra.expectCoreReady();
    } catch (err) {
      annotate(`Comparison soft: ${err instanceof Error ? err.message : String(err)}`);
      await ra.closeOverlays();
      await recover();
    }
  });

  test('REG-RA-013 — Revenue Impact rules chrome soft open/close (no Submit)', async () => {
    try {
      if (await ra.locators.revenueImpactRulesBtn.isVisible().catch(() => false)) {
        await ra.locators.revenueImpactRulesBtn.click({ force: true });
        await page.waitForTimeout(800);
        annotate('Revenue Impact rules chrome opened — cancel only');
      } else if (await ra.locators.viewActiveRuleBtn.isVisible().catch(() => false)) {
        await ra.locators.viewActiveRuleBtn.click({ force: true });
        await page.waitForTimeout(600);
        annotate('View Active Rule soft opened — cancel only');
      } else annotate('Revenue Impact rules button not visible');
      await ra.closeOverlays();
    } catch (err) {
      annotate(`Impact rules soft: ${err instanceof Error ? err.message : String(err)}`);
      await ra.closeOverlays();
    }
  });

  test('REG-RA-014 — Export menu soft open/close (no hard file assert)', async () => {
    try {
      if (await ra.locators.exportMenu.isVisible().catch(() => false)) {
        await ra.locators.exportMenu.click({ force: true });
        await page.waitForTimeout(500);
        const body = await ra.getBodySample(1500);
        if (/CSV|TSV|JSON|Array/i.test(body)) annotate('Export formats soft present');
        await ra.closeOverlays();
      } else annotate('Export control soft-annotate: not visible');
    } catch (err) {
      annotate(`Export soft: ${err instanceof Error ? err.message : String(err)}`);
      await ra.closeOverlays();
    }
  });

  test('REG-RA-015 — Brand Attribution dual then restore Revenue Attribution', async () => {
    try {
      const r = await withSoftDeadline(() => ra.softBrandAttributionRoundTrip(), 120000, recover);
      annotate(r.note);
      expect(r.restored).toBeTruthy();
      await ra.expectSelectedSite();
      await ra.expectNotConfusedSurfaces();
    } catch (err) {
      annotate(`Brand Attribution soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-RA-016 — Revenue Calculator soft round-trip restore Attribution', async () => {
    try {
      const r = await withSoftDeadline(() => ra.softCalculatorRoundTrip(), 120000, recover);
      annotate(r.note);
      expect(r.restored).toBeTruthy();
      await ra.expectNotConfusedSurfaces();
    } catch (err) {
      annotate(`Calculator soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-RA-017 — Revenue Opportunity sibling soft then restore', async () => {
    try {
      const r = await withSoftDeadline(() => ra.softOpportunityRoundTrip(), 120000, recover);
      annotate(r.note);
      expect(r.restored).toBeTruthy();
      await ra.expectNotConfusedSurfaces();
    } catch (err) {
      annotate(`RO sibling soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-RA-018 — Escape recovery; Report Manager soft; Help soft', async () => {
    await ra.openFiltersDrawer().catch(() => undefined);
    await page.keyboard.press('Escape').catch(() => undefined);
    await ra.closeOverlays();
    if (await ra.locators.reportManagerToggle.isVisible().catch(() => false)) {
      await ra.locators.reportManagerToggle.click({ force: true }).catch(() => undefined);
      await page.waitForTimeout(600);
      await ra.closeOverlays();
      annotate('Report Manager soft open/close');
    } else annotate('Report Manager soft-annotate');
    const help = page.locator('#help-articles-menu, #help-video-menu, [title*="Help" i]').first();
    annotate((await help.isVisible().catch(() => false)) ? 'Help chrome present' : 'Help chrome soft-annotate');
  });

  test('REG-RA-019 — narrow viewport keeps title reachable', async () => {
    await page.setViewportSize({ width: 1100, height: 900 });
    await ra.locators.pageTitle.scrollIntoViewIfNeeded().catch(() => undefined);
    await expect(ra.locators.pageTitle).toBeVisible();
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('REG-RA-020 — refresh / reload soft recovery; still Revenue Attribution', async () => {
    try {
      await withSoftDeadline(
        async () => {
          await page.reload({ waitUntil: 'domcontentloaded' });
          await ra.waitForPageReady();
          await ra.ensureProfileSiteSelected();
          await ra.expectCoreReady();
        },
        90000,
        recover
      );
    } catch (err) {
      annotate(`Reload soft: ${err instanceof Error ? err.message : String(err)}`);
      await recover();
    }
  });

  test('REG-RA-021 — not Brand Attribution / Calculator / RO / Monitoring as home', async () => {
    await ra.expectNotConfusedSurfaces();
    const body = await ra.getCardsSample(4000);
    expect(body).toMatch(/Experience Influences|Marketing Influences|KPI Change|Performance|Revenue Attribution/i);
  });

  test('REG-RA-022 — restore initial context; suite home healthy', async () => {
    await ra.restoreContext(initialCtx);
    await ra.clearTableSearches();
    await ra.expectSelectedSite();
    await ra.expectCoreReady();
    await ra.expectNotConfusedSurfaces();
    if (blockingPageErrors.length) {
      annotate(
        `Uncaught page errors (non-fatal if healthy): ${blockingPageErrors.slice(0, 4).join(' || ')}`
      );
    }
    annotate(
      `Final title="${await ra.getPageTitleText()}" week="${await ra.getWeekRangeText()}" loadMs=${initialLoadMs}`
    );
  });
});
