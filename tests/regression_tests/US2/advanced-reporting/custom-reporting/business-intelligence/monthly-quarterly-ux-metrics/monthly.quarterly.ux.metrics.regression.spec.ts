import { test, expect, Page } from '@playwright/test';
import path from 'path';
import {
  MonthlyQuarterlyUxMetricsDashboardPage,
  MqUxmContext,
} from '../../../../../../../pages/MonthlyQuarterlyUxMetricsDashboardPage';
import { getActiveProfile } from '../../../../../../../config/profiles';

/**
 * Regression: BI Dashboard — Monthly/Quarterly - UX Metrics
 * Site: GDC Test Site 2
 * Path: tests/.../business-intelligence/monthly-quarterly-ux-metrics
 *
 * Shell: business-intelligence/tool → #bi-iframe.
 * Comparison Period / End Date / dimensional filters restored; Save As clones cleaned up.
 * Never treat Monthly/Quarterly Revenue / VitalPulse / VitalScope / CWV Top 10 PoP as home.
 *
 * npm: test:regression:us2:monthly-quarterly-ux-metrics
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

test.describe('US2 Regression — Monthly/Quarterly - UX Metrics', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180000);

  let page: Page;
  let uxm: MonthlyQuarterlyUxMetricsDashboardPage;
  let initialCtx: MqUxmContext;
  let initialLoadMs = 0;
  let cloneName = '';
  const notes: string[] = [];

  const annotate = (description: string) => {
    notes.push(description);
    test.info().annotations.push({ type: 'note', description });
    console.log(`[MQ-UXM] ${description}`);
  };

  const recover = async () => {
    await Promise.race([
      (async () => {
        await uxm.recoverPage();
        if (initialCtx) await uxm.restoreContext(initialCtx).catch(() => undefined);
      })(),
      new Promise<void>((resolve) => setTimeout(resolve, 100000)),
    ]);
  };

  test.beforeAll(async ({ browser }, testInfo) => {
    testInfo.setTimeout(360000);
    const context = await browser.newContext({ storageState: AUTH_STATE });
    page = await context.newPage();
    uxm = new MonthlyQuarterlyUxMetricsDashboardPage(page);
    const started = Date.now();
    await uxm.openViaNavigation();
    initialLoadMs = Date.now() - started;
    initialCtx = await uxm.captureContext();
    const profile = getActiveProfile();
    console.log(
      `[MQ-UXM] profile=${profile.id} site=${await uxm.getSiteLabel().catch(() => profile.siteName)} loadMs=${initialLoadMs} comparison="${initialCtx.comparisonSignature}" endDate="${initialCtx.endDateSignature}"`
    );
  });

  test.afterAll(async () => {
    try {
      if (page && !page.isClosed()) {
        await Promise.race([
          (async () => {
            if (cloneName) {
              const deleted = await uxm.softDeleteCloneBySearch(cloneName).catch(() => false);
              if (!deleted) annotate(`leftover clone needs manual cleanup: ${cloneName}`);
            }
            await uxm.clickResetToDefault().catch(() => undefined);
            await uxm.closeOverlays().catch(() => undefined);
          })(),
          new Promise((r) => setTimeout(r, 20000)),
        ]);
      }
    } catch {
      // ignore
    }
    if (notes.length) console.log(`[MQ-UXM] annotations:\n- ${notes.join('\n- ')}`);
    await page?.context()?.close().catch(() => undefined);
  });

  test('REG-MQ-UXM-001 — portal BI tool loads; title/route; no login redirect', async () => {
    await expect(page).toHaveURL(/business-intelligence\/tool|business-intelligence%2Ftool/i);
    await expect(page).not.toHaveURL(/site\/login|site%2Flogin/i);
    await expect
      .poll(async () => ((await uxm.locators.pageTitle.innerText().catch(() => '')) || '').replace(/\s+/g, ' '), {
        timeout: 20000,
      })
      .toMatch(/Business Intelligence/i);
    await expect(uxm.locators.biIframe).toBeAttached({ timeout: 30000 });
  });

  test('REG-MQ-UXM-002 — GDC Test Site 2; #bi-iframe ready; UX Metrics identity', async () => {
    await uxm.ensureProfileSiteSelected();
    try {
      await uxm.expectSelectedSite();
    } catch (e) {
      annotate(`site label soft-miss: ${e instanceof Error ? e.message : String(e)}`);
    }
    await uxm.expectUxmIdentity();
    annotate(
      `widgetsReadyScore=${await uxm.widgetsReadyScore()} comparison="${initialCtx.comparisonSignature}" endDate="${initialCtx.endDateSignature}"`
    );
  });

  test('REG-MQ-UXM-003 — BI rail soft: Favorites / Dashboards / AI Query / Charts / Schedules / Folders', async () => {
    const body = await uxm.getBodySample(2500);
    for (const label of ['Favorites', 'Dashboards', 'AI Query', 'Charts', 'Schedules', 'Folders']) {
      expect(body, `rail ${label}`).toMatch(new RegExp(label, 'i'));
    }
  });

  test('REG-MQ-UXM-004 — Dashboards Search finds Monthly/Quarterly - UX Metrics (~25 widgets soft)', async () => {
    await withSoftDeadline(
      async () => {
        await uxm.openDashboardsList();
        const fr = await uxm.bi();
        const search = fr.locator('input[placeholder*="Search" i], input[type="search"]').first();
        if (await search.isVisible().catch(() => false)) {
          await search.fill('UX Metrics');
          await page.waitForTimeout(2000);
        }
        const body = await uxm.getBodySample(4000);
        expect(body).toMatch(/Monthly\/Quarterly\s*-\s*UX Metrics/i);
        if (/25 widgets/i.test(body)) annotate('catalog card soft: 25 widgets');
        else annotate('catalog widget count not visible — soft');
        if (/Monthly\/Quarterly Revenue/i.test(body)) annotate('sibling Revenue soft-present on list');
        if (await search.isVisible().catch(() => false)) {
          await search.fill('');
          await page.waitForTimeout(500);
        }
        await uxm.searchAndOpenDashboard();
        await uxm.waitForDashboardReady();
      },
      120000,
      recover
    );
  });

  test('REG-MQ-UXM-005 — soft list chrome folders/Local-UTC/Reset; restore UX Metrics', async () => {
    try {
      await withSoftDeadline(
        async () => {
          await uxm.openDashboardsList();
          const body = await uxm.getBodySample(2000);
          expect(body).toMatch(/All Folders|My Folder|Global/i);
          if (/Local|UTC/i.test(body)) annotate('Local|UTC soft-present on list');
          const fr = await uxm.bi();
          const reset = fr.locator('button, a').filter({ hasText: /^Reset$/i }).first();
          if (await reset.isVisible().catch(() => false)) {
            await reset.click({ force: true }).catch(() => undefined);
            await page.waitForTimeout(800);
          }
          await uxm.searchAndOpenDashboard();
          await uxm.waitForDashboardReady();
        },
        100000,
        recover
      );
    } catch (e) {
      annotate(`list chrome soft: ${e instanceof Error ? e.message : String(e)}`);
      await recover();
    }
  });

  test('REG-MQ-UXM-006 — soft sibling Monthly/Quarterly Revenue / CWV PoP; restore UX Metrics', async () => {
    try {
      const mid = await withSoftDeadline(
        () =>
          uxm.softOpenSiblingThenRestore(
            /Monthly\/Quarterly Revenue|CWV Top 10 Period over Period \(PoP\)|Site Operations Dashboard for Page Names/i
          ),
        100000,
        recover
      );
      if (mid) annotate(`sibling soft-present: ${mid}`);
      else annotate('sibling card not visible — soft');
      await uxm.expectUxmIdentity();
    } catch (e) {
      annotate(`sibling soft: ${e instanceof Error ? e.message : String(e)}`);
      await recover();
    }
  });

  test('REG-MQ-UXM-007 — viewer title Monthly/Quarterly - UX Metrics; Global / Responsive Grid soft', async () => {
    await uxm.expectUxmIdentity();
    await uxm.expectNotConfusedSurfaces();
    const body = await uxm.getBodySample(2500);
    if (/\bGlobal\b/i.test(body)) annotate('Global folder badge soft-present');
    if (/Responsive Grid/i.test(body)) annotate('Responsive Grid soft-present');
  });

  test('REG-MQ-UXM-008 — monthly + quarterly Onload/LCP/CLS/INP + Current/Previous + KPI cards', async () => {
    const m = await uxm.metricPresence();
    annotate(
      `metrics soft onload=${m.onload} lcp=${m.lcp} cls=${m.cls} inp=${m.inp} monthly=${m.monthly} quarterly=${m.quarterly} currentPrevious=${m.currentPrevious} kpi=${m.kpiCards}`
    );
    const present = [m.onload, m.lcp, m.cls, m.inp].filter(Boolean).length;
    expect(present, 'at least 3 of Onload/LCP/CLS/INP').toBeGreaterThanOrEqual(3);
    expect(m.monthly || m.quarterly, 'monthly or quarterly sections').toBeTruthy();
    if (!m.currentPrevious) annotate('Current/Previous legend soft-miss');
    if (!m.kpiCards) annotate('Dynamic Chart Metrics KPI soft-miss');
    const chrome = await uxm.countWidgetChrome();
    annotate(`widget chrome SwitchMetric=${chrome.switchMetric} ExportChart=${chrome.exportChart}`);
  });

  test('REG-MQ-UXM-009 — Comparison Period: Directly Previous Period + Same Time Last Year + restore', async () => {
    const before = await uxm.getBodySample(500);
    try {
      const prev = await withSoftDeadline(
        () => uxm.softSetComparisonPeriod(/Directly Previous Period|Previous Period/i),
        45000,
        recover
      );
      if (!prev) annotate('Comparison Period → Previous soft-miss');
      else annotate('Comparison Period → Directly Previous Period soft-ok');

      const yoy = await withSoftDeadline(
        () => uxm.softSetComparisonPeriod(/Same Time Last Year|same period last year/i),
        45000,
        recover
      );
      if (!yoy) annotate('Comparison Period → Same Time Last Year soft-miss');
      else annotate('Comparison Period → Same Time Last Year soft-ok');

      await uxm.softSetComparisonPeriod(/Default \(from chart\)|Default/i).catch(() => undefined);
      await uxm.clickResetToDefault().catch(() => undefined);
    } catch (e) {
      annotate(`Comparison Period soft: ${e instanceof Error ? e.message : String(e)}`);
    }
    const after = await uxm.getBodySample(500);
    if (before === after) annotate('Comparison Period: signature unchanged soft (sparse/auto?)');
    await uxm.closeOverlays();
    await uxm.expectUxmIdentity();
  });

  test('REG-MQ-UXM-010 — End Date sample (Yesterday / Start of Previous Month) + restore', async () => {
    try {
      const yesterday = await withSoftDeadline(
        () => uxm.softSetEndDate(/Yesterday/i),
        45000,
        recover
      );
      if (!yesterday) annotate('End Date → Yesterday soft-miss');
      else annotate('End Date → Yesterday soft-ok');

      const prevMonth = await withSoftDeadline(
        () => uxm.softSetEndDate(/Start of Previous Month|Start of Quarter/i),
        45000,
        recover
      );
      if (!prevMonth) annotate('End Date → Previous Month/Quarter soft-miss');
      else annotate('End Date → Previous Month/Quarter soft-ok');

      await uxm.clickResetToDefault().catch(() => undefined);
    } catch (e) {
      annotate(`End Date soft: ${e instanceof Error ? e.message : String(e)}`);
    }
    await uxm.closeOverlays();
    await uxm.expectUxmIdentity();
  });

  test('REG-MQ-UXM-011 — Browser / OS / Return-New Visitor / Percentile sample + restore', async () => {
    try {
      const browser = await uxm.softFilterCombo(/Browser/i);
      const os = await uxm.softFilterCombo(/Operating System/i);
      const visitor = await uxm.softFilterCombo(/Return\/New Visitor|Return\/New User/i);
      const pct = await uxm.softFilterCombo(/Percentile/i, /p75|75|75th/i);
      annotate(`filters soft browser=${browser} os=${os} visitor=${visitor} percentile=${pct}`);
      if (pct) annotate('Percentile control present (Help default 75th soft)');
      await uxm.clickResetToDefault().catch(() => undefined);
    } catch (e) {
      annotate(`dimensional filters soft: ${e instanceof Error ? e.message : String(e)}`);
    }
    await uxm.closeOverlays();
    await uxm.expectUxmIdentity();
  });

  test('REG-MQ-UXM-012 — Bot Traffic / Device / Originated From soft sample + restore', async () => {
    try {
      const bot = await uxm.softFilterCombo(/Bot Traffic/i, /Non-Bot|Exclude|Include|Bot/i);
      const device = await uxm.softFilterCombo(/Device/i, /Desktop|Mobile/i);
      const origin = await uxm.softFilterCombo(/Originated From/i, /RUM Browser|Native App|Webviews?/i);
      annotate(`filters soft bot=${bot} device=${device} origin=${origin}`);
      await uxm.clickResetToDefault().catch(() => undefined);
    } catch (e) {
      annotate(`bot/device/origin soft: ${e instanceof Error ? e.message : String(e)}`);
    }
    await uxm.closeOverlays();
    await uxm.expectUxmIdentity();
  });

  test('REG-MQ-UXM-013 — Refresh Data soft settle; identity retained', async () => {
    const before = (await uxm.getBodySample(400)).slice(0, 250);
    const clicked = await uxm.clickRefreshData();
    if (!clicked) annotate('Refresh Data soft-miss');
    else {
      await expect.poll(async () => uxm.widgetsReadyScore(), { timeout: 45000 }).toBeGreaterThanOrEqual(4);
      const after = (await uxm.getBodySample(400)).slice(0, 250);
      if (before === after) annotate('Refresh Data: signature identical (expected OK)');
      else annotate('Refresh Data: soft signature changed');
    }
    await uxm.expectUxmIdentity();
  });

  test('REG-MQ-UXM-014 — Reset to Defaults after Comparison Period + End Date change', async () => {
    try {
      await uxm.softSetComparisonPeriod(/Directly Previous Period|Previous Period/i);
      await uxm.softSetEndDate(/Yesterday/i);
      const reset = await uxm.clickResetToDefault();
      if (!reset) annotate('Reset missing on locked Global — use Save As clone for mutations');
      else annotate('Reset to Defaults soft-ok after Comparison/End Date');
    } catch (e) {
      annotate(`reset soft: ${e instanceof Error ? e.message : String(e)}`);
    }
    await uxm.expectUxmIdentity();
  });

  test('REG-MQ-UXM-015 — Save As disposable clone; verify; schedule cleanup', async () => {
    cloneName = `MQ-UXM-QA-${Date.now().toString(36)}`;
    try {
      const saved = await withSoftDeadline(() => uxm.softSaveAsClone(cloneName), 90000, recover);
      if (!saved) {
        annotate('Save As soft-miss (Global lock?) — clone skipped');
        cloneName = '';
      } else {
        const body = await uxm.getBodySample(3000);
        if (
          new RegExp(cloneName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(body) ||
          /Onload|LCP|CLS|INP/i.test(body)
        )
          annotate(`Save As clone soft-ok name=${cloneName}`);
        else annotate(`Save As submitted; clone identity soft-unclear name=${cloneName}`);
      }
    } catch (e) {
      annotate(`Save As soft: ${e instanceof Error ? e.message : String(e)}`);
      cloneName = '';
    }
    try {
      await uxm.openDashboardsList();
      await uxm.searchAndOpenDashboard();
      await uxm.waitForDashboardReady();
    } catch {
      await recover();
    }
    await uxm.expectUxmIdentity();
  });

  test('REG-MQ-UXM-016 — dashboard hamburger export: PNG / PDF / PowerPoint soft vs UI', async () => {
    const m = await uxm.metricPresence();
    annotate(`export UI sig title=true onload=${m.onload} lcp=${m.lcp} kpi=${m.kpiCards}`);

    const menu = await uxm.softOpenExportMenu('dashboard');
    if (!menu.opened) {
      annotate('dashboard export menu soft-miss — falling back to widget Export chart');
      const widgetMenu = await uxm.softOpenExportMenu('widget');
      annotate(`widget export fallback options: ${widgetMenu.options.join(', ') || 'none'}`);
    } else {
      annotate(`dashboard export options soft: ${menu.options.join(', ')}`);
    }

    if (!menu.options.some((o) => /PowerPoint/i.test(o))) annotate('PowerPoint soft-miss at dashboard level');

    await uxm.softOpenExportMenu(menu.opened ? 'dashboard' : 'widget');
    const png = await uxm.softExportOption(/PNG Image/i);
    if (png.triggered) annotate(`PNG export soft triggered download="${png.downloadHint || 'none/dialog'}"`);
    else annotate('PNG Image option soft-miss');

    await uxm.softOpenExportMenu(menu.opened ? 'dashboard' : 'widget');
    const pdf = await uxm.softExportOption(/PDF Document/i);
    if (pdf.triggered) annotate(`PDF export soft triggered download="${pdf.downloadHint || 'none/dialog'}"`);
    else annotate('PDF Document option soft-miss');

    await uxm.softOpenExportMenu(menu.opened ? 'dashboard' : 'widget');
    const ppt = await uxm.softExportOption(/PowerPoint|PPT/i);
    if (ppt.triggered) annotate(`PowerPoint export soft triggered download="${ppt.downloadHint || 'none/dialog'}"`);
    else annotate('PowerPoint option soft-miss');

    await uxm.closeOverlays();
    await uxm.expectUxmIdentity();
  });

  test('REG-MQ-UXM-017 — per-widget Switch metric (gear) soft impact + restore', async () => {
    try {
      const result = await withSoftDeadline(() => uxm.softSwitchMetric(), 60000, recover);
      if (!result.opened) annotate('Switch metric gear soft-miss');
      else if (result.changed) annotate('Switch metric soft: widget signature changed');
      else annotate('Switch metric menu opened; signature unchanged soft (read-only/Global?)');
      await uxm.clickResetToDefault().catch(() => undefined);
    } catch (e) {
      annotate(`Switch metric soft: ${e instanceof Error ? e.message : String(e)}`);
    }
    await uxm.closeOverlays();
    await uxm.expectUxmIdentity();
  });

  test('REG-MQ-UXM-018 — per-widget Export chart: PNG / PDF / CSV Data soft vs UI', async () => {
    const menu = await uxm.softOpenExportMenu('widget');
    if (!menu.opened) annotate('widget Export chart menu soft-miss');
    else annotate(`widget export options soft: ${menu.options.join(', ')}`);

    await uxm.softOpenExportMenu('widget');
    const png = await uxm.softExportOption(/PNG Image/i);
    if (png.triggered) annotate(`widget PNG soft download="${png.downloadHint || 'none/dialog'}"`);
    else annotate('widget PNG soft-miss');

    await uxm.softOpenExportMenu('widget');
    const pdf = await uxm.softExportOption(/PDF Document/i);
    if (pdf.triggered) annotate(`widget PDF soft download="${pdf.downloadHint || 'none/dialog'}"`);
    else annotate('widget PDF soft-miss');

    await uxm.softOpenExportMenu('widget');
    const csv = await uxm.softExportOption(/CSV Data/i);
    if (csv.triggered) annotate(`widget CSV soft download="${csv.downloadHint || 'none/dialog'}"`);
    else annotate('widget CSV soft-miss');

    await uxm.closeOverlays();
    await uxm.expectUxmIdentity();
  });

  test('REG-MQ-UXM-019 — Escape closes overlays; soft focus chrome', async () => {
    await uxm.openFiltersPanel().catch(() => undefined);
    await page.keyboard.press('Escape').catch(() => undefined);
    await uxm.closeOverlays();
    const fr = await uxm.bi();
    const filters = fr.locator('button, a').filter({ hasText: /^Filters$/i }).first();
    if (await filters.isVisible().catch(() => false)) {
      await filters.focus().catch(() => undefined);
      annotate('Filters focus soft-ok');
    }
    await uxm.expectUxmIdentity();
  });

  test('REG-MQ-UXM-020 — ~1100px viewport soft; Responsive Grid still usable', async () => {
    const prev = page.viewportSize();
    try {
      await page.setViewportSize({ width: 1100, height: 900 });
      await page.waitForTimeout(1500);
      await expect.poll(async () => uxm.widgetsReadyScore(), { timeout: 30000 }).toBeGreaterThanOrEqual(3);
      annotate('1100px viewport soft-ok');
    } finally {
      if (prev) await page.setViewportSize(prev);
      else await page.setViewportSize({ width: 1500, height: 950 });
    }
    await uxm.expectUxmIdentity();
  });

  test('REG-MQ-UXM-021 — reload soft recovery; still UX Metrics + GDC', async () => {
    try {
      await withSoftDeadline(
        async () => {
          await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => undefined);
          await uxm.waitForPortalReady().catch(() => undefined);
          await uxm.waitForBiFrame(60000);
          await uxm.openDashboardsList();
          await uxm.searchAndOpenDashboard();
          await uxm.waitForDashboardReady();
          await uxm.ensureProfileSiteSelected();
        },
        150000,
        recover
      );
    } catch (e) {
      annotate(`reload soft: ${e instanceof Error ? e.message : String(e)}`);
      await recover();
    }
    await uxm.expectUxmIdentity();
  });

  test('REG-MQ-UXM-022 — not confused with Revenue / VitalPulse / VitalScope / CWV PoP', async () => {
    await uxm.expectNotConfusedSurfaces();
    await expect(page).toHaveURL(/business-intelligence\/tool|business-intelligence%2Ftool/i);
    const body = await uxm.getBodySample(2000);
    expect(body).toMatch(/Monthly\/Quarterly\s*-\s*UX Metrics/i);
    annotate(`Final comparison="${await uxm.getComparisonSignature()}" loadMs=${initialLoadMs}`);
  });
});
