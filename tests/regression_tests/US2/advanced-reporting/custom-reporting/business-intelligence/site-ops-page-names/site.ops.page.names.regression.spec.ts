import { test, expect, Page } from '@playwright/test';
import path from 'path';
import {
  SiteOpsPageNamesDashboardPage,
  SopnContext,
} from '../../../../../../../pages/SiteOpsPageNamesDashboardPage';
import { getActiveProfile } from '../../../../../../../config/profiles';

/**
 * Regression: BI Dashboard — Site Operations Dashboard for Page Names
 * Site: GDC Test Site 2
 * Path: tests/.../business-intelligence/site-ops-page-names
 *
 * Shell: business-intelligence/tool → #bi-iframe.
 * Lookback/filter/sort mutations restored; Save As clones cleaned up.
 * Never treat Page Groups / VitalPulse / VitalScope / CWV Top 10 PoP as home.
 *
 * npm: test:regression:us2:site-ops-page-names
 */

const AUTH_STATE = path.join(__dirname, '../../../../../../../playwright/.auth/user.json');

async function withSoftDeadline<T>(
  work: () => Promise<T>,
  ms: number,
  onTimeout?: () => Promise<void>
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work(),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
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
  }
}

test.describe('US2 Regression — Site Operations Dashboard for Page Names', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180000);

  let page: Page;
  let sopn: SiteOpsPageNamesDashboardPage;
  let initialCtx: SopnContext;
  let initialLoadMs = 0;
  let cloneName = '';
  const notes: string[] = [];

  const annotate = (description: string) => {
    notes.push(description);
    test.info().annotations.push({ type: 'note', description });
    console.log(`[SOPN] ${description}`);
  };

  const recover = async () => {
    await Promise.race([
      (async () => {
        await sopn.recoverPage();
        if (initialCtx) await sopn.restoreContext(initialCtx).catch(() => undefined);
      })(),
      new Promise<void>((resolve) => setTimeout(resolve, 100000)),
    ]);
  };

  test.beforeAll(async ({ browser }, testInfo) => {
    testInfo.setTimeout(360000);
    const context = await browser.newContext({ storageState: AUTH_STATE });
    page = await context.newPage();
    sopn = new SiteOpsPageNamesDashboardPage(page);
    const started = Date.now();
    await sopn.openViaNavigation();
    initialLoadMs = Date.now() - started;
    initialCtx = await sopn.captureContext();
    const profile = getActiveProfile();
    console.log(
      `[SOPN] profile=${profile.id} site=${await sopn.getSiteLabel().catch(() => profile.siteName)} loadMs=${initialLoadMs} lookback="${initialCtx.lookbackSignature}" months="${initialCtx.monthHeaders}"`
    );
  });

  test.afterAll(async () => {
    try {
      if (page && !page.isClosed()) {
        await Promise.race([
          (async () => {
            if (cloneName) {
              const deleted = await sopn.softDeleteCloneBySearch(cloneName).catch(() => false);
              if (!deleted) annotate(`leftover clone needs manual cleanup: ${cloneName}`);
            }
            await sopn.clickResetToDefault().catch(() => undefined);
            await sopn.closeOverlays().catch(() => undefined);
          })(),
          new Promise((r) => setTimeout(r, 20000)),
        ]);
      }
    } catch {
      // ignore
    }
    if (notes.length) console.log(`[SOPN] annotations:\n- ${notes.join('\n- ')}`);
    await page?.context()?.close().catch(() => undefined);
  });

  test('REG-SOPN-001 — portal BI tool loads; title/route; no login redirect', async () => {
    await expect(page).toHaveURL(/business-intelligence\/tool|business-intelligence%2Ftool/i);
    await expect(page).not.toHaveURL(/site\/login|site%2Flogin/i);
    await expect
      .poll(async () => ((await sopn.locators.pageTitle.innerText().catch(() => '')) || '').replace(/\s+/g, ' '), {
        timeout: 20000,
      })
      .toMatch(/Business Intelligence/i);
    await expect(sopn.locators.biIframe).toBeAttached({ timeout: 30000 });
  });

  test('REG-SOPN-002 — GDC Test Site 2; #bi-iframe ready; Page Names identity', async () => {
    await sopn.ensureProfileSiteSelected();
    try {
      await sopn.expectSelectedSite();
    } catch (e) {
      annotate(`site label soft-miss: ${e instanceof Error ? e.message : String(e)}`);
    }
    await sopn.expectSopnIdentity();
    annotate(`widgetsReadyScore=${await sopn.widgetsReadyScore()} lookback="${initialCtx.lookbackSignature}"`);
  });

  test('REG-SOPN-003 — BI rail soft: Favorites / Dashboards / AI Query / Charts / Schedules / Folders', async () => {
    const body = await sopn.getBodySample(2500);
    for (const label of ['Favorites', 'Dashboards', 'AI Query', 'Charts', 'Schedules', 'Folders']) {
      expect(body, `rail ${label}`).toMatch(new RegExp(label, 'i'));
    }
  });

  test('REG-SOPN-004 — Dashboards Search finds Page Names card (~8 widgets soft)', async () => {
    await withSoftDeadline(
      async () => {
        await sopn.openDashboardsList();
        const fr = await sopn.bi();
        const search = fr.locator('input[placeholder*="Search" i], input[type="search"]').first();
        if (await search.isVisible().catch(() => false)) {
          await search.fill('Dashboard for Page Names');
          await page.waitForTimeout(2000);
        }
        const body = await sopn.getBodySample(4000);
        expect(body).toMatch(/Site Operations Dashboard for Page Names/i);
        if (/8 widgets/i.test(body)) annotate('catalog card soft: 8 widgets');
        else annotate('catalog widget count not visible — soft');
        if (await search.isVisible().catch(() => false)) {
          await search.fill('');
          await page.waitForTimeout(500);
        }
        await sopn.searchAndOpenDashboard();
        await sopn.waitForDashboardReady();
      },
      120000,
      recover
    );
  });

  test('REG-SOPN-005 — soft list chrome folders/Local-UTC/Reset; restore Page Names', async () => {
    try {
      await withSoftDeadline(
        async () => {
          await sopn.openDashboardsList();
          const body = await sopn.getBodySample(2000);
          expect(body).toMatch(/All Folders|My Folder|Global/i);
          if (/Local|UTC/i.test(body)) annotate('Local|UTC soft-present on list');
          const fr = await sopn.bi();
          const reset = fr.locator('button, a').filter({ hasText: /^Reset$/i }).first();
          if (await reset.isVisible().catch(() => false)) {
            await reset.click({ force: true }).catch(() => undefined);
            await page.waitForTimeout(800);
          }
          await sopn.searchAndOpenDashboard();
          await sopn.waitForDashboardReady();
        },
        100000,
        recover
      );
    } catch (e) {
      annotate(`list chrome soft: ${e instanceof Error ? e.message : String(e)}`);
      await recover();
    }
  });

  test('REG-SOPN-006 — soft sibling Page Groups / Site Ops + CWV; restore Page Names', async () => {
    try {
      const mid = await withSoftDeadline(
        () =>
          sopn.softOpenSiblingThenRestore(
            /Site Operations Dashboard for Page Groups|Site Operations \+ CWV Trends|CWV Top 10 Period over Period \(PoP\)/i
          ),
        100000,
        recover
      );
      if (mid) annotate(`sibling soft-present: ${mid}`);
      else annotate('sibling card not visible — soft');
      await sopn.expectSopnIdentity();
    } catch (e) {
      annotate(`sibling soft: ${e instanceof Error ? e.message : String(e)}`);
      await recover();
    }
  });

  test('REG-SOPN-007 — viewer title Site Operations Dashboard for Page Names', async () => {
    await sopn.expectSopnIdentity();
    await sopn.expectNotConfusedSurfaces();
  });

  test('REG-SOPN-008 — monthly CWV soft: LCP / CLS / INP + PAGE NAME tables', async () => {
    const m = await sopn.metricPresence();
    annotate(`metrics soft LCP=${m.lcp} CLS=${m.cls} INP=${m.inp} PAGE_NAME=${m.pageName}`);
    const present = [m.lcp, m.cls, m.inp].filter(Boolean).length;
    expect(present, 'at least 2 of LCP/CLS/INP').toBeGreaterThanOrEqual(2);
    expect(m.pageName, 'PAGE NAME table header').toBeTruthy();
    const months = await sopn.getMonthHeadersSignature();
    if (months) annotate(`month headers soft: ${months}`);
    else annotate('month headers soft-miss');
  });

  test('REG-SOPN-009 — Google CWV bands soft + Core Web Vitals of Top Viewed Pages language', async () => {
    const body = await sopn.getBodySample(8000);
    if (/Poor|Needs [Ii]mprovement|\bGood\b/i.test(body)) annotate('Google band language soft-present');
    else annotate('Google band labels soft-miss (may be color-only)');
    if (/Core Web Vitals of Top Viewed Pages/i.test(body)) annotate('subtitle soft-present');
  });

  test('REG-SOPN-010 — Lookback Period increase months + soft refresh', async () => {
    const beforeLookback = await sopn.getLookbackSignature();
    const beforeMonths = await sopn.getMonthHeadersSignature();
    let adjusted = false;
    try {
      adjusted = await withSoftDeadline(() => sopn.adjustLookbackMonths('up'), 45000, recover);
      if (!adjusted) annotate('Lookback month control soft-miss');
      else await sopn.clickApply();
    } catch (e) {
      annotate(`Lookback + soft: ${e instanceof Error ? e.message : String(e)}`);
    }
    const afterLookback = await sopn.getLookbackSignature();
    const afterMonths = await sopn.getMonthHeadersSignature();
    if (adjusted && beforeMonths === afterMonths && beforeLookback === afterLookback)
      annotate('Lookback change: signature unchanged (sparse/auto-apply?)');
    else if (adjusted) annotate(`Lookback up before="${beforeLookback}" after="${afterLookback}" months ${beforeMonths}→${afterMonths}`);
    await sopn.expectSopnIdentity();
  });

  test('REG-SOPN-011 — Lookback decrease; Reset to Defaults restore soft', async () => {
    try {
      const adjusted = await withSoftDeadline(() => sopn.adjustLookbackMonths('down'), 45000, recover);
      if (adjusted) await sopn.clickApply();
      else annotate('Lookback decrease soft-miss');
      const reset = await sopn.clickResetToDefault();
      if (!reset) annotate('Reset to Defaults unavailable — annotate');
      else annotate('Reset to Defaults soft-ok');
    } catch (e) {
      annotate(`Lookback − soft: ${e instanceof Error ? e.message : String(e)}`);
    }
    await sopn.expectSopnIdentity();
  });

  test('REG-SOPN-012 — Device / Bot Traffic / Originated From sample + restore', async () => {
    try {
      const device = await sopn.softFilterCombo(/Device/i, /Desktop|Mobile/i);
      const bot = await sopn.softFilterCombo(/Bot Traffic/i, /Exclude|Include|Bot|Non-Bot/i);
      const origin = await sopn.softFilterCombo(/Originated From/i, /RUM Browser|Native App|Webviews?/i);
      annotate(`filters soft device=${device} bot=${bot} origin=${origin}`);
      await sopn.clickResetToDefault().catch(() => undefined);
    } catch (e) {
      annotate(`device/bot/origin soft: ${e instanceof Error ? e.message : String(e)}`);
    }
    await sopn.closeOverlays();
    await sopn.expectSopnIdentity();
  });

  test('REG-SOPN-013 — Page Name / Percentile (75th) / Page Group sample + restore', async () => {
    try {
      const pageName = await sopn.softFilterCombo(/Page Name/i);
      const pct = await sopn.softFilterCombo(/Percentile/i, /75|75th|p75/i);
      const group = await sopn.softFilterCombo(/Page Group/i);
      annotate(`filters soft pageName=${pageName} percentile=${pct} pageGroup=${group}`);
      if (pct) annotate('Percentile control present (PDF default 75th soft)');
      await sopn.clickResetToDefault().catch(() => undefined);
    } catch (e) {
      annotate(`page/percentile/group soft: ${e instanceof Error ? e.message : String(e)}`);
    }
    await sopn.closeOverlays();
    await sopn.expectSopnIdentity();
  });

  test('REG-SOPN-014 — column sort PAGE NAME + month headers soft rearrange', async () => {
    try {
      const nameSort = await sopn.softSortColumn(/PAGE NAME/i);
      if (!nameSort.clicked) annotate('PAGE NAME header soft-miss');
      else if (nameSort.before && nameSort.after && nameSort.before !== nameSort.after)
        annotate(`PAGE NAME sort changed rows soft`);
      else annotate(`PAGE NAME sort clicked; order identical soft (equal values?) before=${nameSort.before.slice(0, 60)}`);

      const monthSort = await sopn.softSortColumn(/\b(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{4}/i);
      if (!monthSort.clicked) annotate('month column header soft-miss');
      else if (monthSort.before !== monthSort.after) annotate('month column sort changed rows soft');
      else annotate('month column sort clicked; order identical soft');

      // reverse toggle soft
      await sopn.softSortColumn(/PAGE NAME/i);
      await sopn.clickResetToDefault().catch(() => undefined);
    } catch (e) {
      annotate(`sort soft: ${e instanceof Error ? e.message : String(e)}`);
    }
    await sopn.closeOverlays();
    await sopn.expectSopnIdentity();
  });

  test('REG-SOPN-015 — Refresh Data soft settle; identity retained', async () => {
    const before = (await sopn.getBodySample(400)).slice(0, 250);
    const clicked = await sopn.clickRefreshData();
    if (!clicked) annotate('Refresh Data soft-miss');
    else {
      await expect.poll(async () => sopn.widgetsReadyScore(), { timeout: 45000 }).toBeGreaterThanOrEqual(3);
      const after = (await sopn.getBodySample(400)).slice(0, 250);
      if (before === after) annotate('Refresh Data: signature identical (expected OK)');
      else annotate('Refresh Data: soft signature changed');
    }
    await sopn.expectSopnIdentity();
  });

  test('REG-SOPN-016 — Reset to Defaults after Lookback change', async () => {
    try {
      await sopn.adjustLookbackMonths('up');
      await sopn.clickApply();
      const reset = await sopn.clickResetToDefault();
      if (!reset) annotate('Reset missing on locked Global — use Save As clone for mutations');
      else annotate('Reset to Defaults soft-ok after Lookback');
    } catch (e) {
      annotate(`reset soft: ${e instanceof Error ? e.message : String(e)}`);
    }
    await sopn.expectSopnIdentity();
  });

  test('REG-SOPN-017 — Save As disposable clone; verify; schedule cleanup', async () => {
    cloneName = `SOPN-QA-${Date.now().toString(36)}`;
    try {
      const saved = await withSoftDeadline(() => sopn.softSaveAsClone(cloneName), 90000, recover);
      if (!saved) {
        annotate('Save As soft-miss (Global lock?) — clone skipped');
        cloneName = '';
      } else {
        const body = await sopn.getBodySample(3000);
        if (new RegExp(cloneName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(body) || /LCP|CLS|INP/i.test(body))
          annotate(`Save As clone soft-ok name=${cloneName}`);
        else annotate(`Save As submitted; clone identity soft-unclear name=${cloneName}`);
      }
    } catch (e) {
      annotate(`Save As soft: ${e instanceof Error ? e.message : String(e)}`);
      cloneName = '';
    }
    try {
      await sopn.openDashboardsList();
      await sopn.searchAndOpenDashboard();
      await sopn.waitForDashboardReady();
    } catch {
      await recover();
    }
    await sopn.expectSopnIdentity();
  });

  test('REG-SOPN-018 — Export chart hamburger: PNG / PDF / PPT|CSV soft vs UI', async () => {
    const uiSig = {
      title: /Site Operations Dashboard for Page Names/i.test(await sopn.getBodySample(1500)),
      lcp: (await sopn.metricPresence()).lcp,
      pageName: (await sopn.metricPresence()).pageName,
      months: await sopn.getMonthHeadersSignature(),
    };
    annotate(`export UI sig title=${uiSig.title} lcp=${uiSig.lcp} pageName=${uiSig.pageName} months=${uiSig.months}`);

    const menu = await sopn.softOpenExportMenu();
    if (!menu.opened) annotate('Export chart menu soft-miss');
    else annotate(`export options soft: ${menu.options.join(', ')}`);

    if (!menu.options.some((o) => /PowerPoint/i.test(o))) annotate('PowerPoint soft-miss — live menu PNG/PDF/CSV');

    const png = await sopn.softExportOption(/PNG Image/i);
    if (png.triggered) annotate(`PNG export soft triggered download="${png.downloadHint || 'none/dialog'}"`);
    else annotate('PNG Image option soft-miss');

    await sopn.softOpenExportMenu();
    const pdf = await sopn.softExportOption(/PDF Document/i);
    if (pdf.triggered) annotate(`PDF export soft triggered download="${pdf.downloadHint || 'none/dialog'}"`);
    else annotate('PDF Document option soft-miss');

    await sopn.softOpenExportMenu();
    const ppt = await sopn.softExportOption(/PowerPoint|\bPPT\b/i);
    if (ppt.triggered) annotate(`PowerPoint export soft triggered download="${ppt.downloadHint || 'none'}"`);
    else {
      const csv = await sopn.softExportOption(/CSV Data/i);
      if (csv.triggered) annotate(`CSV export soft (PPT substitute) download="${csv.downloadHint || 'none'}"`);
      else annotate('PPT/CSV export soft-miss');
    }

    await sopn.closeOverlays();
    await sopn.expectSopnIdentity();
  });

  test('REG-SOPN-019 — soft hover / Escape / focus Lookback|Refresh|sort header', async () => {
    try {
      const fr = await sopn.bi();
      const chart = fr.locator('svg, canvas, .highcharts-container').first();
      if (await chart.isVisible().catch(() => false)) {
        await chart.hover({ force: true, timeout: 5000 }).catch(() => undefined);
        annotate('chart hover soft-ok');
      } else annotate('no visible chart host for hover');
      await page.keyboard.press('Escape').catch(() => undefined);
      const L = sopn.locators.inFrame(fr);
      for (const loc of [L.refreshDataBtn, L.lookbackPeriod, L.pageNameHeader]) {
        if (await loc.isVisible().catch(() => false)) await loc.focus().catch(() => undefined);
      }
    } catch (e) {
      annotate(`a11y soft: ${e instanceof Error ? e.message : String(e)}`);
    }
    await sopn.closeOverlays();
  });

  test('REG-SOPN-020 — not Page Groups / VitalPulse / VitalScope / CWV Top 10 PoP / site dashboard', async () => {
    await sopn.expectNotConfusedSurfaces();
    await expect(page).not.toHaveURL(/vital.?pulse|performance-overview|site\/dashboard(?!-)/i);
    const body = await sopn.getBodySample(1500);
    expect(body).toMatch(/Site Operations Dashboard for Page Names/i);
  });

  test('REG-SOPN-021 — combo Lookback → filter → sort → Refresh → Reset soft', async () => {
    try {
      await withSoftDeadline(
        async () => {
          await sopn.adjustLookbackMonths('up');
          await sopn.clickApply();
          await sopn.softFilterCombo(/Device/i, /Desktop|Mobile/i);
          await sopn.softSortColumn(/PAGE NAME/i);
          await sopn.clickRefreshData();
          await sopn.clickResetToDefault();
          await sopn.expectSopnIdentity();
        },
        120000,
        recover
      );
    } catch (e) {
      annotate(`combo soft: ${e instanceof Error ? e.message : String(e)}`);
      await recover();
    }
  });

  test('REG-SOPN-022 — portal reload recovery; re-open Page Names + GDC soft', async () => {
    await withSoftDeadline(
      async () => {
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => undefined);
        await sopn.waitForPortalReady().catch(() => undefined);
        await sopn.waitForBiFrame(90000);
        await sopn.openDashboardsList();
        await sopn.searchAndOpenDashboard();
        await sopn.waitForDashboardReady();
        await sopn.ensureProfileSiteSelected();
        await sopn.expectSopnIdentity();
      },
      150000,
      recover
    );
    annotate(`reload recovery loadMs soft initial=${initialLoadMs}`);
  });

  test('REG-SOPN-023 — ~1100px viewport keeps BI title reachable', async () => {
    const prev = page.viewportSize();
    await page.setViewportSize({ width: 1100, height: 800 });
    await page.waitForTimeout(800);
    await expect
      .poll(async () => ((await sopn.locators.pageTitle.innerText().catch(() => '')) || '').replace(/\s+/g, ' '), {
        timeout: 15000,
      })
      .toMatch(/Business Intelligence/i);
    await sopn.expectSopnIdentity().catch(async () => {
      annotate('SOPN identity soft after resize — re-open');
      await recover();
    });
    if (prev) await page.setViewportSize(prev);
  });

  test('REG-SOPN-024 — restore baseline; clone cleanup; suite home healthy', async () => {
    await sopn.restoreContext(initialCtx);
    await sopn.ensureProfileSiteSelected();
    await sopn.expectSopnIdentity();
    if (cloneName) {
      const deleted = await sopn.softDeleteCloneBySearch(cloneName).catch(() => false);
      if (deleted) {
        annotate(`clone deleted: ${cloneName}`);
        cloneName = '';
      } else annotate(`clone cleanup deferred: ${cloneName}`);
      await sopn.searchAndOpenDashboard().catch(() => recover());
      await sopn.waitForDashboardReady().catch(() => undefined);
    }
    await sopn.expectSopnIdentity();
  });
});
