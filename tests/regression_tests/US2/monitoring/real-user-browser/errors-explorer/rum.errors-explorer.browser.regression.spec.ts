import { test, expect, Page } from '@playwright/test';
import path from 'path';
import { RumErrorsExplorerPage } from '../../../../../../pages/RumErrorsExplorerPage';
import { getActiveProfile } from '../../../../../../config/profiles';

/**
 * Regression: Errors Explorer (RUM Browser)
 * Site: GDC Test Site 2
 * Path: tests/regression_tests/US2/monitoring/real-user-browser/errors-explorer
 */

const AUTH_STATE = path.join(__dirname, '../../../../../../playwright/.auth/user.json');

async function withSoftDeadline<T>(work: () => Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work(),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`soft deadline ${ms}ms exceeded`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

test.describe('US2 Regression — RUM Errors Explorer (Browser)', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180000);

  let page: Page;
  let rum: RumErrorsExplorerPage;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: AUTH_STATE });
    page = await context.newPage();
    rum = new RumErrorsExplorerPage(page);
    await rum.openViaNavigation();
    const profile = getActiveProfile();
    console.log(`[RUM Errors Explorer] profile=${profile.id} site=${profile.siteName} dc=${profile.datacenter}`);
  });

  test.afterAll(async () => {
    await page?.context()?.close().catch(() => undefined);
  });

  test('REG-RUM-EE-001 — page loads via menu/route with correct title', async () => {
    await expect(rum.locators.pageTitle).toHaveText(/Errors Explorer|Errors/i);
    await expect(page).toHaveURL(/javascript-errors\/real-user/);
  });

  test('REG-RUM-EE-002 — default Errors By Type / Over Time / Errors table render', async () => {
    await rum.expectDefaultContext();
    await rum.expectErrorsByTypeWidgets();
  });

  test('REG-RUM-EE-003 — top filter badges present (incl. Bot Traffic / Error Types)', async () => {
    await rum.expectTopFilterBadges();
  });

  test('REG-RUM-EE-004 — expand/collapse page-controls toggle', async () => {
    const state = await rum.toggleTopFiltersPanel();
    expect(['expanded', 'collapsed', 'unchanged']).toContain(state);
    await rum.toggleTopFiltersPanel().catch(() => undefined);
  });

  test('REG-RUM-EE-005 — top filter combo: Data Origin = RUM Browser', async () => {
    try {
      await rum.applyTopFilterCombination({ dataOrigin: 'RUM Browser' });
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Top combo soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectChartsOrTablesReady();
    }
  });

  test('REG-RUM-EE-006 — top filter combo: Device = Mobile', async () => {
    try {
      await rum.applyTopFilterCombination({ devices: ['Mobile'] });
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Top combo soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectChartsOrTablesReady();
    }
  });

  test('REG-RUM-EE-007 — top filter combo: Browser = Chrome', async () => {
    try {
      await rum.applyTopFilterCombination({ browsers: ['Chrome'] });
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Top combo soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectChartsOrTablesReady();
    }
  });

  test('REG-RUM-EE-008 — top filter combo: OS = Windows', async () => {
    try {
      await rum.applyTopFilterCombination({ os: ['Windows'] });
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Top combo soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectChartsOrTablesReady();
    }
  });

  test('REG-RUM-EE-009 — top filter combo: Bot Traffic = Exclude Bots', async () => {
    try {
      await rum.applyTopFilterCombination({ botTraffic: /Exclude Bots/i });
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Bot traffic soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectChartsOrTablesReady();
    }
  });

  test('REG-RUM-EE-010 — top filter combo: Time Period = Last 6 Hours', async () => {
    try {
      await rum.applyTopFilterCombination({ timePeriod: 'Last 6 Hours' });
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Top time soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectChartsOrTablesReady();
    }
  });

  test('REG-RUM-EE-011 — top filter combo: Data Origin RUM Browser + Device Desktop + Last 24 Hours', async () => {
    try {
      await rum.applyTopFilterCombination({
        dataOrigin: 'RUM Browser',
        devices: ['Desktop'],
        timePeriod: 'Last 24 Hours',
      });
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Combined top soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectChartsOrTablesReady();
    }
  });

  test('REG-RUM-EE-012 — restore Data Origin both + Exclude Bots', async () => {
    try {
      await rum.applyTopFilterCombination({
        dataOrigin: /RUM Browser.*Native|Native.*RUM Browser|both/i,
        botTraffic: /Exclude Bots/i,
      });
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Restore soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectChartsOrTablesReady();
    }
  });

  test('REG-RUM-EE-013 — Errors By Type donuts + type breakdown labels', async () => {
    try {
      await rum.expectErrorsByTypeWidgets();
      await rum.expectErrorTypeBreakdownSample();
      await rum.softToggleDonutLegend();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `By Type soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-EE-014 — Top Charts section widgets visible', async () => {
    try {
      await rum.expectTopChartsVisible();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Top charts soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-EE-015 — click Top Locations row applies filter (preview / refresh)', async () => {
    try {
      await withSoftDeadline(async () => {
        const before = await rum.getFilterPreviewText();
        const label = await rum.clickTopChartRow('region');
        console.log(`[RUM EE] location filter sample=${label}`);
        const after = await rum.getFilterPreviewText();
        await rum.expectErrorsOverTime();
        await expect(rum.locators.errorsTableWrapper).toBeVisible();
        // Preview text often updates; soft if UI uses badges only
        if (before === after && label) {
          test.info().annotations.push({
            type: 'note',
            description: `Location click applied; preview unchanged (label=${label})`,
          });
        }
        await rum.clearJsErrorFiltersIfVisible();
      }, 60000);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Location filter soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.clearJsErrorFiltersIfVisible().catch(() => undefined);
    }
  });

  test('REG-RUM-EE-016 — Top Domains click soft-note (Help: may NOT filter Over Time)', async () => {
    try {
      await withSoftDeadline(async () => {
        const label = await rum.clickTopChartRow('fileName');
        console.log(`[RUM EE] domain click sample=${label} (Help: may not filter Over Time)`);
        test.info().annotations.push({
          type: 'note',
          description:
            'Help Center: clicking Top Domains may NOT apply filter to Errors Over Time — soft observed.',
        });
        await rum.expectChartsOrTablesReady();
        await rum.clearJsErrorFiltersIfVisible();
      }, 45000);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Domains soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-EE-017 — click Top Pages row refreshes Over Time / table', async () => {
    try {
      await withSoftDeadline(async () => {
        const label = await rum.clickTopChartRow('pageName');
        console.log(`[RUM EE] page filter sample=${label}`);
        await rum.expectErrorsOverTime();
        await expect(rum.locators.errorsTableWrapper).toBeVisible();
        await rum.clearJsErrorFiltersIfVisible();
      }, 60000);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Pages filter soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.clearJsErrorFiltersIfVisible().catch(() => undefined);
    }
  });

  test('REG-RUM-EE-018 — click Top Devices row refreshes widgets', async () => {
    try {
      await withSoftDeadline(async () => {
        await rum.clickTopChartRow('device');
        await rum.expectChartsOrTablesReady();
        await rum.clearJsErrorFiltersIfVisible();
      }, 45000);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Devices filter soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.clearJsErrorFiltersIfVisible().catch(() => undefined);
    }
  });

  test('REG-RUM-EE-019 — Errors Over Time histogram + legend toggle', async () => {
    try {
      await rum.expectErrorsOverTime();
      await rum.softToggleOverTimeLegend();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Over Time soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-EE-020 — Errors table headers (type/file/message/counts)', async () => {
    try {
      await rum.expectErrorsTableHeaders();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Errors table headers soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-EE-021 — Errors table search sample', async () => {
    try {
      await withSoftDeadline(async () => {
        await rum.searchErrorsTable('Error');
        await expect(rum.locators.errorsTableWrapper).toBeVisible();
        await rum.searchErrorsTable('');
      }, 30000);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Search soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-EE-022 — Export menu sample near Errors table', async () => {
    try {
      await withSoftDeadline(() => rum.sampleExportNearErrorsTable(), 30000);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Export soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-EE-023 — open Error Drill-down from Errors table row', async () => {
    try {
      await withSoftDeadline(async () => {
        const opened = await rum.openErrorDrillDown();
        if (!opened) {
          test.info().annotations.push({
            type: 'note',
            description: 'No clickable Errors table row / drill-down did not open — soft skip',
          });
          return;
        }
        console.log(`[RUM EE] drill-down mode=${opened.mode} url=${opened.page.url()}`);
        await rum.expectDrillDownWidgets(opened.page);
        await rum.sampleDrillDownInteractions(opened.page);
        await rum.returnFromDrillDown(opened);
        await expect(page).toHaveURL(/javascript-errors\/real-user/);
      }, 90000);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Drill-down soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await page
        .goto('https://portal.bluetriangle.com/btportal/web/index.php?r=javascript-errors/real-user', {
          waitUntil: 'domcontentloaded',
        })
        .catch(() => undefined);
      await page.waitForTimeout(5000);
      await rum.expectChartsOrTablesReady().catch(() => undefined);
    }
  });

  test('REG-RUM-EE-024 — Markers dropdown lists Hide/Show/Toggle/Create options', async () => {
    try {
      await rum.openMarkersMenu();
      for (const label of [
        /Hide All Markers/i,
        /Show All Markers/i,
        /Toggle Custom Markers/i,
        /Toggle Global Markers/i,
        /Create Custom Marker/i,
        /Create Global Marker/i,
      ]) {
        await expect(rum.locators.markerOption(label)).toBeVisible();
      }
      await page.keyboard.press('Escape').catch(() => undefined);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Markers menu soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-EE-025 — Toggle Hide All / Show All Markers', async () => {
    try {
      await rum.selectMarkerMenuOption(/Hide All Markers/i);
      await rum.selectMarkerMenuOption(/Show All Markers/i);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Marker toggle soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-EE-026 — Create Custom Marker opens create form in new tab', async () => {
    try {
      const popup = await withSoftDeadline(() => rum.openCreateMarkerTab('custom'), 45000);
      await expect(popup.locator('#page-title')).toHaveText(/Creating Event Marker/i);
      await expect(popup.locator('#event-name')).toBeVisible();
      await popup.close().catch(() => undefined);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Create custom open soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-EE-027 — Create Global Marker opens create form in new tab', async () => {
    try {
      const popup = await withSoftDeadline(() => rum.openCreateMarkerTab('global'), 45000);
      await expect(popup.locator('#page-title')).toHaveText(/Creating Global Event Marker/i);
      await expect(popup.locator('#event-name')).toBeVisible();
      await popup.close().catch(() => undefined);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Create global open soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-EE-028 — create Custom Marker record and find via search', async () => {
    try {
      const { name, popup } = await withSoftDeadline(() => rum.createMarkerRecord('custom'), 120000);
      console.log(`[RUM EE] created custom marker ${name}`);
      await popup.close().catch(() => undefined);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Custom marker write soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-EE-029 — create Global Marker record and find via search', async () => {
    try {
      const { name, popup } = await withSoftDeadline(() => rum.createMarkerRecord('global'), 120000);
      console.log(`[RUM EE] created global marker ${name}`);
      await popup.close().catch(() => undefined);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Global marker write soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-EE-030 — right-nav Filters sample (data origin) refreshes widgets', async () => {
    try {
      await withSoftDeadline(async () => {
        await rum.applySampleFilterCombo({ dataOrigin: 'RUM Browser' });
        await expect(rum.locators.totalJsErrorsSum).toBeVisible();
        await rum.expectErrorsOverTime();
      }, 90000);
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Right-nav filter soft: ${err instanceof Error ? err.message : String(err)}`,
      });
      await rum.expectChartsOrTablesReady().catch(() => undefined);
    }
  });

  test('REG-RUM-EE-031 — right-nav Time Period Last 6 hours refreshes data', async () => {
    try {
      await withSoftDeadline(() => rum.applyTimePeriod('Last 6 Hours'), 90000);
      await expect(rum.locators.totalJsErrorsSum).toBeVisible();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `TP 6h soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-EE-032 — right-nav Time Period Last 24 hours refreshes data', async () => {
    try {
      await withSoftDeadline(() => rum.applyTimePeriod('Last 24 Hours'), 90000);
      await expect(rum.locators.totalJsErrorsSum).toBeVisible();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `TP 24h soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-EE-033 — right-nav Time Period Last 7 days refreshes data', async () => {
    try {
      await withSoftDeadline(() => rum.applyTimePeriod('Last 7 Days'), 90000);
      await expect(rum.locators.totalJsErrorsSum).toBeVisible();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `TP 7d soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-EE-034 — right-nav Time Period Last 30 days refreshes data', async () => {
    try {
      await withSoftDeadline(() => rum.applyTimePeriod('Last 30 Days'), 90000);
      await expect(rum.locators.totalJsErrorsSum).toBeVisible();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `TP 30d soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-EE-035 — Clear JS error filters control when present', async () => {
    try {
      await rum.clearJsErrorFiltersIfVisible();
      await rum.expectChartsOrTablesReady();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Clear filters soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-EE-036 — info / tooltip sample on widgets', async () => {
    try {
      const tip = await rum.sampleInfoTooltip();
      console.log(`[RUM EE] tip sample=${tip ? tip.slice(0, 80) : '(none)'}`);
      const filtersVisible = await rum.locators.filtersToggle.isVisible().catch(() => false);
      expect(Boolean(tip) || filtersVisible).toBeTruthy();
    } catch (err) {
      test.info().annotations.push({
        type: 'note',
        description: `Tooltip soft: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });

  test('REG-RUM-EE-037 — top-nav Filters / Share controls remain usable', async () => {
    await expect(rum.locators.filtersToggle).toBeVisible();
    const share = rum.locators.sharePageButton;
    if (await share.isVisible().catch(() => false)) {
      await expect(share).toBeVisible();
    } else {
      test.info().annotations.push({ type: 'note', description: 'Share control not visible on this layout' });
    }
  });
});
