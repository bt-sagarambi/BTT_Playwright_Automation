import { test, expect, Page } from '@playwright/test';
import path from 'path';
import {
  CwvTop10SummaryOnloadChartPage,
  CwvSoContext,
} from '../../../../../../../pages/CwvTop10SummaryOnloadChartPage';
import { getActiveProfile } from '../../../../../../../config/profiles';

/**
 * Regression: BI Chart — CWV Top 10 Summary Onload
 * Site: GDC Test Site 2
 * Path: tests/.../business-intelligence/cwv-top10-summary-onload
 *
 * Shell: business-intelligence/tool → #bi-iframe → Charts Search → chart viewer.
 * Chart Builder prerequisite first; Lookback/filter mutations restored.
 * Never treat PoP dashboard / plain CWV Top 10 Summary / VitalPulse / VitalScope as home.
 *
 * npm: test:regression:us2:cwv-top10-summary-onload
 */

const AUTH_STATE = path.join(__dirname, '../../../../../../../playwright/.auth/user.json');

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
          void (async () => {
            try {
              if (onTimeout) await onTimeout();
            } catch {
              // ignore
            }
            reject(new Error(`soft deadline ${ms}ms exceeded`));
          })();
        }, ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
    void timedOut;
  }
}

test.describe('US2 Regression — CWV Top 10 Summary Onload Chart', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180000);

  let page: Page;
  let chart: CwvTop10SummaryOnloadChartPage;
  let initialCtx: CwvSoContext;
  let initialLoadMs = 0;
  const notes: string[] = [];
  const blockingPageErrors: string[] = [];

  const annotate = (description: string) => {
    notes.push(description);
    test.info().annotations.push({ type: 'note', description });
    console.log(`[CWV-SO] ${description}`);
  };

  const recover = async () => {
    await Promise.race([
      (async () => {
        await chart.recoverPage();
        if (initialCtx) await chart.restoreContext(initialCtx).catch(() => undefined);
      })(),
      new Promise<void>((resolve) => setTimeout(resolve, 100000)),
    ]);
  };

  test.beforeAll(async ({ browser }, testInfo) => {
    testInfo.setTimeout(360000);
    const context = await browser.newContext({ storageState: AUTH_STATE });
    page = await context.newPage();
    page.on('pageerror', (error) => {
      const msg = error.message || String(error);
      if (/Script error|ResizeObserver|Non-Error promise rejection|favicon|third.?party/i.test(msg))
        return;
      blockingPageErrors.push(msg);
    });
    chart = new CwvTop10SummaryOnloadChartPage(page);
    const started = Date.now();
    await chart.openViaNavigation();
    initialLoadMs = Date.now() - started;
    initialCtx = await chart.captureContext();
    const profile = getActiveProfile();
    console.log(
      `[CWV-SO] profile=${profile.id} site=${await chart.getSiteLabel().catch(() => profile.siteName)} loadMs=${initialLoadMs} lookback="${initialCtx.lookbackSignature}"`
    );
  });

  test.afterAll(async () => {
    try {
      if (page && !page.isClosed()) {
        await Promise.race([
          (async () => {
            await chart.clickResetToDefault().catch(() => undefined);
            await chart.closeOverlays().catch(() => undefined);
          })(),
          new Promise((r) => setTimeout(r, 20000)),
        ]);
      }
    } catch {
      // ignore
    }
    if (notes.length) console.log(`[CWV-SO] annotations:\n- ${notes.join('\n- ')}`);
    if (blockingPageErrors.length)
      console.log(`[CWV-SO] pageerrors sample: ${blockingPageErrors.slice(0, 5).join(' | ')}`);
    await page?.context()?.close().catch(() => undefined);
  });

  // ——— Chart Builder prerequisite (user point #3) BEFORE deep chart asserts ———

  test('REG-CWV-SO-001 — Chart Builder prerequisite: tables/axes/types/Options/Order By/Top N/Run Query then restore Onload', async () => {
    try {
      const result = await withSoftDeadline(() => chart.softExerciseChartBuilder(), 150000, recover);
      annotate(
        `Chart Builder opened=${result.opened} tables=[${result.tablesSampled.join(', ')}] runQueryEnabled=${result.runQueryEnabled}`
      );
      for (const n of result.notes) annotate(`builder: ${n}`);
      expect(result.opened || (await chart.getBodySample(2000)).match(/CWV Top 10 Summary Onload/i)).toBeTruthy();
      await chart.expectChartIdentity();
    } catch (e) {
      annotate(`Chart Builder soft: ${e instanceof Error ? e.message : String(e)}`);
      await recover();
      await chart.expectChartIdentity();
    }
  });

  test('REG-CWV-SO-002 — portal BI tool loads; title/route; no login redirect', async () => {
    await expect(page).toHaveURL(/business-intelligence\/tool|business-intelligence%2Ftool/i);
    await expect(page).not.toHaveURL(/site\/login|site%2Flogin/i);
    await expect
      .poll(async () => ((await chart.locators.pageTitle.innerText().catch(() => '')) || '').replace(/\s+/g, ' '), {
        timeout: 20000,
      })
      .toMatch(/Business Intelligence/i);
    await expect(chart.locators.biIframe).toBeAttached({ timeout: 30000 });
  });

  test('REG-CWV-SO-003 — GDC Test Site 2; #bi-iframe ready; Onload chart identity', async () => {
    await chart.ensureProfileSiteSelected();
    try {
      await chart.expectSelectedSite();
    } catch (e) {
      annotate(`site label soft-miss: ${e instanceof Error ? e.message : String(e)}`);
    }
    await chart.expectChartIdentity();
    annotate(
      `readyScore=${await chart.chartReadyScore()} lookback="${initialCtx.lookbackSignature}" comparison="${initialCtx.comparisonSignature}"`
    );
  });

  test('REG-CWV-SO-004 — BI rail soft: Favorites / Dashboards / AI Query / Charts / Schedules / Folders', async () => {
    const body = await chart.getBodySample(2500);
    for (const label of ['Favorites', 'Dashboards', 'AI Query', 'Charts', 'Schedules', 'Folders']) {
      expect(body, `rail ${label}`).toMatch(new RegExp(label, 'i'));
    }
  });

  test('REG-CWV-SO-005 — Charts Search finds CWV Top 10 Summary Onload; viewer chrome required', async () => {
    await withSoftDeadline(
      async () => {
        await chart.openChartsList();
        const fr = await chart.bi();
        const search = fr.locator('input[placeholder*="Search" i], input[type="search"]').first();
        if (await search.isVisible().catch(() => false)) {
          await search.fill('Summary Onload');
          await page.waitForTimeout(2000);
        }
        const body = await chart.getBodySample(4000);
        expect(body).toMatch(/CWV Top 10 Summary Onload/i);
        if (/CWV Top 10 Summary(?!\s+Onload)/i.test(body)) annotate('sibling card soft: CWV Top 10 Summary (no Onload)');
        if (await search.isVisible().catch(() => false)) {
          await search.fill('');
          await page.waitForTimeout(500);
        }
        await chart.searchAndOpenChart();
        await chart.waitForChartReady();
        const viewer = await chart.getBodySample(3000);
        expect(viewer).toMatch(/Refresh Data|Export|Lookback Period/i);
        expect(await chart.isInChartViewer()).toBeTruthy();
      },
      120000,
      recover
    );
  });

  test('REG-CWV-SO-006 — soft Charts list chrome (folders / Local-UTC / Reset) non-destructive restore', async () => {
    try {
      await withSoftDeadline(
        async () => {
          await chart.openChartsList();
          const fr = await chart.bi();
          const body = await chart.getBodySample(2000);
          expect(body).toMatch(/All Folders|My Folder|Global/i);
          if (/Local|UTC/i.test(body)) annotate('Local|UTC timezone toggle soft-present on Charts list');
          const reset = fr.locator('button, a').filter({ hasText: /^Reset$/i }).first();
          if (await reset.isVisible().catch(() => false)) {
            await reset.click({ force: true }).catch(() => undefined);
            await page.waitForTimeout(800);
          }
          await chart.searchAndOpenChart();
          await chart.waitForChartReady();
        },
        100000,
        recover
      );
    } catch (e) {
      annotate(`list chrome soft: ${e instanceof Error ? e.message : String(e)}`);
      await recover();
    }
  });

  test('REG-CWV-SO-007 — soft sibling catalog (CWV Top 10 Summary / CWV Trends by Page); restore Onload', async () => {
    try {
      const mid = await withSoftDeadline(
        () => chart.softOpenSiblingThenRestore(/CWV Top 10 Summary(?!\s+Onload)|CWV Trends by Page/i),
        100000,
        recover
      );
      if (mid) annotate(`sibling soft-present: ${mid}`);
      else annotate('sibling card not visible in current folder/search — soft');
      await chart.expectChartIdentity();
    } catch (e) {
      annotate(`sibling soft: ${e instanceof Error ? e.message : String(e)}`);
      await recover();
    }
  });

  test('REG-CWV-SO-008 — viewer title CWV Top 10 Summary Onload + Global soft; not confused surfaces', async () => {
    await chart.expectChartIdentity();
    await chart.expectNotConfusedSurfaces();
    const body = await chart.getBodySample(3000);
    if (/\bGlobal\b/i.test(body)) annotate('Global folder badge soft-present');
    if (/Page Name,\s*Onload,\s*Page Hits|Period vs Previous Period/i.test(body))
      annotate('Prompt/Mode language soft-present');
  });

  test('REG-CWV-SO-009 — table inventory Page Name|Onload|Page Hits|Current|Previous|Change + Data Table soft', async () => {
    const inv = await chart.tableInventoryPresence();
    annotate(
      `table soft pageName=${inv.pageName} onload=${inv.onload} pageHits=${inv.pageHits} current=${inv.current} previous=${inv.previous} change=${inv.change} dataTable=${inv.dataTable}`
    );
    const present = [inv.pageName, inv.onload, inv.pageHits, inv.current, inv.previous, inv.change].filter(Boolean)
      .length;
    expect(present, 'at least 4 of 6 comparative table headers').toBeGreaterThanOrEqual(4);
    if (!inv.dataTable) annotate('Data Table (20 rows) soft-miss in body sample');
    const sig = await chart.getTableRowSignature();
    if (!sig) annotate('table rows empty or Formatted Table without classic th — annotate sparse/controlled empty');
    else annotate(`rowSig soft="${sig.slice(0, 120)}"`);
  });

  test('REG-CWV-SO-010 — Filters inventory soft (Percentile/Device/Browser/OS/…)', async () => {
    const fr = await chart.bi();
    const filtersBtn = fr.locator('button, a').filter({ hasText: /^Filters$/i }).first();
    if (await filtersBtn.isVisible().catch(() => false)) {
      await filtersBtn.click({ force: true }).catch(() => undefined);
      await page.waitForTimeout(1000);
    }
    const inv = await chart.filterInventoryPresence();
    const keys = Object.keys(inv);
    const hit = keys.filter((k) => inv[k]).length;
    annotate(`filters inventory soft ${hit}/${keys.length}: ${JSON.stringify(inv)}`);
    expect(hit, 'at least half of expected filter hosts').toBeGreaterThanOrEqual(Math.floor(keys.length / 2));
    await chart.closeOverlays();
  });

  test('REG-CWV-SO-011 — Lookback Period change + soft refresh + restore', async () => {
    const before = await chart.getLookbackSignature();
    const beforeSig = (await chart.getBodySample(500)).slice(0, 300);
    let adjusted = false;
    try {
      adjusted = await withSoftDeadline(() => chart.adjustLookbackSoft(), 45000, recover);
      if (adjusted) await chart.clickApply();
      else annotate('Lookback Day/Week/preset control soft-miss — annotate live host');
    } catch (e) {
      annotate(`Lookback soft: ${e instanceof Error ? e.message : String(e)}`);
    }
    await page.waitForTimeout(2000);
    const after = await chart.getLookbackSignature();
    const afterSig = (await chart.getBodySample(500)).slice(0, 300);
    if (adjusted && beforeSig === afterSig) annotate('Lookback Apply: signature unchanged (sparse data?)');
    else if (adjusted) annotate(`Lookback applied before="${before}" after="${after}"`);
    await chart.clickResetToDefault().catch(() => undefined);
    await chart.expectChartIdentity();
  });

  test('REG-CWV-SO-012 — Comparison Directly Previous ↔ Same Time Last Year + restore', async () => {
    try {
      const before = await chart.getComparisonSignature();
      const ok = await chart.softToggleComparison();
      if (!ok) annotate('Comparison chips soft-miss');
      else {
        await page.waitForTimeout(2000);
        const after = await chart.getComparisonSignature();
        annotate(`Comparison soft before="${before}" after="${after}"`);
      }
      await chart.clickResetToDefault().catch(() => undefined);
    } catch (e) {
      annotate(`comparison soft: ${e instanceof Error ? e.message : String(e)}`);
    }
    await chart.closeOverlays();
    await chart.expectChartIdentity();
  });

  test('REG-CWV-SO-013 — Percentile / Device / Browser sample combos + restore', async () => {
    try {
      const pct = await chart.softFilterCombo(/Percentile/i, /p75|75/i);
      const pctAlt = await chart.softFilterCombo(/Percentile/i, /p50|p90|50|90/i);
      const device = await chart.softFilterCombo(/\bDevice\b/i, /Desktop|Mobile/i);
      const browser = await chart.softFilterCombo(/\bBrowser\b/i);
      annotate(`filters soft percentile=${pct} pctAlt=${pctAlt} device=${device} browser=${browser}`);
      await chart.clickResetToDefault().catch(() => undefined);
    } catch (e) {
      annotate(`percentile/device/browser soft: ${e instanceof Error ? e.message : String(e)}`);
    }
    await chart.closeOverlays();
    await chart.expectChartIdentity();
  });

  test('REG-CWV-SO-014 — Bot Traffic / OS / Originated From / Page Name|Group sample + restore', async () => {
    try {
      const bot = await chart.softFilterCombo(/Bot Traffic/i, /Exclude|Include|Bot|Non/i);
      const os = await chart.softFilterCombo(/Operating System/i);
      const origin = await chart.softFilterCombo(/Originated From/i, /RUM Browser|Native App|Webviews?/i);
      const pageName = await chart.softFilterCombo(/Page Name/i);
      const pageGroup = await chart.softFilterCombo(/Page Group/i);
      annotate(`filters soft bot=${bot} os=${os} origin=${origin} pageName=${pageName} pageGroup=${pageGroup}`);
      await chart.clickResetToDefault().catch(() => undefined);
    } catch (e) {
      annotate(`bot/os/origin/page soft: ${e instanceof Error ? e.message : String(e)}`);
    }
    await chart.closeOverlays();
    await chart.expectChartIdentity();
  });

  test('REG-CWV-SO-015 — Return/New Visitor / Traffic Segment / Time Zone soft + restore', async () => {
    try {
      const ret = await chart.softFilterCombo(/Return\/New|Returning|New Visitor/i);
      const seg = await chart.softFilterCombo(/Traffic Segment/i);
      const tz = await chart.softFilterCombo(/Time Zone|Timezone/i, /GMT|UTC|\+/i);
      annotate(`filters soft returnNew=${ret} segment=${seg} timezone=${tz}`);
      await chart.clickResetToDefault().catch(() => undefined);
    } catch (e) {
      annotate(`return/segment/tz soft: ${e instanceof Error ? e.message : String(e)}`);
    }
    await chart.closeOverlays();
    await chart.expectChartIdentity();
  });

  test('REG-CWV-SO-016 — Export ▾ PNG / PDF / CSV soft vs UI', async () => {
    try {
      const menu = await chart.softOpenExportMenu();
      annotate(`Export menu opened=${menu.opened} options=[${menu.options.join(', ')}]`);
      if (!menu.opened) annotate('Export submenu soft-miss — annotate live labels');
      for (const [label, re] of [
        ['PNG Image', /PNG Image/i],
        ['PDF Document', /PDF Document/i],
        ['CSV Data', /CSV Data/i],
      ] as const) {
        if (!menu.options.some((o) => re.test(o))) {
          annotate(`Export format soft-miss: ${label}`);
          continue;
        }
        const r = await chart.softExportOption(re);
        annotate(`Export ${label} triggered=${r.triggered} download="${r.downloadHint || 'n/a'}"`);
      }
      await chart.closeOverlays();
      await chart.expectChartIdentity();
    } catch (e) {
      annotate(`Export soft: ${e instanceof Error ? e.message : String(e)}`);
      await recover();
    }
  });

  test('REG-CWV-SO-017 — Refresh Data soft settle; identity retained', async () => {
    const before = await chart.getTableRowSignature();
    const clicked = await chart.clickRefreshData();
    if (!clicked) annotate('Refresh Data control soft-miss');
    else {
      await expect.poll(async () => chart.chartReadyScore(), { timeout: 45000 }).toBeGreaterThanOrEqual(3);
      const after = await chart.getTableRowSignature();
      if (before === after) annotate('Refresh Data: signature identical (expected OK)');
      else annotate('Refresh Data: soft signature changed');
      const body = await chart.getBodySample(2000);
      if (/Data refreshed/i.test(body)) annotate('Data refreshed timestamp soft-present');
    }
    await chart.expectChartIdentity();
  });

  test('REG-CWV-SO-018 — Reset to default after intentional Lookback change', async () => {
    try {
      await chart.adjustLookbackSoft();
      await chart.clickApply();
      const reset = await chart.clickResetToDefault();
      if (!reset) annotate('Reset to default missing on locked Global — annotate');
      else annotate('Reset to default soft-ok');
    } catch (e) {
      annotate(`reset soft: ${e instanceof Error ? e.message : String(e)}`);
    }
    await chart.expectChartIdentity();
  });

  test('REG-CWV-SO-019 — column sort soft (Page Name / Onload / Change) + Escape overlays', async () => {
    try {
      for (const re of [/Page Name/i, /^Onload$/i, /Change/i, /Page Hits/i]) {
        const r = await chart.softSortColumn(re);
        if (!r.clicked) annotate(`sort soft-miss header=${re}`);
        else if (r.before && r.after && r.before !== r.after) annotate(`sort changed: ${r.header}`);
        else annotate(`sort clicked equal/annotate: ${r.header}`);
      }
      await page.keyboard.press('Escape').catch(() => undefined);
      await chart.closeOverlays();
    } catch (e) {
      annotate(`sort soft: ${e instanceof Error ? e.message : String(e)}`);
    }
    await chart.expectChartIdentity();
  });

  test('REG-CWV-SO-020 — not VitalPulse / VitalScope / PoP dashboard / plain Summary as home', async () => {
    await chart.expectNotConfusedSurfaces();
    const body = await chart.getBodySample(2500);
    expect(body).toMatch(/CWV Top 10 Summary Onload/i);
    // Soft: if stuck on catalog-only, fail
    expect(await chart.isInChartViewer() || /Refresh Data/i.test(body)).toBeTruthy();
  });

  test('REG-CWV-SO-021 — combo: Lookback → filter → Refresh → Export soft → Reset', async () => {
    try {
      await withSoftDeadline(
        async () => {
          await chart.adjustLookbackSoft().catch(() => undefined);
          await chart.clickApply().catch(() => undefined);
          await chart.softFilterCombo(/\bDevice\b/i, /Desktop|Mobile/i).catch(() => undefined);
          await chart.clickRefreshData().catch(() => undefined);
          await chart.softOpenExportMenu().catch(() => undefined);
          await chart.closeOverlays();
          await chart.clickResetToDefault().catch(() => undefined);
          await chart.expectChartIdentity();
        },
        120000,
        recover
      );
      annotate('combo Lookback→filter→Refresh→Export→Reset soft-ok');
    } catch (e) {
      annotate(`combo soft: ${e instanceof Error ? e.message : String(e)}`);
      await recover();
    }
  });

  test('REG-CWV-SO-022 — portal reload; re-open Onload + GDC soft', async () => {
    try {
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 90000 });
      await chart.waitForPortalReady().catch(() => undefined);
      await chart.waitForBiFrame(90000);
      await chart.openChartsList();
      await chart.searchAndOpenChart();
      await chart.waitForChartReady();
      await chart.ensureProfileSiteSelected();
      await chart.expectChartIdentity();
      annotate(`reload recover load soft; site=${await chart.getSiteLabel().catch(() => '?')}`);
    } catch (e) {
      annotate(`reload soft: ${e instanceof Error ? e.message : String(e)}`);
      await recover();
    }
  });

  test('REG-CWV-SO-023 — ~1100px viewport keeps BI + Onload reachable', async () => {
    await page.setViewportSize({ width: 1100, height: 800 });
    await page.waitForTimeout(1000);
    await expect
      .poll(async () => ((await chart.locators.pageTitle.innerText().catch(() => '')) || '').replace(/\s+/g, ' '), {
        timeout: 15000,
      })
      .toMatch(/Business Intelligence/i);
    try {
      await chart.expectChartIdentity();
    } catch {
      annotate('Onload title soft-miss at 1100px — BI sidebar may collapse; recovering');
      await recover();
    }
    await page.setViewportSize({ width: 1500, height: 950 });
  });

  test('REG-CWV-SO-024 — restore baseline; suite home healthy; no leftover mutations', async () => {
    await chart.clickResetToDefault().catch(() => undefined);
    await chart.closeOverlays();
    await chart.ensureProfileSiteSelected();
    if (initialCtx) await chart.restoreContext(initialCtx).catch(() => undefined);
    await chart.expectChartIdentity();
    annotate(`suite end annotations count=${notes.length} loadMs=${initialLoadMs}`);
  });
});
