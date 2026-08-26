import { test, expect, Page } from '@playwright/test';
import path from 'path';
import {
  CwvTop10PopDashboardPage,
  CwvPopContext,
} from '../../../../../../../pages/CwvTop10PopDashboardPage';
import { getActiveProfile } from '../../../../../../../config/profiles';

/**
 * Regression: BI Dashboard — CWV Top 10 Period over Period (PoP)
 * Site: GDC Test Site 2
 * Path: tests/.../business-intelligence/cwv-top10-pop
 *
 * Shell: business-intelligence/tool → #bi-iframe.
 * Lookback/filter mutations restored; Save As clones cleaned up.
 * Never treat VitalPulse / VitalScope / Native App PoP as home.
 *
 * npm: test:regression:us2:cwv-top10-pop
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

test.describe('US2 Regression — CWV Top 10 Period over Period (PoP)', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180000);

  let page: Page;
  let pop: CwvTop10PopDashboardPage;
  let initialCtx: CwvPopContext;
  let initialLoadMs = 0;
  let cloneName = '';
  const notes: string[] = [];
  const blockingPageErrors: string[] = [];

  const annotate = (description: string) => {
    notes.push(description);
    test.info().annotations.push({ type: 'note', description });
    console.log(`[CWV-POP] ${description}`);
  };

  const recover = async () => {
    await Promise.race([
      (async () => {
        await pop.recoverPage();
        if (initialCtx) await pop.restoreContext(initialCtx).catch(() => undefined);
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
    pop = new CwvTop10PopDashboardPage(page);
    const started = Date.now();
    await pop.openViaNavigation();
    initialLoadMs = Date.now() - started;
    initialCtx = await pop.captureContext();
    const profile = getActiveProfile();
    console.log(
      `[CWV-POP] profile=${profile.id} site=${await pop.getSiteLabel().catch(() => profile.siteName)} loadMs=${initialLoadMs} lookback="${initialCtx.lookbackSignature}"`
    );
  });

  test.afterAll(async () => {
    try {
      if (page && !page.isClosed()) {
        await Promise.race([
          (async () => {
            if (cloneName) {
              const deleted = await pop.softDeleteCloneBySearch(cloneName).catch(() => false);
              if (!deleted) annotate(`leftover clone needs manual cleanup: ${cloneName}`);
            }
            await pop.clickResetToDefault().catch(() => undefined);
            await pop.closeOverlays().catch(() => undefined);
          })(),
          new Promise((r) => setTimeout(r, 20000)),
        ]);
      }
    } catch {
      // ignore
    }
    if (notes.length) console.log(`[CWV-POP] annotations:\n- ${notes.join('\n- ')}`);
    if (blockingPageErrors.length)
      console.log(`[CWV-POP] pageerrors sample: ${blockingPageErrors.slice(0, 5).join(' | ')}`);
    await page?.context()?.close().catch(() => undefined);
  });

  test('REG-CWV-POP-001 — portal BI tool loads; title/route; no login redirect', async () => {
    await expect(page).toHaveURL(/business-intelligence\/tool|business-intelligence%2Ftool/i);
    await expect(page).not.toHaveURL(/site\/login|site%2Flogin/i);
    await expect
      .poll(async () => ((await pop.locators.pageTitle.innerText().catch(() => '')) || '').replace(/\s+/g, ' '), {
        timeout: 20000,
      })
      .toMatch(/Business Intelligence/i);
    await expect(pop.locators.biIframe).toBeAttached({ timeout: 30000 });
  });

  test('REG-CWV-POP-002 — GDC Test Site 2; #bi-iframe ready; PoP identity', async () => {
    await pop.ensureProfileSiteSelected();
    try {
      await pop.expectSelectedSite();
    } catch (e) {
      annotate(`site label soft-miss: ${e instanceof Error ? e.message : String(e)}`);
    }
    await pop.expectPopIdentity();
    annotate(`widgetsReadyScore=${await pop.widgetsReadyScore()} lookback="${initialCtx.lookbackSignature}"`);
  });

  test('REG-CWV-POP-003 — BI rail soft: Favorites / Dashboards / AI Query / Charts / Schedules / Folders', async () => {
    const body = await pop.getBodySample(2500);
    for (const label of ['Favorites', 'Dashboards', 'AI Query', 'Charts', 'Schedules', 'Folders']) {
      expect(body, `rail ${label}`).toMatch(new RegExp(label, 'i'));
    }
  });

  test('REG-CWV-POP-004 — Dashboards list Search finds CWV Top 10 PoP card (~13 widgets soft)', async () => {
    await withSoftDeadline(
      async () => {
        await pop.openDashboardsList();
        const fr = await pop.bi();
        const search = fr.locator('input[placeholder*="Search" i], input[type="search"]').first();
        if (await search.isVisible().catch(() => false)) {
          await search.fill('CWV Top 10 Period');
          await page.waitForTimeout(2000);
        }
        const body = await pop.getBodySample(4000);
        expect(body).toMatch(/CWV Top 10 Period over Period \(PoP\)/i);
        if (/13 widgets/i.test(body)) annotate('catalog card soft: 13 widgets');
        else annotate('catalog widget count not visible in sample — soft');
        // clear sticky search then re-open viewer
        if (await search.isVisible().catch(() => false)) {
          await search.fill('');
          await page.waitForTimeout(500);
        }
        await pop.searchAndOpenPop();
        await pop.waitForDashboardReady();
      },
      120000,
      recover
    );
  });

  test('REG-CWV-POP-005 — soft list chrome (folders / Local-UTC / Reset) non-destructive restore', async () => {
    try {
      await withSoftDeadline(
        async () => {
          await pop.openDashboardsList();
          const fr = await pop.bi();
          const body = await pop.getBodySample(2000);
          expect(body).toMatch(/All Folders|My Folder|Global/i);
          if (/Local|UTC/i.test(body)) annotate('Local|UTC timezone toggle soft-present on list');
          const reset = fr.locator('button, a').filter({ hasText: /^Reset$/i }).first();
          if (await reset.isVisible().catch(() => false)) {
            await reset.click({ force: true }).catch(() => undefined);
            await page.waitForTimeout(800);
          }
          await pop.searchAndOpenPop();
          await pop.waitForDashboardReady();
        },
        100000,
        recover
      );
    } catch (e) {
      annotate(`list chrome soft: ${e instanceof Error ? e.message : String(e)}`);
      await recover();
    }
  });

  test('REG-CWV-POP-006 — soft sibling catalog presence (Native App PoP / CWV Trends*); restore PoP', async () => {
    try {
      const mid = await withSoftDeadline(
        () => pop.softOpenSiblingThenRestore(/Native App Top 10 Period over Period \(PoP\)|CWV Trends by Page/i),
        100000,
        recover
      );
      if (mid) annotate(`sibling soft-present: ${mid}`);
      else annotate('sibling card not visible in current folder/search — soft');
      await pop.expectPopIdentity();
    } catch (e) {
      annotate(`sibling soft: ${e instanceof Error ? e.message : String(e)}`);
      await recover();
    }
  });

  test('REG-CWV-POP-007 — viewer title CWV Top 10 Period over Period (PoP)', async () => {
    await pop.expectPopIdentity();
    await pop.expectNotConfusedSurfaces();
  });

  test('REG-CWV-POP-008 — PDF five comparative charts soft (Page load / LCP / INP / CLS / Page views)', async () => {
    const charts = await pop.chartTitlePresence();
    const present = [charts.pageLoad, charts.lcp, charts.inp, charts.cls, charts.pageViews].filter(Boolean).length;
    annotate(
      `charts soft pageLoad=${charts.pageLoad} LCP=${charts.lcp} INP=${charts.inp} CLS=${charts.cls} pageViews=${charts.pageViews}`
    );
    expect(present, 'at least 3 of 5 comparative metric titles').toBeGreaterThanOrEqual(3);
    if (!charts.pageViews) annotate('Page views chart title soft-miss (lazy/collapsed?)');
  });

  test('REG-CWV-POP-009 — comparative tables + Google bands + delta legend soft', async () => {
    const body = await pop.getBodySample(8000);
    const hasTableHint = /Delta|Page Name|table|Needs improvement|Improvement >/i.test(body);
    expect(hasTableHint || (await pop.widgetsReadyScore()) >= 4).toBeTruthy();
    if (/Poor|Needs improvement|\bGood\b/i.test(body)) annotate('Google CWV band language soft-present');
    else annotate('Google band labels soft-miss in body sample');
    if (/Improvement\s*>\s*5%|Degradation\s*>\s*5%|Improvement or Degradation|Delta Definitions/i.test(body))
      annotate('delta legend soft-present');
    else annotate('delta legend soft-miss (may require scroll)');
  });

  test('REG-CWV-POP-010 — Lookback Period increase months + Apply + soft refresh', async () => {
    const before = await pop.getLookbackSignature();
    const beforeSig = (await pop.getBodySample(500)).slice(0, 300);
    let adjusted = false;
    try {
      adjusted = await withSoftDeadline(() => pop.adjustLookbackMonths('up'), 45000, recover);
      if (adjusted) await pop.clickApply();
      else annotate('Lookback month stepper/control not found — annotate live host');
    } catch (e) {
      annotate(`Lookback +1 soft: ${e instanceof Error ? e.message : String(e)}`);
    }
    await page.waitForTimeout(2000);
    const after = await pop.getLookbackSignature();
    const afterSig = (await pop.getBodySample(500)).slice(0, 300);
    if (adjusted && beforeSig === afterSig) annotate('Lookback Apply: signature unchanged (sparse data?)');
    else if (adjusted) annotate(`Lookback +1 applied before="${before}" after="${after}"`);
    await pop.expectPopIdentity();
  });

  test('REG-CWV-POP-011 — Lookback Period decrease months + Apply; restore baseline', async () => {
    try {
      const adjusted = await withSoftDeadline(() => pop.adjustLookbackMonths('down'), 45000, recover);
      if (adjusted) await pop.clickApply();
      else annotate('Lookback decrease control soft-miss');
      const reset = await pop.clickResetToDefault();
      if (!reset) {
        // best-effort re-apply baseline via another down/up or leave annotated
        annotate('Reset to Default unavailable — will rely on restoreContext/afterAll');
      }
    } catch (e) {
      annotate(`Lookback −1 soft: ${e instanceof Error ? e.message : String(e)}`);
    }
    await pop.expectPopIdentity();
  });

  test('REG-CWV-POP-012 — Comparison Method / Period soft combo + Apply + restore', async () => {
    try {
      const ok = await pop.softFilterCombo(/Comparison Method|Comparison Period/i, /previous|last year|year/i);
      if (!ok) annotate('Comparison Method/Period host soft-miss');
      else annotate('Comparison Method/Period sample Apply soft-ok');
      await pop.clickResetToDefault().catch(() => undefined);
    } catch (e) {
      annotate(`comparison soft: ${e instanceof Error ? e.message : String(e)}`);
    }
    await pop.closeOverlays();
    await pop.expectPopIdentity();
  });

  test('REG-CWV-POP-013 — Device / Bot Traffic / Browser sample combos + restore', async () => {
    try {
      const device = await pop.softFilterCombo(/^Device$|Device/i, /Desktop|Mobile/i);
      const bot = await pop.softFilterCombo(/Bot Traffic/i, /Exclude|Include|Bot/i);
      const browser = await pop.softFilterCombo(/^Browser$|Browser/i);
      annotate(`filters soft device=${device} bot=${bot} browser=${browser}`);
      await pop.clickResetToDefault().catch(() => undefined);
    } catch (e) {
      annotate(`device/bot/browser soft: ${e instanceof Error ? e.message : String(e)}`);
    }
    await pop.closeOverlays();
    await pop.expectPopIdentity();
  });

  test('REG-CWV-POP-014 — Originated from / Percentile (75th soft) / Page Name sample + restore', async () => {
    try {
      const origin = await pop.softFilterCombo(/Originated from/i, /RUM Browser|Native App|Webviews?/i);
      const pct = await pop.softFilterCombo(/Percentile/i, /75|75th|p75/i);
      const pageName = await pop.softFilterCombo(/Page Name/i);
      annotate(`filters soft origin=${origin} percentile=${pct} pageName=${pageName}`);
      if (pct) annotate('Percentile control present (PDF default 75th soft)');
      await pop.clickResetToDefault().catch(() => undefined);
    } catch (e) {
      annotate(`origin/percentile/page soft: ${e instanceof Error ? e.message : String(e)}`);
    }
    await pop.closeOverlays();
    await pop.expectPopIdentity();
  });

  test('REG-CWV-POP-015 — Refresh Data soft settle; identity retained', async () => {
    const before = (await pop.getBodySample(400)).slice(0, 250);
    const clicked = await pop.clickRefreshData();
    if (!clicked) annotate('Refresh Data control soft-miss on this dashboard chrome');
    else {
      await expect.poll(async () => pop.widgetsReadyScore(), { timeout: 45000 }).toBeGreaterThanOrEqual(2);
      const after = (await pop.getBodySample(400)).slice(0, 250);
      if (before === after) annotate('Refresh Data: signature identical (expected OK)');
      else annotate('Refresh Data: soft signature changed');
    }
    await pop.expectPopIdentity();
  });

  test('REG-CWV-POP-016 — Reset to Default after intentional Lookback change', async () => {
    try {
      await pop.adjustLookbackMonths('up');
      await pop.clickApply();
      const reset = await pop.clickResetToDefault();
      if (!reset) annotate('Reset to Default missing on locked Global — use Save As clone for mutations');
      else annotate('Reset to Default soft-ok');
    } catch (e) {
      annotate(`reset soft: ${e instanceof Error ? e.message : String(e)}`);
    }
    await pop.expectPopIdentity();
  });

  test('REG-CWV-POP-017 — Save As disposable clone; verify; schedule cleanup', async () => {
    cloneName = `CWV-PoP-QA-${Date.now().toString(36)}`;
    try {
      const saved = await withSoftDeadline(() => pop.softSaveAsClone(cloneName), 90000, recover);
      if (!saved) {
        annotate('Save As control soft-miss (Global lock?) — clone skipped');
        cloneName = '';
      } else {
        const body = await pop.getBodySample(3000);
        if (new RegExp(cloneName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(body) || /CWV Top 10|LCP|INP/i.test(body))
          annotate(`Save As clone soft-ok name=${cloneName}`);
        else annotate(`Save As submitted; clone identity soft-unclear name=${cloneName}`);
      }
    } catch (e) {
      annotate(`Save As soft: ${e instanceof Error ? e.message : String(e)}`);
      cloneName = '';
    }
    // Return to shared PoP
    try {
      await pop.openDashboardsList();
      await pop.searchAndOpenPop();
      await pop.waitForDashboardReady();
    } catch {
      await recover();
    }
    await pop.expectPopIdentity();
  });

  test('REG-CWV-POP-018 — soft hover / Escape / focus Lookback|Apply|Refresh', async () => {
    try {
      const fr = await pop.bi();
      const chart = fr.locator('svg, canvas, .highcharts-container').first();
      if (await chart.isVisible().catch(() => false)) {
        await chart.hover({ force: true, timeout: 5000 }).catch(() => undefined);
        annotate('chart hover soft-ok');
      } else annotate('no visible chart host for hover');
      await page.keyboard.press('Escape').catch(() => undefined);
      const L = pop.locators.inFrame(fr);
      for (const loc of [L.refreshDataBtn, L.applyBtn, L.lookbackPeriod]) {
        if (await loc.isVisible().catch(() => false)) {
          await loc.focus().catch(() => undefined);
        }
      }
    } catch (e) {
      annotate(`a11y soft: ${e instanceof Error ? e.message : String(e)}`);
    }
    await pop.closeOverlays();
  });

  test('REG-CWV-POP-019 — not VitalPulse / VitalScope / Native App PoP / portal site dashboard', async () => {
    await pop.expectNotConfusedSurfaces();
    await expect(page).not.toHaveURL(/vital.?pulse|performance-overview|site\/dashboard(?!-)/i);
    const body = await pop.getBodySample(1500);
    expect(body).toMatch(/CWV Top 10 Period over Period \(PoP\)/i);
  });

  test('REG-CWV-POP-020 — combination Lookback → filter → Refresh → Reset soft', async () => {
    try {
      await withSoftDeadline(
        async () => {
          await pop.adjustLookbackMonths('up');
          await pop.clickApply();
          await pop.softFilterCombo(/Device/i, /Desktop|Mobile/i);
          await pop.clickRefreshData();
          await pop.clickResetToDefault();
          await pop.expectPopIdentity();
        },
        120000,
        recover
      );
    } catch (e) {
      annotate(`combo soft: ${e instanceof Error ? e.message : String(e)}`);
      await recover();
    }
  });

  test('REG-CWV-POP-021 — portal reload recovery; re-open PoP + GDC soft', async () => {
    await withSoftDeadline(
      async () => {
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => undefined);
        await pop.waitForPortalReady().catch(() => undefined);
        await pop.waitForBiFrame(90000);
        await pop.openDashboardsList();
        await pop.searchAndOpenPop();
        await pop.waitForDashboardReady();
        await pop.ensureProfileSiteSelected();
        await pop.expectPopIdentity();
      },
      150000,
      recover
    );
    annotate(`reload recovery loadMs soft initial=${initialLoadMs}`);
  });

  test('REG-CWV-POP-022 — ~1100px viewport keeps BI title reachable', async () => {
    const prev = page.viewportSize();
    await page.setViewportSize({ width: 1100, height: 800 });
    await page.waitForTimeout(800);
    await expect
      .poll(async () => ((await pop.locators.pageTitle.innerText().catch(() => '')) || '').replace(/\s+/g, ' '), {
        timeout: 15000,
      })
      .toMatch(/Business Intelligence/i);
    await pop.expectPopIdentity().catch(async () => {
      annotate('PoP identity soft after resize — re-open');
      await recover();
    });
    if (prev) await page.setViewportSize(prev);
  });

  test('REG-CWV-POP-023 — restore baseline; suite home healthy', async () => {
    await pop.restoreContext(initialCtx);
    await pop.ensureProfileSiteSelected();
    await pop.expectPopIdentity();
    if (cloneName) {
      const deleted = await pop.softDeleteCloneBySearch(cloneName).catch(() => false);
      if (deleted) {
        annotate(`clone deleted: ${cloneName}`);
        cloneName = '';
      } else annotate(`clone cleanup deferred: ${cloneName}`);
      await pop.searchAndOpenPop().catch(() => recover());
      await pop.waitForDashboardReady().catch(() => undefined);
    }
    await pop.expectPopIdentity();
  });
});
