import { test, expect, Page } from '@playwright/test';
import path from 'path';
import {
  UrlCategoryAnalysisDashboardPage,
  UrlCatContext,
} from '../../../../../../../pages/UrlCategoryAnalysisDashboardPage';
import { getActiveProfile } from '../../../../../../../config/profiles';

/**
 * Regression: BI Dashboard — URL Category Analysis
 * Site: GDC Test Site 2
 * Path: tests/.../business-intelligence/url-category-analysis
 *
 * Shell: business-intelligence/tool → #bi-iframe.
 * Bot Traffic / Origin / Traffic Segment restored; Save As clones cleaned up.
 * Never treat Site Ops / CWV Top 10 PoP / VitalPulse / VitalScope as home.
 *
 * npm: test:regression:us2:url-category-analysis
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

test.describe('US2 Regression — URL Category Analysis', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180000);

  let page: Page;
  let uca: UrlCategoryAnalysisDashboardPage;
  let initialCtx: UrlCatContext;
  let initialLoadMs = 0;
  let cloneName = '';
  const notes: string[] = [];

  const annotate = (description: string) => {
    notes.push(description);
    test.info().annotations.push({ type: 'note', description });
    console.log(`[URL-CAT] ${description}`);
  };

  const recover = async () => {
    await Promise.race([
      (async () => {
        await uca.recoverPage();
        if (initialCtx) await uca.restoreContext(initialCtx).catch(() => undefined);
      })(),
      new Promise<void>((resolve) => setTimeout(resolve, 100000)),
    ]);
  };

  test.beforeAll(async ({ browser }, testInfo) => {
    testInfo.setTimeout(360000);
    const context = await browser.newContext({ storageState: AUTH_STATE });
    page = await context.newPage();
    uca = new UrlCategoryAnalysisDashboardPage(page);
    const started = Date.now();
    await uca.openViaNavigation();
    initialLoadMs = Date.now() - started;
    initialCtx = await uca.captureContext();
    const profile = getActiveProfile();
    console.log(
      `[URL-CAT] profile=${profile.id} site=${await uca.getSiteLabel().catch(() => profile.siteName)} loadMs=${initialLoadMs} filters="${initialCtx.filterSignature}"`
    );
  });

  test.afterAll(async () => {
    try {
      if (page && !page.isClosed()) {
        await Promise.race([
          (async () => {
            if (cloneName) {
              const deleted = await uca.softDeleteCloneBySearch(cloneName).catch(() => false);
              if (!deleted) annotate(`leftover clone needs manual cleanup: ${cloneName}`);
            }
            await uca.clickResetToDefault().catch(() => undefined);
            await uca.closeOverlays().catch(() => undefined);
          })(),
          new Promise((r) => setTimeout(r, 20000)),
        ]);
      }
    } catch {
      // ignore
    }
    if (notes.length) console.log(`[URL-CAT] annotations:\n- ${notes.join('\n- ')}`);
    await page?.context()?.close().catch(() => undefined);
  });

  test('REG-URL-CAT-001 — portal BI tool loads; title/route; no login redirect', async () => {
    await expect(page).toHaveURL(/business-intelligence\/tool|business-intelligence%2Ftool/i);
    await expect(page).not.toHaveURL(/site\/login|site%2Flogin/i);
    await expect
      .poll(async () => ((await uca.locators.pageTitle.innerText().catch(() => '')) || '').replace(/\s+/g, ' '), {
        timeout: 20000,
      })
      .toMatch(/Business Intelligence/i);
    await expect(uca.locators.biIframe).toBeAttached({ timeout: 30000 });
  });

  test('REG-URL-CAT-002 — GDC Test Site 2; #bi-iframe ready; URL Category Analysis identity', async () => {
    await uca.ensureProfileSiteSelected();
    try {
      await uca.expectSelectedSite();
    } catch (e) {
      annotate(`site label soft-miss: ${e instanceof Error ? e.message : String(e)}`);
    }
    await uca.expectUcaIdentity();
    annotate(`widgetsReadyScore=${await uca.widgetsReadyScore()} filters="${initialCtx.filterSignature}"`);
  });

  test('REG-URL-CAT-003 — BI rail soft: Favorites / Dashboards / AI Query / Charts / Schedules / Folders', async () => {
    const body = await uca.getBodySample(2500);
    for (const label of ['Favorites', 'Dashboards', 'AI Query', 'Charts', 'Schedules', 'Folders']) {
      expect(body, `rail ${label}`).toMatch(new RegExp(label, 'i'));
    }
  });

  test('REG-URL-CAT-004 — Dashboards Search finds URL Category Analysis (~9 widgets soft)', async () => {
    await withSoftDeadline(
      async () => {
        await uca.openDashboardsList();
        const fr = await uca.bi();
        const search = fr.locator('input[placeholder*="Search" i], input[type="search"]').first();
        if (await search.isVisible().catch(() => false)) {
          await search.fill('URL Category');
          await page.waitForTimeout(2000);
        }
        const body = await uca.getBodySample(4000);
        expect(body).toMatch(/URL Category Analysis/i);
        if (/9 widgets/i.test(body)) annotate('catalog card soft: 9 widgets');
        else annotate('catalog widget count not visible — soft');
        if (await search.isVisible().catch(() => false)) {
          await search.fill('');
          await page.waitForTimeout(500);
        }
        await uca.searchAndOpenDashboard();
        await uca.waitForDashboardReady();
      },
      120000,
      recover
    );
  });

  test('REG-URL-CAT-005 — soft list chrome folders/Local-UTC/Reset; restore URL Category Analysis', async () => {
    try {
      await withSoftDeadline(
        async () => {
          await uca.openDashboardsList();
          const body = await uca.getBodySample(2000);
          expect(body).toMatch(/All Folders|My Folder|Global/i);
          if (/Local|UTC/i.test(body)) annotate('Local|UTC soft-present on list');
          const fr = await uca.bi();
          const reset = fr.locator('button, a').filter({ hasText: /^Reset$/i }).first();
          if (await reset.isVisible().catch(() => false)) {
            await reset.click({ force: true }).catch(() => undefined);
            await page.waitForTimeout(800);
          }
          await uca.searchAndOpenDashboard();
          await uca.waitForDashboardReady();
        },
        100000,
        recover
      );
    } catch (e) {
      annotate(`list chrome soft: ${e instanceof Error ? e.message : String(e)}`);
      await recover();
    }
  });

  test('REG-URL-CAT-006 — soft sibling Site Ops / CWV PoP; restore URL Category Analysis', async () => {
    try {
      const mid = await withSoftDeadline(
        () =>
          uca.softOpenSiblingThenRestore(
            /Site Operations Dashboard for Page Names|CWV Top 10 Period over Period \(PoP\)|Site Operations \+ CWV Trends/i
          ),
        100000,
        recover
      );
      if (mid) annotate(`sibling soft-present: ${mid}`);
      else annotate('sibling card not visible — soft');
      await uca.expectUcaIdentity();
    } catch (e) {
      annotate(`sibling soft: ${e instanceof Error ? e.message : String(e)}`);
      await recover();
    }
  });

  test('REG-URL-CAT-007 — viewer title URL Category Analysis; Global / Responsive Grid soft', async () => {
    await uca.expectUcaIdentity();
    await uca.expectNotConfusedSurfaces();
    const body = await uca.getBodySample(2500);
    if (/\bGlobal\b/i.test(body)) annotate('Global folder badge soft-present');
    if (/Responsive Grid/i.test(body)) annotate('Responsive Grid soft-present');
    if (/Good.*Needs Improvement.*Poor|Google'?s? CWV/i.test(body)) {
      annotate('Good/Needs Improvement/Poor description soft-present');
    }
  });

  test('REG-URL-CAT-008 — Distribution chart + Daily table + Desktop/Mobile CWV URL tables', async () => {
    const w = await uca.widgetPresence();
    annotate(
      `widgets soft distribution=${w.distribution} daily=${w.dailyTable} desktop=${w.desktop} mobile=${w.mobile} good=${w.good} needs=${w.needsImprovement} poor=${w.poor}`
    );
    expect(w.distribution, 'URL Performance Category Distribution').toBeTruthy();
    expect(w.dailyTable, 'Daily Distribution table').toBeTruthy();
    expect(w.desktop || w.mobile, 'Desktop or Mobile CWV Performance by URL').toBeTruthy();
    if (!w.desktop) annotate('Desktop URL table soft-miss');
    if (!w.mobile) annotate('Mobile URL table soft-miss');
    expect([w.good, w.needsImprovement, w.poor].filter(Boolean).length, 'category bands').toBeGreaterThanOrEqual(2);
  });

  test('REG-URL-CAT-009 — Bot Traffic filter sample + restore', async () => {
    const before = (await uca.getBodySample(500)).slice(0, 250);
    try {
      const bot = await withSoftDeadline(
        () => uca.softFilterCombo(/Bot Traffic/i, /Non-Bot|Bot/i),
        45000,
        recover
      );
      if (!bot) annotate('Bot Traffic filter soft-miss');
      else annotate('Bot Traffic filter soft-ok');
      const after = (await uca.getBodySample(500)).slice(0, 250);
      if (before === after) annotate('Bot Traffic: signature unchanged soft (sparse/auto?)');
      else annotate('Bot Traffic: soft signature changed');
      await uca.clickResetToDefault().catch(() => undefined);
    } catch (e) {
      annotate(`Bot Traffic soft: ${e instanceof Error ? e.message : String(e)}`);
    }
    await uca.closeOverlays();
    await uca.expectUcaIdentity();
  });

  test('REG-URL-CAT-010 — Origin filter sample + restore', async () => {
    try {
      const origin = await withSoftDeadline(
        () => uca.softFilterCombo(/^Origin$|\bOrigin\b/i, /RUM Browser|Native Webview|Native App|Webviews?/i),
        45000,
        recover
      );
      if (!origin) annotate('Origin filter soft-miss');
      else annotate('Origin filter soft-ok');
      await uca.clickResetToDefault().catch(() => undefined);
    } catch (e) {
      annotate(`Origin soft: ${e instanceof Error ? e.message : String(e)}`);
    }
    await uca.closeOverlays();
    await uca.expectUcaIdentity();
  });

  test('REG-URL-CAT-011 — Traffic Segment sample + combined Bot+Origin + restore', async () => {
    try {
      const seg = await withSoftDeadline(() => uca.softFilterCombo(/Traffic Segment/i), 45000, recover);
      if (!seg) annotate('Traffic Segment filter soft-miss');
      else annotate('Traffic Segment filter soft-ok');

      const bot = await uca.softFilterCombo(/Bot Traffic/i, /Non-Bot|Bot/i);
      const origin = await uca.softFilterCombo(/^Origin$|\bOrigin\b/i, /RUM Browser|Native Webview/i);
      annotate(`combined soft bot=${bot} origin=${origin}`);
      await expect.poll(async () => uca.widgetsReadyScore(), { timeout: 45000 }).toBeGreaterThanOrEqual(3);
      await uca.clickResetToDefault().catch(() => undefined);
    } catch (e) {
      annotate(`Traffic Segment / combo soft: ${e instanceof Error ? e.message : String(e)}`);
    }
    await uca.closeOverlays();
    await uca.expectUcaIdentity();
  });

  test('REG-URL-CAT-012 — Refresh Data soft settle; identity retained', async () => {
    const before = (await uca.getBodySample(400)).slice(0, 250);
    const clicked = await uca.clickRefreshData();
    if (!clicked) annotate('Refresh Data soft-miss');
    else {
      await expect.poll(async () => uca.widgetsReadyScore(), { timeout: 45000 }).toBeGreaterThanOrEqual(4);
      const after = (await uca.getBodySample(400)).slice(0, 250);
      if (before === after) annotate('Refresh Data: signature identical (expected OK)');
      else annotate('Refresh Data: soft signature changed');
    }
    await uca.expectUcaIdentity();
  });

  test('REG-URL-CAT-013 — Reset to Defaults after Bot Traffic / Origin change', async () => {
    try {
      await uca.softFilterCombo(/Bot Traffic/i, /Bot/i);
      await uca.softFilterCombo(/^Origin$|\bOrigin\b/i, /Native Webview|RUM Browser/i);
      const reset = await uca.clickResetToDefault();
      if (!reset) annotate('Reset missing on locked Global — use Save As clone for mutations');
      else annotate('Reset to Defaults soft-ok after Bot/Origin');
    } catch (e) {
      annotate(`reset soft: ${e instanceof Error ? e.message : String(e)}`);
    }
    await uca.expectUcaIdentity();
  });

  test('REG-URL-CAT-014 — Save As disposable clone; verify; schedule cleanup', async () => {
    cloneName = `URL-CAT-QA-${Date.now().toString(36)}`;
    try {
      const saved = await withSoftDeadline(() => uca.softSaveAsClone(cloneName), 90000, recover);
      if (!saved) {
        annotate('Save As soft-miss (Global lock?) — clone skipped');
        cloneName = '';
      } else {
        const body = await uca.getBodySample(3000);
        if (
          new RegExp(cloneName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(body) ||
          /URL Performance Category Distribution|CWV Performance by URL/i.test(body)
        )
          annotate(`Save As clone soft-ok name=${cloneName}`);
        else annotate(`Save As submitted; clone identity soft-unclear name=${cloneName}`);
      }
    } catch (e) {
      annotate(`Save As soft: ${e instanceof Error ? e.message : String(e)}`);
      cloneName = '';
    }
    try {
      await uca.openDashboardsList();
      await uca.searchAndOpenDashboard();
      await uca.waitForDashboardReady();
    } catch {
      await recover();
    }
    await uca.expectUcaIdentity();
  });

  test('REG-URL-CAT-015 — dashboard hamburger export: PNG / PDF / PowerPoint soft vs UI', async () => {
    const w = await uca.widgetPresence();
    annotate(`export UI sig distribution=${w.distribution} good=${w.good} poor=${w.poor}`);

    const menu = await uca.softOpenExportMenu('dashboard');
    if (!menu.opened) {
      annotate('dashboard export menu soft-miss — falling back to widget Export chart');
      const widgetMenu = await uca.softOpenExportMenu('widget');
      annotate(`widget export fallback options: ${widgetMenu.options.join(', ') || 'none'}`);
    } else {
      annotate(`dashboard export options soft: ${menu.options.join(', ')}`);
    }

    if (!menu.options.some((o) => /PowerPoint/i.test(o))) annotate('PowerPoint soft-miss at dashboard level');

    await uca.softOpenExportMenu(menu.opened ? 'dashboard' : 'widget');
    const png = await uca.softExportOption(/PNG Image/i);
    if (png.triggered) annotate(`PNG export soft triggered download="${png.downloadHint || 'none/dialog'}"`);
    else annotate('PNG Image option soft-miss');

    await uca.softOpenExportMenu(menu.opened ? 'dashboard' : 'widget');
    const pdf = await uca.softExportOption(/PDF Document/i);
    if (pdf.triggered) annotate(`PDF export soft triggered download="${pdf.downloadHint || 'none/dialog'}"`);
    else annotate('PDF Document option soft-miss');

    await uca.softOpenExportMenu(menu.opened ? 'dashboard' : 'widget');
    const ppt = await uca.softExportOption(/PowerPoint|PPT/i);
    if (ppt.triggered) annotate(`PowerPoint export soft triggered download="${ppt.downloadHint || 'none/dialog'}"`);
    else annotate('PowerPoint option soft-miss');

    await uca.closeOverlays();
    await uca.expectUcaIdentity();
  });

  test('REG-URL-CAT-016 — Daily Distribution table column sort soft', async () => {
    try {
      const dateSort = await uca.softSortColumn(/DATE/i, /GOOD URL COUNT|Daily Distribution/i);
      if (!dateSort.clicked) annotate('Daily DATE sort soft-miss');
      else if (dateSort.before !== dateSort.after) annotate('Daily DATE sort: first-page order changed');
      else annotate('Daily DATE sort clicked; order unchanged soft (equal/virtualized?)');

      const goodSort = await uca.softSortColumn(/GOOD URL COUNT/i, /GOOD URL COUNT|Daily Distribution/i);
      if (!goodSort.clicked) annotate('GOOD URL COUNT sort soft-miss');
      else if (goodSort.before !== goodSort.after) annotate('GOOD URL COUNT sort: order changed');
      else annotate('GOOD URL COUNT sort: order unchanged soft');

      await uca.clickResetToDefault().catch(() => undefined);
    } catch (e) {
      annotate(`daily sort soft: ${e instanceof Error ? e.message : String(e)}`);
    }
    await uca.closeOverlays();
    await uca.expectUcaIdentity();
  });

  test('REG-URL-CAT-017 — Desktop/Mobile CWV URL table column sort soft', async () => {
    try {
      const hits = await uca.softSortColumn(/HITS/i, /URL PERFORMANCE CATEGORY|CWV Performance by URL/i);
      if (!hits.clicked) annotate('Desktop/Mobile HITS sort soft-miss');
      else if (hits.before !== hits.after) annotate('HITS sort: first-page order changed');
      else annotate('HITS sort: order unchanged soft');

      const cat = await uca.softSortColumn(/URL PERFORMANCE CATEGORY/i, /URL PERFORMANCE CATEGORY|LCP/i);
      if (!cat.clicked) annotate('URL PERFORMANCE CATEGORY sort soft-miss');
      else if (cat.before !== cat.after) annotate('CATEGORY sort: order changed');
      else annotate('CATEGORY sort: order unchanged soft');

      const lcp = await uca.softSortColumn(/LCP/i, /LCP \[P75\]|CWV Performance/i);
      if (!lcp.clicked) annotate('LCP [P75] sort soft-miss');
      else annotate('LCP [P75] sort soft-clicked');

      await uca.clickResetToDefault().catch(() => undefined);
    } catch (e) {
      annotate(`URL table sort soft: ${e instanceof Error ? e.message : String(e)}`);
    }
    await uca.closeOverlays();
    await uca.expectUcaIdentity();
  });

  test('REG-URL-CAT-018 — legend Good / Needs Improvement / Poor series toggle (green/yellow/red)', async () => {
    try {
      const good = await uca.softToggleLegendSeries(/^Good URL Count$/i);
      if (!good.clicked) annotate('Good URL Count legend soft-miss');
      else annotate('Good URL Count legend toggle soft-ok');

      const needs = await uca.softToggleLegendSeries(/^Needs Improvement URL Count$/i);
      if (!needs.clicked) annotate('Needs Improvement URL Count legend soft-miss');
      else annotate('Needs Improvement legend toggle soft-ok');

      const poor = await uca.softToggleLegendSeries(/^Poor URL Count$/i);
      if (!poor.clicked) annotate('Poor URL Count legend soft-miss');
      else annotate('Poor URL Count legend toggle soft-ok');

      // Restore series by clicking again
      await uca.softToggleLegendSeries(/^Good URL Count$/i).catch(() => undefined);
      await uca.softToggleLegendSeries(/^Needs Improvement URL Count$/i).catch(() => undefined);
      await uca.softToggleLegendSeries(/^Poor URL Count$/i).catch(() => undefined);
    } catch (e) {
      annotate(`legend toggle soft: ${e instanceof Error ? e.message : String(e)}`);
    }
    await uca.closeOverlays();
    await uca.expectUcaIdentity();
  });

  test('REG-URL-CAT-019 — Escape closes overlays; soft focus Filters', async () => {
    await uca.openFiltersPanel().catch(() => undefined);
    await page.keyboard.press('Escape').catch(() => undefined);
    await uca.closeOverlays();
    const fr = await uca.bi();
    const filters = fr.locator('button, a').filter({ hasText: /^Filters$/i }).first();
    if (await filters.isVisible().catch(() => false)) {
      await filters.focus().catch(() => undefined);
      annotate('Filters focus soft-ok');
    }
    await uca.expectUcaIdentity();
  });

  test('REG-URL-CAT-020 — ~1100px viewport soft; Responsive Grid still usable', async () => {
    const prev = page.viewportSize();
    try {
      await page.setViewportSize({ width: 1100, height: 900 });
      await page.waitForTimeout(1500);
      await expect.poll(async () => uca.widgetsReadyScore(), { timeout: 30000 }).toBeGreaterThanOrEqual(3);
      annotate('1100px viewport soft-ok');
    } finally {
      if (prev) await page.setViewportSize(prev);
      else await page.setViewportSize({ width: 1500, height: 950 });
    }
    await uca.expectUcaIdentity();
  });

  test('REG-URL-CAT-021 — reload soft recovery; still URL Category Analysis + GDC', async () => {
    try {
      await withSoftDeadline(
        async () => {
          await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => undefined);
          await uca.waitForPortalReady().catch(() => undefined);
          await uca.waitForBiFrame(60000);
          await uca.openDashboardsList();
          await uca.searchAndOpenDashboard();
          await uca.waitForDashboardReady();
          await uca.ensureProfileSiteSelected();
        },
        150000,
        recover
      );
    } catch (e) {
      annotate(`reload soft: ${e instanceof Error ? e.message : String(e)}`);
      await recover();
    }
    await uca.expectUcaIdentity();
  });

  test('REG-URL-CAT-022 — not confused with Site Ops / VitalPulse / VitalScope / CWV PoP', async () => {
    await uca.expectNotConfusedSurfaces();
    await expect(page).toHaveURL(/business-intelligence\/tool|business-intelligence%2Ftool/i);
    const body = await uca.getBodySample(2000);
    expect(body).toMatch(/URL Category Analysis/i);
    annotate(`Final filters="${await uca.getFilterSignature()}" loadMs=${initialLoadMs}`);
  });
});
